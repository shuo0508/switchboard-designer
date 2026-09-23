// Application layer: the single source of Design Status, section summaries and Export.
// Manufacturer Data / Rule Engine  ->  this module  ->  UI / GA / Export
import {
  PACKING_STATUS,
  RULE_SOURCES,
  SECTION_WIDTH_STATUS,
  evaluateBreaker,
  generateSections,
  getAvailableManufacturerDimensions,
  getBusbarRule,
  getConfigurationCompleteness,
  getRuleAudit,
  validateDesignConfiguration,
} from './manufacturer-rules.js';
import { validateElectricalConsistency } from './electrical-validation.js';
import { breakerDisplayLabel, getSwitchboardDimensions, ratedMainBus, ratingMode, switchboardIds } from './project-model.js';
import { functionDefinition } from './topology.js';

export const DESIGN_STATUS = {
  INVALID: 'INVALID',
  ELECTRICAL_CONFLICT: 'ELECTRICAL DESIGN CONFLICT',
  INCOMPLETE: 'INCOMPLETE',
  VALID: 'VALID / MATCHED',
};

const CONFIRMATION = 'Manufacturer Confirmation Required';

export function sectionsBySwitchboard(project, breakers) {
  return switchboardIds(project).map(boardId => ({ boardId, sections: generateSections(breakers, project, boardId) }));
}

function widthSummary(sections) {
  const byStatus = status => sections.filter(section => section.widthStatus === status);
  const verified = byStatus(SECTION_WIDTH_STATUS.VERIFIED);
  const userSelected = byStatus(SECTION_WIDTH_STATUS.USER_SELECTED);
  const partiallyVerified = byStatus(SECTION_WIDTH_STATUS.PARTIALLY_VERIFIED);
  const provisional = byStatus(SECTION_WIDTH_STATUS.PROVISIONAL);
  const sum = list => list.reduce((total, section) => total + Number(section.width || 0), 0);
  return {
    verifiedSectionWidthMm: sum(verified),
    userSelectedSectionWidthMm: sum(userSelected),
    partiallyVerifiedWidthMm: sum(partiallyVerified),
    provisionalPlanningWidthMm: sum(provisional),
    combinedPlanningWidthMm: sum(sections),
    containsProvisionalWidth: provisional.length > 0,
    containsNonVerifiedWidth: verified.length !== sections.length,
    userSelectedSections: userSelected.map(section => section.boardId + ':' + section.id),
    partiallyVerifiedSections: partiallyVerified.map(section => section.boardId + ':' + section.id),
    provisionalSections: provisional.map(section => section.boardId + ':' + section.id),
    unresolvedPackingSections: sections.filter(section => section.packingStatus === PACKING_STATUS.UNRESOLVED).map(section => section.boardId + ':' + section.id),
  };
}

export function designStatus(project, breakers) {
  const evaluations = breakers.map(breaker => ({ breaker, result: evaluateBreaker(breaker, project) }));
  const validation = validateDesignConfiguration(project, breakers);
  const completeness = getConfigurationCompleteness(project, breakers);
  const electrical = validateElectricalConsistency(project, breakers);
  const boards = sectionsBySwitchboard(project, breakers);
  const sections = boards.flatMap(board => board.sections);
  const activeBoards = new Set(switchboardIds(project));

  const unresolved = new Map();
  const addUnresolved = item => { if (!unresolved.has(item.issueId)) unresolved.set(item.issueId, item); };
  completeness.items.filter(item => item.status === 'Missing').forEach(item => addUnresolved({ issueId: `UNRESOLVED:CONFIG:${item.scope}:${item.label}`, category: 'Configuration', scope: item.scope, condition: item.label, sourceRule: item.sourceRule }));
  evaluations
    .filter(({ breaker, result }) => activeBoards.has(breaker.switchboardId) && result.confidence === CONFIRMATION)
    .forEach(({ breaker, result }) => addUnresolved({ issueId: `UNRESOLVED:DEVICE:${breaker.internalId}:${result.ruleId}`, category: 'Device rule', scope: breakerDisplayLabel(breaker), condition: (result.missingParameters || []).join(', ') || result.matchedRule, sourceRule: result.ruleId }));
  sections
    .filter(section => section.packingStatus === PACKING_STATUS.UNRESOLVED)
    .forEach(section => addUnresolved({ issueId: `UNRESOLVED:PACKING:${section.boardId}:${section.id}`, category: 'MCCB packing', scope: section.boardId + ' / ' + section.id, condition: 'MCCB section packing unresolved: ' + section.packingMissingParameters.join(', '), sourceRule: section.packingRuleId }));

  const invalidConditions = validation.issues.map(item => ({ issueId: item.issueId, classification: item.classification, scope: item.scope, field: item.field, message: item.message, manufacturerRule: item.manufacturerRule || null }));
  const electricalConflicts = electrical.issues.map(item => ({ issueId: item.issueId, classification: item.classification, scope: item.scope, field: item.field, message: item.message, ruleId: item.ruleId }));
  const unresolvedConditions = [...unresolved.values()];
  const results = evaluations.map(item => item.result);
  const confidenceSummary = {
    manufacturerMatched: results.filter(result => result.confidence === 'Manufacturer Verified').length,
    userSelected: results.filter(result => result.confidence === 'Manufacturer-Supported · User Selected').length,
    partiallyVerified: results.filter(result => result.confidence === 'Partially Verified').length,
    confirmationRequired: results.filter(result => result.confidence === CONFIRMATION).length,
    engineeringEstimate: sections.filter(section => section.widthStatus === SECTION_WIDTH_STATUS.PROVISIONAL).length,
    invalid: invalidConditions.length,
    electricalConflicts: electricalConflicts.length,
    unresolved: unresolvedConditions.length,
    packingUnresolved: sections.filter(section => section.packingStatus === PACKING_STATUS.UNRESOLVED).length,
  };
  const status = invalidConditions.length ? DESIGN_STATUS.INVALID
    : electricalConflicts.length ? DESIGN_STATUS.ELECTRICAL_CONFLICT
      : unresolvedConditions.length ? DESIGN_STATUS.INCOMPLETE
        : DESIGN_STATUS.VALID;
  return { designStatus: status, unresolvedConditions, invalidConditions, electricalConflicts, confidenceSummary, validation, completeness, electrical, boards, widths: widthSummary(sections) };
}

function exportSection(section, breakers) {
  const members = section.items;
  return {
    sectionKey: section.boardId + ':' + section.id,
    sectionId: section.id,
    switchboardId: section.boardId,
    bus: section.bus,
    breakers: members.map(breaker => ({ internalId: breaker.internalId, displayLabel: breakerDisplayLabel(breaker) })),
    widthMm: section.width,
    widthStatus: section.widthStatus,
    widthLabel: section.widthLabel,
    classification: section.classification,
    arrangementConfidence: section.confidence,
    arrangement: section.arrangement,
    deviceRuleId: section.deviceRuleId,
    deviceTable: section.deviceTable,
    deviceConfidence: section.deviceConfidence,
    deviceWidthMm: section.deviceWidthMm,
    deviceModule: section.deviceModule,
    packingStatus: section.packingStatus,
    packingRuleId: section.packingRuleId,
    packingMissingParameters: section.packingMissingParameters,
  };
}

export function buildDesignExport(project, breakers) {
  const status = designStatus(project, breakers);
  const sectionIdByBreaker = new Map();
  status.boards.forEach(board => board.sections.forEach(section => section.items.forEach(item => sectionIdByBreaker.set(item.internalId, section.boardId + ':' + section.id))));
  const dimensions = getSwitchboardDimensions(project);
  return {
    project: {
      manufacturer: project.manufacturer,
      system: project.system,
      quantity: project.quantity,
      mainBus: project.mainBus,
      defaultRoute: project.defaultRoute,
      dimensions: { heightMm: dimensions.heightMm, depthMm: dimensions.depthMm },
    },
    designStatus: status.designStatus,
    unresolvedConditions: status.unresolvedConditions,
    invalidConditions: status.invalidConditions,
    electricalConflicts: status.electricalConflicts,
    confidenceSummary: status.confidenceSummary,
    designConfiguration: project.configuration || {},
    configurationCompleteness: status.completeness,
    configurationValidation: status.validation,
    breakerSchedule: breakers.map(breaker => ({
      internalId: breaker.internalId,
      id: breaker.id,
      displayLabel: breakerDisplayLabel(breaker),
      switchboardId: breaker.switchboardId,
      assignmentMode: breaker.assignmentMode,
      preferredSwitchboardId: breaker.preferredSwitchboardId || null,
      function: breaker.function,
      functionLabel: functionDefinition(breaker.function).label,
      direction: breaker.direction,
      bus: breaker.bus,
      series: breaker.series,
      frame: breaker.frame,
      rating: breaker.rating,
      pole: breaker.pole,
      type: breaker.type,
      route: breaker.route,
      routeMode: breaker.routeMode,
      seriesMode: breaker.seriesMode,
      frameMode: breaker.frameMode,
      recommendation: breaker.recommendation || null,
      sectionKey: sectionIdByBreaker.get(breaker.internalId) || null,
      evaluation: evaluateBreaker(breaker, project),
    })),
    switchboardQuantity: project.quantity,
    switchboards: switchboardIds(project).map(boardId => ({ switchboardId: boardId, ratedMainBusCurrent: ratedMainBus(project, boardId), ratingMode: ratingMode(project, boardId) })),
    sectionsBySwitchboard: status.boards.map(board => ({
      switchboardId: board.boardId,
      ratedMainBusCurrent: ratedMainBus(project, board.boardId),
      ratingMode: ratingMode(project, board.boardId),
      sections: board.sections.map(section => exportSection(section, breakers)),
      ...widthSummary(board.sections),
    })),
    widthSummary: status.widths,
    combinedPlanningWidthMm: status.widths.combinedPlanningWidthMm,
    containsProvisionalWidth: status.widths.containsProvisionalWidth,
    busbarRules: switchboardIds(project).flatMap(boardId => [...new Set(breakers.filter(breaker => breaker.switchboardId === boardId).map(breaker => breaker.bus))].map(bus => ({ ...getBusbarRule(project, boardId, bus), ratedMainBusCurrent: ratedMainBus(project, boardId) }))),
    dimensions: { switchboardDimensions: dimensions, manufacturerListedDimensions: getAvailableManufacturerDimensions(project), matchedManufacturerDimension: null },
    ruleAudit: getRuleAudit(project.manufacturer),
    exportConfidence: status.designStatus === DESIGN_STATUS.VALID ? 'Manufacturer conditions resolved for current configuration' : 'Draft - see unresolved, invalid and electrical conflict conditions',
    sourceReferences: Object.values(RULE_SOURCES),
  };
}
