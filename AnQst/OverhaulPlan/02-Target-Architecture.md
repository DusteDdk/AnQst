# Target Architecture: One Pipeline

## Design Principle

There is one correct way to process an AnQst spec. That way uses the TypeScript compiler. There is no reason to offer a weaker alternative. The target architecture eliminates the backend abstraction and makes the TSC pipeline the only pipeline.

## Target File Structure

```
AnQstGen/src/
├── bin/
│   └── anqst.ts          (unchanged)
├── model.ts               (unchanged — ParsedSpecModel, ServiceModel, etc.)
├── errors.ts              (unchanged — VerifyError)
├── project.ts             (unchanged — package.json bootstrap)
├── program.ts             (PROMOTED from backend/tsc/program.ts)
├── typegraph.ts           (PROMOTED from backend/tsc/typegraph.ts)
├── debug-dump.ts          (PROMOTED from backend/tsc/debug-dump.ts)
├── parser.ts              (MERGED — absorbs tsc/parser.ts wrapper logic)
├── verify.ts              (MERGED — absorbs tsc/verify.ts wrapper logic)
├── emit.ts                (unchanged logic — AngularService path now reachable)
└── app.ts                 (SIMPLIFIED — no backend selection, no target filtering)
```

```
AnQstGen/src/backend/      (DELETED ENTIRELY)
```

## What Each File Becomes

### `src/parser.ts` — merged

The current `src/parser.ts` holds the AST parse logic. The current `backend/tsc/parser.ts` wraps it with program context creation and typegraph application.

After the merge, `src/parser.ts` inlines that wrapper. The internal AST traversal logic becomes unexported private functions. The public export is the single, fully enriched `parseSpecFile`:

```typescript
// src/parser.ts (target shape)
import { createTscProgramContext } from "./program";
import { applyResolvedTypeGraph } from "./typegraph";
import { writeDebugFile, isDebugEnabled, inspectText } from "./debug-dump";

// Private — the raw AST traversal (was all of the old parser.ts)
function parseSpecFileAst(specFilePath: string): ParsedSpecModel { ... }

// Public — the full pipeline
export function parseSpecFile(specFilePath: string): ParsedSpecModel {
  createTscProgramContext(specFilePath);
  const parsed = parseSpecFileAst(specFilePath);
  if (isDebugEnabled()) {
    writeDebugFile(process.cwd(), "anqstmodel/parsed-before-typegraph.txt", inspectText(parsed));
  }
  const normalized = applyResolvedTypeGraph(parsed);
  if (isDebugEnabled()) {
    writeDebugFile(process.cwd(), "anqstmodel/parsed-after-typegraph.txt", inspectText(normalized));
  }
  return normalized;
}
```

### `src/verify.ts` — merged

The current `src/verify.ts` holds the semantic DSL check logic. The current `backend/tsc/verify.ts` adds TS diagnostics before calling it.

After the merge:

```typescript
// src/verify.ts (target shape)
import { getProgramDiagnostics } from "./program";

// Private — the semantic DSL checks (was all of the old verify.ts)
function verifySpecSemantics(spec: ParsedSpecModel): VerificationResult { ... }

// Public — TS diagnostics first, then semantic checks
export function verifySpec(spec: ParsedSpecModel): VerificationResult {
  const diagnostics = getProgramDiagnostics(spec.filePath);
  if (diagnostics.length > 0) {
    throw new VerifyError(`TypeScript diagnostics in spec:\n    ${diagnostics.join("\n    ")}`);
  }
  return verifySpecSemantics(spec);
}
```

### `src/emit.ts` — logic unchanged, AngularService path newly reachable

`emit.ts` already contains complete, working Angular service emission. The only change is that `emitAngularService: true` can now reach `renderTsServices()` and `renderTsServiceDts()` via the normal flow. No logic changes needed inside this file.

### `src/program.ts` — promoted, interface unchanged

Move `backend/tsc/program.ts` to `src/program.ts`. Update import paths. No logic changes. Exported functions (`createTscProgramContext`, `getTscProgramContext`, `getProgramDiagnostics`) remain identical.

### `src/typegraph.ts` — promoted, interface unchanged

Move `backend/tsc/typegraph.ts` to `src/typegraph.ts`. Update import paths. No logic changes.

### `src/debug-dump.ts` — promoted, interface unchanged

Move `backend/tsc/debug-dump.ts` to `src/debug-dump.ts`. Update import paths. No logic changes.

### `src/app.ts` — simplified

The backend selection machinery is removed:

**Removed:**
- `generationTargetsForBackend()` function (the Angular service suppression guard)
- `BackendId` imports and `--backend` flag parsing from `parseBuildCommandArgs`
- `parseBackendCommandArgs()` function (used for `build`, `verify`, `generate`)
- `resolveBackend()` call sites
- `isBackendId()` call sites

**`runBuild()` before:**
```typescript
export function runBuild(cwd: string, backendId: BackendId = "ast", designerPlugin = false): VerifyResult {
  const backend = resolveBackend(backendId);
  const generationTargets = generationTargetsForBackend(backend.id, resolveGenerationTargetsFromCwd(cwd, true));
  const parsed = backend.parseSpecFile(specPath);
  backend.verifySpec(parsed);
  const outputs = backend.generateOutputs(parsed, generationTargets);
  ...
}
```

**`runBuild()` after:**
```typescript
export function runBuild(cwd: string, designerPlugin = false): VerifyResult {
  const generationTargets = resolveGenerationTargetsFromCwd(cwd, true);
  const parsed = parseSpecFile(specPath);
  verifySpec(parsed);
  const outputs = generateOutputs(parsed, generationTargets);
  ...
}
```

**`runTest()` before:**
```typescript
export function runTest(cwd: string): VerifyResult {
  const backend = resolveBackend("ast");   // hardcoded weaker backend
  const parsed = backend.parseSpecFile(specPath);
  const verification = backend.verifySpec(parsed);
  ...
}
```

**`runTest()` after:**
```typescript
export function runTest(cwd: string): VerifyResult {
  const parsed = parseSpecFile(specPath);   // full TSC parse
  const verification = verifySpec(parsed);  // full TSC verify
  ...
}
```

**CLI help — `--backend` flag removed from all commands:**

Before:
```
  build [--backend <id>] [--designerplugin]   Generate artifacts from package.json AnQst spec
  generate <specFile> [--backend <id>]         Generate artifacts from explicit spec file
  verify <specFile> [--backend <id>]           Verify explicit spec file only
```

After:
```
  build [--designerplugin]    Generate artifacts from package.json AnQst spec
  generate <specFile>         Generate artifacts from explicit spec file
  verify <specFile>           Verify explicit spec file only
```

## Target Data Flow

Every command follows a single linear pipeline:

```
WidgetName.AnQst.d.ts
       ↓
  parseSpecFile()              src/parser.ts
    createTscProgramContext()    src/program.ts     → ts.Program + TypeChecker
    parseSpecFileAst()           (internal)         → ParsedSpecModel (raw)
    applyResolvedTypeGraph()     src/typegraph.ts   → ParsedSpecModel (enriched)
       ↓
  verifySpec()                 src/verify.ts
    getProgramDiagnostics()      src/program.ts     → TS compiler errors (hard fail)
    verifySpecSemantics()        (internal)         → DSL semantic errors (hard fail)
       ↓
  generateOutputs()            src/emit.ts
    ├── emitAngularService → npmpackage/ artifacts
    ├── emitQWidget        → WidgetName_QtWidget/ artifacts
    └── emitNodeExpressWs  → WidgetName_node_express_ws/ artifacts
       ↓
  writeGeneratedOutputs()      src/emit.ts
  installTypeScriptOutputs()   src/emit.ts    (if AngularService)
  installQtIntegrationCMake()  src/emit.ts    (if QWidget)
```

## What Is Gained

| | Before | After |
|---|---|---|
| Angular services with TSC | Not generated | Generated, with checker-resolved types |
| `anqst test` correctness | AST checks only; TS type errors pass | Full TS diagnostics + semantic checks |
| Number of parse pipelines | 2 | 1 |
| `--backend` CLI flag | Present, confusing | Removed |
| `backend/` directory | 11 files | Deleted |
| `GeneratorBackend` interface | Present | Deleted |
| Lines of abstraction code | ~100 (backend registry, adapters, interface) | 0 |
| Generated output shape | Unchanged | Unchanged |

## What Is Not Changed

- `ParsedSpecModel` and all model types — identical
- All of `emit.ts` logic — identical
- `project.ts` — identical
- `errors.ts` — identical
- `bin/anqst.ts` — identical
- All generated artifact formats (C++, TypeScript, CMake) — identical
- `AnQstWebBase` — not touched
- `package.json` `AnQst` config format — identical
