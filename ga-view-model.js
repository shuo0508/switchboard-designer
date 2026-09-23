import { flowForBreaker, functionDefinition } from './topology.js';
import { breakerDisplayLabel, ratedMainBus } from './project-model.js';

// Lowest section confidence on the board; never higher than any section result.
// (Busbar positions are user design inputs and are reported separately on each bus.)
const CONFIDENCE_ORDER = ['Invalid Manufacturer Configuration', 'Manufacturer Confirmation Required', 'Not Established By Provided Source', 'Partially Verified', 'Manufacturer-Supported · User Selected', 'Manufacturer Verified'];
function boardConfidence(sections) {
  if (!sections.length) return 'Schematic';
  const ranks = sections.map(section => CONFIDENCE_ORDER.indexOf(section.confidence));
  if (ranks.some(rank => rank < 0)) return 'Mixed';
  return CONFIDENCE_ORDER[Math.min(...ranks)];
}

// designStatus comes from design-evaluation.designStatus() and is displayed as-is (never recomputed here).
export function buildGaViewModel({ project, breakers, boardSections, busRules, evaluations, dimensions, designStatus = null }) {
  const breakerByIndex = index => breakers[index];
  const boards = boardSections.map(({ boardId, sections }) => {
    const busesInUse = [...new Set(sections.map(section => section.bus))];
    const buses = busesInUse.map(busName => {
      const rule = busRules(boardId, busName);
      return {
        id: rule.busId,
        key: `${boardId}:${rule.busId}`,
        name: busName,
        role: rule.roleLabel,
        rating: ratedMainBus(project, boardId),
        physicalPosition: rule.physicalPosition,
        selectedPosition: rule.selectedPosition,
        confidence: rule.confidence,
        sourceRule: rule.ruleId,
        source: rule.source,
        manufacturerRule: rule.manufacturerRule,
        userSelected: Boolean(rule.selectedPosition) && rule.confidence === 'Manufacturer-Supported · User Selected',
      };
    });
    const modelSections = sections.map(section => {
      const sectionBreakers = section.items.map(breakerByIndex).filter(Boolean).map(breaker => {
        const evaluation = evaluations(breaker);
        return {
          internalId: breaker.internalId,
          displayNumber: breaker.id,
          displayLabel: breakerDisplayLabel(breaker),
          functionKey: breaker.function,
          functionLabel: functionDefinition(breaker.function).label,
          rating: breaker.rating,
          frame: breaker.frame || 'No source-backed candidate',
          poles: breaker.pole,
          type: breaker.type,
          route: breaker.route,
          bus: breaker.bus,
          confidence: evaluation.confidence,
          ruleId: evaluation.ruleId,
          flow: flowForBreaker(breaker),
        };
      });
      return {
        id: section.id,
        key: `${boardId}:${section.id}`,
        boardId,
        busId: buses.find(bus => bus.name === section.bus)?.id || 'BUS-?',
        busName: section.bus,
        widthMm: section.width,
        widthStatus: section.widthStatus,
        widthLabel: section.widthLabel,
        confidence: section.confidence,
        sourceRule: section.packingRuleId,
        packingStatus: section.packingStatus,
        physicalArrangementConfidence: section.packingStatus === 'UNRESOLVED' ? 'SCHEMATIC DEVICE POSITION' : section.confidence,
        missingParameters: section.packingMissingParameters || [],
        breakers: sectionBreakers,
        rawSection: section,
      };
    });
    const provisional = modelSections.filter(section => section.widthStatus === 'PROVISIONAL');
    const qualifiedWidth = modelSections.filter(section => section.widthStatus === 'PARTIALLY_VERIFIED' || section.widthStatus === 'USER_SELECTED');
    return {
      id: boardId,
      manufacturer: project.manufacturer,
      system: project.system,
      ratedMainBus: ratedMainBus(project, boardId),
      combinedPlanningWidthMm: modelSections.reduce((sum, section) => sum + section.widthMm, 0),
      provisionalPlanningWidthMm: provisional.reduce((sum, section) => sum + section.widthMm, 0),
      containsProvisionalWidth: provisional.length > 0,
      qualifiedPlanningWidthMm: qualifiedWidth.reduce((sum, section) => sum + section.widthMm, 0),
      containsQualifiedWidth: qualifiedWidth.length > 0,
      dimensions: {
        heightMm: dimensions.heightMm,
        depthMm: dimensions.depthMm,
        heightStatus: dimensions.heightStatus,
        depthStatus: dimensions.depthStatus,
        label: dimensions.label,
      },
      buses,
      sections: modelSections,
      confidence: boardConfidence(modelSections),
      designStatus,
    };
  });
  return {
    mode: 'SCHEMATIC',
    designStatus,
    boards,
    combinedPlanningWidthMm: boards.reduce((sum, board) => sum + board.combinedPlanningWidthMm, 0),
    containsProvisionalWidth: boards.some(board => board.containsProvisionalWidth),
    containsQualifiedWidth: boards.some(board => board.containsQualifiedWidth),
  };
}

export const __test = { flowFor: flowForBreaker };
