// HIVEWARDEN — bot runner (dev tool, used by determinism.mjs).
// Prints the bot playthrough summary + final state text (deterministic).
import { playBot } from './bot.mjs';

const seed = Number(process.argv[2] || 1);
const r = playBot(seed, 'hive');
console.log(`seed ${seed} mode ${r.mode} rank ${r.rank || '-'} score ${r.score} steps ${r.steps}`);
console.log(`banished ${r.tally.banishedTotal} bosses ${r.tally.bossesBanished} flowers ${r.tally.flowersPlanted} survived ${Math.round(r.tally.timeSurvived)}s`);
console.log(r.finalText);
