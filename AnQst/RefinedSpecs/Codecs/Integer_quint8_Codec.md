# AnQst Base-Type Codec: `AnQst.Type.quint8`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.quint8` |
| TypeScript type | `number` |
| C++ type | `quint8` (Qt alias for `unsigned char`, guaranteed 8-bit unsigned) |
| Codec classification | **Transform** — base93-encoded 1-byte representation |
| Byte width | 1 byte |
| Base93 width | 2 characters |
| Range | 0 to 255 |

## 2. Wire Representation

A `quint8` value is represented as its **1-byte unsigned representation**, base93-encoded into a **2-character string**.

## 3. Base-Type Factory

### 3.1 TS Encoder (number → byte)

```
const byte = value & 0xFF;
→ byte (single unsigned byte value 0-255)
```

`Uint8Array` view can also be used: `new Uint8Array([value])[0]`. Both approaches are equivalent for values in range; the bitwise mask is faster for a single value.

### 3.2 TS Decoder (byte → number)

```
const value = byte;
→ value (number, 0 to 255)
```

The byte IS the value for unsigned 8-bit. No conversion needed.

### 3.3 C++ Encoder / Decoder

```cpp
// Encode: quint8 is already a byte
uint8_t byte = value;

// Decode: byte is already quint8
quint8 value = byte;
```

## 4. Standalone Behavior

- **Emission:** A single 2-character base93 string.
- **QWebChannel envelope:** `{"d": "<2 base93 chars>"}`

## 5. Composite Behavior

The 1 byte concatenates with other numeric bytes in the base93 blob. Same packing characteristics as `Integer_qint8_Codec.md` Section 6.

## 6. Packing Characteristics

Same as `Integer_qint8_Codec.md` Section 6. Four `quint8` values pack into exactly one base93 word (5 chars vs. 8 chars separately).

## 7. Edge Cases

`Uint8Array` or `& 0xFF` truncates to 8 bits. Negative values wrap (e.g., `-1` → `255`). Fractional parts are truncated. `NaN` → `0`.

## 8. Acceptance Criteria Compliance

| Criterion | Satisfied |
|---|---|
| Best case: single string | **Yes** — 2-char base93 string |
| Worst case: flat array of strings | **Yes** |
| No subarrays | **Yes** |
| No objects for strongly typed fields | **Yes** |

## 9. Relationship to `AnQst.Type.uint8`

`AnQst.Type.quint8` and `AnQst.Type.uint8` have **identical codec behavior**. They differ only in the C++ type name:
- `quint8` → Qt unsigned 8-bit typedef (`unsigned char`)
- `uint8_t` → C++ standard unsigned 8-bit typedef

See `Integer_uint8_Codec.md`.
