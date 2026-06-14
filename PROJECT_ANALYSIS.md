# Relay Rift project upgrade analysis

This pass restructures the project from a monolithic experiment into a maintainable self-hosted browser game. The target is not a literal AAA-budget product; it is an AAA-inspired direction: cleaner architecture, better visual hierarchy, richer game verbs, smoother runtime, stronger lobby feedback, and tests that cover the multiplayer path.

## Structural upgrades

- Small `server.js` entrypoint.
- Dedicated `src/server/app.js` for HTTP, static files, WebSocket connection lifecycle, rooms, and public-link API.
- Dedicated `src/server/game.js` for server-authoritative room state and simulation.
- Dedicated `src/server/constants.js` for arena constants, roles, and upgrades.
- Dedicated `public` asset tree for HTML, CSS, and client runtime.
- Integration smoke test separated under `scripts`.

## Runtime upgrades

- Uses the `ws` library for WebSocket reliability rather than handwritten protocol parsing.
- Keeps authoritative simulation on the server.
- Broadcasts compact snapshots.
- Client interpolates player and ball positions between snapshots for smoother perceived motion.
- Practice lobby stays local and fluid before the synchronized run starts.

## Presentation upgrades

- Full-screen canvas with layered radial background, glowing grid, midpoint line, and bloom-like canvas effects.
- Glass-panel lobby and HUD treatment.
- Clear room state, host state, invite state, player roster, energy bars, and upgrade cards.
- Responsive layout that keeps the playfield readable on smaller screens.

## Game-design upgrades

- 8-player support.
- Mirrored 4-vs-4 competitive geometry around the midpoint.
- Role identity: Guard, Striker, Runner, Vector, Anchor, Chaos.
- Energy meter, shields, combo, rally economy, role stats, ball damage, portals, central net, and multiple block types.
- 5-card upgrade drafts with readable categories and effect text.

## Next professional-grade milestones

1. Deterministic seeded rooms for reproducible daily runs.
2. Client-side prediction and reconciliation for paddle motion.
3. Gamepad support and configurable input bindings.
4. Sound design: hit layers, combo risers, low-health alarms, upgrade stingers.
5. Boss system with telegraphed attacks and weak points.
6. Spectator mode and reconnect tokens.
7. Dedicated tutorial/training challenges.
8. Performance panel for tick rate, ping, dropped frames, and room health.
9. Full art pass: animated background layers, camera shake, transition scenes, and cinematic boss intros.
