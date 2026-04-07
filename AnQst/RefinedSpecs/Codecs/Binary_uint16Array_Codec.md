# AnQst Base-Type Codec: `AnQst.Type.uint16Array`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.uint16Array` |
| TypeScript type | `Uint16Array` |
| C++ type | `QByteArray` |
| Codec classification | **Transform** — base93-encoded raw bytes |
| Element size | 2 bytes per element (unsigned 16-bit) |

## 2. Wire Representation

The raw bytes of the `Uint16Array`'s underlying buffer are base93-encoded. Each element occupies 2 bytes in platform-native byte order (little-endian on all practical targets). The wire format is a single base93 string containing all element bytes in sequence.

## 3. Base-Type Factory

### 3.1 TS Encoder

```
const bytes = new Uint8Array(uint16Array.buffer, uint16Array.byteOffset, uint16Array.byteLength);
const encoded = base93Encode(bytes);
→ encoded (string)
```

### 3.2 TS Decoder

```
const bytes = base93Decode(encoded);
const uint16Array = new Uint16Array(bytes.buffer);
→ uint16Array (Uint16Array)
```

### 3.3 C++ Side

`QByteArray` ↔ base93 string. To access elements on the C++ side:
```cpp
const uint16_t* elements = reinterpret_cast<const uint16_t*>(byteArray.constData());
int count = byteArray.size() / 2;
```

## 4. Endianness

Multi-byte elements are stored in platform-native byte order. Both the JavaScript engine and the C++ runtime use the same byte order (little-endian on x86/ARM/WASM). The codec does not perform byte-swapping. See `Binary_typedArray_Codec.md` Section 7.1 and `Number_number_Codec.md` Section 10.2.

## 5. Standalone, Composite, Packing

Same as `Binary_buffer_Codec.md`. Variable-length base93 string.

## 6. Edge Cases

### 6.1 Byte Count Alignment

The decoded byte count must be divisible by 2 (the element size). If not, the `Uint16Array` constructor throws `RangeError`. This indicates data corruption, not a codec design issue (see `Binary_typedArray_Codec.md` Section 11.1).

## 7. Acceptance Criteria Compliance

Same as `Binary_buffer_Codec.md` Section 8.
