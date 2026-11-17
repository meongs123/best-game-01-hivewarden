# HIVEWARDEN — build progress

Original prompt: Build a NEW game from scratch for the make.fun bounty best-game-01 (entry v3, @meongs123). BUILD ONLY — no submit, no bundle, no touching PROMISE/ASHLINE. Title: "HIVEWARDEN: your swarm is your weapon; direct the bees through ten days across four meadows." 2D top-down pastoral action. Follow the winner formula (one clear mechanic, 10-stage arc, between-stage choices, upgrade/relic progression, enemy variety + bosses, 3 difficulties, rich HUD, stats/S-rank screens). Target ~1MB real content. Entries close 2026-11-18T18:00Z.

## Design pillars
1. ONE mechanic, readable in one sentence: direct the swarm with the mouse; bees do the fighting.
2. Moment-to-moment decisions: where to send the swarm, when to smoke, when to plant a flower, when to guard the hive vs hunt.
3. Session arc: 10 days, 4 meadows, quota + timer each day, Fork choice + upgrade choice between days, bosses on days 5/8/10.
4. Depth you can see: 7 enemy types + 3 bosses, 10 relics, 12 blessings, 15+ upgrades, 3 difficulties, bestiary, best stats, S-rank victory screen.
5. Pastoral golden daytime look (differentiate from dark top entries); juice on every banish (particles, number pops, small shake, chain counter).

## Numbers (hypotheses, tune after bot playtest)
- Keeper: speed 200 px/s, 3 hearts, radius 14. Hive: 60 HP (day 1), at meadow center-top.
- Bees: start 12, max 40. Regrow 1 bee / 2.5s from hive; flowers +0.4 bee/s each. Bee damage 1, attack speed ~2 stings/s per bee in radius, swarm moves 260 px/s.
- Honey: +2 per mite, +3 wasp, +5 hornet, +4 spider, +3 moth-thief, +8 broodwasp, bosses +40/+60/+100. Flowers yield +1 honey / 8s each. Flower cost 15 honey, max 5 (upgradeable).
- Smoke (Space): radius 150, pushes + stuns 2s, cooldown 8s.
- Day length: 75s (Clover +15s, Swarm -10s). Quotas: d1 8, d2 12, d3 16, d4 20, d5 24+boss, d6 26, d7 30, d8 32+boss, d9 36, d10 40+boss.
- Enemy HP: mite 1, wasp 2, hornet 4, spider 3, moth-thief 2, broodwasp 6, wardwasp 4 (shield front). Bosses: Hornet Queen 60, Mite King 80, Wasp Empress 120. Enemy contact damage: 1 heart per hit (keeper), hive damage per hit 2-6 by type.
- Difficulty multipliers: Clover HP x0.8 spawn x0.8 quota x0.8 timer +15s; Hive x1; Swarm HP x1.3 spawn x1.3 quota x1.15 timer -10s.

## File plan (repo ~/workspace/makefun/best-game-01-hivewarden/)
- game/index.html, game/src/main.js (loop/state/hooks), rng.js, audio.js, input.js, save.js, data.js (days/enemies/relics/blessings/upgrades), sim.js (update logic), render.js (canvas), ui.js (screens)
- main.ts (handoff entrypoint), serve.ts, shots.json, README.md, LICENSE, dossier.json (written at end)
- tools/check-days.mjs (static audit + bot reachability), tools/playtest.mjs (CDP), tools/shots.mjs, tools/determinism.mjs
- screenshots/ 4 jpgs (title, gameplay, fork, victory), first by name = cover

## TODO
- [x] Write game modules (data, sim, render, ui, main)
- [x] index.html + main.ts + serve.ts + shots.json + README + LICENSE
- [x] tools: check-days (static + bot), playtest (CDP days 1/5/10), shots (4x 1280x720), determinism (2-run)
- [x] Tune numbers from bot results; fix console errors; iterate
- [x] dossier.json, commit, push, report to parent (repo URL, commit, sizes, verification, caveats)

## DONE — 2026-11-17 ~13:50 WIB
- Balance fixes from bot runs: idle bee guard radius 150→60px (day 1 was winnable standing still); quotas raised (10/14/18/22/26/28/32/34/38/42); keeper 3→4 hearts, hurt cooldown 1.2s, chase enemies prefer hive unless keeper <140px, +1 heart rest per day cleared; bee regrow 2.5s→3.5s; boss days require the boss banished, not just the quota.
- NaN bug fixed: run counters moved from stats → tally (stats is the derived-stats object).
- Visual pass: bees +30% with swarm glow halo, keeper +25% with ground ring, brighter apple trees; victory staged score made self-consistent (96400 > S bar 90000).
- Verification: static audit 0 failures (all difficulties); bot wins 10/10 on seeds 1/2/3 (scores 107-111k, rank S, 3/3 bosses); CDP playtest 13/13 PASS (9 real-input checks + in-browser bot victory + 0 console errors + 0 external requests); determinism PASS (2 runs byte-identical, sha256 569e1240…); 4 screenshots ≤256 KiB, 0 console errors.
- main.ts handoff verified once into scratch (out-test, deleted after): dossier.json 428,903 B, total 771 KiB. NOT submitted, NOT bundled for submit — build only.
- Caveats: no human playtest; shots 02-04 staged via ?shot=; honey generous late-game; repo ~436 KiB (game code ~92 KiB) — below winners' 0.75-1.46 MB but systems depth complete.

## Notes / gotchas
- No Playwright on this VM; use CDP via chrome-headless-shell + Node built-in WebSocket (proven by PROMISE tooling).
- /tmp is a 512M tmpfs — keep all work under ~/workspace.
- No external network at runtime; all art is canvas-drawn; audio is WebAudio synth.
- Do NOT copy Lanternkeep/HEFT/PROMISE code or assets. Original code only.
- Screenshots staged via ?shot= params — document honestly which shots used staged/buffed states.
