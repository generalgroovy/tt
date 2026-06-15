#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Node.js is required to run Relay Rift.'
  printf '%s\n' 'Install Node.js LTS from: https://nodejs.org/'
  read -r _
  exit 1
fi
if [ ! -d node_modules ]; then
  printf '%s\n' 'Installing dependencies...'
  npm install || { printf '%s\n' 'Dependency installation failed.'; read -r _; exit 1; }
fi
printf '%s\n' 'Starting Relay Rift...'
printf '%s\n' 'Open http://localhost:8080 if the browser does not open automatically.'
if command -v open >/dev/null 2>&1; then open http://localhost:8080 >/dev/null 2>&1 || true; fi
npm start
