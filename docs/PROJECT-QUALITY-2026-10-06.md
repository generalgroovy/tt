# Quantum Pong quality iteration — 6 October 2026

## Scope and plan

Preserve the browser edition on `codex/quantum-pong-refinement` (baseline `3edd5e9`). `tt/main` is a different, retired portfolio project and must not change.

The player should understand move → aim → serve, discover a usable upgrade after a round, and improve at contact position, spin and route planning. Existing action-driven practice remains optional and free of score/health penalties.

Code inspection found repeated spin discharge without contact, boss windups advancing while paused, stale upgrade IDs, upgrade cards outside narrow canvases, and unimplemented benefits in some upgrade descriptions. This iteration will fix those concrete failures, offer a short serve direction preview, and show accessible upgrade choices with their actual changes. Advanced upgrades must have tested effects; capped choices must not waste a reward.

Acceptance: actual contact releases spin once; pause freezes simulation; high-speed paddle/block sweeps work; level/practice transitions invalidate stale actions; offered upgrades change the build; all three choices are reachable by touch/keyboard at 320/390/1366px. Run model tests, author CI browser interactions, inspect screenshots and revise findings before handoff. Human difficulty/fun, physical phone ergonomics and all 100 levels remain separate playtesting.

## Evidence

- Baseline: 10 Node tests passed locally.
- Candidate checks: pending.
