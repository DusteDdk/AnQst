# AnQst Codec Design Principles

## 1. Purpose

This document defines the design principles governing AnQst's codec generation: how values are serialized and deserialized as they cross the bridge between frontend and backend. The codec system is the mechanism through which the opaque wire contract (see `AnQst-Opaque-Wire-Contract.md`) is realized.

The purpose of codecs is not merely to make values JSON-transportable. Their purpose is to transport the data declared in an AnQst-Spec efficiently and in a language-appropriate representation so that the value received on the other side is usable and semantically correct for that runtime. This is why AnQst distinguishes, for example, between JavaScript `bigint` and the various 64-bit integer mappings available in C++. It is also why codecs do not perform runtime type-checking, integrity verification, or build-compatibility checks: those concerns are outside the codec layer.

This architecture is bridge-first, not wire-first.

The conceptual product is the strongly typed bridge between JS/V8 and C++/Qt. The JSON/QWebChannel carrier is the final top-level transport constraint, not the primary design center.

## 2. Foundational Principle: Specialized Generation, No Generic Fallback

The codec system operates at two distinct levels:

- **Base-type factories:** For every type in the `AnQst.Type` enum (`AnQst-Spec-DSL.d.ts`, lines 237-286), there exists a dedicated, super-optimized encode/decode routine. These are reusable leaf-level primitives (e.g., base93 encode for integers and binary values, native JSON string emission for strings, planner-selected finite-domain codes for closed sets). They handle individual values, not structures. Base-type codecs are rendering participants, not owners of a service-boundary wire contract.

- **Top-level codecs:** For each type that appears at the service boundary (a method argument, return payload, or property value), the generator produces a single comprehensive codec. This codec handles the entire type-graph reachable from that top-level type — all fields at all nesting depths — by calling base-type factories for leaf values and flattening the structure into the optimal wire representation. Substructure types that are not themselves service-boundary types do not get independent codecs or independent wire representations; their fields are absorbed into the containing top-level codec.

There is no generic conversion path. The generator never "falls back" on general conversion. Only for structures explicitly declared as dynamic by the AnQst-Spec does it use a dynamic codec, and when it does, it applies it to the smallest possible subset (e.g., a single explicitly-dynamic member), never to the containing structure as a whole.

## 3. Total Static Knowledge

AnQstGen has complete knowledge of all static and dynamic structures before it begins generating code. This means:

- The generated frontends and backends have full and exact knowledge of all structures and fields that will be transported.
- They know exactly where and how each value is provided and consumed.
- The generated code contains no runtime coordination, no feature/capability/version information exchange.
- Both sides of the bridge agree on every detail of the wire format by construction, not by negotiation.

This total knowledge is what makes per-type codec specialization possible. A generic framework that does not control both sides of the bridge cannot assume this, and must therefore include self-describing metadata, type tags, or version headers in every message. AnQst does not.

Finite-domain information is part of this total static knowledge. Literal unions and other closed sets must survive long enough for the planner to choose a runtime-efficient boundary strategy, and generated public target-language types should preserve that closed-world information when feasible.

## 4. Base93 Encoding

Numbers and binary data are encoded using base93 when the chosen boundary plan places them in a packed binary region. Booleans and other finite-domain values use the representation chosen by the whole-boundary planner. That may be a raw code string, a packed byte code, or another closed-world specialization when that improves generated runtime behavior. The base93 alphabet consists of 93 characters from the printable ASCII range (0x20-0x7E), excluding `"` and `\` to ensure the encoded strings are JSON-safe without escaping.

Base93 is more space-efficient than base64 (93 vs 64 symbols per character position) and avoids the JSON escaping overhead that would affect base64's `+` and `/` characters in some contexts. The encoder packs 4 bytes into 5 base93 characters; the decoder reverses this. TypeScript emission templates live in `AnQstGen/src/base93.ts`, and the shared C++ runtime implementation lives in `AnQstWidget/AnQstWebBase/src/AnQstBase93.cpp` (`AnQstBase93.h`).

Strings are never base93-encoded. Strings are always emitted as native JSON strings — either as a naked value (when the type contains only one string) or as a member of a flat string array (when the type-graph contains multiple strings).

## 5. Packing Strategies

The codec for a given type is free to rearrange and pack fields in whatever order produces the most efficient wire representation. The decoder knows the packing strategy because it was generated from the same spec in the same invocation.

### 5.1 Byte Blob Packing

All non-string, non-dynamic leaf values in a type-graph that the planner chooses to place in a packed binary region — integers of any width, `number` (IEEE 754 double), `boolean`, `bigint`, and finite-domain codes where appropriate — are represented as raw bytes and concatenated into a single byte sequence. This combined sequence is then base93-encoded into one string. The decoder knows the exact byte offset of each field within the blob because both encoder and decoder are generated from the same spec.

This means a struct containing a `qint32` (4 bytes), two `qint8` values (1 byte each), and a `boolean` (1 byte) may produce a single 7-byte sequence encoded as one base93 string, rather than four separate encoded values, when that is the chosen boundary plan. The top-level codec should order fields within the blob to maximize generated runtime efficiency first and base93 efficiency second.

### 5.2 String Collection

Strings within a type-graph are packed together into a single flat array of strings. Since both sides of the generated codec know each string's position in the array, the actual key or placement of each string within the deserialized structure is irrelevant for the wire format.

This means that if a structure contains nested substructures with string fields, all strings from the entire type-graph are collected into one flat array, not nested arrays that mirror the structure hierarchy.

Finite-domain values may also be carried in the string region when that is the chosen planner specialization, but that is a whole-boundary decision rather than a leaf-owned default.

### 5.3 Field Reordering

Codecs are not required to pack fields in the order they appear in the spec or in the deserialized structure. For transporting a struct with a substructure containing numbers, the codecs can optimize by grouping all numbers together (for efficient base93 packing) rather than interleaving them with strings or other types.

## 6. One Comprehensive Codec Per Service-Boundary Type

Each service-boundary type (that is, each type used as a service method argument, return payload, or property value) gets a single comprehensive codec. That codec handles the entirety of the type-graph reachable from the service-boundary type: every field, at every nesting depth, across all substructures. Each codec is stand-alone and optimal for encoding and decoding that particular type, with no avoidable runtime structural overhead from conserving the source structure inside the wire representation being produced.

A type that appears only as a field within another type — not directly at the service boundary — is not a codec boundary. It has no independent wire representation. Its fields are absorbed into the containing top-level codec. For example, if a `CdDraft` struct contains a `Track[]` field and a `User` field, and `CdDraft` is used as a method argument, the `CdDraft` codec collects all strings from `CdDraft`, `Track`, and `User` into a single flat array and packs all numbers from all three into a single base93 blob. There is no `Track` codec or `User` codec that produces its own output.

This design is required by the acceptance criteria (Section 7). Delegating to independent sub-codecs would violate them:

- **Isolation:** Each sub-codec would produce its own wire representation, preventing cross-structure packing optimizations. The resulting emission would contain nested arrays or objects — an invalid emission per Section 7.3.
- **Inefficient packing/unpacking:** Strings, numbers, and binary data from different nesting levels could not be collected and packed together.
- **Unnecessary method calls:** A deep struct hierarchy would produce a cascade of codec function calls where a single flat codec suffices.

The codec architecture is therefore:

- **Base-type factories:** Pre-built, optimal encode/decode routines for each `AnQst.Type` member (e.g., base93 encode for integers, native JSON string emission for strings). These operate on individual leaf values, not structures.
- **Top-level codecs:** Generated once per service-boundary type. Each codec walks the entire type-graph for its type, calling base-type factories for leaf values and flattening all structural composition into the optimal wire representation. Only these top-level codecs produce wire output.

This avoids structural and call overhead entirely.

The top-level planner owns the important decisions:

- whether finite domains remain textual or are recoded
- whether booleans are byte-packed, text-coded, or otherwise represented
- whether arrays consume the tail or require explicit count metadata
- whether metadata is grouped for runtime speed
- whether target-language public types preserve closed domains instead of widening them

### 6.1 Variable-Length Array Serialization

A codec that must serialize array-typed fields faces a constraint: its output must still be a single string or a flat array of allowed items, never nested arrays. Generated codecs cannot rely on sub-codecs to serialize their array elements, since those sub-codecs would also be permitted to output arrays, which would create illegal nesting. This is intentional.

When a codec serializes array data, the array elements must be inlined into the codec's single output array. The codec may choose the most efficient strategy based on what it knows statically about the type:

- **Statically known length:** No length encoding is needed. Both encoder and decoder know the array length at generation time, so elements are simply placed at known positions in the output.
- **Single variable-length array, no other data:** The elements can be serialized directly as the output array. The decoder knows the entire output consists of that array's elements.
- **Single variable-length array, with other data:** The array elements can be appended as the last items in the output by convention. The decoder knows that everything after the fixed-position items belongs to the variable-length array.
- **Multiple variable-length arrays:** The codec can encode the length of each array as an integer before the first element of that array, allowing the decoder to determine where one array ends and the next begins.

The encoder and decoder for each type should be designed in lock-step — determining the shape of both together makes it simpler to keep them in sync, since every packing decision in the encoder implies a corresponding unpacking decision in the decoder.

Count, tail, and metadata choices are planner-owned compute decisions. A slightly larger header is correct when it removes a second pass or other avoidable runtime work.

## 7. Acceptance Criteria for Codec Efficiency

These criteria apply to the output of a top-level codec for non-void payload types — the unit that goes on the wire for a given service-boundary type. Void payloads (e.g., `Emitter` with no arguments, `Slot<void>`, zero-parameter method calls) do not go through a codec: the `"d"` value in the QWebChannel envelope carries `null`, and no codec function is generated. The `null` emission is not subject to these criteria.

For non-void types, there is no intermediate wire representation for substructures; they are absorbed into the top-level codec and do not independently satisfy or violate these criteria.

A valid emission is one of:

- A single string, OR
- An array of at least two allowed items (strings and, where the type contains explicitly dynamic members, Objects), OR
- Exceptionally, a single Object — only when the entire type is explicitly declared as fully dynamic in the AnQst-Spec (see Section 7.4).

Any emission that does not match one of these forms is invalid.

### 7.1 Best Case

A single string. The string may be a base93-encoded binary blob or a native JSON string. This cannot be determined by examining the emission — the decoder knows which one it is. This ambiguity does not matter because the decoder for that specific type is generated from the same knowledge.

### 7.2 Worst Case

A single flat array of at least two allowed items. The items may be strings (native JSON strings or base93-encoded binary blobs) and, where the type contains explicitly dynamic members, Objects. The role of each item cannot be determined by examining the emission alone, and that does not matter because the decoder for that type knows the role of each element by construction.

### 7.3 Invalid Emissions

The following are invalid and indicate a codec design error:

- The emission is neither a single string nor an array of at least two allowed items (strings or Objects for dynamic members).
- An array of one item. If only one value needs to be emitted, it should be emitted as a naked value, not wrapped in an array.
- The array contains subarrays. This would indicate that a sub-codec produced its own array, violating the one-codec-per-type principle.
- An Object is emitted for a strongly typed field or structure. Objects are NEVER used for strongly typed fields — they are ONLY permitted for truly dynamic types as declared in the AnQst-Spec.

### 7.4 Exception for Dynamic Types

Where the AnQst-Spec explicitly specifies a truly dynamic type (`AnQst.Type.object`, `AnQst.Type.json`), an Object containing only allowed members may be emitted. This Object may be the sole emission (if the entire type is dynamic) or a member of the flat array (if only one member is dynamic).

### 7.5 Implication for Dynamic Type Members

The AnQst-Spec-DSL must not allow declaration of non-JSON-native types as members of truly dynamic types. Since dynamic types are transported as-is (JSON Objects), their members must be representable directly in JSON. A dynamic type containing a BigInt field, for example, would violate this constraint because BigInt is not JSON-native and the dynamic codec has no static knowledge of the field's type to apply a transform.

## 8. QWebChannel Integration

Only the invocation of QWebChannel creates a `QJsonObject`, and it contains a single top-level key: `"d"` (for Data). The type of the value under `"d"` is whatever is most ideal for transporting the specific type — a string (best case), a flat array of allowed items (worst case), or exceptionally an Object (for fully dynamic types).

The QWebChannel envelope is the only point where a JSON Object is created by the AnQst bridge. Everything inside the `"d"` payload is produced by the type's codec and follows the acceptance criteria above.

## 9. Dynamic Type Handling

Dynamic types are considered rare and exceptional in AnQst specs. When they do appear:

- The generator produces a highly optimized, high-performance, minimal-overhead codec for the dynamic portion.
- The dynamic codec applies only to the smallest possible subset. If a struct has one dynamic member among ten static members, only that one member uses the dynamic codec; the other nine use their per-type specialized codecs.
- A top-level argument or return value uses the fully-dynamic codec only if the type is explicitly declared as fully dynamic. This is rare.
- The dynamic codec is still generated, not generic. It is purpose-built for the specific declaration site and the specific set of allowed members.

An Object emission is allowed ONLY when it is the fastest and cleanest transport for a truly dynamic type. It is never a fallback for types that the generator does not know how to handle. If the generator cannot produce a specialized codec for a type, that type is invalid in the spec, not silently degraded to a generic codec.

## 10. Relationship to the Opaque Wire Contract

The codec design principles are the implementation layer of the opaque wire contract. The wire contract says: the format is unstable and under generator control. The codec principles define how the generator exercises that control.

Because the wire format is not a public contract:

- Packing strategies can change between generator versions.
- Base93 can be replaced with a different encoding if a better one is found.
- Field ordering can be rearranged based on new optimization heuristics.
- The acceptance criteria (single string or flat string array) can evolve if new constraints or opportunities emerge.

None of these changes affect user code, because user code depends only on the stable public API (types, methods, properties), never on the wire format.
