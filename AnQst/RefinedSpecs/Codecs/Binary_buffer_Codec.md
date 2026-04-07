# AnQst Base-Type Codec: `AnQst.Type.buffer`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.buffer` |
| TypeScript type | `ArrayBuffer` |
| C++ type | `QByteArray` |
| Codec classification | **Transform** — base93-encoded raw byte content |
| Byte width | Variable |
| Base93 width | Variable: `ceil(N/4)*5 + remainder_chars` for N bytes |

## 2. Wire Representation

Per Codec Design Principles Section 4: "Numbers, booleans, and binary data are encoded using base93."

An `ArrayBuffer` value is represented on the wire as its **raw bytes base93-encoded** into a string. The base93 encoder processes the bytes in 4-byte groups (each group → 5 base93 chars), with any remaining 1–3 bytes producing 2–4 additional chars.

This is the **canonical AnQst type for raw binary data**. The DSL description says: `"JavaScript ArrayBuffer <-> QByteArray (Default, for symmetry, same as direct use of <ArrayBuffer> which is allowed.)"` — meaning `AnQst.Type.buffer` is the default mapping when `ArrayBuffer` appears in a spec.

## 3. Base-Type Factory

### 3.1 TS Encoder (ArrayBuffer → base93 string)

```
const bytes = new Uint8Array(arrayBuffer);
const encoded = base93Encode(bytes);
→ encoded (string)
```

The `base93Encode` function is the standard AnQst base93 encoder (see `AnQstGen/src/base93.ts`). It takes a `Uint8Array` and produces a string.

### 3.2 TS Decoder (base93 string → ArrayBuffer)

```
const bytes = base93Decode(encoded);
const arrayBuffer = bytes.buffer;
→ arrayBuffer (ArrayBuffer)
```

The `base93Decode` function returns a `Uint8Array`. The `.buffer` property gives the underlying `ArrayBuffer`. If the caller needs a fresh `ArrayBuffer` not sharing the Uint8Array's backing store, `.buffer.slice(0)` can be used.

### 3.3 C++ Encoder (QByteArray → base93 string)

```cpp
const uint8_t* data = reinterpret_cast<const uint8_t*>(byteArray.constData());
int len = byteArray.size();
QString encoded = base93Encode(data, len);
```

The C++ base93 encoder mirrors the TS implementation, operating on `uint8_t*` and length.

### 3.4 C++ Decoder (base93 string → QByteArray)

```cpp
QByteArray bytes = base93Decode(encoded);
```

## 4. Standalone Behavior

When `buffer` is the **entire** service-boundary type:

- **Emission:** A single base93 string of variable length.
- **QWebChannel envelope:** `{"d": "<base93 string>"}`
- This is the **best case** per Codec Design Principles Section 7.1 — a single string.

### 4.1 Wire Size

| Input size | Base93 output size | Ratio |
|---|---|---|
| 0 bytes | 0 chars (empty string `""`) | — |
| 1 byte | 2 chars | 2.00 |
| 4 bytes | 5 chars | 1.25 |
| 100 bytes | 125 chars | 1.25 |
| 1 KB | 1,280 chars | 1.25 |
| 1 MB | ~1,310,720 chars | 1.25 |

The asymptotic ratio is 5/4 = 1.25, which is better than base64's 4/3 ≈ 1.33. For large binary payloads, base93 saves approximately 6% wire size compared to base64.

## 5. Composite Behavior

When `buffer` appears as a field within a structured type:

- The raw bytes of the ArrayBuffer/QByteArray are base93-encoded into a string.
- This string occupies one position in the flat output array.
- Since the buffer is variable-length, the codec must encode the byte length to enable the decoder to determine where the buffer data ends.

### 5.1 Length Encoding Strategy

In a composite type, the buffer's **byte length** is encoded as a base93 integer in the numeric blob (alongside other integer/boolean values). The buffer's base93 content is a separate string element in the output array. The decoder reads the length from the blob, knows how many base93 characters correspond to that length, and extracts the buffer content.

Alternatively, if the buffer is the only variable-length binary field and is placed last, the decoder can infer the content from the remaining base93 string (since the length can be derived from the base93 string length itself: `decoded_bytes = floor(chars/5)*4 + max(0, remainder-1)`). This is simpler when applicable.

## 6. Packing Characteristics

| Property | Value |
|---|---|
| Contributes to base93 blob | **No** — buffer has its own base93 string (variable-length) |
| Contributes to string collection | **No** — the base93 string is a separate array element |
| Fixed-width on wire | **No** — variable-length |
| Can be packed with numeric types | **Not directly** — the buffer bytes are not concatenated into the numeric blob because the buffer is variable-length and would make the blob boundary ambiguous |

The buffer's base93 string is a distinct element in the output array, separate from the numeric blob and the string collection. This is because:
1. The buffer is variable-length, so concatenating it with fixed-length numeric bytes would require the decoder to know the buffer length to find the boundary.
2. Keeping it separate simplifies the encoder/decoder and maintains the principle of per-type specialization.

## 7. Edge Cases

### 7.1 Empty Buffer

An empty `ArrayBuffer` (0 bytes) produces an empty base93 string `""`. When standalone, the emission is `{"d": ""}`. The decoder sees an empty string and produces a 0-length ArrayBuffer/QByteArray. No ambiguity with an empty `string` value because the decoder knows the type.

### 7.2 Large Buffers

Base93 encoding is O(N) in both time and space. For very large buffers (megabytes), the base93 string will be correspondingly large. This is inherent to any text-based encoding over JSON. The most performant (least compute intensive) approach should be taken when considering how the codec should handle encoding/decoding. It is important to remember that since data is always transported between different processes (browser/node, browser/C++HostApp, qwebengine/C++HostApp ), a pointer or reference is not an option. The codec has no control over the transport or final wire-format itself.

### 7.3 Endianness

Buffers are raw byte sequences — they have no endianness concern. The bytes are encoded in the order they appear in the ArrayBuffer/QByteArray. Both encoder and decoder treat the buffer as an opaque byte stream.

## 8. Acceptance Criteria Compliance

| Criterion | Satisfied |
|---|---|
| Best case: single string | **Yes** — standalone buffer → base93 string |
| Worst case: flat array of strings | **Yes** — in composites, the base93 string is an array element |
| No subarrays | **Yes** |
| No objects for strongly typed fields | **Yes** |

## 9. C++ Type Correspondence

- C++ type: `QByteArray`
- `QVariant` wrapping: `QVariant::fromValue(QByteArray)`
- `QVariant` extraction: `.toByteArray()`
- The generated codec converts between `QByteArray` and a base93-encoded `QString` for the wire.

## 10. Relationship to `AnQst.Type.blob`

`AnQst.Type.buffer` and `AnQst.Type.blob` have **identical codec behavior**. Both map `ArrayBuffer` ↔ `QByteArray` with base93 encoding. They exist as separate enum members for semantic clarity in specs:
- `buffer` — default mapping, equivalent to bare `ArrayBuffer` in a spec
- `blob` — alternative name for the same mapping

See `Binary_blob_Codec.md`.

## 11. Composite Packing Rule

### 11.1 Variable-Length Buffers Occupy Their Own String Element

When a buffer field coexists with numeric fields, the buffer's base93 string occupies its own element in the output array, separate from the numeric blob. This is the normative strategy for AnQst buffer transport.

This separation is required because most buffers are variable-length, making concatenation with the numeric blob impractical without additional boundary management inside the blob. Keeping the buffer as a separate string element also keeps the encoder and decoder simpler: the buffer codec and numeric blob codec remain independent while still satisfying the flat-emission acceptance criteria.

Concatenation into the numeric blob is only viable for fixed-size buffers, which are rare in AnQst specs. That special case should not be added proactively.
