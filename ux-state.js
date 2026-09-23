export const BUS_RATINGS = ['6300 A', '5000 A', '3200 A'];

export function switchboardIds(project) {
  return project.quantity === 2 ? ['SWB-01', 'SWB-02'] : ['SWB-01'];
}

export function ensureSwitchboardState(project) {
  project.mainBus = project.mainBus || '6300 A';
  project.switchboards = project.switchboards || {};
  ['SWB-01', 'SWB-02'].forEach(boardId => {
    const existing = project.switchboards[boardId] || {};
    project.switchboards[boardId] = {
      ratedMainBus: existing.ratedMainBus || project.mainBus,
      ratingMode: existing.ratingMode === 'override' ? 'override' : 'inherited',
    };
  });
  return project;
}

export function ratedMainBus(project, boardId) {
  ensureSwitchboardState(project);
  return project.switchboards[boardId]?.ratedMainBus || project.mainBus;
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

export function breakerDisplayLabel(breaker) {
  return `${breaker.switchboardId || 'SWB-01'} / ${breaker.id}`;
}

export function cableRouteLabel(route) {
  return route === 'Top' ? 'Top Entry / Exit' : 'Bottom Entry / Exit';
}

export function proposedSwitchboardAssignment(breakers, quantity) {
  return breakers.map(breaker => ({
    internalId: breaker.internalId,
    current: breaker.switchboardId || 'SWB-01',
    proposed: quantity === 1
      ? 'SWB-01'
      : breaker.assignmentMode === 'explicit'
        ? breaker.switchboardId || 'SWB-01'
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

export function designStatus(project, breakers, evaluations, validation, completeness) {
  const results = breakers.map(evaluations);
  const summary = {
    manufacturerMatched: results.filter(result => result.confidence === 'Manufacturer Verified').length,
    confirmationRequired: results.filter(result => result.confidence === 'Manufacturer Confirmation Required').length,
    engineeringEstimate: results.filter(result => result.classification === 'Engineering Estimate').length,
    invalid: results.filter(result => result.confidence === 'Invalid Manufacturer Configuration').length + validation.issues.length,
  };
  const unresolvedConditions = completeness.items
    .filter(item => item.status === 'Missing')
    .map(item => ({ scope: item.scope, condition: item.label, sourceRule: item.sourceRule }));
  const invalidConditions = validation.issues.map(issue => ({
    scope: issue.scope,
    field: issue.field,
    message: issue.message,
    manufacturerRule: issue.manufacturerRule || null,
  }));
  const status = summary.invalid ? 'INVALID' : unresolvedConditions.length || summary.confirmationRequired ? 'INCOMPLETE' : 'VALID / MATCHED';
  return { designStatus: status, unresolvedConditions, invalidConditions, confidenceSummary: summary };
}
