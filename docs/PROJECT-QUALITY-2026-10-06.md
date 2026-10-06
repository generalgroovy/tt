# Quantum Pong quality iteration — 6 October 2026

## Scope and plan

Preserve the browser edition on `codex/quantum-pong-refinement` (baseline `3edd5e9`). `tt/main` is a different, retired portfolio project and must not change.

The player should understand move → aim → serve, discover a usable upgrade after a round, and improve at contact position, spin and route planning. Existing action-driven practice remains optional and free of score/health penalties.

Code inspection found repeated spin discharge without contact, boss windups advancing while paused, stale upgrade IDs, upgrade cards outside narrow canvases, and unimplemented benefits in some upgrade descriptions. This iteration will fix those concrete failures, offer a short serve direction preview, and show accessible upgrade choices with their actual changes. Advanced upgrades must have tested effects; capped choices must not waste a reward.

Acceptance: actual contact releases spin once; pause freezes simulation; high-speed paddle/block sweeps work; level/practice transitions invalidate stale actions; offered upgrades change the build; all three choices are reachable by touch/keyboard at 320/390/1366px. Run model tests, author CI browser interactions, inspect screenshots and revise findings before handoff. Human difficulty/fun, physical phone ergonomics and all 100 levels remain separate playtesting.

## Evidence

- Baseline: 10 Node tests passed locally.
- Candidate runtime `c2598aa`: 24 Node tests passed locally and in [GitHub CI 37541171978](https://github.com/generalgroovy/tt/actions/runs/37541171978).
- The same CI run exercised the shipped application in Chromium at 1366×768, 390×844 and 320×844: real practice movement/angle/spin/serve, paused Space inertness, and actual native upgrade selection by digit/Space/Enter without accidentally serving. A clearly marked fixture finishes a round to reach the upgrade screen. All three widths also reached the last upgrade at 420px viewport height, with no page overflow or console/page errors.
- CUA on Windows: actual 390×844 practice movement, tilt, latched spin, serve, completed lesson and pause passed with no console errors. 320×800 controls were visible and usable. The first local 320px reload retained an older cached practice label; the CI's fresh contexts show the correct Practice label. CI screenshots are retained under `docs/evidence/2026-10-06/`.
- Screenshot review found gameplay text showing behind upgrade headings. The final revision uses an opaque upgrade backdrop, percentage/seconds deltas and less redundant practice text. It also expands pause evidence to include a moving block and wall cue and checks exact pointer movement at full/empty stamina. Final CI: pending.
- Test harness/CI structure follows the official [Playwright CI guidance](https://playwright.dev/docs/ci-intro); local browser interaction used CUA only.

## Implemented behavior

- One real paddle contact consumes a charge once; the two redundant per-frame spin wrappers are gone. Serve preview shows only the initial curve and stops at an obstacle.
- Swept block contacts use rounded circle geometry and travel order; high-speed enemy-paddle contacts return correctly. Legitimate block reflections survive anti-orbit damping. Walls follow the actual late-game arena. Step time is capped at 24ms; extreme flick speeds cap at 4200px/s. These are bounded correctness checks, not a performance benchmark.
- Pausing freezes boss windup, block motion, effects and clock. Round-clear delay belongs to the simulation, preventing a previous run's delayed callback from opening a draft. Replacing a ball collection during a score or practice miss cannot continue through stale entries. A cleared round cannot auto-serve.
- A single live relic catalogue defines unlocks. Drafts prefer available Control/Power/Survival families; exhausted pools terminate and capped no-op rewards disappear. Native, scrollable cards own focus and stale-action protection. A choice returns to a held serve.
- Stamina saving, combo duration, wall braking, spin-triggered block slowing and block speed boost now affect gameplay. Stamina affects return power while preserving direct pointer movement. Boss damage applies once; mastered portals remove random deflection. Descriptions no longer promise unused modifiers.
- Practice shows a plain state label and a single action instruction; advanced explanations stay in Info. No save schema changed.

## Limits and parent release

Human difficulty/fun, physical touch ergonomics, all 100 levels and broad upgrade balance still need playtesting. Browser test width is not hardware performance proof. No public deployment was performed by this owner.

Parent should package the reviewed branch snapshot into the existing Quantum Pong portfolio embed. Do not push or merge this browser tree into `tt/main` (protected remote baseline `f777e15b078348e3521b87863979939060ea065f`) or publish retired Relay Rift. Runtime includes `index.html` and all `src/` JavaScript/CSS files; preserve the four new runtime modules when packaging.
