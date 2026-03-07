#!/bin/bash

export ANQST_WEBBASE_DIR=`realpath ../../AnQstWidget/AnQstWebBase`
echo "Building latest AnQst..."
pushd ../../AnQstGen/
npm run build
chmod +x dist/src/bin/anqst.js
popd
echo "-----------------------"
echo
echo "Building Angular..."
pushd lib/widgets/CdEntryEditor/
rm package-lock.json
npm install
npm install @dusted/anqst@file:../../../../../AnQstGen --force
npx anqst build --backend=tsc --designerplugin=true
mkdir -p "$HOME/.local/lib/qt5/plugins/designer" && cp anqst-cmake/build-designerplugin/CdEntryEditorDesignerPlugin.so "$HOME/.local/lib/qt5/plugins/designer/"
popd

rm -Rf build
cmake -B build -G Ninja
cmake --build build

