export const Colors = {
  text: '#f5f7ff', muted: '#a6afcf', cyan: '#80f7ff', pink: '#ff5f7e',
  gold: '#ffd166', purple: '#a98cff', green: '#80ff9a', blue: '#55a7ff',
  orange: '#ff9f43', red: '#ff3864', stone: '#858da9', brick: '#f6c945'
};

export const CFG = {
  maxLevel: 50,
  pad: 14,
  paddle: {
    w: 12, h: 56, enemyH: 62, staminaDrain: 0.52, enemyDrain: 0.42,
    staminaRefill: 1.75, staminaPause: 0.46, maxAngle: Math.PI * 160 / 180,
    angleFollow: 12
  },
  ball: {
    r: 7, startSpeed: 590, minSpeed: 610, speedSoftCap: 1950, speedCompression: 0.986,
    spinSoftCap: 1.55, spinCompression: 0.82, maxSpin: 2.7, magnus: 0.72,
    spinDecay: 0.925, contactGain: 0.42, paddlePush: 0.66,
    trailMin: 16, trailMax: 58, trailLifeMax: 0.72, trailWidthBoost: 2.2,
    maxSubsteps: 9
  },
  blocks: { w: 18, h: 18, base: 11, max: 58, respawnBase: 2.7, respawnMin: 0.42 }
};

Object.prototype.clock = 0;

export const Relics = [
  ['wide', 'Giant Bat', 'B', '+22% paddle height.', m => { m.paddleScale += 0.22; }],
  ['boots', 'Greased Boots', 'V', '+18% paddle response.', m => { m.paddleSpeed *= 1.18; }],
  ['heart', 'Iron Heart', 'H', '+1 max HP and heal.', (m, g) => { m.maxHp++; g.player.hp = Math.min(m.maxHp, g.player.hp + 1); }],
  ['meteor', 'Meteor Ball', 'M', '+1 ball damage.', m => { m.damage++; }],
  ['comet', 'Comet Core', 'C', '+12% ball speed.', m => { m.ballSpeed *= 1.12; }],
  ['echo', 'Echo Orb', 'E', '+1 extra ball each level.', m => { m.extraBalls++; }],
  ['gyro', 'Gyro Grip', 'G', '+40% spin power.', m => { m.spinPower *= 1.4; }],
  ['shield', 'Glass Aegis', 'A', '+1 shield.', m => { m.shield++; }],
  ['luck', 'Lucky Edge', 'L', '+12% critical goal chance.', m => { m.crit += 0.12; }],
  ['combo', 'Golden Rhythm', '*', 'More combo score.', m => { m.scoreScale *= 1.15; }],
  ['phase', 'Phase Chip', '~', 'Portals and spikes are safer.', m => { m.phaseSafe = true; }],
  ['pinhole', 'Double Slit', '||', 'More pinhole ball splitting.', m => { m.pinholeChance += 0.18; }],
  ['entangle', 'Entanglement Coil', '8', 'Entangled balls synchronize harder.', m => { m.entanglePower *= 1.35; }],
  ['collapse', 'Observer Lens', 'O', 'Wave collapse pays more.', m => { m.collapseBonus += 90; }],
  ['worm', 'Wormhole Key', 'W', 'Portals boost predictably.', m => { m.portalMastery = true; }],
  ['gravity', 'Gravity Well', '@', 'Balls bend toward gravity blocks.', m => { m.gravityWell += 0.22; }],
  ['bossbane', 'Boss Fork', 'F', '+1 damage vs bosses.', m => { m.bossBane++; }],
  ['afterimage', 'Photon Afterimage', '=', 'Longer photon trails.', m => { m.trailPower *= 1.25; }]
].map(([id, name, icon, desc, apply]) => ({ id, name, icon, desc, apply }));
