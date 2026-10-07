# Complete keyboard practice

Baseline: `f6db3b04652de1d3848ee87a2072a86eab9b77f2` on `codex/quantum-pong-refinement`. The separate Relay Rift `main` stays untouched.

Practice previously asked the player to move the paddle with a pointer or finger, while keyboard arrows only duplicated angle controls. Arrow keys now move the paddle in both dimensions at a normalized diagonal speed and stay within the player's zone. Releasing the keys keeps the position; moving the pointer resumes pointer control. A/D and Q/E still rotate and load spin; W/S still adjusts the face angle. Movement, tilt, spin and serve can therefore be learned without switching input devices.

Pause, window/canvas blur and native control focus stop held movement. Repeated key events cannot reactivate keys held across pause; a fresh press is needed. On-screen controls, upgrades, collision rules, saved records and the four-step practice sequence remain available.

Fresh verification: 30 local model/input/render tests passed, including the fully composed production game, diagonal speed and bounds, opposing keys, release/pointer handoff, independent angle/spin, complete keyboard practice and pause/repeat behavior. Independent flow_b source review found no blocker. Candidate browser CI and root rendered acceptance are recorded in the final release section once complete.
