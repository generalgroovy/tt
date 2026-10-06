import { CFG } from './config.js';
import { readSetting } from './storage.js';

export const LESSONS = [
  'Move your paddle with the pointer or a finger.',
  'Tilt the paddle with ↶ / ↷ or A / D.',
  'Choose Backspin or Topspin to charge a curved shot.',
  'Serve the charged ball and watch its curve.',
  'Ready. Try different angles and spin; misses cost no health.'
];

// Practice wraps the same physics and input methods as a normal run.
export function installPractice(game) {
  let practice = null;
  let touchSpin = 0;
  const original = Object.fromEntries(['newRun','update','targetBlocks','hurtPlayer','hitEnemy','saveBest','updateSpinIntent','launchFreeServe'].map(name=>[name,game[name].bind(game)]));
  game.newRun = () => {
    practice = null;
    game.practiceMode = false;
    touchSpin = 0;
    game.levelClearLock = false;
    game.bossEnemyServeBall = null;
    game.enemyStaminaCarry = undefined;
    game.enemyWaitCarry = undefined;
    game.keys?.clear();
    original.newRun();
  };
  game.targetBlocks = () => practice ? 0 : original.targetBlocks();
  game.hurtPlayer = n => {
    if (!practice) return original.hurtPlayer(n);
    game.player.hp = game.player.maxHp;
    game.prepareFreeServe();
  };
  game.hitEnemy = (...args) => {
    if (!practice) return original.hitEnemy(...args);
    game.prepareFreeServe();
  };
  game.saveBest = () => { if (!practice) return original.saveBest(); };
  game.updateSpinIntent = (dir,dt) => original.updateSpinIntent(dir || touchSpin,dt);
  game.launchFreeServe = () => {
    const charged = Math.abs(game.spinIntent) >= .35;
    const served = original.launchFreeServe();
    if (served && charged && practice?.step === 3) practice.step = 4;
    return served;
  };
  game.update = dt => {
    original.update(dt);
    if (!practice || game.paused) return;
    if (practice.step === 0 && Math.hypot(game.player.x-practice.x,game.player.y-practice.y)>25) practice.step=1;
    else if (practice.step === 1 && game.player.angleLocked && Math.abs(game.player.angle)>.15) practice.step=2;
    else if (practice.step === 2 && Math.abs(game.spinIntent)>.6) {
      practice.step=3;
      game.prepareFreeServe();
    }
  };
  return {
    get active(){return Boolean(practice);},
    get step(){return practice?.step ?? -1;},
    get spin(){return touchSpin;},
    spinTo(value){touchSpin=Math.max(-1,Math.min(1,value));if(!touchSpin)game.spinIntent=0;},
    tilt(direction){if(!game.player)return;game.player.angleLocked=true;game.player.manualAngle=Math.max(-CFG.paddle.maxAngle,Math.min(CFG.paddle.maxAngle,game.player.manualAngle+direction*Math.PI/12));},
    start(){
      game.newRun();
      game.level=CFG.minLevel;
      game.practiceMode=true;
      practice={step:0,x:game.player.x,y:game.player.y};
      game.enemy=game.makeEnemy();
      game.blocks=[];game.previews=[];game.dialogue=null;game.notes=[];
      game.prepareFreeServe();
    }
  };
}

export function installPracticeControls(game, canvas) {
  const practice=installPractice(game);
  const $=id=>document.getElementById(id);
  const panel=$('paddleControls'), status=$('practiceStatus'), practiceButton=$('practiceButton');
  const spinButtons=[...document.querySelectorAll('[data-spin]')];
  let lastUi='';
  const sync=()=>{
    const key=[game.mode,game.paused,game.freeServe,Boolean(game.bossEnemyServeBall),game.player?.angleLocked,practice.active,practice.step,practice.spin].join('|');
    if(key===lastUi)return;
    lastUi=key;
    panel.hidden=game.mode!=='playing';
    practiceButton.hidden=game.mode==='playing'&&!practice.active;
    practiceButton.textContent=practice.active?'Start game':'Practice';
    status.hidden=!practice.active;
    const instruction=LESSONS[practice.step]||'';
    if(status.textContent!==instruction)status.textContent=instruction;
    $('angleAuto').setAttribute('aria-pressed',String(!game.player?.angleLocked));
    $('serveButton').disabled=!game.freeServe||game.paused||Boolean(game.bossEnemyServeBall);
    $('pauseControl').textContent=game.paused?'Resume':'Pause';
    spinButtons.forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.spin)===practice.spin)));
  };
  const act=fn=>()=>{fn();sync();canvas.focus();};
  practiceButton.addEventListener('click',act(()=>practice.active?game.newRun():practice.start()));
  $('angleLeft').addEventListener('click',act(()=>practice.tilt(-1)));
  $('angleRight').addEventListener('click',act(()=>practice.tilt(1)));
  $('angleAuto').addEventListener('click',act(()=>{if(game.player)game.player.angleLocked=false;}));
  $('serveButton').addEventListener('click',act(()=>game.launchFreeServe()));
  $('pauseControl').addEventListener('click',act(()=>{game.paused=!game.paused;game.keys.clear();game.syncButton();}));
  spinButtons.forEach(button=>button.addEventListener('click',act(()=>practice.spinTo(Number(button.dataset.spin)))));
  const info=$('infoPanel');
  const skip=$('skipIntro');
  game.skipIntro=readSetting('tap-skip-intro')==='1';
  skip.checked=game.skipIntro;
  skip.addEventListener('change',()=>{if(skip.checked!==game.skipIntro)game.toggleSkipIntro();});
  info.addEventListener('toggle',()=>{if(info.open&&game.mode==='playing'){game.paused=true;game.keys.clear();game.syncButton();sync();}});
  window.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&info.open){event.preventDefault();info.open=false;info.querySelector('summary').focus();}
  });
  // Reserve space for touch controls instead of hiding the bottom of the arena.
  const resize=game.resize.bind(game);
  game.resize=()=>{
    resize();
    game.W=Math.max(280,innerWidth);
    game.H=Math.max(220,innerHeight-224);
    game.canvas.width=Math.floor(game.W*game.dpr);
    game.canvas.style.width=game.W+'px';
    game.canvas.height=Math.floor(game.H*game.dpr);
    game.canvas.style.height=game.H+'px';
    game.clampActors();
  };
  sync();
  return sync;
}
