#!/usr/bin/env bash
# Runs the Next.js app and the Inngest dev server together.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "Missing .env.local. Run ./console/setup.sh first." >&2
  exit 1
fi

echo "App:     http://localhost:3000"
echo "Inngest: http://localhost:8288"
npm run dev:all
