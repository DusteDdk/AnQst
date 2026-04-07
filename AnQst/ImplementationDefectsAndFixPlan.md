# Implementation Defects And Fix Plan

## Scope

This document analyzes the failure reproduced with:

```bash
cd Examples/example-qt-app
./rebuild.sh full
./run_headless.sh
```

Observed runtime output:

```text
js: ERROR TypeError: Cannot convert 0 to a BigInt
js: TypeError: Cannot convert 0 to a BigInt
terminate called after throwing an instance of 'std::runtime_error'
  what():  [Timeout] CdEntryService.showDraft: The webapp inside the widget did not anwser within 1000 ms.
Aborted (core dumped)
```

Investigation covered:

- `RefinedSpecs/Prose/*`
- `RefinedSpecs/Codecs/*`, especially `BigInt_qint64_Codec.md` and `Structured_TopLevelCodec_Strategy.md`
- `AnQstGen`
- `AnQstWidget/AnQstWebBase`
- generated artifacts under `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated`
- the example Angular app and Qt host integration

## Executive Summary

The `qint64 <-> bigint` contract is specified correctly and generated correctly. The crash is not caused by a broken base93 codec or a frontend/backend wire mismatch.

The immediate failure is caused by the example Angular app constructing a `CdDraft` with `cdId: 0 as unknown as bigint` and publishing it through the generated `draft` input before slot handlers are registered:

- `CdDraft.cdId` is specified as `AnQst.Type.qint64`, which maps to TypeScript `bigint`.
- the generated structured codec encodes that field with `DataView.setBigInt64(...)`, which requires an actual `bigint`.
- the example passes a plain JavaScript `number` (`0`), so the codec throws `TypeError: Cannot convert 0 to a BigInt`.

The later C++ timeout is a downstream symptom:

- the Angular component crashes during construction
- slot handlers are never registered
- the Qt host synchronously calls `slot_showDraft(...)`
- the bridge queues the slot request waiting for registration
- no registration ever arrives
- the default 1000 ms slot timeout fires
- the example host does not catch the resulting `std::runtime_error`, so the process aborts

There is also a second, deeper design defect: the example spec uses `showDraft(draftJson: string, ...)` and `saveRequested(draftJson: string)` instead of typed `CdDraft` payloads, forcing the application to hand-roll JSON serialization for a type that contains a `qint64`/`bigint` field. That directly works against the core AnQst design: application code should not implement transport serialization, and `bigint` specifically is not JSON-native.

## Spec Baseline

The relevant spec story is coherent:

- `RefinedSpecs/Codecs/BigInt_qint64_Codec.md:7-19` defines `AnQst.Type.qint64` as TypeScript `bigint`, C++ `qint64`, encoded as 8 bytes and explicitly notes that plain JSON is not sufficient for `BigInt`.
- `RefinedSpecs/Codecs/BigInt_qint64_Codec.md:23-33` defines the TS encoder in terms of `BigInt64Array` / 64-bit integer semantics.
- `RefinedSpecs/Codecs/BigInt_qint64_Codec.md:90-92` also states that the codec assumes values already satisfy the contract; it does not add runtime validation.
- `RefinedSpecs/Codecs/Structured_TopLevelCodec_Strategy.md:50-72` and `:366-426` define that `CdDraft.cdId` participates in the shared byte blob as an 8-byte bigint field.
- `RefinedSpecs/Prose/AnQst-Mission-and-Philosophy.md:21-29` says generated code should handle serialization/deserialization so both sides stay in native idioms.
- `RefinedSpecs/Prose/AnQst-Mission-and-Philosophy.md:45-47` says bridge internals and serialization details must not leak into application code.
- `RefinedSpecs/Prose/AnQst-Codec-Design-Principles.md:7-17` says there is no generic fallback path and codecs exist to preserve correct language-appropriate representations.
- `RefinedSpecs/02-Interaction-Semantics.md:41-45` and `RefinedSpecs/Prose/AnQst-Architecture-and-Design-Principles.md:122-125` define slot pre-registration queueing.
- `RefinedSpecs/02-Interaction-Semantics.md:71-75` defines slot failure behavior, including the default 1000 ms timeout.
- `RefinedSpecs/02-Interaction-Semantics.md:137-139` says `Emitter`, `Input`, and `Output` errors should be diagnostic, not default hard-crashes.

So the spec-level picture is:

1. `qint64` on the TS side means `bigint`.
2. the generated codec expects that contract to be respected.
3. application code should not bypass generated transport logic with manual JSON transport for strongly typed values.

## What The Generator And Generated Artifacts Get Right

The core mapping is correct:

- `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/CdEntryEditor.AnQst.d.ts:12-23` defines `CdDraft.cdId` as `AnQst.Type.qint64`.
- `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/frontend/CdEntryEditor_Angular/types.ts:11-22` maps that to `cdId: bigint`.
- `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/backend/cpp/qt/CdEntryEditor_widget/include/CdEntryEditorTypes.h:33-45` maps it to `qint64`.
- `AnQstGen/src/emit.ts:22-54` and `AnQstGen/src/structured-top-level-codecs.ts:5-36` map `AnQst.Type.qint64` to `bigint` in TypeScript.
- `AnQstGen/src/structured-top-level-codecs.ts:666-706` selects `__anqstPushBigInt64` / `__anqstReadBigInt64` for `qint64`.
- `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/frontend/CdEntryEditor_Angular/services.ts:67-79` emits those helpers exactly as expected.
- `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/frontend/CdEntryEditor_Angular/services.ts:244-304` correctly encodes and decodes `CdDraft.cdId` as a bigint field.

Conclusion: the spec, generator, and generated codec for `qint64` are aligned. The primary defect is invalid application-level values being handed to a correct codec.

## Root Cause Chain

1. `CdDraft.cdId` is a `bigint` contract on the frontend.
2. The example Angular app constructs invalid values:
   - `Examples/example-qt-app/lib/widgets/CdEntryEditor/src/app/app.ts:220-224` uses `cdId: 0 as unknown as bigint`.
   - `Examples/example-qt-app/lib/widgets/CdEntryEditor/src/app/app.ts:59-63` parses user input with `Number.parseInt(...)` and again casts a `number` to `bigint`.
3. The generated `draft` input setter encodes immediately:
   - `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/frontend/CdEntryEditor_Angular/services.ts:1084-1088`
4. The structured codec hits:
   - `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/frontend/CdEntryEditor_Angular/services.ts:244-246`
   - `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/frontend/CdEntryEditor_Angular/services.ts:67`
5. `DataView.setBigInt64(0, 0, true)` throws `TypeError: Cannot convert 0 to a BigInt`.
6. This happens during Angular component construction, before slot handlers are registered:
   - `Examples/example-qt-app/lib/widgets/CdEntryEditor/src/app/app.ts:27-33`
7. The Qt host then calls:
   - `Examples/example-qt-app/MainWindow.cpp:330-333`
8. The bridge queues the pre-registration slot request and waits:
   - `AnQstWidget/AnQstWebBase/src/AnQstHostBridgeFacade.cpp:36-90`
9. No slot registration ever happens because frontend bootstrap already failed.
10. The generated C++ widget turns that into:
   - `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/backend/cpp/qt/CdEntryEditor_widget/CdEntryEditor.cpp:1368-1383`
11. The example host does not catch the exception, so the process aborts.

## Defect Inventory

### D1. The example Angular app violates the `qint64 -> bigint` contract at startup

Evidence:

- `Examples/example-qt-app/lib/widgets/CdEntryEditor/src/app/app.ts:27-29`
- `Examples/example-qt-app/lib/widgets/CdEntryEditor/src/app/app.ts:220-224`

Why this is defective:

- this is not a type-level quirk; it is a runtime contract violation
- the cast only suppresses TypeScript errors; it does not produce a bigint value
- the generated codec is entitled to assume it was given a bigint per the spec

Severity: Critical

### D2. The CD-ID editing path is wrong even beyond the immediate crash

Evidence:

- `Examples/example-qt-app/lib/widgets/CdEntryEditor/src/app/app.ts:59-63`

Why this is defective:

- `Number.parseInt(...)` cannot represent the full `qint64` range precisely on the JS side
- even if the code were changed to `BigInt(parsed)`, precision would already be lost for large values
- the correct conversion path for a `qint64` text input is string -> `BigInt`, not string -> `number`

Severity: Critical

### D3. The example spec creates a manual shadow transport protocol for `CdDraft`

Evidence:

- `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/CdEntryEditor.AnQst.d.ts:44-48`
- `Examples/example-qt-app/lib/widgets/CdEntryEditor/src/app/app.ts:177-205`
- `Examples/example-qt-app/MainWindow.cpp:59-96`

Why this is defective:

- `showDraft` and `saveRequested` move `CdDraft` over the bridge as JSON text instead of as `CdDraft`
- that bypasses the generated structured codec for a type that already has a correct codec
- it leaks serialization responsibility into application code, contrary to `RefinedSpecs/Prose/AnQst-Mission-and-Philosophy.md:21-29,45-47`
- it is especially bad for a type containing `qint64`, because `bigint` is specifically not JSON-native

Additional consequence:

- runtime `cdId` values become path-dependent:
  - generated bridge paths yield actual `bigint`
  - JSON paths can yield strings
  - the TypeScript types claim both are `bigint`

Severity: Critical

### D4. The startup ordering makes the symptom much worse

Evidence:

- `Examples/example-qt-app/lib/widgets/CdEntryEditor/src/app/app.ts:27-33`

Why this is defective:

- the component publishes `draft` before registering `onSlot.showDraft`
- once the early publish throws, slot registration never happens
- the host-side timeout is therefore guaranteed

This is not the original bug, but it amplifies the failure mode from “bad publish” into “whole widget startup aborts”.

Severity: High

### D5. The Qt host example treats slot failures as fatal process aborts

Evidence:

- `Examples/example-qt-app/MainWindow.cpp:330-333`
- generated slot throwing behavior at `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/backend/cpp/qt/CdEntryEditor_widget/CdEntryEditor.cpp:1368-1383`

Why this is defective:

- the spec explicitly defines slot failures as exceptions
- the example host invokes a throwing API without local handling
- as a result, any widget-side failure during selection becomes an uncaught exception and process abort

The example should model robust host integration, not just the happy path.

Severity: High

### D6. The generated TypeScript service API is type-unsound for unset `Input`/`Output` state

Evidence:

- generator: `AnQstGen/src/emit.ts:1536-1544`
- generated output: `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/frontend/CdEntryEditor_Angular/services.ts:1068-1072`
- getter surface: `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/frontend/CdEntryEditor_Angular/services.ts:1121-1125`

Why this is defective:

- the generated signals are initialized with `(undefined as unknown) as T`
- getters return `T`, but the actual runtime value can be `undefined`
- this forces consumers into defensive `try/catch` or false assumptions
- it makes type errors look like application bugs when they are actually generator surface bugs

This does not cause the observed BigInt crash directly, but it is the same quality failure pattern: unsound casts instead of truthful types.

Severity: High

### D7. `Input` publication currently throws raw codec exceptions instead of downgrading to diagnostics

Evidence:

- spec contract: `RefinedSpecs/02-Interaction-Semantics.md:137-139`
- generator: `AnQstGen/src/emit.ts:1541-1544`
- generated output: `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/frontend/CdEntryEditor_Angular/services.ts:1084-1092`

Why this is defective:

- `draft.set(...)` performs encoding synchronously in user code
- if encoding throws, the raw exception escapes directly into Angular application code
- the current implementation does not convert this into a structured diagnostic path

This matters because the observed failure is exactly an `Input` publication failure that hard-crashes widget bootstrap.

Severity: High

### D8. Diagnostics are incomplete and transport-asymmetric

Evidence:

- dev WebSocket path logs `hostError`: `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/frontend/CdEntryEditor_Angular/services.ts:809-810`
- Qt `QWebChannel` adapter has no equivalent host-error signal surface: `AnQstWidget/AnQstWebBase/src/AnQstBridgeProxy.h:15-28`
- generated widget exposes `diagnosticsForwarded`, but the example host does not consume it:
  - `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/backend/cpp/qt/CdEntryEditor_widget/include/CdEntryEditorWidget.h:88`
  - `Examples/example-qt-app/MainWindow.cpp` does not connect to that signal

Why this is defective:

- the bridge has some diagnostic machinery, but it is not surfaced consistently
- in Qt mode, the frontend does not receive the same host diagnostics the dev transport sees
- the host example also fails to subscribe to its own generated diagnostic signal

Severity: Medium

## Important Non-Conclusions

These are **not** the root problem:

- the `qint64` base93 codec design itself
- the frontend/backend build stamp or artifact mismatch
- the structured codec packing plan for `CdDraft`

The generated mapping and codec strategy are internally consistent. The problem is that the example and parts of the generated runtime surface are not respecting or protecting the contract.

## Recommended Target Architecture

For this example, the correct end state is:

1. `CdDraft` crosses the bridge only as `CdDraft`, never as manual JSON text.
2. `qint64` values are represented as `bigint` in Angular code at all times.
3. text input converts explicitly and losslessly between UI strings and `bigint`.
4. generated service getters model “unset” state honestly.
5. `Input`/`Output`/`Emitter` failures surface as diagnostics, not uncaught transport exceptions by default.
6. the host example catches slot exceptions and exposes diagnostics instead of aborting the process.

## Comprehensive Fix Plan

### Phase 0: Immediate Stabilization

Goal: make the example stop crashing and make failures observable.

Changes:

1. Fix the Angular example’s bigint construction and parsing.
   - Replace `0 as unknown as bigint` with `0n`.
   - Replace `Number.parseInt(...)` for `cdId` with string -> `BigInt(...)` conversion.
   - Handle empty/invalid input explicitly without ever creating a `number`-typed `cdId`.
2. Register slot handlers before any optional local bootstrap publish.
   - Move `onSlot.focusField(...)`, `onSlot.showDraft(...)`, and `onSlot.replaceTracks(...)` ahead of any `set.draft(...)`.
3. Catch slot exceptions in the Qt example host.
   - wrap `editorWidget->slot_showDraft(...)` in `try/catch`
   - show error state in the UI/status bar/log instead of aborting
4. Connect the example host to `diagnosticsForwarded`.

Expected result:

- startup no longer crashes on `0`
- slot failures become diagnosable instead of process-fatal

### Phase 1: Remove The Manual JSON Shadow Protocol

Goal: stop bypassing AnQst for `CdDraft`.

Changes:

1. Change the example spec:
   - `showDraft(draftJson: string, selectedTrackIndex: number): AnQst.Slot<void>`
     -> `showDraft(draft: CdDraft, selectedTrackIndex: number): AnQst.Slot<void>`
   - `saveRequested(draftJson: string): AnQst.Call<SaveResult>`
     -> `saveRequested(draft: CdDraft): AnQst.Call<SaveResult>`
2. Re-run `anqst build` so the generated TS and C++ APIs use typed `CdDraft`.
3. Delete bridge-boundary JSON helpers from the Angular example:
   - `parseDraftJson(...)`
   - `serializeDraftForHost(...)`
4. Delete bridge-boundary JSON helpers from the Qt host interaction path:
   - stop using `draftToJson(...)` / `draftFromJson(...)` for `showDraft` / `saveRequested`
   - use typed `CdDraft` directly for bridge calls

Important nuance:

- it is acceptable to keep JSON for local persistence in `QSettings`
- it is not acceptable to use that persistence representation as the bridge representation
- persistence conversion should be localized to storage code only

Expected result:

- `CdDraft` transport becomes fully spec-driven and codec-driven
- `qint64` handling stops depending on ad hoc JSON/string conventions
- application code no longer performs bridge serialization

### Phase 2: Correct The Example’s `qint64` UX

Goal: make the example semantically correct for the full `qint64` range.

Changes:

1. Introduce explicit UI conversion helpers:
   - `formatCdId(value: bigint): string`
   - `parseCdIdInput(value: string): bigint | null`
2. Reject invalid textual inputs clearly.
3. Never convert `cdId` through JS `number`.
4. Add coverage for:
   - `0n`
   - negative values
   - values larger than `Number.MAX_SAFE_INTEGER`
   - min/max `qint64`

Expected result:

- the example demonstrates correct 64-bit integer handling instead of only “small integer that happens to fit in a number”

### Phase 3: Fix Generated TypeScript State Modeling

Goal: eliminate generator-produced type lies.

Changes:

1. Change generated `Input`/`Output` signal initialization from:
   - `signal<T>((undefined as unknown) as T)`
   to an honest representation such as:
   - `signal<T | undefined>(undefined)`
2. Update generated getters accordingly.
   Options:
   - return `T | undefined`
   - or emit paired APIs like `draft(): T | undefined` plus `requireDraft(): T`
3. Update generated `.d.ts` files to match the runtime truth.
4. Update example application code to use the honest API rather than `try/catch` around getters.

Expected result:

- generator surface becomes type-sound
- consumers do not need unsafe workarounds to handle uninitialized bridge state

### Phase 4: Make Non-Call Publish Failures Diagnostic By Default

Goal: align runtime behavior with `Input`/`Output`/`Emitter` error semantics.

Changes:

1. Wrap encode/send logic for generated `Input` setters in `try/catch`.
2. Emit a structured diagnostic event for serialization/publish failures instead of letting raw codec exceptions escape by default.
3. Apply the same principle to other non-Call transport surfaces where appropriate.
4. Keep fatal behavior available in debug/test modes if desired, but not as the default public behavior.

Important constraint:

- this should not turn the codec layer into a generic runtime validator
- the fix is about error containment and diagnostics, not adding heavy reflection-based validation

Expected result:

- an invalid outbound publish becomes a clear bridge/application diagnostic
- it no longer tears down frontend bootstrap by default

### Phase 5: Improve Bridge Health And Slot Failure Diagnostics

Goal: make “slot timed out” explainable.

Changes:

1. Surface bridge diagnostics consistently across both transports.
   - dev WebSocket and Qt `QWebChannel` should expose equivalent diagnostic information
2. Add generated TypeScript diagnostic API surface.
   - for example, a readonly signal/observable/event stream of bridge diagnostics
3. Differentiate at least these cases in diagnostics:
   - slot never registered
   - slot registered but handler threw
   - slot handler returned remote error
   - slot timed out waiting for reply
4. Consider a bridge-ready/bootstrap health signal so the host can decide whether to wait, retry, or fail fast.

Expected result:

- the next failure of this class is immediately diagnosable as “frontend bootstrap died before slot registration” instead of only “slot timeout”

### Phase 6: Harden The Example Host Integration

Goal: make the example model good host-side practice.

Changes:

1. Catch `std::runtime_error` around generated slot calls.
2. Subscribe to `diagnosticsForwarded`.
3. Surface errors in status bar / dialog / log.
4. Avoid state corruption when slot invocation fails.
   - if `showDraft` fails, keep previous selection or show error instead of partially applying selection state

Expected result:

- the example becomes a high-quality integration reference instead of a fragile happy-path demo

### Phase 7: Add Tests At All Relevant Layers

Goal: prevent regression and prove the system is correct.

Required tests:

1. Generator/unit tests for `qint64` structured payloads.
   - structured `CdDraft` encode/decode with `0n`, `1n`, negative, min/max `qint64`
2. Generated frontend tests.
   - `draft.set(...)` with valid bigint values
   - invalid publish produces diagnostic behavior rather than raw uncaught exception
3. Example Angular tests.
   - `createDraft()` returns real bigint values
   - CD-ID input parsing handles large 64-bit values exactly
4. Generated C++/bridge integration tests.
   - `showDraft(CdDraft, ...)` round-trips correctly
   - slot pre-registration queue drains after registration
   - diagnostic path exercised for startup failure
5. Headless end-to-end example smoke test.
   - launch `./run_headless.sh`
   - assert no JS BigInt error
   - assert no slot timeout
6. Type-surface compile tests.
   - verify generated TS types for unset inputs/outputs are honest

## Priority Order

### P0

- fix Angular example bigint construction/parsing
- catch slot exceptions in example host
- register slots before local bootstrap publish

### P1

- change spec to use typed `CdDraft` for `showDraft` and `saveRequested`
- regenerate and remove manual JSON bridge code

### P2

- fix generated TS unset-state typing
- add non-Call failure diagnostics
- expose diagnostics consistently across transports

### P3

- complete integration and regression test matrix

## What Should Not Be Done

To get to high quality and correctness, these would be wrong directions:

- do **not** weaken `CdDraft.cdId` from `bigint` to `number`
- do **not** keep `CdDraft`-as-JSON-string across the bridge just because it is “easy”
- do **not** add a generic JSON fallback path for strongly typed payloads
- do **not** rely on `as unknown as bigint` casts anywhere in application code
- do **not** rely on JS implicit coercion into `DataView.setBigInt64(...)`

Those would only hide the current defect and further undermine the AnQst architecture described in `RefinedSpecs/Prose`.

## Definition Of Done

The implementation can be considered high-quality and correct when all of the following are true:

1. The example starts headlessly with no JS exception and no slot timeout.
2. `CdDraft` crosses the bridge only through generated typed APIs.
3. `cdId` is a real `bigint` everywhere in Angular application state.
4. Editing `cdId` supports the full `qint64` range without precision loss.
5. Generated TS service state is type-sound for unset values.
6. `Input`/`Output`/`Emitter` failures surface through diagnostics instead of uncaught transport exceptions by default.
7. Host-side example code catches generated slot exceptions and surfaces them cleanly.
8. Automated tests cover the `qint64` paths end-to-end.

## Bottom Line

The immediate crash is caused by the example application sending a `number` where the spec and generated code require a `bigint`. The timeout is only the secondary consequence of that early frontend bootstrap failure.

The larger problem is that the example currently mixes two incompatible philosophies:

- correct, generated, strongly typed AnQst transport for `CdDraft`
- manual JSON shadow transport for the same domain type

To reach a very high quality bar, the fix should not stop at replacing `0` with `0n`. The example, spec usage, generator surface, diagnostics, and tests all need to be aligned so that the application never has to hand-roll bridge serialization and never lies about 64-bit values.
