#!/bin/bash

export ANQST_WEBBASE_DIR=`realpath ../../AnQstWidget/AnQstWebBase`
echo "Building Angular..."
pushd lib/widgets/CdEntryEditor/
rm package-lock.json
if [ ! -d  node_modules ]
then
    npm install
fi
npx anqst build --designerplugin=true

# Copy plugin
mkdir -p "$HOME/.local/lib/qt5/plugins/designer" && cp AnQst/generated/backend/cpp/qt/CdEntryEditor_widget/designerPlugin/build/CdEntryEditorDesignerPlugin.so "$HOME/.local/lib/qt5/plugins/designer/"
popd

rm -Rf build
cmake -B build -G Ninja
cmake --build build
