# AnQstGen

TypeScript implementation of the `anqst` CLI generator package.

## Build locally

```bash
npm install
npm run build
```

Run from build output:

```bash
node dist/src/bin/anqst.js <command> [args]
```

Or with npm link during development:

```bash
npm link
anqst <command> [args]
```

## In-project contract

AnQst-generated artifacts are consolidated under one project-root directory:

- `./AnQst`

`package.json` stores a settings path string:

```json
{
  "AnQst": "./AnQst/<WidgetName>.settings.json"
}
```

Settings file (`./AnQst/<WidgetName>.settings.json`) owns project-local AnQst configuration:

```json
{
  "layoutVersion": 2,
  "widgetName": "<WidgetName>",
  "spec": "./AnQst/<WidgetName>.AnQst.d.ts",
  "generate": ["QWidget", "AngularService", "node_express_ws"],
  "widgetCategory": "AnQst Widgets"
}
```

## CLI commands

- `anqst instill <WidgetName>`
  - Initializes `./AnQst`.
  - Creates:
    - `./AnQst/<WidgetName>.AnQst.d.ts`
    - `./AnQst/<WidgetName>.settings.json`
    - `./AnQst/.gitignore`
    - `./AnQst/README.md`
  - Updates `package.json`:
    - `AnQst` string path to settings file.
    - build hooks: `postinstall`, `prebuild`, `prestart` (all run `npx anqst build`).
  - Updates `tsconfig.json` (when present):
    - `compilerOptions.paths["anqst-generated/*"] = ["AnQst/generated/frontend/<WidgetName>_Angular/*"]`

- `anqst test`
  - Loads settings from `package.json.AnQst`.
  - Verifies the configured spec.

- `anqst build [--designerplugin[=true|false]]`
  - Loads settings from `package.json.AnQst`.
  - Verifies spec and regenerates selected targets.
  - Writes only under `./AnQst/generated`.
  - Removes selected target roots before regeneration (no stale generated files).
  - If `QWidget` is enabled and `angular.json` exists:
    - runs production Angular build
    - embeds built web assets into generated Qt widget `webapp/`.
  - If `--designerplugin` is enabled:
    - requires `ANQST_WEBBASE_DIR`
    - emits plugin sources in `./AnQst/generated/backend/cpp/qt/<WidgetName>_widget/designerPlugin`
    - runs CMake configure/build in plugin `build/` subdir.

- `anqst generate <specFile>`
  - Verifies explicit spec and emits selected outputs.
  - Uses package settings targets when package `AnQst` key exists, else default targets.

- `anqst verify <specFile>`
  - Verifies explicit spec only.

- `anqst clean <path> [-f|--force]`
  - Without `--force`: resolves settings under `<path>` and removes widget-scoped generated roots.
  - With `--force`: removes `<path>/AnQst/generated`.
  - Prints grouped cleanup summary (`Deleted`, `Not found`, `Failed`).

## Generated structure

```text
<project-root>/
  AnQst/
    <WidgetName>.AnQst.d.ts
    <WidgetName>.settings.json
    .gitignore
    README.md
    generated/
      frontend/
        <WidgetName>_Angular/
      backend/
        node/
          express/
            <WidgetName>_anQst/
        cpp/
          cmake/
            CMakeLists.txt
          qt/
            <WidgetName>_widget/
              CMakeLists.txt
              <WidgetName>.qrc
              <WidgetName>.cpp
              include/
              webapp/
              designerPlugin/
                CMakeLists.txt
                <WidgetName>DesignerPlugin.cpp
                designerplugin.qrc
                plugin-icon.png
                build/
                  <WidgetName>DesignerPlugin.(so|dylib|dll)
      debug/
        intermediate/
```

## Typical workflow

```bash
npx @dusted/anqst instill BurgerConstructor

# edit spec
code AnQst/BurgerConstructor.AnQst.d.ts

npx @dusted/anqst test
npx @dusted/anqst build
```
