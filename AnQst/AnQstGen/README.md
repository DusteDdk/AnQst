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
  "generate": ["QWidget", "AngularService", "VanillaTS", "VanillaJS", "node_express_ws"],
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

Available generate targets:

- Browser frontend targets:
  - `AngularService`
  - `VanillaTS`
  - `VanillaJS`
- Backend targets:
  - `QWidget`
  - `node_express_ws`

- `anqst test`
  - Loads settings from `package.json.AnQst`.
  - Verifies the configured spec.

- `anqst build [--designerplugin[=true|false]]`
  - Loads settings from `package.json.AnQst`.
  - Verifies spec and regenerates selected targets.
  - Writes only under `./AnQst/generated`.
  - Removes selected target roots before regeneration (no stale generated files).
  - If `QWidget` is enabled and a browser build output is present under project `dist/`:
    - embeds built web assets into generated Qt widget `webapp/`.
  - If `QWidget` is enabled and `angular.json` exists:
    - `anqst build` may invoke a production Angular build before embedding.
  - Browser bundle discovery is frontend-profile-neutral: Angular and Vanilla browser outputs are both expected to produce a dist tree containing `index.html`.
  - Generated Qt integration CMake consumes the existing `./AnQst/generated` widget tree and fails fast if the required generated files are missing.
  - Downstream CMake no longer invokes `npm`, `npx`, or `anqst`; run `anqst build` first, then build C++ against the generated tree.
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
        <WidgetName>_VanillaTS/
        <WidgetName>_VanillaJS/
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

## Vanilla browser usage

Minimal browser-global usage for `VanillaJS`:

```html
<script src="./AnQst/generated/frontend/BurgerConstructor_VanillaJS/index.js"></script>
<script>
  (async () => {
    const frontend = await window.AnQstGenerated.widgets.BurgerConstructor.createFrontend();
    const ok = await frontend.services.BurgerService.validateDraft({ name: "Classic" });
    console.log(ok);
  })();
</script>
```

TypeScript authors use the same runtime shape with typings from `VanillaTS`:

```ts
/// <reference path="./AnQst/generated/frontend/BurgerConstructor_VanillaTS/index.d.ts" />

async function boot() {
  const frontend = await window.AnQstGenerated.widgets.BurgerConstructor.createFrontend();
  const ok = await frontend.services.BurgerService.validateDraft({ name: "Classic" });
  console.log(frontend.diagnostics.state(), ok);
}
```

## Two-stage workflow

```bash
# Stage 1: browser/backend/generation environment
npx @dusted/anqst build

# Stage 2: pure Qt/CMake environment, consuming the generated tree
cmake -S . -B build
cmake --build build
```

Both stages must use the exact outputs from the same prior `anqst build` invocation.
