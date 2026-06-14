# TT Multiplayer Roguelike 2.0 Analysis and Expansion Plan

## Implemented in this pass

The project has been pushed toward a larger-scale roguelike action architecture while remaining self-hostable from a single Node server.

### Core changes

- Maximum room size increased from 4 to 8 players.
- Competitive mode mirrors players into symmetric left/right teams around the arena midpoint.
- Lobby remains playable: every client has local single-player practice while the host configures.
- Hosting state is explicit: host label, player count, room code, invite links, public-link option, and lobby status.
- Roles give players meaningful pre-run identity: Guard, Striker, Runner, Vector, Anchor, Chaos.
- Multiplayer simulation remains server-authoritative.
- Upgrade draft increased to 5 options.
- Upgrade pool is expanded and grouped by readable categories: Team, Survival, Ball, Skill, Field, Damage, Control, Economy, Co-op, Defense, Scoring.

### Mechanical depth added

- Energy meter per player.
- Role-specific paddle height, movement, spin, and damage tuning.
- Rally/combo economy.
- Shields against misses.
- Healing, split, charge, heavy, and brick blocks.
- Portals and midpoint net hazards.
- Extra balls and split balls.
- Spin authority and spin decay modifiers.
- Pierce, magnet, tempo, vampire-rally, drill-damage, boss-bane, phase-gate, and midpoint-net upgrades.

## Big-project direction

### Game identity

The strongest direction is not merely “multiplayer Pong.” It should become a cooperative/competitive paddle-raid roguelike: a minimal-input, high-skill, social action game where the ball is a shared weapon, the arena is the enemy, and builds emerge from team composition plus upgrade drafts.

Working title options:

- That’s a Paddlin’: Relay Rift
- Paddle Raid
- Mirror Court
- Spinborne
- The Rally Engine

### Long-term mode map

1. Solo Practice
   - Training bots, shot trials, spin drills, build sandbox, challenge medals.

2. Co-op Roguelike
   - 1-8 players against escalating rooms, bosses, hazards, and team upgrades.

3. Competitive Roguelike
   - 1v1 through 4v4, mirrored teams, shared hazards, drafted modifiers, scoring races.

4. Raid Mode
   - Large boss patterns, weak points, shield phases, multi-ball pressure, team roles required.

5. Draft Duel
   - Short competitive runs where teams alternate upgrade picks.

6. Endless Rift
   - Infinite scaling, leaderboard-friendly scoring, mutator stack.

7. Daily Seed
   - Same rooms/upgrades for everyone, deterministic scoring contest.

8. Custom Lobbies
   - Host chooses ball count, speed, hazards, boss frequency, upgrade rarity, team format.

### Player roles to expand

- Guard: defensive wall, shield recovery, intercept bonuses.
- Striker: damage multiplier, weak-point damage, combo extension.
- Runner: fast saves, emergency dash, lane swapping.
- Vector: spin control, curve prediction, portal manipulation.
- Anchor: shield economy, revive prevention, stabilization.
- Chaos: high-risk random effects, duplication, ricochet mutations.
- Engineer: block conversion, field construction, hazard disabling.
- Medic: HP, shield, and recovery support.
- Captain: team overdrive, shared cooldowns, draft influence.

### Upgrade system expansion

Upgrade cards should have:

- category
- rarity
- visible tradeoff
- role synergy tags
- stack behavior
- short readable effect text
- exact stats in tooltip

Recommended upgrade categories:

- Paddle upgrades
- Ball upgrades
- Spin upgrades
- Team economy
- Defensive systems
- Field manipulation
- Hazard manipulation
- Boss damage
- Combo/scoring
- Role evolutions
- Cursed upgrades
- Synergy relics

### Boss concepts

- The Metronome: alternates safe lanes and tempo pulses.
- Split Monarch: duplicates balls and punishes careless multiball.
- The Collector: absorbs blocks into armor.
- Blackwall: moves the midpoint and compresses the arena.
- Observer: freezes balls until players change spin direction.
- The Referee: enforces alternating team hits.
- The Drill Sun: requires speed-damage build to break armor.

### Technical roadmap

Immediate next steps:

1. Split the current single-file server into modules once upload constraints allow it.
2. Add deterministic seeded rooms for testability and daily runs.
3. Add interpolation/prediction on clients for smoother multiplayer visuals.
4. Add reconnection by player token.
5. Add lobby chat or quick-ping commands.
6. Add server-side room browser for LAN games.
7. Add mobile layout polish and gamepad support.
8. Add persistent run summaries.

Professional-grade milestones:

- v0.3: robust lobbies, roles, 20+ upgrades, 3 bosses.
- v0.4: client interpolation, replayable seeded runs, clearer tutorials.
- v0.5: full co-op campaign loop, 50+ upgrades, 8 roles.
- v0.6: competitive draft mode and team balancing.
- v0.7: raid bosses and advanced hazards.
- v0.8: matchmaking-adjacent room browser for self-hosted LAN/public tunnels.
- v0.9: accessibility, mobile controls, gamepad support, spectator mode.
- v1.0: polished release candidate.
