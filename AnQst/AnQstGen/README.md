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
  - Installs a project-local DSL definition at `anqst-dsl/AnQst-Spec-DSL.d.ts`.

- `anqst test`
  - Reads `package.json.AnQst.spec`.
  - Verifies the configured spec.
  - On first error: prints readable error and exits `1`.
  - On success: prints summary and exits `0`.

- `anqst build`
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

- `anqst generate <specFile>`
  - Verifies the provided spec file and generates raw output.
  - Also applies `package.json.AnQst.generate` when `package.json` is present and contains `AnQst`.
  - If `"AngularService"` is enabled, installs into `src/anqst-generated`.
  - If `"QWidget"` is enabled, writes `anqst-cmake/CMakeLists.txt`.
  - If `"node_express_ws"` is enabled, emits `generated_output/<WidgetName>_node_express_ws`.
  - If no package config is present, defaults to emitting both QWidget and AngularService outputs.
  - Writes to `<cwd>/generated_output`.

- `anqst verify <specFile>`
  - Verifies a spec file without generating artifacts.

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
