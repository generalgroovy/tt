# TT Multiplayer Roguelike

Self-hostable 1-4 player multiplayer paddle roguelike.

## Run

```bash
npm install
npm start
```

Open `http://localhost:8080`.

## Host and join

1. Enter a name.
2. Select mode, player count, difficulty, and target level.
3. Press **Host room**.
4. The app shows **You are hosting**, a room code, visible player count, and invite links.
5. Share the invite link. Friends open it and join from inside the app.
6. Everyone is placed in a local single-player practice lobby while waiting.
7. The host can continue changing lobby settings while everyone practices.
8. Host presses **Start multiplayer run**.

Same-Wi-Fi friends use the LAN link shown in the app. Internet friends can try **Make public link**, which uses `localtunnel` from the app.

## Test

```bash
npm test
```

The smoke test verifies HTTP serving, WebSocket hosting, visible hosting state, friend join, lobby configuration, and host start.
