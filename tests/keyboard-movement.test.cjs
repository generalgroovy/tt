const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadGame}=require('./game-harness.cjs');

test('keyboard moves in both axes, normalizes diagonal speed and respects zone edges',async()=>{
 const g=await loadGame();g.player.x=100;g.player.y=300;
 g.keys.add('ArrowDown');g.updatePlayer(.05);
 const distance=g.player.y-300;assert.ok(distance>20&&distance<30);
 g.player.x=100;g.player.y=300;g.keys.add('ArrowRight');g.updatePlayer(.05);
 assert.ok(Math.abs(Math.hypot(g.player.x-100,g.player.y-300)-distance)<.001);
 assert.equal(g.player.angleLocked,false);assert.equal(g.spinIntent,0);
 for(let n=0;n<100;n++)g.updatePlayer(.05);
 const z=g.playerZone();assert.equal(g.player.x,z.x2-g.player.w/2);assert.equal(g.player.y,z.y2-g.player.h/2);
});

test('releasing keyboard keeps its position; a later pointer movement takes over',async()=>{
 const g=await loadGame();g.pointer={active:true,x:160,y:320};g.keys.add('ArrowDown');g.updatePlayer(.05);
 const y=g.player.y;assert.equal(g.pointer.active,false);
 g.keys.clear();g.updatePlayer(.05);assert.equal(g.player.y,y);
 g.pointer.active=true;g.updatePlayer(.05);assert.equal(g.player.y,320);assert.equal(g.player.x,160);
});

test('opposing keys cancel, pause freezes movement, and angle controls remain independent',async()=>{
 const g=await loadGame();const y=g.player.y;
 g.keys.add('ArrowDown');g.keys.add('ArrowUp');g.updatePlayer(.05);assert.equal(g.player.y,y);
 g.keys.delete('ArrowUp');g.paused=true;g.update(.05);assert.equal(g.player.y,y);
 g.paused=false;g.keys.clear();g.keys.add('KeyD');g.updatePlayer(.05);
 assert.equal(g.player.y,y);assert.equal(g.player.angleLocked,true);assert.ok(g.spinIntent>0);
 const angle=g.player.angle;g.keys.clear();g.keys.add('KeyW');g.updatePlayer(.05);assert.notEqual(g.player.angle,angle);
});

test('the full practice can start with keyboard movement and retains no-loss training',async()=>{
 const g=await loadGame();const {installPractice}=await import('../src/practice-controls.js');
 const p=installPractice(g);p.start();g.keys.add('ArrowDown');
 for(let n=0;n<5;n++)g.update(.02);
 assert.equal(p.step,1);g.keys.clear();p.tilt(1);
 for(let n=0;n<10;n++)g.update(.02);
 assert.equal(p.step,2);p.spinTo(1);
 for(let n=0;n<100;n++)g.update(.02);
 assert.equal(p.step,3);g.launchFreeServe();assert.equal(p.step,4);
 g.hurtPlayer(5);assert.equal(g.player.hp,g.player.maxHp);
});
