import { breakerDisplayLabel, designStatus as summarizeDesignStatus, ratedMainBus, switchboardIds } from './ux-state.js';
export const RULE_SOURCES = {
  abbMnsR: {
    manufacturer: 'ABB',
    system: 'MNS R',
    document: 'ABB MNS R Low Voltage Switchgear System Guide',
    revision: '1TTB900011D0203',
    pdfPage: '22-24',
    printedPage: '22-24',
    chapter: 'Standardization / Power Center Breakers / MCCB',
  },
  siemensS8: {
    manufacturer: 'Siemens',
    system: 'SIVACON S8',
    document: 'TIP Planning manual SIVACON S8',
    revision: '2025-02 EN',
    pdfPage: '25-28, 37-38',
    printedPage: '25-28, 33-34',
    chapter: 'Circuit-Breaker Design / Tables 3/2-3/4 / 3VA design',
  },
};

export const MANUFACTURER_RULE_CATALOG = [
  { ruleId: 'ABB_MNSR_DIMENSIONS_AVAILABLE', manufacturer: 'ABB', system: 'MNS R', category: 'Available Manufacturer Dimensions', conditions: ['MNS R system; selection is not a matched configuration'], result: { heightsMm: [2200], widthsMm: [300, 400, 600, 800, 1000, 1200], depthsMm: [1025, 1200, 1400, 1600] }, sourceDocument: 'ABB MNS R Low Voltage Switchgear System Guide', revision: '1TTB900011D0203', pdfPage: '7', printedPage: '7', section: 'Technical Data', table: 'MNS R technical data', figure: null, confidence: 'Manufacturer Verified', notes: 'These are offered system dimensions only. They do not select a dimension for a project configuration.' },
  { ruleId: 'ABB_MNSR_MCCB_STANDARDIZATION', manufacturer: 'ABB', system: 'MNS R', category: 'MCCB cubicle standardization', conditions: ['Energy-distribution MCCB', 'frame and pole match the table entry'], result: 'XT1/XT2: 600 mm, 6E; XT3/XT4: 3P 600 mm/6E and 4P 600 mm/8E; T5/T6 values as table entries.', sourceDocument: 'ABB MNS R Low Voltage Switchgear System Guide', revision: '1TTB900011D0203', pdfPage: '23', printedPage: '23', section: 'MCCB - energy distribution', table: 'MCCB standardization', figure: null, confidence: 'Manufacturer Verified', notes: 'One device base cubicle and module occupancy; this is not a multi-MCCB packing rule.' },
  { ruleId: 'ABB_MNSR_T6_T7_FOUR_BREAKER_800_AVAILABLE', manufacturer: 'ABB', system: 'MNS R', category: 'Available multi-breaker arrangement', conditions: ['Four breakers', 'type E1.2, T6 or T7', '800 mm cubicle'], result: 'Four listed breakers in an 800 mm cubicle; two CBs at the top and two CBs at the bottom.', sourceDocument: 'ABB MNS R Low Voltage Switchgear System Guide', revision: '1TTB900011D0203', pdfPage: '22', printedPage: '22', section: 'Standardization', table: 'Power Center Breakers', figure: null, confidence: 'Manufacturer Verified', notes: 'The footnote does not state a T6 rated current, energy-distribution table compatibility, cable-compartment arrangement, or auxiliary equipment configuration. It is catalogued as available and is not automatically matched to T6 630A.' },
  { ruleId: 'ABB_MNSR_BUSBAR_POSITIONS_AVAILABLE', manufacturer: 'ABB', system: 'MNS R', category: 'Physical busbar positions', conditions: ['Panel configuration selected'], result: 'Up to three busbar systems in a panel: top, center and bottom.', sourceDocument: 'ABB MNS R Low Voltage Switchgear System Guide', revision: '1TTB900011D0203', pdfPage: '14', printedPage: '14', section: 'MNS R system configuration', table: null, figure: null, confidence: 'Manufacturer Verified', notes: 'Multiple positions are supported. The document extract does not supply a project-specific selection rule for an Input or UPS Output electrical bus role.' },
  { ruleId: 'ABB_MNSR_PC_BUSBAR_MODULE_CONDITIONS', manufacturer: 'ABB', system: 'MNS R', category: 'Power-center busbar and breaker module conditions', conditions: ['Power-center breaker type', 'busbar position', 'current rating', 'vertical or horizontal mounting'], result: 'Required E-modules depend on the listed mounting and busbar position.', sourceDocument: 'ABB MNS R Low Voltage Switchgear System Guide', revision: '1TTB900011D0203', pdfPage: '22', printedPage: '22', section: 'Power Center Breakers', table: 'Power Center Breakers', figure: null, confidence: 'Manufacturer Verified', notes: 'Requires project configuration matching before any physical arrangement may be selected.' },
  { ruleId: 'ABB_MNSR_MCCB_COMPARTMENT_REQUIREMENTS', manufacturer: 'ABB', system: 'MNS R', category: 'MCCB physical arrangement conditions', conditions: ['MCCB mounting version', 'dedicated compartment', 'cable and auxiliary configuration'], result: 'MCCBs have a dedicated compartment; fixed, plug-in and withdrawable versions are available; rear cable compartments carry terminals, outgoing cables and CTs.', sourceDocument: 'ABB MNS R Low Voltage Switchgear System Guide', revision: '1TTB900011D0203', pdfPage: '14, 20-21', printedPage: '14, 20-21', section: 'MCCB / cable compartment', table: null, figure: null, confidence: 'Manufacturer Verified', notes: 'No generic breaker-count, width-cap, or usable E-space packing rule is established by these excerpts.' },
  { ruleId: 'SIEMENS_S8_BUSBAR_CONFIGURATION_INPUTS', manufacturer: 'Siemens', system: 'SIVACON S8', category: 'Configuration prerequisites', conditions: ['SIVACON S8 configuration must be selected before table matching'], result: 'Busbar positions include top, rear-top, rear-bottom and both rear; layout, entry and connection determine table matching.', sourceDocument: 'TIP Planning manual SIVACON S8', revision: '2025-02 EN', pdfPage: '16, 18-20', printedPage: '12, 14-16', section: 'System configuration', table: 'System configuration and Table 2/6', figure: null, confidence: 'Manufacturer Verified', notes: 'This identifies prerequisites, not a selected physical position.' },
  { ruleId: 'SIEMENS_S8_3WA_LAYOUT_TABLES_PREREQUISITES', manufacturer: 'Siemens', system: 'SIVACON S8', category: 'ACB layout table prerequisites', conditions: ['3WA frame and pole', 'circuit function', 'busbar position', 'entry/connection and layout configuration'], result: 'Tables 3/2-3/4 provide configuration-dependent circuit-breaker designs.', sourceDocument: 'TIP Planning manual SIVACON S8', revision: '2025-02 EN', pdfPage: '29-31', printedPage: '25-27', section: 'Circuit-breaker design', table: 'Tables 3/2-3/4', figure: null, confidence: 'Manufacturer Verified', notes: 'Exact frame, pole and connection width rows are encoded from Tables 3/2-3/4.' },
  { ruleId: 'SIEMENS_S8_3VA_SINGLE_MCCB_400_AVAILABLE', manufacturer: 'Siemens', system: 'SIVACON S8', category: 'MCCB available configuration', conditions: ['One 3VA MCCB', '3P or 4P', 'applicable connection/cable configuration'], result: 'A 400 mm width is generally stated for one 3VA MCCB; cable capacity is separately conditioned.', sourceDocument: 'TIP Planning manual SIVACON S8', revision: '2025-02 EN', pdfPage: '41', printedPage: '37', section: '3VA molded case circuit breakers', table: 'Tables 3/16 and 3/17', figure: null, confidence: 'Manufacturer Verified', notes: 'Does not verify multi-3VA packing, mounting combination, or a generic section width.' }
];
const ABB_ACB = [
  ['E2.2', '3P', 600], ['E2.2', '4P', 600],
  ['E4.2', '3P', 600], ['E4.2', '4P', 800],
  ['E6.2', '3P', 1000], ['E6.2', '4P', 1200],
];

const ABB_MCCB = [
  ['XT1', '3P', 600, '6E'], ['XT1', '4P', 600, '6E'],
  ['XT2', '3P', 600, '6E'], ['XT2', '4P', 600, '6E'],
  ['XT3', '3P', 600, '6E'], ['XT3', '4P', 600, '8E'],
  ['XT4', '3P', 600, '6E'], ['XT4', '4P', 600, '8E'],
  ['T5 400A', '3P', 600, '8E'], ['T5 400A', '4P', 600, '16E'],
  ['T5 630A', '3P', 600, '16E'], ['T5 630A', '4P', 600, '24E'],
  ['T6 630A', '3P', 600, '16E'], ['T6 630A', '4P', 600, '24E'],
];

const CONFIG_OPTIONS = {
  ABB: { busbarPositions: ['Top', 'Center', 'Bottom'], e12CubicleWidths: [600, 800] },
  Siemens: {
    busbarPositions: ['Top', 'Rear Top', 'Rear Bottom'],
    frontLayouts: ['Single Front', 'Double Front'],
    connectionTypes: ['Cable', 'Busbar'],
    ventilation: ['Non-ventilated', 'Ventilated'],
    mountingDesigns: ['Fixed-mounted', 'Withdrawable Unit'],
  },
};

const SIEMENS_3WA_WIDTHS = {
  '3WA1106': { rating: 630, cable: { '3P': [400, 600], '4P': [600] }, busbar: {} },
  '3WA1108': { rating: 800, cable: { '3P': [400, 600], '4P': [600] }, busbar: {} },
  '3WA1110': { rating: 1000, cable: { '3P': [400, 600], '4P': [600] }, busbar: {} },
  '3WA1112': { rating: 1250, cable: { '3P': [400, 600], '4P': [600] }, busbar: {} },
  '3WA1116': { rating: 1600, cable: { '3P': [400, 600], '4P': [600] }, busbar: { '3P': [400, 600], '4P': [600] } },
  '3WA1120': { rating: 2000, cable: { '3P': [400, 600], '4P': [600] }, busbar: { '3P': [400, 600], '4P': [600] } },
  '3WA1220': { rating: 2000, cable: { '3P': [600, 800], '4P': [800] }, busbar: { '3P': [600, 800], '4P': [800] } },
  '3WA1225': { rating: 2500, cable: { '3P': [600, 800], '4P': [800] }, busbar: { '3P': [600, 800], '4P': [800] } },
  '3WA1232': { rating: 3200, cable: { '3P': [600, 800], '4P': [800] }, busbar: { '3P': [600, 800], '4P': [800] } },
  '3WA1240': { rating: 4000, cable: { '3P': [600, 800], '4P': [800] }, busbar: { '3P': [600, 800], '4P': [800] }, rearOnly: true },
  '3WA1340': { rating: 4000, cable: { '3P': [800], '4P': [1000] }, busbar: { '3P': [800, 1000], '4P': [1000] } },
  '3WA1350': { rating: 5000, cable: {}, busbar: { '3P': [1000], '4P': [1000] }, mounting: 'Withdrawable Unit' },
  '3WA1363': { rating: 6300, cable: {}, busbar: { '3P': [1000], '4P': [1000] }, mounting: 'Withdrawable Unit' },
};

const SIEMENS_3VA_OPERATIONAL_CURRENT = {
  '3VA1563': { topBottom: [630, 630], rearBottom: [625, 630], rearTop: [630, 630] },
  '3VA2563': { topBottom: [605, 630], rearBottom: [630, 630], rearTop: [630, 630] },
  '3VA1580': { topBottom: [660, 735], rearBottom: [690, 775], rearTop: [730, 775] },
  '3VA2580': { topBottom: [660, 730], rearBottom: [685, 775], rearTop: [695, 765] },
  '3VA1510': { topBottom: [815, 900], rearBottom: [800, 905], rearTop: [780, 830] },
  '3VA2510': { topBottom: [770, 905], rearBottom: [840, 955], rearTop: [770, 895] },
};

const CONFIRMATION = 'Manufacturer Confirmation Required';

function sourceFor(manufacturer) {
  return manufacturer === 'Siemens' ? RULE_SOURCES.siemensS8 : RULE_SOURCES.abbMnsR;
}

function boardConfiguration(project, boardId) {
  return project.configuration?.switchboards?.[boardId] || {};
}

function breakerConfiguration(project, breaker) {
  return project.configuration?.breakers?.[breaker.internalId] || {};
}

function configuredBusbarPosition(project, breaker) {
  return boardConfiguration(project, breaker.switchboardId).busbarPositions?.[breaker.bus] || '';
}

function confirmation(ruleId, source, matchedRule, missingParameters, extras = {}) {
  const widthMm = extras.provisionalWidthMm || 600;
  return {
    widthMm,
    status: 'MANUFACTURER_CONFIRMATION_REQUIRED',
    classification: 'Engineering Estimate',
    confidence: CONFIRMATION,
    ruleId,
    manufacturerBaseSize: 'Configuration not matched',
    engineeringDerivedAdjustment: 'None',
    engineeringEstimate: widthMm + ' mm provisional planning width',
    finalRecommendation: CONFIRMATION,
    source,
    matchedRule,
    missingParameters,
    matchedConditions: extras.matchedConditions || [],
    derivedInputs: extras.derivedInputs || {},
    userConfiguration: extras.userConfiguration || {},
    availableWidths: extras.availableWidths || [],
  };
}

function invalid(ruleId, source, reason, conflicts, extras = {}) {
  return {
    ...confirmation(ruleId, source, reason, conflicts, extras),
    status: 'INVALID_MANUFACTURER_CONFIGURATION',
    confidence: 'Invalid Manufacturer Configuration',
    classification: 'Invalid Manufacturer Configuration',
    finalRecommendation: 'Invalid Manufacturer Configuration',
  };
}

function verified(widthMm, ruleId, source, matchedRule, extras = {}) {
  return {
    widthMm,
    status: 'MANUFACTURER_VERIFIED',
    classification: 'Manufacturer Verified',
    confidence: 'Manufacturer Verified',
    ruleId,
    manufacturerBaseSize: widthMm + ' mm',
    engineeringDerivedAdjustment: 'None',
    engineeringEstimate: 'None',
    finalRecommendation: widthMm + ' mm',
    source,
    matchedRule,
    missingParameters: extras.missingParameters || [],
    matchedConditions: extras.matchedConditions || [],
    derivedInputs: extras.derivedInputs || {},
    userConfiguration: extras.userConfiguration || {},
    ...extras,
  };
}
export function ratingAmps(rating) {
  return Number.parseInt(String(rating || '').replace(/[^0-9]/g, ''), 10) || 0;
}

export function deriveBreakerType(series) {
  return series === 'Emax 2' || series === 'SENTRON 3WA' ? 'ACB' : 'MCCB';
}

export function recommendBreaker(input) {
  const amps = ratingAmps(input.rating);
  if (input.manufacturer === 'ABB') {
    if (amps > 630) return { series: 'Emax 2', frame: amps >= 5000 ? 'E6.2' : amps >= 2500 ? 'E4.2' : 'E1.2', type: 'ACB', classification: 'Engineering Estimate' };
    if (amps === 400) return { series: 'Tmax T5', frame: 'T5 400A', type: 'MCCB', classification: 'Engineering Estimate' };
    if (amps === 630) return { series: 'Tmax T6', frame: 'T6 630A', type: 'MCCB', classification: 'Engineering Estimate' };
    return { series: 'Tmax XT', frame: 'XT4', type: 'MCCB', classification: 'Engineering Estimate' };
  }
  if (amps > 1000) { const frame = amps >= 6300 ? '3WA1363' : amps >= 5000 ? '3WA1350' : amps >= 4000 ? '3WA1340' : amps >= 3200 ? '3WA1232' : amps >= 2500 ? '3WA1225' : amps >= 2000 ? '3WA1220' : amps >= 1600 ? '3WA1116' : '3WA1112'; return { series: 'SENTRON 3WA', frame, type: 'ACB', classification: 'Engineering Estimate' }; }
  return { series: 'SENTRON 3VA', frame: amps <= 630 ? '3VA1563' : amps <= 800 ? '3VA1580' : '3VA1510', type: 'MCCB', classification: 'Engineering Estimate' };
}

function siemensTableContext(breaker, project) {
  const source = RULE_SOURCES.siemensS8;
  const config = breakerConfiguration(project, breaker);
  const boardConfig = boardConfiguration(project, breaker.switchboardId || 'SWB-01');
  const frontLayout = String(boardConfig.frontLayout || '');
  const position = configuredBusbarPosition(project, breaker);
  const connection = config.connectionType || '';
  const row = SIEMENS_3WA_WIDTHS[breaker.frame];
  const derivedInputs = { circuitRole: breaker.direction, entryDirection: breaker.route, electricalBusRole: breaker.bus };
  const userConfiguration = { physicalBusbarPosition: position || 'Missing', connectionType: connection || 'Missing', selectedCubicleWidthMm: config.cubicleWidthMm || 'Not selected', mountingDesign: config.mountingDesign || 'Not required', frontLayout: frontLayout || 'Not required' };
  const extra = { derivedInputs, userConfiguration };
  if (!row) return { error: confirmation('SIEMENS_S8_3WA_TYPE_NOT_MAPPED', source, 'Selected 3WA type is not encoded from Tables 3/2-3/4.', ['exact 3WA type'], extra) };
  if (ratingAmps(breaker.rating) !== row.rating) return { error: invalid('SIEMENS_S8_3WA_RATING_CONFLICT', source, 'Selected rating conflicts with the table row for ' + breaker.frame + '.', ['rating must be ' + row.rating + ' A'], extra) };
  if (!CONFIG_OPTIONS.Siemens.busbarPositions.includes(position)) return { error: confirmation('SIEMENS_S8_BUSBAR_POSITION_REQUIRED', source, 'Tables 3/2-3/4 require a supported physical busbar position.', ['physical busbar position'], extra) };
  if (row.rearOnly && position === 'Top') return { error: invalid('SIEMENS_S8_3WA_POSITION_CONFLICT', source, breaker.frame + ' is encoded only in the rear-busbar tables.', ['select Rear Top or Rear Bottom'], extra) };
  if (!CONFIG_OPTIONS.Siemens.connectionTypes.includes(connection)) return { error: confirmation('SIEMENS_S8_CONNECTION_REQUIRED', source, 'Tables 3/2-3/4 separate Cable and Busbar connection.', ['connection type'], extra) };
  if (['3WA1350', '3WA1363'].includes(breaker.frame)) {
    if (!frontLayout) return { error: confirmation('SIEMENS_S8_FRONT_LAYOUT_REQUIRED', source, 'Tables 3/3 and 2/6 require the front layout to be resolved for this high-current configuration.', ['single or double front layout'], extra) };
    if (!CONFIG_OPTIONS.Siemens.frontLayouts.includes(frontLayout)) return { error: invalid('SIEMENS_S8_FRONT_LAYOUT_CONFLICT', source, 'The selected front layout is not manufacturer-supported.', ['Single Front or Double Front'], extra) };
  }  if (row.mounting && config.mountingDesign !== row.mounting) {
    const needs = ['mounting design must be ' + row.mounting];
    return { error: config.mountingDesign ? invalid('SIEMENS_S8_MOUNTING_CONFLICT', source, 'Table footnote requires ' + row.mounting + '.', needs, extra) : confirmation('SIEMENS_S8_MOUNTING_REQUIRED', source, 'Table footnote requires ' + row.mounting + '.', ['mounting design'], extra) };
  }
  const widths = row[connection.toLowerCase()]?.[breaker.pole] || [];
  if (!widths.length) return { error: invalid('SIEMENS_S8_CONNECTION_NOT_SUPPORTED', source, connection + ' connection is not supported for this frame/pole row.', ['supported connection type'], extra) };
  const sameSideRear = (position === 'Rear Top' && breaker.route === 'Top') || (position === 'Rear Bottom' && breaker.route === 'Bottom');
  if (sameSideRear && breaker.frame === '3WA1340' && connection === 'Cable') return { error: invalid('SIEMENS_S8_TABLE_3_3_CONFLICT', source, 'Table 3/3 has no 3WA1340 cable width for this rear position/entry relation.', ['change physical position, Route, or connection'], extra) };
  const rearPositions = Object.values(boardConfiguration(project, breaker.switchboardId).busbarPositions || {}).filter(value => value === 'Rear Top' || value === 'Rear Bottom');
  const twoRearSystems = new Set(rearPositions).size === 2;
  if (twoRearSystems && ['3WA1350', '3WA1363'].includes(breaker.frame)) return { error: invalid('SIEMENS_S8_TABLE_3_4_TYPE_CONFLICT', source, 'Table 3/4 does not list this 3WA type for two rear busbar systems.', ['manufacturer confirmation'], extra) };
  return { row, widths, position, connection, frontLayout, table: position === 'Top' ? 'Table 3/2' : twoRearSystems ? 'Table 3/4' : 'Table 3/3', derivedInputs, userConfiguration };
}

function evaluateSiemens3wa(breaker, project) {
  const source = RULE_SOURCES.siemensS8;
  const context = siemensTableContext(breaker, project);
  if (context.error) return context.error;
  const selected = Number(breakerConfiguration(project, breaker).cubicleWidthMm || 0);
  const extra = { availableWidths: context.widths, derivedInputs: context.derivedInputs, userConfiguration: context.userConfiguration };
  if (context.widths.length > 1 && !selected) return confirmation('SIEMENS_S8_CUBICLE_WIDTH_SELECTION_REQUIRED', source, context.table + ' provides ' + context.widths.join(' / ') + ' mm.', ['selected manufacturer-supported cubicle width'], extra);
  if (selected && !context.widths.includes(selected)) return invalid('SIEMENS_S8_CUBICLE_WIDTH_CONFLICT', source, selected + ' mm is not supported by the matched row.', ['select ' + context.widths.join(' or ') + ' mm'], extra);
  const width = selected || context.widths[0];
  return verified(width, 'SIEMENS_S8_3WA_' + context.table.replaceAll(' ', '_').replaceAll('/', '_').toUpperCase(), source, context.table + ': ' + breaker.frame + ', ' + breaker.rating + ', ' + breaker.pole + ', ' + context.connection + ', busbar ' + context.position + ' -> ' + width + ' mm.', { ...extra, table: context.table, matchedConditions: [breaker.frame, breaker.rating, breaker.pole, context.connection, context.position, breaker.route, context.frontLayout || 'front layout not required'] });
}

function evaluateSiemens3va(breaker, project) {
  const source = RULE_SOURCES.siemensS8;
  const position = configuredBusbarPosition(project, breaker);
  const ventilation = breakerConfiguration(project, breaker).ventilation || '';
  const currentRows = SIEMENS_3VA_OPERATIONAL_CURRENT[breaker.frame];
  const missing = [];
  let operationalCurrent = null;
  if (!position) missing.push('physical busbar position');
  if (!ventilation) missing.push('ventilation');
  if (position && !CONFIG_OPTIONS.Siemens.busbarPositions.includes(position)) return invalid('SIEMENS_S8_3VA_POSITION_CONFLICT', source, 'Busbar position is not supported by Tables 3/16-3/17.', ['supported busbar position']);
  if (ventilation && !CONFIG_OPTIONS.Siemens.ventilation.includes(ventilation)) return invalid('SIEMENS_S8_3VA_VENTILATION_CONFLICT', source, 'Ventilation value is not supported by Table 3/17.', ['supported ventilation']);
  if (position && ventilation && currentRows) {
    const vent = ventilation === 'Ventilated' ? 1 : 0;
    if (position === 'Top' && breaker.route === 'Bottom') operationalCurrent = currentRows.topBottom[vent];
    if (position === 'Rear Top' || position === 'Rear Bottom') operationalCurrent = breaker.route === 'Bottom' ? currentRows.rearBottom[vent] : currentRows.rearTop[vent];
    if (position === 'Top' && breaker.route === 'Top') missing.push('Table 3/17 row for top busbar with top cable entry');
  }
  const ratingValid = operationalCurrent === null ? null : operationalCurrent >= ratingAmps(breaker.rating);
  const result = verified(400, 'SIEMENS_S8_3VA_SINGLE_MCCB_400', source, 'Table 3/16: one 3VA MCCB, 3P or 4P -> generally 400 mm.', {
    matchedConditions: ['one 3VA MCCB', breaker.pole, '400 mm'],
    derivedInputs: { circuitRole: breaker.direction, entryDirection: breaker.route, electricalBusRole: breaker.bus },
    userConfiguration: { physicalBusbarPosition: position || 'Missing', ventilation: ventilation || 'Missing' },
    missingParameters: missing, operationalCurrent,
    operationalCurrentStatus: ratingValid === null ? CONFIRMATION : ratingValid ? 'Manufacturer Verified' : 'Invalid Manufacturer Configuration',
    notes: ratingValid === false ? 'Table 3/17 operational current is below the selected device rating.' : 'Width is verified independently from operational-current configuration.',
    table: 'Tables 3/16-3/17',
  });
  if (ratingValid === false) return { ...result, status: 'INVALID_MANUFACTURER_CONFIGURATION', classification: 'Invalid Manufacturer Configuration', confidence: 'Invalid Manufacturer Configuration', finalRecommendation: 'Invalid Manufacturer Configuration' };
  if (missing.length) return { ...result, status: 'PARTIALLY_VERIFIED', classification: 'Partially Verified', confidence: CONFIRMATION, finalRecommendation: '400 mm width verified; operational configuration requires manufacturer confirmation.' };
  return result;
}
function evaluateBreakerCore(breaker, project) {
  const source = sourceFor(project.manufacturer);
  if (project.manufacturer === 'ABB' && project.system === 'MNS R' && breaker.type === 'ACB' && breaker.series === 'Emax 2') {
    if (breaker.frame === 'E1.2') {
      const selectedWidth = Number(breakerConfiguration(project, breaker).cubicleWidthMm || 0);
      if (!selectedWidth) return confirmation('ABB_MNSR_E1_2_CONFIGURATION_REQUIRED', source, 'ABB MNS R p.22 lists 600 / 800 mm options for E1.2.', ['selected E1.2 cubicle width'], { availableWidths: [600, 800] });
      if (![600, 800].includes(selectedWidth)) return invalid('ABB_MNSR_E1_2_WIDTH_CONFLICT', source, selectedWidth + ' mm is not supported for E1.2.', ['select 600 or 800 mm'], { availableWidths: [600, 800] });
      return verified(selectedWidth, 'ABB_MNSR_E1_2_SELECTED_WIDTH', source, 'ABB MNS R p.22 E1.2 supported width selected: ' + selectedWidth + ' mm / 22E.', { module: '22E', matchedConditions: ['E1.2', breaker.pole, selectedWidth + ' mm'], userConfiguration: { selectedCubicleWidthMm: selectedWidth } });
    }
    const hit = ABB_ACB.find(row => row[0] === breaker.frame && row[1] === breaker.pole);
    if (hit) return verified(hit[2], 'ABB_MNSR_ACB_' + breaker.frame + '_' + breaker.pole, source, 'ABB MNS R p.22: ' + breaker.frame + ' ' + breaker.pole + ' -> ' + hit[2] + ' mm / 22E.', { module: '22E', matchedConditions: [breaker.frame, breaker.pole] });
  }
  if (project.manufacturer === 'ABB' && project.system === 'MNS R' && breaker.type === 'MCCB') {
    const hit = ABB_MCCB.find(row => row[0] === breaker.frame && row[1] === breaker.pole);
    if (hit) return verified(hit[2], 'ABB_MNSR_MCCB_' + breaker.frame.replaceAll(' ', '_') + '_' + breaker.pole, source, 'ABB MNS R p.23: ' + breaker.frame + ' ' + breaker.pole + ' -> ' + hit[2] + ' mm / ' + hit[3] + '.', { module: hit[3], matchedConditions: [breaker.frame, breaker.pole, hit[3]] });
  }
  if (project.manufacturer === 'Siemens' && project.system === 'SIVACON S8' && breaker.series === 'SENTRON 3WA') return evaluateSiemens3wa(breaker, project);
  if (project.manufacturer === 'Siemens' && project.system === 'SIVACON S8' && breaker.series === 'SENTRON 3VA') return evaluateSiemens3va(breaker, project);
  return confirmation('NO_VERIFIED_RULE', source, 'No manufacturer rule matches the selection.', ['manufacturer configuration']);
}

export function evaluateBreaker(breaker, project) {
  const result = evaluateBreakerCore(breaker, project);
  return {
    ...result,
    derivedInputs: {
      circuitRole: breaker.direction,
      entryDirection: breaker.route,
      electricalBusRole: breaker.bus,
      ...(result.derivedInputs || {}),
    },
  };
}
export function getValidBusbarPositions(project) {
  return [...(CONFIG_OPTIONS[project.manufacturer]?.busbarPositions || [])];
}

export function getValidConnectionTypes(project, breaker) {
  return project.manufacturer === 'Siemens' && breaker.series === 'SENTRON 3WA' ? [...CONFIG_OPTIONS.Siemens.connectionTypes] : [];
}

export function getValidMountingDesigns(project, breaker) {
  const row = SIEMENS_3WA_WIDTHS[breaker.frame];
  return project.manufacturer === 'Siemens' && row?.mounting ? [...CONFIG_OPTIONS.Siemens.mountingDesigns] : [];
}

function generic3waWidths(breaker) {
  const row = SIEMENS_3WA_WIDTHS[breaker.frame];
  return row ? [...new Set([...(row.cable[breaker.pole] || []), ...(row.busbar[breaker.pole] || [])])].sort((a, b) => a - b) : [];
}
function makeSection(items, boardId, id, project) {
  const first = items[0];
  const base = evaluateBreaker(first, project);
  return {
    id,
    boardId,
    bus: first.bus,
    items,
    width: items.reduce((total, item) => total + evaluateBreaker(item, project).widthMm, 0),
    arrangement: 'Individual manufacturer cubicle recommendation; no automatic multi-MCCB physical packing',
    confidence: base.confidence,
    packingRuleId: 'NO_AUTOMATIC_MCCB_PACKING',
    packingSource: base.source,
    packingMissingParameters: mccbPackingRequirements(first, project),
  };
}
export function mccbPackingRequirements(breaker, project) {
  if (breaker.type !== 'MCCB') return [];
  if (project.manufacturer === 'ABB') {
    return ['manufacturer-specific compatible combination', 'cable compartment and auxiliary equipment configuration', 'mounting orientation', 'for T6 630A: confirmation that the p.22 four-breaker footnote applies to the p.23 energy-distribution entry'];
  }
  return ['3VA mounting design (fixed / plug-in / withdrawable)', 'functional compartment', 'connection type', 'cable space', 'internal separation'];
}

export function generateSections(breakers, project, boardId) {
  const entries = boardId ? breakers.filter(b => b.switchboardId === boardId) : breakers;
  return entries.map((breaker, index) => makeSection(
    [breaker],
    breaker.switchboardId,
    'S' + String(index + 1).padStart(2, '0'),
    project,
  ));
}
export function getDesignConfigurationSchema(project, breakers) {
  const boardIds = project.quantity === 2 ? ['SWB-01', 'SWB-02'] : ['SWB-01'];
  const switchboards = boardIds.map(boardId => {
    const boardBreakers = breakers.filter(breaker => breaker.switchboardId === boardId);
    const buses = [...new Set(boardBreakers.map(breaker => breaker.bus))];
    const controls = buses.map(bus => ({
      key: 'busbarPositions', subKey: bus,
      label: (bus === 'UPS Output Bus' ? 'BUS-B / UPS Output / Critical Bus' : 'BUS-A / Input / Normal Bus') + ' - Physical Position',
      options: getValidBusbarPositions(project),
      value: boardConfiguration(project, boardId).busbarPositions?.[bus] || '',
      reason: project.manufacturer === 'ABB' ? 'ABB MNS R p.14 supports Top, Center and Bottom.' : 'SIVACON S8 Tables 3/2-3/4 depend on Top, Rear Top or Rear Bottom.',
      sourceRule: project.manufacturer === 'ABB' ? 'ABB_MNSR_BUSBAR_POSITIONS_AVAILABLE' : 'SIEMENS_S8_3WA_TOP_REAR_TABLES',
    }));
    if (project.manufacturer === 'Siemens' && boardBreakers.some(breaker => ['3WA1350', '3WA1363'].includes(breaker.frame))) {
      controls.push({ key: 'frontLayout', label: 'Single / Double Front', options: [...CONFIG_OPTIONS.Siemens.frontLayouts], value: boardConfiguration(project, boardId).frontLayout || '', reason: 'Table 3/3 footnotes and Table 2/6 make front layout relevant to high-current configurations.', sourceRule: 'SIEMENS_S8_TABLE_3_3_FOOTNOTE' });
    }
    return { boardId, controls };
  });
  const breakerControls = breakers.flatMap(breaker => {
    const config = breakerConfiguration(project, breaker);
    const controls = [];
    if (project.manufacturer === 'ABB' && breaker.series === 'Emax 2' && breaker.frame === 'E1.2') controls.push({ key: 'cubicleWidthMm', label: 'E1.2 Cubicle Width', options: CONFIG_OPTIONS.ABB.e12CubicleWidths, value: config.cubicleWidthMm || '', reason: 'ABB MNS R p.22 lists 600 and 800 mm.', sourceRule: 'ABB_MNSR_ACB_STANDARDIZATION' });
    if (project.manufacturer === 'Siemens' && breaker.series === 'SENTRON 3WA') {
      controls.push({ key: 'connectionType', label: 'Connection Type', options: getValidConnectionTypes(project, breaker), value: config.connectionType || '', reason: 'Tables 3/2-3/4 separate Cable and Busbar connection.', sourceRule: 'SIEMENS_S8_3WA_TOP_REAR_TABLES' });
      const widths = generic3waWidths(breaker);
      if (widths.length > 1) controls.push({ key: 'cubicleWidthMm', label: 'Manufacturer Cubicle Width', options: widths, value: config.cubicleWidthMm || '', reason: 'The 3WA table row has more than one supported width.', sourceRule: 'SIEMENS_S8_3WA_TOP_REAR_TABLES' });
      const mounting = getValidMountingDesigns(project, breaker);
      if (mounting.length) controls.push({ key: 'mountingDesign', label: '3WA Mounting Design', options: mounting, value: config.mountingDesign || '', reason: 'The table footnote requires Withdrawable Unit for this type.', sourceRule: 'SIEMENS_S8_3WA_FOOTNOTE' });
    }
    if (project.manufacturer === 'Siemens' && breaker.series === 'SENTRON 3VA') controls.push({ key: 'ventilation', label: 'Ventilation', options: [...CONFIG_OPTIONS.Siemens.ventilation], value: config.ventilation || '', reason: 'Table 3/17 separates ventilated and non-ventilated ratings.', sourceRule: 'SIEMENS_S8_TABLE_3_17' });
    return controls.length ? [{ internalId: breaker.internalId, switchboardId: breaker.switchboardId, displayNumber: breaker.id, displayLabel: breakerDisplayLabel(breaker), series: breaker.series, frame: breaker.frame, controls }] : [];
  });
  return { switchboards, breakers: breakerControls };
}

export function validateDesignConfiguration(project, breakers) {
  const issues = [];
  const validPositions = getValidBusbarPositions(project);
  const boardIds = project.quantity === 2 ? ['SWB-01', 'SWB-02'] : ['SWB-01'];
  boardIds.forEach(boardId => {
    const buses = [...new Set(breakers.filter(b => b.switchboardId === boardId).map(b => b.bus))];
    const positions = buses.map(bus => boardConfiguration(project, boardId).busbarPositions?.[bus]).filter(Boolean);
    positions.filter(position => !validPositions.includes(position)).forEach(position => issues.push({ scope: boardId, field: 'Physical Busbar Position', message: position + ' is not supported by ' + project.manufacturer + '.', currentValue: position, manufacturerRule: project.manufacturer === 'ABB' ? 'ABB_MNSR_BUSBAR_POSITIONS_AVAILABLE' : 'SIEMENS_S8_3WA_TOP_REAR_TABLES', validAlternatives: validPositions.filter(item => item !== position) }));
    if (new Set(positions).size !== positions.length) issues.push({ scope: boardId, field: 'Physical Busbar Position', message: 'Two electrical buses cannot match the same physical position.', currentValue: positions.join(' + '), manufacturerRule: project.manufacturer === 'ABB' ? 'ABB_MNSR_BUSBAR_POSITIONS_AVAILABLE' : 'SIEMENS_S8_3WA_TOP_REAR_TABLES', validAlternatives: validPositions });
    if (project.manufacturer === 'Siemens' && positions.length > 1) {
      const pair = new Set(positions);
      if (!(pair.has('Rear Top') && pair.has('Rear Bottom') && pair.size === 2)) issues.push({ scope: boardId, field: 'Physical Busbar Position', message: 'Encoded Siemens two-bus configuration is Table 3/4: Rear Top + Rear Bottom.', currentValue: positions.join(' + '), manufacturerRule: 'SIEMENS_S8_3WA_TOP_REAR_TABLES', validAlternatives: ['Rear Top + Rear Bottom'] });
    }
  });
  breakers.forEach(breaker => {
    const result = evaluateBreaker(breaker, project);
    if (result.status === 'INVALID_MANUFACTURER_CONFIGURATION') issues.push({ scope: breakerDisplayLabel(breaker), internalId: breaker.internalId, field: 'Breaker Configuration', message: result.matchedRule, manufacturerRule: result.ruleId, validAlternatives: result.availableWidths || [] });
    if (result.operationalCurrentStatus === 'Invalid Manufacturer Configuration') issues.push({ scope: breakerDisplayLabel(breaker), internalId: breaker.internalId, field: 'Operational Current', message: result.notes, manufacturerRule: result.ruleId, validAlternatives: [] });
  });
  return { valid: issues.length === 0, issues };
}

export function getConfigurationCompleteness(project, breakers) {
  const schema = getDesignConfigurationSchema(project, breakers);
  const items = [];
  schema.switchboards.forEach(board => board.controls.forEach(control => items.push({ scope: board.boardId, label: control.label, status: control.value ? 'Resolved' : 'Missing', value: control.value || '', sourceRule: control.sourceRule })));
  schema.breakers.forEach(entry => entry.controls.forEach(control => items.push({ scope: entry.displayLabel, label: control.label, status: control.value ? 'Resolved' : 'Missing', value: control.value || '', sourceRule: control.sourceRule })));
  items.push({ scope: 'Design', label: 'Electrical bus role', status: 'Resolved', value: 'Derived from Function', sourceRule: 'DERIVED_INPUT' });
  items.push({ scope: 'Breaker', label: 'Entry direction', status: 'Resolved', value: 'Derived from Route', sourceRule: 'DERIVED_INPUT' });
  if (!breakers.some(b => b.series === 'SENTRON 3VA')) items.push({ scope: 'Design', label: '3VA ventilation', status: 'Not Applicable', value: '', sourceRule: 'SIEMENS_S8_TABLE_3_17' });
  if (project.manufacturer !== 'Siemens') items.push({ scope: 'Design', label: 'Siemens connection / layout', status: 'Not Applicable', value: '', sourceRule: 'SIEMENS_ONLY' });
  const requiredItems = items.filter(item => item.status !== 'Not Applicable');
  const resolved = requiredItems.filter(item => item.status === 'Resolved').length;
  return { percentage: requiredItems.length ? Math.round(resolved / requiredItems.length * 100) : 100, required: requiredItems.length, resolved, missing: requiredItems.filter(item => item.status === 'Missing').length, notApplicable: items.filter(item => item.status === 'Not Applicable').length, items, validation: validateDesignConfiguration(project, breakers) };
}

export function getBusbarRule(project, boardId, bus) {
  const source = sourceFor(project.manufacturer);
  const allowedPositions = getValidBusbarPositions(project);
  const selectedPosition = boardConfiguration(project, boardId).busbarPositions?.[bus] || '';
  const common = { boardId, bus, busId: bus === 'UPS Output Bus' ? 'BUS-B' : 'BUS-A', roleLabel: bus === 'UPS Output Bus' ? 'UPS Output / Critical Bus' : 'Input / Normal Bus', allowedPositions, selectedPosition: selectedPosition || null, source };
  if (!selectedPosition) return { ...common, physicalPosition: 'Physical Position Not Confirmed', ruleId: 'BUSBAR_POSITION_CONFIRMATION_REQUIRED', classification: CONFIRMATION, confidence: CONFIRMATION, manufacturerRule: 'Select a physical position from the shared manufacturer database.', missingParameters: ['physical busbar position'] };
  if (!allowedPositions.includes(selectedPosition)) return { ...common, physicalPosition: selectedPosition, ruleId: 'INVALID_BUSBAR_CONFIGURATION', classification: 'Invalid Manufacturer Configuration', confidence: 'Invalid Manufacturer Configuration', manufacturerRule: selectedPosition + ' is unsupported.', missingParameters: ['supported physical busbar position'] };
  return { ...common, physicalPosition: selectedPosition, ruleId: project.manufacturer === 'ABB' ? 'ABB_MNSR_BUSBAR_POSITION_SELECTED' : 'SIEMENS_S8_BUSBAR_POSITION_SELECTED', classification: 'Manufacturer-Supported · User Selected', confidence: 'Manufacturer-Supported · User Selected', manufacturerRule: 'User-selected manufacturer-supported position: ' + selectedPosition + '.', missingParameters: [] };
}
export function getPhysicalDimensions(project) {
  return {
    heightMm: 2400,
    depthMm: 1200,
    classification: 'User Defined',
    confidence: 'User Defined',
    matchedRule: 'No matched manufacturer height/depth configuration is collected.',
    missingParameters: project.manufacturer === 'Siemens' ? ['mounting design', 'busbar position', 'IP / ventilation', 'frame height'] : ['cubicle type', 'busbar compartment', 'selected foundation/depth configuration'],
  };
}

export function getRuleAudit() {
  return [
    { id: 'ABB_MNSR_ACB_STANDARDIZATION', result: 'E2.2 / E4.2 / E6.2 width and module', source: 'ABB MNS R printed p.22 Standardization', classification: 'Manufacturer Verified', usedBy: 'Shared engine / UI / Section / GA / Trace', action: 'KEEP' },
    { id: 'ABB_MNSR_MCCB_STANDARDIZATION', result: 'XT / T5 / T6 width and module', source: 'ABB MNS R printed p.23 MCCB standardization', classification: 'Manufacturer Verified', usedBy: 'Shared engine / UI / Section / GA / Trace', action: 'KEEP' },
    { id: 'ABB_MNSR_T6_T7_FOUR_BREAKER_800_AVAILABLE', result: 'Available: four E1.2, T6 or T7 in 800 mm, two top + two bottom', source: 'ABB MNS R printed p.22 footnote', classification: 'Manufacturer Confirmation Required', usedBy: 'Rule catalog only', action: 'DO NOT AUTO-PACK T6 630A WITHOUT COMPATIBILITY CONFIRMATION' },
    { id: 'SIEMENS_S8_CONFIGURATION_REQUIRED', result: 'No generic width / packing result', source: 'SIVACON S8 printed pp.25-28, 33-38', classification: 'Manufacturer Confirmation Required', usedBy: 'Shared engine / UI / Section / GA / Trace', action: 'COLLECT CONFIGURATION BEFORE VERIFIED' },
    { id: 'MCCB_PACKING_UNVERIFIED', result: 'No generic MCCB count or width cap', source: 'No compatible combination rule mapped for XT / 3VA', classification: 'Manufacturer Confirmation Required', usedBy: 'Shared section generator', action: 'DO NOT AUTO-PACK' },
    { id: 'HEIGHT_DEPTH', result: '2400 x 1200 mm project display', source: 'No matched manufacturer configuration', classification: 'User Defined', usedBy: 'Summary', action: 'LABEL AS USER DEFINED' },
  ];
}

export function getManufacturerRuleCatalog(manufacturer, system) {
  return MANUFACTURER_RULE_CATALOG.filter(rule => rule.manufacturer === manufacturer && rule.system === system);
}

export function getAvailableManufacturerDimensions(project) {
  if (project.manufacturer === 'ABB' && project.system === 'MNS R') {
    const rule = MANUFACTURER_RULE_CATALOG.find(item => item.ruleId === 'ABB_MNSR_DIMENSIONS_AVAILABLE');
    return { matched: false, classification: 'Manufacturer Verified', confidence: 'Manufacturer Verified', ruleId: rule.ruleId, availableConfigurations: rule.result, selectionStatus: 'Manufacturer Confirmation Required', source: rule };
  }
  return { matched: false, classification: 'Manufacturer Confirmation Required', confidence: CONFIRMATION, ruleId: 'DIMENSIONS_CONFIGURATION_REQUIRED', availableConfigurations: null, selectionStatus: CONFIRMATION, source: sourceFor(project.manufacturer) };
}

export function getSiemensConfigurationInputs() {
  return [
    { input: 'Circuit role', classification: 'Can be derived automatically', level: 'Breaker-level', table: 'Tables 3/2-3/4', reason: 'Derived from Function.' },
    { input: 'Entry direction', classification: 'Can be derived automatically', level: 'Breaker-level', table: 'Tables 3/2-3/4 and 3/17', reason: 'Derived from Route.' },
    { input: 'Physical busbar position', classification: 'Switchboard configuration input', level: 'Switchboard-level', table: 'Tables 3/2-3/4 and 3/16-3/17', reason: 'Selects top or rear table conditions.' },
    { input: 'Connection type for 3WA', classification: 'Breaker configuration input', level: 'Breaker-level', table: 'Tables 3/2-3/4', reason: 'Cable and busbar columns differ.' },
    { input: 'Cubicle width when table row has two options', classification: 'Breaker configuration input', level: 'Breaker-level', table: 'Tables 3/2-3/4', reason: 'Manual supplies multiple supported widths.' },
    { input: 'Ventilation for 3VA operational current', classification: 'Breaker configuration input', level: 'Breaker-level', table: 'Table 3/17', reason: 'Operational current depends on ventilation.' },
    { input: 'Unlisted multi-MCCB combination', classification: 'Manufacturer confirmation only', level: 'Manufacturer confirmation', table: 'No generic packing table', reason: 'Automatic multi-3VA packing is not proven.' },
  ];
}
export function buildDesignExport(project, breakers) {
  const boardIds = switchboardIds(project);
  const completeness = getConfigurationCompleteness(project, breakers);
  const validation = validateDesignConfiguration(project, breakers);
  const status = summarizeDesignStatus(project, breakers, breaker => evaluateBreaker(breaker, project), validation, completeness);
  const sectionsBySwitchboard = boardIds.map(boardId => {
    const sections = generateSections(breakers, project, boardId);
    return {
      switchboardId: boardId,
      ratedMainBusCurrent: ratedMainBus(project, boardId),
      ratingMode: project.switchboards?.[boardId]?.ratingMode || 'inherited',
      sections,
      totalWidthMm: sections.reduce((sum, section) => sum + Number(section.width || 0), 0),
    };
  });
  return {
    project,
    designStatus: status.designStatus,
    unresolvedConditions: status.unresolvedConditions,
    invalidConditions: status.invalidConditions,
    confidenceSummary: status.confidenceSummary,
    designConfiguration: project.configuration || {},
    configurationCompleteness: completeness,
    configurationValidation: validation,
    breakerSchedule: breakers.map(breaker => ({ ...breaker, displayLabel: breakerDisplayLabel(breaker), evaluation: evaluateBreaker(breaker, project) })),
    switchboardQuantity: project.quantity,
    switchboards: boardIds.map(boardId => ({ switchboardId: boardId, ratedMainBusCurrent: ratedMainBus(project, boardId), ratingMode: project.switchboards?.[boardId]?.ratingMode || 'inherited' })),
    sectionsBySwitchboard,
    busbarRules: boardIds.flatMap(boardId => [...new Set(breakers.filter(breaker => breaker.switchboardId === boardId).map(breaker => breaker.bus))].map(bus => ({ ...getBusbarRule(project, boardId, bus), ratedMainBusCurrent: ratedMainBus(project, boardId) }))),
    combinedPlanningWidthMm: sectionsBySwitchboard.flatMap(item => item.sections).reduce((total, section) => total + section.width, 0),
    totalWidthMm: sectionsBySwitchboard.flatMap(item => item.sections).reduce((total, section) => total + section.width, 0),
    dimensions: { currentDesignDimension: getPhysicalDimensions(project), manufacturerListedDimensions: getAvailableManufacturerDimensions(project), matchedManufacturerDimension: null },
    ruleAudit: getRuleAudit(),
    exportConfidence: status.designStatus === 'VALID / MATCHED' ? 'Manufacturer conditions resolved for current configuration' : 'Draft - see unresolved and invalid conditions',
    sourceReferences: Object.values(RULE_SOURCES),
  };
}