# Relay Rift Release Version Proposal

## Recommended release target

Release as a self-hostable browser arcade roguelike: **Relay Rift: Paddle Raid**.

The release version should not try to look like a full commercial AAA title through asset volume. It should feel polished through clarity, responsiveness, strong feedback, and a complete progression loop.

## Proposed release feature set

### Must-have for v1.0

1. Academy Path and optional guided starts
   - 7 lessons with clear goals.
   - Completion summary.
   - Unlock recommendations for next mode.
   - Optional Guided Tutorial toggle for co-op and competitive starts, so players can learn inside the mode they actually selected.

2. Plug-and-play run
   - Instant Run + Bots.
   - Presets that are understandable by name and difficulty.
   - No mandatory networking knowledge.

3. Stable multiplayer
   - 1-8 players.
   - Co-op raid.
   - Mirror Duel 4v4.
   - Bot fill/remove.
   - Public link helper retained as optional.

4. Complete roguelike loop
   - Missions.
   - 5-card upgrades.
   - Role identity.
   - Level clear/failure summaries.

5. Basic presentation polish
   - Audio feedback.
   - Hit sparks/camera pulse.
   - Readable HUD at all sizes.
   - Low-performance mode.

6. Reliability
   - Reconnect token.
   - Deterministic seeds.
   - Smoke tests and one longer bot soak test.

## Proposed release modes

- Academy Path: teaches mechanics.
- Guided Quick Raid: default co-op with optional tutorial overlay.
- Guided Mirror Duel: 1v1 to 4v4 competitive with optional team/lanes tutorial.
- Daily Rift: deterministic daily seed.
- Boss Rush: authored elite-core challenge.
- Chaos Lab: sandbox mutator mode.

## Release schedule proposal

### v0.6 Beta

- Add audio.
- Add reconnect token.
- Add post-run summary.
- Add seeded run generation.

### v0.8 Release Candidate

- Add three authored boss patterns.
- Add daily seed.
- Add accessibility/input remapping.
- Add performance diagnostics.

### v1.0 Release

- Freeze core mechanics.
- Polish Academy.
- Publish complete README and landing page.
- Produce short GIF/video preview.
- Tag release on GitHub.

## Positioning

One-sentence pitch:

> Relay Rift is a self-hostable 1-8 player paddle-raid roguelike where players learn simple arcade controls, draft chaotic upgrades, and turn the ball into a shared weapon.

## Risk list before v1.0

- Too much visual noise in late modes.
- No reconnect/session persistence yet.
- No audio identity yet.
- Multiplayer feel still depends on basic interpolation rather than full prediction.
- Bosses are still system-driven, not fully authored encounters.
