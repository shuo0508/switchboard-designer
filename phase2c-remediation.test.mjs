// Phase 2C regression tests for the Phase 2B independent-verification findings.
import assert from 'node:assert/strict';
import {
  CONFIDENCE,
  MANUFACTURER_RULE_CATALOG,
  evaluateBreaker,
  generateSections,
  getBreakerCandidates,
  getBusbarRule,
  getDesignConfigurationSchema,
  recommendBreaker,
  sanitizeBreakerConfiguration,
  selectSiemens3waTable,
  validateDesignConfiguration,
} from './manufacturer-rules.js';
import { DESIGN_STATUS, DESIGN_STATUS_WORDING, buildDesignExport, designStatus, sectionsBySwitchboard } from './design-evaluation.js';
import { buildGaViewModel } from './ga-view-model.js';
import { getSwitchboardDimensions } from './project-model.js';
import { normalizeBreaker, normalizeProject } from './persistence.js';

const project = (manufacturer, board = {}, breakers = {}, extra = {}) => ({
  manufacturer, system: manufacturer === 'ABB' ? 'MNS R' : 'SIVACON S8', mainBus: '6300 A', defaultRoute: 'Bottom', quantity: 1,
  configuration: { switchboards: { 'SWB-01': { busbarPositions: { 'Input Bus': 'Top' }, ...board } }, breakers },
  switchboards: {}, dimensions: { heightMm: null, depthMm: null }, ...extra,
});
const brk = (o = {}) => ({ internalId: 'b1', id: 'CB-01', switchboardId: 'SWB-01', function: 'UPS_INPUT_LOAD', direction: 'Outgoing', bus: 'Input Bus', route: 'Bottom', pole: '3P', seriesMode: 'manual', frameMode: 'manual', ...o });
const emax = (frame, rating, o = {}) => brk({ series: 'Emax 2', frame, rating, type: 'ACB', ...o });
const va = (frame, rating, o = {}) => brk({ series: 'SENTRON 3VA', frame, rating, type: 'MCCB', pole: '4P', ...o });
const wa = (frame, rating, o = {}) => brk({ series: 'SENTRON 3WA', frame, rating, type: 'ACB', ...o });
function gaFor(p, breakers, status) {
  const boardSections = sectionsBySwitchboard(p, breakers).map(board => ({ boardId: board.boardId, sections: board.sections.map(section => ({ ...section, items: section.items.map(item => breakers.indexOf(item)) })) }));
  return buildGaViewModel({ project: p, breakers, boardSections, busRules: (boardId, bus) => getBusbarRule(p, boardId, bus), evaluations: item => evaluateBreaker(item, p, breakers), dimensions: getSwitchboardDimensions(p), designStatus: status.designStatus });
}

// 1–3. L1: 3VA at its own rated current is never Invalid because of Tab. 3/17.
for (const [frame, rating] of [['3VA1563', '630A'], ['3VA2563', '630A'], ['3VA1580', '800A'], ['3VA2580', '800A'], ['3VA1510', '1000A'], ['3VA2510', '1000A']]) {
  for (const position of ['Top', 'Rear Top', 'Rear Bottom']) for (const route of ['Top', 'Bottom']) for (const ventilation of ['Non-ventilated', 'Ventilated']) {
    const p = project('Siemens', { busbarPositions: { 'Input Bus': position } }, { b1: { ventilation, mountingDesign: 'Fixed-mounted' } });
    const r = evaluateBreaker(va(frame, rating, { route }), p);
    assert.notEqual(r.status, 'INVALID_MANUFACTURER_CONFIGURATION', `${frame} ${rating} ${position} ${route} ${ventilation}`);
    assert.equal(r.breakerRatedCurrent, rating);
    assert.equal(validateDesignConfiguration(p, [va(frame, rating, { route })]).valid, true);
    if (position === 'Top' && route === 'Top') {
      assert.equal(r.operationalCurrent, null, 'Top busbar + top entry: no invented value');
      assert.equal(r.operationalCurrentStatus, CONFIDENCE.NOT_ESTABLISHED);
      assert.equal(r.status, 'MANUFACTURER_CONFIRMATION_REQUIRED');
    } else {
      assert.equal(r.status, 'PARTIALLY_VERIFIED');
      assert.ok(r.operationalCurrent > 0 && r.operationalCurrentStatus === CONFIDENCE.MANUFACTURER_VERIFIED);
      assert.ok(r.sourceConditions.some(item => item.includes('informational; not compared with Breaker Rated Current')));
    }
  }
}
// U2: operational current does not drive AUTO (3VA1563 stays the default even where its Tab. 3/17 value is 625 A).
{
  const p = project('Siemens', { busbarPositions: { 'Input Bus': 'Rear Bottom' } }, { b1: { ventilation: 'Non-ventilated', mountingDesign: 'Fixed-mounted' } });
  assert.equal(recommendBreaker({ manufacturer: 'Siemens', rating: '630A', ...brk({ pole: '4P' }) }, p).frame, '3VA1563');
}

// 4–6. C2: Emax 2 performance-level dependency (p.28–29).
{
  const p = cfg => project('ABB', {}, { b1: cfg });
  const missing = evaluateBreaker(emax('E4.2', '2000A'), p({}));
  assert.equal(missing.confidence, CONFIDENCE.MANUFACTURER_CONFIRMATION_REQUIRED, 'E4.2 2000 A is listed for V only');
  assert.equal(missing.ruleId, 'ABB_EMAX2_E2_E4_E6_RATINGS__PERFORMANCE_LEVEL_REQUIRED');
  assert.ok(missing.missingParameters.some(item => item.includes('listed only for V')));
  const ok = evaluateBreaker(emax('E4.2', '2000A'), p({ performanceLevel: 'V' }));
  assert.equal(ok.status, 'MANUFACTURER_VERIFIED');
  assert.ok(ok.sourceConditions.some(item => item.startsWith('Performance levels')) && ok.matchedConditions.includes('Performance level V lists Iu 2000A'));
  assert.equal(ok.userConfiguration.performanceLevel, 'V');
  const bad = evaluateBreaker(emax('E4.2', '2000A'), p({ performanceLevel: 'N' }));
  assert.equal(bad.status, 'INVALID_MANUFACTURER_CONFIGURATION');
  assert.equal(bad.ruleId, 'ABB_EMAX2_E2_E4_E6_RATINGS__PERFORMANCE_LEVEL_CONFLICT');
  assert.equal(evaluateBreaker(emax('E1.2', '1250A'), p({ performanceLevel: 'X' })).status, 'INVALID_MANUFACTURER_CONFIGURATION', 'X is not an E1.2 level');
  for (const [frame, rating, levels] of [['E1.2', '250A', 'N'], ['E1.2', '1600A', 'B / C / N'], ['E2.2', '250A', 'S'], ['E2.2', '800A', 'N / S / H'], ['E4.2', '2500A', 'V']]) {
    const r = evaluateBreaker(emax(frame, rating), p({}));
    assert.equal(r.status, 'MANUFACTURER_CONFIRMATION_REQUIRED', `${frame} ${rating}`);
    assert.ok(r.missingParameters.some(item => item.includes('listed only for ' + levels)), `${frame} ${rating} trace`);
  }
  assert.equal(evaluateBreaker(emax('E4.2', '3200A'), p({})).status, 'MANUFACTURER_VERIFIED', '3200 A listed for every E4.2 level');
  const schema = getDesignConfigurationSchema(p({}), [emax('E4.2', '2000A')]);
  const control = schema.breakers[0].controls.find(item => item.key === 'performanceLevel');
  assert.deepEqual([control.options, control.required], [['N', 'S', 'H', 'V'], true]);
  const exported = buildDesignExport(p({ performanceLevel: 'V' }), [emax('E4.2', '2000A')]);
  assert.equal(exported.breakerSchedule[0].performanceLevel, 'V');
  // AUTO keeps the dependency visible and does not choose a level.
  const cand = getBreakerCandidates('ABB', '2000A');
  assert.deepEqual(cand.map(item => [item.frame, item.performanceLevelDependency, item.performanceLevels]), [['E2.2', false, ['B', 'N', 'S', 'H']], ['E4.2', true, ['V']]]);
  const rec = recommendBreaker({ manufacturer: 'ABB', rating: '250A' });
  assert.equal(rec.frame, 'XT3');
  const recE = recommendBreaker({ manufacturer: 'ABB', rating: '2500A' });
  assert.equal(recE.frame, 'E2.2');
  assert.deepEqual(recE.unresolvedConditions, ['Emax 2 performance level: 2500A is listed only for N / S / H (not selected by AUTO)']);
}

// 7. L2: stale busbar position of a bus without breakers does not create a two-system table.
{
  const p = project('Siemens', { busbarPositions: { 'Input Bus': 'Rear Top', 'UPS Output Bus': 'Rear Bottom' } }, { b1: { connectionType: 'Cable' } });
  const input = wa('3WA1232', '3200A', { pole: '4P' });
  const ups = wa('3WA1232', '3200A', { internalId: 'b2', id: 'CB-02', bus: 'UPS Output Bus', function: 'UPS_OUTPUT', direction: 'Incoming', pole: '4P' });
  assert.equal(selectSiemens3waTable(p, input, [input, ups]).table.id, 'TABLE_3_4_G1', 'both buses active');
  assert.equal(selectSiemens3waTable(p, input, [input]).table.id, 'TABLE_3_3_G1', 'UPS bus breakers deleted: one-system logic');
  // 3WA1350 busbar connection exists in Tab. 3/3 G1 but not in Tab. 3/4: a stale UPS position must not make it invalid.
  const busbarCfg = structuredClone(p); busbarCfg.configuration.breakers.b1 = { connectionType: 'Busbar' };
  const only1350 = [wa('3WA1350', '5000A', { pole: '4P' })];
  assert.equal(evaluateBreaker(only1350[0], busbarCfg, only1350).table, 'Table 3/3 G1');
  assert.equal(designStatus(busbarCfg, only1350).invalidConditions.length, 0);
  // A breaker on another switchboard does not count either.
  const other = { ...ups, switchboardId: 'SWB-02' };
  assert.equal(selectSiemens3waTable(p, input, [input, other]).table.id, 'TABLE_3_3_G1');
}

// 8–9. C1: qualified designs are RESOLVED WITH QUALIFICATIONS, never VALID / MATCHED.
{
  const partial = project('Siemens', { busbarPositions: { 'Input Bus': 'Rear Top' } }, { b1: { ventilation: 'Ventilated', mountingDesign: 'Fixed-mounted' } });
  const s1 = designStatus(partial, [va('3VA1563', '630A')]);
  assert.equal(s1.designStatus, DESIGN_STATUS.QUALIFIED);
  assert.equal(s1.qualifiedConditions.length, 2);
  const e1 = buildDesignExport(partial, [va('3VA1563', '630A')]);
  assert.equal(e1.designStatus, DESIGN_STATUS.QUALIFIED);
  assert.equal(e1.exportConfidence, DESIGN_STATUS_WORDING[DESIGN_STATUS.QUALIFIED]);
  assert.ok(!e1.exportConfidence.includes('Manufacturer conditions resolved for current configuration'));
  const user = project('Siemens', {}, { b1: { connectionType: 'Cable', cubicleWidthMm: 600 } });
  assert.equal(designStatus(user, [wa('3WA1232', '3200A', { function: 'MAIN_INPUT', direction: 'Incoming' })]).designStatus, DESIGN_STATUS.QUALIFIED);
  const full = project('ABB');
  assert.equal(designStatus(full, [emax('E4.2', '3200A', { function: 'MAIN_INPUT', direction: 'Incoming' })]).designStatus, DESIGN_STATUS.VALID);
  assert.equal(buildDesignExport(full, [emax('E4.2', '3200A', { function: 'MAIN_INPUT', direction: 'Incoming' })]).exportConfidence, DESIGN_STATUS_WORDING[DESIGN_STATUS.VALID]);
  const incomplete = buildDesignExport(project('ABB'), [emax('E4.2', '2000A')]);
  assert.equal(incomplete.designStatus, DESIGN_STATUS.INCOMPLETE);
  assert.equal(incomplete.exportConfidence, DESIGN_STATUS_WORDING[DESIGN_STATUS.INCOMPLETE]);
  const conflict = project('ABB', {}, {}, { switchboards: { 'SWB-01': { ratedMainBus: '3200 A', ratingMode: 'override' } } });
  const cs = designStatus(conflict, [emax('E6.2', '6300A', { function: 'MAIN_INPUT', direction: 'Incoming' })]);
  assert.deepEqual([cs.designStatus, cs.statusBasis, cs.invalidConditions.length, cs.electricalConflicts[0].classification], [DESIGN_STATUS.INVALID, ['Electrical Design Conflict'], 0, 'Electrical Design Conflict']);
}

// 10–12. A1: single E1.2 / T6 = 600 mm; 800 mm** only as the catalogued four-breaker arrangement.
{
  const e12 = evaluateBreaker(emax('E1.2', '1250A', { pole: '4P' }), project('ABB'));
  assert.deepEqual([e12.status, e12.widthMm, e12.availableWidths], ['MANUFACTURER_VERIFIED', 600, [600]]);
  assert.ok(e12.sourceConditions.some(item => item.includes('"600 mm / 800 mm**"')) && e12.sourceConditions.some(item => item.startsWith('Footnote **')));
  const t6p = project('ABB', {}, { b1: { cubicleType: 'POWER_CENTER' } });
  const t6 = evaluateBreaker(brk({ series: 'Tmax T6', frame: 'T6 630A', rating: '630A', type: 'MCCB', pole: '4P' }), t6p);
  assert.deepEqual([t6.status, t6.widthMm, t6.module], ['MANUFACTURER_VERIFIED', 600, '22E']);
  // 800 mm is not offered as a selectable single-breaker width.
  const schema = getDesignConfigurationSchema(project('ABB'), [emax('E1.2', '1250A')]);
  assert.ok(!schema.breakers.flatMap(entry => entry.controls).some(item => item.key === 'cubicleWidthMm'));
  const stored800 = evaluateBreaker(emax('E1.2', '1250A'), project('ABB', {}, { b1: { cubicleWidthMm: 800 } }));
  assert.deepEqual([stored800.status, stored800.widthMm, stored800.ruleId], ['MANUFACTURER_CONFIRMATION_REQUIRED', 600, 'ABB_MNSR_T6_T7_FOUR_BREAKER_800_AVAILABLE']);
  const four = MANUFACTURER_RULE_CATALOG.find(rule => rule.ruleId === 'ABB_MNSR_T6_T7_FOUR_BREAKER_800_AVAILABLE');
  assert.deepEqual([four.confidence, four.usage], [CONFIDENCE.MANUFACTURER_CONFIRMATION_REQUIRED, 'Catalogued only (not automatically matched)']);
  const t6list = Array.from({ length: 4 }, (_, i) => brk({ internalId: 't' + i, id: 'CB-0' + (i + 1), series: 'Tmax T6', frame: 'T6 630A', rating: '630A', type: 'MCCB', pole: '4P' }));
  const t6cfg = project('ABB', {}, Object.fromEntries(t6list.map(item => [item.internalId, { cubicleType: 'POWER_CENTER' }])));
  const sections = generateSections(t6list, t6cfg, 'SWB-01');
  assert.deepEqual(sections.map(section => section.width), [600, 600, 600, 600], 'no automatic 800 mm four-breaker section');
  assert.ok(sections.every(section => section.packingRuleId === 'NO_AUTOMATIC_MCCB_PACKING'));
}

// 13. U1: no source-backed AUTO candidate leaves series / frame unselected.
{
  for (const [manufacturer, rating] of [['ABB', '100A'], ['ABB', '315A'], ['ABB', '500A'], ['Siemens', '400A'], ['Siemens', '16A']]) {
    const p = normalizeProject({ manufacturer });
    const b = normalizeBreaker({ function: 'UPS_INPUT_LOAD', rating }, p, () => 'auto-' + rating);
    assert.deepEqual([b.series, b.frame, b.type, b.recommendation.status], [null, null, null, 'NO_ESTABLISHED_CANDIDATE'], `${manufacturer} ${rating}`);
    const r = evaluateBreaker(b, p, [b]);
    assert.deepEqual([r.ruleId, r.confidence], ['NO_ESTABLISHED_CANDIDATE', CONFIDENCE.MANUFACTURER_CONFIRMATION_REQUIRED]);
    assert.equal(r.source.sourceType, 'APPLICATION');
    const section = generateSections([b], p, 'SWB-01')[0];
    assert.deepEqual([section.widthStatus, section.packingRuleId], ['PROVISIONAL', 'NO_ESTABLISHED_CANDIDATE']);
    const exported = buildDesignExport(p, [b]);
    assert.deepEqual([exported.designStatus, exported.breakerSchedule[0].frame], [DESIGN_STATUS.INCOMPLETE, null]);
  }
}

// 14. L3: 3WA below the listed device rating → confirmation; above → invalid.
{
  const p = project('Siemens', {}, { b1: { connectionType: 'Cable' } });
  const low = evaluateBreaker(wa('3WA1232', '2500A', { pole: '4P' }), p);
  assert.equal(low.status, 'MANUFACTURER_CONFIRMATION_REQUIRED');
  assert.ok(low.missingParameters.some(item => item.includes('NOT ESTABLISHED')));
  assert.equal(evaluateBreaker(wa('3WA1232', '4000A', { pole: '4P' }), p).status, 'INVALID_MANUFACTURER_CONFIGURATION');
  assert.equal(evaluateBreaker(wa('3WA1232', '3200A', { pole: '4P' }), p).status, 'MANUFACTURER_VERIFIED');
}

// 15. L4: frame change revalidates / clears stale frame-specific configuration.
{
  const p = project('ABB', {}, { b1: { cubicleWidthMm: 800, performanceLevel: 'L' } });
  const b = emax('E1.2', '1250A');
  b.frame = 'E2.2';
  const removed = sanitizeBreakerConfiguration(p, [b]);
  assert.deepEqual(p.configuration.breakers.b1, {}, 'E1.2 width and level L do not survive the change to E2.2');
  assert.deepEqual(removed.map(item => item.key).sort(), ['cubicleWidthMm', 'performanceLevel']);
  const s = project('Siemens', {}, { b1: { connectionType: 'Cable', cubicleWidthMm: 400 } });
  const w = wa('3WA1116', '1600A', { pole: '3P' });
  assert.equal(evaluateBreaker(w, s).status, 'MANUFACTURER_SUPPORTED_USER_SELECTED');
  w.frame = '3WA1232'; w.rating = '3200A';
  sanitizeBreakerConfiguration(s, [w]);
  assert.deepEqual(s.configuration.breakers.b1, { connectionType: 'Cable' }, '400 mm is not a 3WA1232 alternative');
  const keep = project('ABB', {}, { b1: { performanceLevel: 'V' } });
  sanitizeBreakerConfiguration(keep, [emax('E4.2', '2000A')]);
  assert.deepEqual(keep.configuration.breakers.b1, { performanceLevel: 'V' }, 'valid values are retained');
}

// 16. F1: 3WA1350 Table 3/3 G2 footnote 4) ambiguity → confirmation, never invalid.
{
  const g2 = (cfg, board, depthMm = 1200, position = 'Rear Bottom', route = 'Bottom') => project('Siemens', { busbarPositions: { 'Input Bus': position }, ...board }, { b1: { connectionType: 'Cable', mountingDesign: 'Withdrawable Unit', ...cfg } }, { dimensions: { heightMm: null, depthMm } });
  const b = route => wa('3WA1350', '5000A', { pole: '4P', route });
  const cases = [
    [g2({ breakingCapacityClass: 'S' }, { frameHeightMm: 2200, frontLayout: 'Double Front' }), 'Bottom'],
    [g2({ breakingCapacityClass: 'H' }, { frameHeightMm: 2200, frontLayout: 'Single Front' }), 'Bottom'],
    [g2({ breakingCapacityClass: 'H' }, { frameHeightMm: 2200, frontLayout: 'Double Front' }, 1000), 'Bottom'],
    [g2({ breakingCapacityClass: 'H' }, { frameHeightMm: 2200, frontLayout: 'Double Front' }, 1200, 'Rear Top', 'Top'), 'Top'],
    [g2({}, { frameHeightMm: 2200 }), 'Bottom'],
  ];
  for (const [p, route] of cases) {
    const r = evaluateBreaker(b(route), p);
    assert.equal(r.table, 'Table 3/3 G2');
    assert.equal(r.status, 'MANUFACTURER_CONFIRMATION_REQUIRED');
    assert.ok(r.sourceConditions.some(item => item.includes('SOURCE_AMBIGUOUS') && item.includes('p.104') && item.includes('special cubicle at the rear')));
  }
  // Non-ambiguous footnotes keep their established meaning (fn1 withdrawable / 2,200 mm).
  const fn1 = project('Siemens', {}, { b1: { connectionType: 'Busbar', mountingDesign: 'Withdrawable Unit' } });
  fn1.configuration.switchboards['SWB-01'].frameHeightMm = 2000;
  assert.equal(evaluateBreaker(wa('3WA1363', '6300A', { pole: '4P' }), fn1).status, 'INVALID_MANUFACTURER_CONFIGURATION');
}

// C3: execution-dependent ABB device notes reach the trace; applicability not assumed.
{
  const cfg = ct => project('ABB', {}, { b1: { cubicleType: ct } });
  for (const ct of ['MCC_PLUG_IN', 'POWER_CENTER']) {
    const xt1 = evaluateBreaker(brk({ series: 'Tmax XT', frame: 'XT1', rating: '160A', type: 'MCCB' }), cfg(ct));
    assert.equal(xt1.status, 'MANUFACTURER_CONFIRMATION_REQUIRED', 'XT1 160 A vs Plug-In In max 125 A: execution not established (' + ct + ')');
    assert.ok(xt1.sourceConditions.some(item => item.includes('In max = 125A')));
    const t5 = evaluateBreaker(brk({ series: 'Tmax T5', frame: 'T5 630A', rating: '630A', type: 'MCCB' }), cfg(ct));
    assert.equal(t5.status, 'MANUFACTURER_CONFIRMATION_REQUIRED');
    assert.ok(t5.sourceConditions.some(item => item.includes('derated by 10%')));
    assert.ok(t5.missingParameters.some(item => item.includes('Breaker execution')));
    assert.equal(evaluateBreaker(brk({ series: 'Tmax T5', frame: 'T5 400A', rating: '400A', type: 'MCCB' }), cfg(ct)).status, 'MANUFACTURER_VERIFIED', 'T5 400 note does not apply');
  }
}

// 17. No downstream layer increases confidence (device → section → design → GA → export).
{
  const RANK = ['Invalid Manufacturer Configuration', 'Manufacturer Confirmation Required', 'Not Established By Provided Source', 'Partially Verified', 'Manufacturer-Supported · User Selected', 'Manufacturer Verified'];
  const WIDTH_RANK = { PROVISIONAL: 1, PARTIALLY_VERIFIED: 3, USER_SELECTED: 4, VERIFIED: 5 };
  const scenarios = [
    [project('ABB'), [emax('E4.2', '3200A')]],
    [project('ABB'), [emax('E4.2', '2000A')]],
    [project('ABB', {}, { b1: { cubicleType: 'MCC_PLUG_IN' } }), [brk({ series: 'Tmax XT', frame: 'XT4', rating: '250A', type: 'MCCB' })]],
    [project('Siemens', {}, { b1: { connectionType: 'Cable', cubicleWidthMm: 600 } }), [wa('3WA1232', '3200A')]],
    [project('Siemens', { busbarPositions: { 'Input Bus': 'Rear Top' } }, { b1: { ventilation: 'Ventilated', mountingDesign: 'Fixed-mounted' } }), [va('3VA1563', '630A')]],
  ];
  for (const [p, list] of scenarios) {
    const status = designStatus(p, list);
    const ga = gaFor(p, list, status);
    const ex = buildDesignExport(p, list);
    const device = evaluateBreaker(list[0], p, list);
    const section = status.boards[0].sections[0];
    assert.ok(RANK.indexOf(section.confidence) <= RANK.indexOf(device.confidence), 'section ≤ device');
    assert.ok(WIDTH_RANK[section.widthStatus] <= RANK.indexOf(device.confidence), 'width status ≤ device');
    assert.ok(RANK.indexOf(ga.boards[0].confidence) <= RANK.indexOf(section.confidence), 'GA board ≤ section');
    assert.equal(ga.boards[0].sections[0].confidence, section.confidence);
    assert.equal(ga.boards[0].designStatus, status.designStatus);
    assert.deepEqual([ex.designStatus, ex.exportConfidence], [status.designStatus, DESIGN_STATUS_WORDING[status.designStatus]]);
    assert.equal(ex.sectionsBySwitchboard[0].sections[0].widthStatus, section.widthStatus);
    assert.equal(ex.breakerSchedule[0].evaluation.confidence, device.confidence);
    if (status.designStatus === DESIGN_STATUS.VALID) assert.ok(status.boards.every(board => board.sections.every(item => item.widthStatus === 'VERIFIED')));
  }
}

// Phase 1 separations still hold: physical switchboard ≠ electrical bus ≠ cable route ≠ physical busbar position.
{
  const p = project('Siemens', { busbarPositions: { 'Input Bus': 'Rear Top', 'UPS Output Bus': 'Rear Bottom' } }, { b1: { connectionType: 'Cable' } }, { quantity: 2, switchboards: { 'SWB-02': { ratedMainBus: '3200 A', ratingMode: 'override' } } });
  const a = wa('3WA1232', '3200A', { pole: '4P' });
  const moved = { ...a, route: 'Top' };
  assert.deepEqual([moved.bus, moved.direction], [a.bus, a.direction], 'route does not change electrical topology');
  assert.equal(getBusbarRule(p, 'SWB-01', 'Input Bus').roleLabel, 'Input / Normal Bus');
  p.configuration.switchboards['SWB-01'].busbarPositions['Input Bus'] = 'Rear Bottom';
  assert.equal(getBusbarRule(p, 'SWB-01', 'Input Bus').roleLabel, 'Input / Normal Bus', 'bus role is not inferred from physical position');
  const other = { ...a, internalId: 'b9', switchboardId: 'SWB-02', bus: 'UPS Output Bus', function: 'UPS_OUTPUT' };
  const exp = buildDesignExport(p, [a, other]);
  assert.deepEqual(exp.switchboards.map(item => [item.switchboardId, item.ratedMainBusCurrent, item.ratingMode]), [['SWB-01', '6300 A', 'inherited'], ['SWB-02', '3200 A', 'override']]);
  assert.equal(selectSiemens3waTable(p, a, [a, other]).table.id, 'TABLE_3_3_G2', 'a bus on SWB-02 is not a second system on SWB-01');
}

console.log('phase 2C remediation tests passed');
