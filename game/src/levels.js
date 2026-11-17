// HIVEWARDEN — the ten days: spawn schedules, meadows, pacing, bestiary.
// A day is a list of spawn batches. Each batch: { at (seconds after day
// start), kind, count, edge } — edges are 'top' | 'bottom' | 'left' | 'right'.
// The day ends when every spawned enemy is banished. Intensity is a sawtooth:
// it climbs within a meadow, dips at each meadow change (a breather), then
// spikes at the boss days (5, 8, 10). Day 1 is a teach beat — mites only
// at first, so the first success is guaranteed.
export const ENEMY_TYPES = {
  mite: {
    name: 'Mite', hp: 3, speed: 72, damage: 1, radius: 9, score: 10,
    color: '#8a5a2b', desc: 'Tiny and quick. Chews flowers first, then the hive.',
    behavior: 'flowers', flavor: 'It came for the petals. It stays for the hive.',
  },
  wasp: {
    name: 'Wasp', hp: 6, speed: 112, damage: 1, radius: 12, score: 20,
    color: '#e8b400', desc: 'Darts at the hive and stings the warden on contact.',
    behavior: 'hive', flavor: 'Yellow jackets, black temper.',
  },
  hornet: {
    name: 'Hornet', hp: 12, speed: 142, damage: 2, radius: 16, score: 40,
    color: '#c23b22', desc: 'Big, fast, angry. Swats bees out of the air.',
    behavior: 'hunter', flavor: 'It does not want honey. It wants the bees.',
  },
  spider: {
    name: 'Spider', hp: 20, speed: 46, damage: 2, radius: 15, score: 30,
    color: '#5b4a68', desc: 'Slow and armored. Lays webs that slow warden and bees.',
    behavior: 'webber', flavor: 'Eight legs, zero hurry, one bad idea.',
  },
  moth: {
    name: 'Moth-thief', hp: 4, speed: 162, damage: 0, radius: 11, score: 25,
    color: '#b8a88a', desc: 'Steals honey drops and flees to the edge. Catch it first.',
    behavior: 'thief', flavor: 'It never fights. It only takes.',
  },
  broodwasp: {
    name: 'Broodwasp', hp: 15, speed: 82, damage: 1, radius: 14, score: 50,
    color: '#7a4a9e', desc: 'Bursts into three mites when banished. Aim carefully.',
    behavior: 'brood', flavor: 'One wasp in, three mites out.',
  },
};

export const BOSSES = {
  queen: {
    key: 'queen', name: 'Hornet Queen', day: 5, hp: 120, speed: 92, damage: 3, radius: 30, score: 500,
    color: '#a31f0e', spawn: { kind: 'wasp', every: 5, max: 6 },
    desc: 'She arrives with a court. Banish her wasps, then her.',
    flavor: 'The orchard has a queen now, and she is not asking.',
  },
  king: {
    key: 'king', name: 'Mite King', day: 8, hp: 200, speed: 62, damage: 3, radius: 34, score: 750,
    color: '#6e3b12', spawn: { kind: 'mite', every: 4, max: 10 },
    desc: 'A mountain of mites with a crown. Webs slow everything near him.',
    flavor: 'He ate the whole clover field. He is still hungry.',
  },
  empress: {
    key: 'empress', name: 'The Wasp Empress', day: 10, hp: 320, speed: 122, damage: 3, radius: 36, score: 1000,
    color: '#3d1a5c', spawn: { kind: 'broodwasp', every: 7, max: 4 },
    desc: 'The final swarm. Fast charges, broodwasps at her call, and she swats bees.',
    flavor: 'Ten days of buzzing end here, one way or another.',
  },
};

// intensity: 0..1, the pacing curve. Rests sit before the boss spikes.
export const DAYS = [
  {
    day: 1, meadow: 'clover', name: 'First Light', intensity: 0.15, par: 75,
    intro: 'The bees are waking. A few mites sniff around the clover — show them the swarm.',
    batches: [
      { at: 2, kind: 'mite', count: 3, edge: 'top' },
      { at: 10, kind: 'mite', count: 3, edge: 'left' },
      { at: 20, kind: 'wasp', count: 2, edge: 'right' },
    ],
  },
  {
    day: 2, meadow: 'clover', name: 'Clover Rush', intensity: 0.3, par: 80,
    intro: 'Word spreads in the undergrowth. Wasps this time — and something slow in the grass.',
    batches: [
      { at: 2, kind: 'mite', count: 4, edge: 'top' },
      { at: 8, kind: 'mite', count: 4, edge: 'bottom' },
      { at: 14, kind: 'wasp', count: 4, edge: 'right' },
      { at: 24, kind: 'spider', count: 1, edge: 'left' },
      { at: 34, kind: 'wasp', count: 2, edge: 'top' },
    ],
  },
  {
    day: 3, meadow: 'orchard', name: 'Apple Orchard', intensity: 0.25, par: 85,
    intro: 'The orchard hums. A moth-thief is circling the honey — and the spiders have moved in.',
    batches: [
      { at: 2, kind: 'mite', count: 4, edge: 'left' },
      { at: 8, kind: 'wasp', count: 3, edge: 'top' },
      { at: 14, kind: 'spider', count: 1, edge: 'right' },
      { at: 22, kind: 'moth', count: 1, edge: 'bottom' },
      { at: 30, kind: 'mite', count: 3, edge: 'top' },
    ],
  },
  {
    day: 4, meadow: 'orchard', name: 'Orchard Siege', intensity: 0.55, par: 90,
    intro: 'They come in waves now. Watch the broodwasp — banish it and three mites spill out.',
    batches: [
      { at: 2, kind: 'mite', count: 6, edge: 'top' },
      { at: 8, kind: 'wasp', count: 5, edge: 'right' },
      { at: 14, kind: 'spider', count: 3, edge: 'left' },
      { at: 22, kind: 'moth', count: 2, edge: 'bottom' },
      { at: 30, kind: 'broodwasp', count: 1, edge: 'top' },
      { at: 38, kind: 'wasp', count: 3, edge: 'right' },
      { at: 46, kind: 'mite', count: 6, edge: 'left' },
    ],
  },
  {
    day: 5, meadow: 'orchard', name: 'The Hornet Queen', intensity: 0.85, par: 100,
    intro: 'A shadow crosses the orchard. The Hornet Queen has come for the hive — with her court.',
    boss: 'queen',
    batches: [
      { at: 2, kind: 'wasp', count: 3, edge: 'top' },
      { at: 6, kind: 'mite', count: 3, edge: 'left' },
      { at: 12, kind: 'wasp', count: 3, edge: 'right' },
      { at: 40, kind: 'wasp', count: 2, edge: 'bottom' },
    ],
  },
  {
    day: 6, meadow: 'river', name: 'Riverbank', intensity: 0.5, par: 90,
    intro: 'A breather by the water — but hornets hunt the riverbank, and they swat bees.',
    batches: [
      { at: 2, kind: 'mite', count: 6, edge: 'top' },
      { at: 8, kind: 'wasp', count: 5, edge: 'left' },
      { at: 14, kind: 'hornet', count: 2, edge: 'right' },
      { at: 22, kind: 'spider', count: 3, edge: 'bottom' },
      { at: 30, kind: 'broodwasp', count: 2, edge: 'top' },
      { at: 40, kind: 'wasp', count: 5, edge: 'right' },
    ],
  },
  {
    day: 7, meadow: 'river', name: 'River Rising', intensity: 0.65, par: 95,
    intro: 'The riverbank is thick with wings. Hornets in pairs, moths in the honey.',
    batches: [
      { at: 2, kind: 'mite', count: 8, edge: 'left' },
      { at: 8, kind: 'wasp', count: 5, edge: 'top' },
      { at: 14, kind: 'hornet', count: 4, edge: 'right' },
      { at: 22, kind: 'moth', count: 2, edge: 'bottom' },
      { at: 30, kind: 'broodwasp', count: 3, edge: 'top' },
      { at: 40, kind: 'wasp', count: 5, edge: 'left' },
      { at: 48, kind: 'spider', count: 2, edge: 'right' },
    ],
  },
  {
    day: 8, meadow: 'river', name: 'The Mite King', intensity: 0.9, par: 110,
    intro: 'The ground itself is moving. The Mite King has risen from the riverbank mud.',
    boss: 'king',
    batches: [
      { at: 2, kind: 'mite', count: 5, edge: 'top' },
      { at: 8, kind: 'wasp', count: 4, edge: 'right' },
      { at: 16, kind: 'spider', count: 2, edge: 'left' },
      { at: 50, kind: 'mite', count: 5, edge: 'bottom' },
    ],
  },
  {
    day: 9, meadow: 'hill', name: 'Hive Hill', intensity: 0.7, par: 100,
    intro: 'The last climb. Everything the meadow has is coming at once now.',
    batches: [
      { at: 2, kind: 'mite', count: 8, edge: 'top' },
      { at: 8, kind: 'wasp', count: 6, edge: 'left' },
      { at: 14, kind: 'hornet', count: 4, edge: 'right' },
      { at: 22, kind: 'spider', count: 4, edge: 'bottom' },
      { at: 30, kind: 'moth', count: 3, edge: 'top' },
      { at: 38, kind: 'broodwasp', count: 4, edge: 'left' },
      { at: 48, kind: 'hornet', count: 2, edge: 'right' },
      { at: 56, kind: 'wasp', count: 6, edge: 'top' },
    ],
  },
  {
    day: 10, meadow: 'hill', name: 'The Wasp Empress', intensity: 1.0, par: 120,
    intro: 'Ten days of buzzing end here. The Wasp Empress descends on Hive Hill — hold the line, Warden.',
    boss: 'empress',
    batches: [
      { at: 2, kind: 'wasp', count: 4, edge: 'top' },
      { at: 8, kind: 'hornet', count: 4, edge: 'right' },
      { at: 16, kind: 'broodwasp', count: 2, edge: 'left' },
      { at: 55, kind: 'wasp', count: 4, edge: 'bottom' },
      { at: 70, kind: 'hornet', count: 2, edge: 'top' },
    ],
  },
];

export function totalEnemyHp(dayDef, hpScale = 1) {
  let hp = 0;
  for (const b of dayDef.batches) hp += ENEMY_TYPES[b.kind].hp * b.count * hpScale;
  if (dayDef.boss) hp += BOSSES[dayDef.boss].hp * hpScale;
  return hp;
}

export function pacingProblems() {
  // The sawtooth check: intensity must not run high for more than 2 days in
  // a row without a rest, each meadow change must dip, and boss days must be
  // preceded by a lower-intensity day. One deliberate exception: the final
  // three days (boss, gauntlet, final boss) are the climax ramp, so a
  // high-intensity run that ends exactly on day 10 is allowed by design.
  // Returns a list of problems (empty = pass).
  const problems = [];
  let run = 0;
  for (let i = 0; i < DAYS.length; i++) {
    const d = DAYS[i];
    run = d.intensity >= 0.7 ? run + 1 : 0;
    const isClimaxRun = i === DAYS.length - 1 && run === 3;
    if (run > 2 && !isClimaxRun) problems.push(`day ${d.day}: ${run} high-intensity days in a row`);
    if (d.boss && i > 0 && DAYS[i - 1].intensity >= d.intensity) {
      problems.push(`day ${d.day} (boss): previous day is not a breather`);
    }
    if (i > 0 && DAYS[i - 1].meadow !== d.meadow && d.intensity > DAYS[i - 1].intensity) {
      problems.push(`day ${d.day}: meadow change without an intensity dip`);
    }
  }
  if (DAYS[0].batches[0].kind !== 'mite') problems.push('day 1 does not open with a teach beat (mites)');
  return problems;
}
