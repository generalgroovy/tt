const $ = id => document.getElementById(id);
const ui = {
  canvas: $('game'), badge: $('connectionBadge'), home: $('homePanel'), room: $('roomPanel'), name: $('nameInput'), mode: $('modeInput'), max: $('maxInput'), role: $('roleInput'), difficulty: $('difficultyInput'), target: $('targetInput'),
  host: $('hostButton'), roomInput: $('roomInput'), join: $('joinButton'), notice: $('notice'), hostStatus: $('hostStatus'), roomCode: $('roomCodeButton'), roomMessage: $('roomMessage'), invite: $('inviteInput'),
  copyInvite: $('copyInviteButton'), share: $('shareButton'), public: $('publicButton'), refresh: $('refreshLinksButton'), allLinks: $('allLinks'), hostControls: $('hostControls'),
  lobbyMode: $('lobbyModeInput'), lobbyMax: $('lobbyMaxInput'), lobbyDifficulty: $('lobbyDifficultyInput'), lobbyTarget: $('lobbyTargetInput'), start: $('startButton'), waiting: $('waitingMessage'), lobbyRole: $('lobbyRoleInput'),
  left: $('leftButton'), right: $('rightButton'), leave: $('leaveButton'), playerList: $('playerList'), upgrades: $('upgradePanel'), bottomBar: $('bottomBar')
};
const ctx = ui.canvas.getContext('2d');
const params = new URLSearchParams(location.search);
let width = 0, height = 0, dpr = 1, ws = null, connected = false, myId = '', state = null, autoJoined = false;
let previousState = null, previousAt = 0, currentAt = 0;
const input = { y: 0.5, dy: 0, spin: 0, serve: false, ability: false };
const keys = new Set();
const practice = { player: { x: 72, y: 450, h: 118 }, enemy: { x: 1528, y: 450, h: 128 }, balls: [], blocks: [], hp: 5, enemyHp: 10, score: 0 };
const palette = { cyan: '#80f7ff', pink: '#ff5f7e', gold: '#ffd166', green: '#80ff9a', purple: '#a98cff', text: '#f5f7ff', muted: '#aab5d8' };
const defaultRoles = { guard: { label: 'Guard', trait: 'stable defense' }, striker: { label: 'Striker', trait: 'damage' }, runner: { label: 'Runner', trait: 'speed' }, vector: { label: 'Vector', trait: 'spin' }, anchor: { label: 'Anchor', trait: 'shield' }, chaos: { label: 'Chaos', trait: 'volatility' } };

function resize() {
  width = innerWidth;
  height = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 2);
  ui.canvas.width = Math.floor(width * dpr);
  ui.canvas.height = Math.floor(height * dpr);
  ui.canvas.style.width = `${width}px`;
  ui.canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', resize);
resize();

function sx(x) { return x / 1600 * width; }
function sy(y) { return y / 900 * height; }
function setBadge(text, online = false) { ui.badge.textContent = text; ui.badge.className = `badge ${online ? 'online' : 'offline'}`; }
function clean(value) { return String(value).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function playerName() { const n = ui.name.value.trim() || localStorage.relayName || 'Player'; localStorage.relayName = n; return n; }
function send(message) { if (ws?.readyState === WebSocket.OPEN) { ws.send(JSON.stringify(message)); return true; } status('Still connecting.'); return false; }
function status(text) { ui.roomMessage.textContent = text; }
async function copy(text) { try { await navigator.clipboard.writeText(text); status('Copied.'); } catch { status('Clipboard blocked; select and copy manually.'); } }
function fillRoleSelects(roles = defaultRoles) {
  const html = Object.entries(roles).map(([key, value]) => `<option value="${key}">${clean(value.label || key)} — ${clean(value.trait || '')}</option>`).join('');
  ui.role.innerHTML = html;
  ui.lobbyRole.innerHTML = html;
}
fillRoleSelects();

function connect() {
  setBadge('connecting');
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  ws.addEventListener('open', () => {
    connected = true;
    ui.host.disabled = false;
    ui.join.disabled = false;
    setBadge('online', true);
    if (params.get('room') && !autoJoined) {
      autoJoined = true;
      ui.roomInput.value = params.get('room').toUpperCase();
      ui.notice.textContent = 'Invite detected. Auto-joining practice lobby...';
      setTimeout(() => send({ type: 'join', room: ui.roomInput.value, name: playerName(), role: ui.role.value }), 350);
    }
  });
  ws.addEventListener('close', () => {
    connected = false;
    ui.host.disabled = true;
    ui.join.disabled = true;
    setBadge('reconnecting');
    setTimeout(connect, 900);
  });
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.type === 'hello') myId = message.id;
    if (message.type === 'error') status(message.message);
    if (message.type === 'state') {
      previousState = state;
      previousAt = currentAt || performance.now();
      currentAt = performance.now();
      state = message.state;
      fillRoleSelects(state.roles);
      renderUi(message.reason);
    }
  });
}

function renderUi(reason = 'state') {
  const inRoom = !!state?.room;
  ui.home.classList.toggle('hidden', inRoom);
  ui.room.classList.toggle('hidden', !inRoom);
  if (!inRoom) return;
  const isHost = state.hostId === myId;
  ui.hostStatus.textContent = isHost ? 'You are hosting' : 'Connected to host';
  ui.hostStatus.style.color = isHost ? palette.green : palette.cyan;
  ui.roomCode.textContent = state.room;
  status(`${state.serverMessage} · ${state.players.length}/${state.settings.maxPlayers} players · ${state.phase === 'lobby' ? 'Practice lobby' : state.phase} · ${reason}`);
  ui.invite.value = state.invites?.[0] || `${location.origin}/?room=${state.room}`;
  ui.allLinks.innerHTML = (state.invites || []).map(link => `<button type="button">${clean(link)}</button>`).join('');
  ui.allLinks.querySelectorAll('button').forEach(button => button.onclick = () => copy(button.textContent));
  ui.hostControls.classList.toggle('hidden', !isHost || state.phase !== 'lobby');
  ui.waiting.classList.toggle('hidden', isHost || state.phase !== 'lobby');
  if (isHost) {
    ui.lobbyMode.value = state.settings.mode;
    ui.lobbyMax.value = String(state.settings.maxPlayers);
    ui.lobbyDifficulty.value = String(state.settings.difficulty);
    ui.lobbyTarget.value = String(state.settings.targetLevel);
  }
  const me = state.players.find(p => p.id === myId);
  if (me) ui.lobbyRole.value = me.role;
  ui.left.disabled = state.phase !== 'lobby' || state.settings.mode !== 'versus';
  ui.right.disabled = state.phase !== 'lobby' || state.settings.mode !== 'versus';
  ui.playerList.innerHTML = state.players.map(p => `<div class="player"><div><b>${clean(p.name)}${p.id === myId ? ' (you)' : ''}${p.id === state.hostId ? ' · host' : ''}</b><br><small>${clean(p.team)} · ${clean(p.role)} · ${Math.round((p.energy || 0) * 100)}% energy</small><div class="energy"><span style="width:${Math.round((p.energy || 0) * 100)}%"></span></div></div><span>${p.team === 'left' ? '◀' : '▶'}</span></div>`).join('');
  const showUpgrades = isHost && state.phase === 'upgrade';
  ui.upgrades.classList.toggle('hidden', !showUpgrades);
  ui.upgrades.innerHTML = showUpgrades ? `<p class="kicker">Choose one of five</p>${state.upgrades.map((u, i) => `<button data-index="${i}"><span>${clean(u.group)}</span><b>${clean(u.name)}</b>${clean(u.desc)}</button>`).join('')}` : '';
  ui.bottomBar.textContent = state.phase === 'lobby' ? 'Practice lobby active · host configures while everyone plays locally' : 'Multiplayer sync active · build combo, protect HP, clear levels';
}

function configureLobby() { send({ type: 'configure', settings: { mode: ui.lobbyMode.value, maxPlayers: Number(ui.lobbyMax.value), difficulty: Number(ui.lobbyDifficulty.value), targetLevel: Number(ui.lobbyTarget.value) } }); }
ui.name.value = localStorage.relayName || '';
ui.host.onclick = () => { if (send({ type: 'create', name: playerName(), mode: ui.mode.value, maxPlayers: Number(ui.max.value), difficulty: Number(ui.difficulty.value), targetLevel: Number(ui.target.value), role: ui.role.value })) { ui.notice.textContent = 'Host request sent. Waiting for visible lobby confirmation...'; setBadge('hosting...', true); } };
ui.join.onclick = () => send({ type: 'join', name: playerName(), room: ui.roomInput.value.toUpperCase().trim(), role: ui.role.value });
ui.roomCode.onclick = () => copy(state?.room || '');
ui.copyInvite.onclick = () => copy(ui.invite.value);
ui.share.onclick = () => navigator.share ? navigator.share({ title: 'Join Relay Rift', url: ui.invite.value }) : copy(ui.invite.value);
ui.refresh.onclick = async () => { const data = await fetch('/api/links').then(r => r.json()); send({ type: 'links', links: data.links }); };
ui.public.onclick = async () => { status('Creating public link...'); const data = await fetch('/api/public', { method: 'POST' }).then(r => r.json()); status(data.message); if (data.links) send({ type: 'links', links: data.links }); };
[ui.lobbyMode, ui.lobbyMax, ui.lobbyDifficulty, ui.lobbyTarget].forEach(control => control.onchange = configureLobby);
ui.start.onclick = () => send({ type: 'start' });
ui.lobbyRole.onchange = () => send({ type: 'role', role: ui.lobbyRole.value });
ui.left.onclick = () => send({ type: 'team', team: 'left' });
ui.right.onclick = () => send({ type: 'team', team: 'right' });
ui.leave.onclick = () => { location.href = location.pathname; };
ui.upgrades.onclick = event => { const button = event.target.closest('button[data-index]'); if (button) send({ type: 'upgrade', index: Number(button.dataset.index) }); };

ui.canvas.addEventListener('pointermove', event => { input.y = event.clientY / Math.max(1, height); });
ui.canvas.addEventListener('pointerdown', event => { input.y = event.clientY / Math.max(1, height); input.serve = true; });
addEventListener('keydown', event => { keys.add(event.key.toLowerCase()); if (event.code === 'Space') input.serve = true; if (event.shiftKey) input.ability = true; });
addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
setInterval(() => {
  input.dy = (keys.has('w') || keys.has('arrowup') ? -1 : 0) + (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
  input.spin = (keys.has('a') || keys.has('arrowleft') ? -1 : 0) + (keys.has('d') || keys.has('arrowright') ? 1 : 0);
  if (state?.phase === 'playing') send({ type: 'input', ...input });
  input.serve = false;
  input.ability = false;
}, 33);

function initPractice() {
  practice.blocks = Array.from({ length: 28 }, () => ({ x: 320 + Math.random() * 960, y: 80 + Math.random() * 740, type: Math.random() < 0.16 ? 'heal' : Math.random() < 0.28 ? 'split' : 'brick' }));
  practice.balls = [{ x: 125, y: 450, vx: 0, vy: 0, radius: 10, held: true, spin: 0 }];
}
initPractice();

function updatePractice(dt) {
  practice.player.y += ((input.y * 900) - practice.player.y) * 0.32 + input.dy * 450 * dt;
  practice.player.y = Math.max(60, Math.min(840, practice.player.y));
  for (const ball of practice.balls) {
    if (ball.held) {
      ball.x = practice.player.x + 34;
      ball.y = practice.player.y;
      if (input.serve) { ball.held = false; ball.vx = 610; ball.vy = input.spin * 220; ball.spin = input.spin; }
      continue;
    }
    ball.vy += ball.spin * 260 * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.spin *= 0.995;
    if (ball.y < 30 || ball.y > 870) { ball.y = Math.max(30, Math.min(870, ball.y)); ball.vy *= -1; }
    practice.enemy.y += (ball.y - practice.enemy.y) * 0.055;
    if (ball.vx < 0 && Math.abs(ball.x - practice.player.x) < 26 && Math.abs(ball.y - practice.player.y) < practice.player.h / 2 + 10) { ball.x = practice.player.x + 30; ball.vx = Math.abs(ball.vx); ball.vy += (ball.y - practice.player.y) * 5 + input.spin * 180; ball.spin += input.spin; practice.score += 10; }
    if (ball.vx > 0 && Math.abs(ball.x - practice.enemy.x) < 26 && Math.abs(ball.y - practice.enemy.y) < practice.enemy.h / 2 + 10) { ball.x = practice.enemy.x - 30; ball.vx = -Math.abs(ball.vx); ball.vy += (ball.y - practice.enemy.y) * 4; }
    for (let i = practice.blocks.length - 1; i >= 0; i -= 1) {
      const block = practice.blocks[i];
      if (Math.abs(ball.x - block.x) < 25 && Math.abs(ball.y - block.y) < 25) {
        practice.blocks.splice(i, 1);
        ball.vx *= -1;
        practice.score += 18;
        if (block.type === 'heal') practice.hp = Math.min(8, practice.hp + 1);
        if (block.type === 'split' && practice.balls.length < 3) practice.balls.push({ ...ball, vx: -ball.vx, vy: -ball.vy });
      }
    }
    if (ball.x > 1590) { practice.enemyHp -= 1; ball.held = true; }
    if (ball.x < 10) { practice.hp -= 1; ball.held = true; }
  }
  if (practice.blocks.length < 4 || practice.hp <= 0 || practice.enemyHp <= 0) { practice.hp = 5; practice.enemyHp = 10; initPractice(); }
}

function lerp(a, b, t) { return a + (b - a) * t; }
function interpolatedState() {
  if (!state || !previousState || previousState.room !== state.room) return state;
  const span = Math.max(16, currentAt - previousAt);
  const t = Math.max(0, Math.min(1, (performance.now() - currentAt) / span + 0.18));
  return {
    ...state,
    players: state.players.map(p => {
      const old = previousState.players?.find(x => x.id === p.id);
      return old ? { ...p, x: lerp(old.x, p.x, t), y: lerp(old.y, p.y, t) } : p;
    }),
    balls: state.balls.map((b, i) => {
      const old = previousState.balls?.[i];
      return old ? { ...b, x: lerp(old.x, b.x, t), y: lerp(old.y, b.y, t) } : b;
    })
  };
}

function drawArenaBase() {
  const grd = ctx.createRadialGradient(width / 2, height * 0.35, 20, width / 2, height / 2, Math.max(width, height));
  grd.addColorStop(0, '#17224d');
  grd.addColorStop(0.55, '#070c1d');
  grd.addColorStop(1, '#03040b');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(128,247,255,.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 72) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 0; y < height; y += 72) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,209,102,.40)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height); ctx.stroke();
}
function text(label, y, size = 24) { ctx.fillStyle = 'rgba(245,247,255,.93)'; ctx.font = `950 ${size}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(label, width / 2, y); }
function drawPractice() {
  for (const block of practice.blocks) drawBlock(block);
  drawPaddle(practice.player.x, practice.player.y, practice.player.h, palette.cyan, 'YOU', 'left');
  drawPaddle(practice.enemy.x, practice.enemy.y, practice.enemy.h, palette.pink, 'SIM', 'right');
  for (const ball of practice.balls) drawBall(ball);
  ctx.fillStyle = palette.muted; ctx.font = '800 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(`solo practice · score ${practice.score} · HP ${practice.hp} · click/space to serve`, width / 2, height - 22);
}
function drawNetworkGame(s) {
  ctx.fillStyle = palette.text; ctx.font = '950 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText(`MULTIPLAYER · L ${s.level} · HP ${s.hp}/${s.maxHp} · SHIELD ${s.shields} · ENEMY ${s.enemyHp} · COMBO ${s.combo}`, width / 2, 28);
  for (const hazard of s.hazards || []) drawHazard(hazard);
  for (const block of s.blocks || []) drawBlock(block);
  for (const player of s.players || []) drawPaddle(player.x, player.y, player.height, player.team === 'left' ? palette.cyan : palette.pink, `${player.name} · ${player.role}`, player.team, player.energy);
  for (const ball of s.balls || []) drawBall({ x: ball.x, y: ball.y, radius: ball.radius, spin: ball.spin });
  if (s.phase === 'upgrade') text(s.hostId === myId ? 'Choose one of five upgrades' : 'Host choosing one of five upgrades', height / 2, 24);
}
function drawPaddle(x, y, h, color, label, side, energy = 0) {
  ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 20; ctx.fillStyle = color; ctx.fillRect(sx(x - 9), sy(y - h / 2), sx(18), sy(h)); ctx.restore();
  ctx.fillStyle = 'white'; ctx.font = '800 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(label, sx(x), sy(y - h / 2 - 10));
  ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(sx(x - 18), sy(y + h / 2 + 7), sx(36), 4);
  ctx.fillStyle = palette.gold; ctx.fillRect(sx(x - 18), sy(y + h / 2 + 7), sx(36 * energy), 4);
}
function drawBall(ball) {
  const x = sx(ball.x), y = sy(ball.y), r = Math.max(5, sx(ball.radius || 10));
  ctx.save(); ctx.shadowColor = 'white'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (Math.abs(ball.spin || 0) > 0.25) { ctx.strokeStyle = (ball.spin > 0 ? palette.gold : palette.purple); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 7, 0, Math.PI * 1.4); ctx.stroke(); }
}
function drawBlock(block) {
  ctx.fillStyle = block.type === 'heal' ? palette.green : block.type === 'split' ? palette.gold : block.type === 'charge' ? palette.cyan : block.type === 'heavy' ? palette.pink : palette.purple;
  ctx.fillRect(sx(block.x - 12), sy(block.y - 12), sx(24), sy(24));
}
function drawHazard(hazard) {
  ctx.save(); ctx.strokeStyle = hazard.type === 'portal' ? palette.gold : palette.cyan; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 15; ctx.lineWidth = 3;
  if (hazard.type === 'portal') { ctx.beginPath(); ctx.arc(sx(hazard.x), sy(hazard.y), sx(hazard.radius), 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(sx(hazard.x2), sy(hazard.y2), sx(hazard.radius), 0, Math.PI * 2); ctx.stroke(); }
  if (hazard.type === 'net') { ctx.beginPath(); ctx.moveTo(sx(hazard.x), sy(hazard.y - hazard.height / 2)); ctx.lineTo(sx(hazard.x), sy(hazard.y + hazard.height / 2)); ctx.stroke(); }
  ctx.restore();
}

let lastFrame = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  drawArenaBase();
  const s = interpolatedState();
  if (!s || s.phase === 'lobby') {
    updatePractice(dt);
    drawPractice();
    text(s ? `PRACTICE LOBBY · ${s.players.length}/${s.settings.maxPlayers} · ROOM ${s.room}` : (connected ? 'SOLO PRACTICE · HOST OR JOIN' : 'CONNECTING'), 34, 18);
    text(s?.hostId === myId ? 'You are hosting. Configure, share, launch.' : s ? 'Waiting for host. Practice locally.' : 'Start the server, then host or join.', height / 2 - 100, 20);
  } else {
    drawNetworkGame(s);
  }
}
connect();
frame();
