#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PACKAGE_DIR}"

echo "[anqst] Installing dependencies..."
npm install --ignore-scripts

echo "[anqst] Building publish artifacts..."
npm run build

publish_args=("$@")
if [[ -n "${NPM_OTP:-}" ]]; then
  publish_args=(--otp="${NPM_OTP}" "${publish_args[@]}")
fi

if [[ -n "${NPM_TOKEN:-}" ]]; then
  token_value="$(printf '%s' "${NPM_TOKEN}" | tr -d '\r\n')"
  temp_npmrc="$(mktemp)"
  cleanup() {
    rm -f "${temp_npmrc}"
  }
  trap cleanup EXIT

  {
    echo "//registry.npmjs.org/:_authToken=${token_value}"
    echo "@dusted:registry=https://registry.npmjs.org/"
    echo "always-auth=true"
  } > "${temp_npmrc}"

  echo "[anqst] Verifying npm token..."
  NPM_CONFIG_USERCONFIG="${temp_npmrc}" npm whoami >/dev/null

  echo "[anqst] Publishing package to npm using NPM_TOKEN..."
  NPM_CONFIG_USERCONFIG="${temp_npmrc}" npm publish "${publish_args[@]}"
else
  echo "[anqst] NPM_TOKEN not set; using interactive login."
  npm login --auth-type=web
  echo "[anqst] Publishing package to npm..."
  npm publish "${publish_args[@]}"
fi
