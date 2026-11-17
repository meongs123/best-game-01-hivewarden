// HIVEWARDEN — bootstrap, game loop, screen routing, test hooks.
// Original game, written from scratch for best-game-01.
import { VIEW } from './data.js';
import {
  createGame, startDay, update, orderSwarm, useSmoke, plantFlower,
  chooseUpgrade, chooseFork, buyMarket, marketContinue, stageShot, stateText,
} from './sim.js';
import { render } from './render.js';
import { createInput } from './input.js';
import { loadBest, recordRun } from './save.js';
import { setMuted, isMuted, sfx } from './audio.js';

const canvas = document.getElementById('game');
canvas.width = VIEW.w;
canvas.height = VIEW.h;
const ctx = canvas.getContext('2d');
const input = createInput(canvas);

const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');
const shotParam = params.get('shot');
const SEED = seedParam ? (parseInt(seedParam, 10) >>> 0) : ((Math.random() * 0xffffffff) >>> 0);

let game = createGame(SEED, 'hive');
game.titleDifficulty = 'hive';
let best = loadBest();
let runRecorded = false;
let testInput = null;

function recordOnce() {
  if (runRecorded) return;
  runRecorded = true;
  best = recordRun({
    score: game.score,
    dayReached: game.day,
    victory: game.mode === 'victory',
    banished: game.tally.banishedTotal,
    bestChain: game.bestChain,
  });
}

// ---------------------------------------------------------------------------
// Screen click routing (canvas coordinates, 1280x720 logical)
// ---------------------------------------------------------------------------
function inRect(x, y, rx, ry, rw, rh) {
  return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

function handleClick(x, y) {
  const m = game.mode;
  if (m === 'title') {
    const diffs = ['clover', 'hive', 'swarm'];
    for (let i = 0; i < 3; i++) {
      if (inRect(x, y, VIEW.w / 2 - 330 + i * 230, 466, 210, 52)) {
        game.titleDifficulty = diffs[i];
        sfx.click();
        return;
      }
    }
    if (inRect(x, y, VIEW.w / 2 - 130, 566, 260, 56)) {
      startRun();
    }
    return;
  }
  if (m === 'dayclear') {
    game.mode = 'upgrade';
    sfx.click();
    return;
  }
  if (m === 'upgrade') {
    for (let i = 0; i < 3; i++) {
      if (inRect(x, y, VIEW.w / 2 - 540 + i * 370, 220, 340, 220)) {
        if (chooseUpgrade(game, i)) sfx.upgrade();
        return;
      }
    }
    return;
  }
  if (m === 'fork') {
    for (let i = 0; i < 3; i++) {
      if (inRect(x, y, VIEW.w / 2 - 540 + i * 370, 220, 340, 220)) {
        if (chooseFork(game, i)) sfx.click();
        return;
      }
    }
    return;
  }
  if (m === 'market') {
    for (let i = 0; i < game.marketWares.length; i++) {
      const wx = VIEW.w / 2 - 460 + (i % 2) * 470;
      const wy = 180 + Math.floor(i / 2) * 150;
      if (inRect(x, y, wx, wy, 450, 120)) {
        if (buyMarket(game, i)) sfx.honey();
        return;
      }
    }
    if (inRect(x, y, VIEW.w / 2 - 110, 540, 220, 52)) {
      if (marketContinue(game)) sfx.click();
    }
    return;
  }
  if (m === 'victory' || m === 'defeat') {
    // Any click returns to the title screen.
    backToTitle();
    return;
  }
}

function startRun() {
  game = createGame(SEED, game.titleDifficulty || 'hive');
  game.titleDifficulty = game.difficulty;
  runRecorded = false;
  best = loadBest();
  startDay(game);
  sfx.dayClear();
}

function backToTitle() {
  recordOnce();
  game = createGame(SEED, game.titleDifficulty || 'hive');
  game.titleDifficulty = game.difficulty;
  runRecorded = false;
  best = loadBest();
}

// ---------------------------------------------------------------------------
// Discrete key actions
// ---------------------------------------------------------------------------
input.setKeyDownHandler((k) => {
  const m = game.mode;
  if (k === 'm') {
    setMuted(!isMuted());
    return;
  }
  if (m === 'title') {
    if (k === 'enter' || k === ' ') startRun();
    if (k === '1') game.titleDifficulty = 'clover';
    if (k === '2') game.titleDifficulty = 'hive';
    if (k === '3') game.titleDifficulty = 'swarm';
    return;
  }
  if (m === 'playing') {
    if (k === ' ') {
      if (useSmoke(game)) sfx.smoke();
    }
    if (k === 'e') {
      if (plantFlower(game)) sfx.flower();
    }
    if (k === 'p' || k === 'escape') {
      game.mode = 'paused';
      sfx.click();
    }
    if (k === 'r') {
      startDay(game);
    }
    return;
  }
  if (m === 'paused') {
    if (k === 'p' || k === 'escape') game.mode = 'playing';
    if (k === 'r') startDay(game);
    return;
  }
  if (m === 'dayclear') {
    if (k === 'enter' || k === ' ') game.mode = 'upgrade';
    return;
  }
  if (m === 'upgrade') {
    if (k === '1' || k === '2' || k === '3') {
      if (chooseUpgrade(game, parseInt(k, 10) - 1)) sfx.upgrade();
    }
    return;
  }
  if (m === 'fork') {
    if (k === '1' || k === '2' || k === '3') {
      if (chooseFork(game, parseInt(k, 10) - 1)) sfx.click();
    }
    return;
  }
  if (m === 'market') {
    if (k === '1' || k === '2' || k === '3' || k === '4') {
      if (buyMarket(game, parseInt(k, 10) - 1)) sfx.honey();
    }
    if (k === 'enter') {
      if (marketContinue(game)) sfx.click();
    }
    return;
  }
  if (m === 'victory' || m === 'defeat') {
    if (k === 'r' || k === 'enter' || k === ' ') backToTitle();
    return;
  }
});

// ---------------------------------------------------------------------------
// Main loop (fixed timestep, 60 Hz)
// ---------------------------------------------------------------------------
const DT = 1 / 60;
let acc = 0;
let last = performance.now();

function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += elapsed;
  let steps = 0;
  while (acc >= DT && steps < 5) {
    step(DT);
    acc -= DT;
    steps++;
  }
  render(ctx, game, best);
  requestAnimationFrame(frame);
}

function step(dt) {
  // Clicks route by mode; in playing mode the sim consumes mouse input.
  if (input.consumeClick()) {
    const x = input.mouse.clickX;
    const y = input.mouse.clickY;
    if (game.mode === 'playing') {
      orderSwarm(game, x, y);
    } else {
      handleClick(x, y);
    }
  }
  if (game.mode === 'victory' || game.mode === 'defeat') recordOnce();
  update(game, dt, testInput || input);
}

requestAnimationFrame(frame);

// ---------------------------------------------------------------------------
// Test hooks (used by the CDP playtest + determinism check)
// ---------------------------------------------------------------------------
window.render_game_to_text = () => stateText(game);
window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i++) step(1 / 60);
  render(ctx, game, best);
};
window.__hive = {
  get state() {
    return game;
  },
  startRun,
  backToTitle,
  step: (dt) => step(dt || 1 / 60),
  render: () => render(ctx, game, best),
  // Test hook: when set, the sim reads this input instead of the real
  // DOM input (used by the headless bot playthrough; real-input tests
  // use the DOM path and leave this unset).
  setTestInput: (t) => { testInput = t; },
  clearTestInput: () => { testInput = null; },
  orderSwarm: (x, y) => orderSwarm(game, x, y),
  useSmoke: () => useSmoke(game),
  plantFlower: () => plantFlower(game),
  chooseUpgrade: (i) => chooseUpgrade(game, i),
  chooseFork: (i) => chooseFork(game, i),
  buyMarket: (i) => buyMarket(game, i),
  marketContinue: () => marketContinue(game),
  setMode: (m) => { game.mode = m; },
  setSeed: (seed) => {
    game = createGame(seed >>> 0, game.difficulty);
    game.titleDifficulty = game.difficulty;
    runRecorded = false;
  },
};

// ---------------------------------------------------------------------------
// Screenshot staging (?shot=title|play|fork|victory|defeat&seed=)
// ---------------------------------------------------------------------------
if (shotParam) {
  stageShot(game, shotParam);
  if (shotParam === 'play') {
    // Let the staged mid-day scene settle a few frames for the screenshot.
    for (let i = 0; i < 30; i++) step(1 / 60);
  }
  render(ctx, game, best);
}
