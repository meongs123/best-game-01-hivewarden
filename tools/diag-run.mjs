// Diagnostic: autopilot a full run, logging warden/hive/bees/enemies every 5s
// and the defeat cause, to find out what kills the day-7 run.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const page = list.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
function send(method, params = {}) {
  return new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
}
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300));
  return r.result?.result?.value;
}
const state = async () => JSON.parse(await evalJs('window.render_game_to_text()'));
await send('Runtime.enable');
await send('Page.enable');
await send('Network.clearBrowserCache');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:8901/' });
await sleep(1500);
await evalJs(`document.getElementById('start-btn').click()`);
await sleep(300);
await evalJs(`window.__HIVEWARDEN__.setAutopilot(true); window.__HIVEWARDEN__.setTimeScale(6)`);
let lastDay = 0;
for (let i = 0; i < 400; i++) {
  await sleep(1000);
  const s = await state();
  if (s.day !== lastDay) {
    console.log(`--- day ${s.day} starts: warden ${s.warden.hp}/${s.warden.maxHp} hive ${s.hive.hp}/${s.hive.maxHp} bees ${s.bees}/${s.beeCap} honey ${s.honey} score ${s.score} upgrades ${JSON.stringify(s.upgrades)}`);
    lastDay = s.day;
  }
  if (i % 5 === 0) {
    console.log(`t=${i}s day=${s.day} mode=${s.mode} warden=${s.warden.hp} hive=${Math.ceil(s.hive.hp)} bees=${s.bees} enemies=${s.enemies} honey=${s.honey} score=${s.score}`);
  }
  if (s.mode === 'fork') {
    await evalJs(`window.__HIVEWARDEN__.autoFork()`);
    await sleep(600);
  } else if (s.mode === 'victory') { console.log('VICTORY score=' + s.score); break; }
  else if (s.mode === 'defeat') {
    const cause = await evalJs(`document.getElementById('defeat-cause').textContent`);
    console.log('DEFEAT day=' + s.day + ' cause: ' + cause + ' score=' + s.score);
    break;
  }
}
ws.close();
process.exit(0);
