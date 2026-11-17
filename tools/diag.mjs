// Quick diagnostic: load the page, print every console message + exception.
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
  if (m.method === 'Runtime.exceptionThrown') console.log('EXCEPTION:', JSON.stringify(m.params.exceptionDetails, null, 1).slice(0, 1500));
  if (m.method === 'Runtime.consoleAPICalled') console.log('CONSOLE', m.params.type + ':', m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 500));
  if (m.method === 'Network.loadingFailed') console.log('NETFAIL:', m.params.errorText, m.params.type);
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) console.log('HTTP', m.params.response.status, m.params.response.url);
};
function send(method, params = {}) {
  return new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
}
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  return r.result?.result?.value ?? JSON.stringify(r.result?.exceptionDetails || r.result).slice(0, 500);
}
await send('Runtime.enable');
await send('Page.enable');
await send('Network.enable');
await send('Network.clearBrowserCache');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:8901/' });
await sleep(2500);
console.log('render_game_to_text:', await evalJs('typeof window.render_game_to_text'));
console.log('__HIVEWARDEN__:', await evalJs('typeof window.__HIVEWARDEN__'));
console.log('state:', await evalJs('window.render_game_to_text ? window.render_game_to_text().slice(0,200) : "n/a"'));
ws.close();
process.exit(0);
