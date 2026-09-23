export const FUNCTIONS = {
  MAIN_INPUT: { label: 'Utility / Main Incomer', direction: 'Incoming', bus: 'Input Bus', flowDirection: 'SOURCE_TO_BUS', sourceLabel: 'SOURCE', destinationLabel: 'Input Bus' },
  GEN_INPUT: { label: 'Generator Incomer', direction: 'Incoming', bus: 'Input Bus', flowDirection: 'SOURCE_TO_BUS', sourceLabel: 'GENERATOR', destinationLabel: 'Input Bus' },
  UPS_INPUT: { label: 'Feeder to UPS Input', direction: 'Outgoing', bus: 'Input Bus', flowDirection: 'BUS_TO_DESTINATION', sourceLabel: 'Input Bus', destinationLabel: 'UPS INPUT' },
  UPS_OUTPUT: { label: 'Incomer from UPS Output', direction: 'Incoming', bus: 'UPS Output Bus', flowDirection: 'SOURCE_TO_BUS', sourceLabel: 'UPS OUTPUT', destinationLabel: 'UPS Output Bus' },
  LOADBANK: { label: 'Load Bank Feeder', direction: 'Outgoing', bus: 'Input Bus', flowDirection: 'BUS_TO_DESTINATION', sourceLabel: 'Input Bus', destinationLabel: 'LOADBANK' },
  BYPASS: { label: 'UPS Bypass Feeder', direction: 'Outgoing', bus: 'Input Bus', flowDirection: 'BUS_TO_DESTINATION', sourceLabel: 'Input Bus', destinationLabel: 'UPS BYPASS' },
  UPS_INPUT_LOAD: { label: 'Input Bus Load Feeder', direction: 'Outgoing', bus: 'Input Bus', flowDirection: 'BUS_TO_DESTINATION', sourceLabel: 'Input Bus', destinationLabel: 'UPS / DOWNSTREAM' },
  UPS_OUTPUT_LOAD: { label: 'Critical / UPS Output Load Feeder', direction: 'Outgoing', bus: 'UPS Output Bus', flowDirection: 'BUS_TO_DESTINATION', sourceLabel: 'UPS Output Bus', destinationLabel: 'CRITICAL LOAD' },
};

export const FUNCTION_OPTIONS = Object.keys(FUNCTIONS);
export function functionDefinition(functionKey) { return FUNCTIONS[functionKey] || FUNCTIONS.UPS_INPUT_LOAD; }
export function busForFunction(functionKey) { return functionDefinition(functionKey).bus; }
export function flowForBreaker(breaker) {
  const definition = functionDefinition(breaker.function);
  return { direction: definition.flowDirection, sourceLabel: definition.sourceLabel, destinationLabel: definition.destinationLabel };
}
export function renumberBreakersBySwitchboard(breakers) {
  const counts = new Map();
  breakers.forEach(breaker => {
    const boardId = breaker.switchboardId || 'SWB-01';
    const number = (counts.get(boardId) || 0) + 1;
    counts.set(boardId, number);
    breaker.id = `CB-${String(number).padStart(2, '0')}`;
  });
  return breakers;
}