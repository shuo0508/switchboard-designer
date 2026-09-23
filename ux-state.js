// Application / UX state helpers. Depends on project-model only (never on the rule engine).
import { BUS_RATINGS, SWITCHBOARD_IDS, breakerDisplayLabel, ratedMainBus, switchboardIds } from './project-model.js';

export { BUS_RATINGS, breakerDisplayLabel, ratedMainBus, switchboardIds };

export function ensureSwitchboardState(project) {
  project.mainBus = BUS_RATINGS.includes(project.mainBus) ? project.mainBus : BUS_RATINGS[0];
  project.switchboards = project.switchboards || {};
  SWITCHBOARD_IDS.forEach(boardId => {
    const existing = project.switchboards[boardId] || {};
    const override = existing.ratingMode === 'override' && BUS_RATINGS.includes(existing.ratedMainBus);
    project.switchboards[boardId] = {
      ratedMainBus: override ? existing.ratedMainBus : project.mainBus,
      ratingMode: override ? 'override' : 'inherited',
    };
  });
  return project;
}

export function updateDefaultMainBus(project, value) {
  ensureSwitchboardState(project);
  project.mainBus = value;
  Object.values(project.switchboards).forEach(board => {
    if (board.ratingMode !== 'override') board.ratedMainBus = value;
  });
}

export function setRatedMainBus(project, boardId, value) {
  ensureSwitchboardState(project);
  project.switchboards[boardId] = { ratedMainBus: value, ratingMode: 'override' };
}

export function revertRatedMainBus(project, boardId) {
  ensureSwitchboardState(project);
  project.switchboards[boardId] = { ratedMainBus: project.mainBus, ratingMode: 'inherited' };
}

export function cableRouteLabel(route) {
  return route === 'Top' ? 'Top Entry / Exit' : 'Bottom Entry / Exit';
}

// Explicit user assignment. The preferred board is kept even while the project is in 1-switchboard mode.
export function assignBreakerToSwitchboard(breaker, boardId) {
  breaker.switchboardId = boardId;
  breaker.assignmentMode = 'explicit';
  breaker.preferredSwitchboardId = boardId;
}

export function proposedSwitchboardAssignment(breakers, quantity) {
  return breakers.map(breaker => ({
    internalId: breaker.internalId,
    current: breaker.switchboardId || 'SWB-01',
    proposed: quantity === 1
      ? 'SWB-01'
      : breaker.assignmentMode === 'explicit'
        ? breaker.preferredSwitchboardId || breaker.switchboardId || 'SWB-01'
        : breaker.bus === 'UPS Output Bus' ? 'SWB-02' : 'SWB-01',
  }));
}

export function applySwitchboardAssignment(project, breakers, quantity, proposal) {
  project.quantity = quantity;
  const targetById = new Map(proposal.map(item => [item.internalId, item.proposed]));
  breakers.forEach(breaker => {
    breaker.switchboardId = targetById.get(breaker.internalId) || 'SWB-01';
  });
  ensureSwitchboardState(project);
}
