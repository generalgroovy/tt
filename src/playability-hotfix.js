import { Colors, CFG } from './config.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { clamp, speedOf } from './utils.js';

CFG.ball.serveHoldX = 38;
CFG.spin = { visibleThreshold: 0.08, intentionalGain: 1.18, releaseDecay: 0.58 };

const oldPrepareFreeServe = Game.prototype.prepareFreeServe;
Game.prototype.prepareFreeServe = function patchedPrepareFreeServe() {
  oldPrepareFreeServe.call(this);
  this.freeServeBall = {
    x: this.player ? this.player.x + CFG.ball.serveHoldX : 96,
    y: this.player ? this.player.y : this.H / 2,
    r: CFG.ball.r,
    spin: this.spinIntent || 0,
    pulse: 0
  };
  this.notify('AIM SPIN, THEN SERVE', Colors.cyan, 1.25);
};

const oldLaunchFreeServe = Game.prototype.launchFreeServe;
Game.prototype.launchFreeServe = function patchedLaunchFreeServe() {
  if (this.mode !== 'playing' || !this.freeServe) return false;
  this.freeServe = false;
  const y = this.freeServeBall ? this.freeServeBall.y : this.player.y;
  const v = (CFG.ball.startSpeed + Math.max(0, this.level) * 8) * this.mods.ballSpeed;
  const aim = clamp(this.player ? this.player.angle : 0, -0.92, 0.92);
  const spin = clamp(this.spinIntent * CFG.spin.intentionalGain, -CFG.ball.maxSpin, CFG.ball.maxSpin);
  this.makeBall(this.player.x + CFG.ball.serveHoldX, y, Math.cos(aim) * v, Math.sin(aim) * v, spin, 'player');
  for (let i = 0; i < this.mods.extraBalls; i++) {
    this.makeBall(this.player.x + CFG.ball.serveHoldX + 10 * i, y + (i % 2 ? 14 : -14), Math.cos(aim + (i % 2 ? .18 : -.18)) * v * .94, Math.sin(aim + (i % 2 ? .18 : -.18)) * v * .94, -spin * .65, 'player');
  }
  this.freeServeBall = null;
  this.spinIntent *= CFG.spin.releaseDecay;
  this.notify(spin ? 'SPIN SERVE' : 'SERVE', spin > 0 ? Colors.gold : spin < 0 ? Colors.purple : Colors.cyan, .8);
  return true;
};

const oldUpdate = Game.prototype.update;
Game.prototype.update = function patchedUpdate(dt) {
  if (this.freeServe && this.freeServeBall && this.player) {
    this.freeServeBall.x = this.player.x + CFG.ball.serveHoldX;
    this.freeServeBall.y = this.player.y;
    this.freeServeBall.spin = this.spinIntent || 0;
    this.freeServeBall.pulse = (this.freeServeBall.pulse || 0) + dt;
  }
  oldUpdate.call(this, dt);
};

const oldPaddleHit = Game.prototype.paddleHit;
Game.prototype.paddleHit = function patchedPaddleHit(ball, paddle, side) {
  const before = ball.spin;
  oldPaddleHit.call(this, ball, paddle, side);
  if (side && ball.lastHit === 'player' && Math.abs(this.spinIntent) > .12) {
    ball.spin = clamp(ball.spin + this.spinIntent * .28, -CFG.ball.maxSpin, CFG.ball.maxSpin);
    this.spinIntent *= CFG.spin.releaseDecay;
  }
  if (Math.abs(ball.spin - before) > .18) {
    this.notify(ball.spin > 0 ? 'TOPSPIN' : 'BACKSPIN', ball.spin > 0 ? Colors.gold : Colors.purple, .55);
  }
};

Renderer.prototype.spinViz = function spinViz(x, y, radius, spin, speed = 0, alpha = 1) {
  const ctx = this.ctx;
  const abs = Math.abs(spin);
  if (abs < CFG.spin.visibleThreshold) return;
  const dir = Math.sign(spin);
  const rings = clamp(Math.ceil(abs * 2.2), 1, 6);
  ctx.save();
  ctx.globalAlpha = alpha * clamp(.32 + abs * .22, .32, .92);
  ctx.strokeStyle = dir > 0 ? Colors.gold : Colors.purple;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = 1.5 + Math.min(3, abs);
  for (let i = 0; i < rings; i++) {
    const r = radius + 7 + i * 4 + Math.min(10, speed / 220);
    ctx.beginPath();
    ctx.arc(x, y, r, dir > 0 ? -0.65 : Math.PI + .65, dir > 0 ? 1.85 * Math.PI : -.85 * Math.PI, dir < 0);
    ctx.stroke();
    const ax = x + Math.cos(dir > 0 ? 1.85 * Math.PI : -.85 * Math.PI) * r;
    const ay = y + Math.sin(dir > 0 ? 1.85 * Math.PI : -.85 * Math.PI) * r;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - dir * 7, ay - 4);
    ctx.lineTo(ax - dir * 3, ay + 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

const oldBalls = Renderer.prototype.balls;
Renderer.prototype.balls = function patchedBalls() {
  oldBalls.call(this);
  for (const ball of this.game.balls) this.spinViz(ball.x, ball.y, ball.r, ball.spin, speedOf(ball), 1);
  const held = this.game.freeServeBall;
  if (held) {
    const ctx = this.ctx;
    const pulse = .75 + Math.sin((held.pulse || 0) * 7) * .18;
    ctx.save();
    ctx.globalAlpha = .9;
    ctx.shadowColor = Colors.cyan;
    ctx.shadowBlur = 18;
    ctx.fillStyle = Colors.cyan;
    ctx.beginPath();
    ctx.arc(held.x, held.y, held.r * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.spinViz(held.x, held.y, held.r, held.spin, 0, 1);
  }
};

const oldPaddle = Renderer.prototype.paddle;
Renderer.prototype.paddle = function patchedPaddle(p, a = 1, angled = true) {
  oldPaddle.call(this, p, a, angled);
  if (p !== this.game.player) return;
  const spin = this.game.spinIntent || 0;
  if (Math.abs(spin) < .05) return;
  const ctx = this.ctx;
  ctx.save();
  ctx.globalAlpha = clamp(.25 + Math.abs(spin) * .55, .25, .9);
  ctx.strokeStyle = spin > 0 ? Colors.gold : Colors.purple;
  ctx.lineWidth = 2 + Math.abs(spin) * 2;
  ctx.beginPath();
  ctx.moveTo(p.x + 18, p.y - p.h * .42);
  ctx.quadraticCurveTo(p.x + 42 + spin * 24, p.y, p.x + 18, p.y + p.h * .42);
  ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.font = '900 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(spin > 0 ? 'TOP' : 'BACK', p.x + 28, p.y - p.h * .48);
  ctx.restore();
};

const oldHud = Renderer.prototype.hud;
Renderer.prototype.hud = function patchedHud() {
  oldHud.call(this);
  const d = this.game.dialogue;
  if (!d || !this.game.enemy) return;
  const ctx = this.ctx;
  const w = Math.min(460, this.game.W - 36);
  const x = Math.max(18, this.game.W - w - 18);
  const y = 78;
  const a = clamp(d.life / d.maxLife, 0, 1);
  ctx.save();
  ctx.globalAlpha = clamp(a * 1.25, 0, 1);
  ctx.fillStyle = 'rgba(5,7,18,.86)';
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 70, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = d.color || Colors.gold;
  ctx.font = '800 13px sans-serif';
  ctx.textAlign = 'left';
  const words = d.text.split(' ');
  let line = '';
  let yy = y + 25;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > w - 28 && line) {
      ctx.fillText(line.trim(), x + 14, yy);
      line = word + ' ';
      yy += 17;
    } else line = test;
  }
  ctx.fillText(line.trim(), x + 14, yy);
  ctx.restore();
};
