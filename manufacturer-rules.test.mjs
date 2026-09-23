import assert from 'node:assert/strict';
import {
  evaluateBreaker,
  generateSections,
  getAvailableManufacturerDimensions,
  getBusbarRule,
  getConfigurationCompleteness,
  getDesignConfigurationSchema,
  getManufacturerRuleCatalog,
  getSiemensConfigurationInputs,
  recommendBreaker,
  validateDesignConfiguration,
} from './manufacturer-rules.js';
import { buildDesignExport } from './design-evaluation.js';
import { getSwitchboardDimensions } from './project-model.js';

const baseProject = (manufacturer = 'ABB') => ({
  manufacturer,
  system: manufacturer === 'ABB' ? 'MNS R' : 'SIVACON S8',
  quantity: 1,
  configuration: { switchboards: {}, breakers: {} },
});
const breaker = (overrides = {}) => ({
  internalId: overrides.internalId || 'breaker-1',
  id: 'CB-01', switchboardId: 'SWB-01', bus: 'Input Bus', function: 'MAIN_INPUT',
  direction: 'Incoming', series: 'Emax 2', frame: 'E4.2', rating: '3200A',
  pole: '4P', type: 'ACB', route: 'Bottom', ...overrides,
});

// ABB direct table matches.
const abb = baseProject();
assert.equal(evaluateBreaker(breaker({ frame: 'E4.2', pole: '3P' }), abb).widthMm, 600);
assert.equal(evaluateBreaker(breaker({ frame: 'E4.2', pole: '4P' }), abb).widthMm, 800);
assert.equal(evaluateBreaker(breaker({ frame: 'E6.2', pole: '3P', rating: '6300A' }), abb).widthMm, 1000);
assert.equal(evaluateBreaker(breaker({ frame: 'E6.2', pole: '4P', rating: '6300A' }), abb).widthMm, 1200);

// ABB p.22 "600 mm / 800 mm**": single E1.2 is 600 mm; 800 mm is the ** four-breaker arrangement only.
const e12 = breaker({ internalId: 'e12', frame: 'E1.2', rating: '1250A' });
assert.equal(evaluateBreaker(e12, abb).confidence, 'Manufacturer Verified');
assert.equal(evaluateBreaker(e12, abb).ruleId, 'ABB_MNSR_PC_BREAKERS__E1.2_4P');
assert.equal(evaluateBreaker(e12, abb).widthMm, 600);
abb.configuration.breakers.e12 = { cubicleWidthMm: 800 };
assert.equal(evaluateBreaker(e12, abb).confidence, 'Manufacturer Confirmation Required');
assert.equal(evaluateBreaker(e12, abb).ruleId, 'ABB_MNSR_T6_T7_FOUR_BREAKER_800_AVAILABLE');

const abbFrames = [
  ['XT4', 'Tmax XT', '160A', '4P', '8E'],
  ['T5 400A', 'Tmax T5', '400A', '3P', '8E'],
  ['T5 630A', 'Tmax T5', '630A', '4P', '24E'],
  ['T6 630A', 'Tmax T6', '630A', '4P', '24E'],
];
abbFrames.forEach(([frame, series, rating, pole, module]) => {
  abb.configuration.breakers['mcc-' + frame] = { cubicleType: 'MCC_PLUG_IN' };
  const result = evaluateBreaker(breaker({ internalId: 'mcc-' + frame, series, frame, rating, pole, type: 'MCCB', direction: 'Outgoing', function: 'FEEDER' }), abb);
  assert.equal(result.widthMm, 600);
  assert.equal(result.module, module);
});

const t6 = Array.from({ length: 4 }, (_, index) => breaker({
  internalId: 't6-' + index, id: 'CB-0' + (index + 1), series: 'Tmax T6',
  frame: 'T6 630A', rating: '630A', pole: '4P', type: 'MCCB',
}));
const t6Sections = generateSections(t6, abb, 'SWB-01');
assert.equal(t6Sections.length, 4);
assert.ok(t6Sections.every(section => section.packingRuleId === 'NO_AUTOMATIC_MCCB_PACKING'));

const abbTwoBus = baseProject();
abbTwoBus.configuration.switchboards['SWB-01'] = { busbarPositions: { 'Input Bus': 'Top', 'UPS Output Bus': 'Bottom' } };
const busBreakers = [
  breaker({ internalId: 'a', bus: 'Input Bus' }),
  breaker({ internalId: 'b', id: 'CB-02', bus: 'UPS Output Bus', function: 'UPS_OUTPUT' }),
];
assert.equal(getBusbarRule(abbTwoBus, 'SWB-01', 'Input Bus').physicalPosition, 'Top');
assert.equal(getBusbarRule(abbTwoBus, 'SWB-01', 'UPS Output Bus').physicalPosition, 'Bottom');
assert.equal(validateDesignConfiguration(abbTwoBus, busBreakers).valid, true);

// Siemens 3WA incomplete, matched, ambiguous, and invalid.
const siemens = baseProject('Siemens');
const wa = breaker({ internalId: 'wa', series: 'SENTRON 3WA', frame: '3WA1232', rating: '3200A', pole: '4P' });
assert.equal(evaluateBreaker(wa, siemens).ruleId, 'SIEMENS_S8_BUSBAR_POSITION_REQUIRED');
siemens.configuration.switchboards['SWB-01'] = { busbarPositions: { 'Input Bus': 'Top' } };
siemens.configuration.breakers.wa = { connectionType: 'Cable' };
const waMatched = evaluateBreaker(wa, siemens);
assert.equal(waMatched.widthMm, 800);
assert.equal(waMatched.table, 'Table 3/2');
assert.equal(waMatched.confidence, 'Manufacturer Verified');

const wa3p = { ...wa, internalId: 'wa3p', pole: '3P' };
siemens.configuration.breakers.wa3p = { connectionType: 'Cable' };
assert.equal(evaluateBreaker(wa3p, siemens).ruleId, 'SIEMENS_S8_3WA_LAYOUT_TABLES_PREREQUISITES__CUBICLE_WIDTH_SELECTION_REQUIRED');
siemens.configuration.breakers.wa3p.cubicleWidthMm = 600;
assert.equal(evaluateBreaker(wa3p, siemens).widthMm, 600);

const unsupported = { ...wa, internalId: 'unsupported', frame: '3WA1106', rating: '630A' };
siemens.configuration.breakers.unsupported = { connectionType: 'Busbar' };
assert.equal(evaluateBreaker(unsupported, siemens).confidence, 'Invalid Manufacturer Configuration');

// Siemens 3VA width and operational-current matching for Bottom and Top routes.
const va = breaker({ internalId: 'va', series: 'SENTRON 3VA', frame: '3VA1563', rating: '630A', pole: '4P', type: 'MCCB', route: 'Bottom' });
siemens.configuration.breakers.va = { ventilation: 'Ventilated' };
const vaResult = evaluateBreaker(va, siemens);
assert.equal(vaResult.widthMm, 400);
assert.equal(vaResult.operationalCurrent, 630);
assert.equal(vaResult.operationalCurrentStatus, 'Manufacturer Verified');

const vaTop = { ...va, internalId: 'va-top', route: 'Top' };
siemens.configuration.breakers['va-top'] = { ventilation: 'Ventilated' };
assert.ok(evaluateBreaker(vaTop, siemens).missingParameters.some(item => item.includes('Tab. 3/17')));

// Siemens Table 3/4 two-rear-bus configuration.
const siemensTwoBus = baseProject('Siemens');
siemensTwoBus.configuration.switchboards['SWB-01'] = { busbarPositions: { 'Input Bus': 'Rear Top', 'UPS Output Bus': 'Rear Bottom' } };
const twoBusBreakers = [
  { ...wa, internalId: 'wa-a', bus: 'Input Bus' },
  { ...wa, internalId: 'wa-b', id: 'CB-02', bus: 'UPS Output Bus' },
];
siemensTwoBus.configuration.breakers['wa-a'] = { connectionType: 'Cable' };
siemensTwoBus.configuration.breakers['wa-b'] = { connectionType: 'Cable' };
assert.equal(validateDesignConfiguration(siemensTwoBus, twoBusBreakers).valid, true);
assert.equal(evaluateBreaker(twoBusBreakers[0], siemensTwoBus, twoBusBreakers).table, 'Table 3/4 G1');

const invalidPosition = structuredClone(siemensTwoBus);
invalidPosition.configuration.switchboards['SWB-01'].busbarPositions['Input Bus'] = 'Center';
assert.equal(validateDesignConfiguration(invalidPosition, twoBusBreakers).valid, false);

// Contextual schema and completeness.
const schema = getDesignConfigurationSchema(siemens, [wa, va]);
assert.ok(schema.switchboards[0].controls.some(control => control.key === 'busbarPositions'));
assert.ok(schema.breakers.find(item => item.internalId === 'wa').controls.some(control => control.key === 'connectionType'));
assert.ok(schema.breakers.find(item => item.internalId === 'va').controls.some(control => control.key === 'ventilation'));
const completeness = getConfigurationCompleteness(siemens, [wa, va]);
assert.ok(completeness.required >= completeness.resolved);
assert.equal(typeof completeness.percentage, 'number');

// Available dimensions remain separate from current user-defined dimensions.
const dimensions = getAvailableManufacturerDimensions(abb);
assert.equal(dimensions.matched, false);
assert.deepEqual(dimensions.availableConfigurations.heightsMm, [2200]);
assert.equal(getSwitchboardDimensions(abb).heightStatus, 'NOT_DEFINED');

// Catalog, input classification, recommendation, export, and two switchboards.
assert.ok(getManufacturerRuleCatalog('ABB', 'MNS R').some(rule => rule.ruleId === 'ABB_MNSR_T6_T7_FOUR_BREAKER_800_AVAILABLE'));
assert.ok(getSiemensConfigurationInputs().some(item => item.classification === 'Manufacturer confirmation only'));
assert.equal(recommendBreaker({ manufacturer: 'Siemens', rating: '3200A' }).frame, '3WA1232');
const twoBoardProject = { ...abbTwoBus, quantity: 2 };
busBreakers[1].switchboardId = 'SWB-02';
const exported = buildDesignExport(twoBoardProject, busBreakers);
assert.equal(exported.switchboardQuantity, 2);
assert.equal(exported.sectionsBySwitchboard.length, 2);
assert.ok(exported.designConfiguration);
assert.ok(exported.configurationCompleteness);
assert.ok(exported.breakerSchedule.every(item => item.evaluation));
assert.ok(Array.isArray(exported.busbarRules));

console.log('shared manufacturer rule engine configuration tests passed');