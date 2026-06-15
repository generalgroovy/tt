import WebSocket from 'ws';
import { createServerApp } from '../src/server/app.js';
import { createUpgradeDraft, baseMods } from '../src/server/game.js';
import { VERSION } from '../src/server/constants.js';

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
async function latestState(client, predicate, timeout = 2200) {
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
if (!html.includes('Instant Run') || !html.includes('Academy Path') || !html.includes('Boss Rush')) throw new Error('Plug-and-play super-duper-alpha controls missing');
const health = await fetch(`${base}/api/health`).then(r => r.json());
if (!health.ok || health.maxPlayers !== 8 || health.version !== VERSION || !health.presets.includes('academy') || !health.presets.includes('bossRush')) throw new Error('Health endpoint failed');

const quick = await openSocket(port);
quick.send({ type: 'quickstart', name: 'Solo', preset: 'academy', role: 'runner' });
const countdown = await latestState(quick, s => s.phase === 'countdown' && s.players.some(p => p.bot) && s.ready.total >= 2 && s.mission?.title);
if (!countdown.mission || !countdown.director?.mission || !countdown.skill?.title?.includes('Serve')) throw new Error('Mission or skill ladder missing');
if (!countdown.players.some(p => p.bot)) throw new Error('Quickstart did not add bots');
await latestState(quick, s => s.phase === 'playing' && s.runStats.startedAt, 4200);
quick.ws.close();
await delay(120);

const host = await openSocket(port);
host.send({ type: 'create', name: 'Host', preset: 'mirrorDuel', mode: 'versus', maxPlayers: 8, difficulty: 3, role: 'guard' });
const lobby = await latestState(host, s => s.phase === 'lobby');
if (lobby.settings.maxPlayers !== 8) throw new Error('8-player lobby not created');
if (lobby.settings.tutorialEnabled !== false || lobby.skill?.enabled !== false) throw new Error('Mirror Duel should allow tutorial-off free play by default when not requested');
if (!lobby.players.some(p => p.bot)) throw new Error('Preset bots missing');
host.send({ type: 'remove_bots' });
await latestState(host, s => s.players.every(p => !p.bot));
const clients = [host];
const roles = ['striker', 'runner', 'vector', 'anchor', 'chaos', 'guard', 'engineer'];
for (let i = 1; i < 8; i += 1) {
  const client = await openSocket(port);
  clients.push(client);
  client.send({ type: 'join', name: `P${i}`, room: lobby.room, role: roles[i - 1] });
  await delay(50);
}
const full = await latestState(host, s => s.players.length === 8 && !s.players.some(p => p.bot));
if (full.players.filter(p => p.team === 'left').length !== 4) throw new Error('Left team not balanced');
if (full.players.filter(p => p.team === 'right').length !== 4) throw new Error('Right team not balanced');
host.send({ type: 'ready', ready: true });
await latestState(host, s => s.ready.count >= 1 && s.phase === 'lobby');
host.send({ type: 'configure', settings: { preset: 'bossRush', tutorialEnabled: true } });
await latestState(host, s => s.settings.difficulty === 6 && s.settings.tutorialEnabled === true && s.skill?.enabled === true && s.skill?.title?.includes('Serve') && s.mission?.title === 'Boss Contract' && s.ready.count === 0 && s.phase === 'lobby');
host.send({ type: 'fill_bots' });
await latestState(host, s => s.players.length === 8);
host.send({ type: 'quick_launch' });
await latestState(host, s => s.phase === 'countdown' && s.countdown > 0);
await latestState(host, s => s.phase === 'playing' && s.runStats.startedAt, 4200);
const draft = createUpgradeDraft({ history: [], settings: { draftSize: 5 }, players: new Map(), mods: baseMods() });
if (draft.length !== 5) throw new Error('Upgrade draft is not five cards');
for (const client of clients) client.ws.close();
await delay(80);
server.close();
console.log('Smoke test passed: optional co-op/versus tutorial toggle, Academy ladder, plug-and-play, missions, bots, 8-player mirror, countdown, 5-card draft.');
