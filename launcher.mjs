import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { join } from 'node:path';

const PORT = Number(process.env.PORT || 8080);
const URL = `http://localhost:${PORT}`;
const HEALTH = `http://127.0.0.1:${PORT}/api/health`;
const PUBLIC_MODE = process.argv.includes('--public') || process.env.RELAY_PUBLIC === '1';

function openBrowser(url) {
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try { const child = spawn(command, args, { detached: true, stdio: 'ignore', shell: false }); child.unref(); } catch {}
}

function localCloudflaredPath() {
  if (process.platform === 'win32') return join(process.cwd(), 'tools', 'cloudflared.exe');
  return join(process.cwd(), 'tools', 'cloudflared');
}

function cloudflaredCommand() {
  const local = localCloudflaredPath();
  if (existsSync(local)) return local;
  return 'cloudflared';
}

async function waitForServer(timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { const response = await fetch(HEALTH, { cache: 'no-store' }); if (response.ok) return true; } catch {}
    await delay(300);
  }
  return false;
}

async function registerPublicUrl(url) {
  const response = await fetch(`http://127.0.0.1:${PORT}/api/admin/public-url`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url })
  });
  if (!response.ok) throw new Error(`Could not register public URL ${url}`);
}

function startTunnel() {
  return new Promise((resolve, reject) => {
    console.log('Starting public internet tunnel...');
    const child = spawn(cloudflaredCommand(), ['tunnel', '--url', `http://127.0.0.1:${PORT}`], { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let resolved = false;
    let buffer = '';
    const scan = chunk => {
      const text = chunk.toString();
      buffer += text;
      process.stdout.write(text);
      const match = buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !resolved) { resolved = true; resolve({ url: match[0], child }); }
    };
    child.stdout.on('data', scan);
    child.stderr.on('data', scan);
    child.on('error', error => {
      if (!resolved) reject(new Error(`cloudflared could not start: ${error.message}`));
    });
    child.on('exit', code => {
      if (!resolved) reject(new Error(`cloudflared exited before creating a public link. Exit code ${code ?? 0}.`));
    });
    setTimeout(() => {
      if (!resolved) reject(new Error('Timed out waiting for cloudflared public URL.'));
    }, 35000).unref();
  });
}

console.log(PUBLIC_MODE ? 'Relay Rift public internet launcher' : 'Relay Rift local launcher');
console.log(`Working directory: ${process.cwd()}`);
console.log('No npm install is required for Relay Rift itself.');
console.log(`Starting Relay Rift server on ${URL} ...`);

const server = spawn(process.execPath, ['server.js'], { stdio: 'inherit', shell: false });
let exited = false;
let exitCode = null;
let tunnelProcess = null;
server.on('exit', code => { exited = true; exitCode = code ?? 0; if (tunnelProcess && !tunnelProcess.killed) tunnelProcess.kill(); });
server.on('error', error => { exited = true; exitCode = 1; console.error('Failed to start Relay Rift server:', error); });

const ready = await waitForServer();
if (!ready) {
  console.error(exited ? `Relay Rift server exited with code ${exitCode}.` : `Server did not respond at ${HEALTH}.`);
  console.error('If port 8080 is already in use, close the old server window and run again.');
  process.exit(exitCode || 1);
}

let openUrl = URL;
if (PUBLIC_MODE) {
  try {
    const tunnel = await startTunnel();
    tunnelProcess = tunnel.child;
    try {
      await registerPublicUrl(tunnel.url);
    } catch (registrationError) {
      console.warn('Public URL registration in local UI failed; opening the public link directly.');
      console.warn(registrationError?.message || registrationError);
    }
    openUrl = tunnel.url;
    console.log('PUBLIC JOIN LINK:');
    console.log(tunnel.url);
    console.log('Anyone with this link can join while this launcher window stays open.');
  } catch (error) {
    console.error('Public internet link could not be created.');
    console.error(error.message || error);
    console.error('Install cloudflared or place cloudflared.exe in the tools folder, then run RelayRift-Public.cmd again.');
    console.error('Falling back to local-only mode.');
  }
}

console.log(`Relay Rift is ready: ${openUrl}`);
openBrowser(openUrl);

process.on('SIGINT', () => { if (tunnelProcess && !tunnelProcess.killed) tunnelProcess.kill(); if (!server.killed) server.kill('SIGINT'); process.exit(0); });
process.on('SIGTERM', () => { if (tunnelProcess && !tunnelProcess.killed) tunnelProcess.kill(); if (!server.killed) server.kill('SIGTERM'); process.exit(0); });
await new Promise(resolve => server.on('exit', code => resolve(code)));
process.exit(exitCode || 0);
