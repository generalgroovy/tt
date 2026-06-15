# Relay Rift Zero-Dependency Host Build

Self-hostable paddle-raid roguelike built from the original `tt` prototype. This version is focused on plug-and-play fun and gradual skill development: press **Instant Run + Bots**, optionally keep Guided Tutorial enabled for co-op or competitive starts, get a mission contract, start the countdown, and play immediately.

## Executable launch

Windows:

```text
Double-click RelayRift.cmd
```

macOS:

```bash
chmod +x RelayRift.command
./RelayRift.command
```

Linux:

```bash
chmod +x RelayRift
./RelayRift
```

The launchers do not run `npm install`. The host starts the local server once, then copies the invite link. Joiners only open the link in a browser.

## Manual run

```bash
node server.js
```

Open `http://localhost:8080` only after the terminal says the server is listening.

## Super-alpha highlights

- **Zero npm dependencies**: no `ws`, no `localtunnel`, no dependency install step.
- **Host runs once**: the host opens Relay Rift locally, creates a room, and shares the invite link.
- **Joiners only need the link**: other players open the link in a browser on the same network.
- **HTTP/SSE transport**: browser-native Server-Sent Events for state updates and normal POST messages for controls.
- **Instant Run + Bots**: no waiting for friends, no setup friction.
- **Optional Guided Tutorial in every mode**: Academy teaches by default; co-op and Mirror Duel can start with the same lesson overlay enabled or disabled.
- **Contract missions**: each preset gives a clear objective and reward.
- **Expanded presets**: First Run, Quick Raid, Mirror Duel 4v4, Chaos Lab, Rift Sprint, Boss Rush.
- **Bot pilots**: bots fill lanes, serve, spin, dash, cover mirrored teams, and use roles.

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

The smoke test verifies zero dependencies, HTTP/SSE transport, quickstart with bots, optional co-op/versus tutorial toggling, mission contracts, bot fill/remove, 8-player mirrored teams, countdown launch, and 5-card upgrade drafts.

## Structure

```text
RelayRift.cmd             Windows launcher
RelayRift.command         macOS command launcher
RelayRift                 Linux/Unix command launcher
launcher.mjs              dependency-free launcher that waits for server health
server.js                 app entrypoint
src/server/app.js         built-in HTTP/SSE room transport
src/server/game.js        server-authoritative simulation
src/server/constants.js   version, presets, roles, upgrades
src/server/missions.js    contract mission system
src/server/tutorial.js    optional guided tutorial ladder
public/index.html         UI shell
public/css/styles.css     responsive arcade/HUD styling
public/js/main.js         client networking, UI, renderer
scripts/smoke-test.js     zero-dependency integration smoke test
```
