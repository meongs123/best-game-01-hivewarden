// HIVEWARDEN — determinism check (dev tool).
// Runs the same seeded bot playthrough twice in separate processes and
// requires byte-identical final state text and score.
// Run: node tools/determinism.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const run = (seed) => execFileSync(process.execPath, ['tools/run-bot.mjs', String(seed)], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
const out1 = run(1);
const out2 = run(1);
const h1 = createHash('sha256').update(out1).digest('hex');
const h2 = createHash('sha256').update(out2).digest('hex');
console.log('run 1 sha256:', h1);
console.log('run 2 sha256:', h2);
console.log('identical:', h1 === h2);
console.log(out1.trim().split('\n').slice(0, 3).join('\n'));
if (h1 !== h2) {
  console.log('FAIL — runs differ');
  process.exit(1);
}
console.log('PASS — determinism verified (seed 1, 2 runs byte-identical)');
