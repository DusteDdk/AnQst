# System Code Map (Spec -> TSC -> QtWidget)

This map documents the current implementation state for specification work.

Implementation is forbidden while using this map. Follow `00-Agent-Operating-Protocol.md`.

## 1) Spec and Contract Sources

### `spec/AnQst-Spec-DSL.d.ts`

- Purpose: DSL surface and type-level authoring contract.
- Key symbols: `AnQst.Service`, `AnQst.Call`, `AnQst.Slot`, `AnQst.Emitter`, `AnQst.Input`, `AnQst.Output`, `AnQst.Type.*`.
- Incoming deps: widget spec files import and use this namespace.
- Outgoing deps: parser/verify/emitter interpret these markers.
- Debug relevance: debug mode spec must preserve semantics of member kinds and mappings.

### `spec/AnQst-Main-Spec.md`

- Purpose: command and behavior contract at product level.
- Key sections: bootstrap behavior, build/generate semantics, host bridge bootstrap, near-term targets.
- Incoming deps: reference for CLI and output expectations.
- Outgoing deps: constrains implementation behavior.
- Debug relevance: contains diagnostics and runtime contract direction.

### `RefinedSpecs/02-Interaction-Semantics.md`

- Purpose: interaction and error semantics across bridge operations.
- Key sections: call/slot/emitter/input/output behavior expectations.
- Incoming deps: generation/runtime behavior should align.
- Outgoing deps: informs debug diagnostics semantics.
- Debug relevance: basis for what debug output should explain during failures.

### `RefinedSpecs/03-Generator-Output-Contracts.md`

- Purpose: deterministic output contract for TS and Qt bundles.
- Key symbols: `enableDebug()` requirement, type mapping, diagnostics requirements.
- Incoming deps: emitter/runtime must match.
- Outgoing deps: future spec for debug mode must remain contract-consistent.
- Debug relevance: explicit requirement for one-way development switch and diagnostics surface.

## 2) CLI and Backend Orchestration Layer

### `AnQstGen/src/bin/anqst.ts`

- Purpose: CLI executable entrypoint.
- Key symbols: delegates to `runCommand(...)`.
- Incoming deps: shell command `anqst`.
- Outgoing deps: `app.ts`.
- Debug relevance: no direct debug logic; routing only.

### `AnQstGen/src/app.ts`

- Purpose: command dispatcher and build/generate/verify control plane.
- Key symbols:
  - `runCommand(...)`
  - `runBuild(...)`, `runGenerate(...)`, `runVerify(...)`
  - `generationTargetsForBackend(...)`
- Incoming deps: `bin/anqst.ts`.
- Outgoing deps:
  - backend resolver (`backend/index.ts`)
  - artifact writers/installers (`emit.ts`)
  - project config parsing (`project.ts`)
- Critical behavior:
  - `--backend tsc` disables AngularService target and keeps QWidget + node.
  - `runBuild` optionally runs `ng build` then embeds web bundle when QWidget is enabled.
- Debug relevance:
  - determines whether debug-capable Qt artifacts are emitted.
  - controls build-time paths where debug artifacts appear.

### `AnQstGen/src/project.ts`

- Purpose: package.json `AnQst` config resolution and instill scaffolding.
- Key symbols:
  - `resolveAnQstSpecPath(...)`
  - `resolveAnQstGenerateTargets(...)`
  - `DEFAULT_ANQST_GENERATE_TARGETS`
- Incoming deps: `app.ts`.
- Outgoing deps: file system and package settings behavior.
- Debug relevance: target selection can include/exclude QWidget path entirely.

### `AnQstGen/src/backend/types.ts`

- Purpose: backend abstraction contract.
- Key symbols:
  - `BackendId = "ast" | "tsc"`
  - `GeneratorBackend` interface
- Incoming deps: backend implementations conform to this interface.
- Outgoing deps: `app.ts` uses as stable backend API.
- Debug relevance: any debug mode semantics crossing backends should likely live at this contract boundary or above it.

### `AnQstGen/src/backend/index.ts`

- Purpose: backend registry and resolver.
- Key symbols: `resolveBackend(...)`, `isBackendId(...)`.
- Incoming deps: `app.ts`.
- Outgoing deps: `astBackend`, `tscBackend`.
- Debug relevance: current debug focus path is `tscBackend`.

## 3) TSC Backend Path (Spec -> Model -> Verify)

### `AnQstGen/src/backend/tsc/index.ts`

- Purpose: TSC backend composition and target-specific emit dispatch.
- Key symbols: exported `tscBackend`, `generateOutputs(...)`.
- Incoming deps: backend resolver.
- Outgoing deps:
  - `parser.ts`
  - `verify.ts`
  - `emit-cpp.ts`
  - `emit-node.ts`
- Debug relevance: top-level entry where parsed model stats are logged and outputs selected.

### `AnQstGen/src/backend/tsc/program.ts`

- Purpose: TypeScript Program creation and diagnostics extraction.
- Key symbols:
  - `createTscProgramContext(...)`
  - `getProgramDiagnostics(...)`
  - `getTscProgramContext(...)`
- Incoming deps: `tsc/parser.ts`, `tsc/verify.ts`, `tsc/typegraph.ts`.
- Outgoing deps:
  - TS compiler API
  - debug dump files under `generated_output/intermediate/tsc/*` when enabled.
- Debug relevance:
  - central source for compiler diagnostics.
  - writes `program-context.txt`, `program-files.txt`, `sourcefile-ast.txt`.

### `AnQstGen/src/backend/tsc/parser.ts`

- Purpose: TSC parse orchestration (AST parse + checker-driven normalization).
- Key symbols: `parseSpecFile(...)`.
- Incoming deps: `tsc/index.ts`.
- Outgoing deps:
  - AST parser (`../ast/parser`)
  - typegraph application (`./typegraph`)
  - program context initialization (`./program`)
- Debug relevance:
  - writes parsed model snapshots pre/post typegraph:
    - `anqstmodel/parsed-before-typegraph.txt`
    - `anqstmodel/parsed-after-typegraph.txt`.

### `AnQstGen/src/backend/tsc/typegraph.ts`

- Purpose: resolve member payload and parameter types using TypeChecker.
- Key symbols:
  - `collectServiceTypes(...)`
  - `applyResolvedTypeGraph(...)`
  - specialized handling for `z.infer`.
- Incoming deps: `tsc/parser.ts`.
- Outgoing deps: updates `ParsedSpecModel.services[*].members[*].typeText/payloadTypeText`.
- Debug relevance:
  - writes `anqstmodel/typegraph-service-map.txt`.
  - essential for understanding debug mismatches between DSL text vs resolved types.

### `AnQstGen/src/backend/tsc/verify.ts`

- Purpose: TSC verification chain.
- Key symbols: `verifySpec(...)`.
- Incoming deps: `tsc/index.ts`.
- Outgoing deps:
  - diagnostics from `program.ts`
  - AST semantic verifier (`../ast/verify`)
- Debug relevance:
  - converts TS diagnostics into hard verification errors before generation.

### `AnQstGen/src/backend/tsc/debug-dump.ts`

- Purpose: opt-in debug artifact writer.
- Key symbols:
  - `isDebugEnabled()` using env `ANQST_DEBUG === "true"`.
  - `writeDebugFile(...)`
  - `inspectText(...)`
- Incoming deps: `program.ts`, `parser.ts`, `typegraph.ts`.
- Outgoing deps: filesystem writes under `generated_output/intermediate`.
- Debug relevance: current generator-side debug mode toggle and plumbing.

## 4) Emit Layer and QtWidget Generation

### `AnQstGen/src/backend/tsc/emit-cpp.ts`

- Purpose: TSC backend QWidget emission adapter.
- Key symbols: `emitCppQWidget(...)`.
- Incoming deps: `tsc/index.ts`.
- Outgoing deps: delegates to AST emitter with `emitQWidget=true`.
- Debug relevance: confirms TSC QWidget emission currently uses AST emitter internals.

### `AnQstGen/src/backend/tsc/emit-node.ts`

- Purpose: TSC backend node_express_ws emission adapter.
- Key symbols: `emitNodeExpressWs(...)`.
- Incoming deps: `tsc/index.ts`.
- Outgoing deps: delegates to AST emitter with node-only output enabled.
- Debug relevance: provides a second runtime/diagnostic path for development transport.

### `AnQstGen/src/backend/ast/emit.ts`

- Purpose: concrete artifact generation logic for TS, Qt C++, and Node bridge.
- Key symbols (Qt-focused):
  - `renderWidgetHeader(...)`
  - `renderCppStub(...)`
  - `renderTypesHeader(...)`
  - `renderCMake(...)`
  - `generateOutputs(...)`
- Incoming deps: AST backend directly and TSC emission adapters.
- Outgoing deps: generated files map consumed by `writeGeneratedOutputs(...)`.
- Debug relevance:
  - generated Qt class includes `enableDebug()`.
  - generated bridge wiring includes diagnostics forwarding signal.
  - generated TS runtime chooses Qt WebChannel vs WebSocket transport at runtime.

### `AnQstGen/src/emit.ts`

- Purpose: artifact persistence and install/integration helpers.
- Key symbols:
  - `writeGeneratedOutputs(...)`
  - `installQtIntegrationCMake(...)`
  - `installEmbeddedWebBundle(...)`
- Incoming deps: `app.ts`.
- Outgoing deps: disk outputs in `generated_output` and `anqst-cmake/CMakeLists.txt`.
- Debug relevance:
  - determines final placement of generated Qt artifacts and embedded web assets.
  - build path for development mode depends on generated bundle and host integration.

## 5) Host Runtime and Debug Runtime Expectations

### `AnQstWidget/AnQstWebBase/README.md`

- Purpose: host base design scope and development-mode behavior.
- Key points: `enableDebug()` switches to HTTP/WS dev flow and host-owned bootstrap.
- Incoming deps: generated Qt widget class uses this host base.
- Outgoing deps: informs runtime debug mode expectations and transport behavior.
- Debug relevance: runtime-side debug mode contract anchor.

## 6) Validation, Fixtures, and Real Generated Examples

### `AnQstGen/test/cli.test.ts`

- Purpose: command behavior tests including backend flags and generation paths.
- Debug relevance: protects command contracts that influence debug workflows.

### `AnQstGen/test/emit.test.ts`

- Purpose: output artifact generation tests.
- Debug relevance: verifies deterministic output scaffolding where debug hooks may appear.

### `AnQstGen/test/parser_verify.test.ts`

- Purpose: parse/verify behavior tests.
- Debug relevance: validates baseline semantics before debug instrumentation.

### `AnQstGen/test-anqst-dsl/torture_test.sh`

- Purpose: progressive DSL stress path with TSC generation and C++ smoke build.
- Key behavior: runs generation with `ANQST_DEBUG=true`.
- Debug relevance:
  - canonical script demonstrating current debug dump usage.
  - prints `generated_output/intermediate` artifacts for inspection.

### `Examples/example-qt-app/lib/widgets/CdEntryEditor/*`

- Purpose: real integration sample with generated widget output and integration CMake.
- Key files:
  - `CdEntryEditor.AnQst.d.ts`
  - `generated_output/CdEntryEditor_QtWidget/*`
  - `anqst-cmake/CMakeLists.txt`
  - `generated_output/intermediate/*` (when debug enabled)
- Debug relevance: concrete on-disk example of emitted Qt and intermediate debug artifacts.

## 7) Cross-Layer Dependency Summary

- Spec DSL authoring drives parsed model shape.
- `app.ts` and backend contract gate which path executes.
- TSC path = AST parse + TS checker normalization + TS diagnostics verification.
- QWidget emission for TSC currently delegates to AST emitter templates.
- Generated Qt widget exposes `enableDebug()` and bridge wiring to host base.
- Generator debug dumps are opt-in via `ANQST_DEBUG=true`.

## 8) Notes for Specification Interview

- Keep this map descriptive, not prescriptive.
- Treat every behavior here as "current observed implementation," not final design.
- For future design changes, capture deltas in `04-Gaps-Questions-For-Spec-Interview.md` first, then discuss.

## 9) Companion References

- `00-Agent-Operating-Protocol.md`
- `02-Current-Architecture-Spec-TSC-QtWidget.md`
- `03-QtWidget-Debug-Reality-Today.md`
- `04-Gaps-Questions-For-Spec-Interview.md`
