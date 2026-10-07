# Complete keyboard practice

Baseline: `f6db3b04652de1d3848ee87a2072a86eab9b77f2` on `codex/quantum-pong-refinement`. The separate Relay Rift `main` stays untouched.

Practice previously asked the player to move the paddle with a pointer or finger, while keyboard arrows only duplicated angle controls. Arrow keys now move the paddle in both dimensions at a normalized diagonal speed and stay within the player's zone. Releasing the keys keeps the position; moving the pointer resumes pointer control. A/D and Q/E still rotate and load spin; W/S still adjusts the face angle. Movement, tilt, spin and serve can therefore be learned without switching input devices.

Pause, window/canvas blur and native control focus stop held movement. Repeated key events cannot reactivate keys held across pause; a fresh press is needed. On-screen controls, upgrades, collision rules, saved records and the four-step practice sequence remain available.

Runtime: `26cefedb4990aa8783438c4db1e43b5de814c33e`.

Fresh verification: 30 local model/input/render tests passed, including the fully composed production game, diagonal speed and bounds, opposing keys, release/pointer handoff, independent angle/spin, complete keyboard practice and pause/repeat behavior. Independent flow_b source review found no blocker. [Candidate CI](https://github.com/generalgroovy/tt/actions/runs/37610319885) passed the same model tests and Chromium checks at four viewports.

Root browser acceptance used real held arrow-key input to complete movement, D to tilt and charge spin, then Space to serve. The guidance reached “Ready. Try different angles and spin; misses cost no health.” P paused and resumed without losing practice completion. Screenshot: shared iteration evidence `quantum-keyboard-ready.png`. A quick tap sent within one animation frame may not move the continuous-control paddle; sustained key input is exercised in both browser CI and the root check.

Publication through the portfolio is tracked separately in the shared release report. These checks establish input behavior and rendered usability, not competitive balance or physical-device performance.
