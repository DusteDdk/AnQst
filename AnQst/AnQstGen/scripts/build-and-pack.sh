#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PACKAGE_DIR}"

echo "[anqst] Installing dependencies..."
npm install --ignore-scripts

echo "[anqst] Building publish artifacts..."
npm run build

echo "[anqst] Creating npm install tarball..."
pack_json="$(npm pack --ignore-scripts --json)"
tarball_filename="$(node -e 'const payload = JSON.parse(process.argv[1]); process.stdout.write(payload[0].filename);' "${pack_json}")"
tarball_path="${PACKAGE_DIR}/${tarball_filename}"

echo "[anqst] Tarball created: ${tarball_path}"
echo "[anqst] Tarball contents (matches what npm install extracts):"
tar -tzf "${tarball_path}" | sed 's#^package/##'
