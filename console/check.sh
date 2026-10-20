#!/usr/bin/env bash
# Full verification gate. Every plan and every PR must pass this.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[1/3] typecheck"; npm run --silent typecheck
echo "[2/3] lint";      npm run --silent lint
echo "[3/3] test";      npm run --silent test
echo "All checks passed."
