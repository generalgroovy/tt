import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { WebSocket, WebSocketServer } from 'ws';
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

function linkBases(request, port, tunnelUrl = '') {
  const result = [requestOrigin(request, port) + '/'];
  for (const address of Object.values(networkInterfaces()).flat().filter(Boolean)) {
    if (address.family === 'IPv4' && !address.internal) result.push(`http://${address.address}:${port}/`);
  }
  if (tunnelUrl) result.unshift(tunnelUrl.replace(/\/$/, '') + '/');
  return [...new Set(result)];
}
const inviteUrl = (base, roomCode) => `${base.replace(/\/$/, '')}/?room=${roomCode}`;

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
  const tunnel = { url: '', status: 'idle', error: '' };

  async function createPublicLink(request) {
    if (tunnel.url) return { ok: true, message: `Public link active: ${tunnel.url}`, links: linkBases(request, port, tunnel.url), tunnel };
    try {
      tunnel.status = 'starting';
      const module = await import('localtunnel');
      const localtunnel = module.default || module;
      const instance = await localtunnel({ port });
      tunnel.url = instance.url;
      tunnel.status = 'ready';
      tunnel.error = '';
      instance.on('close', () => { tunnel.url = ''; tunnel.status = 'closed'; });
      return { ok: true, message: `Public link active: ${tunnel.url}`, links: linkBases(request, port, tunnel.url), tunnel };
    } catch (error) {
      tunnel.status = 'error';
      tunnel.error = 'Public link failed. Run npm install, then retry.';
      return { ok: false, message: tunnel.error, detail: String(error?.message || error), links: linkBases(request, port, tunnel.url), tunnel };
    }
  }

  const server = createServer(async (request, response) => {
    try {
      if (request.url === '/api/health') return writeJson(response, 200, { ok: true, version: VERSION, rooms: rooms.size, peers: peers.size, maxPlayers: 8, presets: Object.keys(PRESETS) });
      if (request.url === '/api/links') return writeJson(response, 200, { links: linkBases(request, port, tunnel.url), tunnel });
      if (request.url === '/api/public' && request.method === 'POST') return writeJson(response, 200, await createPublicLink(request));
      return serveStatic(request, response);
    } catch (error) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(String(error?.stack || error));
    }
  });

  const socketServer = new WebSocketServer({ server, path: '/ws' });
  const send = (peer, payload) => { if (peer.ws.readyState === WebSocket.OPEN) peer.ws.send(JSON.stringify(payload)); };
  function broadcast(room, reason = 'state') {
    const state = serializeRoom(room, inviteUrl);
    for (const id of room.players.keys()) {
      const peer = peers.get(id);
      if (peer) send(peer, { type: 'state', reason, state });
    }
  }

  function createRoomForPeer(peer, request, message, autoStart = false) {
    if (peer.room && rooms.has(peer.room)) rooms.get(peer.room).players.delete(peer.id);
    const room = createGameState({ hostPeerId: peer.id, createMessage: message, linkBases: linkBases(request, port, tunnel.url), existingRooms: rooms });
    rooms.set(room.code, room);
    addPlayer(room, peer.id, { name: message.name, role: message.role });
    peer.room = room.code;
    fillBots(room, message.fillTo || (autoStart ? room.settings.maxPlayers : Math.min(room.settings.maxPlayers, 1 + Number(room.settings.bots || 0))));
    resetField(room);
    if (autoStart) quickStartRoom(room);
    return room;
  }

  socketServer.on('connection', (ws, request) => {
    const peer = { id: peerId(), ws, request, room: '' };
    peers.set(peer.id, peer);
    send(peer, { type: 'hello', id: peer.id, version: VERSION });

    ws.on('message', raw => {
      let message;
      try { message = JSON.parse(String(raw)); } catch { return send(peer, { type: 'error', message: 'Bad message.' }); }

      if (message.type === 'create') return broadcast(createRoomForPeer(peer, request, message, false), 'host-created');
      if (message.type === 'quickstart') return broadcast(createRoomForPeer(peer, request, message, true), 'quickstart');

      if (message.type === 'join') {
        const room = rooms.get(cleanRoom(message.room));
        if (!room) return send(peer, { type: 'error', message: 'Room not found. Check the code or invite link.' });
        if (!addPlayer(room, peer.id, { name: message.name, role: message.role })) return send(peer, { type: 'error', message: 'Room is full.' });
        peer.room = room.code;
        room.serverMessage = `${room.players.get(peer.id).name} joined. Practice lobby active.`;
        return broadcast(room, 'player-joined');
      }

      const room = rooms.get(peer.room);
      if (!room) return;
      const isHost = room.hostId === peer.id;

      if (message.type === 'input') return setInput(room, peer.id, message);
      if (message.type === 'configure' && isHost) { configureRoom(room, message.settings || {}); return broadcast(room, 'configured'); }
      if (message.type === 'fill_bots' && isHost) { fillBots(room, message.count || room.settings.maxPlayers); return broadcast(room, 'bots-filled'); }
      if (message.type === 'remove_bots' && isHost) { removeBots(room); return broadcast(room, 'bots-removed'); }
      if (message.type === 'quick_launch' && isHost) { quickStartRoom(room); return broadcast(room, 'quick-launch'); }
      if (message.type === 'start' && isHost) { startRoom(room); return broadcast(room, 'countdown'); }
      if (message.type === 'ready') { setPlayerReady(room, peer.id, message.ready); return broadcast(room, 'ready'); }
      if (message.type === 'role') { setPlayerRole(room, peer.id, message.role); return broadcast(room, 'role'); }
      if (message.type === 'team') { setPlayerTeam(room, peer.id, message.team); return broadcast(room, 'team'); }
      if (message.type === 'links' && isHost && Array.isArray(message.links)) { room.links = message.links.slice(0, 8); return broadcast(room, 'links'); }
      if (message.type === 'upgrade' && isHost && room.phase === 'upgrade') { chooseUpgrade(room, Number(message.index)); return broadcast(room, 'upgrade'); }
    });

    ws.on('close', () => {
      const room = rooms.get(peer.room);
      if (room) {
        room.players.delete(peer.id);
        if (!room.players.size || [...room.players.values()].every(p => p.bot)) rooms.delete(room.code);
        else {
          if (room.hostId === peer.id) room.hostId = [...room.players.keys()].find(id => !room.players.get(id)?.bot) || room.players.keys().next().value;
          room.serverMessage = 'A player disconnected. Hosting remains active.';
          broadcast(room, 'disconnect');
        }
      }
      peers.delete(peer.id);
    });
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
