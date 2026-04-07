# AnQst Base-Type Codec: `AnQst.Type.float32Array`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.float32Array` |
| TypeScript type | `Float32Array` |
| C++ type | `QByteArray` |
| Codec classification | **Transform** — base93-encoded raw bytes |
| Element size | 4 bytes per element (IEEE 754 binary32) |

## 2. Wire Representation

The raw bytes of the `Float32Array`'s underlying buffer are base93-encoded. Each element is a 32-bit IEEE 754 single-precision float (4 bytes). Like `uint32Array` and `int32Array`, the 4-byte element size aligns perfectly with the base93 encoder's word size.

## 3. Base-Type Factory

### 3.1 TS Encoder

```
const bytes = new Uint8Array(float32Array.buffer, float32Array.byteOffset, float32Array.byteLength);
const encoded = base93Encode(bytes);
```

### 3.2 TS Decoder

```
const bytes = base93Decode(encoded);
const float32Array = new Float32Array(bytes.buffer);
```

### 3.3 C++ Side

`QByteArray` ↔ base93 string. Elements accessed via `reinterpret_cast<const float*>(byteArray.constData())`.

## 4. Precision Characteristics

`Float32Array` stores IEEE 754 single-precision values (approximately 7 significant decimal digits). When a JavaScript `number` (double precision, ~15 digits) is written to a `Float32Array`, precision is lost due to the narrower format. This precision loss is inherent to the `Float32Array` type and is not a codec concern — the codec faithfully transports whatever bytes the `Float32Array` contains.

## 5. Special Values

Each 4-byte element can represent the full range of IEEE 754 binary32 values, including `NaN`, `±Infinity`, `±0`, and subnormals. The byte-level codec preserves all bit patterns exactly.

## 6. Encoding Efficiency, Endianness, Edge Cases

Same as `Binary_uint32Array_Codec.md`. Perfect 4-byte word alignment. Byte count must be divisible by 4.

## 7. Acceptance Criteria Compliance

Same as `Binary_buffer_Codec.md` Section 8.
