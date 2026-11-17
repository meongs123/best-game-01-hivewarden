// HIVEWARDEN — canvas rendering. Everything is drawn in code (no assets):
// procedural meadow (grass tufts, wildflowers, trees, river, apples per
// meadow), the hive, flowers, webs, enemies with distinct silhouettes,
// bees, the warden, smoke, honey drops, particles, number pops, and the HUD.
// Decoration is seeded per (meadow, day) so it is stable across frames and
// identical across runs with the same seed.
import { HIVE, VIEW, MEADOWS, SCORE } from './config.js';
import { ENEMY_TYPES, BOSSES } from './levels.js';
import { makeRng } from './rng.js';

const decoCache = new Map();

function decoFor(meadowKey, day) {
  const key = meadowKey + ':' + day;
  if (decoCache.has(key)) return decoCache.get(key);
  const rng = makeRng('deco-' + meadowKey + '-' + day);
  const deco = { tufts: [], blooms: [], trees: [], apples: [], stones: [] };
  for (let i = 0; i < 130; i++) deco.tufts.push({ x: rng.range(10, 1270), y: rng.range(80, 710), s: rng.range(0.7, 1.4) });
  for (let i = 0; i < 26; i++) deco.blooms.push({ x: rng.range(20, 1260), y: rng.range(90, 700), c: rng.pick(['#ff8fb3', '#ffffff', '#ffd94d', '#c9a7ff']) });
  for (let i = 0; i < 7; i++) deco.trees.push({ x: rng.range(50, 1230), y: rng.range(100, 200), s: rng.range(0.8, 1.3) });
  for (let i = 0; i < 12; i++) deco.apples.push({ x: rng.range(40, 1240), y: rng.range(90, 680) });
  for (let i = 0; i < 10; i++) deco.stones.push({ x: rng.range(30, 1250), y: rng.range(100, 700), r: rng.range(4, 10) });
  decoCache.set(key, deco);
  return deco;
}

function shakeOffset(state, t) {
  // Trauma-based shake (game-feel skill): trauma^2, summed sines, visual only.
  if (!state.shakeOn || state.fx.trauma <= 0) return { x: 0, y: 0 };
  const s = state.fx.trauma * state.fx.trauma;
  return {
    x: 12 * s * Math.sin(t * 51.7),
    y: 9 * s * Math.sin(t * 69.1),
  };
}

export function render(state, ctx, t) {
  const meadow = MEADOWS.find((m) => m.key === (state.dayDef?.meadow || 'clover')) || MEADOWS[0];
  const off = shakeOffset(state, t);
  ctx.save();
  ctx.translate(off.x, off.y);

  drawMeadow(ctx, meadow, state);
  drawWebs(ctx, state);
  drawFlowers(ctx, state);
  drawHive(ctx, state);
  drawDrops(ctx, state);
  drawEnemies(ctx, state);
  drawBees(ctx, state);
  drawWarden(ctx, state);
  drawSmoke(ctx, state);
  drawRally(ctx, state);
  drawParticles(ctx, state);
  drawPops(ctx, state);

  ctx.restore();
  drawHUD(ctx, state, meadow);
}

function drawMeadow(ctx, meadow, state) {
  const deco = decoFor(meadow.key, state.day);
  // Ground.
  ctx.fillStyle = meadow.ground;
  ctx.fillRect(-20, -20, VIEW.W + 40, VIEW.H + 40);
  // Soft radial light in the middle (the hive's clearing).
  const g = ctx.createRadialGradient(640, 380, 60, 640, 380, 520);
  g.addColorStop(0, 'rgba(255, 246, 200, 0.35)');
  g.addColorStop(1, 'rgba(255, 246, 200, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  // River band for the riverbank meadow.
  if (meadow.key === 'river') {
    ctx.fillStyle = '#5fb7e8';
    ctx.beginPath();
    ctx.moveTo(0, 150); ctx.bezierCurveTo(400, 110, 800, 190, 1280, 130);
    ctx.lineTo(1280, 175); ctx.bezierCurveTo(800, 235, 400, 155, 0, 195);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, 160); ctx.bezierCurveTo(400, 125, 800, 200, 1280, 145);
    ctx.lineTo(1280, 152); ctx.bezierCurveTo(800, 207, 400, 132, 0, 167);
    ctx.closePath(); ctx.fill();
  }
  // Grass tufts.
  ctx.strokeStyle = meadow.grassDark;
  ctx.lineWidth = 2;
  for (const tuft of deco.tufts) {
    ctx.beginPath();
    ctx.moveTo(tuft.x, tuft.y);
    ctx.lineTo(tuft.x - 3 * tuft.s, tuft.y - 8 * tuft.s);
    ctx.moveTo(tuft.x + 2, tuft.y);
    ctx.lineTo(tuft.x + 2, tuft.y - 10 * tuft.s);
    ctx.moveTo(tuft.x + 4, tuft.y);
    ctx.lineTo(tuft.x + 7 * tuft.s, tuft.y - 7 * tuft.s);
    ctx.stroke();
  }
  // Wildflowers.
  for (const b of deco.blooms) {
    ctx.fillStyle = b.c;
    ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f6d95c';
    ctx.beginPath(); ctx.arc(b.x, b.y, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  // Stones.
  ctx.fillStyle = '#b9b3a4';
  for (const s of deco.stones) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
  // Trees (top edge, out of the main play area).
  for (const tr of deco.trees) {
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(tr.x - 3, tr.y, 6, 14);
    ctx.fillStyle = meadow.grassDark;
    ctx.beginPath(); ctx.arc(tr.x, tr.y - 6, 22 * tr.s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = meadow.grass;
    ctx.beginPath(); ctx.arc(tr.x - 8, tr.y - 12, 14 * tr.s, 0, Math.PI * 2); ctx.fill();
  }
  // Apples in the orchard.
  if (meadow.key === 'orchard') {
    ctx.fillStyle = '#e8574a';
    for (const a of deco.apples) { ctx.beginPath(); ctx.arc(a.x, a.y, 3, 0, Math.PI * 2); ctx.fill(); }
  }
}

function drawWebs(ctx, state) {
  for (const wb of state.webs) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(wb.x, wb.y, wb.r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.moveTo(wb.x, wb.y);
      ctx.lineTo(wb.x + Math.cos(a) * wb.r, wb.y + Math.sin(a) * wb.r);
    }
    ctx.stroke();
  }
}

function drawFlowers(ctx, state) {
  for (const f of state.flowers) {
    const mature = f.grow <= 0;
    const s = mature ? 1 : 0.5;
    // Stem.
    ctx.strokeStyle = '#4a7d3a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x, f.y - 16 * s); ctx.stroke();
    // Petals.
    ctx.fillStyle = mature ? '#ff8fb3' : '#d9a7b8';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 7 * s, f.y - 18 * s + Math.sin(a) * 7 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#f6d95c';
    ctx.beginPath(); ctx.arc(f.x, f.y - 18 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
  }
}

function drawHive(ctx, state) {
  const { x, y, r } = HIVE;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath(); ctx.ellipse(x, y + r + 4, r + 6, 10, 0, 0, Math.PI * 2); ctx.fill();
  // Skep (beehive): stacked golden bands.
  const bands = ['#e8b64c', '#d9a13b', '#e8b64c', '#c98f2e', '#e8b64c'];
  for (let i = 0; i < bands.length; i++) {
    ctx.fillStyle = bands[i];
    const w = r * (1 - i * 0.12);
    const by = y + r - 8 - i * 14;
    ctx.beginPath(); ctx.ellipse(x, by, w, 9, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - w, by - 9, w * 2, 9);
  }
  // Entrance.
  ctx.fillStyle = '#4a2f10';
  ctx.beginPath(); ctx.arc(x, y + r - 12, 7, 0, Math.PI * 2); ctx.fill();
  // Hive HP ring.
  const frac = state.hive.hp / state.hive.maxHp;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = frac > 0.5 ? '#7dc24a' : frac > 0.25 ? '#f6b93c' : '#e84a3c';
  ctx.beginPath(); ctx.arc(x, y, r + 8, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
}

function drawDrops(ctx, state) {
  for (const d of state.drops) {
    ctx.fillStyle = '#f6b93c';
    ctx.beginPath(); ctx.arc(d.x, d.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(d.x - 2, d.y - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a4a12';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.amount, d.x, d.y - 9);
  }
}

function drawEnemies(ctx, state) {
  for (const e of state.enemies) {
    const def = e.isBoss ? BOSSES[e.kind] : ENEMY_TYPES[e.kind];
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.slowT > 0) { ctx.globalAlpha = 0.75; }
    // Body by kind — distinct silhouettes so the player reads the threat.
    if (e.kind === 'mite') {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); ctx.stroke(); }
    } else if (e.kind === 'wasp' || e.kind === 'hornet') {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(0, 0, e.radius, e.radius * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.fillRect(-e.radius * 0.4, -e.radius * 0.7, 3, e.radius * 1.4);
      ctx.fillRect(e.radius * 0.2, -e.radius * 0.7, 3, e.radius * 1.4);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.ellipse(-4, -e.radius - 4, 7, 3.5, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(4, -e.radius - 4, 7, 3.5, 0.5, 0, Math.PI * 2); ctx.fill();
    } else if (e.kind === 'spider') {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = def.color; ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 22, Math.sin(a) * 22); ctx.stroke(); }
      ctx.fillStyle = '#ff5a5a';
      ctx.beginPath(); ctx.arc(-4, -3, 2, 0, Math.PI * 2); ctx.arc(4, -3, 2, 0, Math.PI * 2); ctx.fill();
    } else if (e.kind === 'moth') {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.ellipse(-8, 0, 10, 6, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8, 0, 10, 6, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
      if (e.carrying > 0) {
        ctx.fillStyle = '#f6b93c';
        ctx.beginPath(); ctx.arc(0, 8, 5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (e.kind === 'broodwasp') {
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d9b3ff';
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 7, Math.sin(a) * 7, 3, 0, Math.PI * 2); ctx.fill(); }
    } else if (e.isBoss) {
      // Boss: big body, crown/spikes, HP bar above.
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd94d';
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * e.radius, Math.sin(a) * e.radius); ctx.lineTo(Math.cos(a) * (e.radius + 10), Math.sin(a) * (e.radius + 10)); ctx.lineTo(Math.cos(a + 0.3) * e.radius, Math.sin(a + 0.3) * e.radius); ctx.fill(); }
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-10, -6, 4, 0, Math.PI * 2); ctx.arc(10, -6, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff5a5a';
      ctx.beginPath(); ctx.arc(-10, -6, 2, 0, Math.PI * 2); ctx.arc(10, -6, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // HP bar for damaged enemies and bosses.
    if (e.hp < e.maxHp) {
      const w = e.isBoss ? 70 : 30;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 5);
      ctx.fillStyle = e.isBoss ? '#e84a3c' : '#ff8c42';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * Math.max(0, e.hp / e.maxHp), 5);
    }
  }
}

function drawBees(ctx, state) {
  for (const bee of state.bees.list) {
    ctx.fillStyle = '#f6b93c';
    ctx.beginPath(); ctx.arc(bee.x, bee.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(bee.x - 1, bee.y - 4, 2, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(bee.x - 2, bee.y - 5, 3.5, 2, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(bee.x + 2, bee.y - 5, 3.5, 2, 0.4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawWarden(ctx, state) {
  const w = state.warden;
  const blink = w.invuln > 0 && Math.floor(w.invuln * 10) % 2 === 0;
  ctx.save();
  ctx.translate(w.x, w.y);
  if (blink) ctx.globalAlpha = 0.45;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(0, 14, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  // Body: cream suit.
  ctx.fillStyle = '#f5efe0';
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9b896'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.stroke();
  // Veil (hat with mesh).
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath(); ctx.ellipse(0, -6, 17, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(90,70,40,0.55)';
  ctx.beginPath(); ctx.arc(0, -2, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath(); ctx.arc(-3.5, -3, 1.6, 0, Math.PI * 2); ctx.arc(3.5, -3, 1.6, 0, Math.PI * 2); ctx.fill();
  // Smoker in hand.
  ctx.fillStyle = '#8a8f96';
  ctx.fillRect(12, 2, 7, 10);
  ctx.restore();
}

function drawSmoke(ctx, state) {
  if (state.smoke.active <= 0) return;
  const a = Math.min(0.45, 0.18 + state.smoke.active * 0.1);
  ctx.fillStyle = `rgba(210, 216, 222, ${a})`;
  ctx.beginPath(); ctx.arc(state.smoke.x, state.smoke.y, state.smoke.radius, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(state.smoke.x, state.smoke.y, state.smoke.radius, 0, Math.PI * 2); ctx.stroke();
}

function drawRally(ctx, state) {
  if (!state.rally.active) return;
  const age = state.rally.t;
  const r = 14 + age * 26;
  ctx.strokeStyle = `rgba(255, 217, 77, ${Math.max(0, 0.9 - age)})`;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(state.rally.x, state.rally.y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = `rgba(255, 217, 77, ${Math.max(0, 0.9 - age)})`;
  ctx.beginPath(); ctx.arc(state.rally.x, state.rally.y, 4, 0, Math.PI * 2); ctx.fill();
}

function drawParticles(ctx, state) {
  for (const p of state.fx.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPops(ctx, state) {
  ctx.textAlign = 'center';
  for (const p of state.fx.pops) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

function drawHUD(ctx, state, meadow) {
  // Top bar.
  ctx.fillStyle = 'rgba(40, 32, 12, 0.82)';
  ctx.fillRect(0, 0, VIEW.W, 64);
  ctx.fillStyle = '#f6d95c';
  ctx.fillRect(0, 64, VIEW.W, 3);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Hearts (warden).
  for (let i = 0; i < state.warden.maxHp; i++) {
    ctx.font = '22px sans-serif';
    ctx.fillText(i < state.warden.hp ? '❤️' : '🤍', 14 + i * 26, 32);
  }
  // Hive HP bar.
  ctx.fillStyle = '#3a2f16';
  ctx.fillRect(170, 20, 130, 14);
  ctx.fillStyle = state.hive.hp / state.hive.maxHp > 0.5 ? '#7dc24a' : '#e84a3c';
  ctx.fillRect(170, 20, 130 * Math.max(0, state.hive.hp / state.hive.maxHp), 14);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`HIVE ${Math.ceil(state.hive.hp)}/${state.hive.maxHp}`, 174, 41);

  // Day dots + day name (center).
  const dayName = state.dayDef ? `Day ${state.day} — ${state.dayDef.name}` : `Day ${state.day}`;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(dayName, 640, 20);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i < state.day - 1 ? '#f6d95c' : i === state.day - 1 ? '#fff' : 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.arc(560 + i * 18, 44, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ffd94d';
  ctx.font = '12px sans-serif';
  ctx.fillText(meadow.name, 640, 58);

  // Right: honey, bees, score, chain.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`🍯 ${Math.floor(state.honey)}`, 1000, 20);
  ctx.fillText(`🐝 ${state.bees.list.length}/${state.bees.cap}`, 1000, 44);
  ctx.fillStyle = '#ffd94d';
  ctx.fillText(`Score ${state.score.toLocaleString()}`, 1266, 20);
  if (state.chain > 1) {
    ctx.fillStyle = '#ff9d5c';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`Chain x${state.chain}`, 1266, 44);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '13px sans-serif';
    ctx.fillText(`🌸 ${state.flowers.length} flowers`, 1266, 44);
  }

  // Boss bar.
  const boss = state.enemies.find((e) => e.isBoss);
  if (boss) {
    ctx.fillStyle = 'rgba(40, 32, 12, 0.82)';
    ctx.fillRect(440, 72, 400, 26);
    ctx.fillStyle = '#3a2f16';
    ctx.fillRect(448, 80, 384, 10);
    ctx.fillStyle = '#e84a3c';
    ctx.fillRect(448, 80, 384 * Math.max(0, boss.hp / boss.maxHp), 10);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(boss.name, 640, 84);
  }

  // Incoming preview (next unfired batch).
  const next = state.spawnQueue.find((b) => !b.fired);
  if (next && state.mode === 'play') {
    ctx.fillStyle = 'rgba(40, 32, 12, 0.7)';
    ctx.fillRect(1040, 72, 226, 24);
    ctx.fillStyle = '#ffd94d';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    const def = ENEMY_TYPES[next.kind];
    ctx.fillText(`Incoming: ${next.count}× ${def.name}`, 1256, 84);
  }

  // Smoke cooldown indicator.
  if (state.smoke.cd > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`💨 smoke ${Math.ceil(state.smoke.cd)}s`, 14, 84);
  }

  // Bottom control bar.
  ctx.fillStyle = 'rgba(40, 32, 12, 0.82)';
  ctx.fillRect(0, 688, VIEW.W, 32);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD move · Click — send the swarm · Space — smoke puff · E — plant flower (10🍯) · P — pause · M — mute', 640, 704);
}
