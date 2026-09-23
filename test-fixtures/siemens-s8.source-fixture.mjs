// INDEPENDENT SOURCE FIXTURE — Siemens TIP Planning manual SIVACON S8, Status 01/2025 V3-korr.
// Transcribed row-by-row from the PDF as printed (text extraction of pdf pages 29–31 and 41),
// NOT generated from manufacturer-data/siemens-s8.js. Never edit this file to make a test pass;
// change it only after re-checking the PDF.
//
// Row format (Tab. 3/2–3/4):  ACB type [row fn] | rated device current [fn] | cable 3P | cable 4P | busbar 3P | busbar 4P
// "-" = not available. "a/b" = alternatives. A footnote printed on a width is written "8001)".

export const TABLE_3_2_TOP = {
  pdfPage: '29', printedPage: '25',
  heading: 'Busbar position at the top, cable/busbar entry from the top or bottom',
  rows: `
3WA1106    | 630 A      | 400/600 | 600   | -       | -
3WA1108    | 800 A      | 400/600 | 600   | -       | -
3WA1110    | 1,000 A    | 400/600 | 600   | -       | -
3WA1112    | 1,250 A    | 400/600 | 600   | -       | -
3WA1116    | 1,600 A    | 400/600 | 600   | 400/600 | 600
3WA1120    | 2,000 A    | 400/600 | 600   | 400/600 | 600
3WA1220    | 2,000 A    | 600/800 | 800   | 600/800 | 800
3WA1225    | 2,500 A    | 600/800 | 800   | 600/800 | 800
3WA1232    | 3,200 A    | 600/800 | 800   | 600/800 | 800
3WA1340    | 4,000 A 2) | 800     | 1,000 | 800     | 1,000
3WA1350 1) | 5,000 A 2) | -       | -     | 1,000   | 1,000
3WA1363 1) | 6,300 A 2) | -       | -     | 1,000   | 1,000
`,
  footnotes: { 1: 'Withdrawable unit version, frame height 2,200 mm', 2: 'Main busbar up to 6,300 A' },
};

export const TABLE_3_3_G1 = {
  pdfPage: '30', printedPage: '26',
  heading: '1 busbar system in the cubicle: busbar position rear-top and cable/busbar entry from the bottom or busbar position rear-bottom and cable/busbar entry from the top',
  rows: `
3WA1106    | 630 A      | 400/600 | 600   | -           | -
3WA1108    | 800 A      | 400/600 | 600   | -           | -
3WA1110    | 1,000 A    | 400/600 | 600   | -           | -
3WA1112    | 1,250 A    | 400/600 | 600   | -           | -
3WA1116    | 1,600 A    | 400/600 | 600   | 400/600     | 600
3WA1120    | 2,000 A    | 400/600 | 600   | 400/600     | 600
3WA1220    | 2,000 A    | 600/800 | 800   | 600/800     | 800
3WA1225    | 2,500 A    | 600/800 | 800   | 600/800     | 800
3WA1232    | 3,200 A    | 600/800 | 800   | 600/800     | 800
3WA1240 1) | 4.000 A    | 600/800 | 800   | 600/800     | 800
3WA1340    | 4,000 A    | 1,000   | 1,000 | 8001)/1,000 | 1,000
3WA1350 1) | 5,000 A 2) | -       | -     | 1,000       | 1,000
3WA1363 1) | 6,300 A 2) | -       | -     | 1,000       | 1,000
`,
  footnotes: { 1: 'Withdrawable unit version, frame height 2,200 mm', 2: 'Main busbar up to 7,010 A' },
};

export const TABLE_3_3_G2 = {
  pdfPage: '30', printedPage: '26',
  heading: '1 busbar system in the cubicle: busbar position rear-bottom and cable/busbar entry from the bottom or busbar position rear-top and cable/busbar entry from the top',
  rows: `
3WA1106       | 630 A   | 400/600 | 600   | -           | -
3WA1108       | 800 A   | 400/600 | 600   | -           | -
3WA1110       | 1,000 A | 400/600 | 600   | -           | -
3WA1112       | 1,250 A | 400/600 | 600   | -           | -
3WA1116       | 1,600 A | 400/600 | 600   | 400/600     | 600
3WA1120       | 2,000 A | 400/600 | 600   | 400/600     | 600
3WA1220       | 2,000 A | 600/800 | 800   | 600/800     | 800
3WA1225       | 2,500 A | 600/800 | 800   | 600/800     | 800
3WA1232       | 3,200 A | 600/800 | 800   | 600/800     | 800
3WA1340       | 4,000 A | -       | -     | 8003)/1,000 | 1,000
3WA1350 1) 4) | 5.000 A | 1.000   | 1.000 | -           | -
`,
  footnotes: {
    1: 'Withdrawable unit version, frame height 2,200 mm',
    3: 'Frame height 2,200 mm',
    4: 'Main busbar up to 7,010A rear-bottom, cable connection bottom, 3WA1350 H, C (max. 100kA), double front 1,200mm deep',
  },
};

export const TABLE_3_4_G1 = {
  pdfPage: '31', printedPage: '27',
  heading: '2 busbar systems in the cubicle: busbar position rear-top and cable/busbar entry from the bottom or busbar position rear-bottom and cable/busbar entry from the top',
  rows: `
3WA1106 | 630 A   | 400/600 | 600   | -           | -
3WA1108 | 800 A   | 400/600 | 600   | -           | -
3WA1110 | 1,000 A | 400/600 | 600   | -           | -
3WA1112 | 1,250 A | 400/600 | 600   | -           | -
3WA1116 | 1,600 A | 400/600 | 600   | 400/600     | 600
3WA1120 | 2,000 A | 400/600 | 600   | 400/600     | 600
3WA1220 | 2,000 A | 600/800 | 800   | 600/800     | 800
3WA1225 | 2,500 A | 600/800 | 800   | 600/800     | 800
3WA1232 | 3,200 A | 600/800 | 800   | 600/800     | 800
3WA1340 | 4,000 A | 1,000   | 1,000 | 8001)/1,000 | 1,000
`,
  footnotes: { 1: 'Frame height 2,200 mm' },
};

export const TABLE_3_4_G2 = {
  pdfPage: '31', printedPage: '27',
  heading: '2 busbar systems in the cubicle: busbar position rear-bottom and cable/busbar entry from the bottom or busbar position rear-top and cable/busbar entry from the top',
  rows: `
3WA1106 | 630 A   | 400/600 | 600 | -           | -
3WA1108 | 800 A   | 400/600 | 600 | -           | -
3WA1110 | 1,000 A | 400/600 | 600 | -           | -
3WA1112 | 1,250 A | 400/600 | 600 | -           | -
3WA1116 | 1,600 A | 400/600 | 600 | 400/600     | 600
3WA1120 | 2,000 A | 400/600 | 600 | 400/600     | 600
3WA1220 | 2,000 A | 600/800 | 800 | 600/800     | 800
3WA1225 | 2,500 A | 600/800 | 800 | 600/800     | 800
3WA1232 | 3,200 A | 600/800 | 800 | 600/800     | 800
3WA1340 | 4,000 A | -       | -   | 8001)/1,000 | 1,000
`,
  footnotes: { 1: 'Frame height 2,200 mm' },
};

// Tab. 3/17 (pdf 41 / printed 37). Each cell printed as "3VA1 value / 3VA2 value".
// Columns: busbar top, cable from bottom (NV, V) | busbar rear, cable from bottom (NV, V) | busbar rear, cable from top (NV, V)
export const TABLE_3_17 = {
  pdfPage: '41', printedPage: '37',
  rows: `
3VA1563 / 3VA2563 | 630 A   | 630 A / 605 A | 630 A / 630 A | 625 A / 630 A | 630 A / 630 A | 630 A / 630 A | 630 A / 630 A
3VA1580 / 3VA2580 | 800 A   | 660 A / 660 A | 735 A / 730 A | 690 A / 685 A | 775 A / 775 A | 730 A / 695 A | 775 A / 765 A
3VA1510 / 3VA2510 | 1,000 A | 815 A / 770 A | 900 A / 905 A | 800 A / 840 A | 905 A / 955 A | 780 A / 770 A | 830 A / 895 A
`,
  // Busbar at the top: only "Cable connection from the bottom" is printed.
  topBusbarCableEntries: ['Bottom'],
};

// §3.4 text (pdf 41 / printed 37).
export const SECTION_3_4_STATEMENT = 'The cubicle width of the different cubicle types (Tab. 3/16) with an MCCB (3VA) is generally 400 mm for 3- and 4-pole circuit-breakers.';
