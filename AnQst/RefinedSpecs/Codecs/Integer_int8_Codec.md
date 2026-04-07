# AnQst Base-Type Codec: `AnQst.Type.int8`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.int8` |
| TypeScript type | `number` |
| C++ type | `int8_t` (C++ standard 8-bit signed integer) |
| Codec classification | **Transform** — base93-encoded 1-byte representation |
| Byte width | 1 byte |
| Base93 width | 2 characters |
| Range | −128 to 127 |

## 2. Codec Equivalence

This type is **codec-identical** to `AnQst.Type.qint8`. See `Integer_qint8_Codec.md` for the complete codec specification.

| Aspect | `AnQst.Type.qint8` | `AnQst.Type.int8` |
|---|---|---|
| C++ type | `qint8` (`signed char`) | `int8_t` |
| C++ header | `<QtGlobal>` (implicit) | `<cstdint>` |

## 3. Wire Representation

1 byte, signed two's complement, base93-encoded into 2 characters. See `Integer_qint8_Codec.md` Section 2.

## 4. Base-Type Factory

TS uses `Int8Array`. C++ uses `static_cast<int8_t>(byte)`. See `Integer_qint8_Codec.md` Section 3.

## 5. Packing Characteristics

Same as `Integer_qint8_Codec.md` Section 6. Four 8-bit values pack into one 4-byte base93 word (5 chars vs. 8 chars separately).

## 6. Purpose of the Distinction

Same as `Integer_int32_Codec.md` Section 7: C++ type preference between Qt and standard typedefs.
