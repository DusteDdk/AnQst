# AnQst Base-Type Codec: `AnQst.Type.int32`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.int32` |
| TypeScript type | `number` |
| C++ type | `int32_t` (C++ standard 32-bit signed integer) |
| Codec classification | **Transform** — base93-encoded 4-byte representation |
| Byte width | 4 bytes |
| Base93 width | 5 characters |
| Range | −2,147,483,648 to 2,147,483,647 |

## 2. Codec Equivalence

This type is **codec-identical** to `AnQst.Type.qint32`. The wire representation, byte extraction, base93 encoding, packing characteristics, edge cases, and acceptance criteria compliance are all identical. See `Integer_qint32_Codec.md` for the complete codec specification.

The only difference is the C++ type name used in generated declarations:

| Aspect | `AnQst.Type.qint32` | `AnQst.Type.int32` |
|---|---|---|
| C++ type | `qint32` | `int32_t` |
| C++ header | `<QtGlobal>` (implicit) | `<cstdint>` |
| Semantic origin | Qt integer typedefs | C++ standard integer typedefs |

## 3. Wire Representation

4 bytes, signed two's complement, platform-native byte order, base93-encoded into 5 characters. See `Integer_qint32_Codec.md` Section 2.

## 4. Base-Type Factory

Identical to `Integer_qint32_Codec.md` Section 3. TS uses `Int32Array`, C++ uses `std::memcpy` with `int32_t`.

## 5. Standalone and Composite Behavior

Identical to `Integer_qint32_Codec.md` Sections 4 and 5.

## 6. Packing Characteristics

Identical to `Integer_qint32_Codec.md` Section 6. The 4-byte width aligns with the base93 encoder's word size.

## 7. Purpose of the Distinction

The existence of both `qint32` and `int32` in the `AnQst.Type` enum allows spec authors to express a C++ type preference:
- **`qint32`** — preferred when the C++ code is primarily Qt-based and uses Qt type conventions.
- **`int32_t`** — preferred when the C++ code interfaces with non-Qt C++ libraries that use standard integer types.

This distinction affects only the generated C++ declarations and has no effect on the TypeScript side, the wire format, or the codec behavior. Per Architecture Principles Section 5.2 ("Globally consistent mapping"), both types map to JavaScript `number` and use the same codec strategy.
