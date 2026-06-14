import { spawn } from 'node:child_process';
import { createServerApp } from './src/server/app.js';

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '0.0.0.0';
const { server } = createServerApp({ port });

server.listen(port, host, () => {
  const url = `http://localhost:${port}`;
  console.log(`Relay Rift running at ${url}`);
  console.log('Open the app, host a room, share the invite link, then launch the run.');
  if (!process.env.TT_NO_OPEN && process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', url], { detached: true, stdio: 'ignore' });
  }
});
