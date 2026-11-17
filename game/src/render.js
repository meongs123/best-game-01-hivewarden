// HIVEWARDEN — canvas renderer. All art is drawn procedurally (no assets,
// no network). Pastoral golden daytime look: warm grass, soft sun, flowers.
import { VIEW, ENEMIES, BOSSES, DAYS, meadowForDay } from './data.js';
import { clamp, dist } from './sim.js';
import { makeRng } from './rng.js';

const TAU = Math.PI * 2;

// Deterministic meadow decoration per (seed, day).
const decorCache = new Map();
function decorFor(seed, day) {
  const key = seed + ':' + day;
  if (decorCache.has(key)) return decorCache.get(key);
  const rng = makeRng(seed * 31 + day * 7919);
  const m = meadowForDay(day);
  const tufts = [];
  const clovers = [];
  const stones = [];
  const flowers = [];
  for (let i = 0; i < 90; i++) tufts.push({ x: rng.range(10, VIEW.w - 10), y: rng.range(10, VIEW.h - 10), s: rng.range(0.6, 1.4), a: rng.range(0, TAU) });
  for (let i = 0; i < 26; i++) clovers.push({ x: rng.range(20, VIEW.w - 20), y: rng.range(20, VIEW.h - 20), s: rng.range(0.7, 1.3) });
  for (let i = 0; i < 10; i++) stones.push({ x: rng.range(30, VIEW.w - 30), y: rng.range(30, VIEW.h - 30), r: rng.range(4, 10) });
  for (let i = 0; i < 18; i++) flowers.push({ x: rng.range(20, VIEW.w - 20), y: rng.range(20, VIEW.h - 20), c: rng.pick([m.flower, '#ffffff', '#ffd166']) });
  const out = { tufts, clovers, stones, flowers };
  decorCache.set(key, out);
  return out;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function text(ctx, str, x, y, size, color, align, weight, font) {
  ctx.fillStyle = color;
  ctx.font = `${weight || 'bold'} ${size}px ${font || 'Georgia, serif'}`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function drawFlower(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 4 * s, y + Math.sin(a) * 4 * s, 3.2 * s, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#ffb703';
  circle(ctx, x, y, 2.6 * s);
}

// ---------------------------------------------------------------------------
// Meadow background
// ---------------------------------------------------------------------------
function drawMeadow(ctx, s) {
  const m = meadowForDay(s.day);
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  g.addColorStop(0, m.ground);
  g.addColorStop(1, m.groundDark);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const d = decorFor(s.seed, s.day);
  // Meadow-specific feature bands.
  if (m.id === 'river') {
    ctx.fillStyle = '#7cc7e8';
    ctx.fillRect(0, 96, VIEW.w, 46);
    ctx.fillStyle = '#a5ddf5';
    ctx.fillRect(0, 96, VIEW.w, 12);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const x = ((s.elapsed * 20 + i * 220) % (VIEW.w + 100)) - 50;
      ctx.beginPath();
      ctx.moveTo(x, 118 + (i % 2) * 12);
      ctx.lineTo(x + 40, 118 + (i % 2) * 12);
      ctx.stroke();
    }
  }
  if (m.id === 'orchard') {
    // Apple trees along the top edge.
    for (let i = 0; i < 5; i++) {
      const x = 90 + i * 260;
      ctx.fillStyle = '#7a5230';
      ctx.fillRect(x - 5, 26, 10, 26);
      ctx.fillStyle = '#55883e';
      circle(ctx, x, 22, 34);
      circle(ctx, x - 22, 34, 22);
      circle(ctx, x + 22, 34, 22);
      ctx.fillStyle = '#6aa84f';
      circle(ctx, x - 8, 12, 14);
      circle(ctx, x + 16, 26, 10);
      ctx.fillStyle = '#e63946';
      circle(ctx, x - 12, 30, 4);
      circle(ctx, x + 10, 18, 4);
      circle(ctx, x + 20, 38, 4);
    }
  }
  if (m.id === 'hill') {
    // Rolling hill lines.
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 600);
    ctx.quadraticCurveTo(400, 560, 800, 600);
    ctx.quadraticCurveTo(1100, 630, 1280, 590);
    ctx.stroke();
  }
  // Grass tufts, clover, stones, wildflowers.
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 1.5;
  for (const t of d.tufts) {
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x + Math.cos(t.a) * 6 * t.s, t.y - 7 * t.s);
    ctx.moveTo(t.x + 4, t.y);
    ctx.lineTo(t.x + 4 + Math.cos(t.a + 0.6) * 5 * t.s, t.y - 6 * t.s);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (const c of d.clovers) {
    circle(ctx, c.x - 3 * c.s, c.y, 2.4 * c.s);
    circle(ctx, c.x + 3 * c.s, c.y, 2.4 * c.s);
    circle(ctx, c.x, c.y - 3 * c.s, 2.4 * c.s);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (const st of d.stones) circle(ctx, st.x, st.y, st.r);
  for (const f of d.flowers) drawFlower(ctx, f.x, f.y, 0.8, f.c);
  // Warm sun glow (top-right) + soft vignette.
  const sun = ctx.createRadialGradient(VIEW.w - 90, 70, 10, VIEW.w - 90, 70, 260);
  sun.addColorStop(0, 'rgba(255, 240, 180, 0.55)');
  sun.addColorStop(1, 'rgba(255, 240, 180, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  const vg = ctx.createRadialGradient(VIEW.w / 2, VIEW.h / 2, VIEW.h * 0.45, VIEW.w / 2, VIEW.h / 2, VIEW.h * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(60,40,0,0.18)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------
function drawHive(ctx, s) {
  const h = s.hive;
  const hurt = h.hurtCd > 0;
  // Shadow + stand.
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(h.x, h.y + 30, 46, 10, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#8d5a2b';
  ctx.fillRect(h.x - 40, h.y + 22, 80, 8);
  // Dome.
  const g = ctx.createLinearGradient(h.x, h.y - 34, h.x, h.y + 24);
  g.addColorStop(0, hurt ? '#ff9f6b' : '#f4d35e');
  g.addColorStop(1, hurt ? '#e76f51' : '#ee964b');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(h.x, h.y + 24, 38, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#b7791f';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(h.x, h.y + 24, 30 - i * 8, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
  }
  // Entrance.
  ctx.fillStyle = '#3a2410';
  ctx.beginPath();
  ctx.ellipse(h.x, h.y + 20, 9, 6, 0, 0, TAU);
  ctx.fill();
  // HP bar.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  rr(ctx, h.x - 34, h.y - 52, 68, 9, 4);
  ctx.fill();
  ctx.fillStyle = h.hp / h.maxHp > 0.35 ? '#7ee081' : '#ff6b6b';
  rr(ctx, h.x - 33, h.y - 51, 66 * clamp(h.hp / h.maxHp, 0, 1), 7, 3);
  ctx.fill();
  text(ctx, 'HIVE', h.x, h.y - 62, 11, '#fff8e0', 'center', 'bold', 'system-ui, sans-serif');
}

function drawKeeper(ctx, s) {
  const k = s.keeper;
  const blink = k.hurtCd > 0 && Math.floor(s.elapsed * 12) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.45;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(k.x, k.y + 15, 19, 6, 0, 0, TAU);
  ctx.fill();
  // Ground ring — marks the keeper as "you".
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(k.x, k.y + 15, 22, 8, 0, 0, TAU);
  ctx.stroke();
  // Body (white suit).
  ctx.fillStyle = '#f8f9fa';
  ctx.beginPath();
  ctx.arc(k.x, k.y, 16, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#c9c9c9';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Veil / hat.
  ctx.fillStyle = '#e9ecef';
  ctx.beginPath();
  ctx.arc(k.x, k.y - 5, 11, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#495057';
  ctx.beginPath();
  ctx.arc(k.x, k.y - 5, 11, 0, TAU);
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = blink ? 0.45 : 1;
  // Smoker in hand (points toward facing).
  const a = k.face;
  ctx.strokeStyle = '#6c757d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(k.x + Math.cos(a) * 12, k.y + Math.sin(a) * 12);
  ctx.lineTo(k.x + Math.cos(a) * 24, k.y + Math.sin(a) * 24);
  ctx.stroke();
  ctx.fillStyle = '#adb5bd';
  circle(ctx, k.x + Math.cos(a) * 26, k.y + Math.sin(a) * 26, 5);
  ctx.globalAlpha = 1;
  // Hearts above keeper when hurt.
  if (k.hp < k.maxHp) {
    text(ctx, '♥'.repeat(k.hp), k.x, k.y - 28, 13, '#ff6b6b', 'center', 'bold', 'system-ui, sans-serif');
  }
}

function drawBee(ctx, b, t) {
  const wob = Math.sin(b.wob + t * 3) * 2;
  ctx.save();
  ctx.translate(b.x, b.y + wob);
  // Wings.
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(-3.5, -4, 5, 3, -0.5, 0, TAU);
  ctx.ellipse(3.5, -4, 5, 3, 0.5, 0, TAU);
  ctx.fill();
  // Body.
  ctx.fillStyle = '#ffb703';
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.5, 4.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#3a2410';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-1.5, -4);
  ctx.lineTo(-1.5, 4);
  ctx.moveTo(2.5, -4);
  ctx.lineTo(2.5, 4);
  ctx.stroke();
  ctx.restore();
}

function drawEnemy(ctx, e, s) {
  const def = ENEMIES[e.kind] || BOSSES[e.kind];
  const col = e.color || '#888';
  const stunned = e.stun > 0;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(e.x, e.y + e.radius * 0.8, e.radius, e.radius * 0.35, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(e.x, e.y);
  if (stunned) ctx.globalAlpha = 0.65;
  if (e.kind === 'mite') {
    ctx.fillStyle = col;
    circle(ctx, 0, 0, 7);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const a = e.wob + i * 1.1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
      ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10);
      ctx.stroke();
    }
  } else if (e.kind === 'wasp' || e.kind === 'hornet' || e.kind === 'brood') {
    const r = e.radius;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.5, -r * 0.5, r * 0.7, r * 0.35, -0.6, 0, TAU);
    ctx.ellipse(r * 0.5, -r * 0.5, r * 0.7, r * 0.35, 0.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.72, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.5);
    ctx.lineTo(-r * 0.4, r * 0.5);
    ctx.moveTo(r * 0.2, -r * 0.55);
    ctx.lineTo(r * 0.2, r * 0.55);
    ctx.stroke();
    if (e.kind === 'brood') {
      ctx.fillStyle = '#fff3b0';
      circle(ctx, 0, -r * 0.9, 3);
    }
  } else if (e.kind === 'spider') {
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(Math.cos(a + Math.PI) * 6, Math.sin(a + Math.PI) * 6);
      ctx.lineTo(Math.cos(a + Math.PI) * 15, Math.sin(a + Math.PI) * 15);
      ctx.stroke();
    }
    ctx.fillStyle = col;
    circle(ctx, 0, 0, 11);
    ctx.fillStyle = '#ff6b6b';
    circle(ctx, -3, -2, 2);
    circle(ctx, 3, -2, 2);
  } else if (e.kind === 'moth') {
    ctx.fillStyle = 'rgba(230,230,240,0.9)';
    ctx.beginPath();
    ctx.ellipse(-7, -2, 9, 5, -0.4, 0, TAU);
    ctx.ellipse(7, -2, 9, 5, 0.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col;
    circle(ctx, 0, 0, 5);
    if (e.fleeing) {
      ctx.fillStyle = '#ffd166';
      circle(ctx, 0, 8, 4);
    }
  } else if (e.kind === 'ward') {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(-6, -6, 8, 4, -0.6, 0, TAU);
    ctx.ellipse(6, -6, 8, 4, 0.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 9, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4, -7);
    ctx.lineTo(-4, 7);
    ctx.moveTo(3, -7);
    ctx.lineTo(3, 7);
    ctx.stroke();
    // Shield arc in front (facing direction).
    ctx.strokeStyle = '#9db4ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 17, e.face - Math.PI / 3, e.face + Math.PI / 3);
    ctx.stroke();
  } else if (e.boss) {
    // Boss: big striped body + crown + HP bar.
    const r = e.radius;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.55, -r * 0.5, r * 0.75, r * 0.4, -0.6, 0, TAU);
    ctx.ellipse(r * 0.55, -r * 0.5, r * 0.75, r * 0.4, 0.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.75, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 2.5;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * r * 0.4, -r * 0.6);
      ctx.lineTo(i * r * 0.4, r * 0.6);
      ctx.stroke();
    }
    // Crown.
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(-12, -r * 0.8);
    ctx.lineTo(-8, -r * 1.15);
    ctx.lineTo(-4, -r * 0.8);
    ctx.lineTo(0, -r * 1.2);
    ctx.lineTo(4, -r * 0.8);
    ctx.lineTo(8, -r * 1.15);
    ctx.lineTo(12, -r * 0.8);
    ctx.closePath();
    ctx.fill();
    // HP bar.
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    rr(ctx, -34, -r - 18, 68, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#ff6b6b';
    rr(ctx, -33, -r - 17, 66 * clamp(e.hp / e.maxHp, 0, 1), 6, 3);
    ctx.fill();
    text(ctx, (BOSSES[e.kind] || {}).name || e.kind, 0, -r - 26, 12, '#fff', 'center', 'bold', 'system-ui, sans-serif');
  }
  ctx.restore();
  // Small HP pips for tough non-boss enemies.
  if (!e.boss && e.maxHp >= 4 && e.hp < e.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    rr(ctx, e.x - 14, e.y - e.radius - 10, 28, 5, 2);
    ctx.fill();
    ctx.fillStyle = '#ff6b6b';
    rr(ctx, e.x - 13, e.y - e.radius - 9, 26 * clamp(e.hp / e.maxHp, 0, 1), 3, 1);
    ctx.fill();
  }
  if (e.slow > 0) {
    ctx.fillStyle = 'rgba(180,220,255,0.5)';
    circle(ctx, e.x, e.y - e.radius - 12, 3);
  }
}

function drawFlowers(ctx, s) {
  for (const f of s.flowers) {
    ctx.strokeStyle = '#2f7d32';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y + 8);
    ctx.lineTo(f.x, f.y - 2);
    ctx.stroke();
    drawFlower(ctx, f.x, f.y - 6, 1.3, '#ff6b9d');
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    circle(ctx, f.x + 8, f.y + 4, 2);
  }
}

function drawSwarmTarget(ctx, s) {
  if (!s.swarmTarget) return;
  const p = 1 + Math.sin(s.elapsed * 6) * 0.15;
  ctx.strokeStyle = 'rgba(255, 183, 3, 0.9)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(s.swarmTarget.x, s.swarmTarget.y, 16 * p, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s.swarmTarget.x, s.swarmTarget.y, 4, 0, TAU);
  ctx.fillStyle = 'rgba(255, 183, 3, 0.9)';
  ctx.fill();
}

function drawParticles(ctx, s) {
  for (const p of s.particles) {
    ctx.globalAlpha = 1 - p.t / p.life;
    ctx.fillStyle = p.color;
    circle(ctx, p.x, p.y, p.size);
  }
  ctx.globalAlpha = 1;
  for (const f of s.floaters) {
    ctx.globalAlpha = 1 - f.t / f.life;
    text(ctx, f.text, f.x, f.y, 15, f.color, 'center', 'bold', 'system-ui, sans-serif');
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
function drawHUD(ctx, s) {
  const st = s.stats;
  // Top bar.
  ctx.fillStyle = 'rgba(40, 28, 8, 0.55)';
  rr(ctx, 10, 8, VIEW.w - 20, 46, 10);
  ctx.fill();
  // Hearts.
  let hx = 28;
  for (let i = 0; i < s.keeper.maxHp; i++) {
    text(ctx, i < s.keeper.hp ? '♥' : '♡', hx, 31, 22, i < s.keeper.hp ? '#ff6b6b' : 'rgba(255,255,255,0.4)', 'center', 'bold', 'system-ui, sans-serif');
    hx += 24;
  }
  // Bees.
  text(ctx, `🐝 ${s.beeCount}`, hx + 30, 31, 20, '#ffd166', 'left', 'bold', 'system-ui, sans-serif');
  // Honey.
  text(ctx, `🍯 ${Math.floor(s.honey)}`, hx + 130, 31, 20, '#ffb703', 'left', 'bold', 'system-ui, sans-serif');
  // Day dots.
  const dx0 = VIEW.w / 2 - 130;
  for (let i = 1; i <= 10; i++) {
    ctx.fillStyle = i < s.day ? '#7ee081' : i === s.day ? '#ffd166' : 'rgba(255,255,255,0.35)';
    circle(ctx, dx0 + i * 24, 31, i === s.day ? 7 : 5);
  }
  text(ctx, `Day ${s.day}/10`, VIEW.w / 2, 52, 11, 'rgba(255,255,255,0.75)', 'center', 'bold', 'system-ui, sans-serif');
  // Quota.
  text(ctx, `Banished ${s.banished}/${s.quota}`, VIEW.w - 330, 31, 18, '#fff', 'right', 'bold', 'system-ui, sans-serif');
  // Timer bar (sun arc): dusk approaches as time runs out.
  const frac = clamp(1 - s.timeLeft / s.dayTime, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  rr(ctx, VIEW.w - 300, 42, 280, 8, 4);
  ctx.fill();
  ctx.fillStyle = frac > 0.8 ? '#ff6b6b' : '#ffd166';
  rr(ctx, VIEW.w - 299, 43, 278 * frac, 6, 3);
  ctx.fill();
  text(ctx, `☀ ${Math.ceil(s.timeLeft)}s to dusk`, VIEW.w - 20, 31, 14, '#fff8e0', 'right', 'bold', 'system-ui, sans-serif');
  // Score + chain.
  text(ctx, `Score ${s.score}`, 28, 70, 16, '#fff', 'left', 'bold', 'system-ui, sans-serif');
  if (s.chain > 1) {
    text(ctx, `Chain x${s.chain}`, 28, 92, 16, '#ffd166', 'left', 'bold', 'system-ui, sans-serif');
  }
  // Smoke cooldown.
  if (s.smokeCd > 0) {
    text(ctx, `Smoke ${Math.ceil(s.smokeCd)}s`, 28, 114, 14, 'rgba(255,255,255,0.6)', 'left', 'bold', 'system-ui, sans-serif');
  }
  // Relics / blessings strip (bottom-left).
  let rx = 28;
  for (const r of s.relics) {
    ctx.fillStyle = 'rgba(255, 209, 102, 0.9)';
    circle(ctx, rx, VIEW.h - 28, 11);
    text(ctx, '✦', rx, VIEW.h - 27, 12, '#7b2cbf', 'center', 'bold', 'system-ui, sans-serif');
    rx += 26;
  }
  for (const b of s.blessings) {
    ctx.fillStyle = 'rgba(126, 224, 129, 0.9)';
    circle(ctx, rx, VIEW.h - 28, 11);
    text(ctx, '✿', rx, VIEW.h - 27, 11, '#1b4332', 'center', 'bold', 'system-ui, sans-serif');
    rx += 26;
  }
  // Boss requirement line.
  const planB = DAYS[s.day - 1];
  if (planB.boss && !s.bossDead) {
    text(ctx, '👑 Banish the ' + BOSSES[planB.boss.id].name + '!', VIEW.w - 20, 92, 14, '#ff9f9f', 'right', 'bold', 'system-ui, sans-serif');
  }
  // Incoming list (top-right, below bar): next wave preview.
  const plan = DAYS[s.day - 1];
  const upcoming = plan.waves.filter((w) => w[0] > s.time / s.dayTime).slice(0, 2);
  if (upcoming.length > 0) {
    text(ctx, 'Incoming: ' + upcoming.map((w) => `${w[2]}× ${ENEMIES[w[1]].name}`).join('  •  '), VIEW.w - 20, 70, 13, 'rgba(255,255,255,0.85)', 'right', 'bold', 'system-ui, sans-serif');
  }
  // Control bar (bottom-center).
  text(ctx, 'WASD move  •  Click: direct swarm  •  Space: smoke  •  E: plant flower (15 honey)  •  P: pause', VIEW.w / 2, VIEW.h - 28, 13, 'rgba(255,255,255,0.8)', 'center', 'bold', 'system-ui, sans-serif');
  // Banner.
  if (s.banner) {
    const a = clamp(s.banner.t, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(40, 28, 8, 0.6)';
    rr(ctx, VIEW.w / 2 - 320, 120, 640, 74, 12);
    ctx.fill();
    text(ctx, s.banner.text, VIEW.w / 2, 146, 26, '#ffe9a8', 'center', 'bold');
    text(ctx, s.banner.sub, VIEW.w / 2, 176, 15, '#fff8e0', 'center', 'normal', 'system-ui, sans-serif');
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(38, 26, 8, 0.78)';
  rr(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 14);
  ctx.stroke();
}

function drawTitle(ctx, s, best) {
  drawMeadow(ctx, s);
  // Title block.
  ctx.fillStyle = 'rgba(38, 26, 8, 0.55)';
  rr(ctx, VIEW.w / 2 - 420, 56, 840, 150, 16);
  ctx.fill();
  text(ctx, 'HIVEWARDEN', VIEW.w / 2, 108, 64, '#ffd166', 'center', 'bold');
  text(ctx, 'your swarm is your weapon — direct the bees through ten days across four meadows', VIEW.w / 2, 152, 17, '#fff8e0', 'center', 'normal', 'system-ui, sans-serif');
  text(ctx, 'The wasps are coming for the hives. The bees are waiting for your orders.', VIEW.w / 2, 182, 15, 'rgba(255,248,224,0.85)', 'center', 'normal', 'system-ui, sans-serif');
  // How to play.
  panel(ctx, 90, 230, 560, 190);
  text(ctx, 'HOW TO PLAY', 370, 258, 20, '#ffd166', 'center', 'bold', 'system-ui, sans-serif');
  const lines = [
    'WASD / arrows — move the keeper',
    'Click / hold mouse — direct the swarm to that point',
    'Space — smoke puff: push back and calm wasps (cooldown)',
    'E — plant a flower (15 honey): regrows bees, yields honey',
    'Banish the day’s quota of wasps before dusk falls.',
    'Guard the hive — if it falls, the meadow is lost.',
  ];
  lines.forEach((l, i) => text(ctx, l, 120, 288 + i * 22, 15, '#fff8e0', 'left', 'normal', 'system-ui, sans-serif'));
  // Bestiary.
  panel(ctx, 680, 230, 510, 190);
  text(ctx, 'BESTIARY', 935, 258, 20, '#ffd166', 'center', 'bold', 'system-ui, sans-serif');
  const foes = [
    ['Mite', 'tiny and quick — 1 sting ends it'],
    ['Wasp', 'the common raider'],
    ['Hornet', 'big, loud, hunts the hive'],
    ['Spider', 'slow — it hunts the keeper'],
    ['Moth-thief', 'steals honey and flees'],
    ['Broodwasp', 'lays mites as it marches'],
    ['Wardwasp', 'shielded from the front — circle it'],
  ];
  foes.forEach((f, i) => {
    text(ctx, f[0], 706, 288 + i * 18, 14, '#ffd166', 'left', 'bold', 'system-ui, sans-serif');
    text(ctx, f[1], 806, 288 + i * 18, 13, '#fff8e0', 'left', 'normal', 'system-ui, sans-serif');
  });
  // Difficulty select.
  text(ctx, 'CHOOSE YOUR MEADOW', VIEW.w / 2, 448, 18, '#ffd166', 'center', 'bold', 'system-ui, sans-serif');
  const diffs = ['clover', 'hive', 'swarm'];
  const labels = { clover: 'Clover — Gentler', hive: 'Hive — As meant', swarm: 'Swarm — Tougher' };
  diffs.forEach((d, i) => {
    const x = VIEW.w / 2 - 330 + i * 230;
    const sel = s.titleDifficulty === d;
    ctx.fillStyle = sel ? '#ffd166' : 'rgba(38, 26, 8, 0.7)';
    rr(ctx, x, 466, 210, 52, 10);
    ctx.fill();
    ctx.strokeStyle = sel ? '#fff' : 'rgba(255,209,102,0.5)';
    ctx.lineWidth = 2;
    rr(ctx, x, 466, 210, 52, 10);
    ctx.stroke();
    text(ctx, labels[d], x + 105, 492, 16, sel ? '#3a2410' : '#fff8e0', 'center', 'bold', 'system-ui, sans-serif');
  });
  // Best stats + start.
  if (best && best.gamesPlayed > 0) {
    text(ctx, `Best score ${best.bestScore}  •  Furthest day ${best.furthestDay}/10  •  Hives saved ${best.hivesSaved}  •  Best chain x${best.bestChain}`, VIEW.w / 2, 544, 15, '#fff8e0', 'center', 'bold', 'system-ui, sans-serif');
  }
  ctx.fillStyle = '#ffb703';
  rr(ctx, VIEW.w / 2 - 130, 566, 260, 56, 12);
  ctx.fill();
  text(ctx, '▶  BEGIN DAY 1', VIEW.w / 2, 594, 22, '#3a2410', 'center', 'bold', 'system-ui, sans-serif');
  text(ctx, 'Click a difficulty, then BEGIN — or press Enter', VIEW.w / 2, 648, 14, 'rgba(255,248,224,0.8)', 'center', 'normal', 'system-ui, sans-serif');
}

function cardButton(ctx, x, y, w, h, title, desc, sub, selected) {
  ctx.fillStyle = selected ? '#ffd166' : 'rgba(60, 40, 10, 0.85)';
  rr(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = selected ? '#fff' : 'rgba(255,209,102,0.55)';
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 12);
  ctx.stroke();
  text(ctx, title, x + w / 2, y + 34, 22, selected ? '#3a2410' : '#ffd166', 'center', 'bold');
  // Wrapped desc.
  const words = desc.split(' ');
  let line = '';
  let ly = y + 70;
  ctx.font = '15px system-ui, sans-serif';
  for (const word of words) {
    if (ctx.measureText(line + word).width > w - 40 && line) {
      text(ctx, line, x + w / 2, ly, 15, selected ? '#3a2410' : '#fff8e0', 'center', 'normal', 'system-ui, sans-serif');
      line = '';
      ly += 20;
    }
    line += word + ' ';
  }
  if (line) text(ctx, line, x + w / 2, ly, 15, selected ? '#3a2410' : '#fff8e0', 'center', 'normal', 'system-ui, sans-serif');
  if (sub) text(ctx, sub, x + w / 2, y + h - 24, 14, selected ? '#5c3d00' : '#ffd166', 'center', 'bold', 'system-ui, sans-serif');
}

function drawUpgrade(ctx, s) {
  drawMeadow(ctx, s);
  ctx.fillStyle = 'rgba(20, 14, 4, 0.45)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  text(ctx, `DAY ${s.day} HELD — CHOOSE A BLESSING OF THE HIVE`, VIEW.w / 2, 110, 30, '#ffd166', 'center', 'bold');
  text(ctx, `Score ${s.score}  •  Honey ${Math.floor(s.honey)}  •  Bees ${s.beeCount}`, VIEW.w / 2, 146, 16, '#fff8e0', 'center', 'bold', 'system-ui, sans-serif');
  s.upgradeOffers.forEach((u, i) => {
    const x = VIEW.w / 2 - 540 + i * 370;
    cardButton(ctx, x, 220, 340, 220, u.name, u.desc, 'Click to take', false);
  });
  text(ctx, 'Click a card — or press 1, 2, 3', VIEW.w / 2, 500, 15, 'rgba(255,248,224,0.85)', 'center', 'normal', 'system-ui, sans-serif');
}

function drawFork(ctx, s) {
  drawMeadow(ctx, s);
  ctx.fillStyle = 'rgba(20, 14, 4, 0.45)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  text(ctx, "THE MEADOW'S FORK", VIEW.w / 2, 110, 34, '#ffd166', 'center', 'bold');
  text(ctx, `Day ${s.day} done. Three roads open — one road only.`, VIEW.w / 2, 150, 17, '#fff8e0', 'center', 'normal', 'system-ui, sans-serif');
  text(ctx, `Honey ${Math.floor(s.honey)}  •  Hearts ${s.keeper.hp}/${s.keeper.maxHp}  •  Bees ${s.beeCount}  •  Hive ${Math.round(s.hive.hp)}/${s.hive.maxHp}`, VIEW.w / 2, 178, 15, '#fff8e0', 'center', 'bold', 'system-ui, sans-serif');
  s.forkOffers.forEach((r, i) => {
    const x = VIEW.w / 2 - 540 + i * 370;
    const sub = r.id === 'shrine' ? `Cost: ${r.cost} honey` : r.id === 'quiet' ? 'Free' : 'Spend honey';
    cardButton(ctx, x, 220, 340, 220, `${r.icon}  ${r.name}`, r.desc, sub, false);
  });
  text(ctx, 'Click a road — or press 1, 2, 3', VIEW.w / 2, 500, 15, 'rgba(255,248,224,0.85)', 'center', 'normal', 'system-ui, sans-serif');
}

function drawMarket(ctx, s) {
  drawMeadow(ctx, s);
  ctx.fillStyle = 'rgba(20, 14, 4, 0.5)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  text(ctx, 'APIARY MARKET', VIEW.w / 2, 100, 34, '#ffd166', 'center', 'bold');
  text(ctx, `Honey ${Math.floor(s.honey)} — click a ware to buy it, then CONTINUE.`, VIEW.w / 2, 138, 16, '#fff8e0', 'center', 'bold', 'system-ui, sans-serif');
  s.marketWares.forEach((w, i) => {
    const x = VIEW.w / 2 - 460 + (i % 2) * 470;
    const y = 180 + Math.floor(i / 2) * 150;
    const bought = s.marketBought[i];
    const afford = s.honey >= w.cost;
    ctx.fillStyle = bought ? 'rgba(126, 224, 129, 0.35)' : afford ? 'rgba(60, 40, 10, 0.85)' : 'rgba(60, 40, 10, 0.5)';
    rr(ctx, x, y, 450, 120, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,209,102,0.55)';
    ctx.lineWidth = 2;
    rr(ctx, x, y, 450, 120, 12);
    ctx.stroke();
    text(ctx, w.name, x + 20, y + 28, 19, '#ffd166', 'left', 'bold', 'system-ui, sans-serif');
    text(ctx, w.desc, x + 20, y + 58, 14, '#fff8e0', 'left', 'normal', 'system-ui, sans-serif');
    text(ctx, bought ? 'BOUGHT ✓' : `${w.cost} honey`, x + 430, y + 28, 16, bought ? '#7ee081' : '#ffd166', 'right', 'bold', 'system-ui, sans-serif');
    text(ctx, w.kind === 'relic' ? 'RELIC' : w.kind === 'blessing' ? 'BLESSING' : w.kind.toUpperCase(), x + 20, y + 92, 12, 'rgba(255,248,224,0.7)', 'left', 'bold', 'system-ui, sans-serif');
  });
  ctx.fillStyle = '#ffb703';
  rr(ctx, VIEW.w / 2 - 110, 540, 220, 52, 10);
  ctx.fill();
  text(ctx, 'CONTINUE →', VIEW.w / 2, 566, 20, '#3a2410', 'center', 'bold', 'system-ui, sans-serif');
}

function drawDayClear(ctx, s) {
  drawMeadow(ctx, s);
  ctx.fillStyle = 'rgba(20, 14, 4, 0.5)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  text(ctx, `DAY ${s.day} HELD!`, VIEW.w / 2, 150, 44, '#ffd166', 'center', 'bold');
  const c = s.dayClear || { timeBonus: 0, hiveBonus: 0, heartBonus: 0, dayScore: 0 };
  text(ctx, `Wasps banished ${s.banished}/${s.quota}  •  Day score +${c.dayScore}`, VIEW.w / 2, 205, 18, '#fff8e0', 'center', 'bold', 'system-ui, sans-serif');
  text(ctx, `Time bonus +${c.timeBonus}  •  Hive bonus +${c.hiveBonus}  •  Heart bonus +${c.heartBonus}`, VIEW.w / 2, 235, 15, 'rgba(255,248,224,0.85)', 'center', 'normal', 'system-ui, sans-serif');
  text(ctx, `Total score ${s.score}`, VIEW.w / 2, 275, 20, '#ffd166', 'center', 'bold', 'system-ui, sans-serif');
  text(ctx, 'Press Enter or click to choose your blessing →', VIEW.w / 2, 340, 16, '#fff8e0', 'center', 'normal', 'system-ui, sans-serif');
}

function drawVictory(ctx, s, best) {
  drawMeadow(ctx, s);
  ctx.fillStyle = 'rgba(20, 14, 4, 0.55)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  text(ctx, 'THE HIVE ENDURES', VIEW.w / 2, 110, 46, '#ffd166', 'center', 'bold');
  text(ctx, 'Ten days held. Dawn breaks over Hive Hill — the meadow is safe.', VIEW.w / 2, 152, 17, '#fff8e0', 'center', 'normal', 'system-ui, sans-serif');
  // Rank.
  ctx.fillStyle = '#ffd166';
  circle(ctx, VIEW.w / 2, 250, 62);
  text(ctx, s.victoryRank || 'A', VIEW.w / 2, 252, 72, '#3a2410', 'center', 'bold');
  text(ctx, 'RANK', VIEW.w / 2, 330, 16, '#ffd166', 'center', 'bold', 'system-ui, sans-serif');
  // Stats grid.
  panel(ctx, VIEW.w / 2 - 320, 360, 640, 180);
  const rows = [
    ['Final score', String(s.score)],
    ['Wasps banished', String(s.tally.banishedTotal)],
    ['Bosses banished', String(s.tally.bossesBanished)],
    ['Longest chain', 'x' + s.bestChain],
    ['Flowers planted', String(s.tally.flowersPlanted)],
    ['Time survived', `${Math.floor(s.tally.timeSurvived / 60)}:${String(Math.floor(s.tally.timeSurvived % 60)).padStart(2, '0')}`],
  ];
  rows.forEach((r, i) => {
    const y = 392 + i * 26;
    text(ctx, r[0], VIEW.w / 2 - 290, y, 16, '#fff8e0', 'left', 'normal', 'system-ui, sans-serif');
    text(ctx, r[1], VIEW.w / 2 + 290, y, 16, '#ffd166', 'right', 'bold', 'system-ui, sans-serif');
  });
  if (best) {
    text(ctx, `Best score ${best.bestScore}  •  Hives saved ${best.hivesSaved}`, VIEW.w / 2, 570, 15, '#fff8e0', 'center', 'bold', 'system-ui, sans-serif');
  }
  text(ctx, 'Press R to play again', VIEW.w / 2, 610, 15, 'rgba(255,248,224,0.85)', 'center', 'normal', 'system-ui, sans-serif');
}

function drawDefeat(ctx, s) {
  drawMeadow(ctx, s);
  ctx.fillStyle = 'rgba(30, 8, 8, 0.6)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  text(ctx, 'THE MEADOW FALLS SILENT', VIEW.w / 2, 180, 40, '#ff9f9f', 'center', 'bold');
  text(ctx, s.defeatReason || 'The wasps win this time.', VIEW.w / 2, 230, 18, '#fff8e0', 'center', 'normal', 'system-ui, sans-serif');
  text(ctx, `You reached Day ${s.day}/10  •  Score ${s.score}  •  Wasps banished ${s.tally.banishedTotal}`, VIEW.w / 2, 280, 17, '#fff8e0', 'center', 'bold', 'system-ui, sans-serif');
  text(ctx, 'The hive will hum again. Press R to try once more.', VIEW.w / 2, 330, 16, 'rgba(255,248,224,0.85)', 'center', 'normal', 'system-ui, sans-serif');
}

function drawPaused(ctx, s) {
  ctx.fillStyle = 'rgba(20, 14, 4, 0.6)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  text(ctx, 'PAUSED', VIEW.w / 2, 320, 48, '#ffd166', 'center', 'bold');
  text(ctx, 'P to resume  •  R to restart the day  •  M to mute', VIEW.w / 2, 380, 17, '#fff8e0', 'center', 'normal', 'system-ui, sans-serif');
}

// ---------------------------------------------------------------------------
// Main render entry
// ---------------------------------------------------------------------------
export function render(ctx, s, best) {
  ctx.save();
  // Screen shake (visual only).
  if (s.shake > 0) {
    const mag = s.shake * s.shake * 10;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }
  if (s.mode === 'title') {
    drawTitle(ctx, s, best);
  } else if (s.mode === 'upgrade') {
    drawUpgrade(ctx, s);
  } else if (s.mode === 'fork') {
    drawFork(ctx, s);
  } else if (s.mode === 'market') {
    drawMarket(ctx, s);
  } else if (s.mode === 'dayclear') {
    drawDayClear(ctx, s);
  } else if (s.mode === 'victory') {
    drawVictory(ctx, s, best);
  } else if (s.mode === 'defeat') {
    drawDefeat(ctx, s);
  } else {
    // playing / paused
    drawMeadow(ctx, s);
    drawFlowers(ctx, s);
    drawHive(ctx, s);
    drawKeeper(ctx, s);
    for (const e of s.enemies) drawEnemy(ctx, e, s);
    // Soft golden glow around the swarm cloud, so the swarm reads at a glance.
    if (s.bees.length > 0) {
      let cx = 0;
      let cy = 0;
      for (const b of s.bees) { cx += b.x; cy += b.y; }
      cx /= s.bees.length;
      cy /= s.bees.length;
      const r = 26 + Math.min(46, s.bees.length * 1.1);
      const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
      glow.addColorStop(0, 'rgba(255, 199, 0, 0.20)');
      glow.addColorStop(1, 'rgba(255, 199, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
    }
    for (const b of s.bees) drawBee(ctx, b, s.elapsed);
    drawSwarmTarget(ctx, s);
    drawParticles(ctx, s);
    drawHUD(ctx, s);
    if (s.mode === 'paused') drawPaused(ctx, s);
  }
  ctx.restore();
}
