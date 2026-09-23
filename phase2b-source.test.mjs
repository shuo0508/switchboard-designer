// Phase 2B source-regression tests: every assertion traces to a Phase 2A source extraction.
import assert from 'node:assert/strict';
import {
  CONFIDENCE,
  ENGINEERING_SELECTION_POLICY,
  MANUFACTURER_RULE_CATALOG,
  RULE_SOURCES,
  evaluateBreaker,
  generateSections,
  getBreakerCandidates,
  getSiemensCouplerData,
  getSiemensTable36,
  recommendBreaker,
  selectSiemens3waTable,
  validateDesignConfiguration,
} from './manufacturer-rules.js';
import { FUNCTION_OPTIONS } from './topology.js';
import { normalizeBreaker, normalizeProject } from './persistence.js';

const project = (manufacturer = 'ABB', board = {}, breakers = {}, extra = {}) => ({
  manufacturer, system: manufacturer === 'ABB' ? 'MNS R' : 'SIVACON S8', mainBus: '6300 A', defaultRoute: 'Bottom', quantity: 1,
  configuration: { switchboards: { 'SWB-01': { busbarPositions: { 'Input Bus': manufacturer === 'ABB' ? 'Top' : 'Top' }, ...board } }, breakers },
  dimensions: { heightMm: null, depthMm: null }, ...extra,
});
const breaker = (overrides = {}) => ({
  internalId: 'b1', id: 'CB-01', switchboardId: 'SWB-01', function: 'UPS_INPUT_LOAD', direction: 'Outgoing', bus: 'Input Bus',
  series: 'Emax 2', frame: 'E4.2', rating: '3200A', pole: '3P', type: 'ACB', route: 'Bottom', ...overrides,
});
const mccb = (frame, series, rating, pole, extra = {}) => breaker({ series, frame, rating, pole, type: 'MCCB', ...extra });
const status = (item, p) => evaluateBreaker(item, p).status;

// ---------------------------------------------------------------- ABB compatibility (Emax 2 / Tmax Iu)
{
  const p = project('ABB');
  const e12over = evaluateBreaker(breaker({ frame: 'E1.2', rating: '2000A' }), p);
  assert.equal(e12over.status, 'INVALID_MANUFACTURER_CONFIGURATION', 'E1.2 2000 A exceeds listed Iu (p.28)');
  assert.equal(e12over.ruleId, 'ABB_EMAX2_E1_2_RATINGS__RATING_EXCEEDED');
  assert.equal(e12over.source.pdfPage, '28');
  const e12low = evaluateBreaker(breaker({ frame: 'E1.2', rating: '500A' }), p);
  assert.equal(e12low.confidence, CONFIDENCE.MANUFACTURER_CONFIRMATION_REQUIRED, 'E1.2 500 A: trip-unit In not established');
  assert.ok(e12low.missingParameters.some(item => item.includes('NOT ESTABLISHED')));
  assert.deepEqual(getBreakerCandidates('ABB', '2500A').map(item => item.frame), ['E2.2', 'E4.2'], 'E2.2 2500 and E4.2 V 2500 (p.29)');
  assert.equal(status(breaker({ frame: 'E4.2', rating: '3200A', pole: '3P' }), p), 'MANUFACTURER_VERIFIED');
  assert.equal(evaluateBreaker(breaker({ frame: 'E6.2', rating: '5000A', pole: '4P' }), p).widthMm, 1200);
  assert.equal(status(breaker({ frame: 'E6.2', rating: '3200A' }), p), 'MANUFACTURER_CONFIRMATION_REQUIRED', 'E6.2 3200 A not listed');
  assert.equal(status(breaker({ frame: 'E6.2', rating: '6300A', pole: '3P' }), p), 'MANUFACTURER_VERIFIED');

  const cfg = { cubicleType: 'POWER_CENTER' };
  const pc = project('ABB', {}, { b1: cfg });
  assert.equal(status(mccb('XT4', 'Tmax XT', '315A', '3P'), pc), 'INVALID_MANUFACTURER_CONFIGURATION', 'XT4 315 A exceeds 250 A');
  assert.equal(status(mccb('XT4', 'Tmax XT', '500A', '3P'), pc), 'INVALID_MANUFACTURER_CONFIGURATION', 'XT4 500 A exceeds 250 A');
  assert.equal(status(mccb('XT4', 'Tmax XT', '100A', '3P'), pc), 'MANUFACTURER_CONFIRMATION_REQUIRED', 'XT4 100 A: In not established');
  assert.equal(status(mccb('XT4', 'Tmax XT', '250A', '3P'), pc), 'MANUFACTURER_VERIFIED');
  assert.deepEqual(getBreakerCandidates('ABB', '315A'), [], 'no invented 315 A mapping');
  assert.deepEqual(getBreakerCandidates('ABB', '500A'), [], 'no invented 500 A mapping');
}

// ---------------------------------------------------------------- ABB Power Center (p.22) vs MCC plug-in (p.23)
{
  const pc = project('ABB', {}, { b1: { cubicleType: 'POWER_CENTER' } });
  const mcc = project('ABB', {}, { b1: { cubicleType: 'MCC_PLUG_IN' } });
  const xt4pc = evaluateBreaker(mccb('XT4', 'Tmax XT', '250A', '3P'), pc);
  const xt4mcc = evaluateBreaker(mccb('XT4', 'Tmax XT', '250A', '3P'), mcc);
  assert.deepEqual([xt4pc.module, xt4pc.widthMm, xt4pc.cubicleType], ['8E', 600, 'POWER_CENTER']);
  assert.deepEqual([xt4mcc.module, xt4mcc.widthMm, xt4mcc.cubicleType], ['6E', 600, 'MCC_PLUG_IN']);
  assert.equal(xt4pc.table, 'ABB MNS R p.22 Power Center Breakers [POWER_CENTER]');
  assert.equal(xt4mcc.table, 'ABB MNS R p.23 Motor Control Center Plug in modules [MCC_PLUG_IN]');
  assert.deepEqual([xt4pc.source.table, xt4pc.source.pdfPage], ['Power Center Breakers', '22']);
  assert.deepEqual([xt4mcc.source.table, xt4mcc.source.pdfPage], ['Motor Control Center Plug in modules', '23']);
  assert.equal(evaluateBreaker(mccb('T5 400A', 'Tmax T5', '400A', '3P'), pc).module, '12E');
  assert.equal(evaluateBreaker(mccb('T5 400A', 'Tmax T5', '400A', '3P'), mcc).module, '8E');
  assert.ok(xt4mcc.sourceConditions.some(item => item.includes('Energy distribution')));

  const none = evaluateBreaker(mccb('XT4', 'Tmax XT', '250A', '3P'), project('ABB'));
  assert.equal(none.ruleId, 'ABB_MNSR_CUBICLE_TYPE_REQUIRED', 'cubicle type is never assumed');
  assert.equal(none.confidence, CONFIDENCE.MANUFACTURER_CONFIRMATION_REQUIRED);
  const incomer = evaluateBreaker(mccb('XT4', 'Tmax XT', '250A', '3P', { direction: 'Incoming', function: 'MAIN_INPUT' }), mcc);
  assert.equal(incomer.confidence, CONFIDENCE.MANUFACTURER_CONFIRMATION_REQUIRED, 'p.23 lists Energy distribution only');

  // Four-breaker 800 mm footnote is catalogued only and never applied.
  const four = MANUFACTURER_RULE_CATALOG.find(rule => rule.ruleId === 'ABB_MNSR_T6_T7_FOUR_BREAKER_800_AVAILABLE');
  assert.equal(four.confidence, CONFIDENCE.MANUFACTURER_CONFIRMATION_REQUIRED);
  const t6cfg = Object.fromEntries(Array.from({ length: 4 }, (_, i) => ['t6-' + i, { cubicleType: 'POWER_CENTER', cubicleWidthMm: 800 }]));
  const t6p = project('ABB', {}, t6cfg);
  const t6 = Array.from({ length: 4 }, (_, i) => mccb('T6 630A', 'Tmax T6', '630A', '4P', { internalId: 't6-' + i, id: 'CB-0' + (i + 1) }));
  const sections = generateSections(t6, t6p, 'SWB-01');
  assert.equal(sections.length, 4, 'no automatic four-breaker packing');
  assert.ok(sections.every(section => section.packingRuleId === 'NO_AUTOMATIC_MCCB_PACKING' && section.widthStatus === 'PROVISIONAL'));
  assert.ok(sections.every(section => section.width === 600), 'no shared 800 mm section is generated');
  const t6eval = evaluateBreaker(t6[0], t6p);
  assert.equal(t6eval.status, 'MANUFACTURER_CONFIRMATION_REQUIRED', 'stored 800 mm is only the ** arrangement');
  assert.equal(t6eval.ruleId, four.ruleId);
  assert.ok(t6eval.sourceConditions.some(item => item.includes('Footnote **') && item.includes('not applied')));

  // E1.2: 600 mm is the single-breaker width, no user selection involved.
  const e12 = evaluateBreaker(breaker({ frame: 'E1.2', rating: '1250A' }), project('ABB'));
  assert.deepEqual([e12.status, e12.widthMm, e12.availableWidths], ['MANUFACTURER_VERIFIED', 600, [600]]);
}

// ---------------------------------------------------------------- AUTO selection
{
  const single = recommendBreaker({ manufacturer: 'ABB', rating: '400A' });
  assert.deepEqual([single.frame, single.status, single.classification], ['T5 400A', 'SINGLE_CANDIDATE', CONFIDENCE.ENGINEERING_DERIVED]);
  const multi = recommendBreaker({ manufacturer: 'ABB', rating: '630A' });
  assert.equal(multi.status, 'MULTIPLE_CANDIDATES');
  assert.deepEqual(multi.candidates.map(item => item.frame), ['T5 630A', 'T6 630A', 'E1.2']);
  assert.equal(multi.policy, ENGINEERING_SELECTION_POLICY.id);
  assert.equal(ENGINEERING_SELECTION_POLICY.classification, 'Engineering Derived');
  const none = recommendBreaker({ manufacturer: 'ABB', rating: '315A' });
  assert.deepEqual([none.status, none.classification, none.candidates.length], ['NO_ESTABLISHED_CANDIDATE', CONFIDENCE.MANUFACTURER_CONFIRMATION_REQUIRED, 0]);
  assert.equal(recommendBreaker({ manufacturer: 'ABB', rating: '800A' }).frame, 'E1.2', 'no generic >630 A threshold: E1.2 lists 800 A');

  const input = { manufacturer: 'Siemens', rating: '4000A', pole: '4P', internalId: 'b1', switchboardId: 'SWB-01', bus: 'Input Bus', route: 'Bottom', direction: 'Outgoing', function: 'UPS_INPUT_LOAD' };
  assert.deepEqual(getBreakerCandidates('Siemens', '4000A').map(item => item.frame), ['3WA1240', '3WA1340']);
  assert.equal(recommendBreaker(input, project('Siemens')).frame, '3WA1340', 'Top busbar: 3WA1240 not in Table 3/2');
  const rear = project('Siemens', { busbarPositions: { 'Input Bus': 'Rear Top' } });
  assert.equal(recommendBreaker(input, rear).frame, '3WA1240', 'Rear-top + bottom entry: Table 3/3 G1 lists 3WA1240');
}

// ---------------------------------------------------------------- Siemens 3WA tables
{
  // Table row content is verified against the independent fixture in source-fixtures.test.mjs.
  const wa = (frame, rating, pole, route = 'Bottom', extra = {}) => breaker({ series: 'SENTRON 3WA', frame, rating, pole, route, ...extra });
  const sp = (position, config, board = {}, extra = {}) => project('Siemens', { busbarPositions: { 'Input Bus': position }, ...board }, { b1: config }, extra);

  const top1340 = evaluateBreaker(wa('3WA1340', '4000A', '3P'), sp('Top', { connectionType: 'Cable' }));
  assert.deepEqual([top1340.widthMm, top1340.status, top1340.table], [800, 'MANUFACTURER_VERIFIED', 'Table 3/2']);
  const g1 = evaluateBreaker(wa('3WA1340', '4000A', '3P'), sp('Rear Top', { connectionType: 'Cable' }));
  assert.deepEqual([g1.widthMm, g1.status, g1.table, g1.source.table, g1.source.pdfPage], [1000, 'MANUFACTURER_VERIFIED', 'Table 3/3 G1', 'Table 3/3 G1', '30']);
  const g2 = evaluateBreaker(wa('3WA1340', '4000A', '3P', 'Top'), sp('Rear Top', { connectionType: 'Cable' }));
  assert.deepEqual([g2.status, g2.ruleId], ['INVALID_MANUFACTURER_CONFIGURATION', 'SIEMENS_S8_3WA_TABLE_3_3_G2__CONNECTION_NOT_LISTED']);
  assert.equal(evaluateBreaker(wa('3WA1240', '4000A', '4P'), sp('Top', { connectionType: 'Cable' })).ruleId, 'SIEMENS_S8_3WA_TABLE_3_2__NOT_LISTED');

  // 3WA1350 Table 3/3 G2: cable only, footnotes 1) and 4).
  const g2p = (config, board = {}) => sp('Rear Bottom', { connectionType: 'Cable', ...config }, board, { dimensions: { heightMm: null, depthMm: 1200 } });
  const full = g2p({ mountingDesign: 'Withdrawable Unit', breakingCapacityClass: 'H' }, { frameHeightMm: 2200, frontLayout: 'Double Front' });
  const r1350 = evaluateBreaker(wa('3WA1350', '5000A', '4P'), full);
  assert.equal(r1350.table, 'Table 3/3 G2');
  assert.equal(r1350.widthMm, 1000);
  assert.equal(r1350.status, 'MANUFACTURER_CONFIRMATION_REQUIRED', 'max. 100 kA is not collected, so footnote 4) is not fully matched');
  assert.deepEqual(r1350.missingParameters.length, 1);
  assert.ok(r1350.missingParameters[0].includes('100 kA'));
  // Footnote 4) is SOURCE_AMBIGUOUS (p.104 wording): deviations need confirmation, they are not prohibitions.
  assert.equal(status(wa('3WA1350', '5000A', '4P'), g2p({ mountingDesign: 'Withdrawable Unit', breakingCapacityClass: 'S' }, { frameHeightMm: 2200, frontLayout: 'Double Front' })), 'MANUFACTURER_CONFIRMATION_REQUIRED');
  assert.equal(status(wa('3WA1350', '5000A', '4P'), g2p({ mountingDesign: 'Withdrawable Unit', breakingCapacityClass: 'H' }, { frameHeightMm: 2200, frontLayout: 'Single Front' })), 'MANUFACTURER_CONFIRMATION_REQUIRED');
  assert.equal(status(wa('3WA1350', '5000A', '4P'), g2p({ connectionType: 'Busbar' })), 'INVALID_MANUFACTURER_CONFIGURATION');

  // 3WA1363: not in 3/3 G2 or 3/4; in 3/2 needs withdrawable + 2200 mm only (no front-layout rule).
  assert.equal(evaluateBreaker(wa('3WA1363', '6300A', '4P'), sp('Rear Bottom', { connectionType: 'Busbar' })).ruleId, 'SIEMENS_S8_3WA_TABLE_3_3_G2__NOT_LISTED');
  const twoRear = project('Siemens', { busbarPositions: { 'Input Bus': 'Rear Top', 'UPS Output Bus': 'Rear Bottom' } }, { b1: { connectionType: 'Busbar' } });
  const upsBreaker = wa('3WA1232', '3200A', '4P', 'Bottom', { internalId: 'b2', id: 'CB-02', bus: 'UPS Output Bus', function: 'UPS_OUTPUT', direction: 'Incoming' });
  const r3_4 = evaluateBreaker(wa('3WA1363', '6300A', '4P'), twoRear, [wa('3WA1363', '6300A', '4P'), upsBreaker]);
  assert.deepEqual([r3_4.status, r3_4.table], ['INVALID_MANUFACTURER_CONFIGURATION', 'Table 3/4 G1']);
  const top1363 = evaluateBreaker(wa('3WA1363', '6300A', '4P'), sp('Top', { connectionType: 'Busbar', mountingDesign: 'Withdrawable Unit' }, { frameHeightMm: 2200 }));
  assert.equal(top1363.status, 'MANUFACTURER_VERIFIED');
  assert.equal(status(wa('3WA1363', '6300A', '4P'), sp('Top', { connectionType: 'Busbar', mountingDesign: 'Withdrawable Unit' }, { frameHeightMm: 2000 })), 'INVALID_MANUFACTURER_CONFIGURATION');

  // G1/G2 derived from position and entry; never a user input.
  assert.equal(selectSiemens3waTable(sp('Rear Bottom', {}), wa('3WA1232', '3200A', '4P', 'Top')).table.id, 'TABLE_3_3_G1');
  assert.equal(selectSiemens3waTable(sp('Rear Bottom', {}), wa('3WA1232', '3200A', '4P', 'Bottom')).table.id, 'TABLE_3_3_G2');
  assert.equal(selectSiemens3waTable(twoRear, wa('3WA1232', '3200A', '4P', 'Top'), [wa('3WA1232', '3200A', '4P', 'Top'), upsBreaker]).table.id, 'TABLE_3_4_G2');

  // Width alternatives: manufacturer-supported, user selected, never Verified.
  const alt = sp('Top', { connectionType: 'Cable', cubicleWidthMm: 600 });
  const altResult = evaluateBreaker(wa('3WA1232', '3200A', '3P'), alt);
  assert.deepEqual([altResult.status, altResult.confidence, altResult.availableWidths], ['MANUFACTURER_SUPPORTED_USER_SELECTED', 'Manufacturer-Supported · User Selected', [600, 800]]);
  assert.equal(generateSections([wa('3WA1232', '3200A', '3P')], alt, 'SWB-01')[0].widthStatus, 'USER_SELECTED');

  // Double front requires a rear busbar.
  const df = sp('Top', { connectionType: 'Cable' }, { frontLayout: 'Double Front' });
  assert.ok(validateDesignConfiguration(df, [wa('3WA1232', '3200A', '4P')]).issues.some(issue => issue.issueId.endsWith('DOUBLE_FRONT_REQUIRES_REAR_BUSBAR')));

  // Table 3/6 is informational: never changes the result.
  assert.equal(top1340.manufacturerOperationalCurrent.table, 'Tab. 3/6 (informational)');
  assert.equal(getSiemensTable36().feeders.find(item => item[0] === '3WA1240')[2][3], '3,420 A/3,20 A 1)', 'raw string kept as printed');
  assert.equal(getSiemensTable36().usage, 'Informational only — not used for breaker selection or validation');

  // Coupler tables: source data only, no coupler Function.
  assert.ok(getSiemensCouplerData().TABLE_3_4_TRANSVERSAL.rows['3WA1240']);
  assert.ok(!FUNCTION_OPTIONS.some(item => item.includes('COUPLER')));
}

// ---------------------------------------------------------------- Siemens 3VA (§3.4, Tab. 3/16, 3/17)
{
  const va = (frame, rating, route = 'Bottom') => breaker({ series: 'SENTRON 3VA', frame, rating, pole: '4P', type: 'MCCB', route });
  const vp = (position, config) => project('Siemens', { busbarPositions: { 'Input Bus': position } }, { b1: config });
  const ok = vp('Rear Top', { mountingDesign: 'Fixed-mounted', ventilation: 'Ventilated' });
  const r = evaluateBreaker(va('3VA1563', '630A'), ok);
  assert.deepEqual([r.status, r.widthMm, r.widthConfidence, r.arrangement], ['PARTIALLY_VERIFIED', 400, 'PARTIALLY_VERIFIED', 'Manufacturer Supported']);
  const section = generateSections([va('3VA1563', '630A')], ok, 'SWB-01')[0];
  assert.deepEqual([section.widthStatus, section.packingStatus], ['PARTIALLY_VERIFIED', 'MANUFACTURER_SUPPORTED_SINGLE_DEVICE']);
  assert.equal(status(va('3VA1563', '630A'), vp('Rear Top', { mountingDesign: 'Plug-in', ventilation: 'Ventilated' })), 'MANUFACTURER_CONFIRMATION_REQUIRED', 'plug-in: on request');
  const topTop = evaluateBreaker(va('3VA1563', '630A', 'Top'), vp('Top', { mountingDesign: 'Fixed-mounted', ventilation: 'Ventilated' }));
  assert.equal(topTop.operationalCurrentStatus, CONFIDENCE.NOT_ESTABLISHED);
  assert.equal(topTop.status, 'MANUFACTURER_CONFIRMATION_REQUIRED');
  assert.equal(status(va('3VA1580', '630A'), ok), 'MANUFACTURER_CONFIRMATION_REQUIRED', 'below rated device current: In not established');

  // Tab. 3/17 lookup keyed by type / top-rear / entry / ventilation; Rear Top == Rear Bottom busbar.
  // (All 36 transcribed values are compared with the independent fixture in source-fixtures.test.mjs.)
  const lookup = (frame, position, route, ventilation) => evaluateBreaker(va(frame, frame === '3VA2510' || frame === '3VA1510' ? '1000A' : '630A', route), vp(position, { mountingDesign: 'Fixed-mounted', ventilation })).operationalCurrent;
  assert.equal(lookup('3VA1510', 'Top', 'Bottom', 'Non-ventilated'), 815);
  assert.equal(lookup('3VA2510', 'Rear Top', 'Top', 'Ventilated'), 895);
  assert.equal(lookup('3VA2510', 'Rear Bottom', 'Top', 'Ventilated'), 895);
  assert.equal(lookup('3VA2563', 'Top', 'Bottom', 'Non-ventilated'), 605);
  assert.equal(lookup('3VA1563', 'Rear Bottom', 'Bottom', 'Non-ventilated'), 625);
}

// ---------------------------------------------------------------- Persistence of new configuration inputs
{
  const saved = normalizeProject({ manufacturer: 'Siemens', configuration: { switchboards: { 'SWB-01': { busbarPositions: {}, frameHeightMm: '2200', frontLayout: 'Double Front' } }, breakers: { a: { cubicleType: 'MCC_PLUG_IN', breakingCapacityClass: 'H', mountingDesign: 'Withdrawable Unit' }, b: { cubicleType: 'CENTER', breakingCapacityClass: 'Z' } } } });
  assert.equal(saved.configuration.switchboards['SWB-01'].frameHeightMm, 2200);
  assert.deepEqual(saved.configuration.breakers.a, { cubicleType: 'MCC_PLUG_IN', breakingCapacityClass: 'H', mountingDesign: 'Withdrawable Unit' });
  assert.deepEqual(saved.configuration.breakers.b, {}, 'unknown values rejected');
  const auto = normalizeBreaker({ function: 'UPS_INPUT_LOAD', rating: '630A' }, normalizeProject({ manufacturer: 'ABB' }), () => 'auto-1');
  assert.deepEqual([auto.frame, auto.recommendation.status, auto.recommendation.candidates], ['T5 630A', 'MULTIPLE_CANDIDATES', ['T5 630A', 'T6 630A', 'E1.2']]);
}

// ---------------------------------------------------------------- Source metadata
assert.equal(RULE_SOURCES.siemensS8.revision, 'Publication date 01/2025 · Status 01/2025 V3-korr');
assert.equal(RULE_SOURCES.siemensS8.fileName, 'TIP_Planning_manual_SIVACON_S8_2025-02_EN.pdf');
assert.equal(RULE_SOURCES.abbMnsR.revision, '1TTB900011D0203 (2016-07)');
assert.ok(!MANUFACTURER_RULE_CATALOG.some(rule => /> ?630 ?A|> ?1000 ?A/.test(String(rule.result))), 'no generic ACB threshold rule');

console.log('phase 2B manufacturer source regression tests passed');
