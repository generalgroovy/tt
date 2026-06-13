#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
command -v node >/dev/null 2>&1 || { echo "Install Node.js first: https://nodejs.org/"; exit 1; }
[ -d node_modules ] || npm install
npm start
