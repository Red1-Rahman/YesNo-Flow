#!/usr/bin/env bash
# Runs only the Inngest dev server. Use when Next.js runs in another terminal.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
npx --yes inngest-cli@latest dev -u "http://localhost:${PORT}/api/inngest"
