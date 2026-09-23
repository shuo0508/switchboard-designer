// INDEPENDENT SOURCE FIXTURE — ABB MNS R Low Voltage Switchgear System Guide, 1TTB900011D0203 (2016-07).
// Transcribed from the PDF as printed (text extraction of pages 22, 23, 28, 29, 32, 33, 36, 37),
// NOT generated from manufacturer-data/abb-mnsr.js. Never edit this file to make a test pass;
// change it only after re-checking the PDF.

// p.28 (E1.2) and p.29 (E2.2 / E4.2 / E6.2): "Rated uninterrupted current Iu @ 40°C [A]" columns per performance level.
export const EMAX2_IU_BY_PERFORMANCE_LEVEL = {
  'E1.2': { pdfPage: '28', columns: { B: '630 800 1000 1250 1600', C: '630 800 1000 1250 1600', N: '250 630 800 1000 1250 1600', L: '630 800 1000 1250' } },
  'E2.2': { pdfPage: '29', columns: { B: '1600 2000', N: '800 1000 1250 1600 2000 2500', S: '250 800 1000 1250 1600 2000 2500', H: '800 1000 1250 1600 2000 2500' } },
  'E4.2': { pdfPage: '29', columns: { N: '3200 4000', S: '3200 4000', H: '3200 4000', V: '2000 2500 3200 4000' } },
  'E6.2': { pdfPage: '29', columns: { H: '4000 5000 6300', V: '4000 5000 6300', X: '4000 5000 6300' } },
};

// p.32–33 (Tmax XT) and p.37 (Tmax T): "Rated uninterrupted current [A]" as printed.
export const TMAX_IU = {
  XT1: { pdfPage: '32', printed: '160' },
  XT2: { pdfPage: '33', printed: '160' },
  XT3: { pdfPage: '33', printed: '250' },
  XT4: { pdfPage: '33', printed: '160/250' },
  T4: { pdfPage: '37', printed: '250/320' },
  T5: { pdfPage: '37', printed: '400/630' },
  T6: { pdfPage: '37', printed: '630/800/1000' },
  T7: { pdfPage: '37', printed: '800/1000/1250/1600' },
};

// Device notes.
export const TMAX_NOTES = {
  XT1_PLUG_IN: { pdfPage: '32', printed: '(2) XT1 Plug-In In max = 125A' },
  T5_630_PW: { pdfPage: '36', printed: 'The nominal current of T2 - T3 - T5 630 in the P/W version is derated by 10%.' },
};

// p.22 "Power Center Breakers": Breaker | Position | Version | Module | Cubicle width*
export const P22_POWER_CENTER_BREAKERS = `
Emax1.2  | Vertical   | 3P or 4P | 22E | 600 mm / 800 mm**
Emax2.2  | Vertical   | 3P or 4P | 22E | 600 mm
Emax4.2  | Vertical   | 3P       | 22E | 600 mm
Emax4.2  | Vertical   | 4P       | 22E | 800 mm
Emax6.2  | Vertical   | 3P       | 22E | 1000 mm
Emax6.2  | Vertical   | 4P       | 22E | 1200 mm
Tmax XT1 | Horizontal | 3P or 4P | 8E  | 600mm
Tmax XT2 | Horizontal | 3P or 4P | 8E  | 600mm
Tmax XT3 | Horizontal | 3P or 4P | 8E  | 600mm
Tmax XT4 | Horizontal | 3P or 4P | 8E  | 600mm
Tmax T5  | Horizontal | 3P or 4P | 12E | 600mm
Tmax T6  | Vertical   | 3P or 4P | 22E | 600 mm / 800 mm**
Tmax T7  | Vertical   | 3P or 4P | 22E | 600 mm / 800 mm**
`;
export const P22_FOOTNOTES = {
  '*': 'The step up option is available for all the breakers',
  '**': 'Four breakers type E1.2, T6 or T7 can be installed in a cubicle 800mm wide; two CBs at the top and two CBs at the bottom',
};

// p.23 "Motor Control Center Plug in modules": Breaker | Application | Version | Minimum module | Cubicle width*
export const P23_MCC_PLUG_IN_MODULES = `
XT1       | Energy distribution | 3P or 4P | 6E  | 600 mm
XT2       | Energy distribution | 3P or 4P | 6E  | 600 mm
XT3       | Energy distribution | 3P       | 6E  | 600 mm
XT3       | Energy distribution | 4P       | 8E  | 600 mm
XT4       | Energy distribution | 3P       | 6E  | 600 mm
XT4       | Energy distribution | 4P       | 8E  | 600 mm
T4        | Energy distribution | 3P or 4P | 8E  | 600 mm
T5 (400A) | Energy distribution | 3P       | 8E  | 600 mm
T5 (400A) | Energy distribution | 4P       | 16E | 600 mm
T5 (630A) | Energy distribution | 3P       | 16E | 600 mm
T5 (630A) | Energy distribution | 4P       | 24E | 600 mm
T6 (630A) | Energy distribution | 3P       | 16E | 600 mm
T6 (630A) | Energy distribution | 4P       | 24E | 600 mm
`;
export const P23_FOOTNOTE = '600 mm is the only width available for MNS R MCC cubicles';
