# CdEntryEditor generated bridge — file-by-file review

**Scope:** Artifacts produced by `npx anqst build` for the CdEntryEditor widget (example-qt-app), rooted at:

`Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/`

**Recorded generator stamp:** `Built by AnQst 57d0492_dirty_build_2` (prepended via `withBuildStamp` in `AnQstGen/src/emit.ts`).

**Central orchestration:** `generateOutputs` in `AnQstGen/src/emit.ts` wires TypeScript, C++, and optional Node outputs; `buildBoundaryCodecCatalog` in `AnQstGen/src/boundary-codecs.ts` feeds boundary-specific encode/decode emission for both TS and C++ (`renderTsBoundaryCodecHelpers`, `renderCppBoundaryCodecHelpers` from `AnQstGen/src/boundary-codec-render.ts`, invoked from `emit.ts`).

---

## Summary verdict

| Area | Verdict |
|------|---------|
| **Layout vs `03-Generator-Output-Contracts.md`** | **Pass** — umbrella header, `${WidgetName}Widget`, `handle` for `Call`, `slot_` slots, signals, `Q_PROPERTY` for `Input`/`Output`, Angular package + DI-oriented surface. |
| **Runtime vs `02-Interaction-Semantics.md`** | **Pass** — Call queue cap 1024, emitter drop when no listener, slot timeout / error strings, structured Call errors on TS side. |
| **Codec / types** | **Pass with notes** — `Genre` is a closed domain on wire (uint8 code) and `enum class` in C++; `AnQst.Type.qint64`/`qint32` map through planned codecs; TS helpers still allocate `DataView` per multi-byte read in generated readers (see `boundary-codec-render.ts`). |
| **Housekeeping** | **Minor** — `types/index.d.ts` contains a duplicated `User` import (cosmetic); `CdEntryEditor.h` still contains a stale `// Built by <AnQst_version>` line after the real stamp (template residue in `renderWidgetUmbrellaHeader`). |

---

## Frontend — `generated/frontend/CdEntryEditor_Angular/`

### `package.json`

- **Role:** NPM package manifest for the generated Angular library; `exports` map entrypoints for types and runtime.
- **Verdict:** **Pass.** Matches `renderNpmPackage` (`emit.ts`). `anqst.widget` / `anqst.services` metadata matches the spec root.
- **Implementation:** `renderNpmPackage` (`emit.ts` ~2038+); stamp via `withBuildStamp` for JSON (`emit.ts` ~1989–2007).

### `index.ts`

- **Role:** Re-exports `Services` / `Types` type aliases for barrel consumption.
- **Verdict:** **Pass.**
- **Implementation:** `renderTsIndex` → `renderTypeIndexDts` companion paths (`emit.ts` ~3215+).

### `services.ts`

- **Role:** Injectable `CdEntryService`, `AnQstBridgeDiagnostics`, Qt WebChannel + dev transport adapters, `set` / `onSlot`, boundary codec helpers (`encodeAnQstStructured_*` / `decodeAnQstStructured_*`), drag/drop decode hooks.
- **Verdict:** **Pass.** Aligns with generator output contracts (Promise `Call`, slot registration, signals-backed `Input`/`Output` accessors, diagnostic stream). Embedded `Genre` encoding uses explicit switch → uint8 push (finite domain), consistent with `BoundaryPlanBuilder.buildFiniteDomainNode` (`boundary-codec-plan.ts` ~285–327).
- **Implementation:** `renderTsServices` (`emit.ts` ~2331+); per-member method bodies from `renderTsService` (`emit.ts` ~2096+); helpers from `renderTsBoundaryCodecHelpers` (`boundary-codec-render.ts`, included at `emit.ts` ~2346); catalog from `buildBoundaryCodecCatalog` (`boundary-codecs.ts` ~119+).

### `types.ts`

- **Role:** Runtime type module (re-exports / shapes as needed for bundling).
- **Verdict:** **Pass** (supporting artifact for dual TS/JS emit).
- **Implementation:** `renderTsTypes` (`emit.ts` ~3154+).

### `index.js`, `services.js`, `types.js`

- **Role:** Minimal CommonJS stubs (`"use strict"; exports.__esModule = true`) so Node-style resolution works before/without TS compilation of consumers.
- **Verdict:** **Pass** (intentionally thin).
- **Implementation:** `renderJsIndex`, `renderJsServices`, `renderJsTypes` (`emit.ts` ~3227–3241).

### `types/index.d.ts`

- **Role:** Aggregated public `.d.ts` barrel (types + service + bridge diagnostics).
- **Verdict:** **Pass with note** — duplicate `import type { User } from "../../../../../types/User";` appears twice (lines 5 and 39 in the captured build). Does not affect type validity; generator could dedupe in `renderTypeRootIndexDts`.
- **Implementation:** `renderTypeRootIndexDts` (`emit.ts` ~4043+).

### `types/types.d.ts`

- **Role:** Exchange types mirroring the widget namespace; `cdId` / `SaveResult.cdId` as `bigint` matching `AnQst.Type.qint64` TS mapping.
- **Verdict:** **Pass** — literal union `Genre` preserved per contract.
- **Implementation:** `renderTypeTypesDts` (`emit.ts` ~3205+); underlying decls `renderTypeDeclarations` / `renderTsTypes`.

### `types/services.d.ts`

- **Role:** `CdEntryService` surface, `set` / `onSlot`, bridge diagnostic types, drop/hover read models.
- **Verdict:** **Pass.**
- **Implementation:** `renderTypeServicesDts` (`emit.ts` ~3164+).

---

## Backend — Qt widget library — `generated/backend/cpp/qt/CdEntryEditor_widget/`

### `include/CdEntryEditor.h`

- **Role:** Umbrella header including `CdEntryEditorWidget.h` and `CdEntryEditorTypes.h` (contract §2 naming).
- **Verdict:** **Pass with note** — second line `// Built by <AnQst_version>` is leftover template text; first line has the real stamp.
- **Implementation:** `renderWidgetUmbrellaHeader` (`emit.ts` ~1196+).

### `include/CdEntryEditorTypes.h`

- **Role:** C++ carriers: `enum class Genre`, structs, `std::optional` for optional fields, `Q_DECLARE_METATYPE` / drag MIME constant.
- **Verdict:** **Pass** — closed `Genre` domain preserved; `qint64`/`qint32` fields match advisory directives; imported `User` nested shape uses lifted `User_meta` (consistent with `CppTypeNormalizer` / emit tests for anonymous nesting).
- **Implementation:** `renderTypesHeader` (`emit.ts` ~1163+); `CppTypeNormalizer` (`emit.ts` ~582+); enum emission `renderCppDecl` for `kind: "enum"` (`emit.ts` ~848+).

### `include/CdEntryEditorWidget.h`

- **Role:** `CdEntryEditorWidget` subclassing `AnQstWebHostBase`, `Q_PROPERTY` for `Output`/`Input`, nested `handle` class for `Call` handlers, `public slots:` `slot_*`, signals, queue/call private machinery, static drag helpers.
- **Verdict:** **Pass** — matches `03-Generator-Output-Contracts` §4.1–4.2 and addendum (natural signal names, `slot_` prefix). `kMaxQueuedCallsPerEndpoint = 1024` matches `02-Interaction-Semantics` §3.1 / §8.1.
- **Implementation:** `renderWidgetHeader` (`emit.ts` ~1204+); private bridge helpers generated in the same function block as shown in repo (~1319–1356, 1680+).

### `CdEntryEditor.cpp`

- **Role:** Generated `encode*` / `decode*` for boundary codecs (calling shared `AnQstWebBase` base93 helpers), `handleGeneratedCall` queue + `waitForCallHandlerAndInvoke`, meta-type registration, `invokeSlot` bridge path, drag payload encode/decode, `installBridgeBindings`.
- **Verdict:** **Pass** — behavioral match to interaction semantics; codecs emitted via `renderCppStub` + `renderCppBoundaryCodecHelpers` (`emit.ts` ~1360–1365, 1706+).
- **Implementation:** `renderCppStub` (`emit.ts` ~1360+); C++ codec body from `boundary-codec-render.ts` (included through `renderCppBoundaryCodecHelpers`).

### `CMakeLists.txt`

- **Role:** `CdEntryEditorWidget` library target, MOC/RCC, link to `anqstwebhostbase`, public include dir.
- **Verdict:** **Pass** — matches §4.4 “widget library + MOC/autogen”.
- **Implementation:** `renderCMake` (`emit.ts` ~1924+).

### `CdEntryEditor.qrc`

- **Role:** Qt resource prefix `/cdentryeditor` embedding hashed Angular outputs under `webapp/`.
- **Verdict:** **Pass** — filenames match the user’s Angular build (`main-Z5P7OYID.js`, etc.); list refreshed by `installEmbeddedWebBundle` (`emit.ts` ~4250+), QRC rewritten with `withBuildStamp` on the qrc path (`emit.ts` ~4268).
- **Implementation:** `renderEmbeddedQrc` (`emit.ts` ~2022+); file list populated at install time.

### `webapp/*` (`index.html`, `main-*.js`, `styles-*.css`, `favicon.ico`)

- **Role:** Copied browser bundle from `dist/…`; not authored by AnQstGen beyond path normalization in `normalizeEmbeddedIndexHtml` (called from `installEmbeddedWebBundle`).
- **Verdict:** **N/A (downstream Angular)** — integrity/size are a function of the Angular app, not the generator.
- **Implementation:** `copyDirectoryRecursive` / `resolveDistWebRoot` (`emit.ts` ~4158+).

---

## Backend — CMake integration — `generated/backend/cpp/cmake/CMakeLists.txt`

- **Role:** Guarded `add_subdirectory` into the widget tree, required-file manifest, clear fatal error if codegen not run (no `npm`/`npx` in CMake per contract).
- **Verdict:** **Pass.**
- **Implementation:** `renderQtIntegrationCMake` (`emit.ts` ~4296+); installed by `installQtIntegrationCMake` (`emit.ts` ~4342+).

---

## Traceability cheat sheet

| Generated artifact | Primary emitter(s) in AnQstGen |
|--------------------|----------------------------------|
| TS service + codecs | `renderTsServices`, `renderTsService`, `renderTsBoundaryCodecHelpers` (`emit.ts`; `boundary-codec-render.ts`) |
| TS types / `.d.ts` | `renderTsTypes`, `renderTypeTypesDts`, `renderTypeServicesDts`, `renderTypeRootIndexDts` (`emit.ts`) |
| C++ types header | `renderTypesHeader` (`emit.ts`) |
| C++ widget header | `renderWidgetHeader` (`emit.ts`) |
| C++ widget body | `renderCppStub`, `renderCppBoundaryCodecHelpers` (`emit.ts`; `boundary-codec-render.ts`) |
| Widget CMake | `renderCMake` (`emit.ts`) |
| Integration CMake | `renderQtIntegrationCMake` (`emit.ts`) |
| QRC + webapp sync | `renderEmbeddedQrc`, `installEmbeddedWebBundle` (`emit.ts`) |
| NPM package | `renderNpmPackage` (`emit.ts`) |
| Codec planning | `buildBoundaryCodecCatalog` → `BoundaryTransportAnalyzer` (`boundary-codec-analysis.ts`) → `buildBoundaryCodecPlan` (`boundary-codec-plan.ts`) |

---

## Suggested follow-ups (generator / docs only)

1. Remove duplicate `User` import in aggregated `types/index.d.ts` (`renderTypeRootIndexDts`).
2. Drop or replace the stale `<AnQst_version>` placeholder in `renderWidgetUmbrellaHeader` output.
3. Optional micro-optimization: reuse a single `DataView` or manual byte reads in TS blob decoders (`boundary-codec-render.ts`) to avoid per-field `new DataView` in hot decode paths (already noted in `AnQstGen/docs/codec-efficiency-audit.md`).
