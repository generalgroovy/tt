# Quantum Pong

The preserved browser edition of `tt`: paddle combat with spin, branching balls, quantum-inspired obstacles and upgrade choices. This branch is **`codex/quantum-pong-refinement`**. Current `tt/main` contains the separate Relay Rift desktop game; do not merge this browser tree over it.

## Run

Clone or check out this branch, then serve its root with Python 3:

```sh
python -m http.server 8080
```

Open `http://localhost:8080` in a modern browser. HTTP is required for JavaScript modules. There is no npm installation or multiplayer service.

## Controls

| Input | Action |
| --- | --- |
| Arrow keys, mouse or touch | Position the paddle inside the left side of the arena |
| Tap, click or Space | Start / serve |
| A/D (or Q/E) | Rotate the paddle and load spin |
| W/S | Adjust the face angle |
| Shift | Rotate faster |
| L / X | Lock angle / return to movement angle |
| 1 / 2 / 3 | Choose an offered upgrade |
| P | Pause/resume |
| R | Restart the run |

Arrow keys move in both dimensions; diagonal movement has the same speed as straight movement. Release to stay in place. Moving the pointer takes over again. Arrows previously duplicated angle controls; use A/D or Q/E to rotate, and W/S for fine angle adjustment. You can complete the four practice steps entirely with the keyboard.

Losing window focus pauses an active game. Resume with the **Resume** button, P, or a click on the canvas. Holding P does not repeatedly toggle pause. Focused buttons keep native keyboard activation; browser modifier shortcuts do not trigger game actions. Tilt, spin and Pause/Resume controls retain keyboard focus for repeated adjustments; starting play and serving focus the arena. The on-screen tilt buttons change angle in 15-degree steps. **Auto angle** follows motion again. **Backspin / No spin / Topspin** latch the chosen charge, so touch play does not require holding two controls together. A short status explains whose serve it is, an active rally, or pause. Physical-phone ergonomics still need playtesting.

The run begins with five training rounds, then continues through level 100. Bosses appear at level 0 and every ten levels. A boss first receives your attacks, then briefly telegraphs its own serve. Pause freezes the windup and every simulation timer.

The dotted serve guide shows the opening direction and spin curve, stopping before a wall or block. It does not predict the whole rally. Contact position, paddle angle and motion shape the return. Quick movement spends stamina; an exhausted contact loses up to 18% power, while the paddle still follows your pointer exactly. Rest, or use clean-hit upgrades, to recover stamina.

After a round, choose a **Control**, **Power** or **Survival** reward. Native cards show both the benefit and the actual change to your build; use touch, Enter/Space, or 1/2/3 even while a card has keyboard focus. Cards scroll on short screens. Simple rewards arrive first; advanced splits, entanglement, portals and field effects unlock later. Capped or already-owned single-use rewards are omitted. Quantum terminology describes playful game rules, not a scientific simulation.

## Practice

Choose **Practice · learn controls** beside the title-screen start action. Move the paddle, tilt it, charge spin and serve: four numbered instructions advance from the action actually performed. Practice has no blocks, unlimited health and no best-score writes; scoring past the opponent returns to a free serve. **Start game** exits practice into a clean normal run. The Info panel holds full controls and pauses active play when opened.

## Saved data

Only the best score (`thats-a-paddlin-best`) and skip-intro preference (`tap-skip-intro`) are stored in this browser. Current runs are not saved and there is no cloud sync. If storage is blocked, full or corrupt, play continues with an in-memory score and safe defaults; reload may lose those preferences.

## Development

Use **Node.js 22 or newer** (tested on Node 22 in CI). The model harness imports the shipped ES modules using Node's module syntax detection:

```sh
node --test tests/*.test.cjs
```

The 30 model/input/rendering tests cover true-contact spin discharge, swept paddle/block contacts, nearest-block ordering, rounded corner misses, arena walls, bounded time/speed, pause and boss timers, multiball transitions, meaningful upgrade effects, capped choices, practice, normalized keyboard movement, pointer handoff, control guidance, short-screen HUD and storage. The GitHub quality workflow also runs Chromium at 1366 × 768, 844 × 420, 390 × 844 and 320 × 844, including arena/control separation, short-height upgrade access and keyboard focus/serve isolation. It installs test dependencies only in CI; no package installation is needed to play. See [quality evidence](docs/PROJECT-QUALITY-2026-10-06.md), [UX iteration](docs/PROJECT-UX-2026-10-07.md) and [keyboard flow](docs/PROJECT-UX-FLOW-2026-10-07.md). These checks do not prove full level balance, physical phone ergonomics or rendered performance.

`src/main.js` imports the overhaul, playability, presentation and skill-depth patches in explicit order, then attaches practice and native upgrade controllers. The HTML has one entry script. `src/upgrade-model.js` owns unlocks, capped rewards and previews; `src/collision.js` owns swept block geometry. `src/app.js` remains a compatibility entry with finite-state repair and the same bootstrap. Do not load both entries as separate copies. The code still uses prototype patches; the tests load them in the shipped order.

Manual smoke check: start, serve, move and rotate, pause/resume, restart, and choose an upgrade. Repeat with browser storage disabled. Refresh ends the current run.
