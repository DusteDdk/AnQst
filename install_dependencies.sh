#!/usr/bin/env bash


echo "[anqst] Installing Linux build dependencies (Ubuntu)..."

sudo apt-get update
sudo apt-get install -y \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  software-properties-common

echo "[anqst] Configuring NodeSource LTS repository..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo bash -

sudo apt-get install -y \
  build-essential \
  cmake \
  ninja-build \
  pkg-config \
  git \
  python3 \
  qt6-base-dev \
  qt6-base-dev-tools \
  qt6-tools-dev \
  qt6-tools-dev-tools \
  qt6-declarative-dev \
  qt6-webchannel-dev \
  qt6-webengine-dev \
  xvfb \
  catch2 \
  nodejs

echo "[anqst] Verifying installed toolchain..."
for tool in cmake ninja c++ node npm; do
  command -v "${tool}" >/dev/null
done

if ! pkg-config --atleast-version=6.5 Qt6Core; then
  installed_qt6_version="$(pkg-config --modversion Qt6Core 2>/dev/null || echo "not found")"
  echo "[anqst] Qt 6.5 or newer is required; installed Qt6Core is ${installed_qt6_version}." >&2
  echo "[anqst] Configure a Qt 6.5+ package source/toolchain for this distribution, then rerun this script." >&2
  exit 1
fi


echo "[anqst] Dependency installation complete."
