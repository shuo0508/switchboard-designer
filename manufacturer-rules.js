// Manufacturer rule engine. Manufacturer data lives in ./manufacturer-data/ (source transcriptions).
// This module only matches project conditions against that data. Depends only on project-model.
import { breakerDisplayLabel, ratedMainBus, ratingAmps as parseRatingAmps, switchboardIds } from './project-model.js';
import { ABB_APPLICATION_FRAMES, ABB_BREAKER_CATALOG, ABB_BUSBAR_POSITIONS, ABB_CUBICLE_TYPES, ABB_DOCUMENT, ABB_MAIN_BUSBAR_MODULES, ABB_MCC_PLUG_IN_MODULES, ABB_POWER_CENTER_BREAKERS } from './manufacturer-data/abb-mnsr.js';
import { SIEMENS_3VA_CUBICLE, SIEMENS_3VA_TABLE_3_17, SIEMENS_3WA_COUPLER_TABLES, SIEMENS_3WA_TABLES, SIEMENS_BREAKING_CAPACITY_CLASSES, SIEMENS_BUSBAR_POSITIONS, SIEMENS_DOCUMENT, SIEMENS_FRAME_HEIGHTS_MM, SIEMENS_TABLE_3_6 } from './manufacturer-data/siemens-s8.js';

export { ABB_CUBICLE_TYPES };

// ---------------------------------------------------------------------------
// Confidence model
// ---------------------------------------------------------------------------
export const CONFIDENCE = {
  MANUFACTURER_VERIFIED: 'Manufacturer Verified',
  MANUFACTURER_SUPPORTED_USER_SELECTED: 'Manufacturer-Supported · User Selected',
  PARTIALLY_VERIFIED: 'Partially Verified',
  ENGINEERING_DERIVED: 'Engineering Derived',
  ENGINEERING_ESTIMATE: 'Engineering Estimate',
  MANUFACTURER_CONFIRMATION_REQUIRED: 'Manufacturer Confirmation Required',
  NOT_ESTABLISHED: 'Not Established By Provided Source',
  INVALID_MANUFACTURER_CONFIGURATION: 'Invalid Manufacturer Configuration',
};
const CONFIRMATION = CONFIDENCE.MANUFACTURER_CONFIRMATION_REQUIRED;
const INVALID = CONFIDENCE.INVALID_MANUFACTURER_CONFIGURATION;
export const NOT_SPECIFIED = 'Not specified in source metadata';

export const RULE_SOURCES = { abbMnsR: { ...ABB_DOCUMENT }, siemensS8: { ...SIEMENS_DOCUMENT } };

// ---------------------------------------------------------------------------
// Rule source metadata catalog
// ---------------------------------------------------------------------------
const ABB = { manufacturer: 'ABB', system: 'MNS R', sourceDocument: ABB_DOCUMENT.document, revision: ABB_DOCUMENT.revision };
const SIE = { manufacturer: 'Siemens', system: 'SIVACON S8', sourceDocument: SIEMENS_DOCUMENT.document, revision: SIEMENS_DOCUMENT.revision };

export const MANUFACTURER_RULE_CATALOG = [
  // ABB — product capability
  { ...ABB, ruleId: 'ABB_EMAX2_E1_2_RATINGS', category: 'Breaker rated uninterrupted current', conditions: ['Emax 2 E1.2', 'performance level B / C / N / L'], result: 'Iu listed per performance level (250–1600 A)', pdfPage: '28', printedPage: '28', section: 'ABB Components – Emax 2 air circuit-breakers', table: 'SACE Emax 2 E1.2', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Trip-unit In values below Iu are not established.', usage: 'Evaluated by shared rule engine' },
  { ...ABB, ruleId: 'ABB_EMAX2_E2_E4_E6_RATINGS', category: 'Breaker rated uninterrupted current', conditions: ['Emax 2 E2.2 / E4.2 / E6.2', 'performance level'], result: 'Iu listed per performance level', pdfPage: '29', printedPage: '29', section: 'ABB Components – Emax 2 air circuit-breakers', table: 'SACE Emax 2 E2.2 / E4.2 / E6.2', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Fixed/withdrawable availability printed on p.28 Common data only (SOURCE_AMBIGUOUS for p.29 frames).', usage: 'Evaluated by shared rule engine' },
  { ...ABB, ruleId: 'ABB_TMAX_XT_RATINGS', category: 'Breaker rated uninterrupted current', conditions: ['Tmax XT1–XT4'], result: 'XT1 160 A; XT2 160 A; XT3 250 A; XT4 160/250 A', pdfPage: '32-33', printedPage: '32-33', section: 'ABB Components – Tmax XT', table: 'Tmax XT1–XT4', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Trip-unit In values below Iu are not established by the provided source.', usage: 'Evaluated by shared rule engine' },
  { ...ABB, ruleId: 'ABB_TMAX_T_RATINGS', category: 'Breaker rated uninterrupted current', conditions: ['Tmax T4–T7'], result: 'T4 250/320; T5 400/630; T6 630/800/1000; T7 800–1600 A', pdfPage: '35-37', printedPage: '35-37', section: 'ABB Components – Tmax', table: 'Tmax T2–T7', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'T4 and T7 are catalogued but not offered by the application.', usage: 'Evaluated by shared rule engine' },
  // ABB — MNS R cubicle data
  { ...ABB, ruleId: 'ABB_MNSR_PC_BREAKERS', category: 'Power Center breaker cubicle', conditions: ['Cubicle type: Power Center', 'Breaker family / frame', 'Position (vertical / horizontal) per row', 'Version (3P / 4P)'], result: 'Module and cubicle width per row', pdfPage: '22', printedPage: '22', section: 'Standardization', table: 'Power Center Breakers', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Footnote * step-up option not applied. E1.2 / T6 / T7 cell "600 mm / 800 mm**": 600 mm is the single-breaker width; 800 mm belongs to the ** four-breaker arrangement (catalogued only, not applied).', usage: 'Evaluated by shared rule engine' },
  { ...ABB, ruleId: 'ABB_MNSR_MCC_PLUG_IN_MODULES', category: 'MCC plug-in module', conditions: ['Cubicle type: Motor Control Center plug-in module', 'Application: Energy distribution', 'Breaker', 'Version (3P / 4P)'], result: 'Minimum module; MCC cubicle width 600 mm', pdfPage: '23', printedPage: '23', section: 'Standardization', table: 'Motor Control Center Plug in modules', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: '600 mm is the only width available for MNS R MCC cubicles (footnote *). Not interchangeable with Power Center data.', usage: 'Evaluated by shared rule engine' },
  { ...ABB, ruleId: 'ABB_MNSR_T6_T7_FOUR_BREAKER_800_AVAILABLE', category: 'Available multi-breaker arrangement', conditions: ['Four breakers', 'type E1.2, T6 or T7', '800 mm cubicle'], result: 'Four breakers in an 800 mm cubicle; two CBs at the top and two at the bottom.', pdfPage: '22', printedPage: '22', section: 'Standardization', table: 'Power Center Breakers (footnote **)', figure: null, confidence: CONFIRMATION, notes: 'Rating, pole combination, busbar, cable, auxiliary space and mounting not established. Not automatically applied.', usage: 'Catalogued only (not automatically matched)' },
  { ...ABB, ruleId: 'ABB_MNSR_MAIN_BUSBAR_MODULES', category: 'Main busbar module', conditions: ['Cubicle type', 'Busbars position', 'Rated current'], result: ABB_MAIN_BUSBAR_MODULES.rows.map(item => item.cubicleType + ' / ' + item.busbarPosition + ' / ' + item.ratedCurrent + ' → ' + item.module).join('; '), pdfPage: '22', printedPage: '22', section: 'Standardization (table of contents: Main Busbars)', table: 'Main Busbars', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: ABB_MAIN_BUSBAR_MODULES.note, usage: 'Catalogued only (not evaluated)' },
  { ...ABB, ruleId: 'ABB_MNSR_BUSBAR_POSITIONS_AVAILABLE', category: 'Physical busbar positions', conditions: ['Panel configuration selected'], result: 'Up to three busbar systems in a panel: top, center and bottom.', pdfPage: '14', printedPage: '14', section: 'MNS R Construction details – Busbars', table: null, figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Does not assign an electrical bus role to a position.', usage: 'Evaluated by shared rule engine' },
  { ...ABB, ruleId: 'ABB_MNSR_ACB_CONSTRUCTION', category: 'ACB construction', conditions: [], result: 'ACBs in the vertical mounted withdrawable version; two ACBs can always be stacked in a single panel.', pdfPage: '14', printedPage: '14', section: 'MNS R Construction details – Air circuit-breakers', table: null, figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Mounting is not collected by the application; stacking is not applied (one ACB per section).', usage: 'Catalogued only' },
  { ...ABB, ruleId: 'ABB_MNSR_MCCB_COMPARTMENT_REQUIREMENTS', category: 'MCCB physical arrangement conditions', conditions: ['MCCB mounting version', 'dedicated compartment', 'cable and auxiliary configuration'], result: 'Every MCCB has a dedicated compartment; fixed, plug-in and withdrawable versions; rear cable compartment.', pdfPage: '14, 20-21', printedPage: '14, 20-21', section: 'MCCB / cable compartment', table: null, figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'No breaker-count, width-cap or usable E-space packing rule is established.', usage: 'Catalogued only (packing remains unresolved)' },
  { ...ABB, ruleId: 'ABB_MNSR_DIMENSIONS_AVAILABLE', category: 'Available Manufacturer Dimensions', conditions: ['MNS R system; not a matched configuration'], result: { heightsMm: [2200], widthsMm: [300, 400, 600, 800, 1000, 1200], depthsMm: [1025, 1200, 1400, 1600] }, pdfPage: '7', printedPage: '7', section: 'Technical Data', table: 'MNS R technical data', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Offered system dimensions only. 1025 mm depth conditions ("depending on the switchgear layout", p.17) not established.', usage: 'Displayed only (not matched to a configuration)' },
  // Siemens
  { ...SIE, ruleId: 'SIEMENS_S8_BUSBAR_CONFIGURATION_INPUTS', category: 'Configuration prerequisites', conditions: ['Busbar position', 'single / double front', 'cable / busbar entry', 'connection side'], result: 'Busbar positions: top, rear-top, rear-bottom, rear-top and rear-bottom.', pdfPage: '16, 18-20', printedPage: '12, 14-16', section: '2.1 System Configuration and Cubicle Design', table: 'Tab. 2/2 – 2/6', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Identifies prerequisites, not a selected physical position.', usage: 'Evaluated by shared rule engine' },
  { ...SIE, ruleId: 'SIEMENS_S8_3WA_LAYOUT_TABLES_PREREQUISITES', category: 'ACB cubicle tables', conditions: ['3WA type and pole', 'cubicle function', 'busbar position and number of systems', 'cable / busbar entry', 'connection type'], result: 'Tables 3/2 – 3/4 (five independent configurations).', pdfPage: '29-31', printedPage: '25-27', section: '3.1 Cubicles with One ACB (3WA)', table: 'Tab. 3/2 – 3/4', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Width alternatives such as 400/600 have no selection condition in the source.', usage: 'Evaluated by shared rule engine' },
  { ...SIE, ruleId: 'SIEMENS_S8_3VA_SINGLE_MCCB_CUBICLE', category: 'MCCB cubicle', conditions: ['One 3VA MCCB', '3P or 4P', 'fixed-mounted design (Tab. 3/1)', 'Tab. 3/16 cubicle type'], result: 'Cubicle width generally 400 mm', pdfPage: '41', printedPage: '37', section: '3.4 Cubicles with One MCCB (3VA)', table: 'Tab. 3/16', figure: null, confidence: CONFIDENCE.PARTIALLY_VERIFIED, notes: 'The source says "generally 400 mm" and does not define exceptions.', usage: 'Evaluated by shared rule engine' },
  { ...SIE, ruleId: 'SIEMENS_S8_TABLE_3_17', category: 'MCCB rated operational current', conditions: ['3VA type', 'busbar top / rear', 'cable entry', 'ventilation'], result: 'Rated operational current at 35 °C (3VA1 / 3VA2 values)', pdfPage: '41', printedPage: '37', section: '3.4 Cubicles with One MCCB (3VA)', table: 'Tab. 3/17', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Top busbar: only cable connection from the bottom is listed. Operational current is displayed as manufacturer information; it is never compared with the breaker rated current and never used for selection (no Load Current input).', usage: 'Displayed (informational); Top busbar + top entry → Not Established' },
  { ...SIE, ruleId: 'SIEMENS_S8_TABLE_3_1_MCCB_FIXED', category: 'Circuit-breaker design options', conditions: [], result: 'MCCB (3VA) in fixed-mounted design; plug-in / withdrawable information from Siemens on request.', pdfPage: '28', printedPage: '24', section: '3 Circuit-Breaker Design', table: 'Tab. 3/1', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: '', usage: 'Evaluated by shared rule engine' },
  { ...SIE, ruleId: 'SIEMENS_S8_TABLE_3_6', category: 'ACB rated operational current (informational)', conditions: ['3WA type', 'busbar top / rear', 'cable entry', 'ventilation'], result: 'Rated operational currents for cable connection cubicles and couplers', pdfPage: '33', printedPage: '29', section: '3.1 Cubicles with One ACB (3WA)', table: 'Tab. 3/6', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Informational only. Not used for selection or validation (no Load Current input).', usage: 'Informational display only' },
  { ...SIE, ruleId: 'SIEMENS_S8_TABLE_3_7', category: 'ACB rated operational current with 8PS LD', conditions: [], result: 'Source-traceable only', pdfPage: '34', printedPage: '30', section: '3.1', table: 'Tab. 3/7', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Not applied.', usage: 'Catalogued only' },
  { ...SIE, ruleId: 'SIEMENS_S8_TABLE_3_8', category: 'ACB rated operational current with 8PS LI', conditions: [], result: 'Source-traceable only', pdfPage: '35', printedPage: '31', section: '3.1', table: 'Tab. 3/8', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Not applied. Contains "3WA1163" as printed.', usage: 'Catalogued only' },
  { ...SIE, ruleId: 'SIEMENS_S8_TABLE_3_9', category: 'ACB rated operational current with forced ventilation', conditions: [], result: 'Source-traceable only', pdfPage: '36', printedPage: '32', section: '3.1', table: 'Tab. 3/9', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Not applied.', usage: 'Catalogued only' },
  { ...SIE, ruleId: 'SIEMENS_S8_DOUBLE_FRONT_REAR_BUSBAR', category: 'Double-front configuration', conditions: ['Double-front design'], result: 'Double-front switchboards are only feasible with busbar position at the rear.', pdfPage: '20, 104', printedPage: '16, 100', section: '2.1 / 9.1 Single-front and double-front switchboards', table: 'Tab. 2/6; Fig. 9/4', figure: 'Fig. 9/4', confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: '', usage: 'Evaluated by shared rule engine' },
  { ...SIE, ruleId: 'SIEMENS_S8_FRAME_HEIGHTS', category: 'Frame height', conditions: [], result: 'Frame height 2,000 or 2,200 mm', pdfPage: '14, 20', printedPage: '10, 16', section: '2 SIVACON S8 System Overview', table: 'Tab. 2/1; Tab. 2/6', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Used to evaluate table footnotes requiring frame height 2,200 mm.', usage: 'Evaluated by shared rule engine' },
  { ...SIE, ruleId: 'SIEMENS_S8_MAIN_BUSBAR_RATINGS', category: 'Main busbar operational ratings', conditions: ['Busbar position', 'ventilation'], result: 'Top up to 6,300 A; rear up to 7,010 A; derating for two systems and 3WA1350 / 3WA1363', pdfPage: '22', printedPage: '18', section: '2.3 Horizontal Main Busbar', table: 'Tab. 2/9', figure: null, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, notes: 'Catalogued only.', usage: 'Catalogued only' },
];

const tableEntry = (table, parentRuleId) => ({ ruleId: table.ruleId, parentRuleId, table: table.label, pdfPage: table.pdfPage, printedPage: table.printedPage, section: '3.1 Cubicles with One ACB (3WA)', result: table.title, usage: 'Evaluated by shared rule engine' });
const ADDITIONAL_RULE_METADATA = [
  ...Object.values(SIEMENS_3WA_TABLES).map(table => tableEntry(table, 'SIEMENS_S8_3WA_LAYOUT_TABLES_PREREQUISITES')),
  ...Object.values(SIEMENS_3WA_COUPLER_TABLES).map(table => ({ ...tableEntry(table, 'SIEMENS_S8_3WA_LAYOUT_TABLES_PREREQUISITES'), usage: 'Source data only (no coupler Function yet)' })),
  { ruleId: 'ABB_MNSR_CUBICLE_TYPE_REQUIRED', ...ABB, pdfPage: '22, 23', printedPage: '22, 23', section: 'Standardization', table: 'Power Center Breakers / Motor Control Center Plug in modules', result: 'MCCB data exists for two different cubicle types; the cubicle type must be configured', confidence: CONFIRMATION, usage: 'Evaluated by shared rule engine' },
  { ruleId: 'SIEMENS_S8_BUSBAR_POSITION_REQUIRED', parentRuleId: 'SIEMENS_S8_3WA_LAYOUT_TABLES_PREREQUISITES', usage: 'Evaluated by shared rule engine' },
  { ruleId: 'SIEMENS_S8_3WA_TYPE_NOT_MAPPED', parentRuleId: 'SIEMENS_S8_3WA_LAYOUT_TABLES_PREREQUISITES', usage: 'Evaluated by shared rule engine' },
  { ruleId: 'SIEMENS_S8_3WA_POSITION_CONFLICT', parentRuleId: 'SIEMENS_S8_BUSBAR_CONFIGURATION_INPUTS', usage: 'Evaluated by shared rule engine' },
  // Application (non-manufacturer) rules
  { ruleId: 'NO_ESTABLISHED_CANDIDATE', sourceType: 'APPLICATION', category: 'AUTO breaker selection', result: 'No source-backed frame lists the requested rating; no breaker selected', confidence: CONFIRMATION, usage: 'AUTO selection' },
  { ruleId: 'NO_VERIFIED_RULE', sourceType: 'APPLICATION', category: 'No manufacturer rule matched', result: 'Provisional planning width only', confidence: CONFIRMATION, usage: 'Shared rule engine fallback' },
  { ruleId: 'NO_AUTOMATIC_MCCB_PACKING', sourceType: 'APPLICATION', category: 'MCCB section packing', result: 'No automatic multi-MCCB packing; section arrangement unresolved', confidence: CONFIRMATION, usage: 'Shared section generator' },
  { ruleId: 'SINGLE_ACB_CUBICLE', sourceType: 'APPLICATION', category: 'ACB section arrangement', result: 'One ACB per generated section; width from the matched device cubicle rule', confidence: 'Application convention', usage: 'Shared section generator' },
  { ruleId: 'ENGINEERING_SELECTION_POLICY', sourceType: 'APPLICATION', category: 'AUTO breaker selection', result: 'Default among source-backed candidates; not a manufacturer recommendation', confidence: CONFIDENCE.ENGINEERING_DERIVED, usage: 'AUTO selection' },
  { ruleId: 'BUSBAR_POSITION_CONFIRMATION_REQUIRED', sourceType: 'APPLICATION', category: 'Physical busbar position', result: 'Physical position not selected', confidence: CONFIRMATION, usage: 'Shared rule engine' },
  { ruleId: 'INVALID_BUSBAR_CONFIGURATION', sourceType: 'APPLICATION', category: 'Physical busbar position', result: 'Selected position not in manufacturer option list', confidence: INVALID, usage: 'Shared rule engine' },
  { ruleId: 'DERIVED_INPUT', sourceType: 'APPLICATION', category: 'Derived input', result: 'Derived from Function / Route', confidence: CONFIDENCE.ENGINEERING_DERIVED, usage: 'Configuration completeness' },
  { ruleId: 'SIEMENS_ONLY', sourceType: 'APPLICATION', category: 'Applicability', result: 'Not applicable for this manufacturer', confidence: 'Not Applicable', usage: 'Configuration completeness' },
  { ruleId: 'DIMENSIONS_CONFIGURATION_REQUIRED', sourceType: 'APPLICATION', category: 'Dimensions', result: 'No manufacturer dimension data encoded for this system', confidence: CONFIRMATION, usage: 'Shared rule engine' },
  { ruleId: 'ELECTRICAL_INCOMER_EXCEEDS_BUS_RATING', sourceType: 'APPLICATION', category: 'Electrical design consistency', result: 'Incomer rated current must not exceed the Rated Main Bus Current', confidence: 'Electrical Design Conflict', usage: 'Electrical consistency validation' },
];

const DYNAMIC_RULE_PARENTS = [
  [/^ABB_MNSR_BUSBAR_POSITION_SELECTED$/, 'ABB_MNSR_BUSBAR_POSITIONS_AVAILABLE'],
  [/^SIEMENS_S8_BUSBAR_POSITION_SELECTED$/, 'SIEMENS_S8_BUSBAR_CONFIGURATION_INPUTS'],
];

const RULE_METADATA = new Map();
MANUFACTURER_RULE_CATALOG.forEach(rule => RULE_METADATA.set(rule.ruleId, { ...rule, sourceType: 'MANUFACTURER' }));
ADDITIONAL_RULE_METADATA.forEach(rule => RULE_METADATA.set(rule.ruleId, { sourceType: rule.sourceType || 'MANUFACTURER', ...rule }));

function documentFor(manufacturer) {
  return manufacturer === 'Siemens' ? SIEMENS_DOCUMENT : manufacturer === 'ABB' ? ABB_DOCUMENT : null;
}

// Rule IDs of the form PARENT__SUFFIX resolve to PARENT.
export function resolveRuleSource(ruleId) {
  const value = item => item === undefined || item === null || item === '' ? NOT_SPECIFIED : item;
  let entry = RULE_METADATA.get(ruleId);
  let parentRuleId = entry?.parentRuleId || null;
  if (!entry && typeof ruleId === 'string') {
    const base = ruleId.includes('__') ? ruleId.split('__')[0] : null;
    if (base && RULE_METADATA.has(base)) { parentRuleId = base; entry = { ruleId, parentRuleId: base }; }
    const match = !entry && DYNAMIC_RULE_PARENTS.find(([pattern]) => pattern.test(ruleId));
    if (match) { parentRuleId = match[1]; entry = { ruleId, parentRuleId }; }
  }
  if (!entry) {
    return { ruleId: value(ruleId), resolvedRuleId: null, parentRuleId: null, sourceType: 'UNRESOLVED', manufacturer: NOT_SPECIFIED, system: NOT_SPECIFIED, document: NOT_SPECIFIED, revision: NOT_SPECIFIED, pdfPage: NOT_SPECIFIED, printedPage: NOT_SPECIFIED, section: NOT_SPECIFIED, table: NOT_SPECIFIED, figure: NOT_SPECIFIED };
  }
  let parent = parentRuleId ? RULE_METADATA.get(parentRuleId) || {} : {};
  if (parent.parentRuleId) parent = { ...(RULE_METADATA.get(parent.parentRuleId) || {}), ...parent };
  const merged = { ...parent, ...Object.fromEntries(Object.entries(entry).filter(([, item]) => item !== undefined)) };
  if (merged.sourceType === 'APPLICATION') {
    return { ruleId, resolvedRuleId: ruleId, parentRuleId: null, sourceType: 'APPLICATION', manufacturer: 'Application rule (not manufacturer sourced)', system: NOT_SPECIFIED, document: NOT_SPECIFIED, revision: NOT_SPECIFIED, pdfPage: NOT_SPECIFIED, printedPage: NOT_SPECIFIED, section: value(merged.category), table: NOT_SPECIFIED, figure: NOT_SPECIFIED };
  }
  const doc = documentFor(merged.manufacturer) || {};
  return {
    ruleId,
    resolvedRuleId: RULE_METADATA.has(ruleId) ? ruleId : parentRuleId,
    parentRuleId,
    sourceType: 'MANUFACTURER',
    manufacturer: value(merged.manufacturer),
    system: value(merged.system),
    document: value(merged.sourceDocument || doc.document),
    revision: value(merged.revision || doc.revision),
    pdfPage: value(merged.pdfPage),
    printedPage: value(merged.printedPage),
    section: value(merged.section),
    table: value(merged.table),
    figure: value(merged.figure),
  };
}

export function listRuleMetadataIds() {
  return [...RULE_METADATA.keys()];
}

// ---------------------------------------------------------------------------
// Configuration options (value domains)
// ---------------------------------------------------------------------------
const CONFIG_OPTIONS = {
  ABB: {
    busbarPositions: [...ABB_BUSBAR_POSITIONS],
    cubicleTypes: [ABB_CUBICLE_TYPES.POWER_CENTER, ABB_CUBICLE_TYPES.MCC_PLUG_IN],
    // Source-backed Emax 2 performance levels (p.28–29), in source order.
    performanceLevels: [...new Set(Object.values(ABB_BREAKER_CATALOG).flatMap(item => Object.keys(item.iuByPerformanceLevel || {})))],
  },
  Siemens: {
    busbarPositions: [...SIEMENS_BUSBAR_POSITIONS],
    frontLayouts: ['Single Front', 'Double Front'],
    connectionTypes: ['Cable', 'Busbar'],
    ventilation: ['Non-ventilated', 'Ventilated'],
    mountingDesigns3WA: ['Fixed-mounted', 'Withdrawable Unit'],
    mountingDesigns3VA: ['Fixed-mounted', 'Plug-in', 'Withdrawable Unit'],
    breakingCapacityClasses: [...SIEMENS_BREAKING_CAPACITY_CLASSES],
    frameHeightsMm: [...SIEMENS_FRAME_HEIGHTS_MM],
  },
};

function boardConfiguration(project, boardId) {
  return project.configuration?.switchboards?.[boardId] || {};
}
function breakerConfiguration(project, breaker) {
  return project.configuration?.breakers?.[breaker.internalId] || {};
}
function configuredBusbarPosition(project, breaker) {
  return boardConfiguration(project, breaker.switchboardId).busbarPositions?.[breaker.bus] || '';
}

// ---------------------------------------------------------------------------
// Result builders
// ---------------------------------------------------------------------------
const STATUS_CONFIDENCE = {
  MANUFACTURER_VERIFIED: [CONFIDENCE.MANUFACTURER_VERIFIED, CONFIDENCE.MANUFACTURER_VERIFIED],
  MANUFACTURER_SUPPORTED_USER_SELECTED: [CONFIDENCE.MANUFACTURER_SUPPORTED_USER_SELECTED, CONFIDENCE.MANUFACTURER_SUPPORTED_USER_SELECTED],
  PARTIALLY_VERIFIED: [CONFIDENCE.PARTIALLY_VERIFIED, CONFIDENCE.PARTIALLY_VERIFIED],
  MANUFACTURER_CONFIRMATION_REQUIRED: [CONFIRMATION, CONFIDENCE.ENGINEERING_ESTIMATE],
  INVALID_MANUFACTURER_CONFIGURATION: [INVALID, INVALID],
};

function result(status, fields) {
  const [confidence, classification] = STATUS_CONFIDENCE[status];
  const widthMm = fields.widthMm || 600;
  const planning = status === 'MANUFACTURER_CONFIRMATION_REQUIRED' || status === 'INVALID_MANUFACTURER_CONFIGURATION';
  return {
    status,
    confidence,
    classification,
    manufacturerBaseSize: planning ? 'Configuration not matched' : widthMm + ' mm',
    engineeringDerivedAdjustment: 'None',
    engineeringEstimate: planning ? widthMm + ' mm provisional planning width' : 'None',
    finalRecommendation: status === 'INVALID_MANUFACTURER_CONFIGURATION' ? INVALID : planning ? CONFIRMATION : widthMm + ' mm',
    table: NOT_SPECIFIED,
    sourceConditions: [],
    matchedConditions: [],
    missingParameters: [],
    conflicts: [],
    availableWidths: [],
    derivedInputs: {},
    userConfiguration: {},
    ...fields,
    widthMm,
  };
}

// Combine collected conditions into a final status: invalid > missing > user-selected > verified.
function conclude(state, fields) {
  const { missing, ...rest } = state;
  if (state.conflicts.length) return result('INVALID_MANUFACTURER_CONFIGURATION', { ...fields, ...rest, missingParameters: missing, ruleId: fields.invalidRuleId || fields.ruleId, matchedRule: state.conflicts.join(' · ') });
  if (missing.length) return result('MANUFACTURER_CONFIRMATION_REQUIRED', { ...fields, ...rest, missingParameters: missing, ruleId: fields.missingRuleId || fields.ruleId, matchedRule: 'Missing: ' + missing.join(' · ') });
  return result(fields.okStatus || 'MANUFACTURER_VERIFIED', { ...fields, ...rest, missingParameters: [] });
}
const newState = () => ({ matchedConditions: [], sourceConditions: [], missing: [], conflicts: [] });
const cleanFields = fields => Object.fromEntries(Object.entries(fields).filter(([key]) => !['invalidRuleId', 'missingRuleId', 'okStatus'].includes(key)));

// ---------------------------------------------------------------------------
// Product catalog / compatibility / AUTO selection
// ---------------------------------------------------------------------------
export const RATING_OPTIONS = ['16A', '20A', '25A', '32A', '40A', '50A', '63A', '80A', '100A', '125A', '160A', '200A', '250A', '315A', '400A', '500A', '630A', '800A', '1000A', '1250A', '1600A', '2000A', '2500A', '3200A', '4000A', '5000A', '6300A'];
export const POLE_OPTIONS = ['3P', '4P'];

export function ratingAmps(rating) {
  return parseRatingAmps(rating);
}

export function deriveBreakerType(series) {
  return series === 'Emax 2' || series === 'SENTRON 3WA' ? 'ACB' : 'MCCB';
}

function abbListedCurrents(appFrame) {
  if (appFrame.iuA) return [...appFrame.iuA];
  const catalog = ABB_BREAKER_CATALOG[appFrame.catalogFrame];
  return catalog.iuA ? [...catalog.iuA] : [...new Set(Object.values(catalog.iuByPerformanceLevel).flat())].sort((a, b) => a - b);
}

function siemens3waFrames() {
  const frames = new Map();
  Object.values(SIEMENS_3WA_TABLES).forEach(table => Object.entries(table.rows).forEach(([frame, item]) => { if (!frames.has(frame)) frames.set(frame, item.ratedCurrentA); }));
  return [...frames.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

// Application frames with their source-listed currents, ordered by smallest maximum listed current (stable).
function applicationFrames(manufacturer) {
  const list = manufacturer === 'ABB'
    ? ABB_APPLICATION_FRAMES.map(item => ({ series: item.series, frame: item.frame, type: ABB_BREAKER_CATALOG[item.catalogFrame].type, listedCurrentsA: abbListedCurrents(item), sourceRuleId: ABB_BREAKER_CATALOG[item.catalogFrame].ruleId }))
    : [
      ...Object.entries(SIEMENS_3VA_TABLE_3_17.rows).map(([frame, item]) => ({ series: 'SENTRON 3VA', frame, type: 'MCCB', listedCurrentsA: [item.ratedCurrentA], sourceRuleId: 'SIEMENS_S8_TABLE_3_17' })),
      ...siemens3waFrames().map(([frame, current]) => ({ series: 'SENTRON 3WA', frame, type: 'ACB', listedCurrentsA: [current], sourceRuleId: 'SIEMENS_S8_3WA_LAYOUT_TABLES_PREREQUISITES' })),
    ];
  return list.map((item, index) => ({ ...item, index })).sort((a, b) => Math.max(...a.listedCurrentsA) - Math.max(...b.listedCurrentsA) || a.index - b.index).map(({ index, ...item }) => item);
}

export function getProductCatalog(manufacturer) {
  const frames = applicationFrames(manufacturer);
  const series = manufacturer === 'ABB' ? ['Emax 2', 'Tmax XT', 'Tmax T5', 'Tmax T6'] : ['SENTRON 3WA', 'SENTRON 3VA'];
  const order = manufacturer === 'ABB' ? ABB_APPLICATION_FRAMES.map(item => item.frame) : [...Object.keys(SIEMENS_3VA_TABLE_3_17.rows), ...siemens3waFrames().map(([frame]) => frame)];
  const seriesOrder = manufacturer === 'ABB' ? { 'Emax 2': ['E1.2', 'E2.2', 'E4.2', 'E6.2'] } : {};
  return {
    series,
    framesBySeries: Object.fromEntries(series.map(name => [name, seriesOrder[name] || order.filter(frame => frames.find(item => item.frame === frame)?.series === name)])),
    ratings: [...RATING_OPTIONS],
    poles: [...POLE_OPTIONS],
  };
}

export function framesForSeries(manufacturer, series) {
  return [...(getProductCatalog(manufacturer).framesBySeries[series] || [])];
}

// Source-backed candidates: frames whose explicitly listed current equals the rating.
// Emax 2 performance levels listing a rating (p.28–29). Levels not listed are never inferred.
export function performanceLevelsFor(frame, rating) {
  const appFrame = ABB_APPLICATION_FRAMES.find(item => item.frame === frame);
  const levels = appFrame && ABB_BREAKER_CATALOG[appFrame.catalogFrame].iuByPerformanceLevel;
  if (!levels) return null;
  const amps = ratingAmps(rating);
  const all = Object.keys(levels);
  const supporting = all.filter(level => levels[level].includes(amps));
  return { all, supporting, dependent: supporting.length > 0 && supporting.length < all.length };
}

export function getBreakerCandidates(manufacturer, rating) {
  const amps = ratingAmps(rating);
  return applicationFrames(manufacturer).filter(item => item.listedCurrentsA.includes(amps)).map(item => {
    const levels = manufacturer === 'ABB' ? performanceLevelsFor(item.frame, rating) : null;
    return {
      series: item.series, frame: item.frame, type: item.type, sourceRuleId: item.sourceRuleId,
      ...(levels ? { performanceLevels: levels.supporting, performanceLevelDependency: levels.dependent } : {}),
    };
  });
}

export const ENGINEERING_SELECTION_POLICY = {
  id: 'SMALLEST_COMPATIBLE_FRAME_VALID_IN_CURRENT_CONFIGURATION',
  classification: CONFIDENCE.ENGINEERING_DERIVED,
  description: 'Among source-backed compatible candidates (rating equals a source-listed current), choose the candidate with the smallest maximum source-listed current (then catalogue order) whose evaluation in the current configuration is not an Invalid Manufacturer Configuration. This is an application policy, not a manufacturer recommendation.',
};

// AUTO: manufacturer data decides compatibility; the policy only ranks already-compatible candidates.
// No candidate → no breaker is selected (series / frame / type stay null).
export function recommendBreaker(input, project = null, breakers = null) {
  const manufacturer = input.manufacturer || project?.manufacturer || 'ABB';
  const candidates = getBreakerCandidates(manufacturer, input.rating);
  const base = { policy: ENGINEERING_SELECTION_POLICY.id, candidates };
  if (!candidates.length) {
    return { ...base, series: null, frame: null, type: null, status: 'NO_ESTABLISHED_CANDIDATE', classification: CONFIRMATION, ruleId: 'NO_ESTABLISHED_CANDIDATE', note: 'No source-backed candidate: no frame in the provided source lists ' + input.rating + '. No breaker selected.' };
  }
  let chosen = candidates[0];
  if (candidates.length > 1 && project) {
    const valid = candidates.find(candidate => evaluateBreakerCore({ ...input, series: candidate.series, frame: candidate.frame, type: candidate.type }, project, breakers).status !== 'INVALID_MANUFACTURER_CONFIGURATION');
    if (valid) chosen = valid;
  }
  const unresolved = chosen.performanceLevelDependency ? ['Emax 2 performance level: ' + input.rating + ' is listed only for ' + chosen.performanceLevels.join(' / ') + ' (not selected by AUTO)'] : [];
  return { ...base, series: chosen.series, frame: chosen.frame, type: chosen.type, status: candidates.length === 1 ? 'SINGLE_CANDIDATE' : 'MULTIPLE_CANDIDATES', classification: CONFIDENCE.ENGINEERING_DERIVED, unresolvedConditions: unresolved, note: (candidates.length === 1 ? 'Only one source-backed compatible frame.' : 'Default chosen by ' + ENGINEERING_SELECTION_POLICY.id + ' (Engineering Derived, not a manufacturer recommendation); alternatives remain available.') + (unresolved.length ? ' ' + unresolved[0] + '.' : '') };
}

// ---------------------------------------------------------------------------
// ABB evaluation
// ---------------------------------------------------------------------------
function abbRatingCheck(appFrame, amps) {
  const listed = abbListedCurrents(appFrame);
  if (listed.includes(amps)) return { status: 'LISTED', listed };
  return { status: amps > Math.max(...listed) ? 'EXCEEDS' : 'NOT_ESTABLISHED', listed };
}

function evaluateAbb(breaker, project) {
  const appFrame = ABB_APPLICATION_FRAMES.find(item => item.frame === breaker.frame && item.series === breaker.series);
  if (!appFrame) return result('MANUFACTURER_CONFIRMATION_REQUIRED', { ruleId: 'NO_VERIFIED_RULE', matchedRule: 'No manufacturer rule matches the selection.', missingParameters: ['manufacturer configuration'] });
  const catalog = ABB_BREAKER_CATALOG[appFrame.catalogFrame];
  const config = breakerConfiguration(project, breaker);
  const amps = ratingAmps(breaker.rating);
  const state = newState();
  state.sourceConditions.push(`${catalog.ruleId}: ${appFrame.frame} listed Iu ${abbListedCurrents(appFrame).join(' / ')} A`);
  if (!catalog.poles.includes(breaker.pole)) state.conflicts.push(`${breaker.pole} not listed for ${appFrame.frame}`);
  const rating = abbRatingCheck(appFrame, amps);
  if (rating.status === 'LISTED') state.matchedConditions.push(`Rating ${breaker.rating} = source-listed Iu of ${appFrame.frame}`);
  if (rating.status === 'EXCEEDS') state.conflicts.push(`Rating ${breaker.rating} exceeds the maximum source-listed Iu of ${appFrame.frame} (${Math.max(...rating.listed)} A)`);
  if (rating.status === 'NOT_ESTABLISHED') state.missing.push(`Rating ${breaker.rating} is not a source-listed Iu of ${appFrame.frame} (${rating.listed.join(' / ')} A); trip-unit In NOT ESTABLISHED BY PROVIDED SOURCE`);
  let ratingRule = rating.status === 'EXCEEDS' ? catalog.ruleId + '__RATING_EXCEEDED' : undefined;
  let levelMissingRule;

  // Emax 2: Iu depends on the performance level (p.28–29). The level is never inferred.
  const levels = performanceLevelsFor(appFrame.frame, breaker.rating);
  const selectedLevel = config.performanceLevel || '';
  if (levels) {
    const levelText = level => `${level}: ${catalog.iuByPerformanceLevel[level].join(' / ')} A`;
    state.sourceConditions.push(`Performance levels (${catalog.ruleId}): ${levels.all.map(levelText).join('; ')}`);
    if (selectedLevel && !levels.all.includes(selectedLevel)) {
      state.conflicts.push(`Performance level ${selectedLevel} is not listed for ${appFrame.frame} (${levels.all.join(' / ')})`);
      ratingRule = catalog.ruleId + '__PERFORMANCE_LEVEL_NOT_LISTED';
    } else if (rating.status === 'LISTED') {
      if (levels.dependent && !selectedLevel) {
        state.missing.push(`Emax 2 performance level: ${breaker.rating} is listed only for ${levels.supporting.join(' / ')} of ${levels.all.join(' / ')}`);
        levelMissingRule = catalog.ruleId + '__PERFORMANCE_LEVEL_REQUIRED';
      } else if (selectedLevel && !levels.supporting.includes(selectedLevel)) {
        state.conflicts.push(`Performance level ${selectedLevel} does not list Iu ${breaker.rating} (listed for ${levels.supporting.join(' / ')})`);
        ratingRule = catalog.ruleId + '__PERFORMANCE_LEVEL_CONFLICT';
      } else if (selectedLevel) {
        state.matchedConditions.push(`Performance level ${selectedLevel} lists Iu ${breaker.rating}`);
      } else {
        state.matchedConditions.push(`Iu ${breaker.rating} listed for every performance level (${levels.all.join(' / ')})`);
      }
    }
  }

  // Execution-dependent device notes (p.32 fn (2), p.36 Note). Breaker execution is not collected,
  // and an MNS R "plug-in module" is not assumed to be the breaker's Plug-in execution.
  const executionNotes = (catalog.executionNotes || []).filter(note => note.appliesToIuA ? abbListedCurrents(appFrame).includes(note.appliesToIuA) : true);
  executionNotes.forEach(note => {
    state.sourceConditions.push(`Device note (p.${note.pdfPage}): ${note.text}`);
    const affected = note.affectsRatingAboveA ? amps > note.affectsRatingAboveA : note.appliesToIuA ? amps === note.appliesToIuA : false;
    if (affected && rating.status === 'LISTED') state.missing.push(`Breaker execution (fixed / ${note.executions.join(' / ')}) not established for this MNS R arrangement; applicability of "${note.text}" NOT ESTABLISHED`);
  });
  const executionMissingRule = executionNotes.length && state.missing.some(item => item.startsWith('Breaker execution')) ? catalog.ruleId + '__EXECUTION_NOTE_APPLICABILITY' : undefined;

  let cubicleType;
  if (catalog.type === 'ACB') {
    cubicleType = ABB_CUBICLE_TYPES.POWER_CENTER;
    state.matchedConditions.push('Cubicle type: Power Center (p.22 Power Center Breakers is the only MNS R table listing Emax 2)');
  } else {
    cubicleType = config.cubicleType || '';
    if (!cubicleType) {
      state.missing.push('MNS R cubicle type: POWER_CENTER (p.22) or MCC_PLUG_IN (p.23)');
      return cleanResult(conclude(state, { ruleId: 'ABB_MNSR_CUBICLE_TYPE_REQUIRED', invalidRuleId: ratingRule, table: 'Not selected (POWER_CENTER p.22 / MCC_PLUG_IN p.23)', cubicleType: null, userConfiguration: { cubicleType: 'Missing' } }));
    }
    if (!CONFIG_OPTIONS.ABB.cubicleTypes.includes(cubicleType)) state.conflicts.push(`Unknown MNS R cubicle type ${cubicleType}`);
    else state.matchedConditions.push('Cubicle type: ' + cubicleType + ' (user configuration)');
  }
  const levelConfig = levels ? { performanceLevel: selectedLevel || (levels.dependent ? 'Missing' : 'Not required') } : {};

  if (cubicleType === ABB_CUBICLE_TYPES.MCC_PLUG_IN) {
    const mcc = ABB_MCC_PLUG_IN_MODULES.rows.find(item => item.frames.includes(appFrame.frame) && item.poles.includes(breaker.pole));
    const tableLabel = 'ABB MNS R p.23 Motor Control Center Plug in modules [MCC_PLUG_IN]';
    state.sourceConditions.push('Application: Energy distribution', 'Cubicle width: ' + ABB_MCC_PLUG_IN_MODULES.footnotes['*']);
    if (!mcc) {
      state.conflicts.push(`${appFrame.frame} ${breaker.pole} is not listed in p.23 Motor Control Center Plug in modules`);
      return cleanResult(conclude(state, { ruleId: 'ABB_MNSR_MCC_PLUG_IN_MODULES__NOT_LISTED', table: tableLabel, cubicleType }));
    }
    if (breaker.direction === 'Incoming') state.missing.push('MCC plug-in module as incomer: source Application column lists "Energy distribution" only — incomer applicability NOT ESTABLISHED');
    else state.matchedConditions.push('Application: Energy distribution (outgoing feeder)');
    state.matchedConditions.push(`${mcc.sourceBreaker} ${breaker.pole} → minimum module ${mcc.minimumModule}, MCC cubicle width ${mcc.widthMm} mm`);
    return cleanResult(conclude(state, {
      ruleId: 'ABB_MNSR_MCC_PLUG_IN_MODULES__' + appFrame.frame.replaceAll(' ', '_') + '_' + breaker.pole, invalidRuleId: ratingRule, missingRuleId: levelMissingRule || executionMissingRule,
      widthMm: mcc.widthMm, module: mcc.minimumModule, moduleKind: 'Minimum module (MCC plug-in)', table: tableLabel, cubicleType,
      matchedRule: `${tableLabel}: ${mcc.sourceBreaker} ${breaker.pole} → ${mcc.minimumModule} in a ${mcc.widthMm} mm MCC cubicle.`,
      userConfiguration: { cubicleType, ...levelConfig },
    }));
  }

  const pc = ABB_POWER_CENTER_BREAKERS.rows.find(item => item.frames.includes(appFrame.frame) && item.poles.includes(breaker.pole));
  const tableLabel = 'ABB MNS R p.22 Power Center Breakers [POWER_CENTER]';
  if (!pc) {
    state.conflicts.push(`${appFrame.frame} ${breaker.pole} is not listed in p.22 Power Center Breakers`);
    return cleanResult(conclude(state, { ruleId: 'ABB_MNSR_PC_BREAKERS__NOT_LISTED', table: tableLabel, cubicleType }));
  }
  state.sourceConditions.push(`Position: ${pc.position} (source row)`, `Version: ${pc.poles.join(' or ')}`);
  if (pc.footnoteArrangement) {
    state.sourceConditions.push(`Source cell: "${pc.sourceWidthCell}" — ${pc.widthsMm[0]} mm is the single-breaker width`, `Footnote ${pc.footnoteArrangement.footnote}: ${ABB_POWER_CENTER_BREAKERS.footnotes[pc.footnoteArrangement.footnote]} — ${pc.footnoteArrangement.widthMm} mm belongs to this arrangement only (catalogued; Manufacturer Confirmation Required; not applied)`);
  }
  state.matchedConditions.push(`${pc.sourceBreaker} ${breaker.pole} → module ${pc.module}`);
  const width = pc.widthsMm[0];
  const selected = Number(config.cubicleWidthMm || 0);
  let footnoteRule;
  if (selected && selected !== width) {
    if (pc.footnoteArrangement && selected === pc.footnoteArrangement.widthMm) {
      state.missing.push(`${selected} mm is established only for the ${pc.footnoteArrangement.footnote} four-breaker arrangement, not as an ordinary single-breaker width`);
      footnoteRule = 'ABB_MNSR_T6_T7_FOUR_BREAKER_800_AVAILABLE';
    } else {
      state.conflicts.push(`${selected} mm is not listed for ${pc.sourceBreaker} (${width} mm)`);
    }
  } else {
    state.matchedConditions.push(`Cubicle width ${width} mm`);
  }
  return cleanResult(conclude(state, {
    ruleId: 'ABB_MNSR_PC_BREAKERS__' + appFrame.frame.replaceAll(' ', '_') + '_' + breaker.pole,
    missingRuleId: footnoteRule || levelMissingRule || executionMissingRule,
    invalidRuleId: ratingRule,
    widthMm: width, module: pc.module, moduleKind: 'Module (Power Center)', table: tableLabel, cubicleType, availableWidths: [...pc.widthsMm],
    matchedRule: `${tableLabel}: ${pc.sourceBreaker} ${pc.position} ${breaker.pole} → ${width} mm / ${pc.module}.`,
    userConfiguration: { cubicleType, ...levelConfig },
  }));
}

function cleanResult(outcome) {
  return cleanFields(outcome);
}

// ---------------------------------------------------------------------------
// Siemens 3WA evaluation (Tables 3/2, 3/3 G1/G2, 3/4 G1/G2)
// ---------------------------------------------------------------------------
// Active buses are derived from the breakers currently on the switchboard. Stored positions of buses
// without breakers are kept for restoration but never participate in manufacturer table selection.
export function activeBusesOnBoard(boardId, breakers) {
  return [...new Set((breakers || []).filter(item => item.switchboardId === boardId).map(item => item.bus))];
}
function rearSystemCount(project, boardId, breakers) {
  const positions = boardConfiguration(project, boardId).busbarPositions || {};
  return new Set(activeBusesOnBoard(boardId, breakers).map(bus => positions[bus]).filter(value => value === 'Rear Top' || value === 'Rear Bottom')).size;
}

// Selects the manufacturer table from actual conditions. G1/G2 are derived, never user inputs.
export function selectSiemens3waTable(project, breaker, breakers = [breaker]) {
  const position = configuredBusbarPosition(project, breaker);
  const entry = breaker.route;
  if (!position) return { error: 'POSITION_MISSING', position };
  if (!SIEMENS_BUSBAR_POSITIONS.includes(position)) return { error: 'POSITION_INVALID', position };
  if (!['Top', 'Bottom'].includes(entry)) return { error: 'ENTRY_MISSING', position };
  if (position === 'Top') return { table: SIEMENS_3WA_TABLES.TABLE_3_2_TOP, position, entry, systems: 1, relation: null };
  const systems = rearSystemCount(project, breaker.switchboardId, breakers.includes(breaker) ? breakers : [...breakers, breaker]) >= 2 ? 2 : 1;
  const relation = (position === 'Rear Top' && entry === 'Bottom') || (position === 'Rear Bottom' && entry === 'Top') ? 'OPPOSITE' : 'SAME';
  const key = (systems === 2 ? 'TABLE_3_4_' : 'TABLE_3_3_') + (relation === 'OPPOSITE' ? 'G1' : 'G2');
  return { table: SIEMENS_3WA_TABLES[key], position, entry, systems, relation };
}

function footnoteIdsFor(row, connectionKey, pole, width) {
  return [...new Set([...(row.footnotes || []), ...(width ? row.cellFootnotes?.[`${connectionKey}:${pole}:${width}`] || [] : [])])];
}

function applyFootnote(state, id, note, context) {
  const { project, breaker, config, board, position, entry, connection } = context;
  const label = `Footnote ${id}) ${note.text}`;
  const ambiguous = note.sourceStatus === 'SOURCE_AMBIGUOUS';
  state.sourceConditions.push(label);
  if (ambiguous) state.sourceConditions.push(`Footnote ${id}) SOURCE_AMBIGUOUS — ${note.ambiguity} (pdf p.${note.relatedSource.pdfPage} / printed p.${note.relatedSource.printedPage}). Deviations require Manufacturer Confirmation; not treated as prohibited.`);
  const check = (ok, missing, text) => {
    if (missing) state.missing.push(text + ' (' + label + ')');
    else if (!ok && ambiguous) state.missing.push(text + ' not matched — source-ambiguous footnote, Manufacturer Confirmation Required (' + label + ')');
    else if (!ok) state.conflicts.push(text + ' required (' + label + ')');
    else state.matchedConditions.push(text);
  };
  if (note.mountingDesign) check(config.mountingDesign === note.mountingDesign, !config.mountingDesign, 'Mounting design ' + note.mountingDesign);
  if (note.frameHeightMm) check(Number(board.frameHeightMm) === note.frameHeightMm, !board.frameHeightMm, 'Frame height ' + note.frameHeightMm + ' mm');
  if (note.mainBusbarMaxA) check(ratingAmps(ratedMainBus(project, breaker.switchboardId)) <= note.mainBusbarMaxA, false, 'Rated Main Bus Current ≤ ' + note.mainBusbarMaxA + ' A');
  if (note.busbarPosition) check(position === note.busbarPosition, false, 'Busbar position ' + note.busbarPosition);
  if (note.cableEntry) check(entry === note.cableEntry, false, 'Cable entry ' + note.cableEntry);
  if (note.connectionType) check(connection === note.connectionType, false, 'Connection ' + note.connectionType);
  if (note.breakingCapacityClasses) check(note.breakingCapacityClasses.includes(config.breakingCapacityClass), !config.breakingCapacityClass, 'Breaking capacity class ' + note.breakingCapacityClasses.join(' or '));
  if (note.maxShortCircuitKa) state.missing.push(`"max. ${note.maxShortCircuitKa} kA" printed with the breaking capacity classes — not collected by the application (${label})`);
  if (note.frontLayout) check(board.frontLayout === note.frontLayout, !board.frontLayout, note.frontLayout);
  if (note.depthMm) check(Number(project.dimensions?.depthMm) === note.depthMm, !project.dimensions?.depthMm, 'Depth ' + note.depthMm + ' mm');
}

function siemens3waRequirements(breaker, project, breakers = [breaker]) {
  const selection = selectSiemens3waTable(project, breaker, breakers);
  const config = breakerConfiguration(project, breaker);
  if (selection.error) return { selection, config, footnotes: [], widths: [] };
  const row = selection.table.rows[breaker.frame] || null;
  const connection = config.connectionType || '';
  const connectionKey = connection === 'Busbar' ? 'busbar' : connection === 'Cable' ? 'cable' : null;
  const widths = row && connectionKey ? row[connectionKey][breaker.pole] || [] : [];
  const selectedWidth = widths.length > 1 ? Number(config.cubicleWidthMm || 0) || null : widths[0] || null;
  const footnotes = row && widths.length ? footnoteIdsFor(row, connectionKey, breaker.pole, selectedWidth).map(id => [id, selection.table.footnotes[id]]).filter(([, note]) => note) : [];
  return { selection, config, row, connection, connectionKey, widths, selectedWidth, footnotes };
}

function tableConditions(selection) {
  const { table, position, entry, systems, relation } = selection;
  return [
    `${table.label}: ${table.title}`,
    `Cubicle function: ${table.cubicleFunction}`,
    `Busbar position: ${position}`,
    `Busbar systems in cubicle: ${systems}`,
    `Cable / busbar entry: ${entry}`,
    relation ? `Relation: ${relation === 'OPPOSITE' ? 'rear busbar and entry on opposite sides (G1)' : 'rear busbar and entry on the same side (G2)'}` : 'Relation: top busbar (Table 3/2)',
  ];
}

export function getSiemens3waOperationalCurrentInfo(frame, position, entry, rowLabel = frame) {
  const columns = SIEMENS_TABLE_3_6.feederColumns;
  const record = SIEMENS_TABLE_3_6.feeders.find(item => item[0] === rowLabel) || SIEMENS_TABLE_3_6.feeders.find(item => item[0] === frame);
  if (!record) return { table: 'Tab. 3/6 (informational)', status: CONFIDENCE.NOT_ESTABLISHED, note: 'Type not listed in Tab. 3/6' };
  const prefix = position === 'Top' ? (entry === 'Bottom' ? 'topCableBottom' : null) : entry === 'Bottom' ? 'rearCableBottom' : 'rearCableTop';
  if (!prefix) return { table: 'Tab. 3/6 (informational)', status: CONFIDENCE.NOT_ESTABLISHED, note: 'Tab. 3/6 lists cable connection from the bottom only for busbar position at the top' };
  const pick = suffix => record[2][columns.indexOf(prefix + '.' + suffix)];
  return { table: 'Tab. 3/6 (informational)', row: record[0], ratedDeviceCurrent: record[1], nonVentilated: pick('nonVentilated'), ventilated: pick('ventilated'), footnotes: SIEMENS_TABLE_3_6.footnotes, usage: SIEMENS_TABLE_3_6.usage };
}

function evaluateSiemens3wa(breaker, project, breakers) {
  const req = siemens3waRequirements(breaker, project, breakers);
  const { selection, config } = req;
  const derivedInputs = { circuitRole: breaker.direction, entryDirection: breaker.route, electricalBusRole: breaker.bus };
  if (selection.error === 'POSITION_MISSING') return result('MANUFACTURER_CONFIRMATION_REQUIRED', { ruleId: 'SIEMENS_S8_BUSBAR_POSITION_REQUIRED', matchedRule: 'Tables 3/2–3/4 require a physical busbar position.', missingParameters: ['physical busbar position'], derivedInputs });
  if (selection.error === 'POSITION_INVALID') return result('INVALID_MANUFACTURER_CONFIGURATION', { ruleId: 'SIEMENS_S8_3WA_POSITION_CONFLICT', matchedRule: selection.position + ' is not a SIVACON S8 busbar position.', derivedInputs });
  if (selection.error) return result('MANUFACTURER_CONFIRMATION_REQUIRED', { ruleId: 'SIEMENS_S8_BUSBAR_POSITION_REQUIRED', matchedRule: 'Cable entry direction required.', missingParameters: ['cable entry direction'], derivedInputs });
  if (!siemens3waFrames().some(([frame]) => frame === breaker.frame)) return result('MANUFACTURER_CONFIRMATION_REQUIRED', { ruleId: 'SIEMENS_S8_3WA_TYPE_NOT_MAPPED', matchedRule: breaker.frame + ' is not encoded from Tables 3/2–3/4.', missingParameters: ['exact 3WA type'], derivedInputs });
  const { table } = selection;
  const state = newState();
  state.sourceConditions.push(...tableConditions(selection));
  const board = boardConfiguration(project, breaker.switchboardId);
  const common = { table: table.label, tableId: table.id, derivedInputs, userConfiguration: { physicalBusbarPosition: selection.position, connectionType: config.connectionType || 'Missing', selectedCubicleWidthMm: config.cubicleWidthMm || 'Not selected', mountingDesign: config.mountingDesign || 'Not set', frameHeightMm: board.frameHeightMm || 'Not set', frontLayout: board.frontLayout || 'Not set' } };
  if (!req.row) {
    state.conflicts.push(`${breaker.frame} is not listed in ${table.label} (${table.title})`);
    return cleanResult(conclude(state, { ...common, ruleId: table.ruleId + '__NOT_LISTED' }));
  }
  state.matchedConditions.push(`Frame ${breaker.frame} listed in ${table.label}`, `Cubicle function: Incoming feeder / outgoing feeder (Function ${breaker.function})`);
  const requested = ratingAmps(breaker.rating);
  if (requested > req.row.ratedCurrentA) state.conflicts.push(`Rating ${breaker.rating} exceeds rated device current ${req.row.ratedCurrentA} A of ${breaker.frame}`);
  else if (requested < req.row.ratedCurrentA) state.missing.push(`Rating ${breaker.rating} below rated device current ${req.row.ratedCurrentA} A of ${breaker.frame} — trip-unit / setting In NOT ESTABLISHED BY PROVIDED SOURCE`);
  else state.matchedConditions.push(`Rated device current ${req.row.ratedCurrentA} A`);
  state.matchedConditions.push('Pole ' + breaker.pole);
  if (!req.connectionKey) {
    state.missing.push('connection type (Cable / Busbar)');
    return cleanResult(conclude(state, { ...common, ruleId: 'SIEMENS_S8_3WA_LAYOUT_TABLES_PREREQUISITES__CONNECTION_REQUIRED', invalidRuleId: table.ruleId + '__RATING_CONFLICT' }));
  }
  if (!req.widths.length) {
    state.conflicts.push(`${req.connection} connection is shown as "-" for ${breaker.frame} ${breaker.pole} in ${table.label}`);
    return cleanResult(conclude(state, { ...common, ruleId: table.ruleId + '__CONNECTION_NOT_LISTED' }));
  }
  state.matchedConditions.push(`${req.connection} connection listed: ${req.widths.join(' / ')} mm`);
  let okStatus = 'MANUFACTURER_VERIFIED';
  let missingRuleId;
  if (req.widths.length > 1) {
    const selected = Number(config.cubicleWidthMm || 0);
    if (!selected) { state.missing.push(`Select a manufacturer-supported width (${req.widths.join(' / ')} mm); the source gives no selection condition`); missingRuleId = 'SIEMENS_S8_3WA_LAYOUT_TABLES_PREREQUISITES__CUBICLE_WIDTH_SELECTION_REQUIRED'; }
    else if (!req.widths.includes(selected)) state.conflicts.push(`${selected} mm is not listed (${req.widths.join(' / ')} mm)`);
    else { okStatus = 'MANUFACTURER_SUPPORTED_USER_SELECTED'; state.matchedConditions.push(`User-selected width ${selected} mm from manufacturer-supported alternatives ${req.widths.join(' / ')} mm`); }
  }
  req.footnotes.forEach(([id, note]) => applyFootnote(state, id, note, { project, breaker, config, board, position: selection.position, entry: selection.entry, connection: req.connection }));
  const width = (req.widths.includes(req.selectedWidth) && req.selectedWidth) || req.widths[0];
  const fn4 = req.footnotes.some(([id]) => id === 4);
  const operational = req.connection === 'Cable' ? getSiemens3waOperationalCurrentInfo(breaker.frame, selection.position, selection.entry, fn4 ? '3WA1350 2)' : breaker.frame) : { table: 'Tab. 3/7 / 3/8', status: CONFIDENCE.NOT_ESTABLISHED, note: 'Busbar trunking operational currents are catalogued but not applied' };
  return cleanResult(conclude(state, {
    ...common,
    ruleId: table.ruleId, invalidRuleId: table.ruleId + '__CONFLICT', missingRuleId, okStatus,
    widthMm: width, availableWidths: req.widths,
    matchedRule: `${table.label}: ${breaker.frame}, ${breaker.rating}, ${breaker.pole}, ${req.connection}, busbar ${selection.position}, entry ${selection.entry} → ${req.widths.length > 1 ? (req.selectedWidth ? req.selectedWidth + ' mm (user selected from ' + req.widths.join(' / ') + ')' : req.widths.join(' / ') + ' mm alternatives') : width + ' mm'}.`,
    manufacturerOperationalCurrent: operational,
  }));
}

// ---------------------------------------------------------------------------
// Siemens 3VA evaluation (§3.4, Tab. 3/16 and 3/17)
// ---------------------------------------------------------------------------
function evaluateSiemens3va(breaker, project) {
  const row = SIEMENS_3VA_TABLE_3_17.rows[breaker.frame];
  const config = breakerConfiguration(project, breaker);
  const position = configuredBusbarPosition(project, breaker);
  const derivedInputs = { circuitRole: breaker.direction, entryDirection: breaker.route, electricalBusRole: breaker.bus };
  if (!row) return result('MANUFACTURER_CONFIRMATION_REQUIRED', { ruleId: 'NO_VERIFIED_RULE', matchedRule: 'No manufacturer rule matches the selection.', missingParameters: ['manufacturer configuration'], derivedInputs });
  const state = newState();
  state.sourceConditions.push(SIEMENS_3VA_CUBICLE.statement, 'Tab. 3/1: MCCB in fixed-mounted design (plug-in / withdrawable on request)', SIEMENS_3VA_CUBICLE.cableCapacity);
  const amps = ratingAmps(breaker.rating);
  if (amps > row.ratedCurrentA) state.conflicts.push(`Rating ${breaker.rating} exceeds rated device current ${row.ratedCurrentA} A of ${breaker.frame}`);
  else if (amps < row.ratedCurrentA) state.missing.push(`Rating ${breaker.rating} below rated device current ${row.ratedCurrentA} A — trip-unit In NOT ESTABLISHED BY PROVIDED SOURCE`);
  else state.matchedConditions.push(`Rated device current ${row.ratedCurrentA} A`);
  if (!SIEMENS_3VA_CUBICLE.poles.includes(breaker.pole)) state.conflicts.push(breaker.pole + ' not covered by §3.4');
  else state.matchedConditions.push(breaker.pole + ' (3- and 4-pole covered by §3.4)');
  if (!position) state.missing.push('physical busbar position');
  else if (!SIEMENS_BUSBAR_POSITIONS.includes(position)) state.conflicts.push(position + ' is not a Tab. 3/16 busbar position');
  else state.matchedConditions.push(`Tab. 3/16 cubicle type: busbar ${position}, cable entry ${breaker.route}`);
  if (!config.mountingDesign) state.missing.push('3VA mounting design');
  else if (config.mountingDesign === SIEMENS_3VA_CUBICLE.supportedMountingDesign) state.matchedConditions.push('Fixed-mounted design (Tab. 3/1)');
  else state.missing.push(`${config.mountingDesign} 3VA: information from Siemens on request (Tab. 3/1) — not established`);
  const ventilation = config.ventilation || '';
  if (!ventilation) state.missing.push('ventilation');
  else if (!CONFIG_OPTIONS.Siemens.ventilation.includes(ventilation)) state.conflicts.push('ventilation value not listed in Tab. 3/17');
  let operationalCurrent = null;
  let operationalCurrentStatus = CONFIRMATION;
  if (position && SIEMENS_BUSBAR_POSITIONS.includes(position) && CONFIG_OPTIONS.Siemens.ventilation.includes(ventilation)) {
    const cell = (position === 'Top' ? row.top : row.rear)[breaker.route];
    if (!cell) {
      operationalCurrentStatus = CONFIDENCE.NOT_ESTABLISHED;
      state.missing.push('Tab. 3/17 operational current for top busbar with top cable entry — Not Established By Provided Source');
    } else {
      // Manufacturer operational current (35 °C). Displayed only — never compared with the breaker rated current.
      operationalCurrent = cell[ventilation === 'Ventilated' ? 'ventilated' : 'nonVentilated'];
      operationalCurrentStatus = CONFIDENCE.MANUFACTURER_VERIFIED;
      state.sourceConditions.push(`Tab. 3/17 Manufacturer Operational Current: ${breaker.frame}, busbar ${position === 'Top' ? 'top' : 'rear'}, cable from ${String(breaker.route).toLowerCase()}, ${ventilation} → ${operationalCurrent} A (informational; not compared with Breaker Rated Current ${breaker.rating})`);
    }
  }
  const outcome = cleanResult(conclude(state, {
    ruleId: 'SIEMENS_S8_3VA_SINGLE_MCCB_CUBICLE', okStatus: 'PARTIALLY_VERIFIED', widthMm: SIEMENS_3VA_CUBICLE.widthMm,
    table: 'Siemens §3.4 Tab. 3/16 (width) · Tab. 3/17 (operational current)',
    matchedRule: 'Tab. 3/16: one 3VA MCCB, fixed-mounted, ' + breaker.pole + ' → nominal planning width 400 mm ("generally").',
    derivedInputs, userConfiguration: { physicalBusbarPosition: position || 'Missing', ventilation: ventilation || 'Missing', mountingDesign: config.mountingDesign || 'Missing' },
    widthConfidence: 'PARTIALLY_VERIFIED',
    widthReason: 'Manufacturer states "generally 400 mm" but does not define exceptions.',
  }));
  return { ...outcome, arrangement: 'Manufacturer Supported', arrangementSupported: outcome.status === 'PARTIALLY_VERIFIED', breakerRatedCurrent: breaker.rating, operationalCurrent, operationalCurrentStatus, notes: 'Width classified PARTIALLY_VERIFIED (source wording "generally"). Manufacturer Operational Current is informational only.' };
}

function evaluateBreakerCore(breaker, project, breakers = null) {
  if (!breaker.frame || !breaker.series) return result('MANUFACTURER_CONFIRMATION_REQUIRED', { ruleId: 'NO_ESTABLISHED_CANDIDATE', table: 'No source-backed candidate', matchedRule: 'No source-backed candidate for ' + breaker.rating + '; no breaker selected.', missingParameters: ['source-backed breaker frame for ' + breaker.rating + ' (NO_ESTABLISHED_CANDIDATE)'] });
  if (project.manufacturer === 'ABB' && project.system === 'MNS R') return evaluateAbb(breaker, project);
  if (project.manufacturer === 'Siemens' && project.system === 'SIVACON S8' && breaker.series === 'SENTRON 3WA') return evaluateSiemens3wa(breaker, project, breakers || [breaker]);
  if (project.manufacturer === 'Siemens' && project.system === 'SIVACON S8' && breaker.series === 'SENTRON 3VA') return evaluateSiemens3va(breaker, project);
  return result('MANUFACTURER_CONFIRMATION_REQUIRED', { ruleId: 'NO_VERIFIED_RULE', matchedRule: 'No manufacturer rule matches the selection.', missingParameters: ['manufacturer configuration'] });
}

// `breakers` is the current design (used to derive the active buses of the breaker's switchboard).
export function evaluateBreaker(breaker, project, breakers = null) {
  const outcome = evaluateBreakerCore(breaker, project, breakers);
  return {
    ...outcome,
    source: resolveRuleSource(outcome.ruleId),
    derivedInputs: { circuitRole: breaker.direction, entryDirection: breaker.route, electricalBusRole: breaker.bus, ...(outcome.derivedInputs || {}) },
  };
}

export function getValidBusbarPositions(project) {
  return [...(CONFIG_OPTIONS[project.manufacturer]?.busbarPositions || [])];
}
export function getValidConnectionTypes(project, breaker) {
  return project.manufacturer === 'Siemens' && breaker.series === 'SENTRON 3WA' ? [...CONFIG_OPTIONS.Siemens.connectionTypes] : [];
}
export function getValidMountingDesigns(project, breaker, breakers = [breaker]) {
  if (project.manufacturer !== 'Siemens') return [];
  if (breaker.series === 'SENTRON 3VA') return [...CONFIG_OPTIONS.Siemens.mountingDesigns3VA];
  if (breaker.series === 'SENTRON 3WA') return siemens3waRequirements(breaker, project, breakers).footnotes.some(([, note]) => note.mountingDesign) ? [...CONFIG_OPTIONS.Siemens.mountingDesigns3WA] : [];
  return [];
}

// ---------------------------------------------------------------------------
// Section generator
// ---------------------------------------------------------------------------
export const SECTION_WIDTH_STATUS = { VERIFIED: 'VERIFIED', USER_SELECTED: 'USER_SELECTED', PARTIALLY_VERIFIED: 'PARTIALLY_VERIFIED', PROVISIONAL: 'PROVISIONAL' };
export const PACKING_STATUS = { UNRESOLVED: 'UNRESOLVED', NOT_APPLICABLE: 'NOT_APPLICABLE', MANUFACTURER_SUPPORTED_SINGLE_DEVICE: 'MANUFACTURER_SUPPORTED_SINGLE_DEVICE' };
const WIDTH_LABEL = {
  VERIFIED: 'Verified Section Width',
  USER_SELECTED: 'Manufacturer-Supported · User Selected Width',
  PARTIALLY_VERIFIED: 'Nominal Planning Width · Partially Verified',
  PROVISIONAL: 'Provisional Planning Width · Engineering Estimate',
};

export function mccbPackingRequirements(breaker, project, device = null) {
  if (breaker.type !== 'MCCB') return [];
  if (project.manufacturer === 'ABB') {
    return ['manufacturer-specific compatible combination', 'usable MNS R cubicle E-module space', 'cable compartment and auxiliary equipment configuration', 'mounting orientation', 'for T6: applicability of the p.22 four-breaker footnote (rating, pole, busbar, cable, auxiliary space, mounting)'];
  }
  if (device?.arrangementSupported) return [];
  return ['§3.4 single-3VA cubicle conditions (fixed-mounted, Tab. 3/16 cubicle type, Tab. 3/17 operational current) not yet matched'];
}

// One section per device. Device data and section arrangement are classified separately.
function makeSection(items, boardId, id, project, breakers) {
  const first = items[0];
  const device = evaluateBreaker(first, project, breakers);
  const noCandidate = !first.frame;
  const isMccb = !noCandidate && first.type === 'MCCB';
  const packingMissingParameters = mccbPackingRequirements(first, project, device);
  const packingUnresolved = isMccb && packingMissingParameters.length > 0;
  const deviceInvalid = device.status === 'INVALID_MANUFACTURER_CONFIGURATION';
  let widthStatus = SECTION_WIDTH_STATUS.PROVISIONAL;
  if (!packingUnresolved) {
    if (device.status === 'MANUFACTURER_VERIFIED') widthStatus = SECTION_WIDTH_STATUS.VERIFIED;
    if (device.status === 'MANUFACTURER_SUPPORTED_USER_SELECTED') widthStatus = SECTION_WIDTH_STATUS.USER_SELECTED;
    if (device.status === 'PARTIALLY_VERIFIED') widthStatus = SECTION_WIDTH_STATUS.PARTIALLY_VERIFIED;
  }
  const packingRuleId = noCandidate ? 'NO_ESTABLISHED_CANDIDATE' : !isMccb ? 'SINGLE_ACB_CUBICLE' : packingUnresolved ? 'NO_AUTOMATIC_MCCB_PACKING' : 'SIEMENS_S8_3VA_SINGLE_MCCB_CUBICLE';
  return {
    id,
    boardId,
    bus: first.bus,
    items,
    width: device.widthMm,
    widthStatus,
    widthLabel: WIDTH_LABEL[widthStatus],
    classification: widthStatus === SECTION_WIDTH_STATUS.PROVISIONAL ? CONFIDENCE.ENGINEERING_ESTIMATE : device.classification,
    confidence: deviceInvalid ? INVALID : packingUnresolved ? CONFIRMATION : device.confidence,
    arrangement: noCandidate ? 'No source-backed breaker selected — provisional placeholder section only.' : !isMccb ? 'Single-ACB section using the matched device cubicle rule.' : packingUnresolved ? 'Single-MCCB planning section. Device data only; official MCCB packing / compartment arrangement unresolved.' : 'One 3VA per cubicle — manufacturer-supported cubicle type (§3.4).',
    deviceRuleId: device.ruleId,
    deviceTable: device.table,
    deviceConfidence: device.confidence,
    deviceWidthMm: device.widthMm,
    deviceModule: device.module || null,
    packingStatus: !isMccb ? PACKING_STATUS.NOT_APPLICABLE : packingUnresolved ? PACKING_STATUS.UNRESOLVED : PACKING_STATUS.MANUFACTURER_SUPPORTED_SINGLE_DEVICE,
    packingRuleId,
    packingSource: resolveRuleSource(packingRuleId),
    packingMissingParameters,
  };
}

export function generateSections(breakers, project, boardId) {
  const entries = boardId ? breakers.filter(b => b.switchboardId === boardId) : breakers;
  return entries.map((breaker, index) => makeSection([breaker], breaker.switchboardId, 'S' + String(index + 1).padStart(2, '0'), project, breakers));
}

// ---------------------------------------------------------------------------
// Configuration schema / validation / completeness
// ---------------------------------------------------------------------------
export function getDesignConfigurationSchema(project, breakers) {
  const boardIds = switchboardIds(project);
  const breakerControls = breakers.flatMap(breaker => {
    const config = breakerConfiguration(project, breaker);
    const controls = [];
    if (project.manufacturer === 'ABB') {
      const appFrame = ABB_APPLICATION_FRAMES.find(item => item.frame === breaker.frame);
      const catalog = appFrame && ABB_BREAKER_CATALOG[appFrame.catalogFrame];
      if (catalog?.type === 'MCCB') controls.push({ key: 'cubicleType', label: 'MNS R Cubicle Type', options: [...CONFIG_OPTIONS.ABB.cubicleTypes], value: config.cubicleType || '', required: true, reason: 'MCCB data exists for Power Center (p.22) and MCC plug-in (p.23); not interchangeable.', sourceRule: 'ABB_MNSR_CUBICLE_TYPE_REQUIRED' });
      const levels = catalog?.iuByPerformanceLevel ? performanceLevelsFor(breaker.frame, breaker.rating) : null;
      if (levels) controls.push({ key: 'performanceLevel', label: 'Emax 2 Performance Level', options: [...levels.all], value: config.performanceLevel || '', required: levels.dependent, reason: levels.dependent ? `${breaker.rating} is listed only for performance level ${levels.supporting.join(' / ')} (${catalog.ruleId}).` : `${breaker.rating} is listed for every ${breaker.frame} performance level; selection optional.`, sourceRule: catalog.ruleId });
    }
    if (project.manufacturer === 'Siemens' && breaker.series === 'SENTRON 3WA') {
      const req = siemens3waRequirements(breaker, project, breakers);
      controls.push({ key: 'connectionType', label: 'Connection Type', options: getValidConnectionTypes(project, breaker), value: config.connectionType || '', required: true, reason: 'Tables 3/2–3/4 separate Cable and Busbar (8PS trunking) connection.', sourceRule: req.selection?.table?.ruleId || 'SIEMENS_S8_3WA_LAYOUT_TABLES_PREREQUISITES' });
      if (req.widths.length > 1) controls.push({ key: 'cubicleWidthMm', label: 'Manufacturer-Supported Cubicle Width', options: [...req.widths], value: config.cubicleWidthMm || '', required: true, reason: `${req.selection.table.label} lists ${req.widths.join(' / ')} mm without a selection condition.`, sourceRule: req.selection.table.ruleId });
      if (req.footnotes.some(([, note]) => note.mountingDesign)) controls.push({ key: 'mountingDesign', label: '3WA Mounting Design', options: [...CONFIG_OPTIONS.Siemens.mountingDesigns3WA], value: config.mountingDesign || '', required: true, reason: `${req.selection.table.label} footnote requires a withdrawable unit.`, sourceRule: req.selection.table.ruleId });
      if (req.footnotes.some(([, note]) => note.breakingCapacityClasses)) controls.push({ key: 'breakingCapacityClass', label: '3WA Breaking Capacity Class', options: [...CONFIG_OPTIONS.Siemens.breakingCapacityClasses], value: config.breakingCapacityClass || '', required: true, reason: `${req.selection.table.label} footnote 4) requires 3WA1350 H or C.`, sourceRule: req.selection.table.ruleId });
    }
    if (project.manufacturer === 'Siemens' && breaker.series === 'SENTRON 3VA') {
      controls.push({ key: 'mountingDesign', label: '3VA Mounting Design', options: [...CONFIG_OPTIONS.Siemens.mountingDesigns3VA], value: config.mountingDesign || '', required: true, reason: 'Tab. 3/1: MCCB in fixed-mounted design; plug-in / withdrawable on request.', sourceRule: 'SIEMENS_S8_TABLE_3_1_MCCB_FIXED' });
      controls.push({ key: 'ventilation', label: 'Ventilation', options: [...CONFIG_OPTIONS.Siemens.ventilation], value: config.ventilation || '', required: true, reason: 'Table 3/17 separates ventilated and non-ventilated ratings.', sourceRule: 'SIEMENS_S8_TABLE_3_17' });
    }
    return controls.length ? [{ internalId: breaker.internalId, switchboardId: breaker.switchboardId, displayNumber: breaker.id, displayLabel: breakerDisplayLabel(breaker), series: breaker.series, frame: breaker.frame, controls }] : [];
  });
  const switchboards = boardIds.map(boardId => {
    const boardBreakers = breakers.filter(breaker => breaker.switchboardId === boardId);
    const buses = [...new Set(boardBreakers.map(breaker => breaker.bus))];
    const board = boardConfiguration(project, boardId);
    const controls = buses.map(bus => ({
      key: 'busbarPositions', subKey: bus, required: true,
      label: (bus === 'UPS Output Bus' ? 'BUS-B / UPS Output / Critical Bus' : 'BUS-A / Input / Normal Bus') + ' - Physical Position',
      options: getValidBusbarPositions(project),
      value: board.busbarPositions?.[bus] || '',
      reason: project.manufacturer === 'ABB' ? 'ABB MNS R p.14 supports Top, Center and Bottom.' : 'SIVACON S8 Tables 3/2–3/4 depend on Top, Rear Top or Rear Bottom.',
      sourceRule: project.manufacturer === 'ABB' ? 'ABB_MNSR_BUSBAR_POSITIONS_AVAILABLE' : 'SIEMENS_S8_BUSBAR_CONFIGURATION_INPUTS',
    }));
    if (project.manufacturer === 'Siemens') {
      const reqs = boardBreakers.filter(breaker => breaker.series === 'SENTRON 3WA').map(breaker => siemens3waRequirements(breaker, project, breakers));
      const needsFrameHeight = reqs.some(req => req.footnotes.some(([, note]) => note.frameHeightMm));
      const needsFront = reqs.some(req => req.footnotes.some(([, note]) => note.frontLayout));
      if (needsFrameHeight || board.frameHeightMm) controls.push({ key: 'frameHeightMm', label: 'Frame Height', options: [...CONFIG_OPTIONS.Siemens.frameHeightsMm], value: board.frameHeightMm || '', required: needsFrameHeight, reason: 'Tables 3/2–3/4 footnotes require frame height 2,200 mm for some types (Tab. 2/1).', sourceRule: 'SIEMENS_S8_FRAME_HEIGHTS' });
      controls.push({ key: 'frontLayout', label: 'Single / Double Front', options: [...CONFIG_OPTIONS.Siemens.frontLayouts], value: board.frontLayout || '', required: needsFront, reason: 'Double front is only feasible with busbar position at the rear (Tab. 2/6, §9.1).', sourceRule: 'SIEMENS_S8_DOUBLE_FRONT_REAR_BUSBAR' });
    }
    return { boardId, controls };
  });
  return { switchboards, breakers: breakerControls };
}

function issue(issueId, fields) {
  return { issueId, classification: INVALID, ...fields };
}

// Manufacturer configuration validation. Each engineering issue has a stable issueId and is reported once.
export function validateDesignConfiguration(project, breakers) {
  const issues = new Map();
  const add = item => { if (!issues.has(item.issueId)) issues.set(item.issueId, item); };
  const validPositions = getValidBusbarPositions(project);
  const positionRule = project.manufacturer === 'ABB' ? 'ABB_MNSR_BUSBAR_POSITIONS_AVAILABLE' : 'SIEMENS_S8_BUSBAR_CONFIGURATION_INPUTS';
  switchboardIds(project).forEach(boardId => {
    const buses = [...new Set(breakers.filter(b => b.switchboardId === boardId).map(b => b.bus))];
    const board = boardConfiguration(project, boardId);
    const positions = buses.map(bus => board.busbarPositions?.[bus]).filter(Boolean);
    positions.filter(position => !validPositions.includes(position)).forEach(position => add(issue(`MFR:${boardId}:BUSBAR_POSITION_UNSUPPORTED:${position}`, { scope: boardId, field: 'Physical Busbar Position', message: position + ' is not supported by ' + project.manufacturer + '.', currentValue: position, manufacturerRule: positionRule, validAlternatives: validPositions.filter(item => item !== position) })));
    if (new Set(positions).size !== positions.length) add(issue(`MFR:${boardId}:BUSBAR_POSITION_DUPLICATE`, { scope: boardId, field: 'Physical Busbar Position', message: 'Two electrical buses cannot match the same physical position.', currentValue: positions.join(' + '), manufacturerRule: positionRule, validAlternatives: validPositions }));
    if (project.manufacturer === 'Siemens' && positions.length > 1) {
      const pair = new Set(positions);
      if (!(pair.has('Rear Top') && pair.has('Rear Bottom') && pair.size === 2)) add(issue(`MFR:${boardId}:SIEMENS_TWO_BUS_PAIR`, { scope: boardId, field: 'Physical Busbar Position', message: 'Two busbar systems in a cubicle are rear-top and rear-bottom (Tab. 2/2, 3/4).', currentValue: positions.join(' + '), manufacturerRule: positionRule, validAlternatives: ['Rear Top + Rear Bottom'] }));
    }
    if (project.manufacturer === 'Siemens' && board.frontLayout === 'Double Front' && positions.includes('Top')) add(issue(`MFR:${boardId}:DOUBLE_FRONT_REQUIRES_REAR_BUSBAR`, { scope: boardId, field: 'Single / Double Front', message: 'Double-front switchboards are only feasible with busbar position at the rear.', currentValue: 'Double Front + Top busbar', manufacturerRule: 'SIEMENS_S8_DOUBLE_FRONT_REAR_BUSBAR', validAlternatives: ['Single Front', 'Rear Top / Rear Bottom busbar'] }));
  });
  breakers.forEach(breaker => {
    const outcome = evaluateBreaker(breaker, project, breakers);
    if (outcome.status === 'INVALID_MANUFACTURER_CONFIGURATION') {
      add(issue(`MFR:${breaker.internalId}:${outcome.ruleId}`, {
        scope: breakerDisplayLabel(breaker), internalId: breaker.internalId,
        field: 'Breaker Configuration',
        message: outcome.matchedRule,
        manufacturerRule: outcome.ruleId, validAlternatives: outcome.availableWidths || [],
      }));
    }
  });
  const list = [...issues.values()];
  return { valid: list.length === 0, issues: list };
}

export function getConfigurationCompleteness(project, breakers) {
  const schema = getDesignConfigurationSchema(project, breakers);
  const items = [];
  const status = control => control.required === false ? 'Optional' : control.value ? 'Resolved' : 'Missing';
  schema.switchboards.forEach(board => board.controls.forEach(control => items.push({ scope: board.boardId, label: control.label, status: status(control), value: control.value || '', sourceRule: control.sourceRule })));
  schema.breakers.forEach(entry => entry.controls.forEach(control => items.push({ scope: entry.displayLabel, label: control.label, status: status(control), value: control.value || '', sourceRule: control.sourceRule })));
  items.push({ scope: 'Design', label: 'Electrical bus role', status: 'Resolved', value: 'Derived from Function', sourceRule: 'DERIVED_INPUT' });
  items.push({ scope: 'Breaker', label: 'Entry direction', status: 'Resolved', value: 'Derived from Route', sourceRule: 'DERIVED_INPUT' });
  if (!breakers.some(b => b.series === 'SENTRON 3VA')) items.push({ scope: 'Design', label: '3VA ventilation', status: 'Not Applicable', value: '', sourceRule: 'SIEMENS_S8_TABLE_3_17' });
  if (project.manufacturer !== 'Siemens') items.push({ scope: 'Design', label: 'Siemens connection / layout', status: 'Not Applicable', value: '', sourceRule: 'SIEMENS_ONLY' });
  const requiredItems = items.filter(item => item.status !== 'Not Applicable' && item.status !== 'Optional');
  const resolved = requiredItems.filter(item => item.status === 'Resolved').length;
  return { percentage: requiredItems.length ? Math.round(resolved / requiredItems.length * 100) : 100, required: requiredItems.length, resolved, missing: requiredItems.filter(item => item.status === 'Missing').length, notApplicable: items.filter(item => item.status === 'Not Applicable' || item.status === 'Optional').length, items, validation: validateDesignConfiguration(project, breakers) };
}

// Removes breaker configuration values that the rule engine no longer offers for the breaker's current
// frame / pole / rating / route / busbar context (e.g. an E1.2 width left over after a frame change).
// Board-level configuration and configuration of breakers not in the design are left untouched.
export function sanitizeBreakerConfiguration(project, breakers) {
  const removed = [];
  for (let pass = 0; pass < 4; pass++) {
    const schema = getDesignConfigurationSchema(project, breakers);
    let changed = false;
    breakers.forEach(breaker => {
      const config = project.configuration?.breakers?.[breaker.internalId];
      if (!config) return;
      const controls = schema.breakers.find(entry => entry.internalId === breaker.internalId)?.controls || [];
      Object.keys(config).forEach(key => {
        const control = controls.find(item => item.key === key);
        const valid = control && control.options.some(option => String(option) === String(config[key]));
        if (!valid) { removed.push({ internalId: breaker.internalId, key, value: config[key] }); delete config[key]; changed = true; }
      });
    });
    if (!changed) break;
  }
  return removed;
}

export function getBusbarRule(project, boardId, bus) {
  const allowedPositions = getValidBusbarPositions(project);
  const selectedPosition = boardConfiguration(project, boardId).busbarPositions?.[bus] || '';
  const common = { boardId, bus, busId: bus === 'UPS Output Bus' ? 'BUS-B' : 'BUS-A', roleLabel: bus === 'UPS Output Bus' ? 'UPS Output / Critical Bus' : 'Input / Normal Bus', allowedPositions, selectedPosition: selectedPosition || null };
  const withSource = rule => ({ ...rule, source: resolveRuleSource(rule.ruleId) });
  if (!selectedPosition) return withSource({ ...common, physicalPosition: 'Physical Position Not Confirmed', ruleId: 'BUSBAR_POSITION_CONFIRMATION_REQUIRED', classification: CONFIRMATION, confidence: CONFIRMATION, manufacturerRule: 'Select a physical position from the shared manufacturer database.', missingParameters: ['physical busbar position'] });
  if (!allowedPositions.includes(selectedPosition)) return withSource({ ...common, physicalPosition: selectedPosition, ruleId: 'INVALID_BUSBAR_CONFIGURATION', classification: INVALID, confidence: INVALID, manufacturerRule: selectedPosition + ' is unsupported.', missingParameters: ['supported physical busbar position'] });
  return withSource({ ...common, physicalPosition: selectedPosition, ruleId: project.manufacturer === 'ABB' ? 'ABB_MNSR_BUSBAR_POSITION_SELECTED' : 'SIEMENS_S8_BUSBAR_POSITION_SELECTED', classification: CONFIDENCE.MANUFACTURER_SUPPORTED_USER_SELECTED, confidence: CONFIDENCE.MANUFACTURER_SUPPORTED_USER_SELECTED, manufacturerRule: 'User-selected manufacturer-supported position: ' + selectedPosition + '.', missingParameters: [] });
}

// Rule audit generated from the shared metadata catalog.
export function getRuleAudit(manufacturer) {
  return [...RULE_METADATA.values()]
    .filter(rule => !manufacturer || rule.sourceType === 'APPLICATION' || resolveRuleSource(rule.ruleId).manufacturer === manufacturer)
    .map(rule => {
      const source = resolveRuleSource(rule.ruleId);
      const parent = rule.parentRuleId ? RULE_METADATA.get(rule.parentRuleId) : null;
      const outcome = rule.result ?? parent?.result;
      return {
        id: rule.ruleId,
        result: typeof outcome === 'string' ? outcome : outcome ? JSON.stringify(outcome) : NOT_SPECIFIED,
        source: source.sourceType === 'APPLICATION' ? 'Application rule (not manufacturer sourced)' : [source.document, source.revision, 'pdf p.' + source.pdfPage, 'printed p.' + source.printedPage, source.table].join(' · '),
        classification: rule.confidence || parent?.confidence || NOT_SPECIFIED,
        usedBy: rule.usage || NOT_SPECIFIED,
        notes: rule.notes || (rule.parentRuleId ? 'Child of ' + rule.parentRuleId : ''),
      };
    });
}

export function getManufacturerRuleCatalog(manufacturer, system) {
  return MANUFACTURER_RULE_CATALOG.filter(rule => rule.manufacturer === manufacturer && rule.system === system);
}

export function getAvailableManufacturerDimensions(project) {
  if (project.manufacturer === 'ABB' && project.system === 'MNS R') {
    const rule = MANUFACTURER_RULE_CATALOG.find(item => item.ruleId === 'ABB_MNSR_DIMENSIONS_AVAILABLE');
    return { matched: false, classification: CONFIDENCE.MANUFACTURER_VERIFIED, confidence: CONFIDENCE.MANUFACTURER_VERIFIED, ruleId: rule.ruleId, availableConfigurations: rule.result, selectionStatus: 'Not matched to current configuration', source: resolveRuleSource(rule.ruleId) };
  }
  return { matched: false, classification: CONFIRMATION, confidence: CONFIRMATION, ruleId: 'DIMENSIONS_CONFIGURATION_REQUIRED', availableConfigurations: null, selectionStatus: 'No manufacturer dimension data encoded', source: resolveRuleSource('DIMENSIONS_CONFIGURATION_REQUIRED') };
}

export function getSiemensConfigurationInputs() {
  return [
    { input: 'Physical busbar position', classification: 'Switchboard configuration input', level: 'Switchboard-level', table: 'Tab. 3/2–3/4, 3/16–3/17', reason: 'Selects the top or rear table.' },
    { input: 'Number of busbar systems', classification: 'Derived from bus positions', level: 'Switchboard-level', table: 'Tab. 3/3 vs 3/4', reason: 'One or two rear systems.' },
    { input: 'Cable / busbar entry', classification: 'Derived from Route', level: 'Breaker-level', table: 'Tab. 3/3 / 3/4 G1 / G2, 3/17', reason: 'G1 = opposite side, G2 = same side.' },
    { input: 'Connection type for 3WA', classification: 'Breaker configuration input', level: 'Breaker-level', table: 'Tab. 3/2–3/4', reason: 'Cable and busbar columns differ.' },
    { input: 'Cubicle width alternatives', classification: 'Manufacturer-supported alternatives (user selected)', level: 'Breaker-level', table: 'Tab. 3/2–3/4', reason: 'No selection condition in the source.' },
    { input: 'Mounting / frame height / breaking capacity / front layout', classification: 'Footnote conditions', level: 'Breaker / switchboard', table: 'Tab. 3/2–3/4 footnotes', reason: 'Required only where a footnote applies.' },
    { input: 'Unlisted multi-MCCB combination', classification: 'Manufacturer confirmation only', level: 'Manufacturer confirmation', table: 'No generic packing table', reason: 'Automatic multi-3VA packing is not proven.' },
  ];
}

export function getConfigurationValueDomains() {
  return {
    busbarPositions: [...new Set([...CONFIG_OPTIONS.ABB.busbarPositions, ...CONFIG_OPTIONS.Siemens.busbarPositions])],
    frontLayouts: [...CONFIG_OPTIONS.Siemens.frontLayouts],
    connectionTypes: [...CONFIG_OPTIONS.Siemens.connectionTypes],
    ventilation: [...CONFIG_OPTIONS.Siemens.ventilation],
    mountingDesigns: [...new Set([...CONFIG_OPTIONS.Siemens.mountingDesigns3WA, ...CONFIG_OPTIONS.Siemens.mountingDesigns3VA])],
    cubicleTypes: [...CONFIG_OPTIONS.ABB.cubicleTypes],
    performanceLevels: [...CONFIG_OPTIONS.ABB.performanceLevels],
    breakingCapacityClasses: [...CONFIG_OPTIONS.Siemens.breakingCapacityClasses],
    frameHeightsMm: [...CONFIG_OPTIONS.Siemens.frameHeightsMm],
  };
}

// Source data made available for future topology support (not used by any Function yet).
export function getSiemensCouplerData() {
  return SIEMENS_3WA_COUPLER_TABLES;
}
export function getSiemensTable36() {
  return SIEMENS_TABLE_3_6;
}
