# Stage 0 compatibility baseline

This directory freezes the pre-Qt6-only AnQst 1.7.7 contract. It is additive and was captured without modifying generator or runtime logic.

## Coverage

- `minimal` uses the existing torture-suite minimal service spec.
- `comprehensive` uses the existing `CdEntryEditor` example spec and its imported `User` type. It covers every member kind, nested/imported structures, finite string unions, qint64/qint32, call configuration, and drag/drop/hover.
- `codec-leaves` is the only new gap fixture. It covers all integer aliases, `bigint`, `ArrayBuffer`, and every typed-array DSL alias.
- Every case is emitted for Angular, Vanilla TS, Vanilla JS, Node/Express WebSocket, and QWidget targets.

`raw-generated/` contains unmodified strings returned by `generateOutputs()`; build stamps are intentionally absent. `public-contract/` contains the DSL declaration, input specs, every generated `.d.ts`, the three generated public C++ headers, the current public runtime headers inherited/exposed by generated widgets, the wire vocabulary, and codec vectors. `manifest.json` records SHA-256 hashes for generated and public files.

Recreate the generated snapshots from `AnQstGen` with:

```sh
npm run build:test
node ../qt6-migration-baseline/capture-baseline.js
```

The two hand-curated JSON contract files and this documentation are not overwritten by that command.

## Approved compatibility scope

Freeze byte-for-byte the DSL declaration, DSL inputs, all generated public `.d.ts` files, generated public C++ headers, and the public/protected declarations of the inherited runtime base. Generated implementations, JavaScript bundles, private helpers, resources, build stamps, and CMake are reference snapshots whose changes require review but are allowed.

The wire contract and codec vectors are reference/diff baselines, not frozen compatibility constraints. Frontend and backend are generated and built together, so cross-version wire interoperability is not supported or required. Wire redesign remains out of scope for the Qt5-removal migration.

**Status: approved by the project owner before Stage 1.**

## Approved minimum Qt6

Require Qt 6.5 LTS or newer for the Qt6-only release.

Reasoning: 6.5 is a mature LTS baseline with a stable WebEngine/WebChannel generation and the Qt6 metatype/WebEngine APIs needed by the overhaul. Choosing 6.8 LTS would provide a longer runway and newer WebEngine, but materially narrows currently deployable systems; choosing 6.2 preserves older distributions but anchors the overhaul to an older, already superseded LTS line. The Stage 0 suite currently passes on Qt 6.4.2, so approving 6.5 also means intentionally upgrading the project/CI baseline rather than merely documenting the oldest version proven here. If zero-friction continuity with the current environment is more important, 6.4.2 is the evidence-backed alternative.

**Status: approved by the project owner before Stage 1.**
