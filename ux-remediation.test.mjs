import assert from 'node:assert/strict';
import { buildDesignExport, evaluateBreaker, getBusbarRule } from './manufacturer-rules.js';
import { FUNCTIONS, flowForBreaker, renumberBreakersBySwitchboard } from './topology.js';
import {
  applySwitchboardAssignment,
  breakerDisplayLabel,
  cableRouteLabel,
  designStatus,
  ensureSwitchboardState,
  proposedSwitchboardAssignment,
  ratedMainBus,
  setRatedMainBus,
  updateDefaultMainBus,
} from './ux-state.js';

const project = ensureSwitchboardState({
  manufacturer: 'ABB', system: 'MNS R', mainBus: '6300 A', defaultRoute: 'Bottom', quantity: 1,
  configuration: { switchboards: { 'SWB-01': { busbarPositions: { 'Input Bus': 'Top' } } }, breakers: {} },
});
const breakers = [
  { internalId: 'a', id: 'CB-01', switchboardId: 'SWB-01', function: 'MAIN_INPUT', bus: 'Input Bus', direction: 'Incoming', series: 'Emax 2', frame: 'E4.2', rating: '3200A', pole: '4P', type: 'ACB', route: 'Bottom', routeMode: 'default' },
  { internalId: 'b', id: 'CB-02', switchboardId: 'SWB-01', function: 'UPS_OUTPUT', bus: 'UPS Output Bus', direction: 'Incoming', series: 'Emax 2', frame: 'E1.2', rating: '1250A', pole: '4P', type: 'ACB', route: 'Top', routeMode: 'explicit' },
];

// Display terminology changes do not change electrical topology.
assert.equal(FUNCTIONS.UPS_INPUT.label, 'Feeder to UPS Input');
assert.equal(FUNCTIONS.UPS_OUTPUT.label, 'Incomer from UPS Output');
assert.equal(flowForBreaker({ function: 'UPS_INPUT' }).direction, 'BUS_TO_DESTINATION');
assert.equal(flowForBreaker({ function: 'UPS_OUTPUT' }).direction, 'SOURCE_TO_BUS');
assert.equal(cableRouteLabel('Top'), 'Top Entry / Exit');

// Per-switchboard ratings inherit independently and overrides survive default changes.
project.quantity = 2;
setRatedMainBus(project, 'SWB-02', '3200 A');
updateDefaultMainBus(project, '5000 A');
assert.equal(ratedMainBus(project, 'SWB-01'), '5000 A');
assert.equal(ratedMainBus(project, 'SWB-02'), '3200 A');
assert.equal(project.switchboards['SWB-02'].ratingMode, 'override');

// Assignment preview preserves explicit assignments and local numbering remains stable.
breakers[1].assignmentMode = 'inherited';
const proposal = proposedSwitchboardAssignment(breakers, 2);
applySwitchboardAssignment(project, breakers, 2, proposal);
renumberBreakersBySwitchboard(breakers);
assert.equal(breakers[1].switchboardId, 'SWB-02');
assert.equal(breakerDisplayLabel(breakers[0]), 'SWB-01 / CB-01');
assert.equal(breakerDisplayLabel(breakers[1]), 'SWB-02 / CB-01');

// A user-selected supported busbar is not represented as manufacturer-required.
const busRule = getBusbarRule(project, 'SWB-01', 'Input Bus');
assert.equal(busRule.confidence, 'Manufacturer-Supported · User Selected');

const validation = { valid: true, issues: [] };
const completeness = { items: [{ scope: 'SWB-02', label: 'Physical Position', status: 'Missing', sourceRule: 'TEST' }] };
const status = designStatus(project, breakers, item => evaluateBreaker(item, project), validation, completeness);
assert.equal(status.designStatus, 'INCOMPLETE');
assert.equal(status.unresolvedConditions.length, 1);

const exported = buildDesignExport(project, breakers);
assert.equal(exported.switchboards[0].ratedMainBusCurrent, '5000 A');
assert.equal(exported.switchboards[1].ratedMainBusCurrent, '3200 A');
assert.equal(exported.breakerSchedule[1].displayLabel, 'SWB-02 / CB-01');
assert.ok('designStatus' in exported);
assert.ok(Array.isArray(exported.unresolvedConditions));
assert.ok('confidenceSummary' in exported);
assert.equal(exported.combinedPlanningWidthMm, exported.totalWidthMm);

console.log('UX remediation state, terminology, identity and export tests passed');
