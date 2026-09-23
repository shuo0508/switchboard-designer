// Persistence schema normalization. Nothing read from localStorage is trusted as-is:
// every field is whitelisted, type-checked and constrained to a known value domain.
import { POLE_OPTIONS, RATING_OPTIONS, deriveBreakerType, framesForSeries, getConfigurationValueDomains, getProductCatalog, recommendBreaker } from './manufacturer-rules.js';
import { BUS_RATINGS, SWITCHBOARD_IDS, normalizeDimensionInput } from './project-model.js';
import { FUNCTIONS, FUNCTION_OPTIONS, busForFunction } from './topology.js';
import { ensureSwitchboardState } from './ux-state.js';

export const STORAGE_KEYS = { breakers: 'switchboard-data-v2', project: 'switchboard-project-v2', legacyBreakers: 'switchboard-data' };
const BUSES = ['Input Bus', 'UPS Output Bus'];
const ROUTES = ['Top', 'Bottom'];
const ID_PATTERN = /^[A-Za-z0-9-]{1,80}$/;
const LEGACY_FUNCTIONS = { Main_Input: 'MAIN_INPUT', Gen_Input: 'GEN_INPUT', UPS_Input: 'UPS_INPUT', UPS_Output: 'UPS_OUTPUT', Loadbank: 'LOADBANK', Bypass: 'BYPASS', UPS_Input_Load: 'UPS_INPUT_LOAD', UPS_Output_Load: 'UPS_OUTPUT_LOAD' };

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const oneOf = (value, list, fallback) => list.includes(value) ? value : fallback;

export function parseJson(text) {
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

function normalizeConfiguration(raw, legacyBusbarLayouts) {
  const domains = getConfigurationValueDomains();
  const source = isObject(raw) ? raw : {};
  const switchboards = {};
  let rawBoards = isObject(source.switchboards) ? source.switchboards : {};
  // Legacy migration: busbarLayouts -> configuration.switchboards[boardId].busbarPositions
  if (!Object.keys(rawBoards).length && isObject(legacyBusbarLayouts)) {
    rawBoards = Object.fromEntries(Object.entries(legacyBusbarLayouts).map(([boardId, buses]) => [boardId, { busbarPositions: Object.fromEntries(Object.entries(isObject(buses) ? buses : {}).map(([bus, item]) => [bus, item?.selectedPosition || ''])) }]));
  }
  SWITCHBOARD_IDS.forEach(boardId => {
    const board = isObject(rawBoards[boardId]) ? rawBoards[boardId] : null;
    if (!board) return;
    const positions = {};
    BUSES.forEach(bus => {
      const value = board.busbarPositions?.[bus];
      if (domains.busbarPositions.includes(value)) positions[bus] = value;
    });
    const entry = { busbarPositions: positions };
    if (domains.frontLayouts.includes(board.frontLayout)) entry.frontLayout = board.frontLayout;
    if (domains.frameHeightsMm.includes(Number(board.frameHeightMm))) entry.frameHeightMm = Number(board.frameHeightMm);
    switchboards[boardId] = entry;
  });
  const breakers = {};
  Object.entries(isObject(source.breakers) ? source.breakers : {}).forEach(([internalId, config]) => {
    if (!ID_PATTERN.test(internalId) || !isObject(config)) return;
    const entry = {};
    const width = Number(config.cubicleWidthMm);
    if (Number.isInteger(width) && width > 0 && width <= 3000) entry.cubicleWidthMm = width;
    if (domains.connectionTypes.includes(config.connectionType)) entry.connectionType = config.connectionType;
    if (domains.mountingDesigns.includes(config.mountingDesign)) entry.mountingDesign = config.mountingDesign;
    if (domains.ventilation.includes(config.ventilation)) entry.ventilation = config.ventilation;
    if (domains.cubicleTypes.includes(config.cubicleType)) entry.cubicleType = config.cubicleType;
    if (domains.breakingCapacityClasses.includes(config.breakingCapacityClass)) entry.breakingCapacityClass = config.breakingCapacityClass;
    breakers[internalId] = entry;
  });
  return { switchboards, breakers };
}

export function defaultProject() {
  return ensureSwitchboardState({ manufacturer: 'ABB', system: 'MNS R', mainBus: BUS_RATINGS[0], defaultRoute: 'Bottom', quantity: 1, configuration: { switchboards: {}, breakers: {} }, switchboards: {}, dimensions: { heightMm: null, depthMm: null }, gaView: { mode: 'SCHEMATIC', zoom: 100 } });
}

export function normalizeProject(raw) {
  const source = isObject(raw) ? raw : {};
  const manufacturer = source.manufacturer === 'Siemens' ? 'Siemens' : 'ABB';
  const project = {
    manufacturer,
    system: manufacturer === 'ABB' ? 'MNS R' : 'SIVACON S8',
    mainBus: oneOf(source.mainBus, BUS_RATINGS, BUS_RATINGS[0]),
    defaultRoute: oneOf(source.defaultRoute, ROUTES, 'Bottom'),
    quantity: source.quantity === 2 ? 2 : 1,
    configuration: normalizeConfiguration(source.configuration, source.busbarLayouts),
    switchboards: isObject(source.switchboards) ? source.switchboards : {},
    // Legacy "currentDimensions" (2400 x 1200) was a hidden default, never a user input: it is not migrated.
    dimensions: { heightMm: normalizeDimensionInput(source.dimensions?.heightMm), depthMm: normalizeDimensionInput(source.dimensions?.depthMm) },
    gaView: { mode: oneOf(source.gaView?.mode, ['SCHEMATIC', 'PHYSICAL'], 'SCHEMATIC'), zoom: Math.max(50, Math.min(200, Number(source.gaView?.zoom) || 100)) },
  };
  return ensureSwitchboardState(project);
}

function applyRecommendation(breaker, project) {
  const recommendation = recommendBreaker({ ...breaker, manufacturer: project.manufacturer, system: project.system }, project);
  breaker.series = recommendation.series;
  breaker.frame = recommendation.frame;
  breaker.type = recommendation.type;
  breaker.recommendationClass = recommendation.classification;
  breaker.recommendation = { status: recommendation.status, policy: recommendation.policy, candidates: recommendation.candidates.map(item => item.frame) };
}

function legacyArrayToObject(row) {
  const route = ROUTES.includes(row[9]) ? row[9] : null;
  return { id: row[0], function: FUNCTION_OPTIONS.includes(row[1]) ? row[1] : LEGACY_FUNCTIONS[row[1]], series: row[4], frame: row[5], rating: row[6], pole: row[7], route: route || 'INHERIT', routeMode: route ? 'explicit' : 'default', switchboardId: 'SWB-01', assignmentMode: 'inherited' };
}

// Returns a breaker containing only current-schema fields. Legacy fields
// (section, connection, entry, cableSize, cableQty, busRole) are dropped.
export function normalizeBreaker(raw, project, makeId) {
  const source = Array.isArray(raw) ? legacyArrayToObject(raw) : isObject(raw) ? raw : {};
  const catalog = getProductCatalog(project.manufacturer);
  const functionKey = FUNCTIONS[source.function] ? source.function : 'UPS_INPUT_LOAD';
  const explicitRoute = ROUTES.includes(source.route) && source.routeMode !== 'default';
  const switchboardId = oneOf(source.switchboardId, SWITCHBOARD_IDS, 'SWB-01');
  const assignmentMode = source.assignmentMode === 'explicit' ? 'explicit' : 'inherited';
  const breaker = {
    internalId: typeof source.internalId === 'string' && ID_PATTERN.test(source.internalId) ? source.internalId : makeId(),
    id: typeof source.id === 'string' && /^CB-\d{2,3}$/.test(source.id) ? source.id : 'CB-01',
    switchboardId,
    assignmentMode,
    preferredSwitchboardId: assignmentMode === 'explicit' ? oneOf(source.preferredSwitchboardId, SWITCHBOARD_IDS, switchboardId) : null,
    function: functionKey,
    direction: FUNCTIONS[functionKey].direction,
    bus: busForFunction(functionKey),
    rating: oneOf(source.rating, RATING_OPTIONS, '160A'),
    pole: oneOf(source.pole, POLE_OPTIONS, '4P'),
    route: explicitRoute ? source.route : project.defaultRoute,
    routeMode: explicitRoute ? 'explicit' : 'default',
    seriesMode: source.seriesMode === 'manual' ? 'manual' : 'auto',
    frameMode: source.frameMode === 'manual' ? 'manual' : 'auto',
    series: catalog.series.includes(source.series) ? source.series : null,
    frame: null,
    type: null,
  };
  if (breaker.series && framesForSeries(project.manufacturer, breaker.series).includes(source.frame)) breaker.frame = source.frame;
  const manual = breaker.seriesMode === 'manual' || breaker.frameMode === 'manual';
  if (!manual || !breaker.series || !breaker.frame) {
    breaker.seriesMode = 'auto';
    breaker.frameMode = 'auto';
    applyRecommendation(breaker, project);
  } else {
    breaker.type = deriveBreakerType(breaker.series);
  }
  return breaker;
}

export function normalizeBreakers(rawList, project, makeId) {
  if (!Array.isArray(rawList) || !rawList.length) return null;
  const seen = new Set();
  return rawList.map(raw => {
    const breaker = normalizeBreaker(raw, project, makeId);
    if (seen.has(breaker.internalId)) breaker.internalId = makeId();
    seen.add(breaker.internalId);
    return breaker;
  });
}

export function recommendInto(breaker, project) {
  applyRecommendation(breaker, project);
}
