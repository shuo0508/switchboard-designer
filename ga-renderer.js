import { escapeHtml } from './html.js';

const NS = 'http://www.w3.org/2000/svg';
const POSITION_Y = { Top: 112, 'Rear Top': 142, Center: 250, 'Rear Bottom': 356, Bottom: 388 };
// Section width is strictly proportional to its millimetre width (no minimum clamp).
// Readability is provided through zoom and horizontal scrolling instead.
export const PX_PER_MM = 0.3;
export const GA_SIDE_PX = 176;

export function sectionPixelWidth(widthMm) {
  return Math.max(0, Number(widthMm) || 0) * PX_PER_MM;
}

// Pure layout: section x/width plus bus segments. A bus segment only spans contiguous
// sections of that bus, so an electrical bus line never passes through another bus's sections.
export function computeBoardLayout(board) {
  let cursor = GA_SIDE_PX;
  const sections = board.sections.map((section, index) => {
    const width = sectionPixelWidth(section.widthMm);
    const item = { key: section.key, index, busId: section.busId, x: cursor, width };
    cursor += width;
    return item;
  });
  const segments = [];
  sections.forEach(section => {
    const last = segments.at(-1);
    if (last && last.busId === section.busId && last.endIndex === section.index - 1) {
      last.endIndex = section.index;
      last.x2 = section.x + section.width;
    } else {
      segments.push({ busId: section.busId, startIndex: section.index, endIndex: section.index, x1: section.x, x2: section.x + section.width });
    }
  });
  const segmentsByBus = new Map();
  segments.forEach(segment => {
    const list = segmentsByBus.get(segment.busId) || [];
    list.push(segment);
    segment.segmentNumber = list.length;
    segmentsByBus.set(segment.busId, list);
  });
  segments.forEach(segment => { segment.segmentCount = segmentsByBus.get(segment.busId).length; });
  return { sections, segments, lineupWidth: cursor - GA_SIDE_PX };
}

function svgElement(name, attrs = {}, text = '') {
  const element = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, String(value)));
  if (text) element.textContent = text;
  return element;
}

function text(svg, x, y, value, className, anchor = 'start') {
  const node = svgElement('text', { x, y, class: className, 'text-anchor': anchor }, value);
  svg.append(node);
  return node;
}

function multiline(svg, x, y, lines, className, anchor = 'middle', gap = 12) {
  const node = svgElement('text', { x, y, class: className, 'text-anchor': anchor });
  lines.forEach((line, index) => node.append(svgElement('tspan', { x, dy: index ? gap : 0 }, line)));
  svg.append(node);
  return node;
}

function uniqueId(prefix) {
  const random = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

function addDefinitions(svg) {
  const defs = svgElement('defs');
  const flow = svgElement('marker', { id: uniqueId('flow'), viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' });
  flow.append(svgElement('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: 'ga-arrow-fill' }));
  const dimension = svgElement('marker', { id: uniqueId('dim'), viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' });
  dimension.append(svgElement('path', { d: 'M 10 0 L 0 5 L 10 10', class: 'ga-dimension-fill' }));
  defs.append(flow, dimension); svg.append(defs);
  return { flow: flow.id, dimension: dimension.id };
}

function busY(bus, index, mode) {
  if (mode === 'PHYSICAL' && POSITION_Y[bus.physicalPosition] != null) return POSITION_Y[bus.physicalPosition];
  return 148 + index * 164;
}

const WIDTH_SUFFIX = { VERIFIED: '', USER_SELECTED: ' (user sel.)', PARTIALLY_VERIFIED: ' (partial)', PROVISIONAL: ' (prov.)' };
const WIDTH_ARIA = { VERIFIED: 'verified', USER_SELECTED: 'manufacturer-supported user selected', PARTIALLY_VERIFIED: 'partially verified', PROVISIONAL: 'provisional' };

function confidenceClass(value) {
  if (value === 'Manufacturer Verified') return 'is-verified';
  if (value === 'Manufacturer-Supported · User Selected' || value === 'Partially Verified') return 'is-supported';
  if (value === 'Invalid Manufacturer Configuration') return 'is-invalid';
  return 'is-schematic';
}

function drawBreaker(svg, breaker, section, x, width, busYValue, markerId) {
  const center = x + width / 2;
  const routeY = breaker.route === 'Top' ? 66 : 448;
  const towardBus = breaker.flow.direction === 'SOURCE_TO_BUS';
  const symbolY = breaker.route === 'Top' ? 205 : 300;
  const routeEdge = breaker.route === 'Top' ? symbolY - 22 : symbolY + 22;
  const busEdge = busYValue < symbolY ? symbolY - 22 : symbolY + 22;
  const routePath = towardBus ? `M ${center} ${routeY} L ${center} ${routeEdge}` : `M ${center} ${routeEdge} L ${center} ${routeY}`;
  const busPath = towardBus ? `M ${center} ${busEdge} L ${center} ${busYValue}` : `M ${center} ${busYValue} L ${center} ${busEdge}`;
  svg.append(svgElement('path', { d: routePath, class: 'ga-cable-route', 'marker-end': `url(#${markerId})` }));
  svg.append(svgElement('path', { d: busPath, class: 'ga-bus-connection', 'marker-end': `url(#${markerId})` }));
  svg.append(svgElement('rect', { x: center - 16, y: symbolY - 21, width: 32, height: 42, rx: 3, class: 'ga-breaker-symbol' }));
  svg.append(svgElement('line', { x1: center - 8, y1: symbolY + 10, x2: center + 8, y2: symbolY - 10, class: 'ga-breaker-switch' }));
  svg.append(svgElement('circle', { cx: center, cy: symbolY - 14, r: 2.5, class: 'ga-breaker-terminal' }));
  svg.append(svgElement('circle', { cx: center, cy: symbolY + 14, r: 2.5, class: 'ga-breaker-terminal' }));
  const labelX = Math.min(x + width - 7, center + 24);
  const anchor = labelX > center + 20 ? 'start' : 'end';
  multiline(svg, labelX, symbolY - 22, [breaker.displayLabel || breaker.displayNumber, breaker.functionLabel, breaker.frame, `${breaker.rating} · ${breaker.poles}`], 'ga-breaker-label', anchor, 11);
  text(svg, center, breaker.route === 'Top' ? 57 : 466, breaker.route.toUpperCase(), 'ga-route-label', 'middle');
  if (section.physicalArrangementConfidence === 'SCHEMATIC DEVICE POSITION') text(svg, center, 414, 'SCHEMATIC DEVICE POSITION', 'ga-schematic-note', 'middle');
}

function renderBoard(board, options) {
  const { mode, zoom, selected, onSelectSection, onSelectBus } = options;
  const card = document.createElement('article'); card.className = 'ga-engineering-board';
  const header = document.createElement('div'); header.className = 'ga-engineering-header';
  const widthParts = [
    board.containsProvisionalWidth ? board.provisionalPlanningWidthMm + ' mm Provisional Planning Width' : '',
    board.containsQualifiedWidth ? board.qualifiedPlanningWidthMm + ' mm Qualified Width (Partially Verified / User Selected)' : '',
  ].filter(Boolean);
  const widthText = `W ${board.combinedPlanningWidthMm} mm${widthParts.length ? ' · includes ' + widthParts.join(' · ') : ' · Verified Section Width'}`;
  header.innerHTML = `<div><span class="ga-board-tag">${escapeHtml(board.id)}</span><b>${escapeHtml(board.manufacturer + ' ' + board.system)}</b><small>Rated Main Bus ${escapeHtml(board.ratedMainBus)}</small></div><div class="ga-board-facts"><span>${escapeHtml(widthText)}</span><span>${escapeHtml(board.dimensions.label)}</span>${board.designStatus ? `<span>Design Status · ${escapeHtml(board.designStatus)}</span>` : ''}<span>Lowest Section Confidence · ${escapeHtml(board.confidence)}</span></div>`;
  card.append(header);
  if (!board.sections.length) { const empty = document.createElement('p'); empty.className = 'ga-empty'; empty.textContent = 'No breakers assigned.'; card.append(empty); return card; }
  const layout = computeBoardLayout(board);
  const lineupWidth = layout.lineupWidth;
  const baseWidth = GA_SIDE_PX + lineupWidth + 30, baseHeight = 505;
  const scroll = document.createElement('div'); scroll.className = 'ga-scroll';
  const svg = svgElement('svg', { class: 'ga-engineering-svg', viewBox: `0 0 ${baseWidth} ${baseHeight}`, width: baseWidth * zoom / 100, height: baseHeight * zoom / 100, role: 'img', 'aria-label': `${board.id} ${mode.toLowerCase()} automatic GA and power flow` });
  const markers = addDefinitions(svg);
  svg.append(svgElement('rect', { x: GA_SIDE_PX, y: 76, width: lineupWidth, height: 354, class: 'ga-lineup-outline' }));
  const layoutByKey = new Map(layout.sections.map(item => [item.key, item]));
  board.sections.forEach(section => {
    const { x, width } = layoutByKey.get(section.key), bus = board.buses.find(item => item.id === section.busId), y = busY(bus, board.buses.indexOf(bus), mode);
    const group = svgElement('g', { class: `ga-cubicle ${confidenceClass(section.confidence)}${selected?.type === 'section' && selected.key === section.key ? ' is-selected' : ''}`, tabindex: 0, role: 'button', 'aria-label': `${section.id} ${section.widthMm} millimetres ${WIDTH_ARIA[section.widthStatus] || 'provisional'}` });
    group.append(svgElement('rect', { x, y: 76, width, height: 354, class: 'ga-cubicle-body' }));
    group.append(svgElement('line', { x1: x, y1: 101, x2: x + width, y2: 101, class: 'ga-cubicle-header-line' }));
    text(group, x + width / 2, 94, section.id, 'ga-section-title', 'middle');
    section.breakers.forEach((breaker, index) => drawBreaker(group, breaker, section, x + index * width / section.breakers.length, width / section.breakers.length, y, markers.flow));
    const dimY = 444;
    group.append(svgElement('line', { x1: x + 6, y1: dimY, x2: x + width - 6, y2: dimY, class: 'ga-dimension-line', 'marker-start': `url(#${markers.dimension})`, 'marker-end': `url(#${markers.dimension})` }));
    text(group, x + width / 2, dimY - 5, `${section.widthMm} mm${WIDTH_SUFFIX[section.widthStatus] ?? ' (prov.)'}`, 'ga-dimension-text', 'middle');
    group.dataset.sectionKey = section.key;
    group.dataset.widthPx = String(width);
    group.addEventListener('click', () => onSelectSection(section)); group.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') onSelectSection(section); }); svg.append(group);
  });
  board.buses.forEach((bus, busIndex) => {
    const y = busY(bus, busIndex, mode);
    const isRear = mode === 'PHYSICAL' && bus.physicalPosition.startsWith('Rear');
    const supportedPhysical = mode === 'PHYSICAL' && ['Manufacturer Verified', 'Manufacturer-Supported · User Selected'].includes(bus.confidence) && POSITION_Y[bus.physicalPosition] != null;
    const busSegments = layout.segments.filter(segment => segment.busId === bus.id);
    busSegments.forEach(segment => {
      const x1 = segment.x1 + 4, x2 = segment.x2 - 4;
      if (isRear) {
        svg.append(svgElement('rect', { x: x1, y: y - 15, width: x2 - x1, height: 30, class: 'ga-rear-plane' }));
        text(svg, x1 + 6, y - 20, `REAR BUSBAR · ${bus.physicalPosition} · PROJECTED / NOT EXACT ELEVATION`, 'ga-rear-label');
      }
      const line = svgElement('line', { x1, y1: y, x2, y2: y, class: `ga-physical-bus ${confidenceClass(bus.confidence)}${isRear ? ' is-rear' : ''}`, 'data-bus-id': bus.id });
      const hit = svgElement('rect', { x: x1, y: y - 10, width: x2 - x1, height: 20, class: 'ga-bus-hit', tabindex: 0, role: 'button', 'aria-label': `${bus.id} ${bus.role} segment ${segment.segmentNumber} of ${segment.segmentCount}` });
      if (selected?.type === 'bus' && selected.key === bus.key) line.classList.add('is-selected');
      const chooseBus = () => onSelectBus(bus, board); line.addEventListener('click', chooseBus); hit.addEventListener('click', chooseBus); hit.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') chooseBus(); });
      svg.append(line, hit);
      if (segment.segmentCount > 1) text(svg, x1 + 6, y + 14, `${bus.id} segment ${segment.segmentNumber}/${segment.segmentCount} (same electrical bus)`, 'ga-bus-warning');
      if (!supportedPhysical) text(svg, x1 + 6, y - 8, mode === 'PHYSICAL' ? 'PHYSICAL POSITION NOT CONFIRMED / SCHEMATIC' : 'SCHEMATIC ELECTRICAL BUS', 'ga-bus-warning');
    });
    if (busSegments.length) multiline(svg, 10, y - 30, [bus.id, bus.role, String(bus.rating), `Position: ${bus.physicalPosition}`, bus.confidence], 'ga-bus-data', 'start', 12);
  });
  svg.append(svgElement('line', { x1: GA_SIDE_PX + 6, y1: 486, x2: GA_SIDE_PX + lineupWidth - 6, y2: 486, class: 'ga-total-dimension', 'marker-start': `url(#${markers.dimension})`, 'marker-end': `url(#${markers.dimension})` }));
  text(svg, GA_SIDE_PX + lineupWidth / 2, 478, `COMBINED PLANNING WIDTH ${board.combinedPlanningWidthMm} mm${board.containsProvisionalWidth ? ' · CONTAINS PROVISIONAL' : ''}${board.containsQualifiedWidth ? ' · CONTAINS QUALIFIED' : ''}`, 'ga-total-text', 'middle');
  scroll.append(svg); card.append(scroll); return card;
}

export function renderProfessionalGa(host, model, options) {
  host.replaceChildren();
  model.boards.forEach(board => host.append(renderBoard(board, options)));
}
