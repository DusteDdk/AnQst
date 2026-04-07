# AnQst Base-Type Codec: `AnQst.Type.stringArray`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.stringArray` |
| TypeScript type | `string[]` |
| C++ type | `QStringList` |
| Codec classification | **Identity per element** — elements are native JSON strings; array structure requires length handling |
| Element byte width | Variable (UTF-8 per element) |

## 2. Wire Representation

Each element of the string array is a native JSON string — no base93, no transformation on individual elements. The challenge is encoding the **array structure** (specifically, the count of elements) within the constraints of valid AnQst emissions.

Per Codec Design Principles Section 5.2, strings within a type-graph are packed together into a single flat array. The `stringArray` type contributes a variable number of strings to this flat collection.

## 3. Base-Type Factory

### 3.1 Encoder

The encoder produces a sequence of string values. No transformation is applied to individual elements. The factory's responsibility is to make the element count recoverable by the decoder.

### 3.2 Decoder

The decoder consumes a known number of string values from the flat array (the count having been determined by the length-encoding strategy selected by the top-level codec).

## 4. Standalone Behavior

When `stringArray` is the **entire** service-boundary type (e.g., `Call<AnQst.Type.stringArray>`):

The top-level codec must emit a valid emission containing all array elements. Per Codec Design Principles Section 6.1, for a "single variable-length array, no other data," the elements can be serialized directly as the output array — but the decoder must be able to determine the element count.

### 4.1 Encoding Strategy

The top-level codec prepends a **base93-encoded element count** as the first item, followed by the string elements:

| Array length | Emission | Validity |
|---|---|---|
| 0 elements | `"<b93:0>"` | Single string — valid (best case) |
| 1 element | `["<b93:1>", "item"]` | Array of 2 — valid |
| N elements (N≥2) | `["<b93:N>", "item1", ..., "itemN"]` | Array of N+1 ≥ 3 — valid |

The count is encoded as a **base93 positional integer**: the count value is expressed in base-93 using characters from the base93 alphabet, where each character position represents a power of 93 (least significant position last). This is a simple variable-length digit encoding, distinct from the full base93 byte-array encoder used for binary data. For counts 0–92, this is a single character. For counts 93–8,648, two characters. For counts 8,649–804,356, three characters. This overhead is negligible.

Note: In the **standalone** case (Section 4.1), the count is emitted as a separate string element in the output array. In the **composite** case (Section 5), the count is stored as a fixed-width unsigned integer (e.g., 4 bytes as uint32) within the byte blob alongside other numeric data, and the entire blob is base93-encoded as a unit. The standalone case uses the lightweight positional encoding because the count must be a self-contained string.

### 4.2 Decoding Strategy

- Read the first element, base93-decode it as an unsigned integer → `N`.
- Read the next `N` elements as the string array contents.

### 4.3 QWebChannel Envelope

- 0 elements: `{"d": "<b93:0>"}`
- 3 elements: `{"d": ["<b93:3>", "alpha", "beta", "gamma"]}`

## 5. Composite Behavior

When `stringArray` appears as a field within a structured type:

- All string elements from this field are collected into the top-level codec's flat string array alongside all other strings from the type-graph.
- The element count is encoded as a fixed-width unsigned integer (for example, `uint32`) within the byte blob alongside other numeric metadata.
- The decoder reads that count from the byte blob, then consumes exactly that many strings from the flat string collection.

### 5.1 Packing Position

The top-level codec places string array elements into the flat string collection in generation-determined order. Their boundaries remain recoverable because the element count is encoded in the byte blob as part of the composite codec's metadata.

## 6. Packing Characteristics

| Property | Value |
|---|---|
| Contributes to base93 blob | **Only the element count** (as fixed-width integer bytes inside the blob) |
| Contributes to string collection | **Yes** — each element is a string in the flat array |
| Fixed-width on wire | **No** — variable element count, variable element length |
| Can be packed with other types | **Yes** — elements merge into the shared string collection |

## 7. Edge Cases

### 7.1 Empty Array

An empty `string[]` is valid. The standalone emission is a single base93-encoded `0` — a single character like `" "` (the base93 character for 0). The decoder reads count=0 and produces an empty `QStringList` / empty `string[]`.

### 7.2 Array Containing Empty Strings

Empty strings `""` are valid array elements. They occupy their position in the flat array as empty strings. No ambiguity arises because the decoder knows the count and the position of each element.

### 7.3 Large Arrays

The base93 count encoding scales to arbitrarily large counts. For practical purposes, counts under 93 need 1 character, under 8,649 need 2 characters, under 804,357 need 3 characters. This is negligible overhead.

## 8. Acceptance Criteria Compliance

| Criterion | Satisfied |
|---|---|
| Best case: single string | **Yes** — empty array emits as single string (the count) |
| Worst case: flat array of strings | **Yes** — count + elements form a flat string array |
| No subarrays | **Yes** — elements are inlined into the flat array, no nesting |
| No objects for strongly typed fields | **Yes** — all items are strings |

## 9. C++ Type Correspondence

- `QVariant` wrapping: `QVariant::fromValue(QStringList)`
- `QVariant` extraction: `.toStringList()`
- `QJsonValue` wrapping: `QJsonArray` containing `QJsonValue(QString)` elements
- `QJsonValue` extraction: `.toArray()`, then `.toString()` per element

## 10. Count Encoding Rationale

### 10.1 Standalone Payload Uses a Count Prefix

When `stringArray` is the entire payload, the top-level codec prepends the element count. Count elision is not used.

The count-prefix approach avoids all ambiguity:
- 0 elements remains representable as a single string (`"<b93:0>"`), which is a valid emission.
- 1 element remains distinguishable from a naked standalone `string` payload because the codec output still carries the count.
- The decoder logic stays uniform across empty, singleton, and multi-element arrays.

Per Architecture Principles Section 3.1, correctness and simplicity take priority over saving a single character.

### 10.2 Composite String Collection Uses Blob Metadata

When a `stringArray` field coexists with individual `string` fields in a type-graph, all strings are still collected into one flat array. The composite codec distinguishes array elements from standalone string fields by storing the `stringArray` length in the byte blob metadata. The decoder reads the count first, then consumes exactly that many strings for the array and assigns the remaining strings to their respective fixed positions.
