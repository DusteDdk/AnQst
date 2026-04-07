# AnQst Base-Type Codec: `AnQst.Type.int16`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.int16` |
| TypeScript type | `number` |
| C++ type | `int16_t` (C++ standard 16-bit signed integer) |
| Codec classification | **Transform** — base93-encoded 2-byte representation |
| Byte width | 2 bytes |
| Base93 width | 3 characters |
| Range | −32,768 to 32,767 |

## 2. Codec Equivalence

This type is **codec-identical** to `AnQst.Type.qint16`. See `Integer_qint16_Codec.md` for the complete codec specification.

| Aspect | `AnQst.Type.qint16` | `AnQst.Type.int16` |
|---|---|---|
| C++ type | `qint16` | `int16_t` |
| C++ header | `<QtGlobal>` (implicit) | `<cstdint>` |

## 3. Wire Representation

2 bytes, signed two's complement, platform-native byte order, base93-encoded into 3 characters. See `Integer_qint16_Codec.md` Section 2.

## 4. Base-Type Factory

TS uses `Int16Array`. C++ uses `std::memcpy` with `int16_t`. See `Integer_qint16_Codec.md` Section 3.

## 5. Packing Characteristics

Same as `Integer_qint16_Codec.md` Section 6. Two 16-bit values pack into one 4-byte base93 word (5 chars vs. 6 chars separately).

## 6. Purpose of the Distinction

Same as `Integer_int32_Codec.md` Section 7: C++ type preference between Qt and standard typedefs.
