import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import {
  addPlayer, chooseUpgrade, configureRoom, createGameState, fillBots, quickStartRoom, removeBots,
  resetField, serializeRoom, setInput, setPlayerReady, setPlayerRole, setPlayerTeam, startRoom, stepRoom
} from './game.js';
import { PRESETS, TICK_HZ, VERSION } from './constants.js';

const ROOT = normalize(join(fileURLToPath(new URL('.', import.meta.url)), '../..'));
const PUBLIC = join(ROOT, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const peerId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const cleanRoom = room => String(room || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function writeJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

function requestOrigin(request, port) {
  const proto = String(request.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const host = String(request.headers['x-forwarded-host'] || request.headers.host || `localhost:${port}`).split(',')[0].trim();
  return `${proto}://${host}`;
}

function linkBases(request, port) {
  const result = [requestOrigin(request, port) + '/'];
  for (const address of Object.values(networkInterfaces()).flat().filter(Boolean)) {
    if (address.family === 'IPv4' && !address.internal) result.push(`http://${address.address}:${port}/`);
  }
  return [...new Set(result)];
}
const inviteUrl = (base, roomCode) => `${base.replace(/\/$/, '')}/?room=${roomCode}`;

async function readJsonBody(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  if (!body.trim()) return {};
  return JSON.parse(body);
}

async function serveStatic(request, response) {
  const url = new URL(request.url, 'http://local');
  const path = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = normalize(join(PUBLIC, path));
  if (!filePath.startsWith(PUBLIC) || !existsSync(filePath)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  const body = await readFile(filePath);
  response.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream', 'cache-control': 'no-store' });
  response.end(body);
}

export function createServerApp({ port = 8080 } = {}) {
  const rooms = new Map();
  const peers = new Map();

  const send = (peer, payload) => {
    if (!peer?.response || peer.response.destroyed) return false;
    peer.response.write(`event: message\ndata: ${JSON.stringify(payload)}\n\n`);
    return true;
  };

  function broadcast(room, reason = 'state') {
    const state = serializeRoom(room, inviteUrl);
    for (const id of room.players.keys()) {
      const peer = peers.get(id);
      if (peer) send(peer, { type: 'state', reason, state });
    }
  }

  function createPeer() {
    const id = peerId();
    const peer = { id, response: null, room: '', lastSeen: Date.now() };
    peers.set(id, peer);
    return peer;
  }

  function createRoomForPeer(peer, request, message, autoStart = false) {
    if (peer.room && rooms.has(peer.room)) rooms.get(peer.room).players.delete(peer.id);
    const room = createGameState({ hostPeerId: peer.id, createMessage: message, linkBases: linkBases(request, port), existingRooms: rooms });
    rooms.set(room.code, room);
    addPlayer(room, peer.id, { name: message.name, role: message.role });
    peer.room = room.code;
    fillBots(room, message.fillTo || (autoStart ? room.settings.maxPlayers : Math.min(room.settings.maxPlayers, 1 + Number(room.settings.bots || 0))));
    resetField(room);
    if (autoStart) quickStartRoom(room);
    return room;
  }

  function handleMessage(request, peer, message) {
    peer.lastSeen = Date.now();
    if (message.type === 'create') { broadcast(createRoomForPeer(peer, request, message, false), 'host-created'); return { ok: true }; }
    if (message.type === 'quickstart') { broadcast(createRoomForPeer(peer, request, message, true), 'quickstart'); return { ok: true }; }
    if (message.type === 'join') {
      const room = rooms.get(cleanRoom(message.room));
      if (!room) return { ok: false, message: 'Room not found. Check the code or invite link.' };
      if (!addPlayer(room, peer.id, { name: message.name, role: message.role })) return { ok: false, message: 'Room is full.' };
      peer.room = room.code;
      room.serverMessage = `${room.players.get(peer.id).name} joined. Practice lobby active.`;
      broadcast(room, 'player-joined');
      return { ok: true };
    }

    const room = rooms.get(peer.room);
    if (!room) return { ok: false, message: 'No active room.' };
    const isHost = room.hostId === peer.id;
    if (message.type === 'input') { setInput(room, peer.id, message); return { ok: true }; }
    if (message.type === 'configure' && isHost) { configureRoom(room, message.settings || {}); broadcast(room, 'configured'); return { ok: true }; }
    if (message.type === 'fill_bots' && isHost) { fillBots(room, message.count || room.settings.maxPlayers); broadcast(room, 'bots-filled'); return { ok: true }; }
    if (message.type === 'remove_bots' && isHost) { removeBots(room); broadcast(room, 'bots-removed'); return { ok: true }; }
    if (message.type === 'quick_launch' && isHost) { quickStartRoom(room); broadcast(room, 'quick-launch'); return { ok: true }; }
    if (message.type === 'start' && isHost) { startRoom(room); broadcast(room, 'countdown'); return { ok: true }; }
    if (message.type === 'ready') { setPlayerReady(room, peer.id, message.ready); broadcast(room, 'ready'); return { ok: true }; }
    if (message.type === 'role') { setPlayerRole(room, peer.id, message.role); broadcast(room, 'role'); return { ok: true }; }
    if (message.type === 'team') { setPlayerTeam(room, peer.id, message.team); broadcast(room, 'team'); return { ok: true }; }
    if (message.type === 'links' && isHost && Array.isArray(message.links)) { room.links = message.links.slice(0, 8); broadcast(room, 'links'); return { ok: true }; }
    if (message.type === 'upgrade' && isHost && room.phase === 'upgrade') { chooseUpgrade(room, Number(message.index)); broadcast(room, 'upgrade'); return { ok: true }; }
    return { ok: false, message: 'Ignored or host-only action.' };
  }

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      if (request.method === 'OPTIONS') return writeJson(response, 200, { ok: true });
      if (url.pathname === '/api/health') return writeJson(response, 200, { ok: true, version: VERSION, rooms: rooms.size, peers: peers.size, maxPlayers: 8, presets: Object.keys(PRESETS), transport: 'sse', dependencies: [] });
      if (url.pathname === '/api/links') return writeJson(response, 200, { links: linkBases(request, port), tunnel: { status: 'none', url: '', error: '' }, message: 'Local-network links only. Share a listed link with players on the same Wi-Fi/network.' });
      if (url.pathname === '/api/public' && request.method === 'POST') return writeJson(response, 200, { ok: true, links: linkBases(request, port), tunnel: { status: 'none', url: '', error: '' }, message: 'Local-network links are ready. Share a listed link with players on the same network.' });
      if (url.pathname === '/api/session' && request.method === 'POST') return writeJson(response, 200, { ok: true, id: createPeer().id, version: VERSION });
      if (url.pathname === '/api/message' && request.method === 'POST') {
        const message = await readJsonBody(request);
        const peer = peers.get(String(message.id || '')) || createPeer();
        const result = handleMessage(request, peer, message);
        if (!result.ok && peer.response) send(peer, { type: 'error', message: result.message });
        return writeJson(response, result.ok ? 200 : 400, { ...result, id: peer.id });
      }
      if (url.pathname === '/events') {
        const id = String(url.searchParams.get('id') || '');
        const peer = peers.get(id);
        if (!peer) { response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); response.end('Unknown session'); return; }
        response.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store, no-transform', connection: 'keep-alive' });
        peer.response = response;
        peer.lastSeen = Date.now();
        send(peer, { type: 'hello', id: peer.id, version: VERSION });
        const room = rooms.get(peer.room);
        if (room) send(peer, { type: 'state', reason: 'reconnect', state: serializeRoom(room, inviteUrl) });
        const heartbeat = setInterval(() => { if (!response.destroyed) response.write(': heartbeat\n\n'); }, 15000);
        request.on('close', () => { clearInterval(heartbeat); if (peer.response === response) peer.response = null; });
        return;
      }
      return serveStatic(request, response);
    } catch (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(String(error?.stack || error));
    }
  });

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [id, peer] of peers) if (!peer.response && !peer.room && now - peer.lastSeen > 120000) peers.delete(id);
    for (const room of rooms.values()) {
      stepRoom(room, 1 / TICK_HZ);
      broadcast(room, 'tick');
    }
  }, 1000 / TICK_HZ);
  server.on('close', () => clearInterval(timer));

  return { server, rooms, peers };
}
