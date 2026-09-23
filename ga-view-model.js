import { flowForBreaker, functionDefinition } from './topology.js';
import { breakerDisplayLabel, ratedMainBus } from './ux-state.js';

function boardConfidence(buses, sections) {
  const values = [...buses.map(bus => bus.confidence), ...sections.map(section => section.confidence)];
  if (values.some(value => value === 'Invalid Manufacturer Configuration')) return 'Invalid Manufacturer Configuration';
  if (values.some(value => value === 'Manufacturer Confirmation Required')) return 'Manufacturer Confirmation Required';
  if (values.some(value => !['Manufacturer Verified', 'Manufacturer-Supported · User Selected'].includes(value))) return 'Mixed';
  if (values.some(value => value === 'Manufacturer-Supported · User Selected')) return 'Manufacturer-Supported · User Selected';
  return values.length ? 'Manufacturer Verified' : 'Schematic';
}

export function buildGaViewModel({ project, breakers, boardSections, busRules, evaluations, dimensions }) {
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
          frame: breaker.frame,
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
        confidence: section.confidence,
        sourceRule: section.packingRuleId,
        physicalArrangementConfidence: section.packingRuleId === 'NO_AUTOMATIC_MCCB_PACKING' && sectionBreakers.some(item => item.type === 'MCCB') ? 'SCHEMATIC DEVICE POSITION' : section.confidence,
        missingParameters: section.packingMissingParameters || [],
        breakers: sectionBreakers,
        rawSection: section,
      };
    });
    return {
      id: boardId,
      manufacturer: project.manufacturer,
      system: project.system,
      ratedMainBus: ratedMainBus(project, boardId),
      totalWidthMm: modelSections.reduce((sum, section) => sum + section.widthMm, 0),
      dimensions: {
        heightMm: dimensions.heightMm,
        depthMm: dimensions.depthMm,
        confidence: dimensions.confidence || dimensions.classification,
      },
      buses,
      sections: modelSections,
      confidence: boardConfidence(buses, modelSections),
    };
  });
  return { mode: 'SCHEMATIC', boards, totalWidthMm: boards.reduce((sum, board) => sum + board.totalWidthMm, 0) };
}

export const __test = { flowFor: flowForBreaker };
