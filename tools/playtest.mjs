// HIVEWARDEN — headless playtest via Chrome DevTools Protocol (dev tool).
// Drives the real game in chrome-headless-shell: title -> start -> move ->
// swarm command -> smoke -> flower -> day 1 clear -> fork -> upgrade ->
// day 2 -> boss day 5 -> full autopilot run to victory. Captures console
// errors and screenshots.
// Run: node tools/playtest.mjs  (expects `node serve.mjs` on :8901 and
// chrome-headless-shell with --remote-debugging-port=9333 already running)
import { writeFileSync } from 'node:fs';

const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page');
if (!page) throw new Error('no page target');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const errors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXCEPTION: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 300));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('CONSOLE: ' + m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 300));
  if (m.method === 'Network.loadingFailed') errors.push('NETFAIL: ' + m.params.errorText);
};
function send(method, params = {}) {
  return new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
}
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 400));
  return r.result?.result?.value;
}
async function key(type, code, keyName) {
  await send('Input.dispatchKeyEvent', { type, code, key: keyName, windowsVirtualKeyCode: 0 });
}
async function mouseClick(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`/tmp/hive-test-${name}.png`, Buffer.from(r.result.data, 'base64'));
}
const state = async () => JSON.parse(await evalJs('window.render_game_to_text()'));

await send('Runtime.enable');
await send('Page.enable');
await send('Network.enable');
await send('Network.clearBrowserCache');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:8901/' });
await sleep(1500);

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`); };

let s = await state();
check('title screen', s.mode === 'title', JSON.stringify(s).slice(0, 120));
await shot('title');

// Start the run via the start button.
await evalJs(`document.getElementById('start-btn').click()`);
await sleep(400);
s = await state();
check('play mode day 1', s.mode === 'play' && s.day === 1, `${s.mode} day ${s.day}`);
check('warden starts with 5 hearts (Hive)', s.warden.hp === 5, `hp=${s.warden.hp}`);
check('hive starts at 100 HP', s.hive.hp === 100, `hive=${s.hive.hp}`);
check('12 bees at start', s.bees === 12, `bees=${s.bees}`);

// Move: hold D for 1s.
const x0 = s.warden.x;
await key('keyDown', 'KeyD', 'd');
await sleep(1000);
await key('keyUp', 'KeyD', 'd');
s = await state();
check('runs right', s.warden.x > x0 + 120, `x ${x0} -> ${s.warden.x}`);

// Swarm command: click near the first enemy (or the hive if none yet).
await sleep(1500);
s = await state();
const tgt = s.near[0] || { x: 640, y: 300 };
await mouseClick(tgt.x, tgt.y);
await sleep(300);
s = await state();
check('swarm command accepted (bees engage or rally)', s.mode === 'play', `bees=${s.bees}`);

// Smoke: Space, check cooldown set.
await key('keyDown', 'Space', ' ');
await sleep(100);
await key('keyUp', 'Space', ' ');
s = await state();
check('smoke fires and sets cooldown', s.smokeCd > 5, `smokeCd=${s.smokeCd}`);
await shot('play');

// Flower: give honey, press E.
await evalJs(`window.__HIVEWARDEN__.giveHoney(20)`);
await sleep(100);
await key('keyDown', 'KeyE', 'e');
await sleep(100);
await key('keyUp', 'KeyE', 'e');
s = await state();
check('flower planted, honey spent', s.flowers === 1 && s.honey < 20, `flowers=${s.flowers} honey=${s.honey}`);

// Day 1 clear via autopilot at high timescale.
await evalJs(`window.__HIVEWARDEN__.setAutopilot(true); window.__HIVEWARDEN__.setTimeScale(6)`);
let cleared = false;
for (let i = 0; i < 40; i++) {
  await sleep(1000);
  s = await state();
  if (s.mode === 'fork') { cleared = true; break; }
  if (s.mode === 'defeat') break;
}
check('day 1 clears under autopilot', cleared, `mode=${s.mode} day=${s.day} score=${s.score}`);
await shot('fork');
check('fork screen visible', await evalJs(`!document.getElementById('fork-screen').classList.contains('hidden')`));

// Pick the Quiet Meadow road, then an upgrade.
await evalJs(`[...document.querySelectorAll('#fork-cards .card')].find(b => b.textContent.includes('Quiet Meadow')).click()`);
await sleep(400);
s = await state();
check('upgrade screen after fork choice', await evalJs(`!document.getElementById('upgrade-screen').classList.contains('hidden')`), `mode=${s.mode}`);
await evalJs(`document.querySelector('#upgrade-cards .card').click()`);
await sleep(600);
s = await state();
check('day 2 starts after upgrade', s.mode === 'play' && s.day === 2, `${s.mode} day ${s.day}`);
check('an upgrade was applied', Object.keys(s.upgrades).length >= 1, JSON.stringify(s.upgrades));

// Boss day 5: jump there with a prepared mid-game loadout, autopilot through the Hornet Queen.
await evalJs(`const HW = window.__HIVEWARDEN__; HW.game.state.mode='play'; HW.startDay(5);
  ['moreBees','moreBees','sharpStings','sharpStings','swiftWings','hiveArmor','longReach','quickHive'].forEach(k => HW.game.applyUpgrade(k));
  HW.giveHoney(200);`);
await sleep(500);
s = await state();
check('day 5 (boss) starts', s.day === 5 && s.mode === 'play', `day=${s.day}`);
let bossSeen = false;
for (let i = 0; i < 150; i++) {
  await sleep(200); // fast poll: a 20-bee swarm kills the Queen in seconds
  s = await state();
  if (s.near.some((e) => e.boss)) { bossSeen = true; await shot('boss'); break; }
}
check('Hornet Queen spawns', bossSeen, JSON.stringify(s.near).slice(0, 120));
let bossCleared = false;
for (let i = 0; i < 90; i++) {
  await sleep(1000);
  s = await state();
  if (s.mode === 'fork') { bossCleared = true; break; }
  if (s.mode === 'defeat') break;
}
check('boss day 5 clears under autopilot', bossCleared, `mode=${s.mode} score=${s.score}`);
await evalJs(`[...document.querySelectorAll('#fork-cards .card')].find(b => b.textContent.includes('Quiet Meadow')).click()`);
await sleep(300);
await evalJs(`document.querySelector('#upgrade-cards .card').click()`);
await sleep(500);

// Full run: autopilot from day 6 to victory at timescale 6.
let victory = false;
for (let i = 0; i < 300; i++) {
  await sleep(1000);
  s = await state();
  if (s.mode === 'fork') {
    // Sensible fork/upgrade policy (autoFork), keep going.
    await evalJs(`window.__HIVEWARDEN__.autoFork()`);
    await sleep(700);
  } else if (s.mode === 'victory') { victory = true; break; }
  else if (s.mode === 'defeat') break;
}
check('full 10-day run reaches victory under autopilot', victory, `mode=${s.mode} day=${s.day} score=${s.score}`);
if (victory) {
  s = await state();
  check('victory score is positive and large', s.score > 3000, `score=${s.score}`);
  await shot('victory');
}

await evalJs(`window.__HIVEWARDEN__.setTimeScale(1); window.__HIVEWARDEN__.setAutopilot(false)`);
console.log('---');
console.log('console/network errors:', errors.length ? errors : 'none');
const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `PLAYTEST FAILED: ${failed.length} checks` : 'PLAYTEST ALL PASS');
ws.close();
process.exit(failed.length || errors.length ? 1 : 0);
