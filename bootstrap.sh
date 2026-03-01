#!/bin/bash

set -e

cd AnQst
echo "Building AnQstGen..."
pushd AnQstGen
npm install
npm run build
popd

echo "Installing Angular dependencies..."
pushd Examples/demo/lib/demo-widget/
npm install

echo "Testing AnQst-Spec..."
npm run anqst:test

echo "Building Widget App..."
npm run build
popd
