// ABB MNS R manufacturer source data (Phase 2A extraction).
// Source: ABB MNS R Low Voltage Switchgear System Guide, 1TTB900011D0203, 2016-07.
// Printed page = PDF page for this document. Values are transcribed, not derived.

export const ABB_DOCUMENT = {
  manufacturer: 'ABB',
  system: 'MNS R',
  document: 'ABB MNS R Low Voltage Switchgear System Guide',
  revision: '1TTB900011D0203 (2016-07)',
  fileName: 'ABB MNS.pdf',
};

// ---------------------------------------------------------------------------
// Breaker product capability (ABB Components chapter). Not cubicle data.
// iuA: rated uninterrupted current values explicitly listed by the source.
// Trip-unit In values below Iu are NOT ESTABLISHED by the provided source.
// ---------------------------------------------------------------------------
export const ABB_BREAKER_CATALOG = {
  'E1.2': {
    family: 'Emax 2', type: 'ACB', poles: ['3P', '4P'], versions: ['Fixed', 'Withdrawable'], versionsStatus: 'SOURCE_EXPLICIT',
    iuByPerformanceLevel: { B: [630, 800, 1000, 1250, 1600], C: [630, 800, 1000, 1250, 1600], N: [250, 630, 800, 1000, 1250, 1600], L: [630, 800, 1000, 1250] },
    ruleId: 'ABB_EMAX2_E1_2_RATINGS',
  },
  'E2.2': {
    family: 'Emax 2', type: 'ACB', poles: ['3P', '4P'], versions: ['Fixed', 'Withdrawable'], versionsStatus: 'SOURCE_AMBIGUOUS',
    iuByPerformanceLevel: { B: [1600, 2000], N: [800, 1000, 1250, 1600, 2000, 2500], S: [250, 800, 1000, 1250, 1600, 2000, 2500], H: [800, 1000, 1250, 1600, 2000, 2500] },
    ruleId: 'ABB_EMAX2_E2_E4_E6_RATINGS',
  },
  'E4.2': {
    family: 'Emax 2', type: 'ACB', poles: ['3P', '4P'], versions: ['Fixed', 'Withdrawable'], versionsStatus: 'SOURCE_AMBIGUOUS',
    iuByPerformanceLevel: { N: [3200, 4000], S: [3200, 4000], H: [3200, 4000], V: [2000, 2500, 3200, 4000] },
    ruleId: 'ABB_EMAX2_E2_E4_E6_RATINGS',
  },
  'E6.2': {
    family: 'Emax 2', type: 'ACB', poles: ['3P', '4P'], versions: ['Fixed', 'Withdrawable'], versionsStatus: 'SOURCE_AMBIGUOUS',
    iuByPerformanceLevel: { H: [4000, 5000, 6300], V: [4000, 5000, 6300], X: [4000, 5000, 6300] },
    ruleId: 'ABB_EMAX2_E2_E4_E6_RATINGS',
  },
  XT1: { family: 'Tmax XT', type: 'MCCB', poles: ['3P', '4P'], iuA: [160], versions: ['Fixed', 'Plug-in'], notes: ['XT1 Plug-In In max = 125 A (footnote 2)'], ruleId: 'ABB_TMAX_XT_RATINGS' },
  XT2: { family: 'Tmax XT', type: 'MCCB', poles: ['3P', '4P'], iuA: [160], versions: ['Fixed', 'Withdrawable', 'Plug-in'], ruleId: 'ABB_TMAX_XT_RATINGS' },
  XT3: { family: 'Tmax XT', type: 'MCCB', poles: ['3P', '4P'], iuA: [250], versions: ['Fixed', 'Plug-in'], ruleId: 'ABB_TMAX_XT_RATINGS' },
  XT4: { family: 'Tmax XT', type: 'MCCB', poles: ['3P', '4P'], iuA: [160, 250], versions: ['Fixed', 'Withdrawable', 'Plug-in'], ruleId: 'ABB_TMAX_XT_RATINGS' },
  T4: { family: 'Tmax', type: 'MCCB', poles: ['3P', '4P'], iuA: [250, 320], versions: ['Fixed', 'Withdrawable', 'Plug-in'], ruleId: 'ABB_TMAX_T_RATINGS', exposedInApplication: false },
  T5: { family: 'Tmax', type: 'MCCB', poles: ['3P', '4P'], iuA: [400, 630], versions: ['Fixed', 'Withdrawable', 'Plug-in'], notes: ['Nominal current of T5 630 in the P/W version is derated by 10% (p.36 note)'], ruleId: 'ABB_TMAX_T_RATINGS' },
  T6: { family: 'Tmax', type: 'MCCB', poles: ['3P', '4P'], iuA: [630, 800, 1000], versions: ['Fixed', 'Withdrawable'], notes: ['W not available for T6 1000 A (footnote 4)'], ruleId: 'ABB_TMAX_T_RATINGS' },
  T7: { family: 'Tmax', type: 'MCCB', poles: ['3P', '4P'], iuA: [800, 1000, 1250, 1600], versions: ['Fixed', 'Withdrawable'], ruleId: 'ABB_TMAX_T_RATINGS', exposedInApplication: false },
};

// Application frames. The existing application frame names for T5 / T6 carry the Iu designation.
export const ABB_APPLICATION_FRAMES = [
  { frame: 'XT1', series: 'Tmax XT', catalogFrame: 'XT1' },
  { frame: 'XT2', series: 'Tmax XT', catalogFrame: 'XT2' },
  { frame: 'XT3', series: 'Tmax XT', catalogFrame: 'XT3' },
  { frame: 'XT4', series: 'Tmax XT', catalogFrame: 'XT4' },
  { frame: 'T5 400A', series: 'Tmax T5', catalogFrame: 'T5', iuA: [400] },
  { frame: 'T5 630A', series: 'Tmax T5', catalogFrame: 'T5', iuA: [630] },
  { frame: 'T6 630A', series: 'Tmax T6', catalogFrame: 'T6', iuA: [630] },
  { frame: 'E1.2', series: 'Emax 2', catalogFrame: 'E1.2' },
  { frame: 'E2.2', series: 'Emax 2', catalogFrame: 'E2.2' },
  { frame: 'E4.2', series: 'Emax 2', catalogFrame: 'E4.2' },
  { frame: 'E6.2', series: 'Emax 2', catalogFrame: 'E6.2' },
];

export const ABB_CUBICLE_TYPES = { POWER_CENTER: 'POWER_CENTER', MCC_PLUG_IN: 'MCC_PLUG_IN' };

// ---------------------------------------------------------------------------
// p.22 "Power Center Breakers" (cubicle configuration: Power Center).
// ---------------------------------------------------------------------------
export const ABB_POWER_CENTER_BREAKERS = {
  ruleId: 'ABB_MNSR_PC_BREAKERS',
  cubicleType: ABB_CUBICLE_TYPES.POWER_CENTER,
  footnotes: {
    '*': 'The step up option is available for all the breakers (not applied by the application)',
    '**': 'Four breakers type E1.2, T6 or T7 can be installed in a cubicle 800mm wide; two CBs at the top and two CBs at the bottom',
  },
  rows: [
    { sourceBreaker: 'Emax1.2', frames: ['E1.2'], position: 'Vertical', poles: ['3P', '4P'], module: '22E', widthsMm: [600, 800], widthFootnotes: { 800: ['**'] } },
    { sourceBreaker: 'Emax2.2', frames: ['E2.2'], position: 'Vertical', poles: ['3P', '4P'], module: '22E', widthsMm: [600] },
    { sourceBreaker: 'Emax4.2', frames: ['E4.2'], position: 'Vertical', poles: ['3P'], module: '22E', widthsMm: [600] },
    { sourceBreaker: 'Emax4.2', frames: ['E4.2'], position: 'Vertical', poles: ['4P'], module: '22E', widthsMm: [800] },
    { sourceBreaker: 'Emax6.2', frames: ['E6.2'], position: 'Vertical', poles: ['3P'], module: '22E', widthsMm: [1000] },
    { sourceBreaker: 'Emax6.2', frames: ['E6.2'], position: 'Vertical', poles: ['4P'], module: '22E', widthsMm: [1200] },
    { sourceBreaker: 'Tmax XT1', frames: ['XT1'], position: 'Horizontal', poles: ['3P', '4P'], module: '8E', widthsMm: [600] },
    { sourceBreaker: 'Tmax XT2', frames: ['XT2'], position: 'Horizontal', poles: ['3P', '4P'], module: '8E', widthsMm: [600] },
    { sourceBreaker: 'Tmax XT3', frames: ['XT3'], position: 'Horizontal', poles: ['3P', '4P'], module: '8E', widthsMm: [600] },
    { sourceBreaker: 'Tmax XT4', frames: ['XT4'], position: 'Horizontal', poles: ['3P', '4P'], module: '8E', widthsMm: [600] },
    { sourceBreaker: 'Tmax T5', frames: ['T5 400A', 'T5 630A'], position: 'Horizontal', poles: ['3P', '4P'], module: '12E', widthsMm: [600] },
    { sourceBreaker: 'Tmax T6', frames: ['T6 630A'], position: 'Vertical', poles: ['3P', '4P'], module: '22E', widthsMm: [600, 800], widthFootnotes: { 800: ['**'] } },
    { sourceBreaker: 'Tmax T7', frames: ['T7'], position: 'Vertical', poles: ['3P', '4P'], module: '22E', widthsMm: [600, 800], widthFootnotes: { 800: ['**'] } },
  ],
};

// ---------------------------------------------------------------------------
// p.23 "Motor Control Center Plug in modules" (cubicle configuration: MCC plug-in).
// ---------------------------------------------------------------------------
export const ABB_MCC_PLUG_IN_MODULES = {
  ruleId: 'ABB_MNSR_MCC_PLUG_IN_MODULES',
  cubicleType: ABB_CUBICLE_TYPES.MCC_PLUG_IN,
  application: 'Energy distribution',
  footnotes: { '*': '600 mm is the only width available for MNS R MCC cubicles' },
  rows: [
    { sourceBreaker: 'XT1', frames: ['XT1'], poles: ['3P', '4P'], minimumModule: '6E', widthMm: 600 },
    { sourceBreaker: 'XT2', frames: ['XT2'], poles: ['3P', '4P'], minimumModule: '6E', widthMm: 600 },
    { sourceBreaker: 'XT3', frames: ['XT3'], poles: ['3P'], minimumModule: '6E', widthMm: 600 },
    { sourceBreaker: 'XT3', frames: ['XT3'], poles: ['4P'], minimumModule: '8E', widthMm: 600 },
    { sourceBreaker: 'XT4', frames: ['XT4'], poles: ['3P'], minimumModule: '6E', widthMm: 600 },
    { sourceBreaker: 'XT4', frames: ['XT4'], poles: ['4P'], minimumModule: '8E', widthMm: 600 },
    { sourceBreaker: 'T4', frames: ['T4'], poles: ['3P', '4P'], minimumModule: '8E', widthMm: 600 },
    { sourceBreaker: 'T5 (400A)', frames: ['T5 400A'], poles: ['3P'], minimumModule: '8E', widthMm: 600 },
    { sourceBreaker: 'T5 (400A)', frames: ['T5 400A'], poles: ['4P'], minimumModule: '16E', widthMm: 600 },
    { sourceBreaker: 'T5 (630A)', frames: ['T5 630A'], poles: ['3P'], minimumModule: '16E', widthMm: 600 },
    { sourceBreaker: 'T5 (630A)', frames: ['T5 630A'], poles: ['4P'], minimumModule: '24E', widthMm: 600 },
    { sourceBreaker: 'T6 (630A)', frames: ['T6 630A'], poles: ['3P'], minimumModule: '16E', widthMm: 600 },
    { sourceBreaker: 'T6 (630A)', frames: ['T6 630A'], poles: ['4P'], minimumModule: '24E', widthMm: 600 },
  ],
};

// p.22 first table (table of contents: "Main Busbars"). Catalogued only; not evaluated.
export const ABB_MAIN_BUSBAR_MODULES = {
  ruleId: 'ABB_MNSR_MAIN_BUSBAR_MODULES',
  note: '"Rated current" column is not labelled further by the source (SOURCE_AMBIGUOUS).',
  rows: [
    { cubicleType: 'Motor Control Center', busbarPosition: 'Top', ratedCurrent: '≤ 3200A', module: '10E' },
    { cubicleType: 'Motor Control Center', busbarPosition: 'Top', ratedCurrent: '≤ 5000A', module: '14E' },
    { cubicleType: 'Motor Control Center', busbarPosition: 'Top', ratedCurrent: '6300A', module: '16E' },
    { cubicleType: 'Motor Control Center', busbarPosition: 'Top', ratedCurrent: '8000A', module: '18E' },
    { cubicleType: 'Motor Control Center', busbarPosition: 'Bottom', ratedCurrent: '≤ 3200A', module: '11E' },
    { cubicleType: 'Motor Control Center', busbarPosition: 'Bottom', ratedCurrent: '≤ 5000A', module: '15E' },
    { cubicleType: 'Motor Control Center', busbarPosition: 'Bottom', ratedCurrent: '6300A', module: '17E' },
    { cubicleType: 'Motor Control Center', busbarPosition: 'Bottom', ratedCurrent: '8000A', module: '19E' },
    { cubicleType: 'Power center with vertically mounted breakers', busbarPosition: 'Top', ratedCurrent: '≤ 8000A', module: '15E' },
    { cubicleType: 'Power center with vertically mounted breakers', busbarPosition: 'Center', ratedCurrent: '≤ 8000A', module: '15E' },
    { cubicleType: 'Power center with vertically mounted breakers', busbarPosition: 'Bottom', ratedCurrent: '≤ 8000A', module: '11E' },
    { cubicleType: 'Power center with horizontally mounted breakers', busbarPosition: 'Top', ratedCurrent: '≤ 5000A', module: '12E' },
    { cubicleType: 'Power center with horizontally mounted breakers', busbarPosition: 'Top', ratedCurrent: '6300A', module: '14E' },
    { cubicleType: 'Power center with horizontally mounted breakers', busbarPosition: 'Top', ratedCurrent: '8000A', module: '15E' },
    { cubicleType: 'Power center with horizontally mounted breakers', busbarPosition: 'Center', ratedCurrent: '≤ 5000A', module: '12E' },
    { cubicleType: 'Power center with horizontally mounted breakers', busbarPosition: 'Center', ratedCurrent: '6300A', module: '14E' },
    { cubicleType: 'Power center with horizontally mounted breakers', busbarPosition: 'Center', ratedCurrent: '8000A', module: '15E' },
    { cubicleType: 'Power center with horizontally mounted breakers', busbarPosition: 'Bottom', ratedCurrent: '≤ 5000A', module: '13E' },
    { cubicleType: 'Power center with horizontally mounted breakers', busbarPosition: 'Bottom', ratedCurrent: '6300A', module: '15E' },
    { cubicleType: 'Power center with horizontally mounted breakers', busbarPosition: 'Bottom', ratedCurrent: '8000A', module: '17E' },
  ],
};

export const ABB_BUSBAR_POSITIONS = ['Top', 'Center', 'Bottom'];
