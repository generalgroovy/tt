import { ARENA, MAX_PLAYERS, ROLES, UPGRADE_POOL } from './constants.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const rand = (min, max) => min + Math.random() * (max - min);
const roomCode = existing => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  while (existing.has(code));
  return code;
};
const cleanName = value => String(value || 'Player').replace(/[<>]/g, '').trim().slice(0, 18) || 'Player';

export function baseMods() {
  return {
    speed: 1, spin: 1, extraBalls: 0, pierce: 0, magnet: 0, chargeRate: 1,
    mirrorAssist: false, forge: 0, splitter: 0, combo: 0, bossBane: 0,
    phase: 0, midNet: 0, tempo: 0, vamp: 0, drill: 0, calm: 0,
    levelAegis: 0, overdrive: 0, relay: 0, healBias: 0
  };
}

export function createGameState({ hostPeerId, createMessage, linkBases, existingRooms }) {
  const code = roomCode(existingRooms);
  return {
    code,
    hostId: hostPeerId,
    phase: 'lobby',
    createdAt: Date.now(),
    settings: {
      mode: createMessage.mode === 'versus' ? 'versus' : 'coop',
      maxPlayers: clamp(Number(createMessage.maxPlayers || 8), 1, MAX_PLAYERS),
      difficulty: clamp(Number(createMessage.difficulty || 2), 1, 8),
      targetLevel: clamp(Number(createMessage.targetLevel || 18), 3, 80),
      draftSize: 5
    },
    links: linkBases,
    serverMessage: 'Hosting active. Practice lobby is live. Configure, share, then start.',
    players: new Map(),
    level: 1,
    maxHp: 8,
    hp: 8,
    shields: 0,
    enemyHp: 12,
    score: 0,
    combo: 0,
    rally: 0,
    lastHitter: '',
    mods: baseMods(),
    balls: [],
    blocks: [],
    hazards: [],
    upgrades: [],
    history: []
  };
}

export function addPlayer(room, peerId, { name, role }) {
  if (room.players.size >= room.settings.maxPlayers) return false;
  const chosenRole = ROLES[role] ? role : 'guard';
  const spec = ROLES[chosenRole];
  const team = assignTeam(room);
  const slot = symmetricSlot(room, team);
  room.players.set(peerId, {
    id: peerId,
    name: cleanName(name),
    team,
    role: chosenRole,
    x: slot.x,
    y: slot.y,
    homeY: slot.y,
    height: spec.height,
    energy: 0,
    ready: false,
    input: { y: slot.y / ARENA.height, dy: 0, spin: 0, serve: false, ability: false }
  });
  rebalanceSlots(room);
  return true;
}

function assignTeam(room) {
  if (room.settings.mode !== 'versus') return 'left';
  const left = [...room.players.values()].filter(p => p.team === 'left').length;
  const right = [...room.players.values()].filter(p => p.team === 'right').length;
  return right < left ? 'right' : 'left';
}

function symmetricSlot(room, team) {
  const count = [...room.players.values()].filter(p => p.team === team).length;
  const lanes = [-315, -225, -135, -45, 45, 135, 225, 315];
  return { x: team === 'left' ? 72 : ARENA.width - 72, y: clamp(ARENA.height / 2 + lanes[count % lanes.length], 74, ARENA.height - 74) };
}

export function rebalanceSlots(room) {
  for (const team of ['left', 'right']) {
    const players = [...room.players.values()].filter(p => p.team === team);
    const gap = Math.min(110, ARENA.height / (players.length + 1));
    players.forEach((p, index) => {
      p.x = team === 'left' ? 72 : ARENA.width - 72;
      p.homeY = ARENA.height / 2 + (index - (players.length - 1) / 2) * gap;
      p.y = clamp(p.y || p.homeY, 72, ARENA.height - 72);
    });
  }
}

export function resetField(room) {
  const difficulty = room.settings.difficulty;
  room.enemyHp = Math.round(10 + room.level * (2.8 + difficulty * 0.55) + (room.level % 5 === 0 ? 12 : 0));
  room.combo = 0;
  room.rally = 0;
  room.blocks = [];
  const blockCount = Math.min(80, 18 + room.level * 2 + difficulty * 3);
  for (let i = 0; i < blockCount; i += 1) {
    room.blocks.push({ x: rand(270, ARENA.width - 270), y: rand(74, ARENA.height - 74), hp: Math.random() < 0.16 ? 2 : 1, type: blockType(room) });
  }
  room.hazards = [];
  if (room.level >= 4 || room.mods.phase) room.hazards.push({ type: 'portal', x: ARENA.midX - 145, y: ARENA.height / 2, x2: ARENA.midX + 145, y2: ARENA.height / 2, radius: 36, cooldown: 0 });
  if (room.level >= 6 || room.mods.midNet) room.hazards.push({ type: 'net', x: ARENA.midX, y: ARENA.height / 2, height: 180 + room.mods.midNet * 32, cooldown: 0 });
  room.balls = [{ x: ARENA.midX - 220, y: ARENA.height / 2, vx: 0, vy: 0, radius: 10, spin: 0, held: true, team: 'left', damage: 1, pierce: 0, lastHitBy: '' }];
  for (let i = 0; i < room.mods.extraBalls; i += 1) {
    room.balls.push({ x: ARENA.midX - 150 + i * 18, y: ARENA.height / 2 + i * 22, vx: 420 + i * 40, vy: rand(-160, 160), radius: 9, spin: 0, held: false, team: 'left', damage: 1, pierce: 0, lastHitBy: '' });
  }
}

function blockType(room) {
  const roll = Math.random();
  const forge = room.mods.forge * 0.03;
  if (roll < 0.08 + forge + room.mods.healBias * 0.03) return 'heal';
  if (roll < 0.22 + forge) return 'split';
  if (roll < 0.32 + forge) return 'charge';
  if (roll < 0.41 + forge) return 'heavy';
  return 'brick';
}

export function createUpgradeDraft(room) {
  const used = new Set();
  const deck = UPGRADE_POOL.filter(u => !room.history.includes(u.id) || ['heart', 'shield', 'echo', 'garden'].includes(u.id));
  const draft = [];
  while (draft.length < room.settings.draftSize && deck.length) {
    const upgrade = deck[Math.floor(Math.random() * deck.length)];
    if (!used.has(upgrade.id)) {
      used.add(upgrade.id);
      draft.push({ id: upgrade.id, name: upgrade.name, group: upgrade.group, desc: upgrade.desc });
    }
  }
  return draft;
}

export function chooseUpgrade(room, index) {
  const selected = room.upgrades[index];
  if (!selected) return false;
  const definition = UPGRADE_POOL.find(u => u.id === selected.id);
  if (!definition) return false;
  definition.effect(room);
  room.history.push(definition.id);
  room.level += 1;
  room.phase = 'playing';
  room.serverMessage = `Upgrade selected: ${definition.name}. Level ${room.level} begins.`;
  room.upgrades = [];
  resetField(room);
  return true;
}

export function configureRoom(room, settings) {
  if (room.phase !== 'lobby') return;
  if (settings.mode === 'coop' || settings.mode === 'versus') room.settings.mode = settings.mode;
  if (settings.maxPlayers != null) room.settings.maxPlayers = clamp(Number(settings.maxPlayers), 1, MAX_PLAYERS);
  if (settings.difficulty != null) room.settings.difficulty = clamp(Number(settings.difficulty), 1, 8);
  if (settings.targetLevel != null) room.settings.targetLevel = clamp(Number(settings.targetLevel), 3, 80);
  if (room.settings.mode === 'coop') for (const p of room.players.values()) p.team = 'left';
  rebalanceSlots(room);
  room.serverMessage = 'Host configuration updated. Practice continues until Start.';
}

export function setPlayerRole(room, playerId, role) {
  const player = room.players.get(playerId);
  if (!player || !ROLES[role] || room.phase !== 'lobby') return;
  player.role = role;
  player.height = ROLES[role].height;
  room.serverMessage = `${player.name} selected ${ROLES[role].label}.`;
}

export function setPlayerTeam(room, playerId, team) {
  const player = room.players.get(playerId);
  if (!player || room.phase !== 'lobby' || room.settings.mode !== 'versus') return;
  player.team = team === 'right' ? 'right' : 'left';
  rebalanceSlots(room);
}

export function setInput(room, playerId, message) {
  const player = room.players.get(playerId);
  if (!player) return;
  player.input = { y: clamp(Number(message.y ?? 0.5), 0, 1), dy: clamp(Number(message.dy ?? 0), -1, 1), spin: clamp(Number(message.spin ?? 0), -1, 1), serve: !!message.serve, ability: !!message.ability };
}

export function startRoom(room) {
  room.phase = 'playing';
  room.serverMessage = 'Host started the run. Multiplayer sync active.';
  room.level = Math.max(1, room.level);
  room.hp = room.maxHp;
  resetField(room);
}

export function stepRoom(room, dt) {
  if (room.phase !== 'playing') return;
  const speedBoost = 1 + room.level * 0.018 + room.settings.difficulty * 0.02;
  for (const player of room.players.values()) updatePlayer(room, player, dt);
  for (const ball of room.balls) updateBall(room, ball, dt, speedBoost);
  room.balls = room.balls.slice(0, 8);
  handleLevelState(room);
}

function updatePlayer(room, player, dt) {
  const role = ROLES[player.role];
  const speed = 10.5 * role.speed + (room.mods.tempo && Math.abs(player.input.dy) > 0.1 ? room.mods.tempo : 0);
  player.y += ((clamp(player.input.y, 0, 1) * ARENA.height) - player.y) * Math.min(0.56, speed * dt) + clamp(player.input.dy, -1, 1) * 500 * role.speed * dt;
  player.y = clamp(player.y, 54, ARENA.height - 54);
  player.x = player.team === 'left' ? 72 : ARENA.width - 72;
  player.energy = clamp(player.energy + dt * 0.055, 0, 1);
  if (player.role === 'anchor' && player.energy >= 1 && room.shields < 3) {
    room.shields += 1;
    player.energy = 0;
  }
}

function updateBall(room, ball, dt, speedBoost) {
  if (ball.held) {
    const holder = [...room.players.values()].find(p => p.team === ball.team) || [...room.players.values()][0];
    if (!holder) return;
    ball.x = holder.x + (holder.team === 'left' ? 32 : -32);
    ball.y = holder.y;
    if (holder.input.serve) launchBall(room, ball, holder, speedBoost);
    return;
  }
  ball.vy += ball.spin * (230 + room.mods.magnet * Math.max(0, 1 - Math.abs(ball.x - ARENA.midX) / ARENA.midX) * 360) * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.spin *= room.mods.calm ? 0.998 : 0.995;
  if (ball.y < 30 || ball.y > ARENA.height - 30) {
    ball.y = clamp(ball.y, 30, ARENA.height - 30);
    ball.vy *= -1;
    ball.spin *= room.mods.calm ? 0.92 : 0.84;
  }
  collideHazards(room, ball, dt);
  collidePlayers(room, ball);
  collideBlocks(room, ball);
  if (ball.x > ARENA.width - 10) {
    if (room.settings.mode === 'versus') applyMiss(room);
    else room.enemyHp -= Math.max(1, Math.round(ball.damage + (room.level % 5 === 0 ? room.mods.bossBane : 0)));
    ball.held = true;
    ball.team = 'left';
  }
  if (ball.x < 10) {
    applyMiss(room);
    ball.held = true;
    ball.team = room.settings.mode === 'versus' ? 'right' : 'left';
  }
}

function launchBall(room, ball, holder, speedBoost) {
  const role = ROLES[holder.role];
  ball.held = false;
  ball.vx = (holder.team === 'left' ? 1 : -1) * 520 * speedBoost * room.mods.speed * (room.mods.overdrive && holder.energy >= 1 ? 1.12 : 1);
  ball.vy = holder.input.spin * 230 * role.spin;
  ball.spin = holder.input.spin * role.spin * room.mods.spin;
  ball.damage = role.power;
  ball.lastHitBy = holder.id;
  if (room.mods.overdrive && holder.energy >= 1) holder.energy = 0;
}

function collideHazards(room, ball, dt) {
  for (const hazard of room.hazards) {
    if (hazard.type === 'portal') {
      if (hazard.cooldown <= 0 && Math.hypot(ball.x - hazard.x, ball.y - hazard.y) < hazard.radius) {
        ball.x = hazard.x2;
        ball.y = hazard.y2;
        ball.vx *= 1.02;
        hazard.cooldown = 1.0;
      } else if (hazard.cooldown <= 0 && Math.hypot(ball.x - hazard.x2, ball.y - hazard.y2) < hazard.radius) {
        ball.x = hazard.x;
        ball.y = hazard.y;
        ball.vx *= 1.02;
        hazard.cooldown = 1.0;
      }
    }
    if (hazard.type === 'net' && Math.abs(ball.x - ARENA.midX) < 8 && Math.abs(ball.y - hazard.y) < hazard.height / 2) {
      ball.vx *= -0.92;
      ball.x = ball.x < ARENA.midX ? ARENA.midX - 10 : ARENA.midX + 10;
    }
    hazard.cooldown = Math.max(0, (hazard.cooldown || 0) - dt);
  }
}

function collidePlayers(room, ball) {
  for (const player of room.players.values()) {
    const inbound = player.team === 'left' ? ball.vx < 0 : ball.vx > 0;
    if (!inbound) continue;
    if (Math.abs(ball.x - player.x) < 28 && Math.abs(ball.y - player.y) < player.height / 2 + ball.radius) {
      const role = ROLES[player.role];
      ball.x = player.x + (player.team === 'left' ? 30 : -30);
      ball.vx = Math.abs(ball.vx) * (player.team === 'left' ? 1 : -1) * (1.014 + player.energy * 0.018);
      ball.vy += (ball.y - player.y) * 5.2 + player.input.spin * 190 * role.spin;
      ball.spin = clamp(ball.spin + player.input.spin * role.spin * room.mods.spin, -3.8, 3.8);
      ball.damage = role.power + room.mods.drill * Math.min(2, Math.hypot(ball.vx, ball.vy) / 1000);
      if (room.mods.relay && room.lastHitter && room.lastHitter !== player.id) ball.damage += room.mods.relay * 0.25;
      ball.team = player.team;
      ball.lastHitBy = player.id;
      room.lastHitter = player.id;
      player.energy = clamp(player.energy + 0.08 * room.mods.chargeRate, 0, 1);
      room.rally += 1;
      room.combo = Math.min(99, room.combo + 1);
      room.score += Math.round(8 + room.combo * room.mods.combo);
      if (room.mods.vamp && room.rally % 18 === 0) room.hp = clamp(room.hp + 1, 1, room.maxHp);
    }
  }
}

function collideBlocks(room, ball) {
  for (let i = room.blocks.length - 1; i >= 0; i -= 1) {
    const block = room.blocks[i];
    if (Math.abs(ball.x - block.x) >= 25 || Math.abs(ball.y - block.y) >= 25) continue;
    block.hp -= 1;
    if (ball.pierce <= 0) ball.vx *= -1;
    else ball.pierce -= 1;
    ball.vy += rand(-80, 80);
    room.score += 20 + room.combo;
    if (block.hp > 0) continue;
    room.blocks.splice(i, 1);
    if (block.type === 'heal') room.hp = clamp(room.hp + 1, 1, room.maxHp);
    if (block.type === 'charge') for (const p of room.players.values()) p.energy = clamp(p.energy + 0.12, 0, 1);
    if (block.type === 'split' && room.balls.length < 7) room.balls.push({ ...ball, vx: -ball.vx * (room.mods.splitter ? 0.82 : 0.95), vy: -ball.vy * 0.7, radius: Math.max(8, ball.radius - 1), held: false });
    if (room.mods.pierce && room.combo % 3 === 0) ball.pierce += room.mods.pierce;
  }
}

function applyMiss(room) {
  if (room.shields > 0) {
    room.shields -= 1;
    return;
  }
  room.hp -= 1;
  room.combo = 0;
  room.rally = 0;
}

function handleLevelState(room) {
  if (room.enemyHp <= 0 || (room.settings.mode === 'versus' && room.score >= room.level * 320)) {
    if (room.level >= room.settings.targetLevel) {
      room.phase = 'lobby';
      room.serverMessage = 'Run cleared. Hosting remains active; configure another run.';
      room.level = 1;
      room.hp = room.maxHp;
      room.score = 0;
      resetField(room);
    } else {
      room.phase = 'upgrade';
      room.upgrades = createUpgradeDraft(room);
      room.serverMessage = 'Level clear. Host chooses one of five upgrades.';
    }
  }
  if (room.hp <= 0) {
    room.phase = 'lobby';
    room.serverMessage = 'Run failed. Hosting remains active; practice lobby restored.';
    room.level = 1;
    room.hp = room.maxHp;
    room.score = 0;
    resetField(room);
  }
}

export function serializeRoom(room, linkToInvite) {
  return {
    room: room.code,
    hostId: room.hostId,
    phase: room.phase,
    serverMessage: room.serverMessage,
    settings: room.settings,
    roles: Object.fromEntries(Object.entries(ROLES).map(([key, value]) => [key, { label: value.label, trait: value.trait }])),
    level: room.level,
    hp: room.hp,
    maxHp: room.maxHp,
    shields: room.shields,
    enemyHp: room.enemyHp,
    score: room.score,
    combo: room.combo,
    rally: room.rally,
    invites: room.links.map(link => linkToInvite(link, room.code)),
    players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, team: p.team, role: p.role, x: p.x, y: p.y, height: p.height, energy: p.energy, ready: p.ready })),
    balls: room.balls.map(b => ({ x: b.x, y: b.y, radius: b.radius, spin: b.spin, team: b.team })),
    blocks: room.blocks,
    hazards: room.hazards,
    upgrades: room.upgrades
  };
}
