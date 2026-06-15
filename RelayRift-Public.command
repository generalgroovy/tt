#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Node.js is required to run Relay Rift.'
  printf '%s\n' 'Install Node.js LTS from: https://nodejs.org/'
  read -r _
  exit 1
fi
if ! command -v cloudflared >/dev/null 2>&1 && [ ! -x tools/cloudflared ]; then
  printf '%s\n' 'cloudflared is required for a public internet link.'
  printf '%s\n' 'Install cloudflared, or place the cloudflared binary in ./tools/cloudflared.'
  read -r _
fi
node launcher.mjs --public
