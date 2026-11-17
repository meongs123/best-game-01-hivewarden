// HIVEWARDEN — core simulation. Pure game logic, no rendering.
// Fixed timestep (1/60s); deterministic under a fixed seed.
import { makeRng } from './rng.js';
import {
  VIEW, DIFFICULTIES, MEADOWS, DAYS, ENEMIES, BOSSES,
  RELICS, BLESSINGS, UPGRADES, FORK_ROADS, MARKET, meadowForDay,
} from './data.js';

const DT = 1 / 60;
const TAU = Math.PI * 2;

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}
function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// ---------------------------------------------------------------------------
// Derived stats: base values + relics + blessings + upgrades + difficulty.
// ---------------------------------------------------------------------------
export function computeStats(s) {
  const d = DIFFICULTIES[s.difficulty];
  const has = (list, id) => list.includes(id);
  const st = {
    keeperSpeed: 225 * (has(s.blessings, 'fleet') ? 1.15 : 1),
    keeperMaxHp: 4 + (has(s.relics, 'jelly') ? 1 : 0) + s.upgHeart,
    hiveMaxHp: 60 + (has(s.relics, 'sturdy') ? 30 : 0) + s.upgHiveHp,
    beeDamage: 1 + (has(s.relics, 'sharp') ? 1 : 0) + s.upgSting + (has(s.blessings, 'mandible') ? 0.1 : 0),
    beeSpeed: 265 * (has(s.relics, 'swift') ? 1.25 : 1) * (1 + 0.15 * s.upgSpeed),
    beeRange: 150 * (has(s.blessings, 'tongue') ? 1.3 : 1) * (1 + 0.2 * s.upgReach),
    beeRate: 2 * (has(s.blessings, 'quick') ? 1.2 : 1),
    regrow: (1 / 3.5) * (has(s.blessings, 'busy') ? 1.5 : 1) * (1 + 0.25 * s.upgRegrow),
    maxBees: 40,
    flowerMax: 5 + s.upgFlower,
    flowerYield: (1 + s.upgFlowerGold) * (has(s.relics, 'sunpetal') ? 2 : 1),
    honeyMul: (has(s.relics, 'comb') ? 1.25 : 1) * (has(s.blessings, 'nectar') ? 1.15 : 1),
    smokeCd: 8 * (has(s.relics, 'smokecharm') ? 0.7 : 1) * Math.pow(0.8, s.upgSmoke),
    smokeRadius: 150 * (has(s.blessings, 'warm') ? 1.3 : 1),
    dmgReduction: has(s.relics, 'hat') ? 1 : 0,
    hiveArmor: has(s.blessings, 'wax') ? 1 : 0,
    slowOnHit: has(s.blessings, 'pollen'),
    guardBees: has(s.relics, 'crown') ? 0 : has(s.blessings, 'guard'),
    enemySlow: has(s.blessings, 'breeze') ? 0.9 : 1,
    dayBonus: (has(s.blessings, 'golden') ? 10 : 0),
    thorn: has(s.relics, 'thorn'),
    chainWindow: 4 + 2 * s.upgChain,
    diff: d,
  };
  return st;
}

// ---------------------------------------------------------------------------
// Game creation
// ---------------------------------------------------------------------------
export function createGame(seed, difficultyId) {
  const difficulty = DIFFICULTIES[difficultyId] ? difficultyId : 'hive';
  const rng = makeRng(seed >>> 0);
  const s = {
    seed: seed >>> 0,
    rng,
    mode: 'title', // title | playing | paused | upgrade | fork | market | dayclear | victory | defeat
    difficulty,
    day: 1,
    time: 0,
    timeLeft: 0,
    dayTime: 75,
    quota: 8,
    banished: 0,
    spawned: 0,
    spawnBudget: 16,
    keeper: { x: VIEW.w / 2, y: VIEW.h - 120, hp: 4, maxHp: 4, radius: 14, hurtCd: 0, face: 0 },
    hive: { x: VIEW.w / 2, y: 150, hp: 60, maxHp: 60, radius: 34, hurtCd: 0 },
    bees: [],
    beeCount: 12,
    swarmTarget: null,
    swarmHold: 0,
    enemies: [],
    flowers: [],
    honey: 10,
    score: 0,
    chain: 0,
    chainTimer: 0,
    bestChain: 0,
    smokeCd: 0,
    regrowAcc: 0,
    flowerAcc: 0,
    guardAcc: 0,
    relics: [],
    blessings: [],
    upgHeart: 0, upgHiveHp: 0, upgSting: 0, upgSpeed: 0, upgSmoke: 0,
    upgFlower: 0, upgRegrow: 0, upgReach: 0, upgChain: 0, upgFlowerGold: 0,
    upgradeOffers: [],
    forkOffers: FORK_ROADS,
    marketWares: [],
    marketBought: {},
    wavesDone: [],
    bossSpawned: false,
    bossAlive: false,
    tally: {
      banishedTotal: 0, flowersPlanted: 0, honeyEarned: 0,
      timeSurvived: 0, bossesBanished: 0, beesLost: 0,
    },
    particles: [],
    floaters: [],
    shake: 0,
    hitStop: 0,
    banner: null, // {text, sub, t}
    dayIntroT: 0,
    victoryRank: null,
    defeatReason: null,
    runScore: 0,
    muted: false,
    elapsed: 0,
    bossWarned: false,
  };
  s.stats = computeStats(s);
  return s;
}

function meadow(s) {
  return meadowForDay(s.day);
}

// ---------------------------------------------------------------------------
// Day setup
// ---------------------------------------------------------------------------
export function startDay(s) {
  const plan = DAYS[s.day - 1];
  const d = DIFFICULTIES[s.difficulty];
  const st = computeStats(s);
  s.stats = st;
  s.mode = 'playing';
  s.dayTime = plan.time + d.timerBonus + st.dayBonus;
  s.time = 0;
  s.timeLeft = s.dayTime;
  s.quota = Math.max(1, Math.round(plan.quota * d.quotaMul));
  s.banished = 0;
  s.spawned = 0;
  s.spawnBudget = Math.round(plan.spawnBudget * d.spawnMul);
  s.wavesDone = [];
  s.bossSpawned = false;
  s.bossAlive = false;
  s.bossDead = false;
  s.bossWarned = false;
  s.enemies = [];
  s.flowers = [];
  s.swarmTarget = null;
  s.swarmHold = 0;
  s.smokeCd = 0;
  s.chain = 0;
  s.chainTimer = 0;
  s.dayIntroT = 2.2;
  s.keeper.x = VIEW.w / 2;
  s.keeper.y = VIEW.h - 120;
  s.keeper.hp = s.keeper.maxHp;
  s.keeper.hurtCd = 0;
  s.hive.x = VIEW.w / 2;
  s.hive.y = 150;
  s.hive.maxHp = st.hiveMaxHp;
  s.hive.hp = Math.min(s.hive.hp, st.hiveMaxHp);
  if (s.day === 1) s.hive.hp = st.hiveMaxHp;
  s.hive.hurtCd = 0;
  // Crown: start each day with +5 bees.
  if (s.relics.includes('crown')) s.beeCount = Math.min(st.maxBees, s.beeCount + 5);
  // Sync bee entities with the count.
  syncBees(s);
  s.banner = { text: `${meadow(s).name} — Day ${s.day}`, sub: plan.intro, t: 2.4 };
  return plan;
}

function syncBees(s) {
  // Keep one entity per bee in the swarm (cap visuals at the count).
  while (s.bees.length < s.beeCount) {
    const a = s.rng.next() * TAU;
    s.bees.push({
      x: s.keeper.x + Math.cos(a) * 40,
      y: s.keeper.y + Math.sin(a) * 40,
      vx: 0, vy: 0, angle: a, cd: 0, mode: 'orbit', tx: 0, ty: 0, wob: s.rng.next() * TAU,
    });
  }
  while (s.bees.length > s.beeCount) s.bees.pop();
}

// ---------------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------------
function edgePoint(s) {
  const side = s.rng.int(0, 3);
  const m = 30;
  if (side === 0) return { x: s.rng.range(m, VIEW.w - m), y: -m };
  if (side === 1) return { x: s.rng.range(m, VIEW.w - m), y: VIEW.h + m };
  if (side === 2) return { x: -m, y: s.rng.range(m, VIEW.h - m) };
  return { x: VIEW.w + m, y: s.rng.range(m, VIEW.h - m) };
}

function spawnEnemy(s, kind, x, y) {
  const def = ENEMIES[kind];
  if (!def) return null;
  const d = DIFFICULTIES[s.difficulty];
  const p = x !== undefined ? { x, y } : edgePoint(s);
  const e = {
    kind, id: kind + '-' + s.spawned + '-' + Math.floor(s.time * 60),
    x: p.x, y: p.y, hp: Math.max(1, Math.round(def.hp * d.hpMul)), maxHp: Math.max(1, Math.round(def.hp * d.hpMul)),
    speed: def.speed, radius: def.radius, dmg: def.dmg, hiveDmg: def.hiveDmg,
    honey: def.honey, score: def.score, behavior: def.behavior,
    color: def.color, shielded: !!def.shielded, boss: false,
    atkCd: 0, slow: 0, stun: 0, fleeing: false, stolen: 0, spawnT: 0,
    face: Math.atan2(VIEW.h / 2 - p.y, VIEW.w / 2 - p.x), wob: s.rng.next() * TAU,
  };
  s.enemies.push(e);
  s.spawned++;
  return e;
}

function spawnBoss(s, bossId) {
  const def = BOSSES[bossId];
  if (!def) return null;
  const d = DIFFICULTIES[s.difficulty];
  const p = edgePoint(s);
  const e = {
    kind: bossId, id: 'boss-' + bossId,
    x: p.x, y: p.y, hp: Math.round(def.hp * d.hpMul), maxHp: Math.round(def.hp * d.hpMul),
    speed: def.speed, radius: def.radius, dmg: def.dmg, hiveDmg: def.hiveDmg,
    honey: def.honey, score: def.score, behavior: 'hive',
    color: def.color, shielded: false, boss: true,
    atkCd: 0, slow: 0, stun: 0, fleeing: false, stolen: 0, spawnT: 0,
    spawnKind: def.spawnKind, spawnEvery: def.spawnEvery, spawnCount: def.spawnCount,
    face: 0, wob: 0,
  };
  s.enemies.push(e);
  s.bossSpawned = true;
  s.bossAlive = true;
  s.banner = { text: `${def.name} approaches!`, sub: def.desc, t: 2.6 };
  return e;
}

function runSpawns(s, dt) {
  const plan = DAYS[s.day - 1];
  const frac = s.time / s.dayTime;
  // Scripted waves.
  plan.waves.forEach((w, wi) => {
    if (!s.wavesDone[wi] && frac >= w[0]) {
      s.wavesDone[wi] = true;
      for (let i = 0; i < w[2] && s.spawned < s.spawnBudget; i++) spawnEnemy(s, w[1]);
    }
  });
  // Boss.
  if (plan.boss && !s.bossSpawned && frac >= plan.boss.at) spawnBoss(s, plan.boss.id);
  // Trickle: keep pressure up while budget remains.
  s.trickleAcc = (s.trickleAcc || 0) + dt;
  const trickleEvery = Math.max(2.6, 4.8 - s.day * 0.25);
  if (s.trickleAcc >= trickleEvery && s.spawned < s.spawnBudget) {
    s.trickleAcc = 0;
    spawnEnemy(s, plan.trickle);
  }
}

// ---------------------------------------------------------------------------
// Player actions
// ---------------------------------------------------------------------------
export function orderSwarm(s, x, y) {
  s.swarmTarget = { x: clamp(x, 20, VIEW.w - 20), y: clamp(y, 20, VIEW.h - 20) };
  s.swarmHold = 4; // bees linger at the point for up to 4s
}

export function useSmoke(s) {
  const st = s.stats;
  if (s.smokeCd > 0 || s.mode !== 'playing') return false;
  s.smokeCd = st.smokeCd;
  const R = st.smokeRadius;
  const cx = s.keeper.x;
  const cy = s.keeper.y;
  for (const e of s.enemies) {
    const d = dist(cx, cy, e.x, e.y);
    if (d < R + e.radius) {
      const a = angleTo(cx, cy, e.x, e.y);
      const push = 90 * (1 - d / (R + e.radius));
      e.x += Math.cos(a) * push;
      e.y += Math.sin(a) * push;
      e.stun = Math.max(e.stun, 2);
    }
  }
  burst(s, cx, cy, 26, '#e8e8e8', 130);
  return true;
}

export function plantFlower(s) {
  const st = s.stats;
  if (s.mode !== 'playing') return false;
  if (s.flowers.length >= st.flowerMax) return false;
  if (s.honey < 15) return false;
  s.honey -= 15;
  const fx = s.keeper.x + (s.rng.next() - 0.5) * 30;
  const fy = s.keeper.y + (s.rng.next() - 0.5) * 30;
  s.flowers.push({ x: clamp(fx, 30, VIEW.w - 30), y: clamp(fy, 30, VIEW.h - 30), yieldT: 0, thornCd: 0 });
  s.tally.flowersPlanted++;
  burst(s, fx, fy, 10, '#ff8fb3', 60);
  return true;
}

// ---------------------------------------------------------------------------
// Combat helpers
// ---------------------------------------------------------------------------
function burst(s, x, y, n, color, speed) {
  for (let i = 0; i < n; i++) {
    const a = s.rng.next() * TAU;
    const v = (speed || 90) * (0.4 + s.rng.next() * 0.8);
    s.particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      t: 0, life: 0.4 + s.rng.next() * 0.4, color, size: 2 + s.rng.next() * 3,
    });
  }
  if (s.particles.length > 400) s.particles.splice(0, s.particles.length - 400);
}

function floater(s, x, y, text, color) {
  s.floaters.push({ x, y, text, color: color || '#fff', t: 0, life: 0.9 });
  if (s.floaters.length > 60) s.floaters.shift();
}

function addShake(s, amount) {
  s.shake = Math.min(1, s.shake + amount);
}

function damageEnemy(s, e, dmg, fromAngle) {
  // Wardwasp shield: stings from the front arc are blocked.
  if (e.shielded && fromAngle !== undefined) {
    let diff = Math.abs(((fromAngle - e.face) % TAU + TAU * 1.5) % TAU - Math.PI);
    if (diff < Math.PI / 3) {
      floater(s, e.x, e.y - e.radius - 6, 'BLOCKED', '#9db4ff');
      burst(s, e.x, e.y, 4, '#9db4ff', 50);
      return false;
    }
  }
  e.hp -= dmg;
  if (s.stats.slowOnHit) e.slow = Math.max(e.slow, 2);
  floater(s, e.x + (s.rng.next() - 0.5) * 16, e.y - e.radius - 4, String(Math.round(dmg)), '#ffe066');
  return true;
}

function banishEnemy(s, e, index) {
  const st = s.stats;
  const honeyGain = Math.round(e.honey * st.honeyMul);
  s.honey += honeyGain;
  s.tally.honeyEarned += honeyGain;
  s.score += e.score + s.chain * 10;
  s.banished++;
  s.tally.banishedTotal++;
  s.chain++;
  s.chainTimer = st.chainWindow;
  s.bestChain = Math.max(s.bestChain, s.chain);
  burst(s, e.x, e.y, e.boss ? 40 : 14, '#ffd166', e.boss ? 200 : 120);
  floater(s, e.x, e.y - e.radius - 16, `+${honeyGain} honey`, '#ffd166');
  if (e.boss) {
    s.tally.bossesBanished++;
    s.bossDead = true;
    s.bossAlive = false;
    addShake(s, 0.7);
    s.hitStop = Math.max(s.hitStop, 0.12);
    s.banner = { text: `${BOSSES[e.kind].name} banished!`, sub: `+${e.score} score`, t: 2.2 };
  }
  s.enemies.splice(index, 1);
}

// ---------------------------------------------------------------------------
// Per-frame update
// ---------------------------------------------------------------------------
export function update(s, dt, input) {
  s.elapsed += dt;
  if (s.hitStop > 0) {
    s.hitStop -= dt;
    // During hit-stop the world freezes but particles keep a little motion.
    updateParticles(s, dt * 0.2);
    return;
  }
  if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 1.4);
  if (s.banner) {
    s.banner.t -= dt;
    if (s.banner.t <= 0) s.banner = null;
  }
  if (s.dayIntroT > 0) s.dayIntroT -= dt;

  if (s.mode === 'playing') updatePlaying(s, dt, input);
  updateParticles(s, dt);
  updateFloaters(s, dt);
}

function updateParticles(s, dt) {
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    if (p.t >= p.life) s.particles.splice(i, 1);
  }
}

function updateFloaters(s, dt) {
  for (let i = s.floaters.length - 1; i >= 0; i--) {
    const f = s.floaters[i];
    f.t += dt;
    f.y -= 24 * dt;
    if (f.t >= f.life) s.floaters.splice(i, 1);
  }
}

function updatePlaying(s, dt, input) {
  const st = s.stats;
  const d = DIFFICULTIES[s.difficulty];
  s.time += dt;
  s.timeLeft = Math.max(0, s.dayTime - s.time);
  s.tally.timeSurvived += dt;

  // --- Keeper movement (WASD / arrows) ---
  let mx = 0;
  let my = 0;
  if (input.held('a', 'arrowleft')) mx -= 1;
  if (input.held('d', 'arrowright')) mx += 1;
  if (input.held('w', 'arrowup')) my -= 1;
  if (input.held('s', 'arrowdown')) my += 1;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    s.keeper.x = clamp(s.keeper.x + mx * st.keeperSpeed * dt, 20, VIEW.w - 20);
    s.keeper.y = clamp(s.keeper.y + my * st.keeperSpeed * dt, 20, VIEW.h - 20);
    s.keeper.face = Math.atan2(my, mx);
  }
  if (s.keeper.hurtCd > 0) s.keeper.hurtCd -= dt;
  if (s.hive.hurtCd > 0) s.hive.hurtCd -= dt;

  // --- Swarm order (mouse hold/click) ---
  if (input.mouse.down || input.consumeClick()) {
    orderSwarm(s, input.mouse.x, input.mouse.y);
  }
  if (s.swarmHold > 0) s.swarmHold -= dt;
  else s.swarmTarget = null;

  // --- Smoke ---
  if (s.smokeCd > 0) s.smokeCd -= dt;

  // --- Bee regrowth ---
  s.regrowAcc += st.regrow * dt + s.flowers.length * 0.25 * dt;
  while (s.regrowAcc >= 1 && s.beeCount < st.maxBees) {
    s.regrowAcc -= 1;
    s.beeCount++;
    const a = s.rng.next() * TAU;
    s.bees.push({
      x: s.hive.x + Math.cos(a) * 40, y: s.hive.y + Math.sin(a) * 40,
      vx: 0, vy: 0, angle: a, cd: 0, mode: 'orbit', tx: 0, ty: 0, wob: s.rng.next() * TAU,
    });
  }
  if (s.beeCount >= st.maxBees) s.regrowAcc = 0;
  syncBees(s);

  // --- Flowers: honey yield + thorn damage ---
  s.flowerAcc += dt;
  if (s.flowerAcc >= 8) {
    s.flowerAcc = 0;
    for (const f of s.flowers) {
      const gain = Math.round(st.flowerYield * st.honeyMul);
      s.honey += gain;
      s.tally.honeyEarned += gain;
    }
  }
  if (st.thorn) {
    for (const f of s.flowers) {
      f.thornCd -= dt;
      if (f.thornCd > 0) continue;
      for (const e of s.enemies) {
        if (dist(f.x, f.y, e.x, e.y) < 46 + e.radius) {
          f.thornCd = 1;
          if (damageEnemy(s, e, 1, undefined)) burst(s, e.x, e.y, 5, '#7ee081', 60);
          break;
        }
      }
    }
  }

  // --- Guard bees: hive stings one nearby enemy every 3s ---
  if (st.guardBees) {
    s.guardAcc += dt;
    if (s.guardAcc >= 3) {
      s.guardAcc = 0;
      let best = null;
      let bd = 220;
      for (const e of s.enemies) {
        const dd = dist(s.hive.x, s.hive.y, e.x, e.y);
        if (dd < bd) { bd = dd; best = e; }
      }
      if (best) {
        damageEnemy(s, best, 1, undefined);
        burst(s, best.x, best.y, 5, '#ffd166', 60);
      }
    }
  }

  // --- Spawns ---
  runSpawns(s, dt);

  // --- Enemies ---
  updateEnemies(s, dt);

  // --- Bees ---
  updateBees(s, dt);

  // --- Chain timer ---
  if (s.chainTimer > 0) {
    s.chainTimer -= dt;
    if (s.chainTimer <= 0) s.chain = 0;
  }

  // --- Win / lose ---
  // Boss days: the quota is not enough — the boss must fall too.
  const plan = DAYS[s.day - 1];
  const bossPending = plan.boss && !s.bossDead;
  if (s.banished >= s.quota && !bossPending) {
    endDay(s, true);
    return;
  }
  if (s.timeLeft <= 0) {
    endDay(s, false, 'Dusk fell with the quota unmet.');
    return;
  }
  if (s.keeper.hp <= 0) {
    endDay(s, false, 'The keeper has fallen.');
    return;
  }
  if (s.hive.hp <= 0) {
    endDay(s, false, 'The hive is destroyed.');
    return;
  }
}

function updateEnemies(s, dt) {
  const st = s.stats;
  const d = DIFFICULTIES[s.difficulty];
  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i];
    if (e.atkCd > 0) e.atkCd -= dt;
    if (e.stun > 0) {
      e.stun -= dt;
      continue;
    }
    let tx;
    let ty;
    if (e.behavior === 'hive' || e.boss) {
      tx = s.hive.x;
      ty = s.hive.y;
    } else if (e.behavior === 'keeper') {
      tx = s.keeper.x;
      ty = s.keeper.y;
    } else if (e.behavior === 'steal') {
      if (e.fleeing) {
        // Flee to the nearest edge.
        const cx = e.x < VIEW.w / 2 ? 0 : VIEW.w;
        const cy = e.y < VIEW.h / 2 ? 0 : VIEW.h;
        tx = Math.abs(e.x - cx) < Math.abs(e.y - cy) ? cx : e.x;
        ty = Math.abs(e.x - cx) < Math.abs(e.y - cy) ? e.y : cy;
      } else {
        tx = s.hive.x;
        ty = s.hive.y;
      }
    } else {
      // chase: the hive, unless the keeper is close enough to be the
      // nearer threat — wading into the swarm is a choice, not a trap.
      const dk = dist(e.x, e.y, s.keeper.x, s.keeper.y);
      if (dk < 140) { tx = s.keeper.x; ty = s.keeper.y; }
      else { tx = s.hive.x; ty = s.hive.y; }
    }
    const dd = dist(e.x, e.y, tx, ty);
    const spd = e.speed * st.enemySlow * (e.slow > 0 ? 0.7 : 1);
    if (e.slow > 0) e.slow -= dt;
    if (dd > 4) {
      const a = angleTo(e.x, e.y, tx, ty);
      e.face = a;
      e.x += Math.cos(a) * spd * dt;
      e.y += Math.sin(a) * spd * dt;
    }
    // Boss minion spawns.
    if (e.boss) {
      e.spawnT += dt;
      if (e.spawnT >= e.spawnEvery && s.spawned < s.spawnBudget + 12) {
        e.spawnT = 0;
        for (let k = 0; k < e.spawnCount; k++) {
          const m = spawnEnemy(s, e.spawnKind, e.x + (s.rng.next() - 0.5) * 60, e.y + (s.rng.next() - 0.5) * 60);
          if (m) m.hp = Math.max(1, m.hp);
        }
      }
    }
    // Broodwasp sheds mites.
    if (e.kind === 'brood') {
      e.spawnT += dt;
      if (e.spawnT >= 5 && s.spawned < s.spawnBudget) {
        e.spawnT = 0;
        spawnEnemy(s, 'mite', e.x + (s.rng.next() - 0.5) * 40, e.y + (s.rng.next() - 0.5) * 40);
      }
    }
    // Contact with keeper.
    const dk2 = dist(e.x, e.y, s.keeper.x, s.keeper.y);
    if (dk2 < e.radius + s.keeper.radius && e.atkCd <= 0 && e.dmg > 0) {
      e.atkCd = 1.2;
      const dmg = Math.max(1, Math.round(e.dmg * d.dmgMul) - st.dmgReduction);
      if (s.keeper.hurtCd <= 0) {
        s.keeper.hp -= dmg;
        s.keeper.hurtCd = 1.2;
        addShake(s, 0.35);
        burst(s, s.keeper.x, s.keeper.y, 10, '#ff6b6b', 100);
      }
    }
    // Contact with hive.
    const dh2 = dist(e.x, e.y, s.hive.x, s.hive.y);
    if (dh2 < e.radius + s.hive.radius && e.atkCd <= 0) {
      if (e.behavior === 'steal' && !e.fleeing) {
        // Steal honey, then flee.
        const stolen = Math.min(5, s.honey);
        s.honey -= stolen;
        e.stolen = stolen;
        e.fleeing = true;
        e.atkCd = 1.2;
        floater(s, e.x, e.y - 16, `-${stolen} honey`, '#ff9f9f');
      } else if (e.hiveDmg > 0) {
        e.atkCd = 1.2;
        const dmg = Math.max(0, Math.round(e.hiveDmg * d.dmgMul) - st.hiveArmor);
        if (s.hive.hurtCd <= 0 && dmg > 0) {
          s.hive.hp -= dmg;
          s.hive.hurtCd = 0.5;
          addShake(s, 0.3);
          burst(s, s.hive.x, s.hive.y, 8, '#ffb703', 90);
        }
      }
    }
    // Moth-thief escaped off the edge.
    if (e.fleeing && (e.x < -20 || e.x > VIEW.w + 20 || e.y < -20 || e.y > VIEW.h + 20)) {
      s.enemies.splice(i, 1);
      continue;
    }
    // Enemy died from thorn/guard damage (hp <= 0 checked after bee phase too).
    if (e.hp <= 0) {
      if (e.fleeing && e.stolen > 0) {
        s.honey += e.stolen;
        floater(s, e.x, e.y - 16, `+${e.stolen} honey back`, '#ffd166');
      }
      banishEnemy(s, e, i);
    }
  }
}

function updateBees(s, dt) {
  const st = s.stats;
  const focus = s.swarmTarget || { x: s.keeper.x, y: s.keeper.y };
  for (let i = s.bees.length - 1; i >= 0; i--) {
    const b = s.bees[i];
    if (b.cd > 0) b.cd -= dt;
    b.wob += dt * 6;
    // Find nearest enemy within range of the focus point. When idle
    // (no swarm order) the bees only guard a small radius around the
    // keeper — directing the swarm must matter, or the game plays itself.
    let target = null;
    let td = s.swarmTarget ? st.beeRange : 60;
    for (const e of s.enemies) {
      const dd = dist(focus.x, focus.y, e.x, e.y);
      if (dd < td) {
        td = dd;
        target = e;
      }
    }
    let tx;
    let ty;
    if (target) {
      tx = target.x;
      ty = target.y;
    } else if (s.swarmTarget) {
      tx = s.swarmTarget.x + Math.cos(b.wob) * 14;
      ty = s.swarmTarget.y + Math.sin(b.wob) * 14;
    } else {
      // Orbit the keeper.
      const a = b.angle + dt * 0.9;
      b.angle = a;
      tx = s.keeper.x + Math.cos(a) * 42;
      ty = s.keeper.y + Math.sin(a) * 42;
    }
    const dd = dist(b.x, b.y, tx, ty);
    const step = st.beeSpeed * dt;
    if (dd > 6) {
      const a = angleTo(b.x, b.y, tx, ty);
      const mv = Math.min(step, dd);
      b.x += Math.cos(a) * mv;
      b.y += Math.sin(a) * mv;
    }
    // Sting when close to a target enemy.
    if (target && dist(b.x, b.y, target.x, target.y) < target.radius + 10 && b.cd <= 0) {
      b.cd = 1 / st.beeRate;
      const ang = angleTo(target.x, target.y, b.x, b.y);
      if (damageEnemy(s, target, st.beeDamage, ang)) {
        burst(s, target.x, target.y, 3, '#ffe066', 50);
        // A bee that lands a killing sting may give its life (12%).
        if (target.hp <= 0 && s.rng.chance(0.12)) {
          s.bees.splice(i, 1);
          s.beeCount--;
          s.tally.beesLost++;
          burst(s, b.x, b.y, 6, '#fff3b0', 70);
          continue;
        }
      }
    }
  }
  // Sweep up enemies killed by bees.
  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i];
    if (e.hp <= 0) {
      if (e.fleeing && e.stolen > 0) {
        s.honey += e.stolen;
        floater(s, e.x, e.y - 16, `+${e.stolen} honey back`, '#ffd166');
      }
      banishEnemy(s, e, i);
    }
  }
}

// ---------------------------------------------------------------------------
// Day end / progression
// ---------------------------------------------------------------------------
function endDay(s, won, reason) {
  if (won) {
    const timeBonus = Math.round(s.timeLeft * 10);
    const hiveBonus = Math.round((s.hive.hp / s.hive.maxHp) * 200);
    const heartBonus = s.keeper.hp * 100;
    const dayScore = s.banished * 100 + timeBonus + hiveBonus + heartBonus;
    s.score += dayScore;
    if (s.day >= 10) {
      s.mode = 'victory';
      s.victoryRank = gradeRank(s);
      s.runScore = s.score;
      return;
    }
    s.mode = 'dayclear';
    s.keeper.hp = Math.min(s.keeper.maxHp, s.keeper.hp + 1); // the night's rest
    s.dayClear = { timeBonus, hiveBonus, heartBonus, dayScore };
    // Roll 3 upgrade offers (seeded).
    const pool = s.rng.shuffle(UPGRADES.filter((u) => {
      if (u.id === 'heart' && s.keeper.maxHp >= 6) return false;
      if (u.id === 'flower' && s.upgFlower >= 3) return false;
      return true;
    }));
    s.upgradeOffers = pool.slice(0, 3);
  } else {
    s.mode = 'defeat';
    s.defeatReason = reason || 'The meadow wins this time.';
    s.runScore = s.score;
  }
}

function gradeRank(s) {
  // Grade from score + remaining health. Tuned so a solid run earns A/S.
  const grade = s.score + s.keeper.hp * 400 + Math.round((s.hive.hp / s.hive.maxHp) * 1000);
  if (grade >= 90000) return 'S';
  if (grade >= 65000) return 'A';
  if (grade >= 45000) return 'B';
  return 'C';
}

export function chooseUpgrade(s, index) {
  if (s.mode !== 'upgrade') return false;
  const u = s.upgradeOffers[index];
  if (!u) return false;
  applyUpgrade(s, u);
  s.upgradeOffers = [];
  s.mode = 'fork';
  // Roll the fork roads (same three every time; order shuffled).
  s.forkOffers = s.rng.shuffle(FORK_ROADS);
  return true;
}

function applyUpgrade(s, u) {
  switch (u.apply) {
    case 'bees10': s.beeCount = Math.min(s.stats.maxBees, s.beeCount + 10); break;
    case 'sting': s.upgSting += 1; break;
    case 'speed': s.upgSpeed += 1; break;
    case 'smoke': s.upgSmoke += 1; break;
    case 'flower': s.upgFlower += 1; break;
    case 'hivehp': s.upgHiveHp += 20; s.hive.hp = Math.min(s.hive.maxHp + 20, s.hive.hp + 20); break;
    case 'heart': s.upgHeart += 1; s.keeper.maxHp = Math.min(6, s.keeper.maxHp + 1); s.keeper.hp = Math.min(s.keeper.maxHp, s.keeper.hp + 1); break;
    case 'regrow': s.upgRegrow += 1; break;
    case 'honey20': s.honey += 20; break;
    case 'reach': s.upgReach += 1; break;
    case 'chain': s.upgChain += 1; break;
    case 'flowergold': s.upgFlowerGold += 1; break;
    default: break;
  }
  s.stats = computeStats(s);
  syncBees(s);
}

export function chooseFork(s, index) {
  if (s.mode !== 'fork') return false;
  const road = s.forkOffers[index];
  if (!road) return false;
  if (road.id === 'shrine') {
    if (s.honey < road.cost) return false;
    s.honey -= road.cost;
    s.keeper.hp = Math.min(s.keeper.maxHp, s.keeper.hp + 1);
    s.beeCount = Math.min(s.stats.maxBees, s.beeCount + 8);
    syncBees(s);
    advanceToNextDay(s);
    return true;
  }
  if (road.id === 'quiet') {
    s.honey += 6;
    s.beeCount = Math.min(s.stats.maxBees, s.beeCount + 3);
    syncBees(s);
    advanceToNextDay(s);
    return true;
  }
  if (road.id === 'market') {
    s.mode = 'market';
    s.marketWares = rollMarket(s);
    s.marketBought = {};
    return true;
  }
  return false;
}

function rollMarket(s) {
  // One relic (not yet owned), one blessing (not yet owned), mend, bees.
  const relicPool = RELICS.filter((r) => !s.relics.includes(r.id));
  const blessPool = BLESSINGS.filter((b) => !s.blessings.includes(b.id));
  const wares = [];
  if (relicPool.length > 0) {
    const r = s.rng.pick(relicPool);
    wares.push({ kind: 'relic', id: r.id, name: r.name, desc: r.desc, cost: 35 });
  }
  if (blessPool.length > 0) {
    const b = s.rng.pick(blessPool);
    wares.push({ kind: 'blessing', id: b.id, name: b.name, desc: b.desc, cost: 25 });
  }
  wares.push({ kind: 'mend', id: 'mend', name: 'Mend the Hive', desc: 'Restore 25 hive health.', cost: 10 });
  wares.push({ kind: 'bees', id: 'bees', name: 'Buy 8 Bees', desc: 'Eight fresh bees join the swarm.', cost: 15 });
  return wares;
}

export function buyMarket(s, index) {
  if (s.mode !== 'market') return false;
  const w = s.marketWares[index];
  if (!w || s.marketBought[index]) return false;
  if (s.honey < w.cost) return false;
  s.honey -= w.cost;
  s.marketBought[index] = true;
  if (w.kind === 'relic') s.relics.push(w.id);
  else if (w.kind === 'blessing') s.blessings.push(w.id);
  else if (w.kind === 'mend') s.hive.hp = Math.min(s.hive.maxHp, s.hive.hp + 25);
  else if (w.kind === 'bees') {
    s.beeCount = Math.min(s.stats.maxBees, s.beeCount + 8);
    syncBees(s);
  }
  s.stats = computeStats(s);
  // After buying (or declining), the player continues via the Continue button.
  return true;
}

export function marketContinue(s) {
  if (s.mode !== 'market') return false;
  advanceToNextDay(s);
  return true;
}

function advanceToNextDay(s) {
  s.day++;
  if (s.day > 10) {
    s.mode = 'victory';
    s.victoryRank = gradeRank(s);
    s.runScore = s.score;
    return;
  }
  startDay(s);
}

// ---------------------------------------------------------------------------
// Debug / shot staging (used by ?shot= for screenshots; honest staging)
// ---------------------------------------------------------------------------
export function stageShot(s, kind) {
  if (kind === 'title') {
    s.mode = 'title';
    return;
  }
  if (kind === 'play') {
    // Mid-day 5: orchard, quota half-met, flowers planted, some relics.
    s.difficulty = 'hive';
    s.day = 5;
    s.relics = ['swift', 'comb'];
    s.blessings = ['fleet', 'nectar'];
    s.honey = 64;
    s.score = 4200;
    s.beeCount = 22;
    startDay(s);
    // Fast-forward: place keeper mid-field, plant 2 flowers, spawn a pack.
    s.keeper.x = 560;
    s.keeper.y = 480;
    s.flowers = [
      { x: 480, y: 560, yieldT: 0, thornCd: 0 },
      { x: 700, y: 540, yieldT: 0, thornCd: 0 },
    ];
    for (let i = 0; i < 5; i++) spawnEnemy(s, 'wasp');
    for (let i = 0; i < 3; i++) spawnEnemy(s, 'hornet');
    spawnEnemy(s, 'moth');
    s.banished = 11;
    s.time = 30;
    s.timeLeft = s.dayTime - 30;
    orderSwarm(s, 640, 300);
    return;
  }
  if (kind === 'fork') {
    s.day = 3;
    s.honey = 48;
    s.beeCount = 18;
    s.score = 2600;
    s.mode = 'fork';
    s.forkOffers = s.rng.shuffle(FORK_ROADS);
    return;
  }
  if (kind === 'victory') {
    s.day = 10;
    s.score = 96400; // above the S-rank bar (90,000) — self-consistent.
    s.keeper.hp = 2;
    s.hive.hp = 44;
    s.hive.maxHp = 60;
    s.tally.banishedTotal = 312;
    s.bestChain = 14;
    s.tally.timeSurvived = 812;
    s.tally.bossesBanished = 3;
    s.tally.flowersPlanted = 9;
    s.relics = ['comb', 'swift', 'sharp', 'sturdy'];
    s.blessings = ['fleet', 'nectar', 'busy'];
    s.mode = 'victory';
    s.victoryRank = 'S';
    s.runScore = s.score;
    return;
  }
  if (kind === 'defeat') {
    s.day = 7;
    s.score = 6100;
    s.mode = 'defeat';
    s.defeatReason = 'The hive is destroyed.';
    s.runScore = s.score;
    return;
  }
}

// ---------------------------------------------------------------------------
// Text state for testing (render_game_to_text)
// ---------------------------------------------------------------------------
export function stateText(s) {
  const st = s.stats;
  return JSON.stringify({
    mode: s.mode,
    day: s.day,
    meadow: meadow(s).name,
    timeLeft: Math.round(s.timeLeft * 10) / 10,
    quota: s.quota,
    banished: s.banished,
    spawned: s.spawned,
    keeper: { x: Math.round(s.keeper.x), y: Math.round(s.keeper.y), hp: s.keeper.hp, maxHp: s.keeper.maxHp },
    hive: { hp: Math.round(s.hive.hp), maxHp: s.hive.maxHp },
    bees: s.beeCount,
    honey: Math.round(s.honey),
    score: s.score,
    chain: s.chain,
    smokeCd: Math.round(s.smokeCd * 10) / 10,
    enemies: s.enemies.slice(0, 12).map((e) => ({ kind: e.kind, x: Math.round(e.x), y: Math.round(e.y), hp: e.hp, boss: !!e.boss })),
    enemyCount: s.enemies.length,
    flowers: s.flowers.length,
    relics: s.relics,
    blessings: s.blessings,
    offers: s.upgradeOffers.map((u) => u.id),
    fork: s.forkOffers.map((f) => f.id),
    victoryRank: s.victoryRank,
    defeatReason: s.defeatReason,
    beeDamage: st.beeDamage,
  });
}
