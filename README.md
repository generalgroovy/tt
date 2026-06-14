# TT Multiplayer Roguelike 2.0

Self-hostable single-player and multiplayer paddle roguelike for 1-8 players.

## Run

```bash
npm install
npm start
```

Open `http://localhost:8080`.

## Current experience

- Solo practice is always available before joining or hosting.
- Host creates a visible lobby with room code, invite link, player count, and status.
- Everyone stays in a playable single-player practice lobby while the host configures.
- Up to 8 players can join.
- Versus mode automatically mirrors players into 4-vs-4 left/right teams around the centerline.
- Co-op mode supports up to 8 players on the shared team against escalating roguelike levels.
- Host can configure mode, player count, difficulty, and target level before launch.
- Players choose roles: Guard, Striker, Runner, Vector, Anchor, Chaos.
- Runs include blocks, healing blocks, split blocks, charge blocks, heavy blocks, portals, midpoint net hazards, shields, energy, spin, combo, and rally economy.
- Level clear now offers 5 upgrade choices instead of 3.

## Host and join

1. Run the server.
2. Open the app.
3. Enter a name and role.
4. Press **Host room**.
5. Share the visible invite link.
6. Friends open the link and auto-join the practice lobby.
7. Host configures the lobby while everyone practices.
8. Host presses **Start multiplayer run**.

Same-Wi-Fi friends use the LAN link shown in the app. Internet friends can try **Make public link**, which uses the optional `localtunnel` dependency from inside the app.

## Test

```bash
npm test
```

The smoke test verifies HTTP serving, WebSocket hosting, 8-player join, mirrored 4-vs-4 team balance, visible lobby state, multiplayer start, and 5-upgrade draft creation.
