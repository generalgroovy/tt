import { CFG } from './config.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { clamp } from './utils.js';

if (!Number.isFinite(CFG.paddle.angleFollow)) CFG.paddle.angleFollow = 12;
if (!Number.isFinite(CFG.ball.maxSubsteps)) CFG.ball.maxSubsteps = 9;

const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

const originalUpdate = Game.prototype.update;
Game.prototype.update = function patchedUpdate(dt) {
  this.clock = finite(this.clock, 0) + finite(dt, 0);
  originalUpdate.call(this, dt);
  this.repairFiniteState();
};

Game.prototype.repairFiniteState = function repairFiniteState() {
  const fixPaddle = (p, zone) => {
    if (!p) return;
    p.x = clamp(finite(p.x, (zone.x1 + zone.x2) / 2), zone.x1 + p.w / 2, zone.x2 - p.w / 2);
    p.y = clamp(finite(p.y, (zone.y1 + zone.y2) / 2), zone.y1 + p.h / 2, zone.y2 - p.h / 2);
    p.vx = finite(p.vx, 0);
    p.vy = finite(p.vy, 0);
    p.angle = clamp(finite(p.angle, 0), -CFG.paddle.maxAngle, CFG.paddle.maxAngle);
    p.manualAngle = clamp(finite(p.manualAngle, p.angle), -CFG.paddle.maxAngle, CFG.paddle.maxAngle);
    p.stamina = clamp(finite(p.stamina, 1), 0, 1);
    p.wait = Math.max(0, finite(p.wait, 0));
  };

  fixPaddle(this.player, this.playerZone());
  fixPaddle(this.enemy, this.enemyZone());

  for (const b of this.balls) {
    b.x = finite(b.x, this.W / 2);
    b.y = clamp(finite(b.y, this.H / 2), this.arenaTop() + b.r, this.arenaBottom() - b.r);
    b.prevX = finite(b.prevX, b.x);
    b.prevY = finite(b.prevY, b.y);
    b.vx = finite(b.vx, b.lastHit === 'enemy' ? -CFG.ball.minSpeed : CFG.ball.minSpeed);
    b.vy = finite(b.vy, 0);
    b.spin = clamp(finite(b.spin, 0), -CFG.ball.maxSpin, CFG.ball.maxSpin);
    b.lift = finite(b.lift, 0);
  }

  this.particles = this.particles.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  this.floaters = this.floaters.filter(f => Number.isFinite(f.x) && Number.isFinite(f.y));
};

const originalDraw = Renderer.prototype.draw;
Renderer.prototype.draw = function patchedDraw() {
  this.game.clock = finite(this.game.clock, 0);
  if (typeof this.game.repairFiniteState === 'function') this.game.repairFiniteState();
  originalDraw.call(this);
};
