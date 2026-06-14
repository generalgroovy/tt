# Relay Rift Alpha

Self-hostable paddle-raid roguelike, now promoted from beta-style prototype to alpha-style playable foundation.

## Run

```bash
npm install
npm start
```

Open `http://localhost:8080`.

## Alpha improvements

- First-run guidance explains the host/join/practice/ready/start flow.
- Host and joined players stay in a playable practice lobby until launch.
- Players can mark themselves **Ready**; ready count is visible to the room.
- Host launch now uses a visible countdown instead of an abrupt transition.
- Lobby configuration resets ready state so nobody is accidentally carried into a changed run.
- Versus team balancing is fixed when switching between co-op and versus.
- Runtime pacing is gentler: lower opening ball speed and server-side speed cap reduce chaos spikes.
- Client visual quality setting: High, Medium, Low/Laptop.
- Diagnostics panel shows last event, shots, blocks, misses, best combo, and current quality preset.
- Health endpoint reports alpha version and room capacity.

## Core experience

- Single-player practice is always available before hosting or joining.
- Visible hosting state: online badge, room code, invite links, player count, host label, and status feed.
- Up to 8 players per room.
- Co-op raid supports 1-8 players against escalating rooms.
- Mirror Versus supports 1v1 through 4v4 with symmetric left/right lane placement around the arena midpoint.
- Six roles: Guard, Striker, Runner, Vector, Anchor, Chaos.
- Server-authoritative multiplayer simulation with smoother client rendering/interpolation.
- Richer mechanics: energy, shields, combo, rally economy, spin authority, portals, midpoint net, heal/split/charge/heavy blocks, extra balls, pierce, magnet, tempo, boss-bane, vampire rally, and drill damage.
- Level clear offers 5 readable upgrade choices.

## Host and join

1. Enter callsign and role.
2. Choose Co-op Raid or Mirror Versus.
3. Press **Host Room**.
4. Share the visible invite link.
5. Friends open the link and auto-join the practice lobby.
6. Players practice locally and press **Ready**.
7. Host configures difficulty, target level, mode, and player cap.
8. Host presses **Launch Multiplayer Run**.
9. Countdown starts; synchronized run begins after countdown.

Same-Wi-Fi friends use the LAN link shown in the app. Internet friends can try **Make Public Link**, which uses the optional `localtunnel` dependency from inside the app.

## Test

```bash
npm test
```

The smoke test checks HTTP serving, versioned health, WebSocket room creation, 8-player join, mirrored 4-vs-4 team balance, ready state, readiness reset after host config, countdown launch, multiplayer transition, and 5-card upgrade draft generation.

## Structure

```text
server.js                 app entrypoint
src/server/app.js         HTTP, static serving, WebSocket rooms
src/server/game.js        server-authoritative game simulation
src/server/constants.js   roles, arena constants, upgrade definitions
public/index.html         UI shell
public/css/styles.css     polished responsive styling
public/js/main.js         client networking, UI, renderer, practice mode
scripts/smoke-test.js     integration smoke test
```
