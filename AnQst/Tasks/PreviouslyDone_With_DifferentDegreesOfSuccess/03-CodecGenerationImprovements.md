# Codec Generation Improvements

## Purpose

This document is a planner-agent initiation prompt for the next codec generation pass.

It converts the prior review points into a concrete patch plan centered on:

- `AnQst/AnQstGen/src/boundary-codec-model.ts`
- `AnQst/AnQstGen/src/boundary-codec-plan.ts`
- `AnQst/AnQstGen/src/boundary-codec-render.ts`
- `AnQst/AnQstGen/src/emit.ts`

Primary goals:

1. Introduce explicit lowering control so leaf placements can be emitted inline or via helper call.
2. Remove trusted-path decode validation behavior from generated codec core.
3. Enforce trusted-only decode semantics for service-boundary codecs.
4. Produce codec-specific implementation plans from planner IR, not renderer defaults.

## Authority And References

Treat these as normative, in this order:

1. `AnQst/RefinedSpecs/Prose/AnQst-CodecLaws.md`
2. `AnQst/RefinedSpecs/Prose/AnQst-Codec-Planning-and-IR.md`
3. `AnQst/RefinedSpecs/Prose/AnQst-Codec-Design-Principles.md`
4. `AnQst/RefinedSpecs/Prose/AnQst-Opaque-Wire-Contract.md`
5. `AnQst/RefinedSpecs/Prose/AnQst-Architecture-and-Design-Principles.md`

## Current Mismatch Summary

Current generator behavior has three architectural mismatches:

1. Leaf scalar decode/encode is mostly helper-call shaped even when operations are trivial and offset-local.
2. Generated trusted-path decoders include runtime checks for underflow/trailing bytes/divisibility/unknown finite-domain codes.
3. Generated TS/C++ bridge surfaces catch trusted decode failures and convert them into recoverable `DeserializationError` diagnostics.

Given the laws and trust model, these are not the desired defaults.

## Scope Clarification

For this task, service-boundary codecs are a trusted-only domain:

1. Encoder and decoder are always generated together from the same build.
2. Transport is assumed perfect for this codec domain.
3. Boundary codec planning and rendering do not model an "untrusted decode" mode.

Anything like drag/drop payload parsing, dev websocket payload parsing, or manual external payload injection is outside boundary codec planning scope and must not shape boundary codec decode behavior.

## Required Planner-Agent Deliverables

The planner agent must output:

1. A design brief for the new lowering model and trust-boundary semantics.
2. A per-file implementation plan with exact symbol-level edits.
3. A per-codec rollout plan describing chosen encode/decode lowering for each boundary codec plan.
4. A verification matrix with required test updates.

## Patch Plan By File

## 1) `boundary-codec-model.ts`

Add explicit IR for lowering and decode-check policy.

Required additions:

1. Add lowering enums/types.
- `BoundaryLoweringTarget = "ts" | "cpp"`
- `BoundaryLoweringDirection = "encode" | "decode"`
- `BoundaryLoweringMode = "inline" | "helper-call"`
- `BoundaryLoweringReason = "trivial-op" | "dedupe" | "complex-op" | "recursion" | "code-size"`

2. Add per-target/per-direction lowering selection model.
- Example shape:
  - `BoundaryLoweringSelection { mode: BoundaryLoweringMode; reason: BoundaryLoweringReason; helperNameHint?: string }`
  - `BoundaryLeafLoweringPlan { tsEncode; tsDecode; cppEncode; cppDecode }`

3. Extend plan nodes to carry selected lowering.
- `BoundaryPlanLeafNode.lowering: BoundaryLeafLoweringPlan`
- `BoundaryPlanFiniteDomainNode.lowering: { tsEncode; tsDecode; cppEncode; cppDecode }`
- Keep `selectedPacking` as existing planner choice.

4. Add explicit trusted-only decode policy.
- Example shape:
  - `BoundaryCodecDecodePolicy = "trusted-only"`
  - `BoundaryCodecPlan.decodePolicy = "trusted-only"`

5. Extend `BoundaryCodecRequirements` with helper-usage signals driven by chosen lowering, not only by leaf kinds.
- Example: `tsHelperRequirements`, `cppHelperRequirements` flags/sets.

Design constraint:

- Renderer must never infer lowering mode from leaf kind alone once this model exists.

## 2) `boundary-codec-plan.ts`

Move lowering choice into planner stage and make it explicit in IR.

Required changes:

1. Add lowering chooser functions.
- `chooseLeafLowering(node, selectedPacking, context)` returning full `BoundaryLeafLoweringPlan`.
- `chooseFiniteDomainLowering(node, representation, context)` returning lowering plan for finite-domain encode/decode.

2. Encode default lowering policy in planner.
- Inline-first for trivial scalar/item operations.
- Helper-call for non-trivial transforms or dedupe-driven cases.
- Named recursive node encode/decode remains helper-based unless non-recursive inline expansion is explicitly selected.

3. Populate new lowering fields for:
- `buildLeafNode`
- `buildFiniteDomainNode`
- Optional future extension: array/struct metadata operations if planner later wants per-operation lowering.

4. Populate plan-level decode policy fields.
- All strongly typed boundary codecs: decode policy must be `trusted-only`.
- Planner does not define an untrusted decode mode for boundary codecs.

5. Build requirements from selected lowering, not only from leaf presence.
- Only emit helper families that are actually selected by lowering policy.

## 3) `boundary-codec-render.ts`

Render from planner-selected lowering; remove trusted-path validation checks from codec core.

Required changes:

1. Replace direct helper-name mapping dependency in core leaf emit paths.
- `emitTsEncodeLeaf` and `emitTsDecodeLeaf` must branch on `node.lowering.*`.
- `emitCppEncodeNode` and `emitCppDecodeNode` leaf/finite-domain branches must do the same.

2. Implement inline scalar operations for TS and C++ decode/encode paths.
- Inline means direct offset/data operations emitted into codec code.
- Helper-call mode still supported for dedupe and complex operations.

3. Remove trusted-path validation throws from boundary codec decode generation.
- Remove generated underflow checks in codec runtime support (`__anqstEnsureRead`, `anqstRequireBytes`) for trusted core.
- Remove trailing blob/item checks in generated `decodeAnQstStructured_*` functions.
- Remove non-divisible array tail checks.
- Remove finite-domain unknown-code runtime checks from trusted path decode core.

4. Do not introduce any ingress-style validation behavior into boundary codec render output.

5. Refactor runtime-support emission to be requirement-driven by lowering.
- Emit only helper families still required by selected lowering.
- If scalar reads/writes are fully inline for a target, omit corresponding helper fleet for that target.

6. Keep fast paths, but make them lowering-aware and policy-aware.
- `renderTsFastPathCodec`
- `renderCppFastPathCodec`

## 4) `emit.ts`

Align diagnostic behavior with trusted-vs-ingress boundary.

Required changes:

1. Trusted typed bridge flows should not catch decode and report recoverable `DeserializationError`.
- TS `onOutput` decode path in `renderTsService`: remove try/catch around `decode<codecId>(value)`.
- Equivalent trusted typed decode wrappers in generated C++/TS surfaces: remove catch-and-continue where the source is generated peer codec traffic.

2. Keep boundary codec concerns separated from non-codec payload parsing concerns.
- Non-codec adapters (if present elsewhere) are outside this plan and must not influence boundary codec decode design.

3. Ensure error taxonomy partition in emitted code.
- Trusted boundary decode mismatch is not represented as recoverable transport diagnostic.
- Boundary codec path should not emit recoverable `DeserializationError` flow.

4. Update generated messaging text to avoid implying generic trusted-path decode uncertainty.

## Lowering Policy Matrix (Comprehensive Directions)

Apply these as planner defaults unless a codec-specific code-size rule selects otherwise.

| Codec operation | TS encode | TS decode | C++ encode | C++ decode | Default mode |
|---|---|---|---|---|---|
| `boolean` blob leaf | inline byte write (`1/0`) | inline byte read and compare | inline `uint8` push | inline byte read and compare | inline |
| `number` leaf | inline `DataView.setFloat64` | inline `DataView.getFloat64` | inline float64 push | inline float64 read | inline |
| `qint64` leaf | inline `setBigInt64` | inline `getBigInt64` | inline qint64 push | inline qint64 read | inline |
| `quint64` leaf | inline `setBigUint64` | inline `getBigUint64` | inline quint64 push | inline quint64 read | inline |
| `qint32` / `int32` leaf | inline `setInt32` | inline `getInt32` | inline int32 push | inline int32 read | inline |
| `quint32` / `uint32` leaf | inline `setUint32` | inline `getUint32` | inline uint32 push | inline uint32 read | inline |
| `qint16` / `int16` leaf | inline `setInt16` | inline `getInt16` | inline int16 push | inline int16 read | inline |
| `quint16` / `uint16` leaf | inline `setUint16` | inline `getUint16` | inline uint16 push | inline uint16 read | inline |
| `qint8` / `int8` leaf | inline byte/int8 write | inline int8 read | inline int8 push | inline int8 read | inline |
| `quint8` / `uint8` leaf | inline byte write | inline byte read | inline uint8 push | inline uint8 read | inline |
| string leaf (`text-packed`) | inline `__items.push(value)` | inline item read/cast | inline `items.push_back` | inline item read | inline |
| binary leaf (`ArrayBuffer`, typed arrays) | helper-call (base93 conversion, alignment/copy logic) | helper-call | helper-call (`anqstEncodeBinary`) | helper-call (`anqstDecodeBinary`) | helper-call |
| dynamic leaf | inline passthrough item push | inline item passthrough cast | inline QVariant passthrough | inline QVariant cast | inline |
| finite-domain coded | inline code assignment for small domains; helper optional for large domains | inline code-to-value mapping without trusted-path guard throws | same | same | inline default |
| finite-domain identity-text | inline text mapping | inline text-to-value mapping without trusted-path guard throws | same | same | inline default |
| array explicit-count | inline count write | inline count read | inline count write | inline count read | inline |
| array blob-tail/item-tail | no runtime divisibility guard | no runtime divisibility guard | same | same | inline |
| optional field presence | inline presence byte write | inline presence byte read | same | same | inline |
| named recursive node | helper-call (named encode/decode helpers) | helper-call | helper-call | helper-call | helper-call |

Notes:

1. Helper-call remains valid where operation is genuinely complex or repeated enough to justify dedupe.
2. Lowering must be planner-selected and stored in plan IR, not hardcoded in renderer switches.

## Coder/Decoder Directions By Node Type

For each boundary codec plan, planner output must include concrete instructions for these coder/decoder families.

1. Leaf coder/decoder.
- State selected packing.
- State selected lowering for TS/C++ encode/decode.
- State helper requirements.

2. Finite-domain coder/decoder.
- State representation (`coded-scalar` or `identity-text`).
- State lowering per target/direction.
- State no trusted-path runtime-guard policy.

3. Array coder/decoder.
- State extent strategy (`explicit-count`, `blob-tail`, `item-tail`).
- State whether any metadata entry is emitted.
- State decode loop assumptions under trusted policy.

4. Struct coder/decoder.
- State field ordering strategy.
- State optional presence strategy and lowering.
- State reconstruction order.

5. Named node coder/decoder.
- State recursion handling and helper usage.
- State whether helper is required or can be inlined for non-recursive single-use nodes.

6. Root fast-path codec coder/decoder.
- State eligibility.
- State lowering and runtime helper dependencies.
- State trusted decode policy.

## Trusted-Only Rules To Enforce

1. Boundary codec core decode for generated peers is trusted path.
- No underflow/trailing/divisibility/finite-domain guard checks in generated codec core.

2. Do not merge boundary codec planning with non-codec adapter concerns.
- No catch-and-continue around trusted boundary decode.
- No generic fallback transport decoding.

## Implementation Sequencing

1. Patch `boundary-codec-model.ts` first (new IR surface).
2. Patch `boundary-codec-plan.ts` second (all decisions chosen here).
3. Patch `boundary-codec-render.ts` third (renderer consumes plan; remove trusted checks).
4. Patch `emit.ts` fourth (error-boundary alignment).
5. Regenerate and inspect `CdEntryEditor` outputs to verify shape.
6. Update tests.

## Minimum Verification Plan

1. Unit/snapshot expectations.
- Update assertions in `AnQst/AnQstGen/test/boundary-codecs.test.ts` and `AnQst/AnQstGen/test/emit.test.ts` that currently require trusted-path check strings.
- Add assertions that selected inline operations appear for scalar leaves.
- Add assertions that removed trusted-path guard strings do not appear in boundary codec core.

2. Interop test.
- Keep `AnQst/AnQstGen/test/deep-structured-codec-interop.test.ts` green.
- Confirm TS/C++ round-trip still passes with inline-heavy lowering.

3. Example validation target.
- Regenerate `AnQst/Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/...`
- Verify:
  - scalar bool/number paths are inline where selected
  - trusted boundary decoders have no recoverable deserialization guards

## Non-Negotiables

1. No fallback generic serializer/deserializer.
2. No renderer-owned hidden defaults for lowering.
3. No trusted-path recoverable deserialization diagnostics.
4. No phased dual architecture.
5. No untrusted-mode boundary decode policy.

## Planner-Agent Output Template

When executing this prompt, produce:

1. Patch map with symbol-level edits per target file.
2. Per-codec table listing selected lowering for every leaf/finite-domain placement and every node coder/decoder.
3. Test edit list with exact assertions to add/remove.
4. Risk list and rollback plan limited to source generation internals (not wire-compat preservation).
