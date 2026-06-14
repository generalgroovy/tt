export const ARENA = Object.freeze({ width: 1600, height: 900, midX: 800 });
export const TICK_HZ = 30;
export const MAX_PLAYERS = 8;

export const ROLES = Object.freeze({
  guard: { label: 'Guard', height: 136, speed: 0.92, spin: 0.9, power: 1, trait: 'broad defensive wall; passive shield charge' },
  striker: { label: 'Striker', height: 94, speed: 1.06, spin: 1.0, power: 1.35, trait: 'small target; high goal and boss damage' },
  runner: { label: 'Runner', height: 92, speed: 1.42, spin: 1.0, power: 0.96, trait: 'fastest role; emergency saves' },
  vector: { label: 'Vector', height: 106, speed: 1.0, spin: 1.48, power: 0.92, trait: 'curve control and portal mastery' },
  anchor: { label: 'Anchor', height: 122, speed: 0.82, spin: 0.96, power: 1, trait: 'slow stabilizer; converts energy into shields' },
  chaos: { label: 'Chaos', height: 98, speed: 1.08, spin: 1.28, power: 1.08, trait: 'volatile split and ricochet pressure' }
});

export const UPGRADE_POOL = Object.freeze([
  { id: 'wide', name: 'Giant Bats', group: 'Team', desc: '+14 paddle height for all players.', effect: room => { for (const p of room.players.values()) p.height = Math.min(220, p.height + 14); } },
  { id: 'heart', name: 'Shared Heart', group: 'Survival', desc: '+1 max HP; heal 2 HP.', effect: room => { room.maxHp = Math.min(24, room.maxHp + 1); room.hp = Math.min(room.maxHp, room.hp + 2); } },
  { id: 'echo', name: 'Echo Ball', group: 'Ball', desc: 'Add one extra live ball at round start.', effect: room => { room.mods.extraBalls = Math.min(5, room.mods.extraBalls + 1); } },
  { id: 'gyro', name: 'Gyro Grip', group: 'Skill', desc: '+22% spin authority.', effect: room => { room.mods.spin *= 1.22; } },
  { id: 'brake', name: 'Emergency Brake', group: 'Safety', desc: 'Softer ball speed; recover 1 HP.', effect: room => { room.mods.speed *= 0.92; room.hp = Math.min(room.maxHp, room.hp + 1); } },
  { id: 'pierce', name: 'Piercing Line', group: 'Damage', desc: 'Block chains pierce and score extra.', effect: room => { room.mods.pierce += 1; } },
  { id: 'magnet', name: 'Magnet Rails', group: 'Control', desc: 'High-spin balls bend harder near midline.', effect: room => { room.mods.magnet += 0.3; } },
  { id: 'battery', name: 'Team Battery', group: 'Economy', desc: 'Paddle hits charge energy faster.', effect: room => { room.mods.chargeRate *= 1.35; } },
  { id: 'mirror', name: 'Mirror Relay', group: 'Co-op', desc: 'Mirrored teammate positions gain assist paddles.', effect: room => { room.mods.mirrorAssist = true; } },
  { id: 'forge', name: 'Block Forge', group: 'Field', desc: 'More reward blocks, fewer dead bricks.', effect: room => { room.mods.forge += 1; } },
  { id: 'shield', name: 'Anchor Shield', group: 'Survival', desc: '+2 shared shields against misses.', effect: room => { room.shields += 2; } },
  { id: 'splitter', name: 'Clean Splitter', group: 'Ball', desc: 'Split blocks create safer copies.', effect: room => { room.mods.splitter += 1; } },
  { id: 'combo', name: 'Combo Lattice', group: 'Scoring', desc: 'Long rallies multiply score and damage.', effect: room => { room.mods.combo += 0.18; } },
  { id: 'bossbane', name: 'Boss Bane', group: 'Damage', desc: '+1 damage to elite/boss levels.', effect: room => { room.mods.bossBane += 1; } },
  { id: 'phase', name: 'Phase Gate', group: 'Field', desc: 'Adds controlled portals after level 4.', effect: room => { room.mods.phase += 1; } },
  { id: 'net', name: 'Midpoint Net', group: 'Defense', desc: 'Central rebound net during pressure.', effect: room => { room.mods.midNet += 1; } },
  { id: 'tempo', name: 'Tempo Sync', group: 'Team', desc: 'Mirrored motion grants extra speed.', effect: room => { room.mods.tempo += 0.25; } },
  { id: 'vamp', name: 'Vampire Rally', group: 'Survival', desc: 'Every 18 paddle hits heals 1 HP.', effect: room => { room.mods.vamp += 1; } },
  { id: 'drill', name: 'Drill Core', group: 'Damage', desc: 'Speed increases ball damage.', effect: room => { room.mods.drill += 0.25; } },
  { id: 'calm', name: 'Calm Hands', group: 'Skill', desc: 'Less spin decay and wall chaos.', effect: room => { room.mods.calm += 1; } },
  { id: 'aegis', name: 'Aegis Loop', group: 'Defense', desc: 'First miss each level is absorbed.', effect: room => { room.mods.levelAegis += 1; room.shields += 1; } },
  { id: 'overdrive', name: 'Overdrive Link', group: 'Economy', desc: 'Full energy adds shot speed.', effect: room => { room.mods.overdrive += 1; } },
  { id: 'relay', name: 'Relay Contract', group: 'Team', desc: 'Alternating player hits add damage.', effect: room => { room.mods.relay += 1; } },
  { id: 'garden', name: 'Heal Garden', group: 'Survival', desc: 'More heal blocks spawn.', effect: room => { room.mods.healBias += 1; } }
]);
