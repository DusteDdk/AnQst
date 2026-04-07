# AnQst Base-Type Codec: `AnQst.Type.int32Array`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.int32Array` |
| TypeScript type | `Int32Array` |
| C++ type | `QByteArray` |
| Codec classification | **Transform** — base93-encoded raw bytes |
| Element size | 4 bytes per element (signed 32-bit) |

## 2. Codec Relationship

Wire-level codec is identical to `Binary_uint32Array_Codec.md`. The raw bytes are base93-encoded. The signed/unsigned interpretation is determined by the TypedArray constructor on decode and by the C++ application's cast on the C++ side.

## 3. Base-Type Factory

### 3.1 TS Encoder

```
const bytes = new Uint8Array(int32Array.buffer, int32Array.byteOffset, int32Array.byteLength);
const encoded = base93Encode(bytes);
```

### 3.2 TS Decoder

```
const bytes = base93Decode(encoded);
const int32Array = new Int32Array(bytes.buffer);
```

### 3.3 C++ Side

`QByteArray` ↔ base93 string. Elements accessed via `reinterpret_cast<const int32_t*>(byteArray.constData())`.

## 4. Encoding Efficiency

Same as `Binary_uint32Array_Codec.md` Section 4. Perfect 4-byte word alignment.

## 5. Endianness, Edge Cases

Same as `Binary_uint32Array_Codec.md`. Byte count must be divisible by 4.

## 6. Acceptance Criteria Compliance

Same as `Binary_buffer_Codec.md` Section 8.
