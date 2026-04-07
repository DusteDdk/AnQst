# AnQst Base-Type Codec: `AnQst.Type.blob`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.blob` |
| TypeScript type | `ArrayBuffer` |
| C++ type | `QByteArray` |
| Codec classification | **Transform** — base93-encoded raw byte content |
| Byte width | Variable |

## 2. Codec Equivalence

This type is **codec-identical** to `AnQst.Type.buffer`. The wire representation, base93 encoding, packing characteristics, edge cases, and acceptance criteria compliance are all identical. See `Binary_buffer_Codec.md` for the complete codec specification.

| Aspect | `AnQst.Type.buffer` | `AnQst.Type.blob` |
|---|---|---|
| Wire format | Base93 string | Base93 string (identical) |
| TS type | `ArrayBuffer` | `ArrayBuffer` (identical) |
| C++ type | `QByteArray` | `QByteArray` (identical) |
| DSL description | `"JavaScript ArrayBuffer <-> QByteArray (Default...)"` | `"JavaScript ArrayBuffer <-> QByteArray"` |

## 3. Purpose of the Distinction

Both `buffer` and `blob` exist in the `AnQst.Type` enum as **semantic alternatives** for the same underlying mapping. The DSL description for `buffer` notes it is the "Default, for symmetry, same as direct use of `<ArrayBuffer>` which is allowed." The `blob` name provides an alternative label that may be more natural in some spec contexts (e.g., image data, file contents).

At the codec level, there is no difference. The generator may implement both using the same base-type factory.

## 4. Wire Representation, Base-Type Factory, Behavior

All identical to `Binary_buffer_Codec.md`. See Sections 2–9 of that document.
