import { createServerApp } from './src/server/app.js';

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '0.0.0.0';
const { server } = createServerApp({ port });

server.listen(port, host, () => {
  console.log(`Relay Rift running at http://localhost:${port}`);
  console.log('Host runs once. Copy the invite link from the lobby; joiners only need a browser.');
});
