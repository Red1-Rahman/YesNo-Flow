#!/usr/bin/env bash
# Fails if any markdown file contains an em dash. Docs in this repo must not use them.
set -euo pipefail
cd "$(dirname "$0")/.."

if grep -rn --include='*.md' $'\xe2\x80\x94' . --exclude-dir=node_modules --exclude-dir=.next; then
  echo "Em dash found in documentation. Rewrite with a comma, colon, period, or parentheses." >&2
  exit 1
fi
echo "No em dashes found."
