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
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};
const peerId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const cleanRoom = room => String(room || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function writeJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
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

async function serveStatic(request, response) {
  const url = new URL(request.url, 'http://local');
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = normalize(join(PUBLIC, pathname));
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

  function getPeer(id) {
    if (!id || !peers.has(id)) {
      const peer = { id: peerId(), room: '', response: null, request: null, lastSeen: Date.now() };
      peers.set(peer.id, peer);
      return peer;
    }
    const peer = peers.get(id);
    peer.lastSeen = Date.now();
    return peer;
  }

  function sse(peer, payload) {
    if (!peer?.response || peer.response.destroyed) return;
    peer.response.write(`data: ${JSON.stringify(payload)}\n\n`);
  }

  function broadcast(room, reason = 'state') {
    const state = serializeRoom(room, inviteUrl);
    for (const id of room.players.keys()) {
      const peer = peers.get(id);
      if (peer) sse(peer, { type: 'state', reason, state });
    }
  }

  function stateForPeer(peer) {
    const room = rooms.get(peer.room);
    return room ? serializeRoom(room, inviteUrl) : null;
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

  function detachPeer(peer, removePlayer = true) {
    if (!peer) return;
    const room = rooms.get(peer.room);
    peer.response = null;
    if (!removePlayer || !room) return;
    room.players.delete(peer.id);
    if (!room.players.size || [...room.players.values()].every(p => p.bot)) rooms.delete(room.code);
    else {
      if (room.hostId === peer.id) room.hostId = [...room.players.keys()].find(id => !room.players.get(id)?.bot) || room.players.keys().next().value;
      room.serverMessage = 'A player disconnected. Hosting remains active.';
      broadcast(room, 'disconnect');
    }
    peer.room = '';
  }

  async function handleCommand(request, response) {
    let message;
    try { message = await readJson(request); }
    catch { return writeJson(response, 400, { ok: false, message: 'Bad JSON.' }); }
    const peer = getPeer(message.peerId || message.id);
    let room;

    if (message.type === 'create') {
      room = createRoomForPeer(peer, request, message, false);
      broadcast(room, 'host-created');
      return writeJson(response, 200, { ok: true, id: peer.id, state: stateForPeer(peer) });
    }
    if (message.type === 'quickstart') {
      room = createRoomForPeer(peer, request, message, true);
      broadcast(room, 'quickstart');
      return writeJson(response, 200, { ok: true, id: peer.id, state: stateForPeer(peer) });
    }
    if (message.type === 'join') {
      room = rooms.get(cleanRoom(message.room));
      if (!room) return writeJson(response, 404, { ok: false, id: peer.id, message: 'Room not found. Check the code or invite link.' });
      if (!addPlayer(room, peer.id, { name: message.name, role: message.role })) return writeJson(response, 409, { ok: false, id: peer.id, message: 'Room is full.' });
      peer.room = room.code;
      room.serverMessage = `${room.players.get(peer.id).name} joined. Practice lobby active.`;
      broadcast(room, 'player-joined');
      return writeJson(response, 200, { ok: true, id: peer.id, state: stateForPeer(peer) });
    }

    room = rooms.get(peer.room);
    if (!room) return writeJson(response, 409, { ok: false, id: peer.id, message: 'You are not in a room.' });
    const isHost = room.hostId === peer.id;

    if (message.type === 'input') setInput(room, peer.id, message);
    else if (message.type === 'configure' && isHost) { configureRoom(room, message.settings || {}); broadcast(room, 'configured'); }
    else if (message.type === 'fill_bots' && isHost) { fillBots(room, message.count || room.settings.maxPlayers); broadcast(room, 'bots-filled'); }
    else if (message.type === 'remove_bots' && isHost) { removeBots(room); broadcast(room, 'bots-removed'); }
    else if (message.type === 'quick_launch' && isHost) { quickStartRoom(room); broadcast(room, 'quick-launch'); }
    else if (message.type === 'start' && isHost) { startRoom(room); broadcast(room, 'countdown'); }
    else if (message.type === 'ready') { setPlayerReady(room, peer.id, message.ready); broadcast(room, 'ready'); }
    else if (message.type === 'role') { setPlayerRole(room, peer.id, message.role); broadcast(room, 'role'); }
    else if (message.type === 'team') { setPlayerTeam(room, peer.id, message.team); broadcast(room, 'team'); }
    else if (message.type === 'links' && isHost && Array.isArray(message.links)) { room.links = message.links.slice(0, 8); broadcast(room, 'links'); }
    else if (message.type === 'upgrade' && isHost && room.phase === 'upgrade') { chooseUpgrade(room, Number(message.index)); broadcast(room, 'upgrade'); }
    else if (message.type === 'leave') { detachPeer(peer, true); return writeJson(response, 200, { ok: true, id: peer.id }); }
    else if (!['input'].includes(message.type)) return writeJson(response, 403, { ok: false, id: peer.id, message: isHost ? 'Unknown command.' : 'Host-only command or unknown command.' });

    return writeJson(response, 200, { ok: true, id: peer.id, state: stateForPeer(peer) });
  }

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      if (request.method === 'GET' && url.pathname === '/api/health') return writeJson(response, 200, { ok: true, transport: 'sse-http', dependencyFree: true, version: VERSION, rooms: rooms.size, peers: peers.size, maxPlayers: 8, presets: Object.keys(PRESETS) });
      if (request.method === 'GET' && url.pathname === '/api/session') {
        const peer = getPeer(url.searchParams.get('id'));
        return writeJson(response, 200, { ok: true, id: peer.id, version: VERSION, transport: 'sse-http' });
      }
      if (request.method === 'GET' && url.pathname === '/api/links') return writeJson(response, 200, { links: linkBases(request, port), publicLink: false, message: 'Dependency-free build: share a detected LAN link with players on the same network.' });
      if (request.method === 'POST' && url.pathname === '/api/public') return writeJson(response, 200, { ok: true, links: linkBases(request, port), publicLink: false, message: 'Dependency-free build: no tunnel dependency. Share the LAN link with players on the same network.' });
      if (request.method === 'GET' && url.pathname === '/api/state') {
        const peer = getPeer(url.searchParams.get('id'));
        return writeJson(response, 200, { ok: true, id: peer.id, state: stateForPeer(peer) });
      }
      if (request.method === 'POST' && url.pathname === '/api/command') return handleCommand(request, response);
      if (request.method === 'GET' && url.pathname === '/api/events') {
        const peer = getPeer(url.searchParams.get('id'));
        peer.request = request;
        peer.response = response;
        response.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-store, no-transform',
          connection: 'keep-alive',
          'x-accel-buffering': 'no'
        });
        sse(peer, { type: 'hello', id: peer.id, version: VERSION });
        const state = stateForPeer(peer);
        if (state) sse(peer, { type: 'state', reason: 'connected', state });
        request.on('close', () => detachPeer(peer, false));
        return;
      }
      return serveStatic(request, response);
    } catch (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(String(error?.stack || error));
    }
  });

  const timer = setInterval(() => {
    for (const room of rooms.values()) {
      stepRoom(room, 1 / TICK_HZ);
      broadcast(room, 'tick');
    }
  }, 1000 / TICK_HZ);
  server.on('close', () => clearInterval(timer));

  return { server, rooms, peers };
}
