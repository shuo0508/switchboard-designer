// Manufacturer-independent electrical design consistency checks.
// These are NOT manufacturer rules; conflicts are classified as "Electrical Design Conflict".
import { breakerDisplayLabel, ratedMainBus, ratingAmps, switchboardIds } from './project-model.js';
import { functionDefinition } from './topology.js';

export const ELECTRICAL_DESIGN_CONFLICT = 'Electrical Design Conflict';

export function validateElectricalConsistency(project, breakers) {
  const boards = new Set(switchboardIds(project));
  const issues = [];
  breakers.forEach(breaker => {
    if (!boards.has(breaker.switchboardId)) return;
    const definition = functionDefinition(breaker.function);
    if (definition.flowDirection !== 'SOURCE_TO_BUS') return;
    const busRating = ratedMainBus(project, breaker.switchboardId);
    const breakerAmps = ratingAmps(breaker.rating);
    const busAmps = ratingAmps(busRating);
    if (breakerAmps > busAmps) {
      issues.push({
        issueId: `ELEC:${breaker.internalId}:INCOMER_EXCEEDS_BUS`,
        classification: ELECTRICAL_DESIGN_CONFLICT,
        ruleId: 'ELECTRICAL_INCOMER_EXCEEDS_BUS_RATING',
        scope: breakerDisplayLabel(breaker),
        internalId: breaker.internalId,
        field: 'Incomer rating vs Rated Main Bus Current',
        currentValue: breaker.rating + ' incomer on ' + busRating + ' bus',
        message: definition.label + ' ' + breaker.rating + ' exceeds ' + breaker.switchboardId + ' Rated Main Bus Current ' + busRating + '.',
      });
    }
  });
  return { valid: issues.length === 0, issues };
}
