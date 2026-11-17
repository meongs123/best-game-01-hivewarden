// HIVEWARDEN — all authored content: difficulties, meadows, days, enemies,
// bosses, relics, blessings, upgrades, Fork roads, bestiary.
// Numbers are the starting hypotheses; the bot playtest tunes them.

export const VIEW = { w: 1280, h: 720 };

export const DIFFICULTIES = {
  clover: {
    id: 'clover', name: 'Clover', tag: 'Gentler',
    desc: 'A calm meadow. Fewer wasps, slower dusk, softer stings.',
    hpMul: 0.8, spawnMul: 0.8, quotaMul: 0.8, timerBonus: 15, dmgMul: 0.8,
  },
  hive: {
    id: 'hive', name: 'Hive', tag: 'As meant',
    desc: 'The true weight of the warden. Hold the line as intended.',
    hpMul: 1, spawnMul: 1, quotaMul: 1, timerBonus: 0, dmgMul: 1,
  },
  swarm: {
    id: 'swarm', name: 'Swarm', tag: 'Tougher',
    desc: 'The meadow is angry. More wasps, harder stings, shorter days.',
    hpMul: 1.3, spawnMul: 1.3, quotaMul: 1.15, timerBonus: -10, dmgMul: 1.25,
  },
};

export const MEADOWS = [
  {
    id: 'clover', name: 'Clover Meadow', days: [1, 2],
    tagline: 'Soft grass, slow wasps, first light.',
    sky: ['#ffe9a8', '#ffd97a', '#f7b733'], ground: '#8fc25e', groundDark: '#79ad4c',
    flower: '#e86aa8', accent: '#ffb703',
  },
  {
    id: 'orchard', name: 'Apple Orchard', days: [3, 4, 5],
    tagline: 'Sweet blossom, sharp wings.',
    sky: ['#ffd9e8', '#ffc2d4', '#f9a8c0'], ground: '#7cb84f', groundDark: '#67a03f',
    flower: '#ff6b9d', accent: '#e63946',
  },
  {
    id: 'river', name: 'Riverbank', days: [6, 7, 8],
    tagline: 'Cool water, quick shadows.',
    sky: ['#cfeeff', '#a5ddf5', '#7cc7e8'], ground: '#6fae5f', groundDark: '#5c9a4e',
    flower: '#7ec8e3', accent: '#2a9d8f',
  },
  {
    id: 'hill', name: 'Hive Hill', days: [9, 10],
    tagline: 'The last hill. The last light.',
    sky: ['#ffe3b3', '#ffc978', '#ff9e57'], ground: '#a8a04a', groundDark: '#8f8740',
    flower: '#ffd166', accent: '#f77f00',
  },
];

export function meadowForDay(day) {
  return MEADOWS.find((m) => m.days.includes(day)) || MEADOWS[0];
}

// Day plans. quota = wasps to banish before dusk. spawnBudget = total
// enemies the day may spawn (always >= quota + margin). waves list the
// spawn mix over the day as [timeFraction, enemyId, count] entries.
// boss: null or a boss id that appears at that fraction of the day.
export const DAYS = [
  {
    day: 1, quota: 10, time: 75, spawnBudget: 20,
    intro: 'Day 1 — The wasps found the clover. Send the swarm.',
    waves: [[0.05, 'mite', 4], [0.25, 'wasp', 3], [0.45, 'mite', 4], [0.6, 'wasp', 3], [0.8, 'mite', 2]],
    boss: null, trickle: 'mite',
  },
  {
    day: 2, quota: 14, time: 75, spawnBudget: 26,
    intro: 'Day 2 — More wings over the grass.',
    waves: [[0.05, 'wasp', 3], [0.2, 'mite', 5], [0.4, 'wasp', 4], [0.6, 'spider', 2], [0.75, 'mite', 5], [0.9, 'wasp', 3]],
    boss: null, trickle: 'wasp',
  },
  {
    day: 3, quota: 18, time: 80, spawnBudget: 32,
    intro: 'Day 3 — Apple Orchard. The blossom draws thieves.',
    waves: [[0.05, 'wasp', 4], [0.2, 'moth', 3], [0.35, 'mite', 6], [0.5, 'spider', 2], [0.65, 'wasp', 5], [0.8, 'moth', 3], [0.9, 'hornet', 2]],
    boss: null, trickle: 'wasp',
  },
  {
    day: 4, quota: 22, time: 80, spawnBudget: 38,
    intro: 'Day 4 — Hornets in the blossom now.',
    waves: [[0.05, 'hornet', 2], [0.2, 'wasp', 5], [0.35, 'moth', 4], [0.5, 'spider', 3], [0.65, 'hornet', 3], [0.8, 'wasp', 5], [0.9, 'mite', 6]],
    boss: null, trickle: 'hornet',
  },
  {
    day: 5, quota: 26, time: 85, spawnBudget: 44,
    intro: 'Day 5 — The Hornet Queen comes for the orchard.',
    waves: [[0.05, 'wasp', 5], [0.2, 'hornet', 3], [0.35, 'moth', 4], [0.5, 'spider', 3], [0.62, 'wasp', 5], [0.78, 'brood', 2], [0.88, 'hornet', 3]],
    boss: { id: 'queen', at: 0.55 }, trickle: 'hornet',
  },
  {
    day: 6, quota: 28, time: 85, spawnBudget: 48,
    intro: 'Day 6 — Riverbank. Fast water, faster wings.',
    waves: [[0.05, 'hornet', 3], [0.18, 'moth', 4], [0.32, 'wasp', 6], [0.48, 'ward', 2], [0.62, 'spider', 3], [0.76, 'brood', 2], [0.88, 'hornet', 4]],
    boss: null, trickle: 'wasp',
  },
  {
    day: 7, quota: 32, time: 90, spawnBudget: 54,
    intro: 'Day 7 — Shielded wasps guard the river crossings.',
    waves: [[0.05, 'ward', 2], [0.16, 'wasp', 6], [0.3, 'hornet', 4], [0.45, 'moth', 5], [0.58, 'brood', 2], [0.72, 'ward', 3], [0.85, 'hornet', 4], [0.93, 'spider', 3]],
    boss: null, trickle: 'hornet',
  },
  {
    day: 8, quota: 34, time: 90, spawnBudget: 58,
    intro: 'Day 8 — The Mite King marches on the riverbank.',
    waves: [[0.05, 'mite', 8], [0.18, 'ward', 2], [0.32, 'hornet', 4], [0.46, 'brood', 3], [0.6, 'wasp', 6], [0.74, 'spider', 3], [0.86, 'hornet', 4]],
    boss: { id: 'miteking', at: 0.5 }, trickle: 'mite',
  },
  {
    day: 9, quota: 38, time: 95, spawnBudget: 64,
    intro: 'Day 9 — Hive Hill. Everything with wings is coming.',
    waves: [[0.05, 'hornet', 4], [0.15, 'ward', 3], [0.28, 'brood', 3], [0.42, 'wasp', 7], [0.55, 'moth', 5], [0.68, 'hornet', 5], [0.8, 'spider', 4], [0.9, 'ward', 3]],
    boss: null, trickle: 'hornet',
  },
  {
    day: 10, quota: 42, time: 100, spawnBudget: 72,
    intro: 'Day 10 — The Wasp Empress. Hold the hill until dawn.',
    waves: [[0.05, 'wasp', 6], [0.15, 'hornet', 4], [0.28, 'ward', 3], [0.4, 'brood', 3], [0.52, 'moth', 5], [0.64, 'hornet', 5], [0.76, 'spider', 4], [0.86, 'ward', 3], [0.93, 'wasp', 6]],
    boss: { id: 'empress', at: 0.45 }, trickle: 'wasp',
  },
];

// Enemies. hp/dmg/speed are base values (difficulty multiplies hp/dmg).
// behavior: 'chase' (nearest of keeper/hive), 'hive' (always the hive),
// 'keeper' (always the keeper), 'steal' (drains honey, then flees).
export const ENEMIES = {
  mite: {
    id: 'mite', name: 'Mite', hp: 1, speed: 95, radius: 7, dmg: 1, hiveDmg: 1,
    honey: 2, score: 50, behavior: 'chase', color: '#8d5a2b',
    desc: 'Tiny, quick, and everywhere. One sting ends it.',
  },
  wasp: {
    id: 'wasp', name: 'Wasp', hp: 2, speed: 80, radius: 10, dmg: 1, hiveDmg: 2,
    honey: 3, score: 100, behavior: 'chase', color: '#e9c46a',
    desc: 'The common raider. Fast wings, sharp sting.',
  },
  hornet: {
    id: 'hornet', name: 'Hornet', hp: 4, speed: 105, radius: 13, dmg: 1, hiveDmg: 4,
    honey: 5, score: 200, behavior: 'hive', color: '#e76f51',
    desc: 'Big, loud, and hungry for the hive itself.',
  },
  spider: {
    id: 'spider', name: 'Spider', hp: 3, speed: 55, radius: 12, dmg: 1, hiveDmg: 3,
    honey: 4, score: 150, behavior: 'keeper', color: '#5a189a',
    desc: 'Crawls low and slow. It hunts the keeper, not the hive.',
  },
  moth: {
    id: 'moth', name: 'Moth-thief', hp: 2, speed: 70, radius: 10, dmg: 0, hiveDmg: 0,
    honey: 3, score: 150, behavior: 'steal', color: '#b8b8d0',
    desc: 'Steals honey and flees for the meadow edge. Catch it first.',
  },
  brood: {
    id: 'brood', name: 'Broodwasp', hp: 6, speed: 60, radius: 14, dmg: 1, hiveDmg: 3,
    honey: 8, score: 300, behavior: 'hive', color: '#7f4f24',
    desc: 'Lays mites as it marches. Kill it before it multiplies.',
  },
  ward: {
    id: 'ward', name: 'Wardwasp', hp: 4, speed: 75, radius: 12, dmg: 1, hiveDmg: 3,
    honey: 6, score: 250, behavior: 'chase', color: '#3d5a80', shielded: true,
    desc: 'Its shield stops the swarm from the front. Circle around it.',
  },
};

export const BOSSES = {
  queen: {
    id: 'queen', name: 'Hornet Queen', hp: 60, speed: 70, radius: 26, dmg: 1, hiveDmg: 8,
    honey: 40, score: 2000, color: '#c1121f',
    desc: 'Ruler of the orchard. She summons wasps and charges the hive.',
    spawnKind: 'wasp', spawnEvery: 6, spawnCount: 2,
  },
  miteking: {
    id: 'miteking', name: 'Mite King', hp: 80, speed: 50, radius: 24, dmg: 1, hiveDmg: 6,
    honey: 60, score: 3000, color: '#6c584c',
    desc: 'A mountain of mites. He sheds them in waves.',
    spawnKind: 'mite', spawnEvery: 4, spawnCount: 4,
  },
  empress: {
    id: 'empress', name: 'The Wasp Empress', hp: 120, speed: 65, radius: 32, dmg: 1, hiveDmg: 10,
    honey: 100, score: 5000, color: '#7b2cbf',
    desc: 'The last shadow of the hill. She calls broodwasps to her side.',
    spawnKind: 'brood', spawnEvery: 8, spawnCount: 1,
  },
};

// Relics: found/bought through the Fork and the Market. Each id is unique;
// owning one is permanent for the run. apply() is resolved in sim.js.
export const RELICS = [
  { id: 'comb', name: 'Golden Comb', desc: '+25% honey from every banish.' },
  { id: 'jelly', name: 'Royal Jelly', desc: 'The keeper gains +1 heart (max 6).' },
  { id: 'swift', name: 'Swift Wings', desc: 'The swarm flies 25% faster.' },
  { id: 'thorn', name: 'Thornvine', desc: 'Flowers sting nearby enemies for 1 damage.' },
  { id: 'sunpetal', name: 'Sunpetal', desc: 'Flowers yield twice the honey.' },
  { id: 'sturdy', name: 'Sturdy Hive', desc: 'The hive gains +30 max health.' },
  { id: 'smokecharm', name: 'Smoke Charm', desc: 'Smoke cooldown is 30% shorter.' },
  { id: 'sharp', name: 'Sharp Sting', desc: 'Every bee stings +1 damage.' },
  { id: 'hat', name: "Beekeeper's Hat", desc: 'The keeper takes 1 less damage from hits.' },
  { id: 'crown', name: 'Wildflower Crown', desc: 'Every day begins with +5 bees.' },
];

// Blessings: smaller passive effects, also from the Fork/Market.
export const BLESSINGS = [
  { id: 'fleet', name: 'Fleetfoot', desc: 'The keeper moves 15% faster.' },
  { id: 'tongue', name: 'Long Tongue', desc: 'Bees reach 30% further.' },
  { id: 'pollen', name: 'Heavy Pollen', desc: 'Stung enemies are slowed 30% for 2s.' },
  { id: 'warm', name: 'Warm Smoke', desc: 'Smoke radius is 30% larger.' },
  { id: 'quick', name: 'Quick Wings', desc: 'Bees sting 20% faster.' },
  { id: 'wax', name: 'Thick Wax', desc: 'The hive takes 1 less damage per hit.' },
  { id: 'nectar', name: 'Sweet Nectar', desc: '+15% honey from every source.' },
  { id: 'busy', name: 'Busy Bees', desc: 'Bees regrow 50% faster.' },
  { id: 'mandible', name: 'Sharp Mandibles', desc: '+10% swarm damage.' },
  { id: 'guard', name: 'Guard Bees', desc: 'The hive stings one nearby enemy every 3s.' },
  { id: 'breeze', name: 'Calm Breeze', desc: 'All enemies move 10% slower.' },
  { id: 'golden', name: 'Golden Hour', desc: 'Every day lasts 10s longer.' },
];

// Day-clear upgrades: choose 1 of 3 after each day.
export const UPGRADES = [
  { id: 'bees10', name: '+10 Bees', desc: 'Ten fresh bees join the swarm now.', apply: 'bees10' },
  { id: 'sting', name: 'Sharper Stings', desc: 'Swarm damage +1 per sting.', apply: 'sting' },
  { id: 'speed', name: 'Swifter Swarm', desc: 'Swarm flight speed +15%.', apply: 'speed' },
  { id: 'smoke', name: 'Cooler Smoke', desc: 'Smoke cooldown -20%.', apply: 'smoke' },
  { id: 'flower', name: 'Another Flowerbed', desc: 'Flower limit +1.', apply: 'flower' },
  { id: 'hivehp', name: 'Reinforced Hive', desc: 'Hive max health +20, heal 20 now.', apply: 'hivehp' },
  { id: 'heart', name: 'Hearty Keeper', desc: 'Keeper max hearts +1 (max 6), heal 1 now.', apply: 'heart' },
  { id: 'regrow', name: 'Busy Nursery', desc: 'Bee regrowth +25%.', apply: 'regrow' },
  { id: 'honey20', name: 'Honey Cache', desc: 'Gain 20 honey now.', apply: 'honey20' },
  { id: 'reach', name: 'Longer Reach', desc: 'Bee attack range +20%.', apply: 'reach' },
  { id: 'chain', name: 'Chain Keeper', desc: 'Chains last 2s longer.', apply: 'chain' },
  { id: 'flowergold', name: 'Golden Flowers', desc: 'Flowers yield +1 honey per cycle.', apply: 'flowergold' },
];

// The Meadow's Fork: one road between days.
export const FORK_ROADS = [
  {
    id: 'shrine', name: 'Wildflower Shrine', icon: '✿',
    desc: 'Trade 20 honey: +1 heart now and +8 bees. The shrine hums.',
    cost: 20, effect: 'shrine',
  },
  {
    id: 'quiet', name: 'Quiet Meadow', icon: '☀',
    desc: 'No toll, no trouble. A small gift: +6 honey, +3 bees.',
    cost: 0, effect: 'quiet',
  },
  {
    id: 'market', name: 'Apiary Market', icon: '⬢',
    desc: 'Spend honey on a relic or a blessing — or mend the hive for 10 honey (+25 HP).',
    cost: 0, effect: 'market',
  },
];

// Market wares (shown when the Market road is chosen).
export const MARKET = [
  { kind: 'relic', cost: 35 },
  { kind: 'blessing', cost: 25 },
  { kind: 'mend', cost: 10, name: 'Mend the Hive', desc: 'Restore 25 hive health.' },
  { kind: 'bees', cost: 15, name: 'Buy 8 Bees', desc: 'Eight fresh bees join the swarm.' },
];
