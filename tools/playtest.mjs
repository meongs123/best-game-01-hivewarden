// HIVEWARDEN — headless playtest via Chrome DevTools Protocol (dev tool).
// Drives the real game in headless Chrome: title → start (real Enter key),
// WASD movement, mouse swarm order, Space smoke, E flower, then a bot
// playthrough of all 10 days through the in-page debug hooks.
// Captures console errors and external network requests (must be zero).
// Run: node tools/playtest.mjs [port]  (expects serve.ts on :8901 and Chrome
// headless-shell with --remote-debugging-port=9222 already running)
import { writeFileSync } from 'node:fs';

const PORT = 9222;
const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
function check(name, cond, extra) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page');
if (!page) throw new Error('no page target');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let id = 0;
const pending = new Map();
const errors = [];
const requests = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push('EXCEPTION: ' + JSON.stringify(m.params.exceptionDetails).slice(0, 300));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('CONSOLE: ' + m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 300));
  if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
  if (m.method === 'Network.loadingFailed') errors.push('NETFAIL: ' + m.params.errorText);
};
function send(method, params = {}) {
  return new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
}
async function evalJs(expr, awaitPromise = false) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise });
  if (r.result?.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 500));
  return r.result?.result?.value;
}
async function key(type, code, keyName) {
  await send('Input.dispatchKeyEvent', { type, code, key: keyName, windowsVirtualKeyCode: 0 });
}
async function tapKey(code, keyName) {
  await key('keyDown', code, keyName);
  await sleep(60);
  await key('keyUp', code, keyName);
}
async function mouse(type, x, y, button = 'left') {
  await send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: type === 'mousePressed' ? 1 : 0 });
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`/tmp/hive-test-${name}.png`, Buffer.from(r.result.data, 'base64'));
}
const state = async () => JSON.parse(await evalJs('window.render_game_to_text()'));

await send('Runtime.enable');
await send('Page.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '/?seed=7' });
await sleep(2000);

console.log('== SCENARIO A — real input ==');
let st = await state();
check('title screen loads', st.mode === 'title', 'mode=' + st.mode);
await shot('a-title');
check('title renders (canvas non-blank)', await evalJs(`(() => { const c = document.getElementById('game'); const x = c.getContext('2d'); const d = x.getImageData(0, 0, 1280, 720).data; let sum = 0; for (let i = 0; i < d.length; i += 401) sum += d[i] + d[i+1] + d[i+2]; return sum > 100000; })()`), 'pixel sum check');

// Start with Enter (real key).
await tapKey('Enter', 'Enter');
await sleep(300);
st = await state();
check('Enter starts day 1', st.mode === 'playing' && st.day === 1, 'mode=' + st.mode + ' day=' + st.day);

// Move with WASD: hold D for ~1s via real key events, keeper must move right.
const x0 = st.keeper.x;
await key('keyDown', 'KeyD', 'd');
await sleep(1000);
await key('keyUp', 'KeyD', 'd');
st = await state();
check('WASD moves keeper right', st.keeper.x > x0 + 100, `x ${x0} -> ${st.keeper.x}`);

// Mouse order: click at a point; swarm target set (bees move toward it).
await mouse('mousePressed', 900, 300);
await mouse('mouseReleased', 900, 300);
await sleep(800);
st = await state();
check('mouse click orders swarm (bees respond)', st.bees > 0, 'bees=' + st.bees);
await shot('a-play');

// Smoke with Space: cooldown must engage.
await tapKey('Space', ' ');
await sleep(200);
st = await state();
check('Space triggers smoke cooldown', st.smokeCd > 5, 'smokeCd=' + st.smokeCd);

// Flower with E: needs 15 honey — grant via debug state, then plant.
await evalJs(`(() => { window.__hive.state.honey = 50; })()`);
await tapKey('KeyE', 'e');
await sleep(200);
st = await state();
check('E plants a flower (honey spent)', st.flowers === 1 && st.honey < 50, `flowers=${st.flowers} honey=${st.honey}`);

// Pause / resume with P.
await tapKey('KeyP', 'p');
await sleep(200);
st = await state();
check('P pauses', st.mode === 'paused', 'mode=' + st.mode);
await tapKey('KeyP', 'p');
await sleep(200);
st = await state();
check('P resumes', st.mode === 'playing', 'mode=' + st.mode);

console.log('== SCENARIO B — bot playthrough, all 10 days (in-page) ==');
const botFn = `(() => {
  const H = window.__hive;
  const results = [];
  // Fresh run, Hive difficulty, seed 7 (page was loaded with ?seed=7).
  H.startRun();
  const input = {
    keys: new Set(),
    mouse: { down: false, x: 640, y: 360 },
    held: function (...names) { return names.some((n) => this.keys.has(n)); },
    consumeClick: () => false,
  };
  H.setTestInput(input);
  function botStep() {
    const g = H.state;
    let target = null, best = Infinity;
    for (const e of g.enemies) {
      const dh = Math.hypot(e.x - g.hive.x, e.y - g.hive.y);
      const sc = dh - (e.boss ? 400 : 0);
      if (sc < best) { best = sc; target = e; }
    }
    if (target) { input.mouse.x = target.x; input.mouse.y = target.y; input.mouse.down = true; }
    else input.mouse.down = false;
    let kx = g.hive.x, ky = g.hive.y + 260;
    let crowded = 0;
    for (const e of g.enemies) if (Math.hypot(e.x - g.keeper.x, e.y - g.keeper.y) < 160) crowded++;
    if (g.keeper.hp <= 1 || crowded >= 5) {
      let cx = 0, cy = 0, n = 0;
      for (const e of g.enemies) { cx += e.x; cy += e.y; n++; }
      if (n > 0) { const a = Math.atan2(g.hive.y - cy / n, g.hive.x - cx / n); kx = g.hive.x + Math.cos(a) * 120; ky = g.hive.y + Math.sin(a) * 120; }
    } else if (target) {
      const a = Math.atan2(target.y - g.hive.y, target.x - g.hive.x);
      kx = g.hive.x + Math.cos(a) * 170; ky = g.hive.y + Math.sin(a) * 170;
    }
    input.keys.clear();
    const dx = kx - g.keeper.x, dy = ky - g.keeper.y;
    if (dx < -8) input.keys.add('a');
    if (dx > 8) input.keys.add('d');
    if (dy < -8) input.keys.add('w');
    if (dy > 8) input.keys.add('s');
    if (crowded >= 3 && g.smokeCd <= 0) H.useSmoke();
    if (g.honey >= 15) H.plantFlower();
  }
  let steps = 0;
  const maxSteps = 60 * 60 * 30;
  while (H.state.mode !== 'victory' && H.state.mode !== 'defeat' && steps < maxSteps) {
    const g = H.state;
    if (g.mode === 'playing') { botStep(); H.step(1 / 60); steps++; }
    else if (g.mode === 'dayclear') {
      results.push({ day: g.day, time: +g.time.toFixed(1), banished: g.banished, quota: g.quota, hiveHp: Math.round(g.hive.hp), keeperHp: g.keeper.hp, bees: g.beeCount, honey: Math.round(g.honey), score: g.score });
      g.mode = 'upgrade';
      H.chooseUpgrade(0);
      const qi = g.forkOffers.findIndex((f) => f.id === 'quiet');
      H.chooseFork(qi >= 0 ? qi : 0);
    }
    else if (g.mode === 'upgrade') H.chooseUpgrade(0);
    else if (g.mode === 'fork') { const qi = g.forkOffers.findIndex((f) => f.id === 'quiet'); H.chooseFork(qi >= 0 ? qi : 0); }
    else if (g.mode === 'market') { for (let i = 0; i < g.marketWares.length; i++) H.buyMarket(i); H.marketContinue(); }
    else break;
  }
  H.clearTestInput();
  H.render();
  const g = H.state;
  return { results, mode: g.mode, rank: g.victoryRank, score: g.score, day: g.day, reason: g.defeatReason || null, steps };
})()`;
const bot = await evalJs(botFn, true);
console.log('bot mode:', bot.mode, 'rank:', bot.rank, 'score:', bot.score, 'steps:', bot.steps);
for (const r of bot.results) {
  console.log(`  day ${r.day}: WIN ${r.time}s banished ${r.banished}/${r.quota} hive ${r.hiveHp} keeper ${r.keeperHp} bees ${r.bees} honey ${r.honey} score ${r.score}`);
}
check('bot wins all 10 days in the real browser', bot.mode === 'victory' && bot.results.length === 9, `mode=${bot.mode} dayclears=${bot.results.length}`);
check('victory rank assigned', !!bot.rank, 'rank=' + bot.rank);
await shot('b-victory');
st = await state();
check('victory screen state', st.mode === 'victory', 'mode=' + st.mode);

console.log('== ERRORS / NETWORK ==');
const external = requests.filter((u) => !u.startsWith('http://127.0.0.1') && !u.startsWith('data:') && !u.startsWith('blob:'));
console.log('requests total:', requests.length, 'external:', external.length);
if (external.length > 0) console.log('external URLs:', external.slice(0, 5));
check('zero external network requests', external.length === 0);
console.log('console errors:', errors.length);
errors.slice(0, 5).forEach((e) => console.log('  ', e));
check('zero console errors/exceptions', errors.length === 0);

console.log('\nPLAYTEST FAILURES:', failures);
process.exit(failures > 0 ? 1 : 0);
