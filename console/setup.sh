#!/usr/bin/env bash
# One-time project setup: checks Node, installs deps, creates .env.local.
set -euo pipefail
cd "$(dirname "$0")/.."

need_node_major=20
node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$node_major" -lt "$need_node_major" ]; then
  echo "Node ${need_node_major}+ is required (found: $(node -v 2>/dev/null || echo none))." >&2
  exit 1
fi

echo "Installing dependencies..."
npm install

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local. Add your OPENAI_API_KEY before running a workflow."
else
  echo ".env.local already exists, leaving it untouched."
fi

if [ ! -f components.json ]; then
  echo
  echo "shadcn is not initialised yet. Run:"
  echo "  npx shadcn@latest init"
  echo "  npx shadcn@latest add button card input textarea badge scroll-area sheet separator tooltip tabs dialog sonner"
fi

echo "Setup complete. Start everything with: ./console/dev.sh"
