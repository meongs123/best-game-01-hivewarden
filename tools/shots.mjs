// HIVEWARDEN — screenshot capture (dev tool, not part of the game).
// Produces the 4 submission screenshots at 1280x720 as JPEGs in screenshots/:
// 01-cover.jpg (mid-game action), 02-title.jpg, 03-fork.jpg, 04-victory.jpg.
// The victory shot is a real win: day 10 is played with a prepared loadout
// (upgrades + honey applied through the debug hooks) under autopilot.
// Run: node tools/shots.mjs (serve.mjs on :8901 + headless-shell :9333)
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
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXCEPTION: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 200));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('CONSOLE: ' + JSON.stringify(m.params.args).slice(0, 200));
};
function send(method, params = {}) {
  return new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
}
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300));
  return r.result?.result?.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
  writeFileSync(`screenshots/${name}.jpg`, Buffer.from(r.result.data, 'base64'));
  console.log('saved screenshots/' + name + '.jpg');
}
const state = async () => JSON.parse(await evalJs('window.render_game_to_text()'));

await send('Runtime.enable');
await send('Page.enable');
await send('Network.clearBrowserCache');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:8901/' });
await sleep(1500);

// 02 — title screen.
await shot('02-title');

// Start, autopilot day 1-3 for action, then capture the cover mid-fight.
await evalJs(`document.getElementById('start-btn').click()`);
await sleep(400);
await evalJs(`window.__HIVEWARDEN__.setAutopilot(true); window.__HIVEWARDEN__.setTimeScale(5)`);
// Let days 1-2 clear automatically (fork + upgrade auto-picked).
for (let i = 0; i < 90; i++) {
  await sleep(1000);
  const s = await state();
  if (s.mode === 'fork') {
    await evalJs(`window.__HIVEWARDEN__.autoFork()`);
    await sleep(600);
  }
  if (s.mode === 'play' && s.day === 3 && s.dayTime > 12) break;
  if (s.mode === 'victory' || s.mode === 'defeat') break;
}
await evalJs(`window.__HIVEWARDEN__.setTimeScale(1)`);
await sleep(1200);
// Only shoot the cover during real gameplay: if an overlay is still up
// (fork/upgrade/shop), wait for it to clear first — and prefer a moment
// with an enemy on screen so the fight reads.
for (let i = 0; i < 10; i++) {
  const ok = await evalJs(`(() => { const s = JSON.parse(window.render_game_to_text()); const overlay = ['fork-screen','upgrade-screen','shop-panel','pause-screen'].some(id => !document.getElementById(id).classList.contains('hidden')); return s.mode === 'play' && !overlay && s.enemies > 0; })()`);
  if (ok) break;
  await sleep(500);
}
await shot('01-cover');

// 03 — fork screen: clear the current day, then capture the fork.
await evalJs(`window.__HIVEWARDEN__.setTimeScale(5)`);
for (let i = 0; i < 120; i++) {
  await sleep(1000);
  const s = await state();
  if (s.mode === 'fork') break;
  if (s.mode === 'victory' || s.mode === 'defeat') break;
}
await evalJs(`window.__HIVEWARDEN__.setTimeScale(1)`);
await sleep(400);
await shot('03-fork');

// 04 — victory: jump to day 10 with a prepared loadout and win it for real.
await evalJs(`window.__HIVEWARDEN__.setAutopilot(false)`);
await evalJs(`
  const HW = window.__HIVEWARDEN__;
  HW.game.state.mode = 'play';
  HW.startDay(10);
  const st = HW.game.state;
  ['moreBees','moreBees','sharpStings','sharpStings','swiftWings','hiveArmor','longReach','quickHive'].forEach(k => HW.game.applyUpgrade(k));
  HW.giveHoney(200);
  st.relics.add('goldenComb'); st.relics.add('queensFavor');
`);
await evalJs(`window.__HIVEWARDEN__.setAutopilot(true); window.__HIVEWARDEN__.setTimeScale(5)`);
let won = false;
for (let i = 0; i < 240; i++) {
  await sleep(1000);
  const s = await state();
  if (s.mode === 'victory') { won = true; break; }
  if (s.mode === 'defeat') break;
}
await evalJs(`window.__HIVEWARDEN__.setTimeScale(1); window.__HIVEWARDEN__.setAutopilot(false)`);
if (!won) throw new Error('victory shot failed: day 10 was not won, mode=' + (await state()).mode);
await sleep(500);
await shot('04-victory');

console.log('console errors:', errors.length ? errors : 'none');
console.log(won ? 'SHOTS DONE' : 'SHOTS FAILED');
ws.close();
process.exit(errors.length || !won ? 1 : 0);
