import { Colors, CFG, Relics } from './config.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { clamp, pick, speedOf } from './utils.js';

CFG.boss = { defenseServeDelay: 0.85, defenseHpRatio: 0.34 };
CFG.balanceCaps = {
  paddleScale: 1.95, ballSpeed: 2.15, spinPower: 2.6, damage: 6,
  shields: 6, extraBalls: 4, maxBalls: 5, scoreScale: 2.35
};

const simple = new Set(['wide','boots','heart','phaseguard','mass','shield','pump']);
const mid = new Set(['echo','gyro','noether','casimir','pauli','field','after','combo']);
const complex = new Set(['feynman','bias','bell','phase','pinhole','entangle','collapse','worm','renorm','bossbane']);
const repeat = new Set(['heart','phaseguard','mass','pump','shield','after']);

function bossLevel(g) { return typeof g.isBossLevel === 'function' && g.isBossLevel(g.level); }
function capMods(m) {
  m.paddleScale = clamp(m.paddleScale ?? 1, 0.72, CFG.balanceCaps.paddleScale);
  m.ballSpeed = clamp(m.ballSpeed ?? 1, 0.75, CFG.balanceCaps.ballSpeed);
  m.spinPower = clamp(m.spinPower ?? 1, 0.7, CFG.balanceCaps.spinPower);
  m.damage = clamp(m.damage ?? 1, 1, CFG.balanceCaps.damage);
  m.shield = clamp(m.shield ?? 0, 0, CFG.balanceCaps.shields);
  m.extraBalls = clamp(m.extraBalls ?? 0, 0, CFG.balanceCaps.extraBalls);
  m.maxBalls = clamp(m.maxBalls ?? 0, 0, CFG.balanceCaps.maxBalls);
  m.scoreScale = clamp(m.scoreScale ?? 1, 0.85, CFG.balanceCaps.scoreScale);
  m.crit = clamp(m.crit ?? 0, 0, 0.48);
  m.pinholeChance = clamp(m.pinholeChance ?? 0, 0, 0.62);
  m.entanglePower = clamp(m.entanglePower ?? 1, 0.65, 2.25);
  m.gravityWell = clamp(m.gravityWell ?? 0, 0, 1.25);
  return m;
}
function allowedRelics(level) {
  const allowed = new Set(simple);
  if (level >= 5) for (const id of mid) allowed.add(id);
  if (level >= 18) for (const id of complex) allowed.add(id);
  if (level >= 45) for (const r of Relics) allowed.add(r.id);
  return allowed;
}
function clearLevel(g, label = 'LEVEL CLEAR') {
  if (g.levelClearLock) return;
  g.levelClearLock = true;
  g.balls = [];
  g.freeServe = false;
  g.freeServeBall = null;
  g.bossEnemyServeBall = null;
  g.addScore(220 + Math.max(0, g.level) * 42, g.W / 2, g.H / 2, label);
  g.notify(label, label.includes('BOSS') ? Colors.red : Colors.gold, 1.05);
  g.mode = 'cleared';
  setTimeout(() => {
    if (g.mode === 'cleared') {
      g.levelClearLock = false;
      g.createDraft();
    }
  }, 380);
}

Game.prototype.createDraft = function createDraftPolished() {
  if (this.mode === 'upgrade') return;
  const allowed = allowedRelics(this.level);
  let pool = Relics.filter(r => allowed.has(r.id) && (!this.relics.includes(r.id) || repeat.has(r.id)));
  if (pool.length < 3) pool = Relics.filter(r => !this.relics.includes(r.id) || repeat.has(r.id));
  this.draft = [];
  while (this.draft.length < 3 && pool.length) {
    const r = pick(pool);
    if (!this.draft.includes(r)) this.draft.push(r);
  }
  this.mode = 'upgrade';
  this.notify('CHOOSE ONE', Colors.gold, 1.15);
  this.syncButton();
};

Game.prototype.chooseRelic = function chooseRelicPolished(index) {
  if (this.mode !== 'upgrade' || !this.draft[index]) return;
  if (this.enemy && Number.isFinite(this.enemy.stamina)) {
    this.enemyStaminaCarry = this.enemy.stamina;
    this.enemyWaitCarry = Number.isFinite(this.enemy.wait) ? this.enemy.wait : 0;
  }
  const r = this.draft[index];
  r.apply(this.mods, this);
  capMods(this.mods);
  this.relics.push(r.id);
  this.notify(r.name.toUpperCase(), Colors.gold, 0.9);
  this.level++;
  if (this.level > CFG.maxLevel) {
    this.mode = 'victory';
    this.saveBest();
    this.syncButton();
    return;
  }
  this.levelClearLock = false;
  this.bossPhase = bossLevel(this) ? 'offense' : null;
  this.balls = [];
  this.freeServeBall = null;
  this.bossEnemyServeBall = null;
  this.enemy = this.makeEnemy();
  this.fillBlocks();
  this.mode = 'playing';
  this.prepareFreeServe();
  this.syncButton();
};

Game.prototype.hitEnemy = function hitEnemyPolished(damage, x, y) {
  if (this.mode !== 'playing' || !this.enemy || this.levelClearLock) return;
  let n = Math.max(1, Math.floor(damage));
  if (bossLevel(this)) n += this.mods.bossBane || 0;
  this.enemy.hp -= n;
  this.enemy.stun = Math.max(this.enemy.stun || 0, 0.14);
  this.addScore(70 * n, x, y, '-' + n + ' HP');
  this.burst(x, y, this.enemy.color, 18 + n * 4);
  if (this.enemy.hp > 0) return;

  if (bossLevel(this) && this.bossPhase !== 'defense') {
    this.bossPhase = 'defense';
    this.enemy.hp = Math.max(2, Math.ceil(this.enemy.maxHp * CFG.boss.defenseHpRatio));
    this.enemy.maxHp = Math.max(this.enemy.maxHp, this.enemy.hp);
    this.balls = [];
    this.freeServe = true;
    this.freeServeBall = null;
    this.bossEnemyServeBall = { x: this.enemy.x - 38, y: this.enemy.y, r: CFG.ball.r, spin: 0, timer: CFG.boss.defenseServeDelay, pulse: 0 };
    this.notify('DEFEND', Colors.pink, 1.1);
    return;
  }

  clearLevel(this, bossLevel(this) ? 'BOSS CLEAR' : 'LEVEL CLEAR');
};

const oldLaunch = Game.prototype.launchFreeServe;
Game.prototype.launchFreeServe = function launchGuarded() {
  if (this.bossEnemyServeBall) return false;
  return oldLaunch.call(this);
};

const oldUpdate = Game.prototype.update;
Game.prototype.update = function updatePolished(dt) {
  if (this.bossEnemyServeBall && this.enemy) {
    const held = this.bossEnemyServeBall;
    held.x = this.enemy.x - 38;
    held.y = this.enemy.y;
    held.pulse += dt;
    held.timer -= dt;
    this.freeServe = true;
    if (held.timer <= 0) {
      const v = (CFG.ball.startSpeed + Math.max(0, this.level) * 8) * this.mods.ballSpeed * 1.03;
      const aim = clamp((this.player.y - this.enemy.y) / Math.max(160, this.H), -0.46, 0.46);
      this.bossEnemyServeBall = null;
      this.freeServe = false;
      this.makeBall(this.enemy.x - 38, this.enemy.y, -Math.cos(aim) * v, Math.sin(aim) * v, clamp(aim * 1.7, -1.1, 1.1), 'enemy');
      this.notify('BOSS SERVE', Colors.pink, 0.8);
    }
  }
  try {
    oldUpdate.call(this, dt);
  } catch (err) {
    console.error(err);
    this.notify('FIELD STABILIZED', Colors.cyan, 0.8);
    this.balls = [];
    this.freeServeBall = null;
    this.bossEnemyServeBall = null;
    this.prepareFreeServe();
  }
};

const oldWallSpin = Game.prototype.wallSpin;
Game.prototype.wallSpin = function wallSpinClear(ball, top) {
  const before = { vx: ball.vx, vy: ball.vy, spin: ball.spin };
  oldWallSpin.call(this, ball, top);
  if (Math.abs(ball.spin) > 0.42) {
    ball.wallCue = { x: ball.x, y: ball.y, life: 0.28, spin: ball.spin, vx: ball.vx, vy: ball.vy };
    ball.vx += Math.sign(ball.vx || 1) * Math.abs(ball.spin) * 9;
  }
  const maxVy = Math.max(240, Math.abs(ball.vx) * 1.45);
  ball.vy = clamp(ball.vy, -maxVy, maxVy);
  if (Math.sign(before.vx || ball.vx) !== Math.sign(ball.vx || before.vx)) ball.spin *= 0.72;
};

const oldPaddleHit = Game.prototype.paddleHit;
Game.prototype.paddleHit = function paddleHitIntentional(ball, paddle, side) {
  const before = { spin: ball.spin, last: ball.lastHit };
  oldPaddleHit.call(this, ball, paddle, side);
  if (!side || ball.lastHit === before.last) return;
  if (Math.abs(this.spinIntent) > 0.18) {
    ball.spin = clamp(ball.spin + this.spinIntent * 0.36, -CFG.ball.maxSpin, CFG.ball.maxSpin);
    ball.vy += this.spinIntent * Math.max(60, Math.abs(ball.vx) * 0.09);
    this.spinIntent *= 0.44;
  }
  if (this.mods.centerRefund && Math.abs(ball.y - paddle.y) < paddle.h * 0.16) {
    paddle.stamina = clamp(paddle.stamina + 0.16, 0, 1);
    this.floatText(ball.x, ball.y - 18, 'CLEAN', Colors.green);
  }
  if ((this.mods.pathFork || 0) && Math.abs(ball.spin) > 1 && Math.random() < this.mods.pathFork) {
    const v = speedOf(ball) * 0.74;
    this.makeBall(ball.x, ball.y, ball.vx > 0 ? v : -v, ball.vy * -0.55, -ball.spin * 0.45, ball.lastHit, ball.entangled);
    this.notify('GHOST PATH', Colors.cyan, 0.6);
  }
};

const oldBalls = Renderer.prototype.balls;
Renderer.prototype.balls = function ballsPolished() {
  oldBalls.call(this);
  const ctx = this.ctx;
  for (const b of this.game.balls) {
    if (!b.wallCue) continue;
    b.wallCue.life -= 0.016;
    if (b.wallCue.life <= 0) { b.wallCue = null; continue; }
    const a = clamp(b.wallCue.life / 0.28, 0, 1);
    ctx.save();
    ctx.globalAlpha = a * 0.72;
    ctx.strokeStyle = b.wallCue.spin > 0 ? Colors.gold : Colors.purple;
    ctx.setLineDash([5, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.wallCue.x, b.wallCue.y);
    ctx.quadraticCurveTo(b.wallCue.x + Math.sign(b.wallCue.vx || 1) * 38, b.wallCue.y + b.wallCue.spin * 32, b.wallCue.x + Math.sign(b.wallCue.vx || 1) * 88, b.wallCue.y + b.wallCue.spin * 54);
    ctx.stroke();
    ctx.restore();
  }
  const held = this.game.bossEnemyServeBall;
  if (held) {
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.shadowColor = Colors.pink;
    ctx.shadowBlur = 18;
    ctx.fillStyle = Colors.pink;
    ctx.beginPath();
    ctx.arc(held.x, held.y, held.r * (0.8 + Math.sin(held.pulse * 8) * 0.15), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

Renderer.prototype.hud = function hudMinimal() {
  const g = this.game, ctx = this.ctx;
  if (!g.player || !g.enemy) return;
  const w = Math.min(520, g.W - 28), x = g.W / 2 - w / 2, y = 10;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.30)';
  ctx.beginPath(); ctx.roundRect(x, y, w, 56, 14); ctx.fill();
  ctx.fillStyle = Colors.text; ctx.font = '900 12px sans-serif'; ctx.textAlign = 'center';
  const phase = g.bossPhase === 'defense' ? ' · defend' : g.bossPhase === 'offense' ? ' · attack' : '';
  ctx.fillText('L ' + g.level + ' · ' + (g.scale ? g.scale().id : 'field') + phase, g.W / 2, y + 17);
  ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.beginPath(); ctx.roundRect(x + 18, y + 28, w - 36, 7, 4); ctx.fill();
  ctx.fillStyle = Colors.cyan; ctx.fillRect(x + 18, y + 28, (w - 36) * 0.48 * clamp(g.player.hp / g.mods.maxHp, 0, 1), 7);
  ctx.fillStyle = Colors.pink; ctx.fillRect(x + 18 + (w - 36) * 0.52, y + 28, (w - 36) * 0.48 * clamp(g.enemy.hp / g.enemy.maxHp, 0, 1), 7);
  const b = g.balls[0]; ctx.fillStyle = Colors.muted; ctx.font = '800 9px sans-serif';
  ctx.fillText('spin ' + (b ? b.spin.toFixed(2) : '0') + ' · load ' + Math.round(Math.abs(g.spinIntent) * 100) + '% · stamina ' + Math.round(g.enemy.stamina * 100) + '%', g.W / 2, y + 49);
  if (g.freeServe && !g.bossEnemyServeBall) { ctx.fillStyle = Colors.cyan; ctx.font = '900 15px sans-serif'; ctx.fillText('aim spin · serve', g.W / 2, g.H / 2 - 72); }
  if (g.bossEnemyServeBall) { ctx.fillStyle = Colors.pink; ctx.font = '900 15px sans-serif'; ctx.fillText('receive', g.W / 2, g.H / 2 - 72); }
  if (g.dialogue) {
    const dw = Math.min(380, g.W - 36), dx = g.W - dw - 18, dy = 78, a = clamp(g.dialogue.life / g.dialogue.maxLife, 0, 1);
    ctx.globalAlpha = clamp(a * 1.2, 0, 1); ctx.fillStyle = 'rgba(5,7,18,.84)'; ctx.beginPath(); ctx.roundRect(dx, dy, dw, 52, 13); ctx.fill();
    ctx.fillStyle = g.dialogue.color || Colors.gold; ctx.font = '800 12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(g.dialogue.text, dx + 12, dy + 29); ctx.globalAlpha = 1;
  }
  g.notes.slice(-3).forEach((n, i) => { ctx.globalAlpha = clamp(n.life / n.maxLife, 0, 1); ctx.fillStyle = n.color; ctx.font = i === 2 ? '900 22px sans-serif' : '900 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n.text, g.W / 2, g.H / 2 - 126 - i * 22); });
  ctx.restore();
};
