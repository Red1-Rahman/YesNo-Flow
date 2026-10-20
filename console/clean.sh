#!/usr/bin/env bash
# Removes build output and local run data. Does not touch node_modules or .env files.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf .next .data .inngest coverage dist out *.tsbuildinfo
echo "Cleaned build output and local run data."
