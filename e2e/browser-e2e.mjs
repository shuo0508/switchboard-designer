// Browser E2E without extra dependencies: starts the Vite dev server and a headless
// Chromium-based browser (Edge or Chrome), then drives the real UI over the DevTools protocol.
// Usage: node e2e/browser-e2e.mjs   (optional env BROWSER=<path to msedge/chrome executable>)
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const nodeBinary = existsSync(process.execPath) ? process.execPath : 'node';
const APP_PORT = 5199, DEBUG_PORT = 9339;
const candidates = [process.env.BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const browserPath = candidates.find(path => existsSync(path));
if (!browserPath) throw new Error('No Chromium-based browser found. Set BROWSER=<path>.');

const sleep = ms => new Promise(done => setTimeout(done, ms));
async function waitFor(check, label, timeout = 15000) {
  const start = Date.now();
  for (;;) { try { const value = await check(); if (value) return value; } catch {} if (Date.now() - start > timeout) throw new Error('Timeout: ' + label); await sleep(150); }
}

const server = spawn(nodeBinary, [join(root, 'node_modules/vite/bin/vite.js'), '--port', String(APP_PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'swb-e2e-'));
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const results = [];
let socket, nextId = 0;
const pending = new Map();
const exceptions = [];

function send(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((done, fail) => pending.set(id, { done, fail }));
}
async function evaluate(expression) {
  const reply = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (reply.exceptionDetails) throw new Error('Evaluation failed: ' + (reply.exceptionDetails.exception?.description || reply.exceptionDetails.text));
  return reply.result.value;
}
async function pressEscape() {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
  await sleep(200);
}
async function loadWithState(state) {
  await evaluate(`localStorage.clear(); ${state ? `localStorage.setItem('switchboard-project-v2', ${JSON.stringify(JSON.stringify(state.project))}); localStorage.setItem('switchboard-data-v2', ${JSON.stringify(JSON.stringify(state.breakers))});` : ''} true`);
  await reloadAndWait();
}
async function reloadAndWait() {
  await evaluate(`window.__stalePage = true`);
  await send('Page.reload', { ignoreCache: true });
  await waitFor(() => evaluate(`!window.__stalePage && document.readyState === 'complete' && !!document.querySelector('#rows tr') && document.querySelector('#designStatus').textContent !== '-'`), 'app render after reload');
}
function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail });
  console.log((condition ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : ''));
}
const text = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent || ''`);
const abbProject = extra => ({ manufacturer: 'ABB', mainBus: '6300 A', defaultRoute: 'Bottom', quantity: 1, configuration: { switchboards: { 'SWB-01': { busbarPositions: { 'Input Bus': 'Top' } } }, breakers: {} }, ...extra });
const acb = (id, extra = {}) => ({ internalId: id, id: 'CB-01', function: 'MAIN_INPUT', series: 'Emax 2', frame: 'E4.2', rating: '3200A', pole: '4P', route: 'Bottom', routeMode: 'explicit', seriesMode: 'manual', frameMode: 'manual', switchboardId: 'SWB-01', assignmentMode: 'inherited', ...extra });
const xt4 = id => ({ internalId: id, id: 'CB-01', function: 'UPS_INPUT_LOAD', series: 'Tmax XT', frame: 'XT4', rating: '160A', pole: '4P', route: 'Bottom', routeMode: 'explicit', seriesMode: 'manual', frameMode: 'manual', switchboardId: 'SWB-01', assignmentMode: 'inherited' });

try {
  await waitFor(async () => (await fetch(`http://127.0.0.1:${APP_PORT}/`)).ok, 'vite server');
  const targets = await waitFor(async () => (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json(), 'browser debugger');
  const page = targets.find(target => target.type === 'page');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(done => socket.addEventListener('open', done));
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) { pending.get(message.id).done(message.result || {}); pending.delete(message.id); }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Browser.setDownloadBehavior', { behavior: 'deny' }).catch(() => {});
  await send('Page.navigate', { url: `http://127.0.0.1:${APP_PORT}/` });
  await waitFor(() => evaluate(`!!document.querySelector('#designStatus')`), 'initial load');
  await loadWithState(null);

  if (process.env.SCREENSHOT) {
    await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 2600, deviceScaleFactor: 1, mobile: false });
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    (await import('node:fs')).writeFileSync(process.env.SCREENSHOT, Buffer.from(shot.data, 'base64'));
  }

  // H6: one Design Status source across panels.
  const summaryStatus = await text('#designStatus');
  const panelStatus = await text('#designConfiguration .completeness b');
  const gaStatus = await text('#gaTotal');
  check('H6 Design Status identical in Summary / Design Configuration / GA', summaryStatus === panelStatus && gaStatus.endsWith(summaryStatus), `${summaryStatus} | ${panelStatus} | ${gaStatus}`);

  // H5: Not Defined by default, USER_DEFINED after entry, persisted after reload.
  check('H5 H/D Not Defined by default', (await text('#physicalDimensions')).includes('Not Defined'), await text('#physicalDimensions'));
  await evaluate(`const h=document.querySelector('#heightMm');h.value='2200';h.dispatchEvent(new Event('change'));const d=document.querySelector('#depthMm');d.value='1200';d.dispatchEvent(new Event('change'));true`);
  const dimText = await text('#physicalDimensions');
  check('H5 user-entered H/D shown as USER_DEFINED', dimText.includes('H 2200 mm · USER_DEFINED') && dimText.includes('D 1200 mm · USER_DEFINED'), dimText);
  check('H5 GA header shows user H/D', (await text('.ga-board-facts')).includes('USER_DEFINED'));
  await reloadAndWait(); await waitFor(() => evaluate(`document.querySelector('#heightMm')?.value === '2200'`), 'dimension persisted');
  check('H5 H/D persisted after reload', (await text('#physicalDimensions')).includes('H 2200 mm'));

  // C1 / M12: 10 x XT4 is not a verified 6000 mm lineup.
  await loadWithState({ project: abbProject(), breakers: Array.from({ length: 10 }, (_, index) => xt4('xt4-' + index)) });
  const c1Status = await text('#designStatus');
  check('C1 10 x XT4 not VALID / MATCHED', c1Status !== 'VALID / MATCHED', c1Status);
  const totalText = await text('#total');
  check('C1/M12 Summary width marked provisional', totalText.includes('6000 mm') && totalText.includes('Provisional Planning Width'), totalText);
  await evaluate(`document.querySelector('#rows tr td').click(); true`);
  const recText = await text('#rec');
  check('C1 WHY THIS SIZE separates device data and section planning width', (await text('#min')).includes('Manufacturer Verified') && recText.includes('Provisional Planning Width'), `${await text('#min')} | ${recText}`);
  check('C1 packing status shown in trace', (await text('#why')).includes('PACKING: UNRESOLVED'));

  // Export dialog for a draft design; then M6 Esc safety.
  await evaluate(`globalThis.__lastExport=null; document.querySelector('#reportBtn').click(); true`);
  check('Draft export opens confirmation dialog', await evaluate(`document.querySelector('#confirmationDialog').open`));
  await evaluate(`document.querySelector('#dialogApply').click(); true`); await sleep(200);
  const exported = await evaluate(`globalThis.__lastExport && { status: globalThis.__lastExport.designStatus, provisional: globalThis.__lastExport.containsProvisionalWidth, sections: globalThis.__lastExport.widthSummary.provisionalSections.length }`);
  check('M12 exported JSON flags provisional width', exported?.provisional === true && exported.sections === 10, JSON.stringify(exported));
  await evaluate(`globalThis.__lastExport=null; document.querySelector('#reportBtn').click(); true`);
  await pressEscape();
  check('M6 Draft export: Apply -> reopen -> Esc does not export', await evaluate(`!document.querySelector('#confirmationDialog').open && globalThis.__lastExport === null`));

  // H4: incomer above Rated Main Bus Current.
  await loadWithState({ project: abbProject({ switchboards: { 'SWB-01': { ratedMainBus: '3200 A', ratingMode: 'override' } } }), breakers: [acb('inc', { frame: 'E6.2', rating: '6300A' })] });
  check('H4 3200 A bus + 6300 A incomer -> Electrical Design Conflict', (await text('#designStatus')) === 'ELECTRICAL DESIGN CONFLICT', await text('#designStatus'));
  check('H4 listed separately from manufacturer invalids', (await text('#designConfiguration .config-status')).includes('Electrical Design Conflicts'));
  await evaluate(`globalThis.__lastExport=null; document.querySelector('#reportBtn').click(); true`);
  await evaluate(`document.querySelector('#dialogApply').click(); true`); await sleep(200);
  await evaluate(`globalThis.__lastExport=null; document.querySelector('#reportBtn').click(); true`);
  await pressEscape();
  check('M6 Conflict export: Apply -> reopen -> Esc does not export', await evaluate(`globalThis.__lastExport === null`));

  // Invalid export dialog Esc safety (3WA1106 has no busbar-connection width).
  await loadWithState({ project: { manufacturer: 'Siemens', mainBus: '6300 A', quantity: 1, configuration: { switchboards: { 'SWB-01': { busbarPositions: { 'Input Bus': 'Top' } } }, breakers: { bad: { connectionType: 'Busbar' } } } }, breakers: [acb('bad', { series: 'SENTRON 3WA', frame: '3WA1106', rating: '630A', function: 'UPS_INPUT' })] });
  check('Invalid design status', (await text('#designStatus')) === 'INVALID');
  await evaluate(`globalThis.__lastExport=null; document.querySelector('#reportBtn').click(); true`);
  await evaluate(`document.querySelector('#dialogApply').click(); true`); await sleep(200);
  const invalidExported = await evaluate(`globalThis.__lastExport?.invalidConditions.length`);
  check('M8 invalid counted once in export', invalidExported === 1, String(invalidExported));
  await evaluate(`globalThis.__lastExport=null; document.querySelector('#reportBtn').click(); true`);
  await pressEscape();
  check('M6 Invalid export: Apply -> reopen -> Esc does not export', await evaluate(`globalThis.__lastExport === null`));

  // M4 + M6: explicit SWB-02 assignment through 2 -> 1 -> 2 using the real dialog.
  await loadWithState({ project: abbProject({ quantity: 2 }), breakers: [acb('m4a'), acb('m4b', { function: 'UPS_INPUT', internalId: 'm4b' })] });
  await evaluate(`const s=document.querySelector('#rows tr select[data-col=switchboard]');s.value='SWB-02';s.dispatchEvent(new Event('change'));true`);
  await evaluate(`document.querySelector('#oneBoard').click(); true`);
  await evaluate(`document.querySelector('#dialogApply').click(); true`); await sleep(200);
  check('M4 merged to 1 switchboard', await evaluate(`document.querySelector('#oneBoard').classList.contains('active')`));
  await evaluate(`document.querySelector('#twoBoards').click(); true`);
  await pressEscape();
  check('M6 Quantity: Apply -> reopen -> Esc keeps 1 switchboard', await evaluate(`document.querySelector('#oneBoard').classList.contains('active') && !document.querySelector('#confirmationDialog').open`));
  await evaluate(`document.querySelector('#twoBoards').click(); true`);
  await evaluate(`document.querySelector('#dialogApply').click(); true`); await sleep(200);
  const restored = await evaluate(`[...document.querySelectorAll('#rows tr')].map(row=>row.querySelector('select[data-col=switchboard]').value)`);
  check('M4 explicit SWB-02 restored after 2 -> 1 -> 2', restored[0] === 'SWB-02' && restored[1] === 'SWB-01', JSON.stringify(restored));

  // M5: one active selection source.
  await loadWithState({ project: abbProject(), breakers: [acb('s1'), acb('s2', { function: 'UPS_INPUT' })] });
  await evaluate(`document.querySelector('[data-section-key="SWB-01:S02"]').dispatchEvent(new MouseEvent('click',{bubbles:true})); true`);
  check('M5 GA section selection updates Rule Trace', (await text('#selectedTitle')).startsWith('SWB-01 / S02'), await text('#selectedTitle'));
  await evaluate(`document.querySelector('#rows tr td').click(); true`);
  const rowTitle = await text('#selectedTitle');
  check('M5 schedule row selection clears stale GA selection', rowTitle.startsWith('SWB-01 / CB-01') && !rowTitle.includes('S02'), rowTitle);
  check('M5 GA highlight cleared', await evaluate(`!document.querySelector('.ga-cubicle.is-selected')`));

  // M7: 400 mm and 600 mm sections are visually different in Physical mode.
  await loadWithState({ project: { manufacturer: 'Siemens', mainBus: '6300 A', quantity: 1, configuration: { switchboards: { 'SWB-01': { busbarPositions: { 'Input Bus': 'Rear Top', 'UPS Output Bus': 'Rear Bottom' } } }, breakers: { wa: { connectionType: 'Cable', cubicleWidthMm: 600 }, va: { ventilation: 'Ventilated' } } } },
    breakers: [acb('wa', { series: 'SENTRON 3WA', frame: '3WA1232', rating: '3200A', pole: '3P' }), acb('vb', { function: 'UPS_OUTPUT_LOAD', series: 'SENTRON 3VA', frame: '3VA1563', rating: '630A' }), acb('va', { function: 'UPS_INPUT_LOAD', series: 'SENTRON 3VA', frame: '3VA1563', rating: '630A' })] });
  await evaluate(`document.querySelector('#gaPhysical').click(); true`);
  const widths = await evaluate(`[...document.querySelectorAll('.ga-cubicle')].map(g=>[g.dataset.sectionKey, Number(g.dataset.widthPx), g.querySelector('.ga-cubicle-body').getAttribute('width')])`);
  check('M7 400 mm and 600 mm sections rendered with different widths', widths.length === 3 && widths[0][1] !== widths[1][1] && Math.abs(widths[1][1] / widths[0][1] - 400 / 600) < 1e-9, JSON.stringify(widths));
  const busLines = await evaluate(`[...document.querySelectorAll('.ga-physical-bus')].map(line=>[line.dataset.busId, Number(line.getAttribute('x1')), Number(line.getAttribute('x2'))])`);
  const sectionBoxes = await evaluate(`[...document.querySelectorAll('.ga-cubicle-body')].map(r=>[Number(r.getAttribute('x')), Number(r.getAttribute('width'))])`);
  const busOf = ['BUS-A', 'BUS-B', 'BUS-A'];
  const crossing = busLines.some(([busId, x1, x2]) => sectionBoxes.some(([x, w], index) => x < x2 && x + w > x1 && busOf[index] !== busId));
  check('M7 bus line does not pass through another bus section', busLines.length === 3 && !crossing, JSON.stringify(busLines));

  // M1: Rule Trace resolves through shared metadata.
  await evaluate(`document.querySelector('#rows tr td').click(); true`);
  const sourceText = await text('#source');
  check('M1 Rule Trace resolves Table 3/2-3/4 metadata', sourceText.includes('resolvedRuleId: SIEMENS_S8_3WA_TABLE_3_4') && sourceText.includes('pdfPage: 31'), sourceText.slice(0, 200));

  // M9: hostile persisted strings are normalized / escaped, never executed.
  const hostile = '<img src=x onerror="window.__xss=1">';
  await loadWithState({ project: { manufacturer: hostile, mainBus: hostile, configuration: { switchboards: { 'SWB-01': { busbarPositions: { 'Input Bus': hostile } } }, breakers: {} }, dimensions: { heightMm: hostile } }, breakers: [{ internalId: hostile, id: hostile, function: hostile, series: hostile, frame: hostile, rating: hostile }] });
  await sleep(300);
  check('M9 hostile localStorage not executed', await evaluate(`window.__xss === undefined && !document.querySelector('img[src=x]')`));
  check('M9 app still renders after hostile data', (await text('#designStatus')).length > 0);

  check('No uncaught browser exceptions', exceptions.length === 0, exceptions.join(' | '));
} catch (error) {
  check('E2E harness', false, error.message);
} finally {
  socket?.close();
  browser.kill();
  server.kill();
}
const failed = results.filter(result => !result.pass);
console.log(`\nBrowser E2E: ${results.length - failed.length}/${results.length} passed (${browserPath})`);
process.exit(failed.length ? 1 : 0);
