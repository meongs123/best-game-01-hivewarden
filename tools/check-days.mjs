// HIVEWARDEN — day checker (dev tool, not part of the game).
// Verifies every one of the 10 days is winnable with the real combat numbers:
// total enemy HP vs the swarm's DPS at that point in the run (conservative
// engagement factor: only half the bees are on target at any moment), the
// pacing sawtooth, the boss/day/meadow tables, and that every upgrade and
// relic key the simulation reads actually exists in the data.
// Run: node tools/check-days.mjs
import { DAYS, ENEMY_TYPES, BOSSES, totalEnemyHp, pacingProblems } from '../game/src/levels.js';
import { UPGRADES, RELICS, MARKET_CONSUMABLES } from '../game/src/upgrades.js';
import { DIFFICULTIES, SWARM, SCORE } from '../game/src/config.js';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`);
};

// --- table sanity ---
check('10 days, numbered 1-10 in order', DAYS.length === 10 && DAYS.every((d, i) => d.day === i + 1));
check('every batch kind exists', DAYS.every((d) => d.batches.every((b) => ENEMY_TYPES[b.kind] && ['top', 'bottom', 'left', 'right'].includes(b.edge))));
check('every boss key exists', DAYS.filter((d) => d.boss).every((d) => BOSSES[d.boss] && BOSSES[d.boss].day === d.day));
check('boss days are 5, 8, 10', JSON.stringify(DAYS.filter((d) => d.boss).map((d) => d.day)) === '[5,8,10]');
check('meadows cover days 1-2, 3-5, 6-8, 9-10',
  DAYS[0].meadow === 'clover' && DAYS[1].meadow === 'clover' &&
  DAYS[2].meadow === 'orchard' && DAYS[4].meadow === 'orchard' &&
  DAYS[5].meadow === 'river' && DAYS[7].meadow === 'river' &&
  DAYS[8].meadow === 'hill' && DAYS[9].meadow === 'hill');
const pacing = pacingProblems();
check('pacing sawtooth (no 3 high days in a row, breather before bosses, dip at meadow change)', pacing.length === 0, pacing.join('; '));

// --- upgrade / relic keys the sim reads ---
const upgradeKeys = ['moreBees', 'swiftWings', 'sharpStings', 'wideSmoke', 'coolSmoke', 'richBlooms', 'hiveArmor', 'quickHive', 'longReach', 'sturdyWarden', 'honeyMagnet', 'chainKeeper'];
check('every upgrade key in the sim exists in UPGRADES', upgradeKeys.every((k) => UPGRADES.some((u) => u.key === k)));
const relicKeys = ['goldenComb', 'royalJelly', 'amberLens', 'sunpetalCrown', 'wardensVeil', 'thornHedge', 'beekeepersBell', 'silverSmoker', 'honeyPot', 'queensFavor'];
check('every relic key in the sim exists in RELICS', relicKeys.every((k) => RELICS.some((r) => r.key === k)));
check('market consumables have costs', MARKET_CONSUMABLES.every((c) => c.cost > 0 && c.key));

// --- DPS feasibility per day (Hive difficulty, conservative model) ---
// Model: the player gains roughly +2 bees and +0.25 sting damage per day from
// upgrades; only half the bees are engaged at any moment (travel + spread).
// A day passes if the modelled clear time is under par + 60s.
console.log('--- DPS feasibility (Hive difficulty, 50% engagement) ---');
let allFeasible = true;
for (const d of DAYS) {
  const totalHp = totalEnemyHp(d, DIFFICULTIES.hive.enemyHp);
  const bees = Math.min(SWARM.beesMax, SWARM.beesBase + 2 * (d.day - 1));
  const dmg = SWARM.stingDamage + Math.floor((d.day - 1) / 4);
  const dps = (bees * dmg) / SWARM.stingCooldown * 0.5;
  const clearSeconds = totalHp / dps;
  const budget = d.par + 60;
  const ok = clearSeconds < budget;
  if (!ok) allFeasible = false;
  check(`day ${d.day} ${d.name}: ${totalHp} HP vs ${dps.toFixed(1)} DPS -> ${clearSeconds.toFixed(0)}s < ${budget}s budget`, ok, `bees=${bees} dmg=${dmg}`);
}
check('all 10 days feasible under the conservative model', allFeasible);

// --- hive pressure: if the player did nothing, how fast would the hive fall? ---
// This is a report, not a gate: it must be long enough that a playing warden
// can always intervene (each day's first batch arrives at t=2s).
console.log('--- hive pressure if ignored (report only) ---');
for (const d of DAYS) {
  let dps = 0;
  for (const b of d.batches) dps += ENEMY_TYPES[b.kind].damage * b.count * 0.2; // 20% reach the hive unopposed
  if (d.boss) dps += BOSSES[d.boss].damage * 0.2;
  const seconds = DIFFICULTIES.hive.hiveHp / Math.max(0.1, dps);
  console.log(`day ${d.day}: hive would last ~${seconds.toFixed(0)}s ignored (first batch at 2s)`);
}

// --- score attainability: can a good run reach rank S? ---
// Model: banish points at chain x2 average + day clear + time bonus.
let modelled = 0;
for (const d of DAYS) {
  let pts = 0;
  for (const b of d.batches) pts += ENEMY_TYPES[b.kind].score * b.count;
  if (d.boss) pts += SCORE.points.boss + (SCORE.bossBonus[d.boss] || 0);
  modelled += pts * 2; // chain x2 average
  modelled += SCORE.dayClear * d.day + 30 * 5; // day clear + ~30s under par
}
modelled += 150 * SCORE.honeyToScore; // leftover honey
console.log(`modelled good-run score: ~${modelled} (rank S needs ${SCORE.rankS})`);
check('a good run can reach rank S', modelled >= SCORE.rankS, `modelled ~${modelled}`);
check('a decent run can reach rank A', modelled * 0.75 >= SCORE.rankA, `75% of modelled ~${Math.round(modelled * 0.75)}`);

const failed = results.filter((r) => !r.ok);
console.log('---');
console.log(failed.length ? `CHECK-DAYS FAILED: ${failed.length} checks` : 'CHECK-DAYS ALL PASS');
process.exit(failed.length ? 1 : 0);
