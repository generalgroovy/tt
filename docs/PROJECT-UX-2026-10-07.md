# Quantum Pong UX iteration — 7 October 2026

The title screen now puts Practice beside the start action and explains its purpose in the button label. Four numbered lessons still advance only from actual movement, tilt, spin charge and serve. A compact control status explains your serve, the opponent's serve, rallies and pause without adding another panel.

Tilt, Auto angle, spin and Pause/Resume preserve native-button focus, allowing repeated keyboard adjustments. Starting play and serving deliberately return focus to the arena. The focused arena has a visible inset outline. Serve's accessible description points to the current status.

Preserved: all physics, collisions, score, practice health, progression, stamina, spin, rewards, boss behavior and saved data. The browser edition remains on codex/quantum-pong-refinement; tt/main is protected.

Local validation: 25 model/input tests, JavaScript and diff checks passed. Browser CI adds repeated native-angle activation, retained spin/pause focus, pause guidance and visible serve/rally state to existing full practice, pause and upgrade journeys. Independent review and root rendered checks are recorded separately in the parent project release evidence. CI result and final acceptance will be added after the candidate run.
