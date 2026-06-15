import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = Number(process.env.PORT || 8080);
const URL = `http://localhost:${PORT}`;
const HEALTH = `http://127.0.0.1:${PORT}/api/health`;

function openBrowser(url) {
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore', shell: false });
  child.unref();
}

async function waitForServer(timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(HEALTH, { cache: 'no-store' });
      if (response.ok) return true;
    } catch {}
    await delay(300);
  }
  return false;
}

console.log('Relay Rift launcher');
console.log(`Working directory: ${process.cwd()}`);
console.log('Starting server with built-in Node modules only.');
console.log(`Starting Relay Rift server on ${URL} ...`);

const server = spawn(process.execPath, ['server.js'], { stdio: 'inherit', shell: false });
let exited = false;
let exitCode = null;
server.on('exit', code => { exited = true; exitCode = code ?? 0; });
server.on('error', error => { exited = true; exitCode = 1; console.error('Failed to start Relay Rift server:', error); });

const ready = await waitForServer();
if (ready) {
  console.log(`Relay Rift is ready: ${URL}`);
  openBrowser(URL);
} else if (exited) {
  console.error(`Relay Rift server exited with code ${exitCode}.`);
  console.error('If port 8080 is already in use, close the old server window and run again.');
  process.exit(exitCode || 1);
} else {
  console.error(`Server did not respond at ${HEALTH}.`);
  console.error('If port 8080 is already in use, close the old server window and run again.');
}

process.on('SIGINT', () => { if (!server.killed) server.kill('SIGINT'); process.exit(0); });
process.on('SIGTERM', () => { if (!server.killed) server.kill('SIGTERM'); process.exit(0); });
await new Promise(resolve => server.on('exit', code => resolve(code)));
process.exit(exitCode || 0);
