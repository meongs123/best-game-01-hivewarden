// HIVEWARDEN — boot, game loop, state machine, test hooks.
// Single canvas + window.render_game_to_text + window.advanceTime(ms) per the
// develop-web-game skill, so the Playwright loop can step frames
// deterministically. Debug hooks live on window.__HIVEWARDEN__ (used by the
// verification tools, never by the game itself).
import { createState, startDay, update, endRun, victoryRank, applyRoad, applyUpgrade, buyRelic, buyConsumable, derived, commandSwarm, useSmoke, plantFlower } from './entities.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { createUI, buildBestiary } from './ui.js';
import { sfx } from './audio.js';
import { makeRng, hashString } from './rng.js';
import { DIFFICULTIES, SCORE } from './config.js';
import { DAYS } from './levels.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function resize() {
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  canvas.width = 1280;
  canvas.height = 720;
  canvas.style.width = `${Math.floor(1280 * scale)}px`;
  canvas.style.height = `${Math.floor(720 * scale)}px`;
}
window.addEventListener('resize', resize);
resize();

const input = createInput(canvas);
const game = {
  state: null,
  difficulty: DIFFICULTIES.hive,
  timeScale: 1,
  autopilot: false,
  autoT: 0,
  best: loadBest(),
  paused: false,
};
const ui = createUI(game);

function loadBest() {
  try {
    const raw = localStorage.getItem('hivewarden-best');
    if (raw) return JSON.parse(raw);
  } catch (_) { /* fresh start */ }
  return { score: 0, day: 0, wins: 0 };
}
function saveBest() {
  try { localStorage.setItem('hivewarden-best', JSON.stringify(game.best)); } catch (_) { /* ignore */ }
}

function newGame(difficultyKey, seed) {
  const diff = DIFFICULTIES[difficultyKey] || DIFFICULTIES.hive;
  game.difficulty = diff;
  const rng = makeRng(seed !== undefined ? seed : (Date.now() % 2147483647));
  const state = createState(diff, rng);
  state.muted = sfx.isMuted();
  game.state = state;
  state.dayDef = DAYS[0];
  ui.hideAll();
  ui.showTitle(game.best);
  setStatus('title');
}

function setStatus(mode) {
  if (statusEl) statusEl.textContent = `HIVEWARDEN mode=${mode} day=${game.state ? game.state.day : 0}`;
}

function startRun() {
  const state = game.state;
  state.mode = 'play';
  ui.hideAll();
  startDay(state, 1);
  setStatus('play');
  sfx.click();
}

function nextDay() {
  const state = game.state;
  if (state.day >= 10) {
    // Day 10 cleared: victory.
    endRun(state, 'victory');
    finishVictory();
    return;
  }
  // Hide the upgrade overlay before the next day starts — without this the
  // picked upgrade's screen stays on top of live gameplay.
  ui.hideAll();
  startDay(state, state.day + 1);
  setStatus('play');
}

function finishVictory() {
  const state = game.state;
  const rank = victoryRank(state);
  game.best.score = Math.max(game.best.score, state.score);
  game.best.day = 10;
  game.best.wins += 1;
  saveBest();
  sfx.victory();
  ui.showVictory(state, game.best, rank,
    () => newGame(game.difficulty.key),
    () => newGame(game.difficulty.key));
  setStatus('victory');
}

function finishDefeat() {
  const state = game.state;
  game.best.score = Math.max(game.best.score, state.score);
  game.best.day = Math.max(game.best.day, state.day);
  saveBest();
  sfx.defeat();
  ui.showDefeat(state, game.best,
    () => newGame(game.difficulty.key),
    () => newGame(game.difficulty.key));
  setStatus('defeat');
}

// --- flow wiring: the game object the UI calls back into ---
game.applyRoad = (road) => { applyRoad(game.state, road); sfx.click(); };
game.applyUpgrade = (key) => { applyUpgrade(game.state, key); sfx.honey(); };
game.buyRelic = (item) => { const ok = buyRelic(game.state, item); if (ok) sfx.honey(); return ok; };
game.buyConsumable = (item) => { const ok = buyConsumable(game.state, item); if (ok) sfx.honey(); return ok; };

// --- keyboard shortcuts ---
input.setKeyHandler((code, down) => {
  if (!down) return;
  const state = game.state;
  if (!state) return;
  if (code === 'KeyM') { sfx.setMuted(!sfx.isMuted()); state.muted = sfx.isMuted(); return; }
  if (code === 'KeyF') {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
    return;
  }
  if (code === 'KeyP' && (state.mode === 'play' || state.mode === 'paused')) {
    if (state.mode === 'play') { state.mode = 'paused'; ui.showPause(resume, () => newGame(game.difficulty.key), () => newGame(game.difficulty.key)); setStatus('paused'); }
    else resume();
    return;
  }
  if (code === 'Enter') {
    if (state.mode === 'title') startRun();
    else if (state.mode === 'victory') newGame(game.difficulty.key);
    else if (state.mode === 'defeat') newGame(game.difficulty.key);
  }
  if (code === 'KeyR' && (state.mode === 'victory' || state.mode === 'defeat')) newGame(game.difficulty.key);
});
function resume() {
  game.state.mode = 'play';
  ui.hideAll();
  setStatus('play');
}

// Title screen wiring.
document.getElementById('start-btn').addEventListener('click', startRun);
document.querySelectorAll('#difficulty-row button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#difficulty-row button').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    game.difficulty = DIFFICULTIES[btn.dataset.diff];
    sfx.click();
  });
});
document.getElementById('mute-btn').addEventListener('click', (ev) => {
  sfx.setMuted(!sfx.isMuted());
  ev.target.textContent = sfx.isMuted() ? '🔇 Sound: off' : '🔊 Sound: on';
});
document.getElementById('shake-btn').addEventListener('click', (ev) => {
  game.state.shakeOn = !game.state.shakeOn;
  ev.target.textContent = game.state.shakeOn ? '📳 Shake: on' : '📳 Shake: off';
});
buildBestiary();

// --- autopilot (verification only): plays the game with a simple policy ---
// Hold near the hive (the thing that must survive), send the swarm at the
// nearest threat to the hive (bosses first), smoke crowds, plant flowers.
function autopilotInput(state, dt) {
  game.autoT += dt;
  const w = state.warden;
  const keys = new Set();
  // Threat order: boss first, then nearest to the hive.
  let target = state.enemies.find((e) => e.isBoss) || null;
  if (!target) {
    let bestD = Infinity;
    for (const e of state.enemies) {
      const d = Math.hypot(e.x - 640, e.y - 380);
      if (d < bestD) { bestD = d; target = e; }
    }
  }
  // Warden holds a guard post ~140px from the hive toward the threat.
  let gx = 640, gy = 520;
  if (target) {
    const dx = target.x - 640, dy = target.y - 380;
    const d = Math.hypot(dx, dy) || 1;
    gx = 640 + (dx / d) * 140;
    gy = 380 + (dy / d) * 140;
  }
  // Flee: if anything is right on top of the warden, run straight away from it.
  let flee = null;
  let fleeD = 80;
  for (const e of state.enemies) {
    const d = Math.hypot(e.x - w.x, e.y - w.y);
    if (d < fleeD) { fleeD = d; flee = e; }
  }
  if (flee) {
    const dx = w.x - flee.x, dy = w.y - flee.y;
    const d = Math.hypot(dx, dy) || 1;
    gx = w.x + (dx / d) * 120;
    gy = w.y + (dy / d) * 120;
  }
  const dx = gx - w.x, dy = gy - w.y;
  const d = Math.hypot(dx, dy);
  if (d > 12) {
    const nx = dx / d, ny = dy / d;
    if (nx < -0.3) keys.add('KeyA');
    if (nx > 0.3) keys.add('KeyD');
    if (ny < -0.3) keys.add('KeyW');
    if (ny > 0.3) keys.add('KeyS');
  }
  const fake = {
    keys,
    mouse: { x: 640, y: 360, down: false, clicked: false, clickX: 0, clickY: 0 },
    moveVector() {
      let x = 0, y = 0;
      if (keys.has('KeyA')) x -= 1;
      if (keys.has('KeyD')) x += 1;
      if (keys.has('KeyW')) y -= 1;
      if (keys.has('KeyS')) y += 1;
      if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
    pressed(code) { return keys.has(code); },
    takeClick() { return null; },
  };
  // Command the swarm at the threat every 0.4s.
  if (target && game.autoT > 0.4) {
    game.autoT = 0;
    commandSwarm(state, target.x, target.y);
  }
  // Smoke when 3+ wasps/hornets crowd the hive.
  const crowd = state.enemies.filter((e) => (e.kind === 'wasp' || e.kind === 'hornet' || e.isBoss) && Math.hypot(e.x - 640, e.y - 380) < 220).length;
  if (crowd >= 3) keys.add('Space');
  // Plant a flower when affordable and room allows.
  if (state.honey >= 10 && state.flowers.length < 6) keys.add('KeyE');
  return fake;
}

// --- main loop: fixed timestep, hit-stop slows the sim ---
let last = performance.now();
let acc = 0;
const STEP = 1 / 60;
function frame(now) {
  requestAnimationFrame(frame);
  const state = game.state;
  if (!state) return;
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  // Hit-stop: freeze the sim briefly on big impacts (visual only).
  if (state.fx.hitstop > 0) dt *= 0.12;
  acc += dt * game.timeScale;
  let steps = 0;
  while (acc >= STEP && steps < 8) {
    const inp = game.autopilot && state.mode === 'play' ? autopilotInput(state, STEP) : input;
    const prevMode = state.mode;
    update(state, STEP, inp);
    acc -= STEP;
    steps++;
    // Mode transitions the loop must surface.
    if (state.mode === 'fork' && prevMode === 'play') {
      sfx.dayClear();
      ui.showFork(state, () => {
        ui.showUpgrade(state, () => { nextDay(); });
      });
      setStatus('fork');
    } else if (state.mode === 'defeat' && prevMode === 'play') {
      finishDefeat();
    } else if (state.mode === 'victory' && prevMode === 'play') {
      finishVictory();
    }
  }
  render(state, ctx, now / 1000);
}

// --- test hooks (develop-web-game skill) ---
window.render_game_to_text = () => {
  const s = game.state;
  if (!s) return JSON.stringify({ mode: 'boot' });
  const near = s.enemies.slice(0, 6).map((e) => ({ kind: e.kind, boss: !!e.isBoss, x: Math.round(e.x), y: Math.round(e.y), hp: Math.ceil(e.hp) }));
  return JSON.stringify({
    mode: s.mode,
    day: s.day,
    dayTime: Math.round(s.dayTime * 10) / 10,
    warden: { x: Math.round(s.warden.x), y: Math.round(s.warden.y), hp: s.warden.hp, maxHp: s.warden.maxHp },
    hive: { hp: Math.ceil(s.hive.hp), maxHp: s.hive.maxHp },
    bees: s.bees.list.length,
    beeCap: s.bees.cap,
    honey: Math.floor(s.honey),
    score: s.score,
    chain: s.chain,
    enemies: s.enemies.length,
    near,
    flowers: s.flowers.length,
    smokeCd: Math.round(s.smoke.cd * 10) / 10,
    upgrades: s.upgrades,
    relics: [...s.relics],
    stats: s.stats,
  });
};

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i++) {
    const state = game.state;
    if (!state) break;
    const inp = game.autopilot && state.mode === 'play' ? autopilotInput(state, STEP) : input;
    const prevMode = state.mode;
    update(state, STEP, inp);
    if (state.mode === 'fork' && prevMode === 'play') {
      ui.showFork(state, () => { ui.showUpgrade(state, () => { nextDay(); }); });
      setStatus('fork');
    } else if (state.mode === 'defeat' && prevMode === 'play') finishDefeat();
    else if (state.mode === 'victory' && prevMode === 'play') finishVictory();
  }
  render(game.state, ctx, performance.now() / 1000);
};

window.__HIVEWARDEN__ = {
  game,
  state: () => game.state,
  newGame: (diff, seed) => newGame(diff, seed),
  startRun,
  setTimeScale(n) { game.timeScale = n; },
  setAutopilot(on) { game.autopilot = !!on; },
  // autoFork: pick the fork road + upgrade by a simple sensible policy, so
  // verification runs play like a decent human instead of always taking the
  // free road and the first card. Repair when hurt, buy when rich, else rest.
  autoFork() {
    const st = game.state;
    if (st.mode !== 'fork') return 'not-fork';
    // Only act while the fork screen itself is showing. Once a road is
    // picked the upgrade/shop screen opens (mode is still 'fork') — a second
    // call must not re-click a hidden road card or schedule a second pick.
    if (document.getElementById('fork-screen').classList.contains('hidden')) return 'awaiting-choice';
    const hurt = st.warden.hp < st.warden.maxHp || st.hive.hp < st.hive.maxHp * 0.7;
    const road = hurt && st.honey >= 20 ? 'shrine'
      : st.hive.hp < st.hive.maxHp * 0.7 && st.honey >= 15 ? 'market' : 'quiet';
    const cards = [...document.querySelectorAll('#fork-cards .card')];
    const pick = cards.find((b) => b.textContent.includes(road === 'shrine' ? 'Shrine' : road === 'market' ? 'Market' : 'Quiet Meadow'));
    if (!pick) return 'no-card';
    pick.click();
    if (road === 'market') {
      // Buy mending if the hive is hurt, else the first affordable item.
      setTimeout(() => {
        const items = [...document.querySelectorAll('#shop-items .shop-item')].filter((b) => !b.disabled);
        const mending = items.find((b) => b.textContent.includes('Mending'));
        (mending || items[0])?.click();
        setTimeout(() => document.getElementById('shop-done')?.click(), 50);
      }, 80);
      return 'market';
    }
    // After the road, the upgrade screen opens: pick by priority.
    const names = ['More Bees', 'Sharp Stings', 'Hive Armor', 'Sturdy Warden', 'Swift Wings', 'Long Reach', 'Quick Hive', 'Wide Smoke', 'Cool Smoke', 'Rich Blooms', 'Honey Magnet', 'Chain Keeper'];
    setTimeout(() => {
      const ups = [...document.querySelectorAll('#upgrade-cards .card')];
      if (!ups.length) return;
      const nameIdx = (btn) => {
        const t = btn.textContent;
        for (let i = 0; i < names.length; i++) if (t.includes(names[i])) return i;
        return 99;
      };
      ups.sort((a, b) => nameIdx(a) - nameIdx(b));
      ups[0].click();
    }, 120);
    return road;
  },
  teleport(x, y) { game.state.warden.x = x; game.state.warden.y = y; },
  startDay(n) { startDay(game.state, n); game.state.mode = 'play'; },
  giveHoney(n) { game.state.honey += n; },
  // Deterministic run: fixed seed + fixed scripted inputs for N ticks, then a
  // hash of the resulting state. Two runs with the same seed must match.
  runDeterministic(seed = 'hivewarden-det', ticks = 3600) {
    const rng = makeRng(seed);
    const st = createState(DIFFICULTIES.hive, rng);
    startDay(st, 1);
    const script = [
      { at: 30, act: 'rally', x: 640, y: 300 },
      { at: 240, act: 'rally', x: 500, y: 300 },
      { at: 480, act: 'smoke' },
      { at: 600, act: 'rally', x: 800, y: 300 },
      { at: 900, act: 'flower' },
      { at: 1200, act: 'rally', x: 640, y: 200 },
      { at: 1800, act: 'smoke' },
      { at: 2400, act: 'rally', x: 300, y: 500 },
      { at: 3000, act: 'rally', x: 900, y: 500 },
    ];
    const fakeInput = {
      keys: new Set(), mouse: { x: 640, y: 360, down: false, clicked: false, clickX: 0, clickY: 0 },
      moveVector: () => ({ x: 0, y: 0 }),
      pressed: () => false,
      takeClick: () => null,
    };
    let si = 0;
    for (let t = 0; t < ticks; t++) {
      while (si < script.length && script[si].at === t) {
        const a = script[si++];
        if (a.act === 'rally') commandSwarm(st, a.x, a.y);
        if (a.act === 'smoke') useSmoke(st);
        if (a.act === 'flower') { st.honey += 20; plantFlower(st); }
      }
      if (st.mode === 'play') update(st, STEP, fakeInput);
      else break;
    }
    const snap = JSON.stringify({
      mode: st.mode, day: st.day, score: st.score, honey: Math.floor(st.honey),
      warden: [Math.round(st.warden.x), Math.round(st.warden.y), st.warden.hp],
      hive: Math.ceil(st.hive.hp),
      bees: st.bees.list.length,
      enemies: st.enemies.map((e) => [e.kind, Math.round(e.x), Math.round(e.y), Math.ceil(e.hp)]),
      flowers: st.flowers.length, banished: st.stats.banished,
    });
    return { hash: hashString(snap).toString(16), snap: snap.slice(0, 400) };
  },
};

newGame('hive');
requestAnimationFrame(frame);
