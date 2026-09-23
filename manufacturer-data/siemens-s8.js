// Siemens SIVACON S8 manufacturer source data (Phase 2A extraction).
// Source: Totally Integrated Power – SIVACON S8 Technical Planning Information.
// Printed page = PDF page − 4. Each table below is transcribed independently; no table is
// derived from another even where rows are numerically identical.

export const SIEMENS_DOCUMENT = {
  manufacturer: 'Siemens',
  system: 'SIVACON S8',
  document: 'TIP Planning manual SIVACON S8 (Totally Integrated Power – SIVACON S8 Technical Planning Information)',
  revision: 'Publication date 01/2025 · Status 01/2025 V3-korr',
  fileName: 'TIP_Planning_manual_SIVACON_S8_2025-02_EN.pdf',
};

export const SIEMENS_BUSBAR_POSITIONS = ['Top', 'Rear Top', 'Rear Bottom'];
export const SIEMENS_FRAME_HEIGHTS_MM = [2000, 2200]; // Tab. 2/1, Tab. 2/6
export const SIEMENS_BREAKING_CAPACITY_CLASSES = ['S', 'M', 'H', 'C']; // classes named in Tab. 3/9 fn 1) and Tab. 3/3 fn 4)

// Row helper: cable / busbar widths per pole exactly as printed; [] = "-" in the source.
const row = (ratedCurrentA, cable3P, cable4P, busbar3P, busbar4P, footnotes = [], cellFootnotes = {}) => ({
  ratedCurrentA,
  cable: { '3P': cable3P, '4P': cable4P },
  busbar: { '3P': busbar3P, '4P': busbar4P },
  footnotes,
  cellFootnotes,
});

const FOOTNOTE_WITHDRAWABLE_2200 = { text: 'Withdrawable unit version, frame height 2,200 mm', mountingDesign: 'Withdrawable Unit', frameHeightMm: 2200 };

export const SIEMENS_3WA_TABLES = {
  TABLE_3_2_TOP: {
    id: 'TABLE_3_2_TOP', label: 'Table 3/2', ruleId: 'SIEMENS_S8_3WA_TABLE_3_2', pdfPage: '29', printedPage: '25',
    title: 'Feldabmessungen für Sammelschienenlage oben (cubicle dimensions, busbar position at the top)',
    cubicleFunction: 'Incoming feeder / outgoing feeder', busbarPosition: 'Top', busbarSystems: 1, cableEntry: ['Top', 'Bottom'],
    note: 'The position of the connection busbars is identical for cable entry from the top or bottom',
    footnotes: { 1: FOOTNOTE_WITHDRAWABLE_2200, 2: { text: 'Main busbar up to 6,300 A', mainBusbarMaxA: 6300 } },
    rows: {
      '3WA1106': row(630, [400, 600], [600], [], []),
      '3WA1108': row(800, [400, 600], [600], [], []),
      '3WA1110': row(1000, [400, 600], [600], [], []),
      '3WA1112': row(1250, [400, 600], [600], [], []),
      '3WA1116': row(1600, [400, 600], [600], [400, 600], [600]),
      '3WA1120': row(2000, [400, 600], [600], [400, 600], [600]),
      '3WA1220': row(2000, [600, 800], [800], [600, 800], [800]),
      '3WA1225': row(2500, [600, 800], [800], [600, 800], [800]),
      '3WA1232': row(3200, [600, 800], [800], [600, 800], [800]),
      '3WA1340': row(4000, [800], [1000], [800], [1000], [2]),
      '3WA1350': row(5000, [], [], [1000], [1000], [1, 2]),
      '3WA1363': row(6300, [], [], [1000], [1000], [1, 2]),
    },
  },
  TABLE_3_3_G1: {
    id: 'TABLE_3_3_G1', label: 'Table 3/3 G1', ruleId: 'SIEMENS_S8_3WA_TABLE_3_3_G1', pdfPage: '30', printedPage: '26',
    title: 'Cubicle dimensions for busbar position at the rear — 1 busbar system: rear-top + entry from bottom, or rear-bottom + entry from top',
    cubicleFunction: 'Incoming feeder / outgoing feeder', busbarSystems: 1, relation: 'OPPOSITE',
    footnotes: { 1: FOOTNOTE_WITHDRAWABLE_2200, 2: { text: 'Main busbar up to 7,010 A', mainBusbarMaxA: 7010 } },
    rows: {
      '3WA1106': row(630, [400, 600], [600], [], []),
      '3WA1108': row(800, [400, 600], [600], [], []),
      '3WA1110': row(1000, [400, 600], [600], [], []),
      '3WA1112': row(1250, [400, 600], [600], [], []),
      '3WA1116': row(1600, [400, 600], [600], [400, 600], [600]),
      '3WA1120': row(2000, [400, 600], [600], [400, 600], [600]),
      '3WA1220': row(2000, [600, 800], [800], [600, 800], [800]),
      '3WA1225': row(2500, [600, 800], [800], [600, 800], [800]),
      '3WA1232': row(3200, [600, 800], [800], [600, 800], [800]),
      '3WA1240': row(4000, [600, 800], [800], [600, 800], [800], [1]),
      '3WA1340': row(4000, [1000], [1000], [800, 1000], [1000], [], { 'busbar:3P:800': [1] }),
      '3WA1350': row(5000, [], [], [1000], [1000], [1, 2]),
      '3WA1363': row(6300, [], [], [1000], [1000], [1, 2]),
    },
  },
  TABLE_3_3_G2: {
    id: 'TABLE_3_3_G2', label: 'Table 3/3 G2', ruleId: 'SIEMENS_S8_3WA_TABLE_3_3_G2', pdfPage: '30', printedPage: '26',
    title: 'Cubicle dimensions for busbar position at the rear — 1 busbar system: rear-bottom + entry from bottom, or rear-top + entry from top',
    cubicleFunction: 'Incoming feeder / outgoing feeder', busbarSystems: 1, relation: 'SAME',
    footnotes: {
      1: FOOTNOTE_WITHDRAWABLE_2200,
      3: { text: 'Frame height 2,200 mm', frameHeightMm: 2200 },
      4: { text: 'Main busbar up to 7,010A rear-bottom, cable connection bottom, 3WA1350 H, C (max. 100kA), double front 1,200mm deep', mainBusbarMaxA: 7010, busbarPosition: 'Rear Bottom', cableEntry: 'Bottom', connectionType: 'Cable', breakingCapacityClasses: ['H', 'C'], maxShortCircuitKa: 100, frontLayout: 'Double Front', depthMm: 1200 },
    },
    rows: {
      '3WA1106': row(630, [400, 600], [600], [], []),
      '3WA1108': row(800, [400, 600], [600], [], []),
      '3WA1110': row(1000, [400, 600], [600], [], []),
      '3WA1112': row(1250, [400, 600], [600], [], []),
      '3WA1116': row(1600, [400, 600], [600], [400, 600], [600]),
      '3WA1120': row(2000, [400, 600], [600], [400, 600], [600]),
      '3WA1220': row(2000, [600, 800], [800], [600, 800], [800]),
      '3WA1225': row(2500, [600, 800], [800], [600, 800], [800]),
      '3WA1232': row(3200, [600, 800], [800], [600, 800], [800]),
      '3WA1340': row(4000, [], [], [800, 1000], [1000], [], { 'busbar:3P:800': [3] }),
      '3WA1350': row(5000, [1000], [1000], [], [], [1, 4]),
    },
  },
  TABLE_3_4_G1: {
    id: 'TABLE_3_4_G1', label: 'Table 3/4 G1', ruleId: 'SIEMENS_S8_3WA_TABLE_3_4_G1', pdfPage: '31', printedPage: '27',
    title: 'Cubicle dimensions for busbar position at the rear with two busbar systems — rear-top + entry from bottom, or rear-bottom + entry from top',
    cubicleFunction: 'Incoming feeder / outgoing feeder', busbarSystems: 2, relation: 'OPPOSITE',
    footnotes: { 1: { text: 'Frame height 2,200 mm', frameHeightMm: 2200 } },
    rows: {
      '3WA1106': row(630, [400, 600], [600], [], []),
      '3WA1108': row(800, [400, 600], [600], [], []),
      '3WA1110': row(1000, [400, 600], [600], [], []),
      '3WA1112': row(1250, [400, 600], [600], [], []),
      '3WA1116': row(1600, [400, 600], [600], [400, 600], [600]),
      '3WA1120': row(2000, [400, 600], [600], [400, 600], [600]),
      '3WA1220': row(2000, [600, 800], [800], [600, 800], [800]),
      '3WA1225': row(2500, [600, 800], [800], [600, 800], [800]),
      '3WA1232': row(3200, [600, 800], [800], [600, 800], [800]),
      '3WA1340': row(4000, [1000], [1000], [800, 1000], [1000], [], { 'busbar:3P:800': [1] }),
    },
  },
  TABLE_3_4_G2: {
    id: 'TABLE_3_4_G2', label: 'Table 3/4 G2', ruleId: 'SIEMENS_S8_3WA_TABLE_3_4_G2', pdfPage: '31', printedPage: '27',
    title: 'Cubicle dimensions for busbar position at the rear with two busbar systems — rear-bottom + entry from bottom, or rear-top + entry from top',
    cubicleFunction: 'Incoming feeder / outgoing feeder', busbarSystems: 2, relation: 'SAME',
    footnotes: { 1: { text: 'Frame height 2,200 mm', frameHeightMm: 2200 } },
    rows: {
      '3WA1106': row(630, [400, 600], [600], [], []),
      '3WA1108': row(800, [400, 600], [600], [], []),
      '3WA1110': row(1000, [400, 600], [600], [], []),
      '3WA1112': row(1250, [400, 600], [600], [], []),
      '3WA1116': row(1600, [400, 600], [600], [400, 600], [600]),
      '3WA1120': row(2000, [400, 600], [600], [400, 600], [600]),
      '3WA1220': row(2000, [600, 800], [800], [600, 800], [800]),
      '3WA1225': row(2500, [600, 800], [800], [600, 800], [800]),
      '3WA1232': row(3200, [600, 800], [800], [600, 800], [800]),
      '3WA1340': row(4000, [], [], [800, 1000], [1000], [], { 'busbar:3P:800': [1] }),
    },
  },
};

// Coupler cubicles (source data for future topology support; not exposed as a Function).
const coupler = (ratedCurrentA, pole3P, pole4P, footnotes = [], cellFootnotes = {}) => ({ ratedCurrentA, widths: { '3P': pole3P, '4P': pole4P }, footnotes, cellFootnotes });
export const SIEMENS_3WA_COUPLER_TABLES = {
  TABLE_3_2_LONGITUDINAL: {
    id: 'TABLE_3_2_LONGITUDINAL', label: 'Table 3/2 Longitudinal coupler', ruleId: 'SIEMENS_S8_3WA_COUPLER_TABLE_3_2', pdfPage: '29', printedPage: '25', busbarPosition: 'Top', busbarSystems: 1,
    footnotes: { 1: FOOTNOTE_WITHDRAWABLE_2200, 2: { text: 'Main busbar up to 6,300 A', mainBusbarMaxA: 6300 } },
    rows: {
      '3WA1106': coupler(630, [600], [800]), '3WA1108': coupler(800, [600], [800]), '3WA1110': coupler(1000, [600], [800]),
      '3WA1112': coupler(1250, [600], [800]), '3WA1116': coupler(1600, [600], [800]), '3WA1120': coupler(2000, [600], [800]),
      '3WA1220': coupler(2000, [800], [1000]), '3WA1225': coupler(2500, [800], [1000]), '3WA1232': coupler(3200, [800], [1000]),
      '3WA1340': coupler(4000, [1000], [1200], [2]), '3WA1350': coupler(5000, [1200], [1200], [1, 2]), '3WA1363': coupler(6300, [1200], [1200], [1, 2]),
    },
  },
  TABLE_3_3_LONGITUDINAL: {
    id: 'TABLE_3_3_LONGITUDINAL', label: 'Table 3/3 Longitudinal coupler', ruleId: 'SIEMENS_S8_3WA_COUPLER_TABLE_3_3', pdfPage: '30', printedPage: '26', busbarPosition: 'Rear Top or Rear Bottom', busbarSystems: 1,
    footnotes: { 1: FOOTNOTE_WITHDRAWABLE_2200, 2: { text: 'Main busbar up to 7,010 A', mainBusbarMaxA: 7010 }, 5: { text: '3WL1232 C (as printed; not interpreted)', sourceStatus: 'SOURCE_AMBIGUOUS' } },
    rows: {
      '3WA1106': coupler(630, [600], [600]), '3WA1108': coupler(800, [600], [600]), '3WA1110': coupler(1000, [600], [600]),
      '3WA1112': coupler(1250, [600], [600]), '3WA1116': coupler(1600, [600], [600]), '3WA1120': coupler(2000, [600], [600]),
      '3WA1220': coupler(2000, [800], [800]), '3WA1225': coupler(2500, [800], [800]),
      '3WA1232': coupler(3200, [800, 1000], [800, 1200], [], { '3P': [5], '4P': [5] }),
      '3WA1340': coupler(4000, [1000], [1000]), '3WA1350': coupler(5000, [1400], [1400], [1, 2]), '3WA1363': coupler(6300, [1400], [1400], [1, 2]),
    },
  },
  TABLE_3_4_LONGITUDINAL: {
    id: 'TABLE_3_4_LONGITUDINAL', label: 'Table 3/4 Longitudinal coupler', ruleId: 'SIEMENS_S8_3WA_COUPLER_TABLE_3_4', pdfPage: '31', printedPage: '27', busbarPosition: 'Rear Top or Rear Bottom', busbarSystems: 2,
    footnotes: { 1: { text: 'Frame height 2,200 mm', frameHeightMm: 2200 } },
    rows: {
      '3WA1106': coupler(630, [600], [600]), '3WA1108': coupler(800, [600], [600]), '3WA1110': coupler(1000, [600], [600]),
      '3WA1112': coupler(1250, [600], [600]), '3WA1116': coupler(1600, [600], [600]), '3WA1120': coupler(2000, [600], [600]),
      '3WA1220': coupler(2000, [800], [800]), '3WA1225': coupler(2500, [800], [800]), '3WA1232': coupler(3200, [800], [800]),
      '3WA1340': coupler(4000, [1000], [1000]),
    },
  },
  TABLE_3_4_TRANSVERSAL: {
    id: 'TABLE_3_4_TRANSVERSAL', label: 'Table 3/4 Transversal coupler', ruleId: 'SIEMENS_S8_3WA_COUPLER_TABLE_3_4', pdfPage: '31', printedPage: '27', busbarPosition: 'Rear Top and Rear Bottom', busbarSystems: 2,
    footnotes: { 1: { text: 'Frame height 2,200 mm', frameHeightMm: 2200 } },
    rows: {
      '3WA1106': coupler(630, [400, 600], [600]), '3WA1108': coupler(800, [400, 600], [600]), '3WA1110': coupler(1000, [400, 600], [600]),
      '3WA1112': coupler(1250, [400, 600], [600]), '3WA1116': coupler(1600, [400, 600], [600]), '3WA1120': coupler(2000, [400, 600], [600]),
      '3WA1220': coupler(2000, [600, 800], [800]), '3WA1225': coupler(2500, [600, 800], [800]), '3WA1232': coupler(3200, [600, 800], [800]),
      '3WA1240': coupler(4000, [600, 800], [800], [1]), '3WA1340': coupler(4000, [1000], [1000]),
    },
  },
};

// §3.4 "Cubicles with One MCCB (3VA)", Tab. 3/16 (pdf 41 / printed 37) and Tab. 3/1 (pdf 28 / printed 24).
export const SIEMENS_3VA_CUBICLE = {
  ruleId: 'SIEMENS_S8_3VA_SINGLE_MCCB_CUBICLE',
  statement: 'The cubicle width of the different cubicle types (Tab. 3/16) with an MCCB (3VA) is generally 400 mm for 3- and 4-pole circuit-breakers.',
  widthMm: 400,
  widthQualifier: 'generally',
  poles: ['3P', '4P'],
  supportedMountingDesign: 'Fixed-mounted', // Tab. 3/1: MCCB in fixed-mounted design; plug-in / withdrawable on request
  cubicleTypes: [
    { busbarPosition: 'Top', cableEntry: ['Top', 'Bottom'], note: 'Position of the connection busbars identical for cable entry from the top or bottom' },
    { busbarPosition: 'Rear Top', cableEntry: ['Top', 'Bottom'], note: 'Two main busbar systems in the cubicle are also possible' },
    { busbarPosition: 'Rear Bottom', cableEntry: ['Top', 'Bottom'], note: 'Two main busbar systems in the cubicle are also possible' },
  ],
  transversalCoupler: { busbarPositions: ['Rear Top', 'Rear Bottom'] },
  cableCapacity: 'Up to 4 cables per phase can be connected to 3VA circuit-breakers up to 1,000 A with cable lugs (240 mm², M12) according to DIN 46235',
};

// Tab. 3/17 rated operational currents at 35 °C (A). Cell pairs are printed as "3VA1 / 3VA2".
// Top busbar: only "cable connection from the bottom" is listed.
const opc = (ratedCurrentA, topBottom, rearBottom, rearTop) => ({ ratedCurrentA, top: { Bottom: topBottom }, rear: { Bottom: rearBottom, Top: rearTop } });
export const SIEMENS_3VA_TABLE_3_17 = {
  ruleId: 'SIEMENS_S8_TABLE_3_17',
  rows: {
    '3VA1563': opc(630, { nonVentilated: 630, ventilated: 630 }, { nonVentilated: 625, ventilated: 630 }, { nonVentilated: 630, ventilated: 630 }),
    '3VA2563': opc(630, { nonVentilated: 605, ventilated: 630 }, { nonVentilated: 630, ventilated: 630 }, { nonVentilated: 630, ventilated: 630 }),
    '3VA1580': opc(800, { nonVentilated: 660, ventilated: 735 }, { nonVentilated: 690, ventilated: 775 }, { nonVentilated: 730, ventilated: 775 }),
    '3VA2580': opc(800, { nonVentilated: 660, ventilated: 730 }, { nonVentilated: 685, ventilated: 775 }, { nonVentilated: 695, ventilated: 765 }),
    '3VA1510': opc(1000, { nonVentilated: 815, ventilated: 900 }, { nonVentilated: 800, ventilated: 905 }, { nonVentilated: 780, ventilated: 830 }),
    '3VA2510': opc(1000, { nonVentilated: 770, ventilated: 905 }, { nonVentilated: 840, ventilated: 955 }, { nonVentilated: 770, ventilated: 895 }),
  },
};

// Tab. 3/6 (pdf 33 / printed 29) — INFORMATIONAL dataset. Cells are kept exactly as printed
// (including values such as "3,420 A/3,20 A 1)"); nothing is corrected or interpreted.
export const SIEMENS_TABLE_3_6 = {
  ruleId: 'SIEMENS_S8_TABLE_3_6',
  usage: 'Informational only — not used for breaker selection or validation',
  footnotes: { 1: 'IP4x/IP3x', 2: 'Main busbar up to 7,010A rear-bottom, cable connection bottom, 3WA1350 H, C (max. 100kA), double front 1,200mm deep', 3: 'Minimum depth 800 mm', 4: '3WA1225 C' },
  feederColumns: ['topCableBottom.nonVentilated', 'topCableBottom.ventilated', 'rearCableBottom.nonVentilated', 'rearCableBottom.ventilated', 'rearCableTop.nonVentilated', 'rearCableTop.ventilated'],
  feeders: [
    ['3WA1106', '630 A', ['630 A', '630 A', '630 A', '630 A', '630 A', '630 A']],
    ['3WA1108', '800 A', ['800 A', '800 A', '800 A', '800 A', '800 A', '800 A']],
    ['3WA1110', '1,000 A', ['930 A', '1,000 A', '1,000 A', '1,000 A', '1,000 A', '1,000 A']],
    ['3WA1112', '1,250 A', ['1,160 A', '1,250 A', '1,170 A', '1,250 A', '1,020 A', '1,190 A /1,250 A 1)']],
    ['3WA1116', '1,600 A', ['1,200 A', '1,500 A', '1,410 A', '1,600 A', '1,200 A', '1,360 A /1,600 A 1)']],
    ['3WA1120', '2,000 A', ['1,550 A', '1,780 A', '1,500 A', '1,840 A', '1,480 A', '1,710 A']],
    ['3WA1220', '2,000 A', ['1,630 A', '2,000 A', '1,630 A', '1,920 A', '1,880 A', '2,000 A']],
    ['3WA1225', '2,500 A', ['1,960 A', '2,360 A', '1,950 A', '2,320 A', '1,830 A', '2,380 A /2,500 A 1)']],
    ['3WA1232', '3,200 A', ['2,240 A', '2,680 A/2,950 A 3)', '2,470 A', '2,920 A', '1,990 A', '2,480 A']],
    ['3WA1240', '4.000 A', ['-', '-', '2,500 A', '3,420 A/3,20 A 1)', '2,240 A', '3,330 A/2,840 A 1)']],
    ['3WA1340', '4.000 A', ['2,600 A', '3,660 A', '2,700 A', '3,700 A', '2,430 A', '3,040 A/3,250 A 1)']],
    ['3WA1350', '5.000 A', ['-', '-', '3,120 A', '4,400 A/4,840 A 1)', '2,240 A', '4,400 A/4,840 A 1)']],
    ['3WA1350 2)', '5.000 A', ['-', '-', '3,180 A', '4,840 A', '-', '-']],
  ],
  couplerColumns: ['topLongitudinal.nonVentilated', 'topLongitudinal.ventilated', 'rearLongitudinal.nonVentilated', 'rearLongitudinal.ventilated', 'rearTransversal.nonVentilated', 'rearTransversal.ventilated'],
  couplers: [
    ['3WA1106', '630 A', ['630 A', '630 A', '630 A', '630 A', '630 A', '630 A']],
    ['3WA1108', '800 A', ['800 A', '800 A', '800 A', '800 A', '800 A', '800 A']],
    ['3WA1110', '1,000 A', ['1,000 A', '1,000 A', '1,000 A', '1,000 A', '1,000 A', '1,000 A']],
    ['3WA1112', '1,250 A', ['1,160 A', '1,250 A', '1,140 A', '1,250 A', '1,170 A', '1,250 A']],
    ['3WA1116', '1,600 A', ['1,390 A', '1,600 A', '1,360 A', '1,600 A', '1,410 A', '1,600 A']],
    ['3WA1120', '2,000 A', ['1,500 A', '1,850 A', '1,630 A', '1,910 A', '1,500 A', '1,840 A']],
    ['3WA1220', '2,000 A', ['1,630 A', '1,930 A', '1,710 A', '2,000 A', '1,630 A', '1,920 A']],
    ['3WA1225', '2,500 A', ['1,960 A', '2,360 A', '1,930 A/2,130 A 4)', '2,440 A/2,500 A 4)', '1,950 A', '2,320 A']],
    ['3WA1232', '3,200 A', ['2,200 A', '2,700 A', '2,410 A', '2,700 A', '2,470 A', '2,920 A']],
    ['3WA1240', '4,000 A', ['-', '-', '2,280 A', '3,110 A/3,210 A 1)', '-', '-']],
    ['3WA1340', '4,000 A', ['2,840 A', '3,670 A', '2,650 A', '3,510 A', '2,700 A', '3,700 A']],
    ['3WA1350', '5,000 A', ['3,660 A', '4,720 A', '3,310 A', '4,460 A', '-', '-']],
    ['3WA1363', '6,300 A', ['3,920 A', '5,180 A', '3,300 A', '5,060 A', '-', '-']],
    ['3WA1140', '4.000 A', ['2,840 A', '3,670 A', '2,650 A', '3,510 A', '2,700 A', '3,700 A']],
    ['3WA1350', '5.000 A', ['3,660 A', '4,720 A', '3,310 A', '4,460 A', '-', '-']],
    ['3WA1363', '6.300 A', ['3,920 A', '5,180 A', '3,300 A', '5,060 A', '-', '-']],
  ],
  sourceNotes: ['Coupler rows "3WA1140", and repeated "3WA1350" / "3WA1363", are printed as shown; not corrected (SOURCE_AMBIGUOUS).'],
};
