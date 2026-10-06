const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadGame}=require('./game-harness.cjs');

test('every live relic has a valid unlock and actual effect; early drafts offer distinct strategies',async()=>{
  const g=await loadGame();const {Relics}=await import('../src/config.js');
  const {UPGRADE_RULES,previewUpgrade,draftUpgrades}=await import('../src/upgrade-model.js');
  assert.equal(Object.keys(UPGRADE_RULES).length,Relics.length);
  for(const relic of Relics){assert.ok(UPGRADE_RULES[relic.id]);assert.ok(previewUpgrade(relic,g).changes.length,relic.id);}
  const draft=draftUpgrades(Relics,g,()=>0);assert.equal(draft.length,3);
  assert.deepEqual(draft.map(r=>UPGRADE_RULES[r.id][1]),['Control','Power','Survival']);
  assert.equal(new Set(draft).size,3);
});

test('capped rewards are omitted, exhausted small pools terminate, reward preview is side-effect free',async()=>{
  const g=await loadGame();const {Relics}=await import('../src/config.js');
  const {previewUpgrade,draftUpgrades}=await import('../src/upgrade-model.js');
  g.mods.maxHp=12;g.player.hp=12;g.mods.phaseShields=6;
  const heart=Relics.find(r=>r.id==='heart'),phase=Relics.find(r=>r.id==='phaseguard');
  assert.equal(previewUpgrade(heart,g).changes.length,0);
  assert.deepEqual(draftUpgrades([heart,phase],g),[]);
  const before=JSON.stringify(g);for(const relic of Relics)previewUpgrade(relic,g);assert.equal(JSON.stringify(g),before);
  assert.equal(draftUpgrades([Relics[0]],g).length,1);
});

test('stale upgrade action cannot apply after a choice, restart or practice transition',async()=>{
  const g=await loadGame();g.createDraft();const level=g.level;g.chooseRelic(0);g.chooseRelic(1);
  assert.equal(g.level,level+1);assert.equal(g.relics.length,1);assert.equal(g.freeServe,true);
  g.createDraft();g.newRun();g.chooseRelic(0);assert.equal(g.relics.length,0);assert.equal(g.level,-5);
  const {installPractice}=await import('../src/practice-controls.js');const practice=installPractice(g);
  g.createDraft();practice.start();g.chooseRelic(0);assert.equal(g.relics.length,0);assert.equal(practice.active,true);
});
