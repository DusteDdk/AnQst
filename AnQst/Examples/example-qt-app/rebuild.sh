#!/bin/bash

full=true

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
if $full
then
    rm -f package-lock.json
    rm -rf node_modules
fi
if [ ! -d  node_modules ]
then
    npm install
fi

if $full
then
    export ANQST_WEBBASE_DIR=`realpath ../../../../../AnQstWidget/AnQstWebBase`
    if ! npx anqst build --designerplugin=true
    then
        echo "Designer plugin build unavailable; rebuilding widget without the designer plugin."
        npx anqst build
    fi
    echo "Copy plugin.."
    if [ -f AnQst/generated/backend/cpp/qt/CdEntryEditor_widget/designerPlugin/build/CdEntryEditorDesignerPlugin.so ]
    then
        mkdir -p "$HOME/.local/lib/qt5/plugins/designer" && cp AnQst/generated/backend/cpp/qt/CdEntryEditor_widget/designerPlugin/build/CdEntryEditorDesignerPlugin.so "$HOME/.local/lib/qt5/plugins/designer/"
    else
        echo "Designer plugin binary not available; skipping copy."
    fi

else
    npx anqst build
fi


popd

rm -Rf build
cmake -B build -G Ninja
cmake --build build
