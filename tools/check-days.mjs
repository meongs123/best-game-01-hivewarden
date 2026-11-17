// HIVEWARDEN — day reachability audit (dev tool, not part of the game).
// 1) Static audit: every day's quota must be reachable from its spawn
//    budget (waves + trickle) on every difficulty.
// 2) Bot playthrough: a scripted keeper plays all 10 days through the
//    REAL simulation (same code the browser runs) and must win every day.
// Run: node tools/check-days.mjs [seed]
import { createGame, startDay, update, useSmoke, plantFlower, chooseUpgrade, chooseFork, buyMarket, marketContinue, computeStats } from '../game/src/sim.js';
import { DAYS, DIFFICULTIES, ENEMIES } from '../game/src/data.js';

const seed = Number(process.argv[2] || 1);
let failures = 0;

// ---------------------------------------------------------------- static audit
console.log('== STATIC AUDIT ==');
for (const plan of DAYS) {
  const waveTotal = plan.waves.reduce((n, w) => n + w[2], 0);
  const bossExtra = plan.boss ? 1 : 0;
  for (const [did, d] of Object.entries(DIFFICULTIES)) {
    const quota = Math.max(1, Math.round(plan.quota * d.quotaMul));
    const budget = Math.round(plan.spawnBudget * d.spawnMul);
    const ok = budget >= quota + 2;
    if (!ok) {
      failures++;
      console.log(`FAIL day ${plan.day} (${did}): quota ${quota} > budget ${budget}`);
    }
    // Trickle must be able to cover the gap between waves and quota.
    const waveShort = quota - waveTotal - bossExtra;
    if (waveShort > 6) {
      console.log(`NOTE day ${plan.day} (${did}): waves+ boss cover ${waveTotal + bossExtra}, quota ${quota} — trickle must supply ${waveShort}`);
    }
  }
  console.log(`day ${plan.day}: quota ${plan.quota}, waves ${waveTotal}, budget ${plan.spawnBudget}, boss ${plan.boss ? plan.boss.id : '-'}, time ${plan.time}s`);
}
console.log('static audit failures:', failures);

// ---------------------------------------------------------------- bot playthrough
console.log('\n== BOT PLAYTHROUGH (seed ' + seed + ') ==');

function makeBotInput() {
  const keys = new Set();
  const input = {
    keys,
    mouse: { down: false, x: 640, y: 360 },
    held: (...names) => names.some((n) => keys.has(n)),
    consumeClick: () => false,
  };
  return input;
}

// Bot: each step, aim the swarm at the most dangerous enemy, keep the
// keeper between the hive and the action, smoke when crowded, plant
// flowers when rich.
function botStep(g, input) {
  // Find the enemy nearest the hive (hive defense first), else nearest keeper.
  let target = null;
  let best = Infinity;
  for (const e of g.enemies) {
    const dh = Math.hypot(e.x - g.hive.x, e.y - g.hive.y);
    const score = dh - (e.boss ? 400 : 0);
    if (score < best) { best = score; target = e; }
  }
  if (target) {
    input.mouse.x = target.x;
    input.mouse.y = target.y;
    input.mouse.down = true;
  } else {
    input.mouse.down = false;
  }
  // Keeper: hold a point 170px from the hive toward the target — but
  // retreat toward the hive when hurt or crowded.
  let kx = g.hive.x;
  let ky = g.hive.y + 260;
  let crowded = 0;
  for (const e of g.enemies) {
    if (Math.hypot(e.x - g.keeper.x, e.y - g.keeper.y) < 160) crowded++;
  }
  if (g.keeper.hp <= 1 || crowded >= 5) {
    // Fall back: stand on the far side of the hive from the enemy mass.
    let cx = 0, cy = 0, n = 0;
    for (const e of g.enemies) { cx += e.x; cy += e.y; n++; }
    if (n > 0) {
      const a = Math.atan2(g.hive.y - cy / n, g.hive.x - cx / n);
      kx = g.hive.x + Math.cos(a) * 120;
      ky = g.hive.y + Math.sin(a) * 120;
    }
  } else if (target) {
    const a = Math.atan2(target.y - g.hive.y, target.x - g.hive.x);
    kx = g.hive.x + Math.cos(a) * 170;
    ky = g.hive.y + Math.sin(a) * 170;
  }
  input.keys.clear();
  const dx = kx - g.keeper.x;
  const dy = ky - g.keeper.y;
  if (dx < -8) input.keys.add('a');
  if (dx > 8) input.keys.add('d');
  if (dy < -8) input.keys.add('w');
  if (dy > 8) input.keys.add('s');
  // Smoke when crowded near the keeper.
  let near = 0;
  for (const e of g.enemies) {
    if (Math.hypot(e.x - g.keeper.x, e.y - g.keeper.y) < 170) near++;
  }
  if (near >= 3 && g.smokeCd <= 0) useSmoke(g);
  // Plant a flower when rich and room.
  if (g.honey >= 15 && g.flowers.length < g.stats.flowerMax) plantFlower(g);
}

const g = createGame(seed, 'hive');
startDay(g);
const input = makeBotInput();
let steps = 0;
const maxSteps = 60 * 60 * 30; // 30 minutes of sim time, hard cap
const results = [];
let guard = 0;
while (g.mode !== 'victory' && g.mode !== 'defeat' && steps < maxSteps) {
  if (g.mode === 'playing') {
    botStep(g, input);
    update(g, 1 / 60, input);
    steps++;
  } else if (g.mode === 'dayclear') {
    // Record the day result, then take upgrade 0 and the quiet road.
    results.push({
      day: g.day, won: true, time: +g.time.toFixed(1), banished: g.banished,
      quota: g.quota, hiveHp: Math.round(g.hive.hp), keeperHp: g.keeper.hp,
      bees: g.beeCount, honey: Math.round(g.honey), score: g.score,
    });
    g.mode = 'upgrade';
    chooseUpgrade(g, 0);
    // Fork: alternate quiet (free) and market (buy first affordable).
    if (g.day % 2 === 1) {
      const qi = g.forkOffers.findIndex((f) => f.id === 'quiet');
      chooseFork(g, qi >= 0 ? qi : 0);
    } else {
      const mi = g.forkOffers.findIndex((f) => f.id === 'market');
      chooseFork(g, mi >= 0 ? mi : 0);
      if (g.mode === 'market') {
        for (let i = 0; i < g.marketWares.length; i++) buyMarket(g, i);
        marketContinue(g);
      }
    }
    guard = 0;
  } else if (g.mode === 'upgrade') {
    chooseUpgrade(g, 0);
  } else if (g.mode === 'fork') {
    const qi = g.forkOffers.findIndex((f) => f.id === 'quiet');
    chooseFork(g, qi >= 0 ? qi : 0);
  } else if (g.mode === 'market') {
    for (let i = 0; i < g.marketWares.length; i++) buyMarket(g, i);
    marketContinue(g);
  } else {
    console.log('UNEXPECTED MODE:', g.mode);
    break;
  }
  if (++guard > 100000) {
    console.log('GUARD TRIP — stuck in mode', g.mode, 'day', g.day);
    break;
  }
}

for (const r of results) {
  console.log(`day ${r.day}: WIN in ${r.time}s, banished ${r.banished}/${r.quota}, hive ${r.hiveHp}hp, keeper ${r.keeperHp}hp, bees ${r.bees}, honey ${r.honey}, score ${r.score}`);
}
if (g.mode === 'victory') {
  console.log(`VICTORY — rank ${g.victoryRank}, final score ${g.score}, total banished ${g.tally.banishedTotal}, bosses ${g.tally.bossesBanished}, best chain x${g.bestChain}`);
} else if (g.mode === 'defeat') {
  console.log(`DEFEAT on day ${g.day}: ${g.defeatReason} (banished ${g.banished}/${g.quota}, hive ${Math.round(g.hive.hp)}hp, keeper ${g.keeper.hp}hp)`);
  failures++;
} else {
  console.log('INCOMPLETE — ran out of steps, mode', g.mode, 'day', g.day);
  failures++;
}
const wonDays = results.length + (g.mode === 'victory' ? 1 : 0);
console.log(`days won: ${wonDays}/10, sim steps: ${steps}`);
if (wonDays < 10) failures++;
console.log('TOTAL FAILURES:', failures);
process.exit(failures > 0 ? 1 : 0);
