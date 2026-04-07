# AnQst Base-Type Codec: `AnQst.Type.uint8`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.uint8` |
| TypeScript type | `number` |
| C++ type | `uint8_t` (C++ standard 8-bit unsigned integer) |
| Codec classification | **Transform** — base93-encoded 1-byte representation |
| Byte width | 1 byte |
| Base93 width | 2 characters |
| Range | 0 to 255 |

## 2. Codec Equivalence

This type is **codec-identical** to `AnQst.Type.quint8`. See `Integer_quint8_Codec.md` for the complete codec specification.

| Aspect | `AnQst.Type.quint8` | `AnQst.Type.uint8` |
|---|---|---|
| C++ type | `quint8` (`unsigned char`) | `uint8_t` |
| C++ header | `<QtGlobal>` (implicit) | `<cstdint>` |

## 3. Wire Representation

1 byte, unsigned, base93-encoded into 2 characters. See `Integer_quint8_Codec.md` Section 2.

## 4. Base-Type Factory

TS uses `value & 0xFF`. C++ uses direct assignment. See `Integer_quint8_Codec.md` Section 3.

## 5. Packing Characteristics

Same as `Integer_quint8_Codec.md`. Four 8-bit values pack into one 4-byte base93 word.

## 6. Purpose of the Distinction

Same as `Integer_int32_Codec.md` Section 7: C++ type preference between Qt and standard typedefs.
