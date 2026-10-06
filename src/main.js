import './pro-overhaul.js';
import './playability-hotfix.js';
import './shippable-polish.js';
import './skill-depth.js';
import { installPracticeControls } from './practice-controls.js';
import { installUpgradeControls } from './upgrade-controls.js';
import { Game } from './game.js';
import { Renderer } from './render.js';

const canvas = document.getElementById('game');
const button = document.getElementById('actionButton');
const ctx = canvas.getContext('2d');
const game = new Game(canvas, button);
const renderer = new Renderer(game, ctx);
const syncControls = installPracticeControls(game, canvas);
const syncUpgrades = installUpgradeControls(game, canvas);
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
  if (game.mode === 'playing' && game.paused) { game.paused = false; game.syncButton(); return; }
  if (['title', 'gameover', 'victory'].includes(game.mode)) { game.newRun(); return; }
  if (game.launchFreeServe()) return;
}
function loop(now) {
  const dt = Math.max(0, Math.min(0.024, (now - last) / 1000 || 0));
  last = now;
  try { game.update(dt); syncControls(); syncUpgrades(); renderer.draw(); }
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
button.addEventListener('click', () => {
  if (game.mode === 'playing' && game.paused) { game.paused = false; game.syncButton(); }
  else game.newRun();
  canvas.focus();
});
canvas.addEventListener('pointerdown', event => { const p = updatePointer(event, true); clickAt(p.x, p.y); canvas.focus(); event.preventDefault(); });
canvas.addEventListener('pointermove', event => { updatePointer(event); event.preventDefault(); });
canvas.addEventListener('pointerleave', event => { if (event.pointerType !== 'mouse') game.pointer.active = false; });
canvas.addEventListener('touchmove', event => event.preventDefault(), { passive: false });
window.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.target?.isContentEditable || event.target?.closest?.('input,textarea,select,button,summary,a[href]')) return;
  game.keys.add(event.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  if (event.repeat) return;
  if (event.code === 'Space') {
    if (['title', 'gameover', 'victory'].includes(game.mode)) game.newRun();
    else game.launchFreeServe();
  }
  if (event.code === 'KeyR') game.newRun();
  if (event.code === 'KeyP' && game.mode === 'playing') { game.paused = !game.paused; game.keys.clear(); game.syncButton(); }
  if (event.code === 'KeyL' && game.player) { game.player.angleLocked = !game.player.angleLocked; game.player.manualAngle = game.player.angle; }
  if (event.code === 'KeyX' && game.player) game.player.angleLocked = false;
  if (game.mode === 'upgrade' && ['Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].includes(event.code)) game.chooseRelic(Number(event.code.replace('Digit','').replace('Numpad','')) - 1);
});
window.addEventListener('keyup', event => game.keys.delete(event.code));
window.addEventListener('blur', () => { game.keys.clear(); if (game.mode === 'playing') { game.paused = true; game.syncButton(); } });
window.addEventListener('resize', () => game.resize());
window.addEventListener('orientationchange', () => game.resize());

game.resize();
game.syncButton();
renderer.draw();
requestAnimationFrame(loop);
