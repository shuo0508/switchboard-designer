import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RULE_SOURCES,
  evaluateBreaker,
  generateSections,
  getBusbarRule,
  getDesignConfigurationSchema,
  getProductCatalog,
  getRuleAudit,
  resolveRuleSource,
  validateDesignConfiguration,
} from './manufacturer-rules.js';
import { DESIGN_STATUS, buildDesignExport, designStatus } from './design-evaluation.js';
import { getSwitchboardDimensions } from './project-model.js';
import { applySwitchboardAssignment, assignBreakerToSwitchboard, ensureSwitchboardState, proposedSwitchboardAssignment, setRatedMainBus } from './ux-state.js';
import { normalizeBreaker, normalizeProject } from './persistence.js';
import { openConfirmation } from './confirm-dialog.js';
import { computeBoardLayout, sectionPixelWidth } from './ga-renderer.js';
import { escapeHtml } from './html.js';

let counter = 0;
const makeId = () => 'test-' + (++counter);
const project = (manufacturer = 'ABB', extra = {}) => ensureSwitchboardState({
  manufacturer, system: manufacturer === 'ABB' ? 'MNS R' : 'SIVACON S8', mainBus: '6300 A', defaultRoute: 'Bottom', quantity: 1,
  configuration: { switchboards: { 'SWB-01': { busbarPositions: { 'Input Bus': manufacturer === 'ABB' ? 'Top' : 'Rear Top' } } }, breakers: {} },
  dimensions: { heightMm: null, depthMm: null }, ...extra,
});
const breaker = (overrides = {}) => ({
  internalId: makeId(), id: 'CB-01', switchboardId: 'SWB-01', function: 'UPS_INPUT_LOAD', direction: 'Outgoing', bus: 'Input Bus',
  series: 'Tmax XT', frame: 'XT4', rating: '160A', pole: '4P', type: 'MCCB', route: 'Bottom', routeMode: 'explicit', ...overrides,
});

// A. 10 x ABB XT4 must NOT produce a fully Manufacturer Verified 6000 mm lineup.
{
  const p = project();
  const xt4 = Array.from({ length: 10 }, (_, index) => breaker({ id: 'CB-' + String(index + 1).padStart(2, '0') }));
  xt4.forEach(item => { p.configuration.breakers[item.internalId] = { cubicleType: 'POWER_CENTER' }; });
  xt4.forEach(item => assert.equal(evaluateBreaker(item, p).confidence, 'Manufacturer Verified', 'device data unchanged'));
  xt4.forEach(item => assert.equal(evaluateBreaker(item, p).module, '8E', 'manufacturer module unchanged'));
  const sections = generateSections(xt4, p, 'SWB-01');
  assert.ok(sections.every(section => section.widthStatus === 'PROVISIONAL'));
  assert.ok(sections.every(section => section.confidence === 'Manufacturer Confirmation Required'));
  assert.ok(sections.every(section => section.deviceConfidence === 'Manufacturer Verified'));
  assert.ok(sections.every(section => section.widthLabel === 'Provisional Planning Width · Engineering Estimate'));
  const exported = buildDesignExport(p, xt4);
  assert.equal(exported.widthSummary.combinedPlanningWidthMm, 6000);
  assert.equal(exported.widthSummary.verifiedSectionWidthMm, 0);
  assert.equal(exported.widthSummary.provisionalPlanningWidthMm, 6000);
  assert.notEqual(exported.designStatus, DESIGN_STATUS.VALID);

  // B. Unresolved MCCB packing -> designStatus != VALID / MATCHED, packing listed as unresolved.
  const status = designStatus(p, xt4);
  assert.equal(status.designStatus, DESIGN_STATUS.INCOMPLETE);
  assert.equal(status.unresolvedConditions.filter(item => item.category === 'MCCB packing').length, 10);
  assert.equal(status.confidenceSummary.packingUnresolved, 10);
}

// Control: a fully resolved ACB-only design is still VALID / MATCHED (no over-blocking).
{
  const p = project();
  const acb = breaker({ function: 'MAIN_INPUT', direction: 'Incoming', series: 'Emax 2', frame: 'E4.2', rating: '3200A', type: 'ACB' });
  assert.equal(designStatus(p, [acb]).designStatus, DESIGN_STATUS.VALID);
  assert.equal(buildDesignExport(p, [acb]).containsProvisionalWidth, false);
}

// C. SWB rating 3200 A + Main Incomer 6300 A -> Electrical Design Conflict (not a manufacturer invalid).
{
  const p = project();
  setRatedMainBus(p, 'SWB-01', '3200 A');
  const incomer = breaker({ function: 'MAIN_INPUT', direction: 'Incoming', series: 'Emax 2', frame: 'E6.2', rating: '6300A', type: 'ACB' });
  const status = designStatus(p, [incomer]);
  assert.equal(status.designStatus, DESIGN_STATUS.ELECTRICAL_CONFLICT);
  assert.equal(status.electricalConflicts.length, 1);
  assert.equal(status.electricalConflicts[0].classification, 'Electrical Design Conflict');
  assert.equal(status.invalidConditions.length, 0);
  assert.equal(evaluateBreaker(incomer, p).confidence, 'Manufacturer Verified', 'manufacturer validation unchanged');
  const exported = buildDesignExport(p, [incomer]);
  assert.equal(exported.electricalConflicts.length, 1);
  assert.equal(exported.invalidConditions.length, 0);
  // Outgoing feeders are not treated as incomers.
  const feeder = { ...incomer, internalId: makeId(), function: 'UPS_INPUT', direction: 'Outgoing' };
  assert.equal(designStatus(p, [feeder]).electricalConflicts.length, 0);
}

// D. Height / Depth undefined -> Not Defined (legacy hidden 2400 x 1200 default is not migrated).
{
  const legacy = normalizeProject({ manufacturer: 'ABB', currentDimensions: { heightMm: 2400, depthMm: 1200 } });
  const dimensions = getSwitchboardDimensions(legacy);
  assert.equal(dimensions.heightMm, null);
  assert.equal(dimensions.depthMm, null);
  assert.equal(dimensions.heightStatus, 'NOT_DEFINED');
  assert.ok(dimensions.label.includes('Not Defined'));
  assert.equal('currentDimensions' in legacy, false);
  assert.equal(buildDesignExport(legacy, [breaker()]).project.dimensions.heightMm, null);
}

// E. User enters H/D -> USER_DEFINED, persisted through normalization, not replaced by ABB 2200 mm.
{
  const p = normalizeProject({ manufacturer: 'ABB', dimensions: { heightMm: '2400', depthMm: 1400 } });
  const dimensions = getSwitchboardDimensions(p);
  assert.deepEqual([dimensions.heightMm, dimensions.depthMm, dimensions.heightStatus, dimensions.depthStatus], [2400, 1400, 'USER_DEFINED', 'USER_DEFINED']);
  assert.equal(dimensions.matchedManufacturerDimension, null);
  const reloaded = normalizeProject(JSON.parse(JSON.stringify(p)));
  assert.equal(getSwitchboardDimensions(reloaded).heightMm, 2400);
  assert.equal(buildDesignExport(p, [breaker()]).dimensions.switchboardDimensions.heightStatus, 'USER_DEFINED');
}

// F. Explicit SWB-02 assignment survives 2 -> 1 -> 2.
{
  const p = project('ABB', { quantity: 2 });
  const explicit = breaker({ function: 'MAIN_INPUT', direction: 'Incoming' });
  const inherited = breaker({ function: 'UPS_OUTPUT_LOAD', bus: 'UPS Output Bus' });
  const list = [explicit, inherited];
  assignBreakerToSwitchboard(explicit, 'SWB-02');
  applySwitchboardAssignment(p, list, 1, proposedSwitchboardAssignment(list, 1));
  assert.equal(explicit.switchboardId, 'SWB-01');
  assert.equal(explicit.preferredSwitchboardId, 'SWB-02');
  // Persistence keeps the remembered assignment while in 1-switchboard mode.
  const persisted = normalizeBreaker(JSON.parse(JSON.stringify(explicit)), p, makeId);
  assert.equal(persisted.preferredSwitchboardId, 'SWB-02');
  applySwitchboardAssignment(p, list, 2, proposedSwitchboardAssignment(list, 2));
  assert.equal(explicit.switchboardId, 'SWB-02');
  assert.equal(inherited.switchboardId, 'SWB-02', 'UPS Output bus default proposal unchanged');
}

// G. Dialog Apply -> reopen -> Esc -> no apply.
{
  const fakeDialog = () => {
    const listeners = [];
    return {
      returnValue: '', open: false,
      addEventListener(type, handler, options) { listeners.push({ type, handler, once: options?.once }); },
      showModal() { this.open = true; },
      close(value) { if (value !== undefined) this.returnValue = value; this.open = false; [...listeners].forEach(entry => { if (entry.type === 'close') { entry.handler(); if (entry.once) listeners.splice(listeners.indexOf(entry), 1); } }); },
    };
  };
  for (const scenario of ['Switchboard quantity change', 'Draft export', 'Invalid export', 'Electrical conflict export']) {
    const dialog = fakeDialog();
    let applied = 0;
    openConfirmation(dialog, () => applied++);
    dialog.close('apply'); // user clicks Apply (form method=dialog sets returnValue)
    assert.equal(applied, 1, scenario + ': apply works');
    openConfirmation(dialog, () => applied++);
    dialog.close(); // Esc: browser closes without overwriting returnValue
    assert.equal(applied, 1, scenario + ': Esc after previous Apply must not apply');
    openConfirmation(dialog, () => applied++);
    dialog.close('cancel');
    assert.equal(applied, 1, scenario + ': Cancel must not apply');
  }
}

// H. 400 mm and 600 mm GA sections render with different, proportional widths; bus segments never span foreign sections.
{
  assert.notEqual(sectionPixelWidth(400), sectionPixelWidth(600));
  assert.equal(sectionPixelWidth(400) / sectionPixelWidth(600), 400 / 600);
  const board = { sections: [
    { key: 'SWB-01:S01', busId: 'BUS-A', widthMm: 400 },
    { key: 'SWB-01:S02', busId: 'BUS-B', widthMm: 600 },
    { key: 'SWB-01:S03', busId: 'BUS-A', widthMm: 600 },
    { key: 'SWB-01:S04', busId: 'BUS-A', widthMm: 800 },
  ] };
  const layout = computeBoardLayout(board);
  assert.notEqual(layout.sections[0].width, layout.sections[1].width);
  const busA = layout.segments.filter(segment => segment.busId === 'BUS-A');
  assert.equal(busA.length, 2);
  assert.deepEqual(busA.map(segment => [segment.startIndex, segment.endIndex]), [[0, 0], [2, 3]]);
  layout.segments.forEach(segment => layout.sections.forEach(section => {
    const overlaps = section.x < segment.x2 && section.x + section.width > segment.x1;
    if (overlaps) assert.equal(section.busId, segment.busId, 'bus segment must not cross another bus section');
  }));
}

// I. One invalid engineering issue is counted once.
{
  const p = project('Siemens');
  p.configuration.breakers.va = { ventilation: 'Non-ventilated' };
  const va = breaker({ internalId: 'va', series: 'SENTRON 3VA', frame: '3VA1563', rating: '1000A', type: 'MCCB' });
  const result = evaluateBreaker(va, p);
  assert.equal(result.status, 'INVALID_MANUFACTURER_CONFIGURATION');
  assert.equal(result.operationalCurrentStatus, 'Invalid Manufacturer Configuration');
  assert.equal(validateDesignConfiguration(p, [va]).issues.length, 1);
  const status = designStatus(p, [va]);
  assert.equal(status.invalidConditions.length, 1);
  assert.equal(status.confidenceSummary.invalid, 1);
  assert.equal(new Set(status.invalidConditions.map(item => item.issueId)).size, status.invalidConditions.length);
}

// J. Legacy fields are removed; entry/route contradiction cannot reach Export; section identity from generator.
{
  const p = normalizeProject({ manufacturer: 'ABB', busbarLayouts: { 'SWB-01': { 'Input Bus': { selectedPosition: 'Top' } } } });
  assert.equal(p.configuration.switchboards['SWB-01'].busbarPositions['Input Bus'], 'Top', 'busbarLayouts migrated');
  assert.equal('busbarLayouts' in p, false);
  const legacy = normalizeBreaker({ id: 'CB-01', function: 'MAIN_INPUT', series: 'Emax 2', frame: 'E4.2', rating: '3200A', pole: '4P', route: 'Bottom', routeMode: 'explicit', entry: 'Top', section: 'S07', connection: 'Cable', cableSize: '300 mm2', cableQty: '4', busRole: 'UPS Output Bus' }, p, makeId);
  ['entry', 'section', 'connection', 'cableSize', 'cableQty', 'busRole'].forEach(field => assert.equal(field in legacy, false, field + ' removed'));
  assert.equal(legacy.bus, 'Input Bus', 'bus derived from Function, not stale busRole');
  assert.equal(legacy.route, 'Bottom');
  const exported = buildDesignExport(p, [legacy]);
  const row = exported.breakerSchedule[0];
  assert.equal('entry' in row, false);
  assert.equal('section' in row, false);
  assert.equal(row.route, 'Bottom');
  assert.equal(row.sectionKey, 'SWB-01:S01');
  // Legacy positional array rows are still migrated.
  const arrayRow = normalizeBreaker(['CB-02', 'Gen_Input', 'ABB', 'MNS R', 'Emax 2', 'E1.2', '1250A', '4P', 'ACB', 'Top', '185 mm2', '2'], p, makeId);
  assert.equal(arrayRow.function, 'GEN_INPUT');
  assert.equal(arrayRow.route, 'Top');
  assert.equal('cableSize' in arrayRow, false);
}

// K. Every active Rule ID resolves through the shared source metadata catalog.
{
  assert.ok(Object.values(RULE_SOURCES).every(source => !('pdfPage' in source) && !('printedPage' in source)), 'document-level sources carry no page claims');
  const ruleIds = new Set(['NO_AUTOMATIC_MCCB_PACKING', 'SINGLE_ACB_CUBICLE', 'ELECTRICAL_INCOMER_EXCEEDS_BUS_RATING']);
  for (const manufacturer of ['ABB', 'Siemens']) {
    const catalog = getProductCatalog(manufacturer);
    const positions = manufacturer === 'ABB' ? ['', 'Top', 'Center', 'Bottom'] : ['', 'Top', 'Rear Top', 'Rear Bottom'];
    for (const position of positions) for (const series of catalog.series) for (const frame of catalog.framesBySeries[series]) for (const pole of catalog.poles) for (const connectionType of ['', 'Cable', 'Busbar']) for (const width of [0, 400, 600, 800]) for (const cubicleType of manufacturer === 'ABB' ? ['', 'POWER_CENTER', 'MCC_PLUG_IN'] : ['']) {
      const p = project(manufacturer);
      p.configuration.switchboards['SWB-01'].busbarPositions['Input Bus'] = position;
      const item = breaker({ internalId: 'k', series, frame, pole, rating: '1000A', type: series === 'Emax 2' || series === 'SENTRON 3WA' ? 'ACB' : 'MCCB' });
      p.configuration.breakers.k = { connectionType, cubicleWidthMm: width || undefined, ventilation: 'Ventilated', cubicleType: cubicleType || undefined };
      ruleIds.add(evaluateBreaker(item, p).ruleId);
      ruleIds.add(getBusbarRule(p, 'SWB-01', 'Input Bus').ruleId);
      const schema = getDesignConfigurationSchema(p, [item]);
      schema.switchboards.forEach(board => board.controls.forEach(control => ruleIds.add(control.sourceRule)));
      schema.breakers.forEach(entry => entry.controls.forEach(control => ruleIds.add(control.sourceRule)));
      validateDesignConfiguration(p, [item]).issues.forEach(item => ruleIds.add(item.manufacturerRule));
    }
  }
  ruleIds.forEach(ruleId => assert.notEqual(resolveRuleSource(ruleId).sourceType, 'UNRESOLVED', ruleId + ' must resolve'));
  const table32 = resolveRuleSource('SIEMENS_S8_3WA_TABLE_3_2');
  assert.deepEqual([table32.parentRuleId, table32.table, table32.pdfPage, table32.printedPage], ['SIEMENS_S8_3WA_LAYOUT_TABLES_PREREQUISITES', 'Table 3/2', '29', '25']);
  assert.equal(resolveRuleSource('ABB_MNSR_PC_BREAKERS__E4.2_4P').resolvedRuleId, 'ABB_MNSR_PC_BREAKERS');
  assert.equal(resolveRuleSource('NO_VERIFIED_RULE').pdfPage, 'Not specified in source metadata');
  assert.equal(resolveRuleSource('UNKNOWN_RULE_X').sourceType, 'UNRESOLVED');
  getRuleAudit().forEach(row => assert.notEqual(resolveRuleSource(row.id).sourceType, 'UNRESOLVED'));
  assert.ok(!getRuleAudit().some(row => row.id === 'SIEMENS_S8_CONFIGURATION_REQUIRED'), 'stale hard-coded audit claim removed');
}

// L. Export marks provisional section widths explicitly and lists affected sections.
{
  const p = project();
  const acb = breaker({ function: 'MAIN_INPUT', direction: 'Incoming', series: 'Emax 2', frame: 'E4.2', rating: '3200A', type: 'ACB' });
  const mccb = breaker({ id: 'CB-02' });
  p.configuration.breakers[mccb.internalId] = { cubicleType: 'POWER_CENTER' };
  const exported = buildDesignExport(p, [acb, mccb]);
  assert.equal(exported.containsProvisionalWidth, true);
  assert.equal(exported.widthSummary.verifiedSectionWidthMm, 800);
  assert.equal(exported.widthSummary.provisionalPlanningWidthMm, 600);
  assert.deepEqual(exported.widthSummary.provisionalSections, ['SWB-01:S02']);
  assert.deepEqual(exported.widthSummary.unresolvedPackingSections, ['SWB-01:S02']);
  assert.equal(exported.sectionsBySwitchboard[0].sections[1].widthStatus, 'PROVISIONAL');
  assert.equal(exported.sectionsBySwitchboard[0].sections[0].widthStatus, 'VERIFIED');
  assert.equal('totalWidthMm' in exported, false);
}

// M9. Persisted data is schema-normalized; values are escaped before HTML insertion.
{
  const hostile = '<img src=x onerror=alert(1)>';
  const p = normalizeProject({ manufacturer: hostile, mainBus: hostile, defaultRoute: hostile, quantity: hostile, configuration: { switchboards: { 'SWB-01': { busbarPositions: { 'Input Bus': hostile }, frontLayout: hostile }, [hostile]: {} }, breakers: { [hostile]: { connectionType: 'Cable' }, ok: { connectionType: hostile, cubicleWidthMm: hostile } } } });
  assert.deepEqual([p.manufacturer, p.mainBus, p.defaultRoute, p.quantity], ['ABB', '6300 A', 'Bottom', 1]);
  assert.deepEqual(p.configuration.switchboards['SWB-01'].busbarPositions, {});
  assert.equal(Object.keys(p.configuration.switchboards).includes(hostile), false);
  assert.equal(hostile in p.configuration.breakers, false);
  assert.deepEqual(p.configuration.breakers.ok, {});
  const b = normalizeBreaker({ internalId: hostile, id: hostile, function: hostile, series: hostile, frame: hostile, rating: hostile, pole: hostile, route: hostile, switchboardId: hostile }, p, makeId);
  assert.notEqual(b.internalId, hostile);
  assert.equal(b.function, 'UPS_INPUT_LOAD');
  assert.equal(b.switchboardId, 'SWB-01');
  assert.ok(getProductCatalog('ABB').series.includes(b.series));
  assert.equal(escapeHtml(hostile), '&lt;img src=x onerror=alert(1)&gt;');
}

// Architecture: one status source, one product catalog, correct dependency direction.
{
  const engine = readFileSync(new URL('./manufacturer-rules.js', import.meta.url), 'utf8');
  const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  assert.ok(!/from '\.\/ux-state\.js'/.test(engine), 'rule engine must not depend on ux-state');
  assert.ok(!/from '\.\/(app|design-evaluation|ga-[a-z-]+|persistence)\.js'/.test(engine), 'rule engine must not depend on application/presentation');
  assert.ok(!app.includes("'VALID / MATCHED'") && !app.includes("'INCOMPLETE'") && !app.includes("'INVALID'"), 'app.js must not compute Design Status');
  assert.ok(!/3VA1563|'XT4'|'E6\.2'\]|1250A','1600A'/.test(app.replace(/function defaults\(\)[\s\S]*?\n}/, '')), 'app.js must not keep its own product catalog');
  assert.ok(!getProductCatalog('ABB').framesBySeries['Tmax XT'].includes('XT5'), 'UI offers only frames known to the rule engine');
}

console.log('phase 1 regression tests passed');
