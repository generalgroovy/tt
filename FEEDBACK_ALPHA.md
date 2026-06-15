# Simulated Alpha Feedback Register

## Highest-priority feedback addressed

1. Host confidence was too low.
   - Resolution: visible ready strip, status feed, room code, invite links, player count.

2. Start transition was abrupt.
   - Resolution: countdown phase before synchronized play.

3. Players had no ready signal.
   - Resolution: ready toggle and ready count.

4. Host could change settings after players were ready.
   - Resolution: readiness resets after configuration changes.

5. Versus team layout could become unclear after mode switching.
   - Resolution: switching to versus redistributes left/right teams.

6. Opening play could feel too chaotic.
   - Resolution: lower launch speed and hard speed cap.

7. Performance could suffer on weaker laptops.
   - Resolution: visual quality selector.

8. Failure was hard to interpret.
   - Resolution: diagnostics panel with last event and run statistics.

## Feedback intentionally deferred

- Audio, because it needs a coherent sound palette rather than placeholder bleeps.
- Reconnect tokens, because they need identity/session design.
- Gamepad support, because it needs rebinding UI.
- Boss authoring, because it should be implemented after deterministic room seeds.
