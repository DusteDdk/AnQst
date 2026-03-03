#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PACKAGE_DIR}"

echo "[anqst] Installing dependencies..."
npm install --ignore-scripts

echo "[anqst] Building publish artifacts..."
npm run build

echo "[anqst] Publishing package to npm..."
npm publish "$@"
