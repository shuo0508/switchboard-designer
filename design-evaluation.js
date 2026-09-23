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

// Four design-level states, computed only by designStatus().
//   INVALID                      at least one Invalid Manufacturer Configuration or Electrical Design Conflict
//   INCOMPLETE                   at least one confirmation / NOT_ESTABLISHED / missing required condition
//   RESOLVED WITH QUALIFICATIONS nothing unresolved, but a result is Partially Verified or User Selected
//   VALID / MATCHED              every active result fully Manufacturer Verified
export const DESIGN_STATUS = {
  INVALID: 'INVALID',
  INCOMPLETE: 'INCOMPLETE',
  QUALIFIED: 'RESOLVED WITH QUALIFICATIONS',
  VALID: 'VALID / MATCHED',
};

export const DESIGN_STATUS_WORDING = {
  [DESIGN_STATUS.VALID]: 'All required manufacturer conditions resolved; every section result is Manufacturer Verified.',
  [DESIGN_STATUS.QUALIFIED]: 'No unresolved or invalid conditions, but the design contains qualified results (Partially Verified and/or Manufacturer-Supported · User Selected). Not fully Manufacturer Verified.',
  [DESIGN_STATUS.INCOMPLETE]: 'Draft - manufacturer confirmation, NOT_ESTABLISHED or missing configuration conditions remain unresolved.',
  [DESIGN_STATUS.INVALID]: 'Invalid - the design contains Invalid Manufacturer Configuration and/or Electrical Design Conflict conditions.',
};

const CONFIRMATION = 'Manufacturer Confirmation Required';
const QUALIFIED_DEVICE_STATUS = ['PARTIALLY_VERIFIED', 'MANUFACTURER_SUPPORTED_USER_SELECTED'];
const QUALIFIED_WIDTH_STATUS = [SECTION_WIDTH_STATUS.PARTIALLY_VERIFIED, SECTION_WIDTH_STATUS.USER_SELECTED];

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
  const evaluations = breakers.map(breaker => ({ breaker, result: evaluateBreaker(breaker, project, breakers) }));
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
  // A provisional (Engineering Estimate) section width is never a resolved manufacturer fit.
  sections
    .filter(section => section.widthStatus === SECTION_WIDTH_STATUS.PROVISIONAL)
    .forEach(section => addUnresolved({ issueId: `UNRESOLVED:WIDTH:${section.boardId}:${section.id}`, category: 'Section width', scope: section.boardId + ' / ' + section.id, condition: 'Provisional planning width (Engineering Estimate): ' + section.deviceConfidence, sourceRule: section.deviceRuleId }));

  // Qualified (resolved but not fully verified) results.
  const qualified = new Map();
  evaluations
    .filter(({ breaker, result }) => activeBoards.has(breaker.switchboardId) && QUALIFIED_DEVICE_STATUS.includes(result.status))
    .forEach(({ breaker, result }) => qualified.set(`QUALIFIED:DEVICE:${breaker.internalId}`, { issueId: `QUALIFIED:DEVICE:${breaker.internalId}`, category: 'Device rule', scope: breakerDisplayLabel(breaker), confidence: result.confidence, condition: result.widthReason || result.matchedRule, sourceRule: result.ruleId }));
  sections
    .filter(section => QUALIFIED_WIDTH_STATUS.includes(section.widthStatus))
    .forEach(section => qualified.set(`QUALIFIED:WIDTH:${section.boardId}:${section.id}`, { issueId: `QUALIFIED:WIDTH:${section.boardId}:${section.id}`, category: 'Section width', scope: section.boardId + ' / ' + section.id, confidence: section.confidence, condition: section.widthLabel, sourceRule: section.deviceRuleId }));

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
  const qualifiedConditions = [...qualified.values()];
  confidenceSummary.qualified = qualifiedConditions.length;
  const status = invalidConditions.length || electricalConflicts.length ? DESIGN_STATUS.INVALID
    : unresolvedConditions.length ? DESIGN_STATUS.INCOMPLETE
      : qualifiedConditions.length ? DESIGN_STATUS.QUALIFIED
        : DESIGN_STATUS.VALID;
  const statusBasis = [
    ...(invalidConditions.length ? ['Invalid Manufacturer Configuration'] : []),
    ...(electricalConflicts.length ? ['Electrical Design Conflict'] : []),
    ...(unresolvedConditions.length ? ['Unresolved conditions'] : []),
    ...(qualifiedConditions.length ? ['Qualified results'] : []),
  ];
  return { designStatus: status, designStatusWording: DESIGN_STATUS_WORDING[status], statusBasis, unresolvedConditions, invalidConditions, electricalConflicts, qualifiedConditions, confidenceSummary, validation, completeness, electrical, boards, widths: widthSummary(sections) };
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
    designStatusWording: status.designStatusWording,
    statusBasis: status.statusBasis,
    qualifiedConditions: status.qualifiedConditions,
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
      performanceLevel: project.configuration?.breakers?.[breaker.internalId]?.performanceLevel || null,
      sectionKey: sectionIdByBreaker.get(breaker.internalId) || null,
      evaluation: evaluateBreaker(breaker, project, breakers),
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
    exportConfidence: status.designStatusWording,
    sourceReferences: Object.values(RULE_SOURCES),
  };
}
