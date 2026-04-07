# AnQst In-Project Layout Overhaul (No-Compatibility Design)

## Scope

This design replaces the current split-output layout (`./generated_output`, `./anqst-cmake`, `./src/anqst-generated`, root spec file) with one canonical project-local root:

- `./AnQst`

Backwards compatibility is explicitly out of scope.
No migration path is provided.
Legacy layouts are treated as invalid for new CLI behavior.

## Design Goals

- Keep all AnQst-owned artifacts under one top-level directory.
- Remove package.json script-prefix mutations (`build: "npx anqst build && ..."`).
- Make config file-based and explicit (`package.json.AnQst` becomes a string path).
- Prevent dead files by regenerating target directories deterministically.
- Keep host Angular project integration minimal and predictable.

## Canonical Layout (All Targets Generated)

```text
<project-root>/
  package.json
  tsconfig.json
  AnQst/
    <widgetName>.AnQst.d.ts
    <widgetName>.settings.json
    .gitignore
    README.md
    generated/
      frontend/
        <widgetName>_Angular/
          package.json
          index.ts
          services.ts
          types.ts
          index.js
          services.js
          types.js
          types/
            index.d.ts
            services.d.ts
            types.d.ts
      backend/
        node/
          express/
            <widgetName>_anQst/
              package.json
              index.ts
              types/
                index.d.ts
        cpp/
          cmake/
            CMakeLists.txt
          qt/
            <widgetName>_widget/
              CMakeLists.txt
              <widgetName>.qrc
              <widgetName>.cpp
              include/
                <widgetName>.h
                <widgetName>Types.h
              webapp/
                index.html
                ...
              designerPlugin/
                CMakeLists.txt
                <widgetName>DesignerPlugin.cpp
                designerplugin.qrc
                plugin-icon.png
                build/
                  <widgetName>DesignerPlugin.(so|dylib|dll)
      debug/
        intermediate/
          anqstmodel/
            parsed-before-typegraph.txt
            parsed-after-typegraph.txt
            typegraph-service-map.txt
```

## `anqst instill <widgetName>`: New Responsibilities

`instill` becomes project bootstrap for `./AnQst` and project hooks.

### Files created by `instill`

- `./AnQst/<widgetName>.AnQst.d.ts`
- `./AnQst/<widgetName>.settings.json`
- `./AnQst/.gitignore`
- `./AnQst/README.md`
- `./AnQst/generated/` (empty structure root only)

### `package.json` contract

`AnQst` changes from object to string path:

```json
{
  "AnQst": "./AnQst/<widgetName>.settings.json"
}
```

### `package.json` scripts policy

`instill` adds/ensures only these hooks:

- `postinstall`: `npx anqst build`
- `prebuild`: `npx anqst build`
- `prestart`: `npx anqst build`

Rules:

- Do not rewrite `build` or `start` command bodies.
- Hooks are idempotent (do not duplicate if already present).
- If hook has existing command, prepend `npx anqst build && ...` once.

### `tsconfig` policy

`instill` updates compiler options to include generated frontend path:

- `AnQst/generated/frontend/<widgetName>_Angular`

Recommended insertion:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "anqst-generated/*": ["AnQst/generated/frontend/<widgetName>_Angular/*"]
    }
  }
}
```

If project uses strict `include`, add:

- `AnQst/generated/frontend/<widgetName>_Angular/**/*.d.ts`

### `./AnQst/<widgetName>.settings.json` schema

All keys previously under `package.json.AnQst` move here.

```json
{
  "layoutVersion": 2,
  "widgetName": "<widgetName>",
  "spec": "./AnQst/<widgetName>.AnQst.d.ts",
  "generate": ["QWidget", "AngularService", "node_express_ws"],
  "widgetCategory": "AnQst Widgets"
}
```

- `layoutVersion` is required and fixed to `2` for this overhaul.
- `spec` must be inside `./AnQst`.

### `./AnQst/.gitignore`

Minimum content:

```gitignore
/generated*
```

## `anqst build`: New Responsibilities

### Input resolution

1. Read `package.json.AnQst` (must be a string).
2. Resolve and read settings file.
3. Resolve `settings.spec`.
4. Resolve `settings.generate` targets.

### Output locations

- Angular service/types package: `AnQst/generated/frontend/<widgetName>_Angular/`
- Node/Express output: `AnQst/generated/backend/node/express/<widgetName>_anQst/`
- Qt widget library: `AnQst/generated/backend/cpp/qt/<widgetName>_widget/`
- Qt integration CMake entrypoint: `AnQst/generated/backend/cpp/cmake/CMakeLists.txt`
  - Consumes the already-generated widget tree.
  - Does not invoke `npm`, `npx`, or `anqst`.
- Designer plugin sources/build artifacts: `AnQst/generated/backend/cpp/qt/<widgetName>_widget/designerPlugin/`
- Debug dumps: `AnQst/generated/debug/intermediate/...`

### Deterministic regeneration policy (no dead code)

Before writing target outputs, `build` removes and recreates each selected target root:

- Frontend target root
- Node target root
- Qt target root
- CMake target root (for QWidget)
- Debug intermediate root (when debug enabled)

No stale files from older runs are allowed to remain.

### Angular embedding behavior

When QWidget target is enabled:

- Angular build artifacts are embedded into:
  - `AnQst/generated/backend/cpp/qt/<widgetName>_widget/webapp/`

## CLI Command Contract Changes

- `instill`: requires that `package.json.AnQst` is absent.
- `build`/`test`/`clean`: require `package.json.AnQst` to be a string path to settings JSON.
- Legacy object-style `package.json.AnQst` is invalid in this redesign.
- Legacy output directories are ignored by design (no migration).

## Implementation Mapping (Current Code -> New Structure)

- `src/project.ts`
  - Replace object-based `AnQst` parsing with settings-path parsing.
  - Add settings file read/validate helpers.
  - Rewrite `runInstill` to scaffold `./AnQst/*` and hooks.

- `src/app.ts`
  - Update status messages and cleanup targets.
  - Update `resolveGenerationTargetsFromCwd`, `resolveAnQstSpecFromPackage`, and designer plugin paths.

- `src/emit.ts`
  - Replace hardcoded roots:
    - `generated_output` -> `AnQst/generated`
    - `src/anqst-generated` install step removed (generate directly to frontend target)
    - `anqst-cmake` -> `AnQst/generated/backend/cpp/cmake`
  - Update embedded web bundle destination and plugin install paths.
  - Update debug dump roots consumed by `src/debug-dump.ts`.

- `src/debug-dump.ts`
  - `generated_output/intermediate` -> `AnQst/generated/debug/intermediate`

- `README.md`, `docs/designer-plugin-build-install.md`, tests
  - Rewrite path references and package config examples for settings-file model.

## Acceptance Criteria

- Running `anqst instill Foo` creates only `./AnQst` artifacts and updates host config/hooks.
- Running `anqst build` produces no AnQst outputs outside `./AnQst`.
- `package.json.AnQst` is always a string path.
- `Foo.settings.json` is the single source of AnQst project configuration.
- Repeated `anqst build` runs are idempotent and leave no stale generated files.
