import { createServerApp } from '../src/server/app.js';
import { createUpgradeDraft, baseMods } from '../src/server/game.js';
import { VERSION } from '../src/server/constants.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const { server, rooms } = createServerApp({ port: 0 });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

async function post(path, payload = {}) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || `${path} failed`);
  return data;
}

const html = await fetch(base).then(r => r.text());
if (!html.includes('Instant Run') || !html.includes('Academy Path') || !html.includes('Boss Rush')) throw new Error('Plug-and-play controls missing');
const health = await fetch(`${base}/api/health`).then(r => r.json());
if (!health.ok || health.version !== VERSION || health.transport !== 'sse' || health.dependencies.length !== 0) throw new Error('Health endpoint failed or dependencies remain');

const host = await post('/api/session');
await post('/api/message', { id: host.id, type: 'quickstart', name: 'Solo', preset: 'academy', role: 'runner' });
let room = [...rooms.values()][0];
if (!room || room.phase !== 'countdown') throw new Error('Quickstart did not create countdown room');
if (!room.mission?.title || !room.skill?.enabled) throw new Error('Mission or skill ladder missing');
if (![...room.players.values()].some(p => p.bot)) throw new Error('Quickstart did not add bots');
await delay(3100);
if (room.phase !== 'playing') throw new Error('Countdown did not reach playing');

const host2 = await post('/api/session');
await post('/api/message', { id: host2.id, type: 'create', name: 'Host', preset: 'mirrorDuel', mode: 'versus', maxPlayers: 8, difficulty: 3, role: 'guard', tutorialEnabled: false });
room = [...rooms.values()].find(r => r.hostId === host2.id);
if (!room || room.settings.maxPlayers !== 8) throw new Error('8-player lobby not created');
if (room.settings.tutorialEnabled !== false || room.skill?.enabled !== false) throw new Error('Mirror Duel tutorial-off free play failed');
await post('/api/message', { id: host2.id, type: 'remove_bots' });
const roles = ['striker','runner','vector','anchor','chaos','guard','engineer'];
for (let i = 1; i < 8; i += 1) {
  const client = await post('/api/session');
  await post('/api/message', { id: client.id, type: 'join', name: `P${i}`, room: room.code, role: roles[i - 1] });
}
if (room.players.size !== 8) throw new Error('Room did not fill to 8 players');
if ([...room.players.values()].filter(p => p.team === 'left').length !== 4) throw new Error('Left team not balanced');
if ([...room.players.values()].filter(p => p.team === 'right').length !== 4) throw new Error('Right team not balanced');
await post('/api/message', { id: host2.id, type: 'configure', settings: { preset: 'bossRush', tutorialEnabled: true } });
if (room.settings.difficulty !== 6 || !room.settings.tutorialEnabled || !room.skill?.enabled || room.mission?.title !== 'Boss Contract') throw new Error('Boss Rush guided config failed');
await post('/api/message', { id: host2.id, type: 'quick_launch' });
if (room.phase !== 'countdown') throw new Error('Quick launch did not start countdown');
const draft = createUpgradeDraft({ history: [], settings: { draftSize: 5 }, players: new Map(), mods: baseMods() });
if (draft.length !== 5) throw new Error('Upgrade draft is not five cards');

server.close();
console.log('Smoke test passed: zero dependencies, HTTP/SSE transport, quickstart bots, links, optional tutorial, 8-player mirror, countdown, 5-card draft.');
