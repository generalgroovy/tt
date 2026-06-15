export const VERSION = '2.6.0-zero-dependency-alpha';
export const ARENA = Object.freeze({ width: 1600, height: 900, midX: 800 });
export const TICK_HZ = 30;
export const MAX_PLAYERS = 8;

export const PRESETS = Object.freeze({
  academy: { label: 'Academy Path', mode: 'coop', maxPlayers: 3, difficulty: 1, targetLevel: 7, bots: 2, hint: 'Release-prep tutorial ladder: serve, spin, dash, blocks, mission, draft, team.' },
  firstRun: { label: 'First Run', mode: 'coop', maxPlayers: 4, difficulty: 1, targetLevel: 6, bots: 3, hint: 'Guided co-op with bots and gentle pacing.' },
  quickRaid: { label: 'Quick Raid', mode: 'coop', maxPlayers: 6, difficulty: 2, targetLevel: 12, bots: 5, hint: 'Fast plug-and-play co-op run.' },
  mirrorDuel: { label: 'Mirror Duel', mode: 'versus', maxPlayers: 8, difficulty: 3, targetLevel: 12, bots: 7, hint: '4v4 mirrored teams with bots.' },
  chaosLab: { label: 'Chaos Lab', mode: 'versus', maxPlayers: 8, difficulty: 5, targetLevel: 18, bots: 7, hint: 'Hazards, multiball, and volatile drafts.' },
  riftSprint: { label: 'Rift Sprint', mode: 'coop', maxPlayers: 4, difficulty: 4, targetLevel: 8, bots: 3, hint: 'Short high-score run with mission objectives.' },
  bossRush: { label: 'Boss Rush', mode: 'coop', maxPlayers: 6, difficulty: 6, targetLevel: 15, bots: 5, hint: 'Elite cores, shields, and heavy hazards.' }
});

export const ROLES = Object.freeze({
  guard: { label: 'Guard', height: 136, speed: 0.92, spin: 0.9, power: 1, trait: 'wide defensive wall; shield support' },
  striker: { label: 'Striker', height: 94, speed: 1.06, spin: 1.0, power: 1.35, trait: 'small target; high damage' },
  runner: { label: 'Runner', height: 92, speed: 1.42, spin: 1.0, power: 0.96, trait: 'fast saves and lane recovery' },
  vector: { label: 'Vector', height: 106, speed: 1.0, spin: 1.48, power: 0.92, trait: 'curve control and portals' },
  anchor: { label: 'Anchor', height: 122, speed: 0.82, spin: 0.96, power: 1, trait: 'slow stabilizer; shield economy' },
  chaos: { label: 'Chaos', height: 98, speed: 1.08, spin: 1.28, power: 1.08, trait: 'volatile split and ricochet pressure' },
  medic: { label: 'Medic', height: 112, speed: 1.0, spin: 0.9, power: 0.9, trait: 'healing block and HP support' },
  engineer: { label: 'Engineer', height: 108, speed: 0.98, spin: 1.05, power: 1, trait: 'field control and charge blocks' },
  phantom: { label: 'Phantom', height: 96, speed: 1.16, spin: 1.22, power: 1.05, trait: 'dash-heavy rift duelist' },
  warden: { label: 'Warden', height: 128, speed: 0.88, spin: 1.05, power: 1.12, trait: 'boss-control bruiser' }
});

export const BOT_NAMES = Object.freeze(['Vega','Nyx','Orbit','Mako','Echo','Rook','Sol','Ion','Glyph','Kite','Nova','Hex']);

export const UPGRADE_POOL = Object.freeze([
  { id: 'wide', name: 'Giant Bats', group: 'Team', desc: '+14 paddle height for all players.', effect: r => { for (const p of r.players.values()) p.height = Math.min(220, p.height + 14); } },
  { id: 'heart', name: 'Shared Heart', group: 'Survival', desc: '+1 max HP; heal 2 HP.', effect: r => { r.maxHp = Math.min(24, r.maxHp + 1); r.hp = Math.min(r.maxHp, r.hp + 2); } },
  { id: 'echo', name: 'Echo Ball', group: 'Ball', desc: 'Add one extra live ball at round start.', effect: r => { r.mods.extraBalls = Math.min(5, r.mods.extraBalls + 1); } },
  { id: 'gyro', name: 'Gyro Grip', group: 'Skill', desc: '+22% spin authority.', effect: r => { r.mods.spin *= 1.22; } },
  { id: 'brake', name: 'Emergency Brake', group: 'Safety', desc: 'Softer ball speed; recover 1 HP.', effect: r => { r.mods.speed *= 0.92; r.hp = Math.min(r.maxHp, r.hp + 1); } },
  { id: 'pierce', name: 'Piercing Line', group: 'Damage', desc: 'Block chains pierce and score extra.', effect: r => { r.mods.pierce += 1; } },
  { id: 'magnet', name: 'Magnet Rails', group: 'Control', desc: 'High-spin balls bend harder near midline.', effect: r => { r.mods.magnet += 0.3; } },
  { id: 'battery', name: 'Team Battery', group: 'Economy', desc: 'Paddle hits charge energy faster.', effect: r => { r.mods.chargeRate *= 1.35; } },
  { id: 'mirror', name: 'Mirror Relay', group: 'Co-op', desc: 'Mirrored teammate positions gain assist paddles.', effect: r => { r.mods.mirrorAssist = true; } },
  { id: 'forge', name: 'Block Forge', group: 'Field', desc: 'More reward blocks, fewer dead bricks.', effect: r => { r.mods.forge += 1; } },
  { id: 'shield', name: 'Anchor Shield', group: 'Survival', desc: '+2 shared shields against misses.', effect: r => { r.shields += 2; } },
  { id: 'splitter', name: 'Clean Splitter', group: 'Ball', desc: 'Split blocks create safer copies.', effect: r => { r.mods.splitter += 1; } },
  { id: 'combo', name: 'Combo Lattice', group: 'Scoring', desc: 'Long rallies multiply score and damage.', effect: r => { r.mods.combo += 0.18; } },
  { id: 'bossbane', name: 'Boss Bane', group: 'Damage', desc: '+1 damage to elite/boss levels.', effect: r => { r.mods.bossBane += 1; } },
  { id: 'phase', name: 'Phase Gate', group: 'Field', desc: 'Adds controlled portals after level 4.', effect: r => { r.mods.phase += 1; } },
  { id: 'net', name: 'Midpoint Net', group: 'Defense', desc: 'Central rebound net during pressure.', effect: r => { r.mods.midNet += 1; } },
  { id: 'tempo', name: 'Tempo Sync', group: 'Team', desc: 'Mirrored motion grants extra speed.', effect: r => { r.mods.tempo += 0.25; } },
  { id: 'vamp', name: 'Vampire Rally', group: 'Survival', desc: 'Every 18 paddle hits heals 1 HP.', effect: r => { r.mods.vamp += 1; } },
  { id: 'drill', name: 'Drill Core', group: 'Damage', desc: 'Speed increases ball damage.', effect: r => { r.mods.drill += 0.25; } },
  { id: 'calm', name: 'Calm Hands', group: 'Skill', desc: 'Less spin decay and wall chaos.', effect: r => { r.mods.calm += 1; } },
  { id: 'aegis', name: 'Aegis Loop', group: 'Defense', desc: 'First miss each level is absorbed.', effect: r => { r.mods.levelAegis += 1; r.shields += 1; } },
  { id: 'overdrive', name: 'Overdrive Link', group: 'Economy', desc: 'Full energy adds shot speed.', effect: r => { r.mods.overdrive += 1; } },
  { id: 'relay', name: 'Relay Contract', group: 'Team', desc: 'Alternating player hits add damage.', effect: r => { r.mods.relay += 1; } },
  { id: 'garden', name: 'Heal Garden', group: 'Survival', desc: 'More heal blocks spawn.', effect: r => { r.mods.healBias += 1; } },
  { id: 'dashcore', name: 'Dash Core', group: 'Skill', desc: 'Ability dash costs less energy.', effect: r => { r.mods.dashDiscount += 1; } },
  { id: 'botnet', name: 'Botnet Tactics', group: 'Plug-and-play', desc: 'Bot allies react faster and cover lanes better.', effect: r => { r.mods.botSkill += 0.22; } },
  { id: 'riftjack', name: 'Rift Jack', group: 'Field', desc: 'Portals award score and stabilize ball speed.', effect: r => { r.mods.riftScore += 1; } },
  { id: 'grenade', name: 'Spin Grenade', group: 'Damage', desc: 'High-spin block kills splash nearby blocks.', effect: r => { r.mods.spinSplash += 1; } },
  { id: 'missionpay', name: 'Mission Payout', group: 'Super-Alpha', desc: 'Mission completions grant +1 shield and extra score.', effect: r => { r.mods.missionPay += 1; } },
  { id: 'focusburst', name: 'Focus Burst', group: 'Skill', desc: 'Shift dash also nudges nearby balls and adds spin.', effect: r => { r.mods.focusBurst += 1; } },
  { id: 'bosscore', name: 'Boss Core Scanner', group: 'Damage', desc: 'Elite core blocks take more damage from fast balls.', effect: r => { r.mods.coreScanner += 1; } },
  { id: 'afterimage', name: 'Afterimage Guard', group: 'Defense', desc: 'Every dash briefly leaves a save window behind.', effect: r => { r.mods.afterimage += 1; } },
  { id: 'coach', name: 'Coach Signal', group: 'Learning', desc: 'Coach tips stay visible and mission rewards grant extra score.', effect: r => { r.mods.coachSignal += 1; r.mods.missionPay += 1; } },
  { id: 'stabilizer', name: 'Training Stabilizer', group: 'Learning', desc: 'Slows the first ball after every miss and adds one shield.', effect: r => { r.mods.trainingStabilizer += 1; r.shields += 1; } },
  { id: 'laneguide', name: 'Lane Guide', group: 'Team', desc: 'Bots and players recover toward lanes more intelligently.', effect: r => { r.mods.botSkill += 0.15; r.mods.tempo += 0.15; } }
]);
