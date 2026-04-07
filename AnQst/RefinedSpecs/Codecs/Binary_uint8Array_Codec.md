# AnQst Base-Type Codec: `AnQst.Type.uint8Array`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.uint8Array` |
| TypeScript type | `Uint8Array` |
| C++ type | `QByteArray` |
| Codec classification | **Transform** — base93-encoded raw bytes |
| Element size | 1 byte per element |

## 2. Codec Relationship

This type has the same wire-level codec as `AnQst.Type.buffer` (see `Binary_buffer_Codec.md`). The raw bytes of the `Uint8Array` are base93-encoded into a string. The difference from `buffer` is:
- **TS type:** `Uint8Array` (concrete view) instead of `ArrayBuffer` (raw buffer)
- **Encoder access:** `base93Encode(uint8Array)` — the Uint8Array IS the byte sequence, no need to extract via `new Uint8Array(buffer)`
- **Decoder output:** `base93Decode(str)` returns a `Uint8Array` directly — no `.buffer` access needed

## 3. Base-Type Factory

### 3.1 TS Encoder

```
const encoded = base93Encode(uint8Array);
→ encoded (string)
```

This is the simplest of all TypedArray encoders: the Uint8Array is already a byte sequence and can be passed directly to the base93 encoder.

### 3.2 TS Decoder

```
const uint8Array = base93Decode(encoded);
→ uint8Array (Uint8Array)
```

The base93 decoder natively returns a `Uint8Array`, so no additional conversion is needed.

### 3.3 C++ Encoder / Decoder

Identical to `Binary_buffer_Codec.md` Section 3.3/3.4. `QByteArray` ↔ base93 string.

## 4. Standalone, Composite, Packing

Same as `Binary_buffer_Codec.md` Sections 4–6. Variable-length base93 string, separate element in composite output arrays.

## 5. Edge Cases

### 5.1 Uint8Array as a View

If the `Uint8Array` is a view into a larger `ArrayBuffer` (non-zero `byteOffset` or partial `byteLength`), the encoder must encode only the viewed portion: `base93Encode(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength))`. However, most `Uint8Array` instances own their entire buffer, so the common case is `base93Encode(arr)`.

## 6. Acceptance Criteria Compliance

Same as `Binary_buffer_Codec.md` Section 8.
