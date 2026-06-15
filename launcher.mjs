import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = Number(process.env.PORT || 8080);
const URL = `http://localhost:${PORT}`;
const HEALTH = `http://127.0.0.1:${PORT}/api/health`;
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false, ...options });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`)));
  });
}

function openBrowser(url) {
  const command = process.platform === 'win32'
    ? 'cmd'
    : process.platform === 'darwin'
      ? 'open'
      : 'xdg-open';
  const args = process.platform === 'win32'
    ? ['/c', 'start', '', url]
    : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore', shell: false });
  child.unref();
}

async function waitForServer(timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(HEALTH, { cache: 'no-store' });
      if (response.ok) return true;
    } catch {
      // server not ready yet
    }
    await delay(350);
  }
  return false;
}

console.log('Relay Rift launcher');
console.log(`Working directory: ${process.cwd()}`);

if (!existsSync('node_modules')) {
  console.log('node_modules missing; installing dependencies first...');
  await run(npmCommand, ['install']);
}

console.log(`Starting Relay Rift server on ${URL} ...`);
const server = spawn(process.execPath, ['server.js'], { stdio: 'inherit', shell: false });
let exited = false;
server.on('exit', code => {
  exited = true;
  console.log(`Relay Rift server exited with code ${code ?? 0}.`);
  process.exit(code ?? 0);
});
server.on('error', error => {
  exited = true;
  console.error('Failed to start Relay Rift server:', error);
  process.exit(1);
});

const ready = await waitForServer();
if (ready) {
  console.log(`Relay Rift is ready: ${URL}`);
  openBrowser(URL);
} else if (!exited) {
  console.error(`Server did not respond at ${HEALTH}.`);
  console.error('Leave this window open and check the server log above. If the port is already in use, close the old server window and run again.');
}

process.on('SIGINT', () => {
  if (!server.killed) server.kill('SIGINT');
  process.exit(0);
});
process.on('SIGTERM', () => {
  if (!server.killed) server.kill('SIGTERM');
  process.exit(0);
});

await new Promise(() => {});
