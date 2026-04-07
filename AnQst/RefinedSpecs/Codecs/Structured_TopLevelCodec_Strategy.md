# AnQst Structured Type Codec Strategy

## Status

This document is now a lower-level historical strategy note.

It is not the authoritative source for whole-boundary planning decisions when it conflicts with:

- `RefinedSpecs/Prose/AnQst-Codec-Planning-and-IR.md`
- `RefinedSpecs/Prose/AnQst-Codec-Design-Principles.md`
- `Tasks/Codec-Architecture-Correction-Replacement.md`

Its examples remain useful for understanding one-boundary flattening and nested-struct absorption, but its fixed carrier recipes, fixed metadata choices, and literal-union treatment are not normative. Whole-boundary layout, metadata strategy, finite-domain representation, and runtime materialization are planner-owned decisions chosen from full boundary context.

## 1. Purpose

This document specifies the codec generation strategy for **structured types** — types declared as TypeScript interfaces or object type aliases in an AnQst-Spec. It covers:

- How top-level codecs are generated for service-boundary types
- How nested structures are flattened into optimal wire representations
- How variable-length arrays of structured types are handled
- How optional fields are encoded
- How explicitly dynamic members coexist with statically-typed fields
- How string literal unions are handled

This is the strategy document that connects the individual base-type codec specs to the complete codec output. Every concept here is grounded in the Codec Design Principles and Architecture Principles from the Prose.

## 2. The Two-Level Codec Architecture

Per Codec Design Principles Section 2:

> "The codec system operates at two distinct levels:
> - **Base-type factories:** ...dedicated, super-optimized encode/decode routines... reusable leaf-level primitives...
> - **Top-level codecs:** ...the generator produces a single comprehensive codec [per service-boundary type]."

The base-type factories are specified in the individual `<BaseType>_<TypeName>_Codec.md` files. This document specifies the **top-level codec** layer: how the generator orchestrates base-type factories to produce a single, comprehensive, flat wire representation for each service-boundary type.

### 2.1 What Is a Service-Boundary Type?

A type is a **service-boundary type** when it appears as:
- A method argument type (parameter of a `Call`, `Slot`, or `Emitter` method)
- A method return/payload type (the `T` in `Call<T>`, `Slot<T>`)
- A property value type (the `T` in `Output<T>`, `Input<T>`)
- A drag/hover payload type (the `T` in `DropTarget<T>`, `HoverTarget<T>`)

Only service-boundary types get top-level codecs. Types that appear only as fields within other types are **not** codec boundaries — they have no independent wire representation. Their fields are absorbed into the containing top-level codec (Codec Design Principles Section 6).

### 2.2 What Is NOT a Codec Boundary

A type used only as a nested field within another type is NOT a codec boundary. It does not get its own codec. Its fields are inlined into the top-level codec that contains it. Per Codec Design Principles Section 6:

> "A type that appears only as a field within another type — not directly at the service boundary — is not a codec boundary. It has no independent wire representation. Its fields are absorbed into the containing top-level codec."

**Example:** If `Track` is used only as `CdDraft.tracks: Track[]` and `CdDraft` is used as `Call<CdDraft>`, then `CdDraft` is a service-boundary type (gets a top-level codec) and `Track` is not (its fields are absorbed into the `CdDraft` codec). If `Track` also appears as a standalone `Call<Track>` parameter, then `Track` is ALSO a service-boundary type and gets its own independent top-level codec.

## 3. Top-Level Codec Generation: The Algorithm

The generator produces a top-level codec for each service-boundary type by performing the following steps (at generation time, not at runtime):

### 3.1 Type-Graph Walk

Walk the complete type-graph reachable from the service-boundary type. For each field at every nesting level, classify it into one of three categories:

1. **String leaf** — a field whose base type is `string` (including `AnQst.Type.string` and string literal unions). Contributes to the **string collection**.
2. **Numeric/boolean leaf** — a field whose base type is any integer, `number`, `boolean`, `bigint`, or binary type. Contributes to the **byte blob** (which is then base93-encoded).
3. **Dynamic leaf** — a field whose base type is `AnQst.Type.object` or `AnQst.Type.json`. Contributes an **Object element** to the output array.

Additionally, the walk identifies:
- **Array fields** — fields of type `T[]` where `T` is a structured type. These require element iteration and length encoding.
- **Optional fields** — fields declared with `?:`. These require presence encoding.
- **Variable-length binary fields** — `buffer`, `blob`, `typedArray`, and typed array variants. These contribute separate base93 strings.

### 3.2 Output Assembly

The top-level codec assembles the output from three collections:

1. **Byte blob** — Concatenation of all numeric, boolean, and fixed-metadata bytes from the type-graph. The entire concatenated byte sequence is then base93-encoded into a single string. The blob contains:
   - All integer field bytes (1/2/4/8 bytes each, depending on type)
   - All `number` field bytes (8 bytes each)
   - All `boolean` field bytes (1 byte each)
   - All `bigint` field bytes (8 bytes each)
   - Array length counts for variable-length arrays (stored as fixed-width unsigned integers, e.g., 4 bytes each as uint32, within the blob — individual counts are NOT independently base93-encoded; they are raw bytes that participate in the blob's aggregate base93 encoding)
   - Optional field presence flags (1 byte per optional field)

2. **String collection** — Flat array of all string values from the type-graph:
   - Individual `string` fields
   - String literal union values (transported as strings)
   - Elements of `stringArray` fields

3. **Dynamic objects** — JSON Objects for explicitly dynamic fields (`AnQst.Type.object`, `AnQst.Type.json`)

4. **Binary blobs** — Separate base93 strings for variable-length binary fields (`buffer`, `blob`, typed arrays)

### 3.3 Emission Construction

The codec combines these collections into a valid emission:

| Collections present | Emission format |
|---|---|
| Only 1 string (no blob, no dynamics, no binaries) | Single naked string — **best case** |
| Only 1 blob (no strings, no dynamics, no binaries) | Single naked string (the base93 blob) — **best case** |
| Only 1 binary (no strings, no blob, no dynamics) | Single naked string (the binary's base93) — **best case** |
| Only 1 dynamic (no strings, no blob, no binaries) | Single naked Object — **exception case** |
| Multiple items from any combination | Flat array of all items — **worst case** |

**Array construction rule:** The output array is a flat array containing:
1. The byte blob string (if any bytes exist) — always first for consistency
2. All string collection elements — in generation-determined order
3. All binary blob strings — in generation-determined order
4. All dynamic objects — in generation-determined order

The decoder knows the exact position and role of each element because it was generated from the same spec. The ordering within the array is fixed at generation time and is part of the codec's internal contract (not a public contract — per the Opaque Wire Contract).

### 3.4 Single-Item Optimization

Per Codec Design Principles Section 7.3: "An array of one item. If only one value needs to be emitted, it should be emitted as a naked value, not wrapped in an array."

When the assembled output contains exactly one item (one string, one blob, or one Object), it is emitted as a naked value, not wrapped in an array. The decoder knows whether to expect a naked value or an array based on the type-graph analysis performed at generation time.

## 4. Nested Structured Types: Flattening

### 4.1 Principle: No Sub-Codecs

Per Codec Design Principles Section 6:

> "Delegating to independent sub-codecs would violate [the acceptance criteria]:
> - **Isolation:** Each sub-codec would produce its own wire representation, preventing cross-structure packing optimizations.
> - **Inefficient packing/unpacking:** Strings, numbers, and binary data from different nesting levels could not be collected and packed together.
> - **Unnecessary method calls:** A deep struct hierarchy would produce a cascade of codec function calls."

When a service-boundary type contains nested structured types, the top-level codec walks through ALL nesting levels and collects ALL leaf values into the shared collections. There is no intermediate wire representation for any substructure.

### 4.2 Example: CdDraft Type-Graph

From the CdEntryEditor example spec:

```
CdDraft
├─ cdId: qint64                    → 8 bytes → byte blob
├─ artist: string                  → string collection
├─ albumTitle: string              → string collection
├─ releaseYear: qint32             → 4 bytes → byte blob
├─ genre: Genre (string union)     → string collection
├─ catalogNumber: string           → string collection
├─ barcode: string                 → string collection
├─ tracks: Track[]                 → variable-length array (see Section 5)
│   └─ Track
│       ├─ title: string           → string collection (per element)
│       └─ durationSeconds: number → 8 bytes → byte blob (per element)
├─ notes: string                   → string collection
└─ createdBy: User                 → nested struct (absorbed)
    ├─ name: string                → string collection
    └─ meta: User_meta             → nested struct (absorbed)
        └─ friends: number[]       → variable-length array of numbers
```

The top-level codec for `CdDraft` collects:
- **Byte blob (fixed part):** `cdId` (8 bytes) + `releaseYear` (4 bytes) + presence/length metadata = 12+ bytes
- **String collection (fixed part):** `artist`, `albumTitle`, `genre`, `catalogNumber`, `barcode`, `notes`, `createdBy.name` = 7 strings
- **Variable-length data:** `tracks` array (each element adds 1 string + 8 bytes), `createdBy.meta.friends` array (each element adds 8 bytes)

All of this is handled by a single codec function — no `Track` codec, no `User` codec, no `User_meta` codec.

### 4.3 Field Ordering in the Byte Blob

Per Codec Design Principles Section 5.3: "Codecs are not required to pack fields in the order they appear in the spec or in the deserialized structure."

The generator determines the byte order within the blob to maximize base93 encoding efficiency. Recommended ordering strategy:

1. **Fixed-size fields first:** All fields whose byte width is known at generation time (integers, booleans, numbers, bigints). These bytes can be written and read at known offsets.
2. **Metadata next:** Array lengths, optional-field presence flags. These are variable-width integers encoded inline.
3. **Per-element data last:** Bytes from variable-length array elements, appended in element order.

This ordering allows the decoder to read all fixed-offset values first, then read the metadata to determine the shapes of variable-length data, and finally consume the remaining bytes accordingly.

## 5. Variable-Length Arrays of Structured Types

### 5.1 Core Challenge

An array of structured types (e.g., `tracks: Track[]`) produces a variable number of elements, each of which contributes strings and bytes to the top-level collections. The top-level codec must:

1. Encode the **element count** so the decoder knows how many elements to expect.
2. Inline each element's leaf values into the shared collections.
3. Ensure no subarrays are produced (acceptance criteria Section 7.3).

### 5.2 Strategy: Inline with Length Prefix

The element count is stored as a fixed-width unsigned integer (e.g., 4 bytes as uint32) within the byte blob — it is raw bytes in the blob, not independently base93-encoded. Each element's string values are appended to the string collection, and each element's numeric bytes are appended to the byte blob, in element order.

**Encoding for `tracks: Track[]` within `CdDraft`:**
1. Write `tracks.length` as 4 bytes (uint32) into the byte blob.
2. For each track, in order:
   - Append `track.title` to the string collection.
   - Append `track.durationSeconds` bytes (8 bytes) to the byte blob.

**Decoding:**
1. Read the track count from the byte blob.
2. For each track (0 to count-1):
   - Read the next string from the string collection → `title`.
   - Read the next 8 bytes from the byte blob → `durationSeconds`.

### 5.3 Multiple Variable-Length Arrays

When a type-graph contains multiple variable-length arrays, each array's length is stored as a separate fixed-width unsigned integer (e.g., 4 bytes each) in the byte blob. The decoder reads all lengths first (from their known byte offsets in the metadata section of the blob), then consumes elements for each array in sequence.

Per Codec Design Principles Section 6.1:

> "Multiple variable-length arrays: The codec can encode the length of each array as an integer (via base93) before the first element of that array."

### 5.4 Nested Variable-Length Arrays

When a struct within a variable-length array itself contains a variable-length array (e.g., `CdDraft.tracks[].durationSeconds` is fixed, but imagine `Track.tags: string[]`), the encoding uses nested length prefixes:

1. Encode `tracks.length` (outer array count).
2. For each track:
   - Encode `track.tags.length` (inner array count).
   - Append each `track.tags[i]` to the string collection.
   - Append other track fields.

The decoder mirrors this structure: read outer count, then for each outer element, read inner count and consume inner elements.

### 5.5 Strategies Based on Type-Graph Shape (Section 6.1 Specializations)

The top-level codec selects the most efficient strategy based on the type-graph shape. These correspond to the strategies enumerated in Codec Design Principles Section 6.1:

| Type-graph shape | Strategy | Emission |
|---|---|---|
| Single fixed-length array, nothing else | No length encoding; decoder knows count from generation | Flat array of element data |
| Single variable-length array, nothing else | Elements as the output array; count = array length | Output array = element data |
| Single variable-length array + other data | Array elements appended after fixed data; count encoded in blob | Flat array |
| Multiple variable-length arrays | Each array's length encoded in blob; elements appended in sequence | Flat array |

## 6. Optional Fields

### 6.1 Encoding Strategy

Fields declared with `?:` (e.g., `field?: string`) may or may not be present. The codec must encode the presence/absence of each optional field.

**Presence byte:** Each optional field gets its own full presence byte in the byte blob — `0x01` if the field is present, `0x00` if absent. Bit-packing multiple presence flags into a single byte is explicitly not used: the CPU cost of bitwise extraction (shifts, masks) exceeds the transport cost of the extra bytes. Per Architecture Principles §3.1, generated code performance takes highest priority.

When the presence byte is `0x01`, the field's value is included in the appropriate collection (byte blob bytes, string collection, etc.). When `0x00`, no value is contributed — the field's data is entirely omitted, not filled with zeros or placeholders.

### 6.2 String Fields with Optional Presence

For an optional string field (`field?: string`):
- **Present:** The presence byte is `0x01`, and the string value is included in the string collection.
- **Absent:** The presence byte is `0x00`, and **no string is added to the collection**. No sentinel or placeholder is used.

The decoder reads presence bytes first, then consumes strings from the collection using a running index — only advancing the index for fields whose presence byte is `0x01`. This means string positions in the collection are not fixed; they depend on which optional fields are present. The decoder tracks this dynamically, which is correct because the presence bytes provide all necessary information.

### 6.3 Numeric Fields with Optional Presence

For an optional numeric field (`field?: number`):
- **Present:** The presence byte is `0x01`, and the field's bytes are included in the byte blob.
- **Absent:** The presence byte is `0x00`, and the field's bytes are **not included** in the byte blob. No space is reserved and no zeros are written — zero is a valid numeric value and must not be confused with absence.

The decoder reads presence bytes first, then reads field bytes only for present fields, computing offsets dynamically. This is the same approach used for optional string fields (§6.2): the decoder tracks a running byte offset, advancing it only for fields whose presence byte is `0x01`.

### 6.4 C++ Representation

On the C++ side, optional fields use `std::optional<T>`. The codec maps:
- Presence bit `1` + value → `std::optional<T>(value)`
- Presence bit `0` → `std::nullopt`

## 7. String Literal Unions

String literal unions (e.g., `type Genre = "Rock" | "Pop" | "Jazz" | ...`) are transported as **native JSON strings**. At the codec level, they are handled identically to `string` — they contribute to the string collection. The union constraint is a TypeScript/C++ type-level concern, not a wire-format concern.

On the C++ side, string literal unions are currently mapped to `QString` (conservative). The generated codec encodes/decodes them as strings. Validation that the string value is a member of the union is a type-safety concern handled by the generated TypeScript types, not by the codec.

### 7.1 String Literal Unions Use Identity Encoding

String literal unions are transported as native JSON strings (identity encoding). Numeric index encoding is not used. This keeps the codec architecture simple, preserves direct readability in generated test fixtures and debug inspection, and avoids introducing a second encoding path for a type that already satisfies the acceptance criteria naturally.

The potential wire-size savings from numeric index encoding are marginal for typical union sizes, while the added generator and decoder complexity is real. Per Architecture Principles Section 3.1, simplicity takes priority when it does not compromise output quality.

## 8. Dynamic Members in Static Structures

### 8.1 Principle: Minimal Dynamic Scope

Per Codec Design Principles Section 9:

> "The dynamic codec applies only to the smallest possible subset. If a struct has one dynamic member among ten static members, only that one member uses the dynamic codec; the other nine use their per-type specialized codecs."

A structured type may contain one or more fields typed as `AnQst.Type.object` or `AnQst.Type.json`. These fields are treated as opaque JSON Objects that occupy their own positions in the output array. All other fields in the same struct are handled normally (strings collected, numerics packed into the byte blob).

### 8.2 What Causes a Dynamic Member

An AnQst-Spec declares a dynamic member by using `AnQst.Type.object` or `AnQst.Type.json` as a field type within a structured type:

```typescript
interface PluginConfig {
  name: string;                      // static → string collection
  version: AnQst.Type.qint32;        // static → byte blob
  settings: AnQst.Type.object;       // dynamic → Object element in output array
}
```

There is **no other way** to create a dynamic member. All other type annotations produce statically-typed fields that the generator fully understands. The dynamic designation is always explicit and intentional.

### 8.3 Encoding

The top-level codec for a struct containing a dynamic member:
1. Encodes all static fields normally (strings → string collection, numbers → byte blob).
2. Places each dynamic field's value as a JSON Object at a known position in the output array.

**Example emission for `PluginConfig`:**
```
["<base93: version bytes>", "MyPlugin", {"key": "value", "nested": [1,2,3]}]
```
- Position 0: base93 blob (version)
- Position 1: string (name)
- Position 2: Object (settings — the dynamic member)

### 8.4 Multiple Dynamic Members

Multiple dynamic fields each occupy their own position in the output array. The decoder knows which position corresponds to which field.

### 8.5 Dynamic Members in Nested Structures

If a nested (non-boundary) struct contains a dynamic member, that dynamic member is still placed in the top-level output array (because the nested struct's fields are absorbed into the top-level codec). The decoder knows the position of the dynamic Object within the flat array.

### 8.6 Constraint: Dynamic Member Contents

Per Codec Design Principles Section 7.5:

> "The AnQst-Spec-DSL must not allow declaration of non-JSON-native types as members of truly dynamic types."

The generator validates that no type reachable through a dynamic member's declared type (if it has one) contains non-JSON-native values. Since `AnQst.Type.object` and `AnQst.Type.json` are opaque, the generator cannot validate the runtime content — but it can validate the declared type structure if the dynamic field has type annotations beyond the base `object` type.

## 9. Void Payloads

Some interaction types have no payload:
- `Emitter` (fire-and-forget, no return)
- `Slot<void>` (no return value)
- Method parameters when there are zero parameters

For void payloads, no codec is needed. The QWebChannel invocation still uses the standard top-level envelope and carries `"d": null`. No additional payload codec function is generated; the decoder simply produces `void`/`undefined`.

## 10. Lock-Step Encoder/Decoder Design

Per Codec Design Principles Section 6.1:

> "The encoder and decoder for each type should be designed in lock-step — determining the shape of both together makes it simpler to keep them in sync, since every packing decision in the encoder implies a corresponding unpacking decision in the decoder."

The generator produces both the encoder and decoder for each top-level codec simultaneously. For each decision made during encoding (field order, packing strategy, length encoding method), the corresponding decoding operation is emitted at the same time. This ensures:

- The byte offsets used by the decoder match those produced by the encoder.
- The string positions consumed by the decoder match those emitted by the encoder.
- The array element order expected by the decoder matches the order produced by the encoder.
- Any strategy selection (e.g., "use tail-append for the single variable-length array") is shared between encoder and decoder.

## 11. Complete Worked Example: CdDraft Codec

Using the CdEntryEditor example spec, here is how the top-level codec for `CdDraft` (used in `validateDraft(draft: CdDraft): Call<ValidationResult>`) would be constructed:

### 11.1 Type-Graph Analysis

```
CdDraft fields:
  cdId: qint64           → 8 bytes (blob)
  artist: string         → string #0
  albumTitle: string     → string #1
  releaseYear: qint32    → 4 bytes (blob)
  genre: Genre           → string #2 (string union → string)
  catalogNumber: string  → string #3
  barcode: string        → string #4
  tracks: Track[]        → variable-length array
    Track.title: string     → string #5..#(5+N-1) (per element)
    Track.durationSeconds: number → 8 bytes per element (blob)
  notes: string          → string #(5+N)
  createdBy: User
    User.name: string    → string #(6+N)
    User.meta: User_meta
      User_meta.friends: number[] → variable-length array of numbers
```

### 11.2 Byte Blob Layout

```
Offset 0-7:    cdId (8 bytes, qint64)
Offset 8-11:   releaseYear (4 bytes, qint32)
Offset 12-15:  tracks.length (4 bytes, uint32 — array count)
Offset 16-19:  createdBy.meta.friends.length (4 bytes, uint32 — array count)
Offset 20+:    Per-track: durationSeconds (8 bytes each) × tracks.length
After tracks:  Per-friend: number (8 bytes each) × friends.length
```

Total fixed bytes: 20. Variable bytes: `8 × tracks.length + 8 × friends.length`.

### 11.3 String Collection

```
Position 0: artist
Position 1: albumTitle
Position 2: genre
Position 3: catalogNumber
Position 4: barcode
Position 5: notes
Position 6: createdBy.name
Positions 7..(7+tracks.length-1): track titles (one per track)
```

### 11.4 Emission

```
[
  "<base93: all bytes>",          // position 0: the byte blob
  "John Coltrane",                // position 1: artist
  "A Love Supreme",              // position 2: albumTitle
  "Jazz",                         // position 3: genre
  "IMP-77",                       // position 4: catalogNumber
  "0602498840207",                // position 5: barcode
  "Remastered edition",           // position 6: notes
  "coltrane_fan",                 // position 7: createdBy.name
  "Acknowledgement",              // position 8: tracks[0].title
  "Resolution",                   // position 9: tracks[1].title
  "Pursuance",                    // position 10: tracks[2].title
  "Psalm"                         // position 11: tracks[3].title
]
```

This is a flat array of 12 strings — valid per acceptance criteria Section 7.2. No subarrays, no objects (there are no dynamic fields in CdDraft), no nested structures visible in the wire format.

### 11.5 Decoder Logic

1. Base93-decode position 0 → byte array.
2. Read bytes 0-7 → `cdId` (BigInt64Array).
3. Read bytes 8-11 → `releaseYear` (Int32Array).
4. Read bytes 12-15 → `tracksLength` (Uint32Array).
5. Read bytes 16-19 → `friendsLength` (Uint32Array).
6. Read strings 1-7 → `artist`, `albumTitle`, `genre`, `catalogNumber`, `barcode`, `notes`, `createdBy.name`.
7. For i = 0 to tracksLength-1:
   - Read string (8+i) → `tracks[i].title`.
   - Read 8 bytes from blob (offset 20 + i×8) → `tracks[i].durationSeconds`.
8. For i = 0 to friendsLength-1:
   - Read 8 bytes from blob (offset 20 + tracksLength×8 + i×8) → `createdBy.meta.friends[i]`.
9. Assemble the full `CdDraft` object with all fields.

## 12. Shared Type at Multiple Boundaries

When the same type appears at multiple service boundaries (e.g., `CdDraft` is used both as a `Call` argument and as an `Input` payload), the generator should produce one codec strategy for that service-boundary type-graph and reuse it.

If multiple generated entry points are emitted for ergonomics or direction-specific code generation, they must still share the same packing plan and wire shape for that same static type-graph. The codec boundary is the type-graph itself, not the call site.

This keeps the design aligned with the core AnQst goal: one comprehensive codec per service-boundary type, with no per-site drift in representation.

## 13. Acceptance Criteria Summary

Every top-level codec must produce emissions that satisfy Codec Design Principles Section 7:

| Criterion | How this strategy satisfies it |
|---|---|
| Single string (best case) | Types with exactly one leaf value emit it as a naked value |
| Flat array of ≥2 items (worst case) | Multi-leaf types emit a flat array of strings and (for dynamic members) Objects |
| No array of 1 | Single-value types emit naked; multi-value types produce ≥2 items |
| No subarrays | All leaf values are collected into the top-level flat array; no sub-codec produces arrays |
| No objects for static types | Objects appear only for `AnQst.Type.object` / `AnQst.Type.json` fields |
| Dynamic Objects only when explicit | Dynamic members are present only when the spec uses `AnQst.Type.object` / `AnQst.Type.json` |

## 14. Additional Constraints and Design Notes

### 14.1 Optional Fields Use Skip Semantics

Each optional field gets a full presence byte (`0x01` present, `0x00` absent). When absent, no data bytes are included — zero is a valid numeric value and must not be confused with absence. The decoder computes offsets dynamically based on presence bytes. Always-allocate (reserving bytes filled with zeros) is rejected. See §6.1 and §6.3.

### 14.2 Optional String Fields Do Not Use Sentinels

No sentinel or placeholder strings are used for absent optional string fields. The decoder uses a running string index, advancing only for fields whose presence byte is `0x01`. This eliminates ambiguity (empty string `""` is a valid domain value) and avoids wasting wire space. See §6.2.

### 14.3 Direction-Aware Codec Generation

AnQst interaction types have specific directionality (Architecture Principles Section 4.1). The codec direction depends on which interaction type uses the payload:

- **Widget→Parent** (TS encodes, C++ decodes): `Call` arguments, `Emitter` arguments, `Input` values
- **Parent→Widget** (C++ encodes, TS decodes): `Call` return values, `Slot` arguments, `Output` values, `DropTarget`/`HoverTarget` payloads

If a type `T` appears only in Widget→Parent contexts, the generator only needs a TS encoder and C++ decoder for `T`. If `T` appears only in Parent→Widget contexts, only a C++ encoder and TS decoder are needed. If `T` appears in both directions, the generator must emit encoder AND decoder on BOTH sides.

Direction-aware dead-code elimination is a SHOULD, not a MUST. The generator should omit unused encoder/decoder functions when the direction analysis is straightforward, but is not required to do so if it would introduce significant complexity. Emitting both directions for a type is always functionally correct (just potentially wasteful), so the simpler generator implementation is acceptable per Architecture Principles §3.1 point 2.

### 14.4 Codec Simplification for All-String Types

Architecture Principles Section 3.4 states "There is no identity Elision" and requires that the final output of a codec is either a naked string or an array of strings. For a struct where every field is a `string`, the type-graph is all-strings. The codec output would be a flat array of strings — which naturally satisfies the strict string-output requirement without any base93 encoding or byte blob construction.

However, the struct's field names and nesting structure are lost in the flat array. The decoder must still know which string corresponds to which field. This means even for all-string types, there IS a codec (the string-collection strategy with positional assignment), but it is minimal: no base93 encoding, no byte blob, just string ordering. The individual string values pass through without transformation, but their arrangement into a flat array is a structural operation that the generator must still emit.

### 14.5 Cyclic Named Types Are Planned As Runtime Traversals

Cyclic or self-referencing named types (a struct containing a field of its own type, directly or indirectly through other named types) are valid when their reachable leaf values are transportable and the generator can emit a runtime traversal strategy for the value graph.

This does not violate total static knowledge. The generator still knows the complete set of node shapes, field kinds, and leaf transport rules before it emits code. What is runtime-dynamic is only the instance depth and branching factor, not the schema. A type such as `RecordingNode` with `content: RecordingNode[]` is therefore a valid self-similar shape, not an invalid unknown type graph.

For such types, the generated codec must:

1. Reuse the statically-known node plan for each encountered runtime node rather than attempting infinite compile-time expansion.
2. Encode per-instance array lengths and presence information at runtime exactly where the traversal requires them.
3. Preserve the same acceptance criteria as any other top-level codec: single string when possible, otherwise a flat array of allowed items, with no sub-codecs creating nested emissions.

Validation must reject only:

- reachable leaf kinds that are not transportable under AnQst, or
- declaration patterns for which the generator has no correct runtime traversal strategy.

### 14.6 Consistency of Byte Blob Field Ordering

The byte order within the blob is an internal codec decision, not part of any public contract. However, the generator must be deterministic (Architecture Principles Section 3.2): given the same spec, the same byte order is produced. The recommended ordering (Section 4.3) is a guideline; the generator may use any deterministic ordering that produces correct codecs.
