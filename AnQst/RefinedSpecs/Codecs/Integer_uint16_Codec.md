# AnQst Base-Type Codec: `AnQst.Type.uint16`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.uint16` |
| TypeScript type | `number` |
| C++ type | `uint16_t` (C++ standard 16-bit unsigned integer) |
| Codec classification | **Transform** — base93-encoded 2-byte representation |
| Byte width | 2 bytes |
| Base93 width | 3 characters |
| Range | 0 to 65,535 |

## 2. Codec Equivalence

This type is **codec-identical** to `AnQst.Type.quint16`. See `Integer_quint16_Codec.md` for the complete codec specification.

| Aspect | `AnQst.Type.quint16` | `AnQst.Type.uint16` |
|---|---|---|
| C++ type | `quint16` | `uint16_t` |
| C++ header | `<QtGlobal>` (implicit) | `<cstdint>` |

## 3. Wire Representation

2 bytes, unsigned, platform-native byte order, base93-encoded into 3 characters.

## 4. Base-Type Factory

TS uses `Uint16Array`. C++ uses `std::memcpy` with `uint16_t`. See `Integer_quint16_Codec.md` Section 3.

## 5. Packing Characteristics

Same as `Integer_quint16_Codec.md`. Two 16-bit values pack into one 4-byte base93 word.

## 6. Purpose of the Distinction

Same as `Integer_int32_Codec.md` Section 7: C++ type preference between Qt and standard typedefs.
