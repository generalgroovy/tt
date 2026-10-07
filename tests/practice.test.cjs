const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/practice-controls.js'),'utf8').replace(/^import .*$/gm,'').replaceAll('export ','');
function setup(){
 const game={level:0,mode:'title',saved:0,hits:0,hurt:0,spinIntent:0,
  newRun(){this.mode='playing';this.paused=false;this.player={x:70,y:200,angle:0,manualAngle:0,angleLocked:false,hp:5,maxHp:5};},
  makeEnemy(){return {};},prepareFreeServe(){this.freeServe=true;this.balls=[];},
  update(){},targetBlocks(){return 8;},hurtPlayer(){this.hurt++;},hitEnemy(){this.hits++;},saveBest(){this.saved++;},
  updateSpinIntent(dir,dt){this.spinIntent+=dir*dt;},launchFreeServe(){if(!this.freeServe)return false;this.freeServe=false;return true;}
 };
 const context=vm.createContext({CFG:{minLevel:-5,paddle:{maxAngle:1}},game});vm.runInContext(source+';globalThis.practice=installPractice(game)',context);
 return{game,practice:context.practice,context};
}
test('practice teaches performed movement, angle and spin serve without score or health loss',()=>{
 const {game,practice}=setup();practice.start();
 assert.equal(practice.step,0);assert.equal(game.targetBlocks(),0);
 game.player.x+=30;game.update(.1);assert.equal(practice.step,1);
 practice.tilt(1);game.player.angle=game.player.manualAngle;game.update(.1);assert.equal(practice.step,2);
 practice.spinTo(1);game.updateSpinIntent(0,.7);game.update(.1);assert.equal(practice.step,3);
 assert.equal(game.freeServe,true);game.launchFreeServe();assert.equal(practice.step,4);
 game.hurtPlayer(1);game.hitEnemy(5);game.saveBest();assert.equal(game.player.hp,5);assert.equal(game.hurt,0);assert.equal(game.hits,0);assert.equal(game.saved,0);
 game.newRun();assert.equal(practice.active,false);assert.equal(practice.spin,0);assert.equal(game.targetBlocks(),8);
 game.hurtPlayer(1);game.hitEnemy(5);game.saveBest();assert.equal(game.hurt,1);assert.equal(game.hits,1);assert.equal(game.saved,1);
});
test('touch spin stays selected, keyboard wins temporarily, neutral clears charge and tilt is bounded',()=>{
 const {game,practice}=setup();practice.start();practice.spinTo(-1);
 game.updateSpinIntent(0,.5);assert.equal(game.spinIntent,-.5);
 game.updateSpinIntent(1,.2);assert.equal(game.spinIntent,-.3);
 practice.spinTo(0);assert.equal(game.spinIntent,0);
 for(let i=0;i<100;i++)practice.tilt(1);assert.equal(game.player.manualAngle,1);
 game.paused=true;game.player.x+=50;game.update(.1);assert.equal(practice.step,0);
});

test('control guidance explains pause, opponent serve, practice progress and normal rally',()=>{
 const {game,practice,context}=setup();
 practice.start();assert.match(context.controlMessage(game,practice),/1 \/ 4/);
 game.paused=true;assert.match(context.controlMessage(game,practice),/Paused.*Resume/);
 game.paused=false;game.newRun();game.freeServe=true;
 assert.match(context.controlMessage(game,practice),/Your serve/);
 game.freeServe=false;assert.match(context.controlMessage(game,practice),/Rally.*after a miss/);
 game.bossEnemyServeBall={};assert.match(context.controlMessage(game,practice),/Opponent serving/);
});
