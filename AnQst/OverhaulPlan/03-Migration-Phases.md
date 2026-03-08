# Migration Phases

Three phases, each independently shippable. Phases 1 and 2 can proceed in parallel if desired. Phase 3 must follow Phase 2.

---

## Phase 1 — Enable Angular Service Generation in the TSC Backend

**Goal:** Remove the two guards that block Angular service generation when using `--backend tsc`. This is the minimum change to fix GAP-D12 and is a prerequisite for deprecating the AST backend.

**Risk:** Low. The Angular service emitter is already correct. The enriched `ParsedSpecModel` from the TSC parser produces valid and better TypeScript output.

### Changes

#### `src/app.ts`

Remove `generationTargetsForBackend()` entirely and remove its call site in both `runBuild` and `runGenerate`.

```typescript
// DELETE this entire function:
function generationTargetsForBackend(backendId: BackendId, targets: GenerationTargets): GenerationTargets {
  if (backendId !== "tsc") return targets;
  return { emitQWidget: targets.emitQWidget, emitAngularService: false, emitNodeExpressWs: targets.emitNodeExpressWs };
}

// In runGenerate(), change:
const generationTargets = generationTargetsForBackend(backend.id, resolveGenerationTargetsFromCwd(cwd));
// to:
const generationTargets = resolveGenerationTargetsFromCwd(cwd);

// In runBuild(), same pattern.
```

#### `src/backend/tsc/index.ts`

Add Angular service emission alongside the existing C++ and Node paths:

```typescript
import { emitAngularService } from "./emit-angular-service";  // new file

export const tscBackend: GeneratorBackend = {
  id: "tsc",
  parseSpecFile,
  verifySpec,
  generateOutputs(spec, options) {
    logBackendInput(spec, options);
    const angular = emitAngularService(spec, options);   // ADD
    const cpp = emitCppQWidget(spec, options);
    const node = emitNodeExpressWs(spec, options);
    return mergeGeneratedFiles(angular, cpp, node);
  },
  emitsArtifacts: true
};
```

#### `src/backend/tsc/emit-angular-service.ts` — new file

Mirrors `emit-cpp.ts` and `emit-node.ts`:

```typescript
import type { GenerateOutputsOptions, GeneratedFiles } from "../../emit";
import type { ParsedSpecModel } from "../../model";
import { generateOutputs as generateWithAst } from "../ast/emit";

export function emitAngularService(spec: ParsedSpecModel, options: GenerateOutputsOptions): GeneratedFiles {
  if (!options.emitAngularService) return {};
  return generateWithAst(spec, {
    emitQWidget: false,
    emitAngularService: true,
    emitNodeExpressWs: false
  });
}
```

#### `src/backend/tsc/index.ts` — update `formatTargets` log

Add `AngularService` to the targets log so the console output reflects reality:

```typescript
function formatTargets(options: GenerateOutputsOptions): string {
  const enabled: string[] = [];
  if (options.emitAngularService) enabled.push("AngularService");   // ADD
  if (options.emitQWidget) enabled.push("QWidget");
  if (options.emitNodeExpressWs) enabled.push("node_express_ws");
  if (enabled.length === 0) return "none";
  return enabled.join(", ");
}
```

### Tests to Add

In `test/cli.test.ts` — verify that `--backend tsc` now produces Angular service artifacts when `AngularService` is in the generate targets.

In `test/emit.test.ts` — verify that the TSC backend's `generateOutputs` with `emitAngularService: true` produces the same `npmpackage/` artifact set as the AST backend.

### Completion Criteria

- `anqst build --backend tsc` in a project with `"generate": ["QWidget", "AngularService"]` produces both C++ and TypeScript artifacts.
- Existing `anqst build` (ast default) behaviour is unchanged.
- All existing tests pass.

---

## Phase 2 — Flatten: Promote TSC Files to `src/`, Delete Backend Indirection

**Goal:** Eliminate `src/backend/` by promoting the TSC implementation to `src/` and merging the AST wrappers into the core files. The backend abstraction (`GeneratorBackend` interface, `resolveBackend()`, `backend/index.ts`) is removed.

**Risk:** Medium — this is a broad file restructure. No logic changes; import paths and internal function visibility change. Needs careful test coverage before and after.

**Dependency:** Phase 1 must be complete so that Angular service emission via TSC is proven working before AST backend code is touched.

### Step 2a — Promote independent TSC files (no logic changes)

Move these files with import-path-only edits:

| From | To | Import changes |
|---|---|---|
| `src/backend/tsc/program.ts` | `src/program.ts` | Remove `../../` prefix on `errors`, `debug-dump` imports |
| `src/backend/tsc/typegraph.ts` | `src/typegraph.ts` | Update imports to `./program`, `../../model` → `./model` |
| `src/backend/tsc/debug-dump.ts` | `src/debug-dump.ts` | No relative imports to change |

Update all files that import from `backend/tsc/program`, `backend/tsc/typegraph`, `backend/tsc/debug-dump` to use the new paths.

### Step 2b — Merge `src/parser.ts`

Current `src/parser.ts` contains the AST traversal as the exported `parseSpecFile`. Current `backend/tsc/parser.ts` wraps it.

After: `src/parser.ts` absorbs the wrapper. The AST traversal becomes an unexported internal function `parseSpecFileAst`.

```typescript
// src/parser.ts (after merge)

// Was: export function parseSpecFile(...) — becomes internal
function parseSpecFileAst(specFilePath: string): ParsedSpecModel {
  // ... all existing AST traversal code unchanged ...
}

// Was: backend/tsc/parser.ts:parseSpecFile — becomes the new public export
export function parseSpecFile(specFilePath: string): ParsedSpecModel {
  createTscProgramContext(specFilePath);
  const parsed = parseSpecFileAst(specFilePath);
  if (isDebugEnabled()) {
    writeDebugFile(process.cwd(), "anqstmodel/parsed-before-typegraph.txt", `${inspectText(parsed)}\n`);
  }
  const normalized = applyResolvedTypeGraph(parsed);
  if (isDebugEnabled()) {
    writeDebugFile(process.cwd(), "anqstmodel/parsed-after-typegraph.txt", `${inspectText(normalized)}\n`);
  }
  return normalized;
}
```

### Step 2c — Merge `src/verify.ts`

Current `src/verify.ts` contains the semantic checks as the exported `verifySpec`. Current `backend/tsc/verify.ts` wraps it with TS diagnostics.

After: `src/verify.ts` absorbs the wrapper. The semantic check becomes `verifySpecSemantics`.

```typescript
// src/verify.ts (after merge)

// Was: export function verifySpec(...) — becomes internal
function verifySpecSemantics(spec: ParsedSpecModel): VerificationResult {
  // ... all existing semantic check code unchanged ...
}

// Was: backend/tsc/verify.ts:verifySpec — becomes the new public export
export function verifySpec(spec: ParsedSpecModel): VerificationResult {
  const diagnostics = getProgramDiagnostics(spec.filePath);
  if (diagnostics.length > 0) {
    throw new VerifyError(`TypeScript diagnostics in spec:\n    ${diagnostics.join("\n    ")}`);
  }
  return verifySpecSemantics(spec);
}
```

### Step 2d — Remove `src/backend/` directory

Once `src/parser.ts` and `src/verify.ts` are merged and `program.ts`, `typegraph.ts`, `debug-dump.ts` are promoted:

1. Delete `src/backend/tsc/parser.ts` (absorbed into `src/parser.ts`)
2. Delete `src/backend/tsc/verify.ts` (absorbed into `src/verify.ts`)
3. Delete `src/backend/tsc/program.ts` (promoted to `src/program.ts`)
4. Delete `src/backend/tsc/typegraph.ts` (promoted to `src/typegraph.ts`)
5. Delete `src/backend/tsc/debug-dump.ts` (promoted to `src/debug-dump.ts`)
6. Delete `src/backend/tsc/emit-cpp.ts` — its one job (call `generateOutputs` with `emitQWidget:true`) moves inline to `src/app.ts` or `src/emit.ts`
7. Delete `src/backend/tsc/emit-node.ts` — same
8. Delete `src/backend/tsc/emit-angular-service.ts` — same
9. Delete `src/backend/tsc/index.ts`
10. Delete `src/backend/ast/parser.ts`, `verify.ts`, `emit.ts`, `index.ts`
11. Delete `src/backend/index.ts`
12. Delete `src/backend/types.ts`

### Step 2e — Simplify `src/app.ts`

Remove all backend-related code:

- Remove `import { isBackendId, resolveBackend } from "./backend"` and `import type { BackendId } from "./backend/types"`
- Replace `backend.parseSpecFile(...)` → `parseSpecFile(...)` (direct import from `./parser`)
- Replace `backend.verifySpec(...)` → `verifySpec(...)` (direct import from `./verify`)
- Replace `backend.generateOutputs(...)` → `generateOutputs(...)` (direct import from `./emit`)
- Remove `parseBuildCommandArgs` `--backend` handling; simplify to just `--designerplugin`
- Remove `parseBackendCommandArgs` (was used for `verify` and `generate` commands)
- Simplify `runVerify`, `runGenerate`, `runBuild`, `runTest` signatures to remove `backendId` parameter
- Remove `BackendCommandArgs` and `BuildCommandArgs.backendId`
- Remove `backend.emitsArtifacts` check (always true now)

### Step 2f — Update tests

- `test/parser_verify.test.ts`: imports from `../src/parser` and `../src/verify` — paths unchanged (these files keep their names). Logic unchanged.
- `test/emit.test.ts`: imports from `../src/parser` and `../src/emit` — paths unchanged.
- `test/cli.test.ts`: remove all `--backend ast` test cases. Remove `--backend tsc` cases that tested the restriction. Add cases verifying that the single pipeline produces all targets.

### Completion Criteria

- `src/backend/` directory does not exist.
- `src/` contains `program.ts`, `typegraph.ts`, `debug-dump.ts` alongside `parser.ts`, `verify.ts`, `emit.ts`.
- `anqst build` with no flags produces C++ + Angular service artifacts (for default generate targets).
- `ANQST_DEBUG=true anqst build` still writes intermediate artifacts to `generated_output/intermediate/`.
- All tests pass.

---

## Phase 3 — Remove the `--backend` CLI Flag

**Goal:** The `--backend` flag no longer exists. Users who pass it get a clear error. Documentation is updated.

**Risk:** Low for new users. Breaking for any scripts that pass `--backend ast` or `--backend tsc`. Manage with a grace period if needed.

**Dependency:** Phase 2 must be complete.

### Changes

#### `src/app.ts`

The `--backend` flag is already removed from the argument parsers in Phase 2. In Phase 3, add an explicit rejection if `--backend` is somehow still passed, for clean error messages:

```typescript
// In parseBuildCommandArgs (and other parsers):
if (arg === "--backend" || arg.startsWith("--backend=")) {
  throw new Error("--backend flag has been removed. AnQst now uses a single unified pipeline.");
}
```

#### `renderHelp()` in `src/app.ts`

Remove `--backend <id>` from the help text completely.

#### Documentation updates

- `WorkFlowExample.md`: Remove any mention of `--backend`.
- `Overview.md`: Remove `ast` and `tsc` backend distinction.
- `AnQstGen/README.md`: Remove backend references.
- `GapAnalysis/`: Update GAP-D12 as resolved.

### Deprecation Grace Period (Optional)

If the flag removal is too abrupt, insert a warning phase between Phase 2 and Phase 3:

- `--backend tsc` → prints a deprecation warning, continues normally (it's now a no-op).
- `--backend ast` → prints a deprecation warning, continues with the unified pipeline (silently upgrades).
- Both become hard errors in Phase 3.

### Completion Criteria

- `anqst build --backend tsc` produces a clear error or deprecation message.
- `anqst build --backend ast` produces a clear error or deprecation message.
- `--backend` does not appear in `anqst --help` output.
- All documentation updated.

---

## Phase Dependency Summary

```
Phase 1  ──────────────────────────────────►  done
  Enable AngularService in TSC backend
  (3 small file changes, 1 new file)

Phase 2  ──────────────────────────────────►  done
  Flatten backend/ hierarchy
  (file moves + merges, no logic changes)
  requires Phase 1

Phase 3  ──────────────────────────────────►  done
  Remove --backend CLI flag
  (CLI + docs cleanup)
  requires Phase 2
```

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| TSC parse is slower than AST parse for `anqst test` | Low-Medium | `ts.Program` creation adds ~100–300ms. Acceptable for correctness. Profile if it becomes a complaint. |
| `tsconfig.json` absent in some projects causes TSC parse to use fallback options | Low | `createTscProgramContext` already handles this with sensible defaults. |
| Existing CI scripts pass `--backend ast` | Low | Deprecation warning phase before hard removal. |
| TSC-parsed model produces different type text than AST model, changing generated Angular service output | Low | TSC produces structurally equivalent or more complete types. The generated TS is valid in both cases. Should be verified with the existing test fixtures in Phase 1. |
| `contextBySpecPath` singleton cache in `program.ts` causes stale context in tests | Low | Tests that call `parseSpecFile` on the same path twice in one process run share context, which is correct (same spec, same program). Tests using different spec paths are unaffected. |
