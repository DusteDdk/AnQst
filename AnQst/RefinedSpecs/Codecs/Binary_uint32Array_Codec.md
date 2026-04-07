# AnQst Base-Type Codec: `AnQst.Type.uint32Array`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.uint32Array` |
| TypeScript type | `Uint32Array` |
| C++ type | `QByteArray` |
| Codec classification | **Transform** — base93-encoded raw bytes |
| Element size | 4 bytes per element (unsigned 32-bit) |

## 2. Wire Representation

The raw bytes of the `Uint32Array`'s underlying buffer are base93-encoded. Each element occupies 4 bytes in platform-native byte order. The 4-byte element size aligns perfectly with the base93 encoder's 4-byte word size, making this the most encoding-efficient multi-byte TypedArray variant.

## 3. Base-Type Factory

### 3.1 TS Encoder

```
const bytes = new Uint8Array(uint32Array.buffer, uint32Array.byteOffset, uint32Array.byteLength);
const encoded = base93Encode(bytes);
```

### 3.2 TS Decoder

```
const bytes = base93Decode(encoded);
const uint32Array = new Uint32Array(bytes.buffer);
```

### 3.3 C++ Side

`QByteArray` ↔ base93 string. Elements accessed via `reinterpret_cast<const uint32_t*>(byteArray.constData())`.

## 4. Encoding Efficiency

With 4 bytes per element, every element aligns exactly with one base93 word (5 chars). No remainder bytes are produced, giving optimal encoding efficiency:

| Elements | Bytes | Base93 chars | Chars/element |
|---|---|---|---|
| 1 | 4 | 5 | 5.00 |
| 10 | 40 | 50 | 5.00 |
| 100 | 400 | 500 | 5.00 |

## 5. Endianness, Edge Cases

Same as `Binary_uint16Array_Codec.md`. Byte count must be divisible by 4.

## 6. Acceptance Criteria Compliance

Same as `Binary_buffer_Codec.md` Section 8.
