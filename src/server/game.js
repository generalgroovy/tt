import { ARENA, BOT_NAMES, MAX_PLAYERS, PRESETS, ROLES, UPGRADE_POOL, VERSION } from './constants.js';
import { createMission, missionSummary, progressMission } from './missions.js';
import { createSkillState, currentSkill, defaultTutorialEnabled, progressSkill, serializeSkill, skillSummary } from './tutorial.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const rand = (min, max) => min + Math.random() * (max - min);
const cleanName = value => String(value || 'Player').replace(/[<>]/g, '').trim().slice(0, 18) || 'Player';
const pick = array => array[Math.floor(Math.random() * array.length)];

function roomCode(existing) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  while (existing.has(code));
  return code;
}

export function baseMods() {
  return {
    speed: 1, spin: 1, extraBalls: 0, pierce: 0, magnet: 0, chargeRate: 1,
    mirrorAssist: false, forge: 0, splitter: 0, combo: 0, bossBane: 0,
    phase: 0, midNet: 0, tempo: 0, vamp: 0, drill: 0, calm: 0,
    levelAegis: 0, overdrive: 0, relay: 0, healBias: 0,
    dashDiscount: 0, botSkill: 0, riftScore: 0, spinSplash: 0,
    missionPay: 0, focusBurst: 0, coreScanner: 0, afterimage: 0, coachSignal: 0, trainingStabilizer: 0
  };
}

export function presetSettings(presetName = 'quickRaid') {
  return PRESETS[presetName] || PRESETS.quickRaid;
}

export function createGameState({ hostPeerId, createMessage, linkBases, existingRooms }) {
  const preset = presetSettings(createMessage.preset);
  const code = roomCode(existingRooms);
  const presetName = createMessage.preset || 'custom';
  const tutorialEnabled = createMessage.tutorialEnabled ?? createMessage.tutorial ?? defaultTutorialEnabled(presetName);
  const settings = {
    preset: presetName,
    mode: createMessage.mode || preset.mode,
    maxPlayers: clamp(Number(createMessage.maxPlayers || preset.maxPlayers || 8), 1, MAX_PLAYERS),
    difficulty: clamp(Number(createMessage.difficulty || preset.difficulty || 2), 1, 8),
    targetLevel: clamp(Number(createMessage.targetLevel || preset.targetLevel || 18), 3, 80),
    draftSize: 5,
    bots: clamp(Number(createMessage.bots ?? preset.bots ?? 0), 0, MAX_PLAYERS - 1),
    tutorialEnabled: !!tutorialEnabled
  };
  if (settings.mode !== 'versus') settings.mode = 'coop';
  return {
    version: VERSION,
    code,
    hostId: hostPeerId,
    phase: 'lobby',
    createdAt: Date.now(),
    settings,
    links: linkBases,
    serverMessage: 'Hosting active. Practice lobby is live. Fill bots or invite friends, then launch.',
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
    history: [],
    countdownEndsAt: 0,
    runStats: freshStats(),
    mission: createMission(settings.preset),
    skill: createSkillState(settings.preset, settings.tutorialEnabled),
    lastEvent: 'Lobby created. Practice is live.',
    director: { intensity: 0, pulse: 0, tip: 'Serve with Space/click. Curve with A/D.', mission: '', skill: '' }
  };
}

function freshStats() {
  return { serves: 0, shots: 0, saves: 0, misses: 0, blocks: 0, cores: 0, levelClears: 0, bestCombo: 0, dashes: 0, botSaves: 0, focusBursts: 0, spinShots: 0, resources: 0, missionCompletions: 0, upgrades: 0, teamLaunches: 0, startedAt: 0, endedAt: 0 };
}

export function addPlayer(room, peerId, { name, role, bot = false } = {}) {
  if (room.players.size >= room.settings.maxPlayers) return false;
  const chosenRole = ROLES[role] ? role : (bot ? pick(Object.keys(ROLES)) : 'guard');
  const spec = ROLES[chosenRole];
  const team = assignTeam(room);
  const slot = symmetricSlot(room, team);
  room.players.set(peerId, {
    id: peerId,
    name: cleanName(name || (bot ? nextBotName(room) : 'Player')),
    team,
    role: chosenRole,
    bot,
    x: slot.x,
    y: slot.y,
    homeY: slot.y,
    height: spec.height,
    energy: bot ? 0.25 : 0,
    ready: bot,
    input: { y: slot.y / ARENA.height, dy: 0, spin: 0, serve: false, ability: false }
  });
  rebalanceSlots(room);
  return true;
}

function nextBotName(room) {
  const used = new Set([...room.players.values()].map(p => p.name));
  for (const name of BOT_NAMES) if (!used.has(name)) return name;
  return `Bot ${room.players.size + 1}`;
}

export function fillBots(room, desired = room.settings.maxPlayers) {
  const target = clamp(Number(desired || room.settings.maxPlayers), room.players.size, room.settings.maxPlayers);
  let added = 0;
  while (room.players.size < target) {
    const id = `bot_${room.code}_${added}_${Math.random().toString(36).slice(2, 6)}`;
    if (addPlayer(room, id, { bot: true })) added += 1;
    else break;
  }
  if (added) {
    room.serverMessage = `Added ${added} bot ${added === 1 ? 'pilot' : 'pilots'}. Plug-and-play lobby ready.`;
    room.lastEvent = `${added} bots filled empty slots.`;
  }
  return added;
}

export function removeBots(room) {
  let removed = 0;
  for (const [id, player] of room.players) {
    if (player.bot) { room.players.delete(id); removed += 1; }
  }
  rebalanceSlots(room);
  room.serverMessage = removed ? `Removed ${removed} bot pilots.` : 'No bots to remove.';
  return removed;
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
    const gap = Math.min(112, ARENA.height / (players.length + 1));
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
  const guided = room.settings.tutorialEnabled && room.skill?.enabled !== false;
  const teachingPace = guided && (room.settings.preset === 'academy' || room.settings.preset === 'firstRun' || room.level <= 2);
  const skill = currentSkill(room.skill);
  const blockCount = Math.min(teachingPace ? 42 : 86, 12 + room.level * 2 + difficulty * (teachingPace ? 1.5 : 3));
  for (let i = 0; i < blockCount; i += 1) {
    room.blocks.push({ x: rand(270, ARENA.width - 270), y: rand(74, ARENA.height - 74), hp: Math.random() < 0.16 ? 2 : 1, type: blockType(room) });
  }
  room.hazards = [];
  if (!teachingPace && (room.level >= 4 || room.mods.phase)) room.hazards.push({ type: 'portal', x: ARENA.midX - 145, y: ARENA.height / 2, x2: ARENA.midX + 145, y2: ARENA.height / 2, radius: 36, cooldown: 0 });
  if (!teachingPace && (room.level >= 6 || room.mods.midNet)) room.hazards.push({ type: 'net', x: ARENA.midX, y: ARENA.height / 2, height: 180 + room.mods.midNet * 32, cooldown: 0 });
  if (!teachingPace && (room.level % 3 === 0 || room.settings.preset === 'chaosLab')) room.hazards.push({ type: 'surge', x: ARENA.midX, y: rand(160, ARENA.height - 160), radius: 44, cooldown: 0 });
  if (room.level % 5 === 0 || room.settings.preset === 'bossRush') room.blocks.push({ x: ARENA.midX, y: ARENA.height / 2, hp: 8 + room.level, type: 'core' });
  room.balls = [{ x: ARENA.midX - 220, y: ARENA.height / 2, vx: 0, vy: 0, radius: 10, spin: 0, held: true, team: 'left', damage: 1, pierce: 0, lastHitBy: '' }];
  for (let i = 0; i < room.mods.extraBalls; i += 1) {
    room.balls.push({ x: ARENA.midX - 150 + i * 18, y: ARENA.height / 2 + i * 22, vx: 420 + i * 40, vy: rand(-160, 160), radius: 9, spin: 0, held: false, team: 'left', damage: 1, pierce: 0, lastHitBy: '' });
  }
  room.director.tip = guided && skill ? skill.tip : room.settings.mode === 'versus' && room.level === 1 ? 'Versus tip: hold your lane, watch the mirrored side, and use A/D to curve returns.' : room.settings.mode === 'coop' && room.level === 1 ? 'Co-op tip: protect shared HP, let bots cover lanes, and chase the mission objective.' : room.level % 5 === 0 ? 'Boss core active: speed and Striker damage matter.' : room.level % 3 === 0 ? 'Surge wells reward confident angles.' : 'Protect HP; long rallies scale score and damage.';
  room.director.mission = missionSummary(room.mission);
  room.director.skill = skillSummary(room.skill);
}

function blockType(room) {
  const roll = Math.random();
  const forge = room.mods.forge * 0.03;
  if (roll < 0.08 + forge + room.mods.healBias * 0.03) return 'heal';
  if (roll < 0.22 + forge) return 'split';
  if (roll < 0.32 + forge) return 'charge';
  if (roll < 0.41 + forge) return 'heavy';
  if (roll < 0.46 + room.mods.spinSplash * 0.02) return 'volatile';
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
  room.runStats.upgrades = (room.runStats.upgrades || 0) + 1;
  progressSkill(room, 'upgrades');
  room.level += 1;
  room.phase = 'playing';
  room.serverMessage = `Upgrade selected: ${definition.name}. Level ${room.level} begins.`;
  room.upgrades = [];
  resetField(room);
  return true;
}

export function configureRoom(room, settings) {
  if (room.phase !== 'lobby') return;
  if (settings.preset && PRESETS[settings.preset]) {
    const preset = PRESETS[settings.preset];
    const keepTutorial = settings.tutorialEnabled ?? room.settings.tutorialEnabled ?? defaultTutorialEnabled(settings.preset);
    room.settings = { ...room.settings, preset: settings.preset, mode: preset.mode, maxPlayers: preset.maxPlayers, difficulty: preset.difficulty, targetLevel: preset.targetLevel, bots: preset.bots, tutorialEnabled: !!keepTutorial };
    room.mission = createMission(settings.preset);
    room.skill = createSkillState(settings.preset, room.settings.tutorialEnabled);
  }
  if (settings.mode === 'coop' || settings.mode === 'versus') room.settings.mode = settings.mode;
  if (settings.maxPlayers != null) room.settings.maxPlayers = clamp(Number(settings.maxPlayers), 1, MAX_PLAYERS);
  if (settings.difficulty != null) room.settings.difficulty = clamp(Number(settings.difficulty), 1, 8);
  if (settings.targetLevel != null) room.settings.targetLevel = clamp(Number(settings.targetLevel), 3, 80);
  if (settings.tutorialEnabled != null || settings.tutorial != null) {
    room.settings.tutorialEnabled = !!(settings.tutorialEnabled ?? settings.tutorial);
    room.skill = createSkillState(room.settings.preset, room.settings.tutorialEnabled);
  }
  trimExcessBots(room);
  redistributeTeams(room);
  for (const p of room.players.values()) p.ready = p.bot;
  rebalanceSlots(room);
  room.serverMessage = 'Host configuration updated. Ready states reset; practice continues until Start.';
  room.lastEvent = 'Lobby settings changed.';
  room.director.skill = skillSummary(room.skill);
}

function trimExcessBots(room) {
  while (room.players.size > room.settings.maxPlayers) {
    const bot = [...room.players.entries()].find(([, p]) => p.bot);
    if (!bot) break;
    room.players.delete(bot[0]);
  }
}

function redistributeTeams(room) {
  const players = [...room.players.values()];
  if (room.settings.mode === 'coop') for (const p of players) p.team = 'left';
  else players.forEach((p, index) => { p.team = index % 2 === 0 ? 'left' : 'right'; });
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
  room.lastEvent = `${player.name} moved to ${player.team}.`;
  rebalanceSlots(room);
}

export function setPlayerReady(room, playerId, ready) {
  const player = room.players.get(playerId);
  if (!player || room.phase !== 'lobby') return;
  player.ready = !!ready;
  room.lastEvent = `${player.name} is ${player.ready ? 'ready' : 'not ready'}.`;
}

export function setInput(room, playerId, message) {
  const player = room.players.get(playerId);
  if (!player || player.bot) return;
  player.input = { y: clamp(Number(message.y ?? 0.5), 0, 1), dy: clamp(Number(message.dy ?? 0), -1, 1), spin: clamp(Number(message.spin ?? 0), -1, 1), serve: !!message.serve, ability: !!message.ability };
}

export function startRoom(room) {
  room.phase = 'countdown';
  room.countdownEndsAt = Date.now() + 2800;
  room.serverMessage = 'Launch countdown started. Finish your practice rally.';
  room.level = Math.max(1, room.level);
  room.hp = room.maxHp;
  room.score = 0;
  room.combo = 0;
  room.rally = 0;
  room.runStats = freshStats();
  room.mission = createMission(room.settings.preset);
  for (const p of room.players.values()) p.ready = false;
  resetField(room);
}

export function quickStartRoom(room) {
  fillBots(room, room.settings.maxPlayers);
  startRoom(room);
}

export function stepRoom(room, dt) {
  if (room.phase === 'countdown') {
    updateBots(room, dt, true);
    if (Date.now() >= room.countdownEndsAt) {
      room.phase = 'playing';
      room.runStats.startedAt = Date.now();
      room.serverMessage = 'Run live. Build rally, protect HP, clear the room.';
      room.lastEvent = 'Multiplayer run launched.';
    } else return;
  }
  if (room.phase !== 'playing') return;
  updateBots(room, dt, false);
  const speedBoost = 1 + room.level * 0.014 + room.settings.difficulty * 0.015;
  for (const player of room.players.values()) updatePlayer(room, player, dt);
  for (const ball of room.balls) updateBall(room, ball, dt, speedBoost);
  room.balls = room.balls.slice(0, 8);
  handleLevelState(room);
}

function updateBots(room, dt, duringCountdown) {
  const balls = room.balls.filter(b => !b.held);
  for (const bot of [...room.players.values()].filter(p => p.bot)) {
    const inbound = balls.filter(b => bot.team === 'left' ? b.vx < 0 : b.vx > 0).sort((a, b) => Math.abs(a.x - bot.x) - Math.abs(b.x - bot.x))[0];
    const held = room.balls.find(b => b.held && b.team === bot.team);
    const focus = inbound || held || balls[0];
    const laneBias = (bot.homeY - ARENA.height / 2) * 0.08;
    const targetY = focus ? focus.y + laneBias : bot.homeY;
    const skill = 0.10 + room.mods.botSkill * 0.06 + (bot.role === 'runner' ? 0.04 : 0);
    bot.input.y = clamp(bot.input.y + ((targetY / ARENA.height) - bot.input.y) * (skill + dt), 0, 1);
    bot.input.dy = clamp((targetY - bot.y) / 170, -1, 1);
    bot.input.spin = clamp((ARENA.height / 2 - targetY) / 360 + rand(-0.18, 0.18), -1, 1);
    bot.input.serve = !!held && !duringCountdown && Math.random() < 0.12;
    bot.input.ability = bot.energy > 0.75 && Math.abs(targetY - bot.y) > 120;
  }
}

function updatePlayer(room, player, dt) {
  const role = ROLES[player.role];
  const dashCost = Math.max(0.18, 0.35 - room.mods.dashDiscount * 0.05);
  let dash = 0;
  if (player.input.ability && player.energy >= dashCost) {
    player.energy -= dashCost;
    dash = 260 * role.speed * Math.sign(player.input.dy || ((player.input.y * ARENA.height) - player.y) || 1);
    room.runStats.dashes += 1;
    progressSkill(room, 'dashes');
    room.lastEvent = `${player.name} dashed.`;
    if (room.mods.focusBurst || player.role === 'phantom') focusBurst(room, player);
  }
  const speed = 10.5 * role.speed + (room.mods.tempo && Math.abs(player.input.dy) > 0.1 ? room.mods.tempo : 0);
  player.y += ((clamp(player.input.y, 0, 1) * ARENA.height) - player.y) * Math.min(0.56, speed * dt) + clamp(player.input.dy, -1, 1) * 500 * role.speed * dt + dash * dt;
  player.y = clamp(player.y, 54, ARENA.height - 54);
  player.x = player.team === 'left' ? 72 : ARENA.width - 72;
  player.energy = clamp(player.energy + dt * (0.055 + (player.role === 'medic' ? 0.01 : 0)), 0, 1);
  if (player.role === 'anchor' && player.energy >= 1 && room.shields < 3) { room.shields += 1; player.energy = 0; }
  if (player.role === 'medic' && player.energy >= 1 && room.hp < room.maxHp) { room.hp += 1; player.energy = 0; room.lastEvent = `${player.name} restored 1 HP.`; }
}

function focusBurst(room, player) {
  let touched = 0;
  for (const ball of room.balls) {
    if (Math.abs(ball.x - player.x) < 190 && Math.abs(ball.y - player.y) < player.height + 90) {
      ball.vy += (ball.y < player.y ? -1 : 1) * (90 + 40 * room.mods.focusBurst);
      ball.spin = clamp(ball.spin + player.input.spin * 0.7 + (player.role === 'phantom' ? 0.35 : 0), -4.2, 4.2);
      room.score += 8;
      touched += 1;
    }
  }
  if (room.mods.afterimage) room.shields = Math.min(room.shields + 0.25, 5);
  if (touched) { room.runStats.focusBursts += 1; room.lastEvent = `${player.name} triggered focus burst.`; }
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
  capBallSpeed(ball, 850 + room.level * 18 + room.settings.difficulty * 18);
  if (ball.y < 30 || ball.y > ARENA.height - 30) { ball.y = clamp(ball.y, 30, ARENA.height - 30); ball.vy *= -1; ball.spin *= room.mods.calm ? 0.92 : 0.84; }
  collideHazards(room, ball, dt);
  collidePlayers(room, ball);
  collideBlocks(room, ball);
  if (ball.x > ARENA.width - 10) { if (room.settings.mode === 'versus') applyMiss(room); else room.enemyHp -= Math.max(1, Math.round(ball.damage + (room.level % 5 === 0 ? room.mods.bossBane : 0))); ball.held = true; ball.team = 'left'; }
  if (ball.x < 10) { applyMiss(room); ball.held = true; ball.team = room.settings.mode === 'versus' ? 'right' : 'left'; }
}

function launchBall(room, ball, holder, speedBoost) {
  const role = ROLES[holder.role];
  ball.held = false;
  ball.vx = (holder.team === 'left' ? 1 : -1) * 470 * speedBoost * room.mods.speed * (room.mods.overdrive && holder.energy >= 1 ? 1.12 : 1);
  ball.vy = holder.input.spin * 205 * role.spin;
  ball.spin = holder.input.spin * role.spin * room.mods.spin;
  ball.damage = role.power;
  ball.lastHitBy = holder.id;
  room.runStats.serves = (room.runStats.serves || 0) + 1;
  progressMission(room, 'serves');
  progressSkill(room, 'serves');
  if (room.mods.overdrive && holder.energy >= 1) holder.energy = 0;
}

function capBallSpeed(ball, maxSpeed) {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > maxSpeed) { const scale = maxSpeed / speed; ball.vx *= scale; ball.vy *= scale; }
}

function collideHazards(room, ball, dt) {
  for (const hazard of room.hazards) {
    if (hazard.type === 'portal') {
      if (hazard.cooldown <= 0 && Math.hypot(ball.x - hazard.x, ball.y - hazard.y) < hazard.radius) { ball.x = hazard.x2; ball.y = hazard.y2; ball.vx *= 1.02; hazard.cooldown = 1.0; if (room.mods.riftScore) room.score += 15; }
      else if (hazard.cooldown <= 0 && Math.hypot(ball.x - hazard.x2, ball.y - hazard.y2) < hazard.radius) { ball.x = hazard.x; ball.y = hazard.y; ball.vx *= 1.02; hazard.cooldown = 1.0; if (room.mods.riftScore) room.score += 15; }
    }
    if (hazard.type === 'net' && Math.abs(ball.x - ARENA.midX) < 8 && Math.abs(ball.y - hazard.y) < hazard.height / 2) { ball.vx *= -0.92; ball.x = ball.x < ARENA.midX ? ARENA.midX - 10 : ARENA.midX + 10; }
    if (hazard.type === 'surge' && Math.hypot(ball.x - hazard.x, ball.y - hazard.y) < hazard.radius) { ball.vx *= 1.006; ball.vy *= 1.006; room.score += 1; }
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
      if (Math.abs(player.input.spin) > 0.25) { room.runStats.spinShots += 1; progressSkill(room, 'spinShots'); }
      ball.damage = role.power + room.mods.drill * Math.min(2, Math.hypot(ball.vx, ball.vy) / 1000);
      if (room.mods.relay && room.lastHitter && room.lastHitter !== player.id) ball.damage += room.mods.relay * 0.25;
      ball.team = player.team; ball.lastHitBy = player.id; room.lastHitter = player.id;
      player.energy = clamp(player.energy + 0.08 * room.mods.chargeRate, 0, 1);
      room.runStats.shots += 1; room.runStats.saves += 1; if (player.bot) room.runStats.botSaves += 1; progressMission(room, 'shots'); progressMission(room, 'saves'); progressSkill(room, 'saves');
      room.lastEvent = `${player.name} returned the ball.`;
      room.rally += 1; room.combo = Math.min(99, room.combo + 1); room.score += Math.round(8 + room.combo * room.mods.combo); room.runStats.bestCombo = Math.max(room.runStats.bestCombo, room.combo); progressMission(room, 'combo', room.combo);
      if (room.mods.vamp && room.rally % 18 === 0) room.hp = clamp(room.hp + 1, 1, room.maxHp);
    }
  }
}

function collideBlocks(room, ball) {
  for (let i = room.blocks.length - 1; i >= 0; i -= 1) {
    const block = room.blocks[i];
    if (Math.abs(ball.x - block.x) >= 25 || Math.abs(ball.y - block.y) >= 25) continue;
    block.hp -= 1;
    if (ball.pierce <= 0) ball.vx *= -1; else ball.pierce -= 1;
    ball.vy += rand(-80, 80);
    room.score += 20 + room.combo; room.runStats.blocks += 1; progressMission(room, 'blocks'); progressSkill(room, 'blocks');
    if (block.hp > 0) continue;
    room.blocks.splice(i, 1);
    if (block.type === 'core') { room.enemyHp -= Math.max(2, Math.round(ball.damage + room.mods.coreScanner)); room.runStats.cores += 1; progressMission(room, 'cores'); room.lastEvent = 'Boss core cracked.'; }
    if (block.type === 'heal') { room.hp = clamp(room.hp + 1, 1, room.maxHp); room.runStats.resources += 1; progressSkill(room, 'resources'); }
    if (block.type === 'charge') { for (const p of room.players.values()) p.energy = clamp(p.energy + 0.12, 0, 1); room.runStats.resources += 1; progressSkill(room, 'resources'); }
    if (block.type === 'volatile' || (room.mods.spinSplash && Math.abs(ball.spin) > 1.7)) splashBlocks(room, block, ball);
    if (block.type === 'split' && room.balls.length < 7) room.balls.push({ ...ball, vx: -ball.vx * (room.mods.splitter ? 0.82 : 0.95), vy: -ball.vy * 0.7, radius: Math.max(8, ball.radius - 1), held: false });
    if (room.mods.pierce && room.combo % 3 === 0) ball.pierce += room.mods.pierce;
  }
}

function splashBlocks(room, origin, ball) {
  for (let i = room.blocks.length - 1; i >= 0; i--) {
    const block = room.blocks[i];
    if (Math.hypot(block.x - origin.x, block.y - origin.y) < 72) { room.blocks.splice(i, 1); room.score += 10; room.runStats.blocks += 1; }
  }
  ball.vy += rand(-180, 180);
}

function applyMiss(room) {
  room.runStats.misses += 1; progressMission(room, 'misses');
  if (room.shields > 0) { room.shields -= 1; room.lastEvent = 'Shield absorbed a miss.'; return; }
  room.hp -= 1; room.lastEvent = 'Missed ball. Shared HP lost.'; room.combo = 0; room.rally = 0;
}

function handleLevelState(room) {
  if (room.enemyHp <= 0 || (room.settings.mode === 'versus' && room.score >= room.level * 320)) {
    if (room.level >= room.settings.targetLevel) {
      room.phase = 'lobby'; room.runStats.endedAt = Date.now(); room.serverMessage = 'Run cleared. Hosting remains active; configure another run.'; room.level = 1; room.hp = room.maxHp; room.score = 0; resetField(room);
    } else { room.phase = 'upgrade'; room.runStats.levelClears += 1; progressMission(room, 'clears'); room.upgrades = createUpgradeDraft(room); room.serverMessage = 'Level clear. Host chooses one of five upgrades.'; room.lastEvent = `Level ${room.level} cleared.`; }
  }
  if (room.hp <= 0) { room.phase = 'lobby'; room.runStats.endedAt = Date.now(); room.serverMessage = 'Run failed. Hosting remains active; practice lobby restored.'; room.level = 1; room.hp = room.maxHp; room.score = 0; resetField(room); }
}

export function serializeRoom(room, linkToInvite) {
  const players = [...room.players.values()];
  return {
    version: VERSION,
    room: room.code,
    hostId: room.hostId,
    phase: room.phase,
    serverMessage: room.serverMessage,
    settings: room.settings,
    countdown: room.phase === 'countdown' ? Math.max(0, Math.ceil((room.countdownEndsAt - Date.now()) / 1000)) : 0,
    ready: { count: players.filter(p => p.ready).length, total: players.length },
    runStats: room.runStats,
    mission: room.mission,
    skill: serializeSkill(room.skill),
    lastEvent: room.lastEvent,
    director: { ...room.director, mission: missionSummary(room.mission) },
    presets: PRESETS,
    roles: Object.fromEntries(Object.entries(ROLES).map(([key, value]) => [key, { label: value.label, trait: value.trait }])),
    level: room.level, hp: room.hp, maxHp: room.maxHp, shields: room.shields, enemyHp: room.enemyHp, score: room.score, combo: room.combo, rally: room.rally,
    invites: room.links.map(link => linkToInvite(link, room.code)),
    players: players.map(p => ({ id: p.id, name: p.name, team: p.team, role: p.role, bot: p.bot, x: p.x, y: p.y, height: p.height, energy: p.energy, ready: p.ready })),
    balls: room.balls.map(b => ({ x: b.x, y: b.y, radius: b.radius, spin: b.spin, team: b.team })),
    blocks: room.blocks,
    hazards: room.hazards,
    upgrades: room.upgrades
  };
}
