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
  qtbase5-dev \
  qttools5-dev \
  qttools5-dev-tools \
  qtdeclarative5-dev \
  libqt5webchannel5-dev \
  qtwebengine5-dev \
  libqt5webengine5 \
  libqt5webenginecore5 \
  qtmultimedia5-dev \
  libqt5svg5-dev \
  libqt5webenginewidgets5 \
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


echo "[anqst] Dependency installation complete."
