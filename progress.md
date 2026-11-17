# HIVEWARDEN — build progress

Original prompt: BUILD best-game-01 v3 from scratch: "HIVEWARDEN — your swarm is your weapon; direct the bees through ten days across four meadows". 2D top-down action, pastoral golden meadow. Core mechanic: direct the bee swarm (click to send bees to a point; Space smoke puff; E plant flower). Win: survive all 10 days. Lose: hive destroyed or warden falls. Arc: 10 days across 4 meadows (Clover Meadow 1-2, Apple Orchard 3-5, Riverbank 6-8, Hive Hill 9-10). Between days: "The Meadow's Fork" (Wildflower Shrine / Quiet Meadow / Apiary Market) + choose 1 of 3 upgrades. Enemies: Mite, Wasp, Hornet, Spider, Moth-thief, Broodwasp; bosses Hornet Queen (day 5), Mite King (day 8), Wasp Empress (day 10). Progression: upgrades + relics, honey currency, chains, score. 3 difficulties (Clover/Hive/Swarm). Title screen (how-to, bestiary, difficulty, best stats), rich HUD, victory screen with S/A/B rank + full stats, defeat screen. No submit, no badges, no About changes, no copying. Verify: reachability (all 10 days winnable), headless playtest 0 console errors, 4 screenshots 1280x720, two runs byte-identical (sha256). Repo: github.com/meongs123/best-game-01-hivewarden.

## Design pillars
1. One clear verb: DIRECT THE SWARM (click to send bees) — readable in a screenshot.
2. Ten-day arc with a choice between every day (fork road + 1-of-3 upgrade).
3. Pastoral gold daytime — deliberately distinct from the dark winners, still readable.
4. Depth you can see: HUD shows hearts, bees, honey, day dots, incoming list, upgrades.

## Economy (rationale)
- Honey sources: enemy drops (mite 2, wasp 3, hornet 5, spider 4, moth 3, broodwasp 6, boss 50), flowers +1/5s, Quiet Meadow +10, day-clear bonus.
- Honey sinks: flowers 10 each, Shrine 20, Market items 25-60. Leftover honey converts to score x2 at victory, so hoarding is a valid strategy.
- Bees: cap 12 base; hive regrows +1/10s, flower +1/8s; hornets/Empress kill bees on contact. Upgrades raise cap/damage/speed.

## Balance targets
- Day 1 total HP 30 vs player ~24 max DPS: trivially winnable, teaches the verb.
- Day 5 boss 120 HP + adds ~54: ~3-6s focused DPS with day-5 upgrades.
- Day 10 boss 320 HP + adds ~126: ~3-5s focused DPS at full build; travel + boss mechanics stretch the day to 60-120s.
- Hive 100 HP (Hive difficulty); mite/wasp hit 1, hornet/spider 2, boss contact 3. Warden 5 hearts, 1s invulnerability after a hit.

## TODO
- [x] Skills read; env checked (node 24, gh meongs123, headless-shell 1255)
- [x] Repo exists (created 2026-11-17T06:24:50Z, empty) — clone ready
- [x] Write game files (index.html + src/*)
- [x] Write tools (serve, check-days, playtest, shots, determinism)
- [x] Run verification: reachability, playtest, screenshots, determinism
- [x] dossier.json, README.md, LICENSE; commit + push; report to parent

## Final verification (2026-11-17, all after the last code change)
- check-days.mjs: ALL PASS (pacing sawtooth, DPS feasibility all 10 days, rank S modelled ~23000 vs bar 20000).
- playtest.mjs: 18/18 PASS, 0 console errors, 0 failed network requests. Three consecutive full-run autopilot victories: scores 30023, 32751, 28704 — all rank S.
- determinism.mjs: PASS — two runs byte-identical, hash 8b7aea26 both, sha256 7344367c546b2fc757e699d08f0dc00e5a1baa933847d4bdf78a3b8d0fcaed5a.
- shots.mjs: 4/4 saved at 1280x720 (01-cover real mid-day-3 gameplay, 02-title, 03-fork, 04-victory), 0 console errors; all four visually verified.
- No external URLs anywhere in game/ (source grep); all runtime requests same-origin.
- Total: 30 files, ~470 KiB (game ~100 KiB, screenshots ~278 KiB, vendor ~56 KiB).

## Bugs found and fixed during verification
1. entities.js imported BOSSES from config.js (lives in levels.js) — game would not boot.
2. Headless-shell :9222 is shared with another process (its tab got navigated to a :8080 page mid-run) — moved to a dedicated shell on :9333 with its own profile.
3. Day-5 jump test had no loadout (applyUpgrade was called with the wrong arity in the tool) — restored the prepared loadout.
4. chainKeeper doubled chain bonus (x10 chains, rank S trivial) — now +1 chain cap per stack; rank bars S 20000 / A 14000 / B 9000.
5. Meadow label stuck on "Clover Meadow" (operator precedence in MEADOWS.find) — meadows now change visually per day (orchard green, river, hive-hill gold).
6. nextDay() never hid the upgrade overlay — it stayed over live gameplay. Fixed with ui.hideAll().
7. autoFork re-entrancy: it re-clicked hidden road cards while the upgrade screen was up — now returns early unless the fork screen is visible.
8. Day 3 had no breather at the meadow change — softened (63 HP vs day 2's 80).

## IMPORTANT — parallel build on master (do NOT force-push)
While this build was in progress, a second, independent HIVEWARDEN implementation landed on the repo's master branch: commit 32f39b4412edf3f3b7add231d1041588ee6f4c18 ("HIVEWARDEN v3: complete 10-day campaign", 2026-11-17 13:37 WIB, 28 files, ~436 KiB). It is a DIFFERENT design (day quota + dusk timer, blessings, Wardwasp enemy, keeper 4 hearts, bees die in combat) with its own verification (node bot 10/10 wins, CDP 9/9, determinism sha256 569e1240…). Its README already carries make.fun badges.
This build lives on branch `builder-be425b22` instead. The two branches must NOT be merged blindly — the parent picks one entry for the single remaining slot.
