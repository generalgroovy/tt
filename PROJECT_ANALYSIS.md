# Relay Rift Alpha Feedback Simulation and Optimization Pass

This pass treats the 2.1 build as beta and simulates early external feedback. The goal is not feature sprawl; it is converting the game into an alpha that communicates state clearly, survives common lobby confusion, feels less abrupt, and gives players useful feedback.

## Simulated feedback

### New player

- “I do not know what to do first.”
- “I joined but I am not sure whether I am waiting or playing.”
- “The role names sound interesting, but I need stronger status feedback.”

Implemented response:

- Added first-run onboarding text.
- Kept practice playable in lobby.
- Added visible ready strip and clearer lobby status wording.

### Host

- “Hosting works, but I need stronger proof that the room is actually active.”
- “Starting the run is too sudden.”
- “When I change settings, old ready states should not remain valid.”

Implemented response:

- Retained visible host state, room code, links, roster, and status feed.
- Added ready state and ready counts.
- Added countdown phase before multiplayer starts.
- Host configuration now resets readiness.

### Competitive players

- “Switching from co-op to versus should not leave everyone stacked on one side.”
- “I need to audit team balance quickly.”

Implemented response:

- Versus configuration now redistributes teams left/right in alternating order.
- Ready strip and roster make state easier to audit.

### Co-op players

- “Opening pace can get chaotic too quickly.”
- “We need a way to understand why a run failed.”

Implemented response:

- Reduced opening ball speed.
- Added server-side speed cap.
- Added diagnostics: last event, shots, block hits, misses, best combo.

### Performance-constrained laptop

- “Glow and grid can be expensive.”

Implemented response:

- Added visual quality selector: High, Medium, Low/Laptop.
- Low quality disables expensive shadows and grid rendering.

## Implemented alpha changes

- Versioned as `2.2.0-alpha`.
- Health endpoint reports version.
- Lobby ready state.
- Launch countdown phase.
- Readiness reset on host config changes.
- Team redistribution when switching to versus.
- Gentler ball launch and speed cap.
- Run statistics and last-event telemetry.
- Client diagnostics panel.
- Client visual quality preset.
- Stronger smoke test covering readiness and countdown.

## Remaining alpha risks

- The game still lacks deterministic seeded runs.
- There is no reconnect token yet.
- There is no audio pass yet.
- There is no real tutorial mission sequence yet.
- Client interpolation is simple and not full prediction/reconciliation.
- Bosses are still systemic hazards rather than authored encounters.

## Next recommended pass

1. Add a tutorial ladder: serve, spin, save, split, portal, co-op role drill.
2. Add deterministic seeds and daily run.
3. Add reconnect tokens.
4. Add gamepad support.
5. Add authored boss encounters.
6. Add sound design and camera feedback.
7. Add player ping/latency and server tick diagnostics.
8. Add post-run summary overlay with MVP callouts.
