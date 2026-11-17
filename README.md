# HIVEWARDEN

**HIVEWARDEN — your swarm is your weapon; direct the bees through ten days across four meadows.**

A 2D top-down pastoral action game for the [make.fun](https://make.fun) best-game-01 bounty. You are the Warden, a beekeeper defending the hives. The wasps are coming — and the bees are waiting for your orders.

## How to play

- **WASD / arrows** — move the warden
- **Click / hold mouse** — direct the swarm to that point; bees sting whatever is there, then return to the hive
- **Space** — smoke puff: repels and calms wasps in a radius (cooldown)
- **E** — plant a flower patch (10 honey): regrows bees and yields honey over time
- **P** — pause, **M** — mute, **F** — fullscreen

Each day sends waves of raiders at the hive. Banish them all to clear the day — a par time sets the time bonus. Lose the hive, or fall yourself, and the meadow goes quiet. Hold all ten days to win.

Between days, choose 1 of 3 upgrades, then take one road at **The Meadow's Fork**: the Wildflower Shrine (trade honey for hearts and bees), the Quiet Meadow (no toll, small gift), or the Apiary Market (spend honey on relics and supplies).

## The game

- **10 days across 4 meadows** — Clover Meadow (1–2), Apple Orchard (3–5), Riverbank (6–8), Hive Hill (9–10)
- **6 enemy types** — Mite, Wasp, Hornet, Spider, Moth-thief, Broodwasp — each with its own speed, HP, and behavior
- **3 bosses** — the Hornet Queen (day 5), the Mite King (day 8), the Wasp Empress (day 10)
- **12 upgrades, 10 relics, 3 market supplies** — plus honey as currency, chains, and score ranks (S/A/B)
- **3 difficulties** — Clover (gentler), Hive (as meant), Swarm (tougher)
- **Bestiary, best stats, and an S-rank victory screen** with full run statistics

## Play it

No build step, no network calls, no external assets — everything is local.

```sh
node serve.mjs   # serves game/ on http://127.0.0.1:8901
```

Open the page in a browser and click **Defend the Hive**.

## Verify it

```sh
node tools/check-days.mjs   # static reachability audit (pacing, DPS, rank attainability)
node tools/playtest.mjs     # headless-browser playtest, 18 checks (needs serve.mjs + chrome-headless-shell)
node tools/determinism.mjs  # two-run byte-identical check
node tools/shots.mjs        # 4 screenshots at 1280x720
```

Latest results (2026-11-17): check-days ALL PASS; playtest 18/18 PASS with three consecutive full-run victories under autopilot (scores 28,704–34,247, all rank S); determinism PASS (two runs byte-identical, sha256 `7344367c…`); 0 console errors; 0 external requests.

## License

MIT — see [LICENSE](LICENSE).
