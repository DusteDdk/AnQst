# AnQst Base-Type Codec: `AnQst.Type.int16Array`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.int16Array` |
| TypeScript type | `Int16Array` |
| C++ type | `QByteArray` |
| Codec classification | **Transform** — base93-encoded raw bytes |
| Element size | 2 bytes per element (signed 16-bit) |

## 2. Codec Relationship

Wire-level codec is identical to `Binary_uint16Array_Codec.md`. The raw bytes are base93-encoded. The signed/unsigned interpretation is determined by the TypedArray constructor on decode and by the C++ application's cast on the C++ side.

## 3. Base-Type Factory

### 3.1 TS Encoder

```
const bytes = new Uint8Array(int16Array.buffer, int16Array.byteOffset, int16Array.byteLength);
const encoded = base93Encode(bytes);
```

### 3.2 TS Decoder

```
const bytes = base93Decode(encoded);
const int16Array = new Int16Array(bytes.buffer);
```

### 3.3 C++ Side

`QByteArray` ↔ base93 string. Elements accessed via `reinterpret_cast<const int16_t*>(byteArray.constData())`.

## 4. Endianness, Standalone, Composite, Packing, Edge Cases

Same as `Binary_uint16Array_Codec.md`. Byte count must be divisible by 2.

## 5. Acceptance Criteria Compliance

Same as `Binary_buffer_Codec.md` Section 8.
