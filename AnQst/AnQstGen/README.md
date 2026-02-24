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
npx anqst <command> [args]
```

## CLI commands

- `anqst instill <WidgetName>`
  - Must be run in a directory containing `package.json`.
  - Fails if `package.json.AnQst` already exists.
  - Adds:
    - `"AnQst": { "spec": "<WidgetName>.AnQst.d.ts" }`
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
  - Verifies and generates outputs.
  - Writes raw outputs to `<cwd>/generated_output`:
    - TypeScript package sources under `generated_output/npmpackage`
    - C++ widget library sources plus CMake environment under `generated_output/cpplibrary`
  - Replaces installed TypeScript artifacts in `<cwd>/src/anqst-generated`.
  - Writes Qt integration glue to `<cwd>/anqst-cmake/CMakeLists.txt` so Qt consumers can `add_subdirectory(...)` and link `<WidgetName>Widget`.
  - If an Angular project is detected (`angular.json` exists), runs a production `ng build`.
  - Embeds the built web bundle into the generated widget library via:
    - `generated_output/cpplibrary/<WidgetName>.qrc`
    - `generated_output/cpplibrary/webapp/*`

- `anqst generate <specFile>`
  - Verifies the provided spec file and generates raw output only.
  - Writes to `<cwd>/generated_output`.
  - Does not install into `src/anqst-generated`.

- `anqst verify <specFile>`
  - Verifies a spec file without generating artifacts.

## Typical usage flow (Angular widget project)

```bash
# 1) in your widget project
npx anqst instill BurgerConstructor

# 2) edit generated spec scaffold
code BurgerConstructor.AnQst.d.ts

# 3) validate spec
npx anqst test

# 4) generate and install artifacts
npx anqst build

# or via npm scripts enriched by instill
npm run test
npm run build
```

## Generated output structure

When generation succeeds:

- `generated_output/npmpackage/package.json`
- `generated_output/npmpackage/index.ts`
- `generated_output/npmpackage/index.js`
- `generated_output/npmpackage/types/index.d.ts`
- `generated_output/cpplibrary/CMakeLists.txt`
- `generated_output/cpplibrary/<WidgetName>.qrc`
- `generated_output/cpplibrary/include/<WidgetName>.h`
- `generated_output/cpplibrary/include/<WidgetName>Types.h`
- `generated_output/cpplibrary/<WidgetName>.cpp`
- `generated_output/cpplibrary/webapp/*` (embedded Angular build artifacts)
- Generated CMake links the widget library target (`<WidgetName>Widget`) against `anqstwebhostbase`.
- `anqst-cmake/CMakeLists.txt` (consumer-facing CMake entrypoint that triggers on-demand Angular/anqst build)

And after `anqst build`:

- `src/anqst-generated/*` (installed TypeScript artifacts, replaced on each build)
