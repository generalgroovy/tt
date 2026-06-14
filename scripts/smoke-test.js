import WebSocket from 'ws';
import { createServerApp } from '../src/server/app.js';
import { createUpgradeDraft, baseMods } from '../src/server/game.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function openSocket(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const messages = [];
    ws.on('message', raw => messages.push(JSON.parse(String(raw))));
    ws.once('open', () => resolve({ ws, messages, send: payload => ws.send(JSON.stringify(payload)) }));
    ws.once('error', reject);
  });
}
async function latestState(client, predicate, timeout = 1800) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const state = client.messages.filter(m => m.type === 'state').at(-1)?.state;
    if (state && (!predicate || predicate(state))) return state;
    await delay(30);
  }
  throw new Error('Timed out waiting for state');
}

const { server } = createServerApp({ port: 0 });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const html = await fetch(base).then(r => r.text());
if (!html.includes('Relay Rift')) throw new Error('HTML shell did not load');
const health = await fetch(`${base}/api/health`).then(r => r.json());
if (!health.ok || health.maxPlayers !== 8) throw new Error('Health endpoint failed');

const host = await openSocket(port);
host.send({ type: 'create', name: 'Host', mode: 'versus', maxPlayers: 8, difficulty: 4, targetLevel: 6, role: 'guard' });
const lobby = await latestState(host, s => s.phase === 'lobby' && s.serverMessage.includes('Hosting active') && s.invites.length);
if (lobby.settings.maxPlayers !== 8) throw new Error('8-player lobby not created');

const clients = [host];
const roles = ['striker', 'runner', 'vector', 'anchor', 'chaos', 'guard', 'runner'];
for (let i = 1; i < 8; i += 1) {
  const client = await openSocket(port);
  clients.push(client);
  client.send({ type: 'join', name: `P${i}`, room: lobby.room, role: roles[i - 1] });
  await delay(55);
}
const full = await latestState(host, s => s.players.length === 8);
if (full.players.filter(p => p.team === 'left').length !== 4) throw new Error('Left team not balanced');
if (full.players.filter(p => p.team === 'right').length !== 4) throw new Error('Right team not balanced');

host.send({ type: 'configure', settings: { difficulty: 5, targetLevel: 18 } });
await latestState(host, s => s.settings.difficulty === 5 && s.phase === 'lobby');
host.send({ type: 'start' });
await latestState(host, s => s.phase === 'playing');

const draft = createUpgradeDraft({ history: [], settings: { draftSize: 5 }, players: new Map(), mods: baseMods() });
if (draft.length !== 5) throw new Error('Upgrade draft is not five cards');

for (const client of clients) client.ws.close();
await delay(80);
server.close();
console.log('Smoke test passed: modular app, 8-player lobby, mirrored teams, launch, 5-card upgrade draft.');
