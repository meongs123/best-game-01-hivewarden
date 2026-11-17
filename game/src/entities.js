// HIVEWARDEN — the simulation: warden, swarm, hive, flowers, enemies, bosses.
// All updates run on a fixed dt through update(state, dt, input). All random
// draws go through state.rng (seeded), so a fixed seed + fixed inputs is
// deterministic. Pure logic here; rendering lives in render.js, DOM in ui.js.
import { HIVE, WARDEN, SWARM, SMOKE, FLOWER, HONEY, SCORE } from './config.js';
import { DAYS, ENEMY_TYPES, BOSSES } from './levels.js';

export function createState(difficulty, rng) {
  const d = difficulty;
  return {
    difficulty: d,
    rng,
    mode: 'title',
    time: 0,
    day: 1,
    dayTime: 0,
    warden: { x: 640, y: 560, hp: d.hearts, maxHp: d.hearts, invuln: 0, speed: WARDEN.speed },
    hive: { hp: d.hiveHp, maxHp: d.hiveHp },
    bees: { cap: SWARM.beesBase, list: [], regrowT: 0 },
    flowers: [],
    enemies: [],
    webs: [],
    drops: [],
    honey: 0,
    honeyEarned: 0,
    score: 0,
    chain: 0,
    chainT: 0,
    longestChain: 0,
    smoke: { cd: 0, active: 0, x: 0, y: 0, radius: SMOKE.radiusBase },
    flowerCd: 0,
    rally: { x: HIVE.x, y: HIVE.y, active: false, t: 0 },
    spawnQueue: [],
    bossSpawned: false,
    dayDef: null,
    stats: { banished: 0, timeSurvived: 0, flowersPlanted: 0, damageTaken: 0, honeyLost: 0 },
    upgrades: {},
    relics: new Set(),
    // juice state (visual only, never affects the sim)
    fx: { trauma: 0, hitstop: 0, hitstopId: 0, particles: [], pops: [] },
    muted: false,
    shakeOn: true,
  };
}

export function derived(state) {
  // Stats the player has bought, folded into one object for the sim to use.
  const u = state.upgrades;
  const r = state.relics;
  const sting = SWARM.stingDamage + (u.sharpStings || 0);
  return {
    sting,
    beeSpeed: SWARM.beeSpeed * (1 + 0.25 * (u.swiftWings || 0)),
    beeCap: Math.min(SWARM.beesMax, SWARM.beesBase + 4 * (u.moreBees || 0)),
    attackRadius: SWARM.attackRadius * (1 + 0.4 * (u.longReach || 0)) * (r.has('amberLens') ? 1.6 : 1),
    smokeCd: SMOKE.cooldownBase * Math.pow(0.75, u.coolSmoke || 0),
    smokeRadius: SMOKE.radiusBase * (1 + 0.5 * (u.wideSmoke || 0)),
    smokeDuration: SMOKE.durationBase + (r.has('silverSmoker') ? 2 : 0),
    flowerMax: FLOWER.maxBase + 2 * (u.richBlooms || 0),
    flowerHoney: FLOWER.honeyPerTick * (u.richBlooms ? 2 : 1) * (r.has('sunpetalCrown') ? 2 : 1),
    flowerBeeSeconds: SWARM.regrowFlower / ((u.richBlooms ? 2 : 1) * (r.has('sunpetalCrown') ? 2 : 1)),
    regrowSeconds: SWARM.regrowHive / (1 + 0.5 * (u.quickHive || 0)) / (r.has('royalJelly') ? 2 : 1),
    honeyMult: (1 + 0.25 * (u.honeyMagnet || 0)) * (r.has('goldenComb') ? 1.5 : 1),
    bossDamageMult: r.has('queensFavor') ? 1.25 : 1,
    invuln: WARDEN.invulnSeconds + (r.has('wardensVeil') ? 0.5 : 0),
    chainWindow: SCORE.chainWindow + 2 * (u.chainKeeper || 0),
    chainMax: SCORE.chainMax + (u.chainKeeper || 0), // each stack raises the chain cap by 1
    chainMult: 1,
  };
}

export function startDay(state, dayNum) {
  const def = DAYS[dayNum - 1];
  state.dayDef = def;
  state.day = dayNum;
  state.dayTime = 0;
  state.mode = 'play';
  state.enemies = [];
  state.webs = [];
  state.drops = [];
  state.spawnQueue = def.batches.map((b) => ({ ...b, fired: false }));
  state.bossSpawned = false;
  state.rally = { x: HIVE.x, y: HIVE.y, active: false, t: 0 };
  // The warden starts each day by the hive, bees regroup.
  state.warden.x = 640; state.warden.y = 560;
  state.warden.invuln = 0;
  // Overnight the hive recovers a little (+10 HP) — the fork is the rest
  // beat, and a single bad day must not spiral into a lost run.
  state.hive.hp = Math.min(state.hive.maxHp, state.hive.hp + 10);
  if (state.relics.has('honeyPot')) { state.honey += 15; state.honeyEarned += 15; }
  // Top up bees to the cap at day start (the hive recovers overnight).
  const dv = derived(state);
  while (state.bees.list.length < Math.min(state.bees.cap, dv.beeCap)) addBee(state);
  state.bees.cap = dv.beeCap;
}

function spawnEdgePoint(rng, edge) {
  const m = 30;
  if (edge === 'top') return { x: rng.range(60, 1220), y: -m };
  if (edge === 'bottom') return { x: rng.range(60, 1220), y: 720 + m };
  if (edge === 'left') return { x: -m, y: rng.range(60, 660) };
  return { x: 1280 + m, y: rng.range(60, 660) };
}

export function spawnEnemy(state, kind, edge, isBoss = false) {
  const d = state.difficulty;
  const def = isBoss ? BOSSES[kind] : ENEMY_TYPES[kind];
  const p = spawnEdgePoint(state.rng, edge || state.rng.pick(['top', 'bottom', 'left', 'right']));
  const e = {
    kind, isBoss,
    name: def.name,
    x: p.x, y: p.y,
    hp: def.hp * d.enemyHp, maxHp: def.hp * d.enemyHp,
    speed: def.speed, radius: def.radius, damage: def.damage * d.enemyDamage,
    behavior: def.behavior || 'boss',
    slowT: 0, webCd: 4 + state.rng.range(0, 3), spawnT: 0,
    carrying: 0, // honey a moth-thief is hauling
    stingCd: 0, // hornets/empress swat bees
    vx: 0, vy: 0,
  };
  if (isBoss) e.spawnDef = def.spawn;
  state.enemies.push(e);
  return e;
}

function addBee(state) {
  const a = state.rng.range(0, Math.PI * 2);
  state.bees.list.push({
    x: HIVE.x + Math.cos(a) * 60, y: HIVE.y + Math.sin(a) * 60,
    state: 'orbit', target: null, stingCd: 0, orbitA: a, homeT: 0,
  });
}

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

export function commandSwarm(state, x, y) {
  state.rally = { x, y, active: true, t: 0 };
  const dv = derived(state);
  // Bees engage: every bee picks the nearest enemy to the rally point.
  for (const bee of state.bees.list) {
    const target = nearestEnemy(state, x, y, dv.attackRadius);
    if (target) { bee.state = 'attack'; bee.target = target; bee.homeT = SWARM.returnSeconds; }
    else { bee.state = 'rally'; bee.target = null; }
  }
}

function nearestEnemy(state, x, y, maxR) {
  let best = null, bestD = maxR;
  for (const e of state.enemies) {
    const d = dist(x, y, e.x, e.y);
    if (d < bestD) { best = e; bestD = d; }
  }
  return best;
}

function banishEnemy(state, e, byChain = true) {
  const dv = derived(state);
  const idx = state.enemies.indexOf(e);
  if (idx !== -1) state.enemies.splice(idx, 1);
  state.stats.banished++;
  // Chain: a banish inside the window raises the multiplier.
  if (byChain) {
    state.chain = state.chainT > 0 ? Math.min(dv.chainMax, state.chain + 1) : 1;
    state.chainT = dv.chainWindow;
    state.longestChain = Math.max(state.longestChain, state.chain);
  }
  const mult = state.chain * dv.chainMult;
  let pts = (e.isBoss ? SCORE.points.boss : ENEMY_TYPES[e.kind].score) * mult;
  if (e.isBoss) pts += SCORE.bossBonus[e.kind] || 0;
  state.score += Math.round(pts * state.difficulty.scoreMult);
  // Honey drop.
  const honey = Math.round((e.isBoss ? HONEY.drops.boss : HONEY.drops[e.kind]) * dv.honeyMult);
  state.drops.push({ x: e.x, y: e.y, amount: honey, t: 0, vx: 0, vy: 0 });
  if (e.carrying > 0) state.drops.push({ x: e.x, y: e.y, amount: e.carrying, t: 0, vx: 0, vy: 0 });
  // Broodwasps burst into mites.
  if (e.kind === 'broodwasp' && !e.isBoss) {
    for (let i = 0; i < 3; i++) {
      const m = spawnEnemy(state, 'mite', 'top');
      m.x = e.x + state.rng.range(-24, 24); m.y = e.y + state.rng.range(-24, 24);
    }
  }
  addParticles(state, e.x, e.y, e.isBoss ? 26 : 8, e.isBoss ? '#ffd94d' : '#fff3b0');
  addPop(state, e.x, e.y - 14, `+${Math.round(pts * state.difficulty.scoreMult)}`, '#ffd94d');
  if (e.isBoss) {
    state.fx.trauma = Math.min(1, state.fx.trauma + 0.8);
    hitStop(state, 0.12);
  }
  return pts;
}

export function addParticles(state, x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = state.rng.range(0, Math.PI * 2);
    const sp = state.rng.range(30, 160);
    state.fx.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: state.rng.range(0.3, 0.8), color, r: state.rng.range(2, 5) });
  }
  if (state.fx.particles.length > 400) state.fx.particles.splice(0, state.fx.particles.length - 400);
}

export function addPop(state, x, y, text, color) {
  state.fx.pops.push({ x, y, text, color, t: 0, life: 1.0 });
  if (state.fx.pops.length > 24) state.fx.pops.shift();
}

export function hitStop(state, seconds) {
  state.fx.hitstop = Math.max(state.fx.hitstop, seconds);
  state.fx.hitstopId++;
}

export function useSmoke(state) {
  const dv = derived(state);
  if (state.smoke.cd > 0 || state.mode !== 'play') return false;
  state.smoke.cd = dv.smokeCd;
  state.smoke.active = dv.smokeDuration;
  state.smoke.x = state.warden.x; state.smoke.y = state.warden.y;
  state.smoke.radius = dv.smokeRadius;
  if (state.relics.has('beekeepersBell')) {
    for (let i = 0; i < 2 && state.bees.list.length < state.bees.cap; i++) addBee(state);
  }
  addParticles(state, state.warden.x, state.warden.y, 18, '#cfd4d8');
  return true;
}

export function plantFlower(state) {
  const dv = derived(state);
  if (state.flowerCd > 0 || state.mode !== 'play') return false;
  if (state.honey < FLOWER.costHoney) return false;
  if (state.flowers.length >= dv.flowerMax) return false;
  state.honey -= FLOWER.costHoney;
  state.flowerCd = FLOWER.cooldown;
  state.flowers.push({ x: state.warden.x, y: state.warden.y, grow: FLOWER.growSeconds, honeyT: 0, beeT: 0 });
  state.stats.flowersPlanted++;
  addParticles(state, state.warden.x, state.warden.y, 10, '#ff8fb3');
  return true;
}

export function update(state, dt, input) {
  state.time += dt;
  // Juice timers run on real time.
  if (state.fx.hitstop > 0) { state.fx.hitstop -= dt; if (state.fx.hitstop < 0) state.fx.hitstop = 0; }
  if (state.fx.trauma > 0) state.fx.trauma = Math.max(0, state.fx.trauma - dt * 1.4);
  for (const p of state.fx.particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98; }
  state.fx.particles = state.fx.particles.filter((p) => p.t < p.life);
  for (const p of state.fx.pops) { p.t += dt; p.y -= 24 * dt; }
  state.fx.pops = state.fx.pops.filter((p) => p.t < p.life);
  if (state.chainT > 0) { state.chainT -= dt; if (state.chainT <= 0) state.chain = 0; }

  if (state.mode !== 'play') return;
  const dv = derived(state);
  state.dayTime += dt;
  state.stats.timeSurvived += dt;

  // --- input: warden movement ---
  const mv = input.moveVector();
  const w = state.warden;
  const wSpeed = w.speed * (webSlowAt(state, w.x, w.y) ? 0.6 : 1);
  w.x = clamp(w.x + mv.x * wSpeed * dt, 24, 1256);
  w.y = clamp(w.y + mv.y * wSpeed * dt, 88, 696); // HUD occupies the top 64px
  if (w.invuln > 0) w.invuln -= dt;

  // --- input: swarm command / smoke / flower ---
  const click = input.takeClick();
  if (click) commandSwarm(state, click.x, click.y);
  if (input.pressed('Space')) useSmoke(state);
  if (input.pressed('KeyE')) plantFlower(state);
  if (state.smoke.cd > 0) state.smoke.cd -= dt;
  if (state.smoke.active > 0) state.smoke.active -= dt;
  if (state.flowerCd > 0) state.flowerCd -= dt;
  if (state.rally.active) { state.rally.t += dt; if (state.rally.t > 1.2) state.rally.active = false; }

  // --- spawn batches ---
  for (const b of state.spawnQueue) {
    if (!b.fired && state.dayTime >= b.at) {
      b.fired = true;
      for (let i = 0; i < b.count; i++) spawnEnemy(state, b.kind, b.edge);
    }
  }
  if (state.dayDef.boss && !state.bossSpawned && state.dayTime >= 4) {
    state.bossSpawned = true;
    spawnEnemy(state, state.dayDef.boss, 'top', true);
  }

  // --- bees: regrow, then per-bee behavior ---
  state.bees.cap = dv.beeCap;
  state.bees.regrowT += dt;
  if (state.bees.regrowT >= dv.regrowSeconds && state.bees.list.length < state.bees.cap) {
    state.bees.regrowT = 0;
    addBee(state);
  }
  for (const bee of state.bees.list) {
    if (bee.stingCd > 0) bee.stingCd -= dt;
    const slowed = webSlowAt(state, bee.x, bee.y) ? 0.6 : 1;
    const spd = dv.beeSpeed * slowed;
    if (bee.state === 'attack' && bee.target && state.enemies.includes(bee.target)) {
      const t = bee.target;
      const d = dist(bee.x, bee.y, t.x, t.y);
      if (d > t.radius + 10) {
        moveToward(bee, t.x, t.y, spd, dt);
      } else if (bee.stingCd <= 0) {
        bee.stingCd = SWARM.stingCooldown;
        const dmg = dv.sting * (t.isBoss ? dv.bossDamageMult : 1);
        t.hp -= dmg;
        addParticles(state, t.x, t.y, 2, '#ffe14d');
        if (t.hp <= 0) { banishEnemy(state, t); bee.state = 'orbit'; bee.target = null; }
      }
    } else if (bee.state === 'rally') {
      const d = dist(bee.x, bee.y, state.rally.x, state.rally.y);
      if (d > 12) moveToward(bee, state.rally.x, state.rally.y, spd, dt);
      else { bee.state = 'orbit'; }
    } else {
      // orbit the hive; idle bees auto-defend the hive against close enemies.
      const close = nearestEnemy(state, HIVE.x, HIVE.y, 150);
      if (close && state.rng.next() < 0.5) { bee.state = 'attack'; bee.target = close; bee.homeT = SWARM.returnSeconds; }
      else {
        bee.orbitA += dt * 0.9;
        const tx = HIVE.x + Math.cos(bee.orbitA) * SWARM.orbitRadius;
        const ty = HIVE.y + Math.sin(bee.orbitA) * SWARM.orbitRadius;
        moveToward(bee, tx, ty, spd, dt);
      }
    }
    if (bee.state === 'attack') {
      bee.homeT -= dt;
      if (bee.homeT <= 0 || !bee.target || !state.enemies.includes(bee.target)) { bee.state = 'orbit'; bee.target = null; }
    }
  }

  // --- flowers: grow, produce honey + bees ---
  for (const f of state.flowers) {
    if (f.grow > 0) { f.grow -= dt; continue; }
    f.honeyT += dt;
    if (f.honeyT >= FLOWER.honeyTickSeconds) {
      f.honeyT = 0;
      const amt = Math.round(dv.flowerHoney * dv.honeyMult);
      state.honey += amt; state.honeyEarned += amt;
      addPop(state, f.x, f.y - 18, `+${amt}🍯`, '#f6d95c');
    }
    f.beeT += dt;
    if (f.beeT >= dv.flowerBeeSeconds && state.bees.list.length < state.bees.cap) {
      f.beeT = 0;
      addBee(state);
    }
  }

  // --- enemies: movement + attacks ---
  for (const e of [...state.enemies]) {
    if (e.slowT > 0) e.slowT -= dt;
    const inSmoke = state.smoke.active > 0 && dist(e.x, e.y, state.smoke.x, state.smoke.y) < state.smoke.radius;
    let tx = HIVE.x, ty = HIVE.y, sp = e.speed;
    if (e.behavior === 'flowers') {
      const f = state.flowers.find((fl) => fl.grow <= 0);
      if (f) { tx = f.x; ty = f.y; }
    } else if (e.behavior === 'hunter') {
      // Hornets hunt the warden when close, otherwise the hive.
      if (dist(e.x, e.y, w.x, w.y) < 220) { tx = w.x; ty = w.y; }
    } else if (e.behavior === 'thief') {
      const drop = state.drops[0];
      if (e.carrying > 0) { tx = e.x < 640 ? -40 : 1320; ty = e.y; sp = e.speed * 1.15; }
      else if (drop) { tx = drop.x; ty = drop.y; }
      else { tx = HIVE.x; ty = HIVE.y; }
    }
    if (inSmoke && (e.kind === 'wasp' || e.kind === 'hornet' || e.isBoss)) {
      sp *= SMOKE.slowFactor;
      // Repel: push away from the smoke center.
      const a = Math.atan2(e.y - state.smoke.y, e.x - state.smoke.x);
      e.x += Math.cos(a) * 90 * dt; e.y += Math.sin(a) * 90 * dt;
    }
    if (e.slowT > 0) sp *= 0.6;
    if (webSlowAt(state, e.x, e.y) && e.kind !== 'spider') sp *= 0.7;
    moveToward(e, tx, ty, sp, dt);

    // Boss spawns.
    if (e.isBoss && e.spawnDef) {
      e.spawnT += dt;
      if (e.spawnT >= e.spawnDef.every) {
        e.spawnT = 0;
        const alive = state.enemies.filter((x) => x.kind === e.spawnDef.kind).length;
        if (alive < e.spawnDef.max) spawnEnemy(state, e.spawnDef.kind, state.rng.pick(['top', 'left', 'right']));
      }
    }
    // Spider webs.
    if (e.kind === 'spider') {
      e.webCd -= dt;
      if (e.webCd <= 0) {
        e.webCd = 6;
        state.webs.push({ x: e.x, y: e.y, r: 70, t: 8 });
      }
    }
    // Hornet / Empress swat bees.
    if ((e.kind === 'hornet' || e.isBoss) && e.stingCd > 0) e.stingCd -= dt;
    if ((e.kind === 'hornet' || e.isBoss) && e.stingCd <= 0) {
      const bee = state.bees.list.find((b) => dist(b.x, b.y, e.x, e.y) < e.radius + 14);
      if (bee) {
        e.stingCd = 0.6;
        state.bees.list.splice(state.bees.list.indexOf(bee), 1);
        addParticles(state, bee.x, bee.y, 5, '#ffe14d');
      }
    }

    // Contact with the hive.
    const dh = dist(e.x, e.y, HIVE.x, HIVE.y);
    if (dh < HIVE.r + e.radius) {
      if (e.behavior === 'flowers') {
        const f = state.flowers.find((fl) => dist(fl.x, fl.y, e.x, e.y) < 30);
        if (f) {
          state.flowers.splice(state.flowers.indexOf(f), 1);
          addParticles(state, f.x, f.y, 8, '#ff8fb3');
          e.x += (e.x - HIVE.x) * 0.1; // step back after eating
          continue;
        }
      }
      damageHive(state, e.damage);
      // Knock the attacker back a little so one enemy is not a machine gun.
      const a = Math.atan2(e.y - HIVE.y, e.x - HIVE.x);
      e.x = HIVE.x + Math.cos(a) * (HIVE.r + e.radius + 6);
      e.y = HIVE.y + Math.sin(a) * (HIVE.r + e.radius + 6);
      if (state.relics.has('thornHedge')) {
        e.hp -= 1;
        if (e.hp <= 0) banishEnemy(state, e);
      }
    }
    // Contact with the warden.
    if (e.damage > 0 && dist(e.x, e.y, w.x, w.y) < e.radius + WARDEN.radius) {
      if (w.invuln <= 0) {
        w.hp -= 1;
        w.invuln = dv.invuln;
        state.stats.damageTaken++;
        state.fx.trauma = Math.min(1, state.fx.trauma + 0.45);
        addParticles(state, w.x, w.y, 10, '#ff5a5a');
        if (w.hp <= 0) { endRun(state, 'defeat'); return; }
      }
      const a = Math.atan2(e.y - w.y, e.x - w.x);
      e.x = w.x + Math.cos(a) * (WARDEN.radius + e.radius + 4);
      e.y = w.y + Math.sin(a) * (WARDEN.radius + e.radius + 4);
    }
    // Moth-thief steals a drop, then flees.
    if (e.kind === 'moth' && e.carrying === 0 && state.drops.length > 0) {
      const drop = state.drops[0];
      if (dist(e.x, e.y, drop.x, drop.y) < 16) {
        e.carrying = drop.amount;
        state.drops.shift();
        addPop(state, e.x, e.y - 14, 'stolen!', '#b8a88a');
      }
    }
    if (e.kind === 'moth' && e.carrying > 0 && (e.x < 0 || e.x > 1280)) {
      state.stats.honeyLost += e.carrying;
      e.carrying = 0;
      // The thief escapes; it leaves the field.
      state.enemies.splice(state.enemies.indexOf(e), 1);
    }
  }

  // Enemy separation (cheap pairwise push so they do not stack).
  const list = state.enemies;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const d = dist(a.x, a.y, b.x, b.y);
      const min = a.radius + b.radius;
      if (d > 0.01 && d < min) {
        const push = (min - d) / 2;
        const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
      }
    }
  }

  // --- webs expire ---
  for (const wb of state.webs) wb.t -= dt;
  state.webs = state.webs.filter((wb) => wb.t > 0);

  // --- honey drops drift to the hive ---
  for (const drop of state.drops) {
    drop.t += dt;
    if (drop.t > 0.8) moveToward(drop, HIVE.x, HIVE.y, 260, dt);
    if (dist(drop.x, drop.y, HIVE.x, HIVE.y) < HIVE.r) {
      state.honey += drop.amount; state.honeyEarned += drop.amount;
      drop.done = true;
    }
  }
  state.drops = state.drops.filter((d) => !d.done);

  // --- day end: all batches fired and the field is clear ---
  // (Guard: if the run already ended — hive/warden down — never override it.)
  if (state.mode !== 'play') return;
  const allFired = state.spawnQueue.every((b) => b.fired);
  if (allFired && state.enemies.length === 0) {
    dayClear(state);
  }
}

function webSlowAt(state, x, y) {
  return state.webs.some((wb) => dist(x, y, wb.x, wb.y) < wb.r);
}

function moveToward(o, tx, ty, speed, dt) {
  const d = dist(o.x, o.y, tx, ty);
  if (d < 0.5) return;
  o.x += ((tx - o.x) / d) * speed * dt;
  o.y += ((ty - o.y) / d) * speed * dt;
}

function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

function damageHive(state, dmg) {
  state.hive.hp -= dmg;
  state.stats.damageTaken += dmg;
  state.fx.trauma = Math.min(1, state.fx.trauma + 0.3);
  if (state.hive.hp <= 0) {
    state.hive.hp = 0;
    endRun(state, 'defeat');
  }
}

function dayClear(state) {
  const def = state.dayDef;
  const timeBonus = Math.max(0, Math.round((def.par - state.dayTime) * 5));
  const bonus = SCORE.dayClear * state.day + timeBonus;
  state.score += Math.round(bonus * state.difficulty.scoreMult);
  addPop(state, HIVE.x, HIVE.y - 60, `Day ${state.day} clear! +${bonus}`, '#ffd94d');
  if (state.day >= 10) {
    // The final day: no fork, no upgrade — straight to the victory screen.
    endRun(state, 'victory');
    return;
  }
  state.mode = 'fork';
}

export function endRun(state, mode) {
  state.mode = mode;
  if (mode === 'victory') {
    // Leftover honey converts to score.
    state.score += Math.round(state.honey * SCORE.honeyToScore * state.difficulty.scoreMult);
  }
}

export function victoryRank(state) {
  const s = state.score;
  if (s >= SCORE.rankS) return 'S';
  if (s >= SCORE.rankA) return 'A';
  if (s >= SCORE.rankB) return 'B';
  return 'C';
}

// --- between-days economy (called by the UI) ---

export function applyRoad(state, road) {
  if (road === 'shrine') {
    if (state.honey >= HONEY.shrineCost) {
      state.honey -= HONEY.shrineCost;
      state.warden.hp = Math.min(state.warden.maxHp, state.warden.hp + 2);
      for (let i = 0; i < 4 && state.bees.list.length < state.bees.cap; i++) addBee(state);
    } else {
      state.warden.hp = Math.min(state.warden.maxHp, state.warden.hp + 1);
    }
  } else if (road === 'quiet') {
    state.honey += HONEY.quietMeadowGift;
    state.honeyEarned += HONEY.quietMeadowGift;
    for (let i = 0; i < 2 && state.bees.list.length < state.bees.cap; i++) addBee(state);
  }
  // 'market' is handled by the shop UI; no immediate effect here.
}

export function applyUpgrade(state, key) {
  const cur = state.upgrades[key] || 0;
  state.upgrades[key] = cur + 1;
  const dv = derived(state);
  if (key === 'moreBees') state.bees.cap = dv.beeCap;
  if (key === 'hiveArmor') {
    state.hive.maxHp += 20;
    state.hive.hp = Math.min(state.hive.maxHp, state.hive.hp + 20);
  }
  if (key === 'sturdyWarden') {
    state.warden.maxHp += 1;
    state.warden.hp = Math.min(state.warden.maxHp, state.warden.hp + 1);
  }
}

export function buyRelic(state, relic) {
  if (state.honey < relic.cost || state.relics.has(relic.key)) return false;
  state.honey -= relic.cost;
  state.relics.add(relic.key);
  return true;
}

export function buyConsumable(state, item) {
  if (state.honey < item.cost) return false;
  state.honey -= item.cost;
  if (item.key === 'mending') state.hive.hp = Math.min(state.hive.maxHp, state.hive.hp + 30);
  if (item.key === 'beePacket') for (let i = 0; i < 6 && state.bees.list.length < state.bees.cap; i++) addBee(state);
  if (item.key === 'heartMeal') state.warden.hp = Math.min(state.warden.maxHp, state.warden.hp + 2);
  return true;
}
