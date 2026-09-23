import assert from 'node:assert/strict';
import { buildDesignExport } from './design-evaluation.js';
import { getSwitchboardDimensions } from './project-model.js';
import {
  evaluateBreaker,
  generateSections,
  getBusbarRule,
  getDesignConfigurationSchema,
  recommendBreaker,
} from './manufacturer-rules.js';
import { buildGaViewModel } from './ga-view-model.js';
import {
  FUNCTIONS,
  FUNCTION_OPTIONS,
  busForFunction,
  flowForBreaker,
  renumberBreakersBySwitchboard,
} from './topology.js';

const projectFor = (manufacturer = 'ABB', overrides = {}) => ({
  manufacturer,
  system: manufacturer === 'ABB' ? 'MNS R' : 'SIVACON S8',
  mainBus: '6300 A',
  defaultRoute: 'Bottom',
  quantity: 1,
  configuration: { switchboards: {}, breakers: {} },
  ...overrides,
});

const breaker = (overrides = {}) => ({
  internalId: 'breaker-1', id: 'CB-01', switchboardId: 'SWB-01',
  function: 'MAIN_INPUT', direction: 'Incoming', bus: 'Input Bus',
  series: 'Emax 2', frame: 'E4.2', rating: '3200A', pole: '4P',
  type: 'ACB', route: 'Bottom', routeMode: 'explicit', ...overrides,
});

function gaFor(project, breakers) {
  const boardIds = project.quantity === 2 ? ['SWB-01', 'SWB-02'] : ['SWB-01'];
  const boardSections = boardIds.map(boardId => ({
    boardId,
    sections: generateSections(breakers, project, boardId).map(section => ({
      ...section,
      items: section.items.map(item => breakers.indexOf(item)),
    })),
  }));
  return buildGaViewModel({
    project,
    breakers,
    boardSections,
    busRules: (boardId, bus) => getBusbarRule(project, boardId, bus),
    evaluations: item => evaluateBreaker(item, project),
    dimensions: getSwitchboardDimensions(project),
  });
}

// Every Function is driven by the shared topology model used by UI and GA.
const expectedFunctions = {
  MAIN_INPUT: ['Input Bus', 'Incoming', 'SOURCE_TO_BUS'],
  GEN_INPUT: ['Input Bus', 'Incoming', 'SOURCE_TO_BUS'],
  UPS_INPUT: ['Input Bus', 'Outgoing', 'BUS_TO_DESTINATION'],
  UPS_OUTPUT: ['UPS Output Bus', 'Incoming', 'SOURCE_TO_BUS'],
  LOADBANK: ['Input Bus', 'Outgoing', 'BUS_TO_DESTINATION'],
  BYPASS: ['Input Bus', 'Outgoing', 'BUS_TO_DESTINATION'],
  UPS_INPUT_LOAD: ['Input Bus', 'Outgoing', 'BUS_TO_DESTINATION'],
  UPS_OUTPUT_LOAD: ['UPS Output Bus', 'Outgoing', 'BUS_TO_DESTINATION'],
};
assert.deepEqual(FUNCTION_OPTIONS, Object.keys(expectedFunctions));
for (const [key, [bus, direction, flow]] of Object.entries(expectedFunctions)) {
  assert.equal(busForFunction(key), bus, key + ' bus');
  assert.equal(FUNCTIONS[key].direction, direction, key + ' direction');
  assert.equal(flowForBreaker({ function: key }).direction, flow, key + ' flow');
}
assert.equal(flowForBreaker({ function: 'UPS_INPUT' }).destinationLabel, 'UPS INPUT');
assert.equal(flowForBreaker({ function: 'UPS_OUTPUT' }).sourceLabel, 'UPS OUTPUT');

// ABB route is carried through Rule Trace data, GA and Export; width is unchanged by design.
for (const route of ['Top', 'Bottom']) {
  const project = projectFor('ABB');
  project.configuration.switchboards['SWB-01'] = { busbarPositions: { 'Input Bus': 'Top' } };
  const item = breaker({ route });
  const evaluation = evaluateBreaker(item, project);
  const ga = gaFor(project, [item]);
  const exported = buildDesignExport(project, [item]);
  assert.equal(evaluation.widthMm, 800);
  assert.equal(ga.boards[0].sections[0].breakers[0].route, route);
  assert.equal(exported.breakerSchedule[0].route, route);
  assert.equal(exported.breakerSchedule[0].evaluation.ruleId, evaluation.ruleId);
}

// Siemens route changes the Table 3/17 operational-current result while width remains Tab. 3/16 nominal 400 mm.
const siemensRoute = projectFor('Siemens');
siemensRoute.configuration.switchboards['SWB-01'] = { busbarPositions: { 'Input Bus': 'Rear Top' } };
for (const [route, expectedCurrent, expectedConfidence] of [['Top', 630, 'Partially Verified'], ['Bottom', 625, 'Invalid Manufacturer Configuration']]) {
  const item = breaker({ internalId: 'va-' + route, series: 'SENTRON 3VA', frame: '3VA1563', rating: '630A', pole: '4P', type: 'MCCB', route });
  siemensRoute.configuration.breakers[item.internalId] = { ventilation: 'Non-ventilated', mountingDesign: 'Fixed-mounted' };
  const result = evaluateBreaker(item, siemensRoute);
  assert.equal(result.widthMm, 400);
  assert.equal(result.operationalCurrent, expectedCurrent);
  assert.equal(result.confidence, expectedConfidence);
  assert.equal(gaFor(siemensRoute, [item]).boards[0].sections[0].breakers[0].route, route);
  assert.equal(buildDesignExport(siemensRoute, [item]).breakerSchedule[0].evaluation.operationalCurrent, expectedCurrent);
}

// Missing and invalid Siemens operational configuration propagate to Section/GA confidence.
const partialProject = projectFor('Siemens');
partialProject.configuration.switchboards['SWB-01'] = { busbarPositions: { 'Input Bus': 'Rear Top' } };
const partialVa = breaker({ series: 'SENTRON 3VA', frame: '3VA1563', rating: '630A', type: 'MCCB' });
assert.equal(evaluateBreaker(partialVa, partialProject).confidence, 'Manufacturer Confirmation Required');
assert.equal(gaFor(partialProject, [partialVa]).boards[0].confidence, 'Manufacturer Confirmation Required');

// Representative ratings drive manufacturer-specific recommendations.
const recommendationCases = [
  ['ABB', '160A', 'Tmax XT', 'XT1', 'MCCB'],
  ['ABB', '400A', 'Tmax T5', 'T5 400A', 'MCCB'],
  ['ABB', '630A', 'Tmax T5', 'T5 630A', 'MCCB'],
  ['ABB', '1250A', 'Emax 2', 'E1.2', 'ACB'],
  ['ABB', '3200A', 'Emax 2', 'E4.2', 'ACB'],
  ['ABB', '6300A', 'Emax 2', 'E6.2', 'ACB'],
  ['Siemens', '630A', 'SENTRON 3VA', '3VA1563', 'MCCB'],
  ['Siemens', '1250A', 'SENTRON 3WA', '3WA1112', 'ACB'],
  ['Siemens', '3200A', 'SENTRON 3WA', '3WA1232', 'ACB'],
  ['Siemens', '6300A', 'SENTRON 3WA', '3WA1363', 'ACB'],
];
for (const [manufacturer, rating, series, frame, type] of recommendationCases) {
  const result = recommendBreaker({ manufacturer, rating });
  assert.deepEqual([result.series, result.frame, result.type], [series, frame, type]);
}

// Pole and ABB E1.2 width selection change section width, GA width and Export width together.
const abb = projectFor('ABB');
abb.configuration.switchboards['SWB-01'] = { busbarPositions: { 'Input Bus': 'Top' } };
for (const [pole, width] of [['3P', 600], ['4P', 800]]) {
  const item = breaker({ pole });
  assert.equal(evaluateBreaker(item, abb).widthMm, width);
  assert.equal(generateSections([item], abb, 'SWB-01')[0].width, width);
  assert.equal(gaFor(abb, [item]).boards[0].combinedPlanningWidthMm, width);
  assert.equal(buildDesignExport(abb, [item]).combinedPlanningWidthMm, width);
}
const e12 = breaker({ internalId: 'e12', frame: 'E1.2', rating: '1250A' });
for (const width of [600, 800]) {
  abb.configuration.breakers.e12 = { cubicleWidthMm: width };
  assert.equal(evaluateBreaker(e12, abb).widthMm, width);
  assert.equal(buildDesignExport(abb, [e12]).sectionsBySwitchboard[0].combinedPlanningWidthMm, width);
}

// ABB and Siemens busbar positions remain electrical-role independent and propagate into GA/export.
for (const [manufacturer, positions] of [['ABB', ['Top', 'Center', 'Bottom']], ['Siemens', ['Top', 'Rear Top', 'Rear Bottom']]]) {
  for (const position of positions) {
    const project = projectFor(manufacturer);
    project.configuration.switchboards['SWB-01'] = { busbarPositions: { 'Input Bus': position } };
    assert.equal(getBusbarRule(project, 'SWB-01', 'Input Bus').physicalPosition, position);
    const exported = buildDesignExport(project, [breaker()]);
    assert.equal(exported.busbarRules[0].physicalPosition, position);
  }
}

// Siemens 3WA contextual inputs: connection, selected width, mounting and front layout.
const waProject = projectFor('Siemens');
waProject.configuration.switchboards['SWB-01'] = { busbarPositions: { 'Input Bus': 'Rear Top' } };
const wa3p = breaker({ internalId: 'wa3p', series: 'SENTRON 3WA', frame: '3WA1232', rating: '3200A', pole: '3P' });
waProject.configuration.breakers.wa3p = { connectionType: 'Cable', cubicleWidthMm: 600 };
assert.equal(evaluateBreaker(wa3p, waProject).widthMm, 600);
waProject.configuration.breakers.wa3p.cubicleWidthMm = 800;
assert.equal(evaluateBreaker(wa3p, waProject).widthMm, 800);

const waHigh = breaker({ internalId: 'wa-high', series: 'SENTRON 3WA', frame: '3WA1363', rating: '6300A', pole: '4P' });
waProject.configuration.breakers['wa-high'] = { connectionType: 'Busbar', mountingDesign: 'Withdrawable Unit' };
const highMissing = evaluateBreaker(waHigh, waProject);
assert.equal(highMissing.confidence, 'Manufacturer Confirmation Required');
assert.ok(highMissing.missingParameters.some(item => item.startsWith('Frame height 2200 mm')));
assert.ok(getDesignConfigurationSchema(waProject, [waHigh]).switchboards[0].controls.some(control => control.key === 'frameHeightMm' && control.required));
waProject.configuration.switchboards['SWB-01'].frameHeightMm = 2200;
for (const frontLayout of ['Single Front', 'Double Front']) {
  waProject.configuration.switchboards['SWB-01'].frontLayout = frontLayout;
  const result = evaluateBreaker(waHigh, waProject);
  assert.equal(result.widthMm, 1000);
  assert.equal(result.table, 'Table 3/3 G1');
  assert.equal(result.confidence, 'Manufacturer Verified');
  assert.equal(result.userConfiguration.frontLayout, frontLayout);
}
assert.ok(getDesignConfigurationSchema(waProject, [waHigh]).switchboards[0].controls.some(control => control.key === 'frontLayout'));

// One/two switchboards, per-board numbering, width and stable internal identity.
const b1 = breaker({ internalId: 'stable-a', switchboardId: 'SWB-01' });
const b2 = breaker({ internalId: 'stable-b', switchboardId: 'SWB-02', bus: 'UPS Output Bus', function: 'UPS_OUTPUT' });
const b3 = breaker({ internalId: 'stable-c', switchboardId: 'SWB-01' });
renumberBreakersBySwitchboard([b1, b2, b3]);
assert.deepEqual([b1.id, b2.id, b3.id], ['CB-01', 'CB-01', 'CB-02']);
assert.deepEqual([b1.internalId, b2.internalId, b3.internalId], ['stable-a', 'stable-b', 'stable-c']);
const two = projectFor('ABB', { quantity: 2 });
two.configuration.switchboards = {
  'SWB-01': { busbarPositions: { 'Input Bus': 'Top' } },
  'SWB-02': { busbarPositions: { 'UPS Output Bus': 'Bottom' } },
};
const twoExport = buildDesignExport(two, [b1, b2, b3]);
assert.equal(twoExport.sectionsBySwitchboard.length, 2);
assert.equal(twoExport.sectionsBySwitchboard[0].combinedPlanningWidthMm, 1600);
assert.equal(twoExport.sectionsBySwitchboard[1].combinedPlanningWidthMm, 800);
assert.equal(twoExport.combinedPlanningWidthMm, 2400);
assert.equal(gaFor(two, [b1, b2, b3]).boards.length, 2);

// Main-bus rating and user-defined H/D do not silently alter manufacturer width; they remain explicit in GA/export.
const busRatingProject = projectFor('ABB', { mainBus: '5000 A' });
busRatingProject.configuration.switchboards['SWB-01'] = { busbarPositions: { 'Input Bus': 'Top' } };
const busRatingGa = gaFor(busRatingProject, [breaker()]);
assert.equal(busRatingGa.boards[0].ratedMainBus, '5000 A');
assert.equal(busRatingGa.boards[0].combinedPlanningWidthMm, 800);
const finalExport = buildDesignExport(busRatingProject, [breaker()]);
assert.equal(finalExport.project.mainBus, '5000 A');
assert.equal(finalExport.dimensions.switchboardDimensions.heightStatus, 'NOT_DEFINED');
assert.equal(finalExport.breakerSchedule[0].evaluation.ruleId, evaluateBreaker(breaker(), busRatingProject).ruleId);

console.log('full parameter-to-behavior shared-chain tests passed');