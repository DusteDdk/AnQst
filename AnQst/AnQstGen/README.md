# AnQstGen

Isolated TypeScript implementation of the `anqst` generator CLI npm package.

## Build and run locally

```bash
npm install
npm run build
```

Run directly from build output:

```bash
node dist/src/bin/anqst.js <command> [args]
```

Optional: expose the command in your shell while developing:

```bash
npm link
# now you can run: anqst <command> [args]
```

Run via npx (preferred package workflow):

```bash
npx @dusted/anqst <command> [args]
```

## CLI commands

- `anqst instill <WidgetName>`
  - Must be run in a directory containing `package.json`.
  - Fails if `package.json.AnQst` already exists.
  - Adds:
    - `"AnQst": { "spec": "<WidgetName>.AnQst.d.ts", "generate": ["QWidget", "AngularService", "//DOM", "//node_express_ws"] }`
    - `build` script prefix: `npx anqst build`
    - `test` script prefix: `npx anqst test`
  - Scaffolds `<WidgetName>.AnQst.d.ts` in project root.
  - New scaffolds import `AnQst` from the package root (`import type { AnQst } from "@dusted/anqst";`).
  - If `<WidgetName>.AnQst.d.ts` already exists, instill preserves template content and only normalizes the `AnQst` import.

- `anqst test`
  - Reads `package.json.AnQst.spec`.
  - Verifies the configured spec.
  - On first error: prints readable error and exits `1`.
  - On success: prints summary and exits `0`.

- `anqst build`
  - Optional backend selection: `--backend <id>` where `<id>` is `ast` (default) or `tsc`.
  - Optional designer plugin build flag (build command only):
    - Accepted enable forms: `--designerplugin`, `--designerplugin=true`, `--designerplugin true`.
    - Any value other than `true` is treated as false.
    - Plugin build runs only when backend is `tsc` and `QWidget` generation is enabled.
    - If enabled but backend is not `tsc`, build prints a warning and skips plugin build.
    - If enabled but `QWidget` is not selected, build prints a warning and skips plugin build.
    - Requires `ANQST_WEBBASE_DIR` environment variable; `anqst build` forwards it to CMake as `-DANQST_WEBBASE_DIR=...`.
    - Optional package config: `AnQst.widgetCategory` (string). If present, Qt Designer shows the widget under that category instead of `AnQst Widgets`.
    - On success, CMake build output remains in `anqst-cmake/build-designerplugin`.
    - On success, build summary also prints the plugin binary path, a Qt install-path copy hint (`qmake -query QT_INSTALL_PLUGINS` then copy into `<QT_INSTALL_PLUGINS>/designer`), and a user-local install example (`$HOME/.local/lib/qt5/plugins/designer`).
    - Plugin icon generation (if favicon exists):
      - Search order: `dist/**/favicon.ico` first, then `res/favicon.ico`, `src/favicon.ico`, `favicon.ico`.
      - `favicon.ico` is converted to PNG for Designer plugin resources and wired as the widget icon.
    - Plugin build invokes `cmake` from PATH and forces `Release` configuration.
    - If plugin CMake configure/build fails, `anqst build` fails.
  - Reads `package.json.AnQst.spec`.
  - Reads optional `package.json.AnQst.generate` string array to select emitted outputs:
    - `"QWidget"` enables Qt/C++ emission and embedding flow.
    - `"AngularService"` enables TypeScript service package emission/install.
    - `"node_express_ws"` enables Node/Express backend bridge package emission.
    - Empty list is valid and emits nothing.
    - `//DOM` and `//node_express_ws` remain accepted placeholders and are ignored.
  - Verifies and generates outputs.
  - Writes raw outputs to `<cwd>/generated_output`:
    - TypeScript package sources under `generated_output/npmpackage`
    - C++ widget library sources plus CMake environment under `generated_output/<WidgetName>_QtWidget`
    - Node/Express backend package sources under `generated_output/<WidgetName>_node_express_ws`
  - When `"AngularService"` is enabled:
    - Replaces installed TypeScript artifacts in `<cwd>/src/anqst-generated`.
  - When `"QWidget"` is enabled:
    - Writes Qt integration glue to `<cwd>/anqst-cmake/CMakeLists.txt` so Qt consumers can `add_subdirectory(...)` and link `<WidgetName>Widget`.
    - If an Angular project is detected (`angular.json` exists), runs a production `ng build`.
    - Embeds the built web bundle into the generated widget library under `generated_output/<WidgetName>_QtWidget/webapp/*`.
  - `--backend tsc` uses TypeScript compiler APIs and currently emits a subset: `QWidget` and `node_express_ws`.
  - `AngularService` emission is not implemented for `tsc` backend yet.

- `anqst generate <specFile>`
  - Optional backend selection: `--backend <id>` where `<id>` is `ast` (default) or `tsc`.
  - Verifies the provided spec file and generates raw output.
  - Also applies `package.json.AnQst.generate` when `package.json` is present and contains `AnQst`.
  - If `"AngularService"` is enabled, installs into `src/anqst-generated`.
  - If `"QWidget"` is enabled, writes `anqst-cmake/CMakeLists.txt`.
  - If `"node_express_ws"` is enabled, emits `generated_output/<WidgetName>_node_express_ws`.
  - If no package config is present, defaults to emitting both QWidget and AngularService outputs.
  - Writes to `<cwd>/generated_output`.
  - `--backend tsc` uses TypeScript compiler APIs and currently emits a subset: `QWidget` and `node_express_ws`.
  - `AngularService` emission is not implemented for `tsc` backend yet.

- `anqst verify <specFile>`
  - Optional backend selection: `--backend <id>` where `<id>` is `ast` (default) or `tsc`.
  - Verifies a spec file without generating artifacts.
  - `--backend tsc` performs checker-backed validation using TypeScript compiler diagnostics.

- `anqst clean <path> [-f|--force]`
  - `<path>` may be absolute or relative to current working directory.
  - Without `--force`:
    - requires `<path>/package.json` with `AnQst.spec`
    - removes only widget-scoped generated folders for the referenced widget.
  - With `--force`:
    - removes broad generated folders under `<path>` regardless of package metadata.
  - Reports grouped cleanup results: `Deleted`, `Not found`, `Failed`.
  - Groups with zero entries are omitted from the output.

## Typical usage flow (Angular widget project)

```bash
# 1) in your widget project
npx @dusted/anqst instill BurgerConstructor

# 2) edit generated spec scaffold
code BurgerConstructor.AnQst.d.ts

# 3) validate spec
npx @dusted/anqst test

# 4) generate and install artifacts
npx @dusted/anqst build

# or via npm scripts enriched by instill
npm run test
npm run build
```

## Generated output structure

When generation succeeds:

- `generated_output/npmpackage/package.json`
- `generated_output/npmpackage/index.ts`
- `generated_output/npmpackage/services.ts`
- `generated_output/npmpackage/types.ts`
- `generated_output/npmpackage/index.js`
- `generated_output/npmpackage/services.js`
- `generated_output/npmpackage/types.js`
- `generated_output/npmpackage/types/index.d.ts`
- `generated_output/npmpackage/types/services.d.ts`
- `generated_output/npmpackage/types/types.d.ts`
- `generated_output/<WidgetName>_QtWidget/CMakeLists.txt`
- `generated_output/<WidgetName>_QtWidget/<WidgetName>.qrc`
- `generated_output/<WidgetName>_QtWidget/include/<WidgetName>.h`
- `generated_output/<WidgetName>_QtWidget/include/<WidgetName>Types.h`
- `generated_output/<WidgetName>_QtWidget/<WidgetName>.cpp`
- `generated_output/<WidgetName>_QtWidget/webapp/*` (embedded Angular build artifacts)
- Generated CMake links the widget library target (`<WidgetName>Widget`) against `anqstwebhostbase`.
- `anqst-cmake/CMakeLists.txt` (consumer-facing CMake entrypoint that triggers on-demand Angular/anqst build)

And after `anqst build`:

- `src/anqst-generated/*` (installed TypeScript artifacts, replaced on each build)
