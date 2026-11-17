// HIVEWARDEN — upgrades (1-of-3 after each day) and relics (market/shrine).
// Upgrades stack up to maxStacks. Relics are one-of-a-kind. Every entry has a
// mechanical effect the game code applies — no decorative upgrades.
export const UPGRADES = [
  {
    key: 'moreBees', name: 'More Bees', icon: '🐝', maxStacks: 3,
    desc: '+4 max bees. A bigger swarm holds a longer line.',
    flavor: 'The hive hums a little louder.',
  },
  {
    key: 'swiftWings', name: 'Swift Wings', icon: '💨', maxStacks: 3,
    desc: 'Swarm speed +25%. Bees cross the meadow before the wasps do.',
    flavor: 'Wings like summer wind.',
  },
  {
    key: 'sharpStings', name: 'Sharp Stings', icon: '📌', maxStacks: 3,
    desc: 'Sting damage +1. Every bee hits harder.',
    flavor: 'A sting you only need once.',
  },
  {
    key: 'wideSmoke', name: 'Wide Smoke', icon: '💨', maxStacks: 2,
    desc: 'Smoke radius +50%. A bigger calm in the storm.',
    flavor: 'The smoke settles like evening fog.',
  },
  {
    key: 'coolSmoke', name: 'Cool Smoke', icon: '⏱️', maxStacks: 2,
    desc: 'Smoke cooldown −25%. Puff more often, worry less.',
    flavor: 'The smoker never runs dry.',
  },
  {
    key: 'richBlooms', name: 'Rich Blooms', icon: '🌸', maxStacks: 2,
    desc: 'Flowers yield double: +2 honey per tick, bees regrow twice as fast.',
    flavor: 'Every petal pulls its weight.',
  },
  {
    key: 'hiveArmor', name: 'Hive Armor', icon: '🛡️', maxStacks: 3,
    desc: '+20 max hive HP and repair 20 now. The hive stands taller.',
    flavor: 'Wax and willow, layered thick.',
  },
  {
    key: 'quickHive', name: 'Quick Hive', icon: '⏩', maxStacks: 2,
    desc: 'Bee regrowth +50%. The hive replaces its fallen faster.',
    flavor: 'New wings every morning.',
  },
  {
    key: 'longReach', name: 'Long Reach', icon: '🎯', maxStacks: 2,
    desc: 'Swarm command radius +40%. Your bees answer from farther away.',
    flavor: 'The warden’s whistle carries.',
  },
  {
    key: 'sturdyWarden', name: 'Sturdy Warden', icon: '❤️', maxStacks: 2,
    desc: '+1 max heart and heal 1 now. You can take another hit.',
    flavor: 'A keeper’s veil, doubled.',
  },
  {
    key: 'honeyMagnet', name: 'Honey Magnet', icon: '🍯', maxStacks: 2,
    desc: 'Honey drops fly to the hive; +25% honey from all sources.',
    flavor: 'Nothing sweet goes to waste.',
  },
  {
    key: 'chainKeeper', name: 'Chain Keeper', icon: '⛓️', maxStacks: 2,
    desc: 'Chain window +2s and max chain +1. Keep the streak alive.',
    flavor: 'One banish leads to another.',
  },
];

export const RELICS = [
  { key: 'goldenComb', name: 'Golden Comb', icon: '🟡', cost: 40, desc: 'Honey from all sources +50%. The comb never empties.', flavor: 'It gleams like the first morning.' },
  { key: 'royalJelly', name: 'Royal Jelly', icon: '👑', cost: 45, desc: 'Bees regrow twice as fast. The hive raises queens, not workers.', flavor: 'A spoonful for the swarm.' },
  { key: 'amberLens', name: 'Amber Lens', icon: '🔍', cost: 35, desc: 'Swarm command radius +60%. See the whole meadow at once.', flavor: 'The world, held in amber.' },
  { key: 'sunpetalCrown', name: 'Sunpetal Crown', icon: '🌻', cost: 50, desc: 'Flowers produce double honey and bees. The meadow bows to you.', flavor: 'Worn by wardens who never lose a hive.' },
  { key: 'wardensVeil', name: 'Warden’s Veil', icon: '🧕', cost: 30, desc: 'Invulnerability after a hit lasts +0.5s. Breathe between stings.', flavor: 'Mesh fine enough to stop a hornet.' },
  { key: 'thornHedge', name: 'Thorn Hedge', icon: '🌵', cost: 35, desc: 'Attackers take 1 damage when they strike the hive. The hive bites back.', flavor: 'The hive has teeth now.' },
  { key: 'beekeepersBell', name: 'Beekeeper’s Bell', icon: '🔔', cost: 30, desc: 'Smoke also restores 2 bees. A calm swarm is a full swarm.', flavor: 'One ring, and the bees come home.' },
  { key: 'silverSmoker', name: 'Silver Smoker', icon: '⚗️', cost: 25, desc: 'Smoke lasts +2s. The calm outlasts the storm.', flavor: 'Polished silver, steady hands.' },
  { key: 'honeyPot', name: 'Honey Pot', icon: '🍯', cost: 25, desc: 'Start each day with +15 honey. The pot is always full.', flavor: 'Saved for a rainy day. Every day.' },
  { key: 'queensFavor', name: 'Queen’s Favor', icon: '👑', cost: 55, desc: 'Damage to bosses +25%. Even empresses can be stung.', flavor: 'The old queen remembers your name.' },
];

// Market stock: three items drawn per market visit (relics not yet owned, plus
// a couple of consumables that are always available).
export const MARKET_CONSUMABLES = [
  { key: 'mending', name: 'Mending Wax', icon: '🕯️', cost: 15, desc: 'Repair the hive by 30 HP right now.' },
  { key: 'beePacket', name: 'Bee Packet', icon: '🐝', cost: 20, desc: 'Gain 6 bees immediately (up to your cap).' },
  { key: 'heartMeal', name: 'Heart Meal', icon: '❤️', cost: 20, desc: 'Heal the warden by 2 hearts right now.' },
];

export function randomUpgradeChoices(rng, owned, count = 3) {
  // Draw `count` distinct upgrades that are not maxed out.
  const avail = UPGRADES.filter((u) => (owned[u.key] || 0) < u.maxStacks);
  return rng.shuffle(avail).slice(0, Math.min(count, avail.length));
}

export function randomMarketStock(rng, ownedRelics) {
  // 2 relics (unowned) + 1 consumable, shuffled.
  const relics = rng.shuffle(RELICS.filter((r) => !ownedRelics.has(r.key))).slice(0, 2);
  const consumable = rng.pick(MARKET_CONSUMABLES);
  return rng.shuffle([...relics, consumable]);
}
