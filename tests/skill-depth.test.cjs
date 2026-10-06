const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadGame}=require('./game-harness.cjs');

test('spin releases once on real contact, never merely because lastHit is player',async()=>{
  const g=await loadGame(),p=g.player;
  g.spinIntent=1;
  const b=g.makeBall(p.x+150,p.y,900,0,0,'player');b.prevX=b.x-10;b.prevY=b.y;
  for(let i=0;i<20;i++)g.paddleHit(b,p,true);
  assert.equal(g.spinIntent,1);assert.equal(b.spin,0);
  b.prevX=p.x+80;b.x=p.x-40;b.y=b.prevY=p.y;b.vx=-2500;
  assert.equal(g.paddleHit(b,p,true),true);
  assert.equal(g.spinIntent,0);assert.ok(b.spin>0);assert.ok(b.vx>0);
  const spin=b.spin;g.spinIntent=.8;
  g.paddleHit(b,p,true);assert.equal(g.spinIntent,.8);assert.equal(b.spin,spin);
});

test('high-speed enemy paddle crossing returns the ball and block reflections stay reflected',async()=>{
  const g=await loadGame(),p=g.enemy;
  const b=g.makeBall(p.x+50,p.y,4000,0,0,'player');b.prevX=p.x-100;b.prevY=b.y;
  assert.equal(g.paddleHit(b,p,false),true);assert.ok(b.vx<0);
  const block=g.makeBlock(450,200,'stone');g.blocks=[block];
  b.prevX=390;b.x=520;b.y=b.prevY=209;b.vx=4000;b.vy=0;b.lastHit='player';b.damage=1;
  assert.equal(g.blockHit(b),true);g.stabilize(b);
  assert.ok(b.vx<0);assert.ok(b.x<450);assert.equal(block.hp,2);
});

test('swept blocks hit the nearest obstacle independent of array order and ignore rounded near-miss',async()=>{
  const g=await loadGame(),near=g.makeBlock(300,200,'stone'),far=g.makeBlock(400,200,'stone');
  g.blocks=[far,near];const b=g.makeBall(460,209,4200,0);b.prevX=200;b.prevY=209;
  g.blockHit(b);assert.equal(near.hp,2);assert.equal(far.hp,3);
  const {sweepCircleRect}=await import('../src/collision.js');
  assert.equal(sweepCircleRect({x:290,y:193},{x:297,y:193},7,near),null);
  assert.ok(sweepCircleRect({x:280,y:205},{x:330,y:205},7,near));
});

test('pause freezes boss serve, clock, block motion, notes and wall cues; pause cannot serve',async()=>{
  const g=await loadGame();g.level=0;g.enemy=g.makeEnemy();g.hitEnemy(100,500,200);
  assert.ok(g.bossEnemyServeBall);g.paused=true;
  const before=JSON.stringify({clock:g.clock,held:g.bossEnemyServeBall,enemy:g.enemy,notes:g.notes});
  for(let i=0;i<100;i++)g.update(.024);
  assert.equal(JSON.stringify({clock:g.clock,held:g.bossEnemyServeBall,enemy:g.enemy,notes:g.notes}),before);
  assert.equal(g.launchFreeServe(),false);assert.equal(g.balls.length,0);
  g.paused=false;for(let i=0;i<36;i++)g.update(.024);
  assert.equal(g.bossEnemyServeBall,null);assert.ok(g.balls.length>0);
});

test('simulation dt is bounded, negative/nonfinite dt is inert and walls use current arena',async()=>{
  const g=await loadGame();g.update(30);assert.equal(g.clock,.024);
  for(const dt of [-1,NaN,Infinity])g.update(dt);assert.equal(g.clock,.024);
  g.level=100;const b=g.makeBall(400,1,2000,-1000);g.wallBounce(b,true);
  assert.equal(b.y,g.arenaTop()+b.r);assert.ok(b.vy>0);
  b.vx=1e8;b.vy=1e8;g.stabilize(b);assert.ok(Math.hypot(b.vx,b.vy)<=4200.001);
});

test('multi-ball stage clear and practice miss safely replace a running ball collection',async()=>{
  const g=await loadGame();g.freeServe=false;g.enemy.hp=1;
  for(let i=0;i<3;i++)g.makeBall(g.W+60,200+i*20,1000,0);
  g.update(.01);assert.equal(g.mode,'cleared');assert.equal(g.balls.length,0);
  const {installPractice}=await import('../src/practice-controls.js');const practice=installPractice(g);practice.start();
  g.freeServe=false;for(let i=0;i<3;i++)g.makeBall(-60,200+i*20,-1000,0);
  g.updateBalls(.01);assert.equal(g.mode,'playing');assert.equal(g.freeServe,true);assert.equal(g.player.hp,5);
});

test('cleared countdown is simulation-owned and cannot enter a draft after a restart',async()=>{
  const g=await loadGame();g.hitEnemy(100,500,200);assert.equal(g.mode,'cleared');
  g.paused=true;g.update(.024);assert.equal(g.clearDelay,.38);
  g.newRun();for(let i=0;i<50;i++)g.update(.024);assert.equal(g.mode,'playing');
});

test('upgrade effects provide real stamina saving, combo time, wall brake and slowing',async()=>{
  const g=await loadGame();const {Relics}=await import('../src/config.js');
  Relics.find(r=>r.id==='boots').apply(g.mods,g);
  const p=g.player;p.stamina=1;g.stamina(p,true,.1,.52);assert.ok(Math.abs(p.stamina-.961)<1e-9);
  Relics.find(r=>r.id==='coherence').apply(g.mods,g);g.addScore(10,20,20);assert.ok(Math.abs(g.comboTimer-3.3)<1e-9);
  const b=g.makeBall(400,100,1400,400,0,'player');b.wallBounces=2;
  const plain={...b};g.wallSpin(plain,true);
  Relics.find(r=>r.id==='casimir').apply(g.mods,g);g.wallSpin(b,true);
  assert.ok(Math.hypot(b.vx,b.vy)<Math.hypot(plain.vx,plain.vy));
  const block=g.makeBlock(450,200,'stone');g.blocks=[block];b.spin=1;
  Relics.find(r=>r.id==='shear').apply(g.mods,g);g.handleBlock(block,b,0,459,209);assert.equal(block.slow,3);
  block.motionClock=0;g.updateBlocks(.1);assert.ok(Math.abs(block.motionClock-.035)<1e-9);
});

test('boss damage upgrade applies once per goal and predictable portals remove deflection',async()=>{
  const g=await loadGame();g.level=0;g.enemy=g.makeEnemy();g.mods.bossBane=1;g.enemy.hp=20;
  const b=g.makeBall(400,200,800,120,0,'player');g.hitEnemy(g.goalDamage(b),600,200);assert.equal(g.enemy.hp,18);
  const a=g.makeBlock(300,200,'portal'),z=g.makeBlock(500,200,'portal');g.blocks=[a,z];g.linkPortals();g.mods.portalMastery=true;
  g.teleportBall(b,a);assert.ok(Math.abs(b.vy-139.2)<1e-9);
});

test('conserving stamina improves return power without changing pointer movement',async()=>{
  const hit=async stamina=>{
    const g=await loadGame(),p=g.player;p.stamina=stamina;
    const b=g.makeBall(p.x-30,p.y,-1200,0,0,'enemy');b.prevX=p.x+70;b.prevY=p.y;
    g.paddleHit(b,p,true);return Math.hypot(b.vx,b.vy);
  };
  assert.ok(await hit(1)>await hit(0)*1.15);
});

test('serve guide changes with angle/spin and stops at obstacles without mutating game',async()=>{
  const g=await loadGame();const {serveGuide}=await import('../src/skill-depth.js');
  const before=JSON.stringify(g);const straight=serveGuide(g);assert.equal(JSON.stringify(g),before);
  g.spinIntent=1;const curve=serveGuide(g);assert.ok(curve.at(-1).y>straight.at(-1).y);
  g.player.angle=-.3;assert.ok(serveGuide(g).at(-1).y<g.player.y);
  g.player.angle=0;g.blocks=[g.makeBlock(g.player.x+60,g.player.y-9,'stone')];
  assert.ok(serveGuide(g).at(-1).x<g.player.x+60);
});
