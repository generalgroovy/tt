# Relay Rift Super-Alpha Analysis

This pass remakes the alpha into a plug-and-play super-alpha. The main design problem was that the game was becoming mechanically deep but still depended on lobby coordination. Super-alpha changes the default path: the player can launch instantly with bots, understand a mission objective, and get readable feedback while the multiplayer system remains available.

## Structural changes

- Added `src/server/missions.js` to isolate contract mission logic from the core simulation.
- Kept `src/server/game.js` authoritative but expanded it with mission hooks, boss cores, focus burst, and richer run statistics.
- Kept `src/server/app.js` as the room/socket boundary and extended it with quickstart and bot lifecycle messages.
- Kept the client in one browser runtime file for GitHub-copy simplicity, while server logic is modular.

## Mechanics added or improved

- Contract missions tied to presets.
- Mission progress and mission rewards.
- Rift Sprint and Boss Rush presets.
- Phantom and Warden roles.
- Focus Burst: Shift dash can influence nearby balls when upgraded or when using Phantom.
- Boss core blocks that damage the enemy when cracked.
- Core Scanner, Mission Payout, Focus Burst, Afterimage Guard, and other new upgrade hooks.
- More visible run diagnostics.

## Fun-loop changes

Old loop:

1. Host room.
2. Wait for players.
3. Configure.
4. Start.
5. Learn by trial.

Super-alpha loop:

1. Press Instant Run.
2. Bots fill the game.
3. Mission appears.
4. Countdown starts.
5. Play immediately.
6. Invite friends later or host a full mirrored room.

## Current risks

- Bots are useful but not yet personality-rich.
- Boss cores are systemic, not authored boss encounters.
- Missions are simple counters, not multi-stage scripted tutorials.
- Audio and gamepad support are still missing.
- Reconnect tokens are still missing.

## Recommended next pass

1. Add audio feedback and camera shake levels.
2. Add deterministic seeded daily runs.
3. Add authored bosses with telegraphed attacks.
4. Add gamepad support and rebinding.
5. Add reconnect tokens and spectator mode.
6. Split client into UI, renderer, network, and practice modules once the feature loop stabilizes.

## 2.5.1 Optional tutorial implementation

Players no longer have to start in Academy/single-player practice to receive guidance. The room now has a `tutorialEnabled` setting:

- Academy and First Run keep tutorial enabled by default.
- Co-op and Mirror Duel expose a Guided Tutorial checkbox on the home screen and in host controls.
- Hosts can turn the tutorial on or off before launch.
- When enabled, co-op/versus uses the same serve → spin → dash → blocks → mission → draft → team ladder.
- When disabled, the room enters free play with tutorial cards and coach overlay hidden.
- The smoke test verifies both free-play Mirror Duel and opt-in guided Boss Rush.
