# QtWidget Debug Reality Today

This is an implementation snapshot, not a target-state design.

Do not implement from this file. Specification work remains discussion-only per `00-Agent-Operating-Protocol.md`.

## 1) Two Distinct Debug Planes

## A) Generator/compile-time debug plane

- Trigger: environment variable `ANQST_DEBUG=true`.
- Scope: TSC parse/program/typegraph introspection artifacts.
- Main writer utility: `AnQstGen/src/backend/tsc/debug-dump.ts`.
- Output location: `generated_output/intermediate/*`.

## B) Runtime/widget debug plane

- Trigger: generated widget method `enableDebug()` (one-way call to host base).
- Scope: host runtime transport and dev serving behavior.
- Contract anchor: `AnQstWidget/AnQstWebBase/README.md` and output contracts.

These two planes are related but separate. One inspects generation internals; the other affects runtime behavior.

## 2) Current Generator Debug Mechanism

### Enable switch

- `isDebugEnabled()` returns true only when `process.env.ANQST_DEBUG === "true"`.
- There is no CLI flag for this in current code path.

### Files currently emitted when enabled

- `generated_output/intermediate/tsc/program-context.txt`
- `generated_output/intermediate/tsc/program-files.txt`
- `generated_output/intermediate/tsc/sourcefile-ast.txt`
- `generated_output/intermediate/anqstmodel/parsed-before-typegraph.txt`
- `generated_output/intermediate/anqstmodel/typegraph-service-map.txt`
- `generated_output/intermediate/anqstmodel/parsed-after-typegraph.txt`

### Known operational usage

- `AnQstGen/test-anqst-dsl/torture_test.sh` runs:
  - `ANQST_DEBUG=true node ../../dist/src/bin/anqst.js generate ... --backend tsc`
- Script prints and inspects intermediate outputs under torture scenario path.

## 3) Current Runtime Debug Mechanism

### Generated widget API surface

- Generated C++ widget class includes:
  - `bool enableDebug();`
- Current implementation forwards directly:
  - `return AnQstWebHostBase::enableDebug();`

### Runtime transport behavior in generated TS bridge

- Runtime attempts Qt WebChannel first when available.
- Falls back to development WebSocket bridge when Qt transport is unavailable.
- This behavior exists in generated TS runtime emitted by `ast/emit.ts`.

### Runtime diagnostic plumbing

- Generated Qt class declares signal:
  - `diagnosticsForwarded(const QVariantMap& payload)`
- Constructor connects host error signal to `diagnosticsForwarded`.

## 4) Current Diagnostic Surfaces

### Hard failures (generation/verification)

- TypeScript diagnostics from program context become verification errors.
- AST semantic verification errors also fail generation.

### Runtime informational/error channels

- Generated TS WebSocket adapter logs host errors to console.
- Node bridge runtime (generated path) supports diagnostic subscription API and emits structured diagnostic payloads.
- Generated Qt class forwards host diagnostics via signal, but uniform cross-surface schema governance remains a spec concern.

## 5) Known Gaps and Ambiguities (Observed)

- No unified debug-mode contract that explicitly ties:
  - generator dumps,
  - runtime enableDebug semantics,
  - diagnostics schema and lifecycle.
- No documented severity/retention policy for intermediate debug artifacts.
- No explicit contract for debug data privacy/sanitization in dumps.
- No explicit policy for debug behavior in non-dev/production build pipelines.
- Environment-toggle approach (`ANQST_DEBUG`) is operational but not fully formalized in high-level docs.

## 6) Boundaries for Upcoming Specification Discussion

When defining Qt widget debug mode spec, keep these boundaries explicit:

- Build-time debug introspection vs runtime debug behavior.
- Host-owned responsibilities vs generated-widget responsibilities.
- Backend-specific implementation details vs backend-agnostic contract.
- Required diagnostics contract vs optional tooling enhancements.

## 7) Companion References

- `00-Agent-Operating-Protocol.md`
- `01-System-Code-Map.md`
- `02-Current-Architecture-Spec-TSC-QtWidget.md`
- `04-Gaps-Questions-For-Spec-Interview.md`
