# Shadows of Pasar Senja — Stealth Heist

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/kuzan-creator/shadows-pasar-senja/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/kuzan-creator/shadows-pasar-senja/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

A complete, original 2D top-down stealth game that plays offline in a desktop browser from static files. You are Raka, a young thief working the dusk-lit streets of an Indonesian coastal town. Slip through three heists — the night market, the heritage museum, and the harbour — steal 3 golden lanterns on each level, and reach the green EXIT unseen.

## How to play

- **WASD / Arrow keys** — move
- **SHIFT** — sneak (slower, much harder to spot)
- **E or Click** — throw a distraction coin towards the mouse
- **ENTER** — start / continue

Guards patrol routes you can learn. Their vision cones turn amber when they grow suspicious and red when they give chase — break line of sight and their suspicion fades, giving you a chance to recover. Hide in bushes and shadow pools. Museum cameras sweep the halls and raise the alarm when they lock on. Harbour guard dogs smell you before they see you, so stay low.

## The three heists

1. **Pasar Malam (Night Market)** — market stalls block sight; bushes and shadows hide you.
2. **Museum Pusaka (Heritage Museum)** — display cases, three sweeping security cameras.
3. **Pelabuhan Senja (Dusk Harbour)** — shipping containers and two patrol dogs.

## Tech

- Pure HTML5 Canvas + ES modules, no libraries, no network requests, no external assets.
- Sound is synthesized live with WebAudio (footsteps, coin clinks, alarms, jingles).
- `main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.
- Play locally: `node serve.ts`, then open http://localhost:8080

## Files

- `game/index.html` — the playable game page
- `game/game.js` — main loop, states, input, coin throwing, objectives
- `game/levels.js` — the three level layouts
- `game/guard.js` — guard, dog and camera AI (vision cones, suspicion, hearing)
- `game/player.js` — movement, sneaking, coin throws
- `game/render.js` — canvas drawing and HUD
- `game/audio.js` — WebAudio sound effects
- `screenshots/` — real renders of the game (the first by name is the cover)
- `vendor/makefun-game.ts` — make.fun library, copied from the kit unchanged

Built for the [Make the best stealth game](https://make.fun/bounty/best-stealth-game-20261121-1759) bounty on make.fun.
