import { Game } from './game.js';
import { Renderer } from './render.js';

const canvas = document.getElementById('game');
const button = document.getElementById('actionButton');
const ctx = canvas.getContext('2d');
const game = new Game(canvas, button);
const renderer = new Renderer(game, ctx);
let last = performance.now();

function point(event) {
  const r = canvas.getBoundingClientRect();
  return { x: event.clientX - r.left, y: event.clientY - r.top };
}
function updatePointer(event, force = false) {
  const p = point(event), z = game.playerZone();
  const moved = game.pointer.lastX === null || Math.hypot(p.x - game.pointer.lastX, p.y - game.pointer.lastY) > 2;
  const halfH = game.player ? game.player.h / 2 : 0;
  game.pointer.lastX = p.x;
  game.pointer.lastY = p.y;
  if (force || moved) {
    game.pointer.active = true;
    game.pointer.x = Math.max(z.x1 + 6, Math.min(z.x2 - 6, p.x));
    game.pointer.y = Math.max(z.y1 + halfH, Math.min(z.y2 - halfH, p.y));
  }
  return p;
}
function clickAt(x, y) {
  if (['title', 'gameover', 'victory'].includes(game.mode)) { game.newRun(); return; }
  if (game.launchFreeServe()) return;
  if (game.mode !== 'upgrade') return;
  const compact = game.W < 820;
  const cw = compact ? Math.min(286, game.W - 40) : 258;
  const ch = compact ? 134 : 224;
  const gap = 18;
  const sx = compact ? game.W / 2 - cw / 2 : game.W / 2 - (cw * 3 + gap * 2) / 2;
  const sy = compact ? 150 : 180;
  for (let i = 0; i < 3; i++) {
    const cx = compact ? sx : sx + i * (cw + gap);
    const cy = compact ? sy + i * (ch + 14) : sy;
    if (x >= cx && x <= cx + cw && y >= cy && y <= cy + ch) game.chooseRelic(i);
  }
}
function loop(now) {
  const dt = Math.min(0.016, (now - last) / 1000 || 0);
  last = now;
  try { game.update(dt); renderer.draw(); }
  catch (err) {
    console.error(err);
    game.err = err.message || 'Unknown error';
    game.mode = 'gameover';
    game.balls = [];
    game.syncButton();
    renderer.draw();
  }
  requestAnimationFrame(loop);
}
button.addEventListener('click', () => game.newRun());
canvas.addEventListener('pointerdown', event => { const p = updatePointer(event, true); clickAt(p.x, p.y); canvas.focus(); event.preventDefault(); });
canvas.addEventListener('pointermove', event => { updatePointer(event); event.preventDefault(); });
canvas.addEventListener('pointerleave', event => { if (event.pointerType !== 'mouse') game.pointer.active = false; });
canvas.addEventListener('touchmove', event => event.preventDefault(), { passive: false });
window.addEventListener('keydown', event => {
  game.keys.add(event.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  if (event.code === 'Space') {
    if (['title', 'gameover', 'victory'].includes(game.mode)) game.newRun();
    else if (game.launchFreeServe()) return;
    else if (game.mode === 'playing' && !game.balls.length) game.serve(1);
  }
  if (event.code === 'KeyR') game.newRun();
  if (event.code === 'KeyP' && game.mode === 'playing') game.paused = !game.paused;
  if (event.code === 'KeyL' && game.player) { game.player.angleLocked = !game.player.angleLocked; game.player.manualAngle = game.player.angle; }
  if (event.code === 'KeyX' && game.player) game.player.angleLocked = false;
  if (game.mode === 'upgrade' && ['Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].includes(event.code)) game.chooseRelic(Number(event.code.replace('Digit','').replace('Numpad','')) - 1);
});
window.addEventListener('keyup', event => game.keys.delete(event.code));
window.addEventListener('blur', () => { game.keys.clear(); if (game.mode === 'playing') game.paused = true; });
window.addEventListener('resize', () => game.resize());
window.addEventListener('orientationchange', () => game.resize());

game.resize();
game.syncButton();
renderer.draw();
requestAnimationFrame(loop);
