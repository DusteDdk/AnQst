#!/usr/bin/env bash
# Build-order-sensitive: VanillaTsWidget's spec imports generated VanillaTS types from VanillaJsWidget.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/VanillaJsWidget"
npm install
npx anqst build
cd "${SCRIPT_DIR}/VanillaTsWidget"
npm install
npx anqst build
echo "Vanilla JS + TS widgets built (in dependency order)."
