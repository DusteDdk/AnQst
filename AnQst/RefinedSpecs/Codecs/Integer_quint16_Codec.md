# AnQst Base-Type Codec: `AnQst.Type.quint16`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.quint16` |
| TypeScript type | `number` |
| C++ type | `quint16` (Qt alias for `unsigned short`, guaranteed 16-bit unsigned) |
| Codec classification | **Transform** — base93-encoded 2-byte representation |
| Byte width | 2 bytes |
| Base93 width | 3 characters |
| Range | 0 to 65,535 |

## 2. Wire Representation

A `quint16` value is represented as its **2-byte unsigned representation** in platform-native byte order, base93-encoded into a **3-character string**.

## 3. Base-Type Factory

### 3.1 TS Encoder (number → bytes)

```
Extract 2 bytes of the unsigned 16-bit representation:
  const buf = new ArrayBuffer(2);
  new Uint16Array(buf)[0] = value;
  const bytes = new Uint8Array(buf);
→ bytes (2-element Uint8Array, platform-native byte order)
```

### 3.2 TS Decoder (bytes → number)

```
Reconstruct the unsigned 16-bit value:
  const buf = new ArrayBuffer(2);
  new Uint8Array(buf).set(bytes);
  const value = new Uint16Array(buf)[0];
→ value (number, always ≥ 0)
```

### 3.3 C++ Encoder / Decoder

```cpp
// Encode
uint8_t bytes[2];
std::memcpy(bytes, &value, 2);

// Decode
quint16 value;
std::memcpy(&value, bytes, 2);
```

## 4. Standalone Behavior

- **Emission:** A single 3-character base93 string.
- **QWebChannel envelope:** `{"d": "<3 base93 chars>"}`

## 5. Composite Behavior

The 2 bytes concatenate with other numeric bytes in the base93 blob. Same packing characteristics as `Integer_qint16_Codec.md` Section 6.

## 6. Packing Characteristics

Same as `Integer_qint16_Codec.md` Section 6. Two `quint16` values pack into one 4-byte base93 word (5 chars vs. 6 chars separately).

## 7. Edge Cases

Under the AnQst contract, this codec is used only with values that are already valid `quint16` integers. It does not perform runtime range checks or type verification.

If that contract is violated, JavaScript `Uint16Array` semantics apply as an implementation detail: fractional values truncate, out-of-range values wrap in unsigned 16-bit space, and `NaN`/`±Infinity` become `0`. That behavior is descriptive only and not part of the intended codec contract.

## 8. Acceptance Criteria Compliance

| Criterion | Satisfied |
|---|---|
| Best case: single string | **Yes** — 3-char base93 string |
| Worst case: flat array of strings | **Yes** |
| No subarrays | **Yes** |
| No objects for strongly typed fields | **Yes** |

## 9. Relationship to `AnQst.Type.uint16`

`AnQst.Type.quint16` and `AnQst.Type.uint16` have **identical codec behavior**. They differ only in the C++ type name:
- `quint16` → Qt unsigned 16-bit typedef
- `uint16_t` → C++ standard unsigned 16-bit typedef

See `Integer_uint16_Codec.md`.
