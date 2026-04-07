# AnQst Base-Type Codec: `AnQst.Type.typedArray`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.typedArray` |
| TypeScript type | `TypedArray` (any concrete TypedArray subclass) |
| C++ type | `QByteArray` |
| Codec classification | **Transform** — base93-encoded raw underlying buffer bytes |
| Byte width | Variable |

## 2. Wire Representation

A `TypedArray` value is represented on the wire as the **raw bytes of its underlying `ArrayBuffer`**, base93-encoded into a string. This is identical to the `buffer` codec at the byte level — the TypedArray is simply a typed view over an ArrayBuffer, and the codec transports the raw bytes.

The key distinction from specific TypedArray variants (`uint8Array`, `int16Array`, etc.) is that `typedArray` is the **DSL-level general TypedArray form**. This is not a fallback codec for unknown strong types; it is a deliberate spec choice. The generator must still know the specific TypedArray subtype to reconstruct the correct view on decode. Since `AnQst.Type.typedArray` does not specify the element type, the generator relies on the TypeScript type annotation in the spec to determine the concrete subtype.

## 3. Base-Type Factory

### 3.1 TS Encoder (TypedArray → base93 string)

```
const bytes = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
const encoded = base93Encode(bytes);
→ encoded (string)
```

The encoder accesses the underlying buffer through `byteOffset` and `byteLength` to correctly handle TypedArray views that do not start at the beginning of their buffer or do not span the entire buffer.

### 3.2 TS Decoder (base93 string → TypedArray)

```
const bytes = base93Decode(encoded);
const typedArray = new <ConcreteTypedArray>(bytes.buffer);
→ typedArray (<ConcreteTypedArray>)
```

The `<ConcreteTypedArray>` constructor (e.g., `Float32Array`, `Int16Array`) is determined at generation time based on the TypeScript type in the spec. The decoder knows which constructor to use because it was generated from the same spec.

### 3.3 C++ Encoder / Decoder

Same as `Binary_buffer_Codec.md` Section 3.3/3.4. `QByteArray` is the raw bytes regardless of the JavaScript view type.

## 4. Standalone Behavior

- **Emission:** A single base93 string of variable length.
- **QWebChannel envelope:** `{"d": "<base93 string>"}`

## 5. Composite Behavior

Same as `Binary_buffer_Codec.md` Section 5. The base93 string for the typed array's raw bytes is a separate element in the output array.

## 6. Packing Characteristics

Same as `Binary_buffer_Codec.md` Section 6. Variable-length binary data occupies its own base93 string element.

## 7. Edge Cases

### 7.1 Endianness of Multi-Byte Element Types

TypedArrays with multi-byte elements (e.g., `Int16Array`, `Float32Array`) store their data in **platform-native byte order**. On little-endian platforms (x86, ARM, WebAssembly), a `Float32Array` element is stored as 4 bytes in little-endian order.

The codec transports the raw bytes as-is, preserving the platform byte order. Since both the JavaScript encoder and the C++ decoder run on the same platform (or on platforms with matching byte order), the raw bytes are directly usable on both sides without byte-swapping.

On the C++ side, to access individual elements from the decoded `QByteArray`, the application code casts or memcpy's the bytes into the appropriate C/C++ type (e.g., `float`, `int16_t`), which works correctly because the byte order matches.

See `Number_number_Codec.md` Section 10.2 for the broader endianness discussion.

### 7.2 TypedArray with Non-Zero ByteOffset

A TypedArray can be a view into a portion of an ArrayBuffer (non-zero `byteOffset`, or `byteLength` less than the buffer's full size). The encoder handles this correctly by using `typedArray.byteOffset` and `typedArray.byteLength` rather than encoding the entire underlying ArrayBuffer.

### 7.3 Empty TypedArray

An empty TypedArray (0 elements) produces an empty base93 string `""`. Same handling as `Binary_buffer_Codec.md` Section 7.1.

## 8. Acceptance Criteria Compliance

Same as `Binary_buffer_Codec.md` Section 8.

## 9. C++ Type Correspondence

- C++ type: `QByteArray` (same as `buffer` and `blob`)
- The C++ side receives raw bytes. The interpretation of those bytes as typed elements is the C++ application's responsibility — it knows the element type from the generated struct declarations.

## 10. Relationship to Specific TypedArray Variants

`AnQst.Type.typedArray` is the **general TypedArray codec for the explicitly declared `typedArray` DSL type**. The specific variants (`uint8Array`, `int8Array`, `uint16Array`, etc.) have **identical wire format** (base93-encoded raw bytes → `QByteArray`) but provide more specific TypeScript type information:

| Generic | Specific variants |
|---|---|
| `TypedArray` → `QByteArray` | `Uint8Array` → `QByteArray`, `Int16Array` → `QByteArray`, etc. |

The wire codec is identical for all variants. The difference is:
1. **TS type annotation:** The specific variant provides a concrete TypedArray type in generated declarations.
2. **Decoder constructor:** The specific variant uses its named constructor (e.g., `new Float32Array(buf)`) rather than requiring the generator to infer the constructor from context.

See individual variant codec specs (`Binary_uint8Array_Codec.md`, etc.) for details.

## 11. Edge Conditions and Validation

### 11.1 Element Count vs. Byte Count

For TypedArrays with multi-byte elements, the byte length may not be a round multiple of the element size if the underlying buffer is corrupted or truncated. The codec transports raw bytes without validation. If the decoded byte count is not divisible by the element size, the TypedArray constructor will throw a `RangeError`. This is a program error, not a codec concern — it indicates data corruption or a mismatched encoder/decoder, which would violate the build-together convention (Opaque Wire Contract Section 5).

### 11.2 Generator Inference of Concrete Type

When `AnQst.Type.typedArray` is used without a specific variant, the generator must infer the concrete TypedArray subtype from the TypeScript type annotation in the spec. If the annotation is `TypedArray` (the abstract base), the generator cannot determine the element type for the decoder. This is a validation error: the generator must require a specific TypedArray subtype (e.g., `Float32Array`) rather than the abstract `TypedArray`. Alternatively, the spec author should use the specific `AnQst.Type.<variant>` form.
