# AnQst Base-Type Codec: `AnQst.Type.float64Array`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.float64Array` |
| TypeScript type | `Float64Array` |
| C++ type | `QByteArray` |
| Codec classification | **Transform** — base93-encoded raw bytes |
| Element size | 8 bytes per element (IEEE 754 binary64) |

## 2. Wire Representation

The raw bytes of the `Float64Array`'s underlying buffer are base93-encoded. Each element is an 8-byte IEEE 754 double-precision float — the same format as JavaScript's `number` type. The 8-byte element size produces two 4-byte base93 words per element (10 chars/element).

## 3. Base-Type Factory

### 3.1 TS Encoder

```
const bytes = new Uint8Array(float64Array.buffer, float64Array.byteOffset, float64Array.byteLength);
const encoded = base93Encode(bytes);
```

### 3.2 TS Decoder

```
const bytes = base93Decode(encoded);
const float64Array = new Float64Array(bytes.buffer);
```

### 3.3 C++ Side

`QByteArray` ↔ base93 string. Elements accessed via `reinterpret_cast<const double*>(byteArray.constData())`.

## 4. Relationship to `AnQst.Type.number`

Each element of a `Float64Array` has the same binary representation as a single `AnQst.Type.number` value (both are IEEE 754 binary64). The difference is:

| Aspect | `AnQst.Type.number` | `AnQst.Type.float64Array` |
|---|---|---|
| TS type | `number` (scalar) | `Float64Array` (array) |
| C++ type | `double` (scalar) | `QByteArray` (byte blob) |
| Wire format | 10 base93 chars (fixed, 1 value) | Variable base93 string (N × 8 bytes) |
| Packing in composites | Bytes join the numeric blob | Separate base93 string element |

A `Float64Array` of 1 element is wire-equivalent to a single `number` in terms of byte content, but uses the variable-length binary codec path rather than the fixed-size numeric codec path.

## 5. Encoding Efficiency

| Elements | Bytes | Base93 chars | Chars/element |
|---|---|---|---|
| 1 | 8 | 10 | 10.00 |
| 10 | 80 | 100 | 10.00 |
| 100 | 800 | 1,000 | 10.00 |

8-byte elements produce exact 4-byte word multiples (8 = 2×4), so no remainder bytes are produced. Encoding efficiency is optimal.

## 6. Precision, Special Values

Full IEEE 754 binary64 precision is preserved. All special values (`NaN`, `±Infinity`, `±0`, subnormals) are faithfully transported. No precision loss occurs — unlike `float32Array`, `Float64Array` uses the same precision as JavaScript's `number`.

## 7. Endianness, Edge Cases

Same as `Binary_uint16Array_Codec.md`. Byte count must be divisible by 8.

## 8. Acceptance Criteria Compliance

Same as `Binary_buffer_Codec.md` Section 8.
