// Source-transcription regression: runtime manufacturer data vs INDEPENDENT fixtures (test-fixtures/).
// Expected values come only from the fixtures (transcribed from the PDFs as printed), never from the
// runtime dataset under test.
import assert from 'node:assert/strict';
import { ABB_APPLICATION_FRAMES, ABB_BREAKER_CATALOG, ABB_MCC_PLUG_IN_MODULES, ABB_POWER_CENTER_BREAKERS } from './manufacturer-data/abb-mnsr.js';
import { SIEMENS_3VA_CUBICLE, SIEMENS_3VA_TABLE_3_17, SIEMENS_3WA_TABLES } from './manufacturer-data/siemens-s8.js';
import * as ABB from './test-fixtures/abb-mnsr.source-fixture.mjs';
import * as SIE from './test-fixtures/siemens-s8.source-fixture.mjs';

const lines = text => text.trim().split('\n').map(line => line.split('|').map(cell => cell.trim()));
const amps = text => Number(String(text).replace(/[^0-9]/g, ''));
const poles = text => text === '3P or 4P' ? ['3P', '4P'] : [text];
let checks = 0;
const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };

// ------------------------------------------------------------------ ABB Emax 2 Iu by performance level
for (const [frame, { columns }] of Object.entries(ABB.EMAX2_IU_BY_PERFORMANCE_LEVEL)) {
  const expected = Object.fromEntries(Object.entries(columns).map(([level, values]) => [level, values.split(' ').map(Number)]));
  eq(ABB_BREAKER_CATALOG[frame].iuByPerformanceLevel, expected, `${frame} Iu by performance level`);
  eq(Object.keys(ABB_BREAKER_CATALOG[frame].iuByPerformanceLevel), Object.keys(columns), `${frame} performance level order`);
}

// ------------------------------------------------------------------ ABB Tmax Iu
for (const [frame, { printed }] of Object.entries(ABB.TMAX_IU)) eq(ABB_BREAKER_CATALOG[frame].iuA, printed.split('/').map(Number), `${frame} Iu`);
// Application frames only narrow a catalogued frame to one printed Iu value.
for (const item of ABB_APPLICATION_FRAMES.filter(entry => entry.iuA)) {
  const printed = ABB.TMAX_IU[item.catalogFrame].printed.split('/').map(Number);
  assert.ok(item.iuA.every(value => printed.includes(value)), `${item.frame} Iu must be a printed ${item.catalogFrame} value`); checks++;
}
// Device notes.
assert.ok(ABB_BREAKER_CATALOG.XT1.executionNotes[0].text.includes('In max = 125A') && ABB.TMAX_NOTES.XT1_PLUG_IN.printed.includes('In max = 125A')); checks++;
eq(ABB_BREAKER_CATALOG.XT1.executionNotes[0].affectsRatingAboveA, amps(ABB.TMAX_NOTES.XT1_PLUG_IN.printed.split('=')[1]), 'XT1 plug-in In max');
assert.ok(ABB_BREAKER_CATALOG.T5.executionNotes[0].text.includes('derated by 10%') && ABB.TMAX_NOTES.T5_630_PW.printed.includes('T5 630 in the P/W version is derated by 10%')); checks++;

// ------------------------------------------------------------------ ABB p.22 Power Center Breakers
const pcRows = lines(ABB.P22_POWER_CENTER_BREAKERS);
eq(ABB_POWER_CENTER_BREAKERS.rows.length, pcRows.length, 'p.22 row count');
pcRows.forEach(([breaker, position, version, module, cell], index) => {
  const row = ABB_POWER_CENTER_BREAKERS.rows[index];
  const parts = cell.split('/').map(part => part.trim());
  const plain = parts.filter(part => !part.includes('**')).map(amps);
  const footnoted = parts.filter(part => part.includes('**')).map(amps);
  eq([row.sourceBreaker, row.position, row.poles, row.module], [breaker, position, poles(version), module], `p.22 ${breaker} ${version}`);
  eq(row.widthsMm, plain, `p.22 ${breaker} ${version} single-breaker width (no footnote)`);
  if (footnoted.length) {
    eq(row.footnoteArrangement, { widthMm: footnoted[0], footnote: '**' }, `p.22 ${breaker} ** arrangement`);
    eq(row.sourceWidthCell, cell, `p.22 ${breaker} source cell`);
  } else {
    eq(row.footnoteArrangement, undefined, `p.22 ${breaker} has no ** arrangement`);
  }
});
eq(ABB_POWER_CENTER_BREAKERS.footnotes['**'], ABB.P22_FOOTNOTES['**'], 'p.22 footnote **');
assert.ok(ABB_POWER_CENTER_BREAKERS.footnotes['*'].startsWith(ABB.P22_FOOTNOTES['*'])); checks++;

// ------------------------------------------------------------------ ABB p.23 MCC Plug in modules
const mccRows = lines(ABB.P23_MCC_PLUG_IN_MODULES);
eq(ABB_MCC_PLUG_IN_MODULES.rows.length, mccRows.length, 'p.23 row count');
mccRows.forEach(([breaker, application, version, module, width], index) => {
  const row = ABB_MCC_PLUG_IN_MODULES.rows[index];
  eq([row.sourceBreaker, row.poles, row.minimumModule, row.widthMm], [breaker, poles(version), module, amps(width)], `p.23 ${breaker} ${version}`);
  eq(ABB_MCC_PLUG_IN_MODULES.application, application, 'p.23 application');
});
eq(ABB_MCC_PLUG_IN_MODULES.footnotes['*'], ABB.P23_FOOTNOTE, 'p.23 footnote');

// ------------------------------------------------------------------ Siemens Tab. 3/2 – 3/4 (five tables)
const parseWidth = cell => {
  if (cell === '-') return { widths: [], fns: {} };
  const fns = {};
  const widths = cell.split('/').map(part => {
    const match = part.match(/^([\d.,]+?)(\d\))?$/);
    const width = amps(match[1]);
    if (match[2]) fns[width] = [Number(match[2][0])];
    return width;
  });
  return { widths, fns };
};
const TABLES = { TABLE_3_2_TOP: SIE.TABLE_3_2_TOP, TABLE_3_3_G1: SIE.TABLE_3_3_G1, TABLE_3_3_G2: SIE.TABLE_3_3_G2, TABLE_3_4_G1: SIE.TABLE_3_4_G1, TABLE_3_4_G2: SIE.TABLE_3_4_G2 };
eq(Object.keys(SIEMENS_3WA_TABLES), Object.keys(TABLES), 'five independent 3WA tables');
for (const [id, fixture] of Object.entries(TABLES)) {
  const table = SIEMENS_3WA_TABLES[id];
  eq([table.pdfPage, table.printedPage], [fixture.pdfPage, fixture.printedPage], `${id} pages`);
  const rows = lines(fixture.rows);
  eq(Object.keys(table.rows), rows.map(([type]) => type.split(' ')[0]), `${id} frame list`);
  rows.forEach(([typeCell, ratedCell, c3, c4, b3, b4]) => {
    const frame = typeCell.split(' ')[0];
    const row = table.rows[frame];
    const rowFns = [...(typeCell + ' ' + ratedCell).matchAll(/(\d)\)/g)].map(match => Number(match[1])).sort();
    eq(row.ratedCurrentA, amps(ratedCell.replace(/\d\)/g, '')), `${id} ${frame} rated current`);
    eq([...row.footnotes].sort(), rowFns, `${id} ${frame} row footnotes`);
    const expectedCellFns = {};
    for (const [connection, pole, cell] of [['cable', '3P', c3], ['cable', '4P', c4], ['busbar', '3P', b3], ['busbar', '4P', b4]]) {
      const parsed = parseWidth(cell);
      eq(row[connection][pole], parsed.widths, `${id} ${frame} ${connection} ${pole}`);
      Object.entries(parsed.fns).forEach(([width, fns]) => { expectedCellFns[`${connection}:${pole}:${width}`] = fns; });
    }
    eq(row.cellFootnotes, expectedCellFns, `${id} ${frame} cell footnotes`);
  });
  for (const [number, text] of Object.entries(fixture.footnotes)) eq(table.footnotes[number].text, text, `${id} footnote ${number}`);
  eq(Object.keys(table.footnotes).sort(), Object.keys(fixture.footnotes).sort(), `${id} footnote set`);
}

// ------------------------------------------------------------------ Siemens Tab. 3/17 (36 values)
const pair = cell => cell.split('/').map(amps);
let values317 = 0;
lines(SIE.TABLE_3_17.rows).forEach(([types, rated, ...cells]) => {
  const [va1, va2] = types.split('/').map(type => type.trim());
  const [topNv, topV, rearBottomNv, rearBottomV, rearTopNv, rearTopV] = cells.map(pair);
  [[va1, 0], [va2, 1]].forEach(([frame, i]) => {
    const row = SIEMENS_3VA_TABLE_3_17.rows[frame];
    eq(row.ratedCurrentA, amps(rated), `${frame} rated`);
    eq(row.top, { Bottom: { nonVentilated: topNv[i], ventilated: topV[i] } }, `${frame} busbar top / cable bottom (top entry not printed)`);
    eq(row.rear, { Bottom: { nonVentilated: rearBottomNv[i], ventilated: rearBottomV[i] }, Top: { nonVentilated: rearTopNv[i], ventilated: rearTopV[i] } }, `${frame} busbar rear`);
    values317 += 6;
  });
});
eq(values317, 36, 'Tab. 3/17 fixture covers 36 values');
eq(Object.keys(SIEMENS_3VA_TABLE_3_17.rows).length, 6, 'Tab. 3/17 has 6 3VA types');
eq(SIEMENS_3VA_CUBICLE.statement, SIE.SECTION_3_4_STATEMENT, '§3.4 statement');

console.log(`independent manufacturer source fixture tests passed (${checks} checks)`);
