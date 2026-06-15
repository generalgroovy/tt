# Relay Rift Public-Link Alpha

Self-hostable paddle-raid roguelike built from the original `tt` prototype. This build keeps Relay Rift itself at zero npm dependencies while adding an optional public-internet host launcher. The host runs the server once, creates a room, copies the invite link, and other players join in a browser.

## Easiest launch

Local/LAN only:

```text
Double-click RelayRift.cmd
```

Public internet link for players outside your network:

```text
Double-click RelayRift-Public.cmd
```

`RelayRift-Public.cmd` starts the local Node server, starts a Cloudflare quick tunnel through `cloudflared`, registers the generated public URL in the game, and opens the public link. Windows will try to download the single `cloudflared.exe` helper into `tools/` if it is missing.

macOS/Linux public launch:

```bash
chmod +x RelayRift-Public.command RelayRift-Public
./RelayRift-Public.command
```

On macOS/Linux, install `cloudflared` or place the binary at `tools/cloudflared`.

## Manual run

```bash
node server.js
```

Open `http://localhost:8080` after the terminal says the server is listening.

## Multiplayer model

- Host runs Relay Rift once.
- Host clicks **Host Lobby** or **Instant Run + Bots**.
- Host copies the invite link shown in the room panel.
- Joiners only open that link in a browser.
- Local launcher links work on the same Wi-Fi/LAN.
- Public launcher links work outside the LAN while the public launcher window remains open.

## Highlights

- **Zero npm dependencies for Relay Rift**: no `ws`, no `localtunnel`, no npm install step.
- **Optional public internet link**: `RelayRift-Public.cmd` creates a temporary public URL through `cloudflared`.
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

## Test

```bash
npm test
```

The smoke test verifies zero dependencies, HTTP/SSE transport, public URL registration, quickstart with bots, optional co-op/versus tutorial toggling, mission contracts, bot fill/remove, 8-player mirrored teams, countdown launch, and 5-card upgrade drafts.

## Structure

```text
RelayRift.cmd             Windows local/LAN launcher
RelayRift.command         macOS local/LAN launcher
RelayRift                 Linux/Unix local/LAN launcher
RelayRift-Public.cmd      Windows public-internet launcher
RelayRift-Public.command  macOS public-internet launcher
RelayRift-Public          Linux/Unix public-internet launcher
launcher.mjs              launcher with optional cloudflared public tunnel
server.js                 app entrypoint
src/server/app.js         built-in HTTP/SSE room transport
src/server/game.js        server-authoritative simulation
src/server/constants.js   version, presets, roles, upgrades
src/server/missions.js    contract mission system
src/server/tutorial.js    optional guided tutorial ladder
public/index.html         UI shell
public/css/styles.css     responsive arcade/HUD styling
public/js/main.js         client networking, UI, renderer
scripts/smoke-test.js     integration smoke test
```
