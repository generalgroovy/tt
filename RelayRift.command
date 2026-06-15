#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Node.js is required to run Relay Rift.'
  printf '%s\n' 'Install Node.js LTS from: https://nodejs.org/'
  read -r _
  exit 1
fi
node launcher.mjs
