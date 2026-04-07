# AnQst Base-Type Codec: `AnQst.Type.qint64`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.qint64` |
| TypeScript type | `bigint` |
| C++ type | `qint64` (Qt alias for `long long`, guaranteed 64-bit signed) |
| Codec classification | **Transform** — base93-encoded 8-byte representation |
| Byte width | 8 bytes |
| Base93 width | 10 characters |
| Range | −9,223,372,036,854,775,808 to 9,223,372,036,854,775,807 |

## 2. Wire Representation

A `qint64` value is represented as its **8-byte signed two's complement representation** in platform-native byte order, base93-encoded into a **10-character string**.

This type is **critical for codec support** because JavaScript's `BigInt` cannot be JSON-serialized. `JSON.stringify` throws a `TypeError` when encountering a `bigint` value. Without a codec, any type-graph containing a `qint64` field is broken at runtime.

## 3. Base-Type Factory

### 3.1 TS Encoder (bigint → bytes)

```
Extract 8 bytes of the signed 64-bit two's complement representation:
  const buf = new ArrayBuffer(8);
  new BigInt64Array(buf)[0] = value;
  const bytes = new Uint8Array(buf);
→ bytes (8-element Uint8Array, platform-native byte order)
```

`BigInt64Array` handles the signed-to-two's-complement conversion natively, including negative values. No manual hi/lo splitting is needed.

### 3.2 TS Decoder (bytes → bigint)

```
Reconstruct the signed 64-bit value:
  const buf = new ArrayBuffer(8);
  new Uint8Array(buf).set(bytes);
  const value = new BigInt64Array(buf)[0];
→ value (bigint)
```

### 3.3 C++ Encoder (qint64 → bytes)

```cpp
uint8_t bytes[8];
std::memcpy(bytes, &value, 8);
// bytes contains the two's complement representation in platform-native order
```

### 3.4 C++ Decoder (bytes → qint64)

```cpp
qint64 value;
std::memcpy(&value, bytes, 8);
```

## 4. Standalone Behavior

When `qint64` is the **entire** service-boundary type:

- **Emission:** A single 10-character base93 string.
- **QWebChannel envelope:** `{"d": "<10 base93 chars>"}`

## 5. Composite Behavior

When `qint64` appears as a field within a structured type:

- The 8 bytes are concatenated with bytes from other numeric/boolean/binary fields.
- All bytes are base93-encoded as a single blob.
- The decoder knows the exact byte offset for this field within the blob.

**Example from CdEntryEditor spec:** `CdDraft.cdId` is `AnQst.Type.qint64`. In the `CdDraft` top-level codec, the 8 bytes for `cdId` are concatenated with the 4 bytes for `releaseYear` (qint32), the 1 byte for `valid` (if present), etc. The combined bytes form a single base93 blob.

## 6. Packing Characteristics

| Property | Value |
|---|---|
| Contributes to base93 blob | **Yes** — 8 bytes |
| Contributes to string collection | **No** |
| Fixed-width on wire | **Yes** — always 8 bytes / 10 base93 chars when standalone |
| Can be packed with other numeric types | **Yes** — bytes concatenate into shared blob |

## 7. Edge Cases

### 7.1 JavaScript BigInt Range

JavaScript `BigInt` has arbitrary precision, but `qint64` is fixed at 64-bit signed. Under the AnQst contract, values reaching this codec are already valid `qint64` values. The codec does not add runtime range validation.

If that contract is violated, `BigInt64Array` applies standard 64-bit signed truncation/wrapping semantics as a host-language implementation detail. That behavior is not an alternate supported codec rule; it is simply what the underlying JS primitive does for invalid input.

### 7.2 BigInt64Array Availability

`BigInt64Array` is available in all modern JavaScript engines (Chrome 67+, Firefox 68+, Safari 15+, Node.js 10.3+) and in WebAssembly. It is available in all environments where AnQst's generated Angular applications run.

### 7.3 Endianness

Same as `Number_number_Codec.md` Section 10.2. Platform-native byte order (little-endian on all practical targets). Both TS and C++ use the same platform's native order since AnQst's current deployment model has both sides on the same machine (Qt widget embedding Angular app).

### 7.4 Zero Representations

`0n` (BigInt zero) has a unique 8-byte representation (`0x00` × 8). Unlike IEEE 754 doubles, there is no `−0n` for integers. No ambiguity.

## 8. Acceptance Criteria Compliance

| Criterion | Satisfied |
|---|---|
| Best case: single string | **Yes** — standalone qint64 → 10-char base93 string |
| Worst case: flat array of strings | **Yes** — in composites, contributes to base93 blob string |
| No subarrays | **Yes** |
| No objects for strongly typed fields | **Yes** |

## 9. C++ Type Correspondence

- C++ type: `qint64` (Qt typedef for `long long`)
- The generated codec produces a base93-encoded `QString`, not a `QJsonValue(qint64)` — because `QJsonValue` uses `double` internally and would lose precision for values > 2^53.
- This base93 encoding completely bypasses Qt's QVariant/QJson numeric limitations, which is exactly the point.

## 10. Relationship to Previous Investigation

The `AnQstGen-Codecs-Investigation/02-Type-Coverage-Matrix.md` proposed a hi/lo split approach (`{hi: number, lo: number}`) for qint64. That approach is **superseded** by the base93 byte-level encoding specified here, which is superior because:

1. **No JSON objects** — the hi/lo approach emits a JSON object (`{hi, lo}`), which violates acceptance criteria Section 7.3 ("An Object is emitted for a strongly typed field or structure. Objects are NEVER used for strongly typed fields").
2. **More compact** — the hi/lo approach produces `{"hi":123456,"lo":789012}` (20+ chars with keys). Base93 produces 10 chars.
3. **Simpler decoder** — base93 decode + memcpy vs. two field extractions and BigInt arithmetic.
4. **Packable** — base93 bytes concatenate with other numeric fields. The hi/lo object cannot be concatenated.
