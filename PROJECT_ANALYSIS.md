# Project analysis and multiplayer reimplementation

The previous `tt` repository was a static single-player roguelike paddle game. The visible project history emphasized a quantum roguelike overhaul with spin, bosses, relics, and playability polish.

This reimplementation keeps the roguelike paddle-combat loop but changes the architecture for remote play. The Node server is authoritative, creates rooms, detects LAN invite links, can request a public tunnel link from inside the app, receives player input over WebSocket, simulates the field, and broadcasts snapshots to all clients.

The result is easier hosting: start the app, press Host, copy/share the generated link, and friends join from that link.
