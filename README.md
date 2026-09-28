# Quantum Pong / That's a Paddlin'

The preserved browser edition of `tt`: pointer-controlled paddle combat with spin, branching balls, quantum-inspired obstacles and upgrade choices. This branch is **`codex/quantum-pong-refinement`**. Current `tt/main` contains the separate Relay Rift desktop game; do not merge this browser tree over it.

## Run

Clone or check out this branch, then serve its root with Python 3:

```sh
python -m http.server 8080
```

Open `http://localhost:8080` in a modern browser. HTTP is required for JavaScript modules. There is no npm installation or multiplayer service.

## Controls

| Input | Action |
| --- | --- |
| Mouse or touch | Position the paddle inside the left side of the arena |
| Click or Space | Start / serve |
| A/D or arrows | Rotate the paddle and load spin |
| W/S | Adjust the face angle |
| Shift | Rotate faster |
| L / X | Lock angle / return to movement angle |
| 1 / 2 / 3 | Choose an offered upgrade |
| P | Pause/resume |
| R | Restart the run |

Losing window focus pauses an active game. Resume with the **Resume** button, P, or a click on the canvas. Holding P does not repeatedly toggle pause. Pointer/touch play works for positioning and serving; advanced angle controls require a keyboard.

The active overhaul starts with introductory stages at level -5 and continues to level 100. Older base-class comments or renderer text can describe the earlier 50-level game; the loaded overhaul defines the active progression.

## Saved data

Only the best score (`thats-a-paddlin-best`) and skip-intro preference (`tap-skip-intro`) are stored in this browser. Current runs are not saved and there is no cloud sync. If storage is blocked, full or corrupt, play continues with an in-memory score and safe defaults; reload may lose those preferences.

## Development

Use a Node.js version with the built-in test runner:

```sh
node --test tests/*.test.cjs
```

Tests cover pause/button behavior and blocked/corrupt storage. They do not prove full level balance, collision quality, touch ergonomics or rendered performance.

`index.html` loads `src/main.js`, then the playability and presentation patches. `src/app.js` remains a compatibility entry that imports the same bootstrap instead of duplicating handlers; it also retains its historical run-start repair patch. Do not load both entries as separate copies. The code still uses prototype patches; keep their order explicit when changing the entry point.

Manual smoke check: start, serve, move and rotate, pause/resume, restart, and choose an upgrade. Repeat with browser storage disabled. Refresh ends the current run.
