import { Colors, CFG, Relics } from './config.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { clamp, speedOf } from './utils.js';
import { capMods, draftUpgrades } from './upgrade-model.js';

CFG.boss = { defenseServeDelay: 0.85, defenseHpRatio: 0.34 };
CFG.balanceCaps = {
  paddleScale: 1.95, ballSpeed: 2.15, spinPower: 2.6, damage: 6,
  shields: 6, extraBalls: 4, maxBalls: 5, scoreScale: 2.35
};

function bossLevel(g) { return typeof g.isBossLevel === 'function' && g.isBossLevel(g.level); }
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
  g.clearDelay = .38;
}

Game.prototype.createDraft = function createDraftPolished() {
  if (this.mode === 'upgrade') return;
  this.draft = draftUpgrades(Relics, this);
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
  this.player.hp=Math.min(this.player.hp,this.mods.maxHp);
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
  if (this.paused) return;
  dt = Number.isFinite(dt) ? clamp(dt, 0, .024) : 0;
  if (this.mode === 'cleared') {
    this.clearDelay = Math.max(0, (this.clearDelay || 0) - dt);
    if (!this.clearDelay) {this.levelClearLock=false;this.createDraft();}
    return;
  }
  if (this.mode !== 'playing') return;
  if (!dt) return;
  this.clock += dt;
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
  oldUpdate.call(this, dt);
  for(const ball of this.balls) if(ball.wallCue) ball.wallCue.life-=dt;
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

const oldBalls = Renderer.prototype.balls;
Renderer.prototype.balls = function ballsPolished() {
  oldBalls.call(this);
  const ctx = this.ctx;
  for (const b of this.game.balls) {
    if (!b.wallCue) continue;
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
  const round=g.practiceMode?'Practice · No health loss':g.level<0?'Training '+(g.level+6)+'/5':'Level '+g.level+phase;
  ctx.fillText(round, g.W / 2, y + 17);
  ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.beginPath(); ctx.roundRect(x + 18, y + 28, w - 36, 7, 4); ctx.fill();
  ctx.fillStyle = Colors.cyan; ctx.fillRect(x + 18, y + 28, (w - 36) * 0.48 * clamp(g.player.hp / g.mods.maxHp, 0, 1), 7);
  ctx.fillStyle = Colors.pink; ctx.fillRect(x + 18 + (w - 36) * 0.52, y + 28, (w - 36) * 0.48 * clamp(g.enemy.hp / g.enemy.maxHp, 0, 1), 7);
  const b = g.balls[0]; ctx.fillStyle = Colors.muted; ctx.font = '700 11px sans-serif';
  ctx.fillText('You ' + g.player.hp + ' · Rival ' + Math.max(0,g.enemy.hp) + ' · Spin ' + Math.round(Math.abs(g.spinIntent)/1.18*100) + '%', g.W / 2, y + 49);
  if (g.freeServe && !g.bossEnemyServeBall) { ctx.fillStyle = Colors.cyan; ctx.font = '900 15px sans-serif'; ctx.fillText('Tap / click / Space to serve', g.W / 2, g.H / 2 - 72); }
  if (g.bossEnemyServeBall) { ctx.fillStyle = Colors.pink; ctx.font = '900 15px sans-serif'; ctx.fillText('receive', g.W / 2, g.H / 2 - 72); }
  if (g.dialogue) {
    const dw = Math.min(380, g.W - 36), dx = g.W - dw - 18, dy = 78, a = clamp(g.dialogue.life / g.dialogue.maxLife, 0, 1);
    ctx.font = '800 12px sans-serif';
    const lines = []; let line = '';
    for (const word of g.dialogue.text.split(/\s+/)) {
      const next = line ? line + ' ' + word : word;
      if (line && ctx.measureText(next).width > dw - 24) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    ctx.globalAlpha = clamp(a * 1.2, 0, 1); ctx.fillStyle = 'rgba(5,7,18,.84)'; ctx.beginPath(); ctx.roundRect(dx, dy, dw, Math.max(52, lines.length * 17 + 24), 13); ctx.fill();
    ctx.fillStyle = g.dialogue.color || Colors.gold; ctx.textAlign = 'left';
    lines.forEach((text, i) => ctx.fillText(text, dx + 12, dy + 24 + i * 17, dw - 24));
    ctx.globalAlpha = 1;
  }
  g.notes.slice(-3).forEach((n, i) => { ctx.globalAlpha = clamp(n.life / n.maxLife, 0, 1); ctx.fillStyle = n.color; ctx.font = i === 2 ? '900 22px sans-serif' : '900 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n.text, g.W / 2, g.H / 2 - 126 - i * 22); });
  ctx.restore();
};

Renderer.prototype.title = function titleCompact() {
  const ctx=this.ctx,g=this.game;
  this.overlay(.72);
  ctx.save();ctx.textAlign='center';
  ctx.fillStyle=Colors.text;ctx.font=`900 ${clamp(g.W*.075,26,64)}px sans-serif`;
  ctx.fillText("that's a paddlin",g.W/2,g.H*.36,g.W-36);
  ctx.fillStyle=Colors.cyan;ctx.font='800 18px sans-serif';
  ctx.fillText('Angle. Spin. Survive.',g.W/2,g.H*.36+38,g.W-36);
  ctx.restore();
};
