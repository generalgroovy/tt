# TT Multiplayer Roguelike

Self-hostable 1-4 player multiplayer rework of `that's a paddlin`.

## Run

```bash
npm install
npm start
```

Open `http://localhost:8080`, press **Host room**, then copy/share the invite link from inside the app.

Same Wi-Fi friends use the LAN invite link. Internet friends use **Make public link**, which uses the bundled `localtunnel` dependency. No manual room-code routing or config files are required.

Modes: co-op versus the roguelike field enemy, or versus left/right teams. The Node server owns the room, WebSocket sync, physics, HP, levels, blocks, and relic upgrades.

## Test

```bash
npm test
```
