// HIVEWARDEN — screenshots (dev tool).
// Captures the 4 required 1280x720 shots via ?shot= staging:
// 01 title, 02 mid-day gameplay, 03 The Meadow's Fork, 04 victory screen.
// The victory shot is staged (buffed state, see sim.js stageShot) —
// documented in dossier.json. All shots are JPEG, target <= 256 KiB.
// Run: node tools/shots.mjs  (expects serve.ts on :8080 and Chrome
// headless-shell with --remote-debugging-port=9222 already running)
import { writeFileSync, mkdirSync, statSync } from 'node:fs';

const PORT = 9222;
const BASE = process.argv[2] || 'http://127.0.0.1:8080';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = [
  { name: '01-title', url: '/?shot=title&seed=1', note: 'title screen, difficulty select' },
  { name: '02-play', url: '/?shot=play&seed=1', note: 'mid-day gameplay, day 5 orchard, swarm vs wasps' },
  { name: '03-fork', url: '/?shot=fork&seed=1', note: "The Meadow's Fork choice" },
  { name: '04-victory', url: '/?shot=victory&seed=1', note: 'victory screen, S rank (staged)' },
];
mkdirSync('screenshots', { recursive: true });

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page');
if (!page) throw new Error('no page target');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let id = 0;
const pending = new Map();
const errors = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(m.params.exceptionDetails).slice(0, 200));
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value || '').join(' ').slice(0, 200));
};
function send(method, params = {}) {
  return new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
}
await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

let failures = 0;
for (const s of SHOTS) {
  // Fresh profile for the title shot so it shows the first-run state.
  if (s.name === '01-title') {
    await send('Page.navigate', { url: BASE + s.url });
    await sleep(1500);
    await send('Runtime.evaluate', { expression: 'localStorage.clear()' });
    await send('Page.navigate', { url: BASE + s.url });
  } else {
    await send('Page.navigate', { url: BASE + s.url });
  }
  await sleep(2500);
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 85 });
  const buf = Buffer.from(r.result.data, 'base64');
  const path = `screenshots/${s.name}.jpg`;
  writeFileSync(path, buf);
  const kb = Math.round(buf.length / 1024);
  const ok = kb <= 256;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${path} ${kb} KiB (${s.note})`);
}
console.log('console errors during shots:', errors.length);
errors.slice(0, 5).forEach((e) => console.log('  ', e));
if (errors.length > 0) failures++;
console.log('SHOTS FAILURES:', failures);
process.exit(failures > 0 ? 1 : 0);
