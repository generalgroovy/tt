# Quantum Pong UX iteration — 7 October 2026

The title screen now puts Practice beside the start action and explains its purpose in the button label. Four numbered lessons still advance only from actual movement, tilt, spin charge and serve. A compact control status explains your serve, the opponent's serve, rallies and pause without adding another panel.

Tilt, Auto angle, spin and Pause/Resume preserve native-button focus, allowing repeated keyboard adjustments. Starting play and serving deliberately return focus to the arena. The focused arena has a visible inset outline. Serve's accessible description points to the current status.

Preserved: collision and scoring rules, practice health, progression, stamina, spin, rewards, boss behavior and saved data. Short landscape now gives the native controls their own space instead of extending the arena behind them. The browser edition remains on `codex/quantum-pong-refinement`; `tt/main` is protected.

## Review and correction

- Independent reviewer ux_fighter reproduced an incorrect rally promise using
  the composed runtime: ordinary misses cost health and automatically serve the
  next ball. Copy now correctly says to return the ball to protect health.
- Root removed the duplicate central Resume while native paddle controls are
  visible, retaining their single Pause/Resume route.
- Root's short-screen inspection found the arena behind controls and a serve
  caption over the health HUD. The arena minimum height is now 180 px; on the
  tested 844 × 420 screen it is 196 px tall. Redundant player and opponent serve
  captions are hidden below 300 px arena height; the native status and Serve
  action remain visible. The review caught and corrected the opponent caption
  too, with a regression for both captions that also verifies health stays drawn.

## Evidence

- Base: `0387279e64180d5c93b4f46f3540321adb468c14`.
- Final runtime: `4f881b2dee1040de827492c4ecc9451f8fbf2503`.
- Local `node --test tests/*.test.cjs`: **26/26 pass**, including actual composed
  physics and input tests, control guidance and the short HUD rendering check.
  `git diff --check` passes.
- Browser CI covers 1366 × 768, 844 × 420, 390 × 844 and 320 × 844. It asserts
  arena/control separation, repeated keyboard angle changes, retained spin/pause
  focus, full practice completion, pause freezing, serve/rally state and upgrade
  access. [Final CI run](https://github.com/generalgroovy/tt/actions/runs/37605511468)
  **passes** for the exact final runtime. Its machine-readable
  [browser result](evidence/ux-2026-10-07/ci-results.json) is retained here.
- Root CUA completed the real movement/angle/spin/serve sequence and checked
  retained native focus at desktop, with narrow layout verification at 390 px.
  At 844 × 420 it observed canvas bottom 248 px exactly meeting controls top
  248 px, clear controls and hints, and no horizontal overflow. These screenshots
  precede only the opponent-caption guard; that guard does not change practice:
  [desktop](evidence/ux-2026-10-07/quantum-after-desktop.png),
  [phone](evidence/ux-2026-10-07/quantum-after-mobile.png),
  [short landscape](evidence/ux-2026-10-07/quantum-after-landscape.png).

## Limits

CI and CUA do not establish subjective enjoyment, competitive balance across all
levels, physical-phone ergonomics, audio quality or rendered performance. No
saved data is migrated. Root owns the portfolio snapshot, publication and exact
public-byte verification; this browser branch must not replace `tt/main`.
