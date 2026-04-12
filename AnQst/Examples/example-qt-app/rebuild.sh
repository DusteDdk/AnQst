#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
full=true
export ANQST_WEBBASE_DIR="$(realpath "${SCRIPT_DIR}/../../AnQstWidget/AnQstWebBase")"

prepare_widget_deps() {
    if $full; then
        rm -f package-lock.json
        rm -rf node_modules
    fi
    if [ ! -d node_modules ]; then
        npm install
    fi
}

if $full; then
    echo "Rebuilding AnQstGen..."
    pushd "${SCRIPT_DIR}/../../AnQstGen" >/dev/null
    rm -rf node_modules package-lock.json dist
    npm install
    npm run build
    popd >/dev/null
fi

echo "Building CdEntryEditor..."
pushd "${SCRIPT_DIR}/lib/widgets/CdEntryEditor" >/dev/null
prepare_widget_deps

if $full; then
    if ! npx anqst build --designerplugin=true; then
        echo "Designer plugin build unavailable; rebuilding widget without the designer plugin."
        npx anqst build
    fi
    echo "Copy plugin.."
    if [ -f AnQst/generated/backend/cpp/qt/CdEntryEditor_widget/designerPlugin/build/CdEntryEditorDesignerPlugin.so ]; then
        mkdir -p "$HOME/.local/lib/qt5/plugins/designer"
        cp AnQst/generated/backend/cpp/qt/CdEntryEditor_widget/designerPlugin/build/CdEntryEditorDesignerPlugin.so \
            "$HOME/.local/lib/qt5/plugins/designer/"
    else
        echo "Designer plugin binary not available; skipping copy."
    fi
else
    npx anqst build
fi
popd >/dev/null

echo "Preparing VanillaJsWidget..."
pushd "${SCRIPT_DIR}/lib/widgets/VanillaJsWidget" >/dev/null
prepare_widget_deps
popd >/dev/null

echo "Preparing VanillaTsWidget..."
pushd "${SCRIPT_DIR}/lib/widgets/VanillaTsWidget" >/dev/null
prepare_widget_deps
popd >/dev/null

echo "Building vanilla widgets in dependency order..."
bash "${SCRIPT_DIR}/lib/widgets/build-vanilla-widgets.sh"

echo "Rebuilding example_qt_app..."
rm -rf "${SCRIPT_DIR}/build"
cmake -S "${SCRIPT_DIR}" -B "${SCRIPT_DIR}/build" -G Ninja
cmake --build "${SCRIPT_DIR}/build"
