# Codec Efficiency Audit

## Status

This audit should now be read as a pre-overhaul snapshot.

The major issues called out here that have since been corrected include:

- pre-scan count bookkeeping for grouped non-blob regions
- finite-domain widening before planning
- conservative public C++ union widening
- non-canonical nested imported anonymous C++ type naming
- drag/drop helper normalization through generic JSON item arrays

## Scope

This audit covers the active emitted codec pipeline in the current worktree:

- `AnQstGen/src/boundary-codec-analysis.ts`
- `AnQstGen/src/boundary-codec-plan.ts`
- `AnQstGen/src/boundary-codec-render.ts`
- `AnQstGen/src/emit.ts`
- representative generated output in `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/...`

It does not treat the legacy standalone codec generators as first-class, because the active application code path now goes through the boundary planner and the boundary renderers.

Priority ordering in this report:

1. runtime cost in emitted code
2. wire-size cost in emitted code

"Ideal" in this report means "a specialization that is recoverable from the static type graph and the current AnQst architecture documents". It does not assume runtime profiling or probabilistic compression.

## Executive Summary

The current replacement is only a partial realization of the intended architecture. It does plan before emission, but the plan is still too weak: it records region membership and entry identities, while most of the actual optimization decisions are still either not made at all or are effectively hard-coded in the renderer.

The dominant root causes are:

- the transport analysis widens finite domains before the planner ever sees them
- the plan IR does not record selected packing, tail-consumption, grouped-binary strategy, optional-bitset strategy, or decode-order strategy
- the planner preserves source traversal order for most structural decisions instead of choosing a globally optimized layout
- the renderers compensate with a generic region/cursor runtime shape, even for trivial one-leaf codecs

The largest runtime problems are:

- arrays always carry explicit count metadata, and mixed-region decoders often read that metadata twice
- finite literal unions are widened to `string`, `bool`, or `double` before planning, so no finite-domain specialization is possible
- trivial codecs still pay the generic region/cursor framework cost
- the TypeScript scalar helpers allocate `ArrayBuffer` / `DataView` objects per scalar operation

The largest wire-size problems are:

- finite-domain unions are transported as full strings or full-width numbers
- every array currently emits a 4-byte count, even in cases where the design docs explicitly allow count-free transport
- every optional field currently emits a whole byte of presence metadata
- binary leaves are emitted as separate base93 strings instead of being planned as a grouped binary region

## Fundamental Root Causes

### 1. The plan IR is descriptive, not decisional

`LeafCapabilityDescriptor` exposes `mayConsumeTail`, `mayGroupSharedRegion`, `supportedPackings`, and `requiresCountMetadata` in `AnQstGen/src/boundary-codec-model.ts:124-133`, but the active plan nodes only remember coarse entry identities:

- `BoundaryPlanBlobEntry` in `AnQstGen/src/boundary-codec-model.ts:190-197`
- `BoundaryPlanRegionEntry` in `AnQstGen/src/boundary-codec-model.ts:199-204`
- `BoundaryPlanArrayNode` / `BoundaryPlanField` in `AnQstGen/src/boundary-codec-model.ts:219-237`

There is no field in the plan for:

- selected boolean packing
- selected finite-domain representation
- grouped-binary layout
- tail-consumption choice
- optional-bitset grouping
- decode order distinct from source order
- region offset or count headers chosen for speed

The renderer therefore has to assume defaults instead of projecting a fully chosen plan.

### 2. Finite domains are widened before planning

The analyzer resolves literal unions to generic scalar or string leaves:

- string-like unions become `string` in `AnQstGen/src/boundary-codec-analysis.ts:157-164`
- boolean-like unions become `boolean` in `AnQstGen/src/boundary-codec-analysis.ts:166-173`
- number-like unions become `number` in `AnQstGen/src/boundary-codec-analysis.ts:175-182`

By the time planning starts, the planner no longer knows:

- how many variants existed
- whether they were short strings, single characters, or numeric literals
- whether a dense code table or switch/case translation is possible

### 3. Type materialization on the C++ side erases domain information again

The C++ type mapper widens literal unions to broad runtime types:

- `QString`, `bool`, or `double` in `AnQstGen/src/emit.ts:541-549`
- conservative alias rendering in `AnQstGen/src/emit.ts:686-691`
- coarse fallback `if (t.includes("|")) return "QString";` in `AnQstGen/src/emit.ts:149`

This means even if the wire were optimized later, the target type reconstruction would still currently discard important static information.

## Detailed Findings

### F1. Arrays always emit count metadata

Current behavior:

`AnQstGen/src/boundary-codec-plan.ts:148-157` emits a `uint32` count entry for every array, unconditionally.

Priority 1 impact:

Every encoded array pays a count write, and every decoded array pays a count read. In mixed-region codecs this also participates in the separate count pass.

Priority 2 impact:

Every array costs 4 blob bytes even in cases where the docs explicitly allow count-free transport.

Why this is materially incomplete:

`RefinedSpecs/Prose/AnQst-Codec-Design-Principles.md:81-86` explicitly allows:

- no count for statically known lengths
- no count for a single variable-length array with no other data
- no count for a single variable-length array appended at the end

Observed emitted example:

`Genre[]` in `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/frontend/CdEntryEditor_Angular/services.ts:97-125` and `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/backend/cpp/qt/CdEntryEditor_widget/CdEntryEditor.cpp:168-200` still emits a 4-byte count, even though it is a top-level single array.

Ideal direction:

The plan must represent whether an array:

- needs an explicit count
- may consume the tail of the output
- can infer length from region totals

### F2. Mixed-region decoders perform a count pass and then a decode pass

Current behavior:

- `requiresCountPass` is hard-coded as `hasBlob && (hasStrings || hasBinaries || hasDynamics)` in `AnQstGen/src/boundary-codec-plan.ts:51-69`
- TS emits the pre-scan in `AnQstGen/src/boundary-codec-render.ts:260-293`
- C++ emits the same pattern in `AnQstGen/src/boundary-codec-render.ts:546-579`

Priority 1 impact:

This duplicates blob traversal for every mixed-region payload. The decoder first walks counts and presence bytes to discover region cardinalities, then resets and walks the same metadata again to decode.

Priority 2 impact:

The wire size is not directly larger, but the current layout chooses lower wire metadata at the expense of higher decode compute.

Ideal direction:

The planner should be able to choose among:

- explicit region counts or offsets for faster decode
- count-free tail strategies
- layouts where decode order makes pre-scan unnecessary

### F3. Finite literal unions are widened before planning

Current behavior:

The analyzer collapses finite literal unions into generic `string`, `boolean`, or `number` leaves in `AnQstGen/src/boundary-codec-analysis.ts:152-184`.

Priority 1 impact:

The emitted code loses access to dense switch/case decoding, table lookup, and trivial branchless code paths for finite domains.

Priority 2 impact:

The wire loses access to compact finite-domain encodings such as:

- a single character code
- a small integer code
- bit-packed finite values when the domain is very small

Observed emitted example:

- source type: `type Genre = "Rock" | "Pop" | "Jazz" | "Classical" | "Electronic" | "Other";`
- generated C++ alias: `using Genre = QString; // union mapped conservatively` in `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/backend/cpp/qt/CdEntryEditor_widget/include/CdEntryEditorTypes.h:14`
- generated `Genre[]` codec transports raw strings in `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/frontend/CdEntryEditor_Angular/services.ts:97-125`

Ideal direction:

Introduce a finite-domain leaf kind in the analysis and plan IR, carrying:

- variant list
- selected wire code
- selected target-language reconstruction shape

### F4. Boolean packing is not a planner decision

Current behavior:

Boolean capabilities advertise both `bit-packed` and `byte-packed` in `AnQstGen/src/boundary-codec-leaves.ts:28-44`, but the plan never records a selected packing. The renderer then unconditionally emits:

- `__anqstPushBool` / `__anqstReadBool` in `AnQstGen/src/boundary-codec-render.ts:346,358`
- `anqstPushBool` / `anqstReadBool` in `AnQstGen/src/boundary-codec-render.ts:642,658`

Priority 1 impact:

The generator cannot choose the cheapest runtime path per boundary type because the decision is never modeled.

Priority 2 impact:

Booleans are currently fixed to one byte in the blob path. There is no opportunity for:

- bit-packing multiple booleans
- single-character raw-string transport when that wins
- packing boolean presence/state into shared flag bytes

Observed emitted example:

`encodeAnQstStructured_boolean` in `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/frontend/CdEntryEditor_Angular/services.ts:348-360` emits a blob-backed boolean codec instead of a trivial finite-domain specialization.

Why this is a true gap:

`RefinedSpecs/Prose/AnQst-Codec-Design-Principles.md:13,32` explicitly frames raw-string boolean encoding as a strategy choice, not a fixed renderer default.

### F5. Optional presence is always one full byte per field

Current behavior:

- plan-side presence entry allocation is hard-coded to width `1` in `AnQstGen/src/boundary-codec-plan.ts:166-170`
- TS encode/decode uses `__anqstPushUint8` / `__anqstReadUint8` in `AnQstGen/src/boundary-codec-render.ts:155-159,240-245`
- C++ does the same in `AnQstGen/src/boundary-codec-render.ts:435-439,522-527`

Priority 1 impact:

This adds a branch and a dedicated metadata read/write per optional field.

Priority 2 impact:

This is a direct 1-byte overhead per optional field. A struct with many optionals should be able to use a packed presence bitset or another grouped flag strategy.

Ideal direction:

The planner should support:

- bitset presence groups
- shared presence words
- special-case omission for tail-consumed optionals where safe

### F6. Binary leaves are not actually planned as a grouped binary region

Current behavior:

Binary capabilities advertise `mayGroupSharedRegion: true` and `supportedPackings: ["binary-packed"]` in `AnQstGen/src/boundary-codec-leaves.ts:332-499`, but the active planner simply allocates one `binary` region entry per leaf in `AnQstGen/src/boundary-codec-plan.ts:129-145`.

The renderer then emits one base93 string per binary value:

- TS: `__binaries.push(...)` in `AnQstGen/src/boundary-codec-render.ts:136-137`
- C++: `binaries.push_back(...)` in `AnQstGen/src/boundary-codec-render.ts:416-417`

Priority 1 impact:

Every binary leaf pays its own encode/decode call, own base93 boundary, own item indexing, and own conversion/copy path.

Priority 2 impact:

Each separately encoded binary leaf pays repeated base93 framing and repeated array-item overhead.

Ideal direction:

The planner should be able to choose:

- a grouped binary region with explicit boundaries
- a single tail binary payload when there is only one final variable binary value

### F7. Field order and decode order are not optimized

Current behavior:

`buildStructNode()` in `AnQstGen/src/boundary-codec-plan.ts:160-180` preserves source field order. Blob and region entries are also appended in traversal order.

Priority 1 impact:

The decoder is not free to reconstruct in the cheapest order. There is no modeled ability to move easy-to-decode fixed-width sections earlier or later for runtime benefit.

Priority 2 impact:

The planner never exercises the freedom promised by the architecture docs to:

- reorder fields
- move variable tails to the end
- group metadata and payload differently
- choose one packing that minimizes headers or padding

Why this is architecturally significant:

`Tasks/Codec-Architecture-Correction-Replacement.md:114-125` and `RefinedSpecs/Prose/AnQst-Codec-Planning-and-IR.md:146-155` explicitly require that the whole-boundary plan may differ significantly from declaration order.

### F8. Trivial leaf-only codecs still use the generic region/cursor framework

Current behavior:

Even a one-string boundary codec emits the full scaffolding:

- four region arrays on encode
- `anqstFinalizeWire`
- wire normalization
- count objects
- cursor objects

Observed examples:

- TS `encodeAnQstStructured_string` / `decodeAnQstStructured_string` in `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/frontend/CdEntryEditor_Angular/services.ts:74-95`
- C++ equivalents in `Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/backend/cpp/qt/CdEntryEditor_widget/CdEntryEditor.cpp:143-166`

Priority 1 impact:

This is avoidable runtime framework overhead in the exact cases where the code could be fully direct and branch-light.

Priority 2 impact:

This does not directly enlarge the wire, but it is strong evidence that emission is still projecting through a generic runtime shape instead of specializing hard for trivial cases.

Ideal direction:

Leaf-only boundary codecs should be emitted as direct straight-line code when the chosen plan is trivial.

### F9. TypeScript scalar read/write helpers allocate per scalar operation

Current behavior:

The TS runtime support emits helpers such as:

- `__anqstPushUint16` / `__anqstPushUint32` / `__anqstPushFloat64` using `new ArrayBuffer(...)` and `new DataView(...)` per write in `AnQstGen/src/boundary-codec-render.ts:347-353`
- `__anqstReadUint16` / `__anqstReadUint32` / `__anqstReadFloat64` creating `DataView(...)` per read in `AnQstGen/src/boundary-codec-render.ts:359-365`

Priority 1 impact:

This is one of the clearest emitted-runtime inefficiencies in the current TS output. Scalar-heavy codecs pay repeated short-lived allocations and view construction.

Priority 2 impact:

No direct wire-size change.

Ideal direction:

Use a pre-sized blob writer/reader strategy derived from the plan, or at minimum:

- reuse scratch buffers
- use direct bit operations where possible
- avoid per-scalar `DataView` creation

### F10. TypeScript blob encoding uses `number[]` accumulation and a final copy

Current behavior:

- encode side uses `const __bytes: number[] = [];` in `AnQstGen/src/boundary-codec-render.ts:275`
- finalization does `Uint8Array.from(bytes)` in `AnQstGen/src/boundary-codec-render.ts:328-339`

Priority 1 impact:

Blob-heavy codecs pay repeated `push` growth plus a full terminal copy into a typed array before base93 encoding.

Priority 2 impact:

No direct wire-size change.

Ideal direction:

The planner already knows a large portion of the fixed-width byte budget. Emission should be able to:

- precompute fixed blob sizes
- preallocate the output buffer
- write by offset

### F11. Decoded arrays are not preallocated

Current behavior:

- TS decodes arrays as `const arr: T[] = []; ... arr.push(...)` in `AnQstGen/src/boundary-codec-render.ts:223-233`
- C++ decodes arrays as `QList<T> arr; ... arr.push_back(...)` in `AnQstGen/src/boundary-codec-render.ts:504-514`

Priority 1 impact:

The count is already known, but the emitted code does not use it to reduce reallocations or improve locality.

Priority 2 impact:

No direct wire-size change.

Ideal direction:

- TS should allocate to known length where feasible and fill by index
- C++ should reserve when the target container permits it, or choose a more suitable container when generation controls the representation

### F12. Typed arrays and buffers lose type-specific materialization on the C++ side

Current behavior:

All binary leaf kinds map to `QByteArray`:

- leaf capability hints in `AnQstGen/src/boundary-codec-leaves.ts:332-499`
- C++ mapper in `AnQstGen/src/emit.ts:102-106,125-138`

TS decode also copies buffers on return:

- `ArrayBuffer` decode copies in `AnQstGen/src/boundary-codec-render.ts:379-380`
- typed-array decode slices/copies in `AnQstGen/src/boundary-codec-render.ts:384-385`

Priority 1 impact:

This forces copy-based materialization paths and prevents tighter, more direct reconstruction for typed binary data.

Priority 2 impact:

Wire size is not necessarily larger, but representation choices are constrained because typed-array identity is erased on the C++ side.

Ideal direction:

The plan and target-materialization model should distinguish:

- raw opaque byte buffers
- typed binary vectors
- fixed-element-width arrays

### F13. `Record` and `Map` are downgraded to dynamic object transport

Current behavior:

`BoundaryTransportAnalyzer` maps `Record` and `Map` directly to the `object` leaf in `AnQstGen/src/boundary-codec-analysis.ts:204-212`. The C++ mapper turns them into `QVariantMap` in `AnQstGen/src/emit.ts:146,575`.

Priority 1 impact:

This forces dynamic conversion and runtime map materialization instead of a specialized static transport plan.

Priority 2 impact:

Dynamic object transport is generally larger and more compute-intensive than a specialized plan, especially when key or value sets are constrained.

Important nuance:

If the user explicitly declared a dynamic object, this is expected. The inefficiency arises when statically describable map-like types are silently widened into dynamic transport rather than being either specialized or rejected.

### F14. Drag/drop payload helpers reserialize boundary wire through JSON

Current behavior:

`emit.ts` generates:

- `QJsonDocument::fromVariant(anqstNormalizeWireItems(encode...))` in `AnQstGen/src/emit.ts:1010-1012`
- `QJsonDocument::fromJson(...).array().toVariantList()` in `AnQstGen/src/emit.ts:1014-1024`

Observed generated example:

`Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/generated/backend/cpp/qt/CdEntryEditor_widget/CdEntryEditor.cpp:455-467`

Priority 1 impact:

This adds a full serialize/parse roundtrip around already-encoded boundary data.

Priority 2 impact:

The drag/drop payload becomes JSON text instead of the smallest opaque transport that the generator could choose.

Scope note:

This is outside the core service-call codec path, but it is still emitted transport code and is materially inefficient.

## Highest-Impact Misses, Ranked

### Runtime-first ranking

1. `F2` mixed-region count pass plus decode pass
2. `F3` finite-domain widening before planning
3. `F1` unconditional array counts
4. `F9` TS per-scalar allocation in blob helpers
5. `F8` generic scaffolding for trivial leaf-only codecs
6. `F6` per-binary-value base93 encoding instead of grouped binary planning
7. `F11` non-preallocated array reconstruction
8. `F12` copy-heavy binary materialization
9. `F13` dynamic `Record` / `Map` fallback
10. `F14` drag/drop JSON roundtrip

### Size-first ranking

1. `F3` finite-domain unions transported as full strings or full-width numbers
2. `F1` unconditional 4-byte array counts
3. `F6` repeated binary string items instead of grouped binary transport
4. `F5` 1 byte per optional presence flag
5. `F4` no boolean bit-packing or raw finite-domain choice
6. `F7` no field reordering / tail-consumption strategy
7. `F13` dynamic object fallback for map-like shapes
8. `F14` JSON drag/drop wrappers

## Concrete Corrections Required To Close The Gap

The minimum architectural corrections are:

1. Extend the transport analysis and boundary plan IR so it can represent selected layout decisions, not only capabilities.
2. Add explicit finite-domain analysis nodes for literal unions instead of widening them to generic leaves.
3. Add array-layout choices to the plan: explicit count, inferred count, or tail-consumed repeated section.
4. Add grouped metadata strategies: optional bitsets, grouped binary regions, grouped boolean packing.
5. Make the planner free to choose field order and decode order independently of source order.
6. Special-case trivial one-leaf boundary plans so the emitter can generate straight-line code.
7. Replace TS scalar helper allocation patterns with offset-based or reusable-buffer logic.
8. Stop collapsing typed arrays and finite unions to broad C++ runtime types when the type graph still contains stronger information.

## Bottom Line

The current system is not "a little under-optimized". It is missing an entire class of planner decisions. The emitted code is therefore still carrying several generic-runtime and type-erasure costs that the AnQst architecture explicitly exists to eliminate.

The most important correction is not a local helper rewrite. It is to upgrade the plan from:

- "this leaf belongs to blob/string/binary/dynamic"

to:

- "this exact boundary type will use this exact packing, grouping, ordering, and reconstruction strategy"

Until that happens, the generator will continue to leave large, systematic performance and representation wins on the table.
