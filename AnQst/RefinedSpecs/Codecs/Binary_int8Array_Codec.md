# AnQst Base-Type Codec: `AnQst.Type.int8Array`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.int8Array` |
| TypeScript type | `Int8Array` |
| C++ type | `QByteArray` |
| Codec classification | **Transform** — base93-encoded raw bytes |
| Element size | 1 byte per element (signed interpretation) |

## 2. Codec Relationship

Wire-level codec is identical to `Binary_buffer_Codec.md`. The raw bytes are base93-encoded. The only difference from `uint8Array` is the TypeScript type and the signed interpretation of byte values.

## 3. Base-Type Factory

### 3.1 TS Encoder

```
const bytes = new Uint8Array(int8Array.buffer, int8Array.byteOffset, int8Array.byteLength);
const encoded = base93Encode(bytes);
→ encoded (string)
```

The `Int8Array` is viewed as `Uint8Array` to get the raw unsigned byte values for base93 encoding. The signed interpretation is irrelevant at the byte level — the same bit pattern represents both `Int8Array[-1]` and `Uint8Array[255]`.

### 3.2 TS Decoder

```
const bytes = base93Decode(encoded);
const int8Array = new Int8Array(bytes.buffer);
→ int8Array (Int8Array)
```

The decoded `Uint8Array`'s underlying buffer is reinterpreted as `Int8Array`.

### 3.3 C++ Encoder / Decoder

Identical to `Binary_buffer_Codec.md` Section 3.3/3.4. The C++ side works with `QByteArray` (which stores raw bytes). The signed/unsigned interpretation is the C++ application's responsibility.

## 4. Standalone, Composite, Packing, Edge Cases

Same as `Binary_uint8Array_Codec.md` / `Binary_buffer_Codec.md`. Variable-length base93 string.

## 5. Acceptance Criteria Compliance

Same as `Binary_buffer_Codec.md` Section 8.
