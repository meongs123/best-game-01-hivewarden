# HIVEWARDEN

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/meongs123/best-game-01-hivewarden/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/meongs123/best-game-01-hivewarden/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**HIVEWARDEN — your swarm is your weapon; direct the bees through ten days across four meadows.**

A 2D top-down pastoral action game for the [make.fun](https://make.fun) best-game-01 bounty. You are the Warden, a beekeeper defending the hives. The wasps are coming — and the bees are waiting for your orders.

## How to play

- **WASD / arrows** — move the keeper
- **Click / hold mouse** — direct the swarm to that point; bees sting whatever is there, then return
- **Space** — smoke puff: push back and calm wasps in a radius (cooldown)
- **E** — plant a flower (15 honey): regrows bees and yields honey over time
- **P** — pause, **M** — mute, **R** — retry the day

Each day has a timer and a quota: banish the quota of wasps before dusk falls. Lose the keeper, lose the hive, or miss the quota at dusk, and the day is lost. Hold all ten days to win.

Between days, choose a blessing (1 of 3 upgrades), then take one road at **The Meadow's Fork**: the Wildflower Shrine, the Quiet Meadow, or the Apiary Market — where honey buys relics and blessings.

## The game

- **10 days across 4 meadows** — Clover Meadow, Apple Orchard, Riverbank, Hive Hill
- **7 enemy types** — Mite, Wasp, Hornet, Spider, Moth-thief, Broodwasp, and the shielded Wardwasp (circle around its shield)
- **3 bosses** — the Hornet Queen (day 5), the Mite King (day 8), the Wasp Empress (day 10)
- **10 relics and 12 blessings** with distinct effects, plus 12 day-clear upgrades
- **3 difficulties** — Clover (gentler), Hive (as meant), Swarm (tougher)
- **Bestiary, best stats, and an S-rank victory screen** with full run statistics
- Deterministic seeded play, localStorage best stats, synthesized WebAudio sound (no audio files), no network requests at runtime

## Play it

```bash
node serve.ts   # serves game/ on http://127.0.0.1:8080
```

Open `game/index.html` in any modern desktop browser. No build step, no dependencies.

## License

MIT — see [LICENSE](LICENSE).
