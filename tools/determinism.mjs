// HIVEWARDEN — determinism check (dev tool, not part of the game).
// Runs the same seeded, scripted scenario twice through
// window.__HIVEWARDEN__.runDeterministic and compares the state hashes.
// Prints a sha256 of the two hashes; identical hashes = deterministic.
// Run: node tools/determinism.mjs (serve.mjs on :8901 + headless-shell :9333)
import { createHash } from 'node:crypto';

const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page');
if (!page) throw new Error('no page target');
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

await send('Runtime.enable');
await send('Page.enable');
await send('Network.clearBrowserCache');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:8901/' });
await sleep(1500);

const a = await evalJs(`window.__HIVEWARDEN__.runDeterministic('hivewarden-det', 3600)`);
const b = await evalJs(`window.__HIVEWARDEN__.runDeterministic('hivewarden-det', 3600)`);
console.log('run 1 hash:', a.hash);
console.log('run 2 hash:', b.hash);
console.log('run 1 snapshot:', a.snap);
const combined = createHash('sha256').update(a.hash + '|' + b.hash).digest('hex');
console.log('sha256(run1|run2):', combined);
console.log(a.hash === b.hash ? 'DETERMINISM PASS: two runs byte-identical' : 'DETERMINISM FAIL: runs differ');
ws.close();
process.exit(a.hash === b.hash ? 0 : 1);
