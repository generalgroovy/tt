import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = Number(process.env.PORT || 8080);
const URL = `http://localhost:${PORT}`;
const HEALTH = `http://127.0.0.1:${PORT}/api/health`;
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const REQUIRED_PACKAGES = ['ws'];

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

function missingPackages() {
  return REQUIRED_PACKAGES.filter(name => !existsSync(`node_modules/${name}/package.json`));
}

async function ensureDependencies() {
  const missing = missingPackages();
  if (!existsSync('node_modules') || missing.length) {
    if (missing.length) console.log(`Missing dependency package(s): ${missing.join(', ')}`);
    console.log('Installing dependencies with npm install...');
    await run(npmCommand, ['install']);
  }
  const stillMissing = missingPackages();
  if (stillMissing.length) {
    throw new Error(`Dependency installation did not provide: ${stillMissing.join(', ')}. Delete node_modules and package-lock.json, then run npm install manually.`);
  }
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

try {
  await ensureDependencies();
} catch (error) {
  console.error('Dependency setup failed.');
  console.error(error?.message || error);
  process.exit(1);
}

console.log(`Starting Relay Rift server on ${URL} ...`);
const server = spawn(process.execPath, ['server.js'], { stdio: 'inherit', shell: false });
let exited = false;
let exitCode = null;
server.on('exit', code => {
  exited = true;
  exitCode = code ?? 0;
});
server.on('error', error => {
  exited = true;
  exitCode = 1;
  console.error('Failed to start Relay Rift server:', error);
});

const ready = await waitForServer();
if (ready) {
  console.log(`Relay Rift is ready: ${URL}`);
  openBrowser(URL);
} else if (exited) {
  console.error(`Relay Rift server exited with code ${exitCode}.`);
  console.error('If the log above mentions a missing package, run npm install or delete node_modules and run RelayRift.cmd again.');
  process.exit(exitCode || 1);
} else {
  console.error(`Server did not respond at ${HEALTH}.`);
  console.error('If port 8080 is already in use, close the old server window and run again.');
}

process.on('SIGINT', () => {
  if (!server.killed) server.kill('SIGINT');
  process.exit(0);
});
process.on('SIGTERM', () => {
  if (!server.killed) server.kill('SIGTERM');
  process.exit(0);
});

await new Promise(resolve => {
  server.on('exit', code => resolve(code));
});
process.exit(exitCode || 0);
