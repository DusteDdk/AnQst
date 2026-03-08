# Qt Designer Plugin Build and Install

This guide describes how to build and install an AnQst-generated Qt Designer plugin.

## Prerequisites

- A widget project with `package.json` containing:
  - `"AnQst": "./AnQst/<WidgetName>.settings.json"`
- `QWidget` target enabled in `./AnQst/<WidgetName>.settings.json` under `generate`.
- `ANQST_WEBBASE_DIR` set to your `AnQstWidget/AnQstWebBase` source directory.
- Qt5 Designer tooling installed (`designer`, `qmake`, Qt5 UiPlugin development files).

## Build the plugin

From the widget project root:

```bash
ANQST_WEBBASE_DIR=/abs/path/to/AnQstWidget/AnQstWebBase npx anqst build --designerplugin
```

On success, output is placed in:

- `AnQst/generated/backend/cpp/qt/<WidgetName>_widget/designerPlugin/build/<WidgetName>DesignerPlugin.so` (Linux)
- `AnQst/generated/backend/cpp/qt/<WidgetName>_widget/designerPlugin/build/<WidgetName>DesignerPlugin.dylib` (macOS)
- `AnQst/generated/backend/cpp/qt/<WidgetName>_widget/designerPlugin/build/<WidgetName>DesignerPlugin.dll` (Windows)

## Install the plugin

### System Qt plugin path

```bash
cp AnQst/generated/backend/cpp/qt/<WidgetName>_widget/designerPlugin/build/<WidgetName>DesignerPlugin.so "$(qmake -query QT_INSTALL_PLUGINS)/designer/"
```

### User-local Qt5 plugin path

```bash
mkdir -p "$HOME/.local/lib/qt5/plugins/designer"
cp AnQst/generated/backend/cpp/qt/<WidgetName>_widget/designerPlugin/build/<WidgetName>DesignerPlugin.so "$HOME/.local/lib/qt5/plugins/designer/"
```

## Verify plugin loading

Run Designer with plugin diagnostics:

```bash
QT_DEBUG_PLUGINS=1 designer
```

Useful checks:

- Ensure metadata is found for `<WidgetName>DesignerPlugin`.
- Ensure library loads without `Cannot load library ...` errors.
- Confirm widget appears under:
  - `AnQst Widgets` (default), or
  - `widgetCategory` from settings file.

## Optional settings

In `./AnQst/<WidgetName>.settings.json`:

- `widgetCategory` (optional string): overrides Designer category name.

Example:

```json
{
  "layoutVersion": 2,
  "widgetName": "CdEntryEditor",
  "spec": "./AnQst/CdEntryEditor.AnQst.d.ts",
  "generate": ["QWidget", "AngularService"],
  "widgetCategory": "Internal Widgets"
}
```

## Plugin icon behavior

If a favicon exists, AnQst generates a plugin icon from `favicon.ico` using this lookup order:

1. `dist/**/favicon.ico`
2. `res/favicon.ico`
3. `src/favicon.ico`
4. `favicon.ico`

The icon is converted to PNG and embedded into plugin resources.

## Troubleshooting

- `Missing ANQST_WEBBASE_DIR`:
  - Export `ANQST_WEBBASE_DIR` before running build.
- `Cannot load library ... undefined symbol ...`:
  - Rebuild plugin and generated widget artifacts from clean outputs.
  - Verify plugin and Designer use the same Qt major/minor installation.
- No plugin messages on startup:
  - Use `QT_DEBUG_PLUGINS=1` and check that Designer scans your plugin directory.
