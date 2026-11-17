// HIVEWARDEN — shared bot player (dev tool).
// A competent-but-not-perfect automated player that drives the real sim:
// aims the swarm at the enemy nearest the hive, holds the keeper between
// hive and action, retreats when hurt or crowded, smokes when swarmed,
// plants flowers when honey allows, and takes the first upgrade + Quiet
// Meadow fork + buys every market ware it can afford.
import { createGame, startDay, update, chooseUpgrade, chooseFork, buyMarket, marketContinue, useSmoke, plantFlower } from '../game/src/sim.js';
import { stateText } from '../game/src/sim.js';

export function makeInput() {
  return {
    keys: new Set(),
    mouse: { down: false, x: 640, y: 360, clickX: 0, clickY: 0, clicked: false },
    held(...names) { return names.some((n) => this.keys.has(n)); },
    consumeClick() { return false; },
  };
}

export function playBot(seed = 1, difficulty = 'hive') {
  const g = createGame(seed, difficulty);
  startDay(g);
  const input = makeInput();
  const results = [];
  let steps = 0;
  const maxSteps = 60 * 60 * 30;
  while (g.mode !== 'victory' && g.mode !== 'defeat' && steps < maxSteps) {
    if (g.mode === 'playing') {
      // Aim at the enemy nearest the hive (bosses first).
      let target = null;
      let best = Infinity;
      for (const e of g.enemies) {
        const dh = Math.hypot(e.x - g.hive.x, e.y - g.hive.y);
        const sc = dh - (e.boss ? 400 : 0);
        if (sc < best) { best = sc; target = e; }
      }
      if (target) { input.mouse.x = target.x; input.mouse.y = target.y; input.mouse.down = true; }
      else input.mouse.down = false;
      // Keeper: hold 170px from the hive toward the target; retreat when
      // hurt or crowded.
      let kx = g.hive.x;
      let ky = g.hive.y + 260;
      let crowded = 0;
      for (const e of g.enemies) {
        if (Math.hypot(e.x - g.keeper.x, e.y - g.keeper.y) < 160) crowded++;
      }
      if (g.keeper.hp <= 1 || crowded >= 5) {
        let cx = 0;
        let cy = 0;
        let n = 0;
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
      if (crowded >= 3 && g.smokeCd <= 0) useSmoke(g);
      if (g.honey >= 15) plantFlower(g);
      update(g, 1 / 60, input);
      steps++;
    } else if (g.mode === 'dayclear') {
      results.push({
        day: g.day,
        time: +g.time.toFixed(1),
        banished: g.banished,
        quota: g.quota,
        hiveHp: Math.round(g.hive.hp),
        keeperHp: g.keeper.hp,
        bees: g.beeCount,
        honey: Math.round(g.honey),
        score: g.score,
      });
      g.mode = 'upgrade';
      chooseUpgrade(g, 0);
      const qi = g.forkOffers.findIndex((f) => f.id === 'quiet');
      chooseFork(g, qi >= 0 ? qi : 0);
    } else if (g.mode === 'upgrade') {
      chooseUpgrade(g, 0);
    } else if (g.mode === 'fork') {
      const qi = g.forkOffers.findIndex((f) => f.id === 'quiet');
      chooseFork(g, qi >= 0 ? qi : 0);
    } else if (g.mode === 'market') {
      for (let i = 0; i < g.marketWares.length; i++) buyMarket(g, i);
      marketContinue(g);
    } else {
      break;
    }
  }
  return {
    results,
    mode: g.mode,
    rank: g.victoryRank,
    score: g.score,
    day: g.day,
    reason: g.defeatReason || null,
    steps,
    finalText: stateText(g),
    tally: { ...g.tally },
  };
}
