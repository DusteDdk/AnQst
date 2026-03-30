#!/bin/bash

full=false
if [ "$1" == "full" ]
then
    full=true
fi

if $full
then
pushd ../../AnQstGen
rm -Rf node_modules package-lock.json dist
npm install
npm run build
popd
fi

echo "Building CDEntry Angular..."

pushd lib/widgets/CdEntryEditor/
rm package-lock.json node_modules
if [ ! -d  node_modules ]
then
    npm install
fi

if $full
then
    export ANQST_WEBBASE_DIR=`realpath ../../AnQstWidget/AnQstWebBase`
    npx anqst build --designerplugin=true
    echo "Copy plugin.."
    mkdir -p "$HOME/.local/lib/qt5/plugins/designer" && cp AnQst/generated/backend/cpp/qt/CdEntryEditor_widget/designerPlugin/build/CdEntryEditorDesignerPlugin.so "$HOME/.local/lib/qt5/plugins/designer/"

else
    npx anqst build
fi


popd

rm -Rf build
cmake -B build -G Ninja
cmake --build build
