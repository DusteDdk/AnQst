# AnQst Base-Type Codec: `AnQst.Type.number`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.number` |
| TypeScript type | `number` |
| C++ type | `double` |
| Codec classification | **Transform** — base93-encoded IEEE 754 byte representation |
| Byte width | 8 bytes (IEEE 754 binary64) |
| Base93 width | 10 characters (8 bytes = 2×4 bytes = 2×5 base93 chars) |

## 2. Wire Representation

Per Codec Design Principles Section 4: "Numbers, booleans, and binary data are encoded using base93."

A `number` value is represented on the wire as its **8-byte IEEE 754 binary64 representation**, base93-encoded into a **10-character string**. This encoding preserves full double precision including special values (NaN, ±Infinity, ±0, subnormals) without loss.

The byte order is **platform-native** (little-endian on all practical targets: x86, ARM, WebAssembly). Since AnQstGen controls both encoder and decoder and they are generated from the same invocation, byte order agreement is guaranteed by construction (Opaque Wire Contract Section 6.4).

## 3. Base-Type Factory

### 3.1 TS Encoder (number → bytes)

```
Extract 8 bytes of the IEEE 754 representation:
  const buf = new ArrayBuffer(8);
  new Float64Array(buf)[0] = value;
  const bytes = new Uint8Array(buf);
→ bytes (8-element Uint8Array, platform-native byte order)
```

The 8 bytes are then base93-encoded (by the top-level codec or inline) into 10 characters.

### 3.2 TS Decoder (bytes → number)

```
Reconstruct the IEEE 754 value from 8 bytes:
  const buf = new ArrayBuffer(8);
  new Uint8Array(buf).set(bytes);
  const value = new Float64Array(buf)[0];
→ value (number)
```

### 3.3 C++ Encoder (double → bytes)

```cpp
uint8_t bytes[8];
std::memcpy(bytes, &value, 8);
// bytes contains the IEEE 754 representation in platform-native order
```

The 8 bytes are then base93-encoded into a 10-character `QString`.

### 3.4 C++ Decoder (bytes → double)

```cpp
double value;
std::memcpy(&value, bytes, 8);
// value is reconstructed from the IEEE 754 representation
```

## 4. Standalone Behavior

When `number` is the **entire** service-boundary type (e.g., `Output<number>`, a method parameter of type `number`):

- **Emission:** A single 10-character base93 string. This is the **best case** per Codec Design Principles Section 7.1.
- **QWebChannel envelope:** `{"d": "<10 base93 chars>"}`
- The decoder base93-decodes the string into 8 bytes and reconstructs the double.

## 5. Composite Behavior

When `number` appears as a field within a structured type:

- The 8 bytes of the IEEE 754 representation are concatenated with bytes from other numeric/boolean/binary fields in the type-graph.
- The entire concatenated byte sequence is base93-encoded as a single blob.
- The blob occupies one position in the flat output array.
- The decoder knows the exact byte offset for this field's 8 bytes within the blob (determined at generation time).

**Example:** A struct `{x: number, y: number, label: string}` produces:
- 16 bytes of numeric data (8+8) → base93-encoded into a 20-character string
- 1 string value
- Emission: `["<20 base93 chars>", "the label"]` (array of 2 — valid)

## 6. Packing Characteristics

| Property | Value |
|---|---|
| Contributes to base93 blob | **Yes** — 8 bytes |
| Contributes to string collection | **No** |
| Fixed-width on wire | **Yes** — always 8 bytes / 10 base93 chars when standalone |
| Can be packed with other numeric types | **Yes** — bytes concatenate before shared base93 encoding |

### 6.1 Packing Efficiency

When multiple `number` fields exist in the same type-graph, their bytes are concatenated and encoded as a single base93 blob. This is more efficient than encoding each separately:

| Fields | Separate encoding | Packed encoding | Savings |
|---|---|---|---|
| 1 double | 10 chars | 10 chars | 0 |
| 2 doubles | 20 chars | 20 chars | 0 |
| 1 double + 1 qint32 | 10 + 5 = 15 chars | 15 chars | 0 |
| 1 double + 1 qint8 | 10 + 2 = 12 chars | 12 chars (9 bytes → 12 chars) | 0 |

For `number` specifically, there is no packing win from concatenation (since 8 bytes is evenly divisible by 4). The benefit of concatenation is in sharing the base93 encoding infrastructure and producing a single blob string rather than multiple separate strings.

## 7. Edge Cases

### 7.1 Special IEEE 754 Values

All special values are handled correctly by the byte-level encoding:

| Value | IEEE 754 bytes | Behavior |
|---|---|---|
| `+0` | `00 00 00 00 00 00 00 00` | Encoded/decoded exactly |
| `-0` | `00 00 00 00 00 00 00 80` | Encoded/decoded exactly (sign bit preserved) |
| `NaN` | `00 00 00 00 00 00 F8 7F` (quiet NaN) | Encoded/decoded exactly |
| `+Infinity` | `00 00 00 00 00 00 F0 7F` | Encoded/decoded exactly |
| `-Infinity` | `00 00 00 00 00 00 F0 FF` | Encoded/decoded exactly |
| Subnormals | Various | Encoded/decoded exactly |

This is a key advantage over string-based number encoding (`String(value)`/`Number(str)`): the byte representation is always exactly 8 bytes and preserves the exact bit pattern, including the distinction between `+0` and `-0`, and the specific NaN payload.

### 7.2 Integer Values

JavaScript numbers that happen to be integers (e.g., `42`, `-1`, `0`) are still IEEE 754 doubles and are encoded as 8 bytes. There is no optimization for "integer values that fit in fewer bytes" because the codec is uniform — it always encodes 8 bytes. This uniformity eliminates runtime branching in the codec.

### 7.3 JSON.stringify Limitation

`JSON.stringify` handles `number` natively (it produces JSON numbers), but the AnQst codec bypasses `JSON.stringify` for the value itself — it base93-encodes the raw bytes. The JSON serializer only handles the outer envelope (the `"d"` key wrapping).

## 8. Acceptance Criteria Compliance

| Criterion | Satisfied |
|---|---|
| Best case: single string | **Yes** — standalone number → 10-char base93 string |
| Worst case: flat array of strings | **Yes** — in composites, the base93 blob is a string element |
| No subarrays | **Yes** — a single blob string, no nesting |
| No objects for strongly typed fields | **Yes** — number is never emitted as an object |

## 9. C++ Type Correspondence

- C++ type: `double`
- `QVariant` wrapping: `QVariant::fromValue(double)` (but not used directly — the codec produces a `QString` from base93 encoding)
- `QJsonValue` wrapping: `QJsonValue(QString)` (the base93-encoded string)
- The C++ codec is a generated function that extracts bytes via `memcpy`, base93-encodes, and produces a `QString` for the wire.

## 10. Design Notes

### 10.1 Rejected Alternative: Decimal String Representation

For `number` as a standalone service-boundary type, direct string conversion might appear attractive:
- **Encode:** `String(value)` (TS) / `QString::number(value, 'g', 17)` (C++)
- **Decode:** `Number(str)` (TS) / `str.toDouble()` (C++)

This is **not** part of the AnQst codec contract. Per `MissionAndCodecs.md`, numbers are always transported via base93 over their binary representation, just like booleans and binary data.

The decimal-string approach is rejected because it:
- Loses exact bit-level fidelity (`+0` vs. `-0`, NaN payload distinctions)
- Introduces a second wire shape for the same strongly typed primitive
- Breaks the uniform "non-string primitives use base93" rule that the rest of the codec system relies on
- Provides a wire-size win only for some standalone values, while making the architecture less coherent

The normative strategy for `number` is therefore unchanged: **always encode the IEEE 754 bytes and base93-encode that byte sequence**.

### 10.2 Endianness

Byte order is not a concern for AnQst codecs. All current and foreseeable AnQst targets (x86, ARM, WebAssembly) are little-endian, and both sides of the bridge run on the same platform. The codec uses platform-native byte order with no byte-swapping.
