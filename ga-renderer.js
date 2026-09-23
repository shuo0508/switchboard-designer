const NS = 'http://www.w3.org/2000/svg';
const POSITION_Y = { Top: 112, 'Rear Top': 142, Center: 250, 'Rear Bottom': 356, Bottom: 388 };

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

function addDefinitions(svg) {
  const defs = svgElement('defs');
  const flow = svgElement('marker', { id: `flow-${crypto.randomUUID()}`, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' });
  flow.append(svgElement('path', { d: 'M 0 0 L 10 5 L 0 10 z', class: 'ga-arrow-fill' }));
  const dimension = svgElement('marker', { id: `dim-${crypto.randomUUID()}`, viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' });
  dimension.append(svgElement('path', { d: 'M 10 0 L 0 5 L 10 10', class: 'ga-dimension-fill' }));
  defs.append(flow, dimension); svg.append(defs);
  return { flow: flow.id, dimension: dimension.id };
}

function busY(bus, index, mode) {
  if (mode === 'PHYSICAL' && POSITION_Y[bus.physicalPosition] != null) return POSITION_Y[bus.physicalPosition];
  return 148 + index * 164;
}

function confidenceClass(value) {
  if (value === 'Manufacturer Verified') return 'is-verified';
  if (value === 'Manufacturer-Supported · User Selected') return 'is-supported';
  if (value === 'Invalid Manufacturer Configuration') return 'is-invalid';
  return 'is-schematic';
}

function drawBreaker(svg, breaker, section, x, y, width, busYValue, markerId, preferLeft = false) {
  const center = x + width / 2;
  const routeY = breaker.route === 'Top' ? 66 : 448;
  const towardBus = breaker.flow.direction === 'SOURCE_TO_BUS';
  const symbolY = Math.max(182, Math.min(318, breaker.route === 'Top' ? 205 : 300));
  const routeEdge = breaker.route === 'Top' ? symbolY - 22 : symbolY + 22;
  const busEdge = busYValue < symbolY ? symbolY - 22 : symbolY + 22;
  const routePath = towardBus ? `M ${center} ${routeY} L ${center} ${routeEdge}` : `M ${center} ${routeEdge} L ${center} ${routeY}`;
  const busPath = towardBus ? `M ${center} ${busEdge} L ${center} ${busYValue}` : `M ${center} ${busYValue} L ${center} ${busEdge}`;
  const cable = svgElement('path', { d: routePath, class: 'ga-cable-route', 'marker-end': `url(#${markerId})` });
  const busConnection = svgElement('path', { d: busPath, class: 'ga-bus-connection', 'marker-end': `url(#${markerId})` });
  svg.append(cable, busConnection);
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
  header.innerHTML = `<div><span class="ga-board-tag">${board.id}</span><b>${board.manufacturer} ${board.system}</b><small>Rated Main Bus ${board.ratedMainBus}</small></div><div class="ga-board-facts"><span>W ${board.totalWidthMm} mm</span><span>H/D ${board.dimensions.heightMm} × ${board.dimensions.depthMm} mm · ${board.dimensions.confidence}</span><span>GA Confidence · ${board.confidence}</span></div>`;
  card.append(header);
  if (!board.sections.length) { const empty = document.createElement('p'); empty.className = 'ga-empty'; empty.textContent = 'No breakers assigned.'; card.append(empty); return card; }
  const pxPerMm = 0.18;
  const side = 176, lineupWidth = board.sections.reduce((sum, section) => sum + Math.max(108, section.widthMm * pxPerMm), 0);
  const baseWidth = side + lineupWidth + 30, baseHeight = 505;
  const scroll = document.createElement('div'); scroll.className = 'ga-scroll';
  const svg = svgElement('svg', { class: 'ga-engineering-svg', viewBox: `0 0 ${baseWidth} ${baseHeight}`, width: baseWidth * zoom / 100, height: baseHeight * zoom / 100, role: 'img', 'aria-label': `${board.id} ${mode.toLowerCase()} automatic GA and power flow` });
  const markers = addDefinitions(svg);
  svg.append(svgElement('rect', { x: side, y: 76, width: lineupWidth, height: 354, class: 'ga-lineup-outline' }));
  const xBySection = new Map(); let cursor = side;
  board.sections.forEach(section => { const width = Math.max(108, section.widthMm * pxPerMm); xBySection.set(section.key, { x: cursor, width }); cursor += width; });
  board.buses.forEach((bus, index) => {
    const assigned = board.sections.filter(section => section.busId === bus.id);
    if (!assigned.length) return;
    const first = xBySection.get(assigned[0].key), last = xBySection.get(assigned.at(-1).key);
    const y = busY(bus, index, mode);
    const isRear = mode === 'PHYSICAL' && bus.physicalPosition.startsWith('Rear');
    const supportedPhysical = mode === 'PHYSICAL' && ['Manufacturer Verified', 'Manufacturer-Supported · User Selected'].includes(bus.confidence) && POSITION_Y[bus.physicalPosition] != null;
    if (isRear) {
      svg.append(svgElement('rect', { x: first.x + 4, y: y - 15, width: last.x + last.width - first.x - 8, height: 30, class: 'ga-rear-plane' }));
      text(svg, first.x + 10, y - 20, `REAR BUSBAR · ${bus.physicalPosition} · PROJECTED / NOT EXACT ELEVATION`, 'ga-rear-label');
    }
    const line = svgElement('line', { x1: first.x + 4, y1: y, x2: last.x + last.width - 4, y2: y, class: `ga-physical-bus ${confidenceClass(bus.confidence)}${isRear ? ' is-rear' : ''}` });
    const hit = svgElement('rect', { x: first.x + 4, y: y - 10, width: last.x + last.width - first.x - 8, height: 20, class: 'ga-bus-hit', tabindex: 0, role: 'button', 'aria-label': `${bus.id} ${bus.role}` });
    if (selected?.type === 'bus' && selected.key === bus.key) line.classList.add('is-selected');
    const chooseBus = () => onSelectBus(bus, board); line.addEventListener('click', chooseBus); hit.addEventListener('click', chooseBus); hit.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') chooseBus(); }); svg.append(line, hit);
    multiline(svg, 10, y - 30, [bus.id, bus.role, String(bus.rating), `Position: ${bus.physicalPosition}`, bus.confidence], 'ga-bus-data', 'start', 12);
    if (!supportedPhysical) text(svg, first.x + 8, y - 8, mode === 'PHYSICAL' ? 'PHYSICAL POSITION NOT CONFIRMED / SCHEMATIC' : 'SCHEMATIC ELECTRICAL BUS', 'ga-bus-warning');
  });
  board.sections.forEach(section => {
    const { x, width } = xBySection.get(section.key), bus = board.buses.find(item => item.id === section.busId), y = busY(bus, board.buses.indexOf(bus), mode);
    const sectionClass = confidenceClass(section.confidence);
    const group = svgElement('g', { class: `ga-cubicle ${sectionClass}${selected?.type === 'section' && selected.key === section.key ? ' is-selected' : ''}`, tabindex: 0, role: 'button', 'aria-label': `${section.id} ${section.widthMm} millimetres` });
    group.append(svgElement('rect', { x, y: 76, width, height: 354, class: 'ga-cubicle-body' }));
    group.append(svgElement('line', { x1: x, y1: 101, x2: x + width, y2: 101, class: 'ga-cubicle-header-line' }));
    text(group, x + width / 2, 94, section.id, 'ga-section-title', 'middle');
    section.breakers.forEach((breaker, index) => drawBreaker(group, breaker, section, x + index * width / section.breakers.length, y, width / section.breakers.length, y, markers.flow, board.sections.at(-1)?.key === section.key));
    const dimY = 444;
    group.append(svgElement('line', { x1: x + 6, y1: dimY, x2: x + width - 6, y2: dimY, class: 'ga-dimension-line', 'marker-start': `url(#${markers.dimension})`, 'marker-end': `url(#${markers.dimension})` }));
    text(group, x + width / 2, dimY - 5, `${section.widthMm} mm`, 'ga-dimension-text', 'middle');
    group.addEventListener('click', () => onSelectSection(section)); group.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') onSelectSection(section); }); svg.append(group);
  });
  svg.querySelectorAll('.ga-physical-bus, .ga-bus-hit').forEach(element => svg.append(element));
  svg.append(svgElement('line', { x1: side + 6, y1: 486, x2: side + lineupWidth - 6, y2: 486, class: 'ga-total-dimension', 'marker-start': `url(#${markers.dimension})`, 'marker-end': `url(#${markers.dimension})` }));
  text(svg, side + lineupWidth / 2, 478, `TOTAL ${board.totalWidthMm} mm`, 'ga-total-text', 'middle');
  scroll.append(svg); card.append(scroll); return card;
}

export function renderProfessionalGa(host, model, options) {
  host.innerHTML = '';
  model.boards.forEach(board => host.append(renderBoard(board, options)));
}
