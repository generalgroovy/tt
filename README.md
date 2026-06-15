# Relay Rift Super-Duper Alpha

Self-hostable paddle-raid roguelike built from the original `tt` prototype. This version is focused on plug-and-play fun and gradual skill development: press **Instant Run + Bots**, optionally keep Guided Tutorial enabled for co-op or competitive starts, get a mission contract, start the countdown, and play immediately.

## Run

```bash
npm install
npm start
```

Open `http://localhost:8080`.

## Super-alpha highlights

- **Instant Run + Bots**: no waiting for friends, no setup friction.
- **Optional Guided Tutorial in every mode**: Academy teaches by default; co-op and Mirror Duel can start with the same lesson overlay enabled or disabled.
- **Contract missions**: each preset gives a clear objective and reward.
- **Expanded presets**: First Run, Quick Raid, Mirror Duel 4v4, Chaos Lab, Rift Sprint, Boss Rush.
- **Bot pilots**: bots fill lanes, serve, spin, dash, cover mirrored teams, and use roles.
- **10 roles**: Guard, Striker, Runner, Vector, Anchor, Chaos, Medic, Engineer, Phantom, Warden.
- **Active skill layer**: Shift dash now has Focus Burst synergy that can influence nearby balls.
- **Boss cores**: Boss Rush and every fifth level can spawn elite core blocks.
- **Mission telemetry**: current mission, mission progress, last event, shots, cores, blocks, misses, dashes, focus bursts, bot saves.
- **Plug-and-play host flow**: fill bots, remove bots, quick launch, normal countdown, invite links, and public link option.

## Controls

- Mouse / touch: paddle position
- W/S or Arrow Up/Down: vertical movement
- A/D or Arrow Left/Right: spin direction
- Space / click: serve
- Shift: dash / focus burst when charged

## Presets

| Preset | Use |
|---|---|
| Academy Path | structured lesson ladder from serve to team play |
| First Run | gentle guided run with bots |
| Quick Raid | default co-op plug-and-play run |
| Mirror Duel 4v4 | symmetric competitive 4v4 with bots |
| Chaos Lab | volatile blocks, surge hazards, high intensity |
| Rift Sprint | short score attack with mission pressure |
| Boss Rush | elite cores, higher difficulty, co-op pressure |

## Test

```bash
npm test
```

The smoke test verifies HTML controls, health/version metadata, quickstart with bots, optional co-op/versus tutorial toggling, mission contracts, bot fill/remove, 8-player mirrored teams, preset reconfiguration, countdown launch, and 5-card upgrade drafts.

## Structure

```text
server.js                 app entrypoint
src/server/app.js         HTTP, static serving, WebSocket rooms
src/server/game.js        server-authoritative simulation
src/server/constants.js   version, presets, roles, upgrades
src/server/missions.js    super-alpha contract mission system
public/index.html         UI shell
public/css/styles.css     responsive arcade/HUD styling
public/js/main.js         client networking, UI, renderer, practice mode
scripts/smoke-test.js     integration smoke test
```
