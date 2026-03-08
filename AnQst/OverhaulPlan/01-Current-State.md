# Current State: The Two-Backend Problem

## The Structural Illusion

The naming "ast backend" and "tsc backend" suggests two parallel, symmetric implementations. They are not. The actual structure is:

- **`src/parser.ts`, `src/verify.ts`, `src/emit.ts`** — the real implementation, written for the AST-only path.
- **`src/backend/ast/`** — three files that do nothing but re-export from the above.
- **`src/backend/tsc/`** — a wrapper layer that calls the AST implementation and augments it with TypeChecker information.

The "tsc backend" is not an alternative to the "ast backend". It **is** the AST backend plus a TypeChecker pass on top. Maintaining the abstraction as if they were peers creates false symmetry and hides the real relationship.

## Precise Code Path: Current `anqst build --backend tsc`

```
app.ts:runBuild()
  ↓
  generationTargetsForBackend("tsc", targets)
    → forces emitAngularService: false             [GUARD 1]
  ↓
  resolveBackend("tsc") → tscBackend
  ↓
  tscBackend.parseSpecFile(specPath)
    → backend/tsc/parser.ts:parseSpecFile()
        → createTscProgramContext(specPath)         ← builds ts.Program + TypeChecker
        → backend/ast/parser.ts:parseSpecFile()    ← re-exports src/parser.ts
            → src/parser.ts:parseSpecFile()        ← AST parse, no TypeChecker
        → applyResolvedTypeGraph(parsed)           ← enriches type text with checker
        → returns enriched ParsedSpecModel
  ↓
  tscBackend.verifySpec(parsed)
    → backend/tsc/verify.ts:verifySpec()
        → getProgramDiagnostics(specPath)          ← TS compiler errors
        → backend/ast/verify.ts:verifySpec()       ← re-exports src/verify.ts
            → src/verify.ts:verifySpec()           ← semantic DSL checks
  ↓
  tscBackend.generateOutputs(parsed, targets)
    → backend/tsc/index.ts:generateOutputs()
        → emitCppQWidget(parsed, options)          ← calls src/emit.ts with emitAngularService:false  [GUARD 2]
        → emitNodeExpressWs(parsed, options)       ← calls src/emit.ts with emitAngularService:false  [GUARD 2]
        [NO Angular service emission path]
  ↓
  writeGeneratedOutputs(...)
  installQtIntegrationCMake(...)
  [installTypeScriptOutputs() never reached for tsc backend]
```

## Precise Code Path: Current `anqst build` (default ast backend)

```
app.ts:runBuild()
  ↓
  generationTargetsForBackend("ast", targets)
    → targets unchanged (emitAngularService preserved)
  ↓
  resolveBackend("ast") → astBackend
  ↓
  astBackend.parseSpecFile(specPath)
    → backend/ast/parser.ts → src/parser.ts:parseSpecFile()   ← AST only, no TypeChecker
  ↓
  astBackend.verifySpec(parsed)
    → backend/ast/verify.ts → src/verify.ts:verifySpec()      ← semantic checks only, NO TS diagnostics
  ↓
  astBackend.generateOutputs(parsed, targets)
    → backend/ast/emit.ts → src/emit.ts:generateOutputs()
        → emitAngularService: YES (if configured)
        → emitQWidget: YES (if configured)
        → emitNodeExpressWs: YES (if configured)
  ↓
  writeGeneratedOutputs(...)
  installTypeScriptOutputs(...)    ← Angular services installed
  installQtIntegrationCMake(...)
```

## Precise Code Path: Current `anqst test`

```
app.ts:runTest()
  ↓
  resolveBackend("ast")            ← HARDCODED, ignores --backend entirely
  ↓
  astBackend.parseSpecFile(specPath)  ← AST only
  astBackend.verifySpec(parsed)       ← semantic checks only, no TS diagnostics
  ↓
  returns VerifyResult
```

`anqst test` has no `--backend` flag at all. It always uses the AST backend. This means a spec with invalid TypeScript (type errors, unresolvable imports) can pass `anqst test` but fail `anqst build --backend tsc`.

## Problems Created by the Current Structure

### 1. Angular service generation blocked by two independent guards

Guard 1 in `app.ts:63`:
```typescript
function generationTargetsForBackend(backendId: BackendId, targets: GenerationTargets): GenerationTargets {
  if (backendId !== "tsc") return targets;
  return { emitQWidget: targets.emitQWidget, emitAngularService: false, ... };
}
```

Guard 2 baked into both TSC emit adapters (`emit-cpp.ts:9`, `emit-node.ts:9`):
```typescript
return generateWithAst(spec, { emitAngularService: false, ... });
```

Removing only one guard still blocks Angular service generation. Both must go.

### 2. `anqst test` uses a weaker validator than `anqst build`

A spec file with a TypeScript type error (e.g., referencing an undefined symbol) passes `anqst test` but fails `anqst build --backend tsc`. The test command is supposed to be the cheap early check — but it currently checks less than the build does. This inverts the expected guarantee.

### 3. The `GeneratorBackend` abstraction carries no real value

```typescript
export interface GeneratorBackend {
  id: BackendId;
  parseSpecFile(specPath: string): ParsedSpecModel;
  verifySpec(spec: ParsedSpecModel): BackendVerificationResult;
  generateOutputs(spec: ParsedSpecModel, options: GenerateOutputsOptions): GeneratedFiles;
  emitsArtifacts: boolean;
}
```

`emitsArtifacts: boolean` was presumably added for a skeleton/stub backend. Both real backends set it to `true`. The interface serves no polymorphism that isn't immediately collapsed back into a direct call.

### 4. `src/parser.ts` and `src/verify.ts` are nominally "the implementation" but are actually the weaker path

The files at `src/` feel like the canonical implementations. In reality they are incomplete — they lack TypeChecker integration. The more complete implementation lives in `backend/tsc/`, which wraps them. This inverts the expected dependency direction.

### 5. The `backend/ast/` directory is pure indirection

All three files in `backend/ast/` are single-line re-exports:
```typescript
export { parseSpecFile } from "../../parser";   // backend/ast/parser.ts
export { verifySpec } from "../../verify";       // backend/ast/verify.ts
export { generateOutputs } from "../../emit";   // backend/ast/emit.ts
```

They exist only to satisfy the `GeneratorBackend` interface. They add no logic and create a misleading impression of parallel implementation.

## Summary Table

| Capability | AST backend | TSC backend |
|---|---|---|
| Parses DSL structure | Yes | Yes (via AST parser) |
| Resolves complex imported types | No | Yes (TypeChecker) |
| Reports TS compiler errors | No | Yes |
| Generates Angular services | Yes | **No (blocked)** |
| Generates C++ widget | Yes | Yes |
| Generates Node.js bridge | Yes | Yes |
| Used by `anqst test` | Yes | No |
| Used by `anqst build` (default) | Yes | No |
