# AnQst Base-Type Codec: `AnQst.Type.uint32`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.uint32` |
| TypeScript type | `number` |
| C++ type | `uint32_t` (C++ standard 32-bit unsigned integer) |
| Codec classification | **Transform** — base93-encoded 4-byte representation |
| Byte width | 4 bytes |
| Base93 width | 5 characters |
| Range | 0 to 4,294,967,295 |

## 2. Codec Equivalence

This type is **codec-identical** to `AnQst.Type.quint32`. See `Integer_quint32_Codec.md` for the complete codec specification.

| Aspect | `AnQst.Type.quint32` | `AnQst.Type.uint32` |
|---|---|---|
| C++ type | `quint32` | `uint32_t` |
| C++ header | `<QtGlobal>` (implicit) | `<cstdint>` |

## 3. Wire Representation

4 bytes, unsigned, platform-native byte order, base93-encoded into 5 characters.

## 4. Base-Type Factory

TS uses `Uint32Array`. C++ uses `std::memcpy` with `uint32_t`. See `Integer_quint32_Codec.md` Section 3.

## 5. Purpose of the Distinction

Same as `Integer_int32_Codec.md` Section 7: allows spec authors to choose between Qt and C++ standard type names in generated declarations.
