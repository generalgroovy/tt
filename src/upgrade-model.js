// One catalogue for unlocks, useful-choice filtering and the visible build changes.
export const UPGRADE_RULES = {
  wide: [0, 'Control'], boots: [0, 'Control'], heart: [0, 'Survival'], phaseguard: [0, 'Survival'],
  meteor: [0, 'Power'], comet: [0, 'Power'],
  echo: [5, 'Power'], gyro: [5, 'Control'], noether: [5, 'Control'], casimir: [5, 'Control'],
  pauli: [5, 'Survival'], coherence: [5, 'Power'], after: [5, 'Control'], shear: [5, 'Control'],
  feynman: [18, 'Power'], bias: [18, 'Power'], phase: [18, 'Survival'], pinhole: [18, 'Power'],
  bell: [18, 'Control'], metric: [18, 'Control'], field: [18, 'Control'], renorm: [18, 'Power']
};
const REPEAT = new Set(['heart', 'phaseguard', 'meteor', 'comet']);
const CAPS = { paddleScale:1.95, ballSpeed:2.15, spinPower:2.6, damage:6, shield:6,
  extraBalls:4, maxBalls:5, scoreScale:2.35, crit:.48, pinholeChance:.62,
  entanglePower:2.25, gravityWell:1.25, phaseShields:6, maxHp:12 };
const NAMES = { paddleScale:'Paddle size', ballSpeed:'Serve speed', spinPower:'Spin strength',
  damage:'Damage', extraBalls:'Extra serve balls', maxBalls:'Extra ball capacity', maxHp:'Maximum health',
  phaseShields:'Miss protection', staminaSave:'Stamina saved', blockKick:'Block boost',
  trailPower:'Trail length', pathFork:'Split chance', centerRefund:'Clean-hit refund', wallBrake:'Wall braking',
  repulsor:'Contact boost', comboWindow:'Combo window', scoreScale:'Score multiplier',
  crit:'Critical chance', collapseBonus:'Collapse score', phaseSafe:'Safer hazards',
  pinholeChance:'Pinhole split chance', entanglePower:'Entanglement strength', portalMastery:'Steady portals',
  gravityWell:'Gravity strength', bossBane:'Boss damage', shear:'Block slowing' };
const PERCENT=new Set(['paddleScale','ballSpeed','spinPower','staminaSave','blockKick','trailPower',
  'pathFork','wallBrake','repulsor','scoreScale','crit','pinholeChance','entanglePower']);

export function capMods(mods) {
  for (const [key, limit] of Object.entries(CAPS)) if(Number.isFinite(mods[key])) mods[key]=Math.min(limit,mods[key]);
  return mods;
}

export function previewUpgrade(relic, game) {
  const mods={...game.mods}, player={...game.player};
  relic.apply(mods,{player});capMods(mods);player.hp=Math.min(player.hp,mods.maxHp);
  const changes=[];
  for(const [key,value] of Object.entries(mods)) {
    if(value===game.mods[key] || !NAMES[key])continue;
    const format=v=>key==='shear'?(v?'3s':'off'):typeof v==='boolean'?(v?'on':'off'):PERCENT.has(key)?Math.round(v*100)+'%'
      :Number(Number(v).toFixed(2)).toString()+(key==='comboWindow'?'s':'');
    changes.push(`${NAMES[key]} ${format(game.mods[key])} → ${format(value)}`);
  }
  if(player.hp!==game.player.hp)changes.push(`Health ${game.player.hp} → ${Math.min(player.hp,mods.maxHp)}`);
  return {mods,player,changes};
}

export function draftUpgrades(relics,game,random=Math.random) {
  // Include at least one choice from each available family before filling slots.
  const pool=relics.filter(r=>UPGRADE_RULES[r.id] && Math.max(0,game.level)>=UPGRADE_RULES[r.id][0]
    && (!game.relics.includes(r.id)||REPEAT.has(r.id)) && previewUpgrade(r,game).changes.length);
  const result=[];
  const take=candidates=>{
    if(!candidates.length)return;
    const chosen=candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))];
    result.push(chosen);pool.splice(pool.indexOf(chosen),1);
  };
  for(const family of ['Control','Power','Survival'])take(pool.filter(r=>UPGRADE_RULES[r.id][1]===family));
  while(result.length<3 && pool.length)take(pool);
  return result;
}
