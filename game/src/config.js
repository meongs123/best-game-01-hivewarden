// HIVEWARDEN — tuning constants and difficulty definitions.
// Every number here has a rationale in progress.md / dossier.json; nothing is
// a magic number. Change these, then re-run tools/check-days.mjs.
export const VIEW = { W: 1280, H: 720 };

// The hive sits at the meadow's heart. Enemies spawn at the edges and march in.
export const HIVE = { x: 640, y: 380, r: 42 };

export const WARDEN = {
  radius: 16,
  speed: 235,          // px/s — crosses the field in ~5s, fast enough to react
  heartsBase: 5,       // Hive difficulty; Clover 6, Swarm 4
  invulnSeconds: 1.0,  // brief mercy after a hit so one touch is not a stunlock
};

export const SWARM = {
  beesBase: 12,        // starting cap; upgrades raise it
  beesMax: 40,         // hard cap so the screen never becomes unreadable
  beeSpeed: 330,       // px/s — faster than the warden, slower than a hornet dive
  stingDamage: 1,
  stingCooldown: 0.5,  // seconds between stings per bee
  attackRadius: 95,    // bees engage enemies within this of the rally point
  returnSeconds: 3.0,  // bees drift home if their target dies / times out
  orbitRadius: 64,     // idle bees circle the hive at this distance
  regrowHive: 10,      // seconds per +1 bee from the hive itself
  regrowFlower: 8,     // seconds per +1 bee from each mature flower
};

export const SMOKE = {
  cooldownBase: 9,     // seconds
  radiusBase: 135,
  durationBase: 3,     // seconds of repel + slow
  slowFactor: 0.5,     // wasps/hornets move at half speed inside smoke
};

export const FLOWER = {
  costHoney: 10,
  cooldown: 2,         // seconds between plantings
  maxBase: 6,
  growSeconds: 3,      // a fresh sprout takes this long to mature
  honeyPerTick: 1,     // honey per tick once mature
  honeyTickSeconds: 5,
  radius: 14,
};

export const HONEY = {
  // Honey is the economy: enemy drops + flowers in, flowers/shrine/market out.
  // Leftover honey converts to score x2 at victory, so hoarding is viable.
  drops: { mite: 2, wasp: 3, hornet: 5, spider: 4, moth: 3, broodwasp: 6, boss: 50 },
  quietMeadowGift: 10,
  shrineCost: 20,
};

// Difficulties: Clover is the gentle on-ramp, Hive is "as meant", Swarm is tough.
// Enemy HP/damage scale; the hive and the warden's hearts scale the other way.
export const DIFFICULTIES = {
  clover: { key: 'clover', name: 'Clover', tag: 'gentler', enemyHp: 0.8, enemyDamage: 0.8, spawnScale: 0.85, hiveHp: 120, hearts: 6, scoreMult: 0.9 },
  hive:   { key: 'hive',   name: 'Hive',   tag: 'as meant', enemyHp: 1.0, enemyDamage: 1.0, spawnScale: 1.0,  hiveHp: 100, hearts: 5, scoreMult: 1.0 },
  swarm:  { key: 'swarm',  name: 'Swarm',  tag: 'tougher', enemyHp: 1.3, enemyDamage: 1.3, spawnScale: 1.2,  hiveHp: 80,  hearts: 4, scoreMult: 1.25 },
};

export const SCORE = {
  // Banish points per enemy kind; chains multiply them (x1..x5).
  points: { mite: 10, wasp: 20, hornet: 40, spider: 30, moth: 25, broodwasp: 50, boss: 500 },
  bossBonus: { queen: 500, king: 750, empress: 1000 }, // added on top of points.boss
  dayClear: 100,       // x day number
  chainWindow: 4,      // seconds; a banish inside the window raises the chain
  chainMax: 5,
  honeyToScore: 2,     // leftover honey x2 at victory
  rankS: 20000, rankA: 14000, rankB: 9000, // score thresholds for the victory rank
};

export const DAY = {
  parSeconds: 90,      // finishing a day under par earns a time bonus
  timeBonusPerSecond: 5,
};

// Meadow palettes — golden daytime, deliberately distinct from the dark winners.
export const MEADOWS = [
  { key: 'clover',  name: 'Clover Meadow', days: [1, 2],  grass: '#8fc25e', grassDark: '#79ad4d', ground: '#a8d27a', accent: '#f6d95c', flower: '#ff8fb3' },
  { key: 'orchard', name: 'Apple Orchard', days: [3, 4, 5], grass: '#7fb84f', grassDark: '#6aa33f', ground: '#93c768', accent: '#e8574a', flower: '#ffffff' },
  { key: 'river',   name: 'Riverbank',     days: [6, 7, 8], grass: '#6fb56a', grassDark: '#5da25c', ground: '#86c184', accent: '#5fb7e8', flower: '#ffd94d' },
  { key: 'hill',    name: 'Hive Hill',     days: [9, 10], grass: '#d9b45c', grassDark: '#c39f45', ground: '#e5c878', accent: '#f08c2e', flower: '#ff9d5c' },
];
