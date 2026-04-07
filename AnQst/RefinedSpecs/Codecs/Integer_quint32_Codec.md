# AnQst Base-Type Codec: `AnQst.Type.quint32`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.quint32` |
| TypeScript type | `number` |
| C++ type | `quint32` (Qt alias for `unsigned int`, guaranteed 32-bit unsigned) |
| Codec classification | **Transform** — base93-encoded 4-byte representation |
| Byte width | 4 bytes |
| Base93 width | 5 characters |
| Range | 0 to 4,294,967,295 |

## 2. Wire Representation

A `quint32` value is represented as its **4-byte unsigned representation** in platform-native byte order, base93-encoded into a **5-character string**.

JavaScript `number` can represent all unsigned 32-bit integers exactly (max 4,294,967,295 is well within the safe integer range of 2^53 − 1).

## 3. Base-Type Factory

### 3.1 TS Encoder (number → bytes)

```
Extract 4 bytes of the unsigned 32-bit representation:
  const buf = new ArrayBuffer(4);
  new Uint32Array(buf)[0] = value;
  const bytes = new Uint8Array(buf);
→ bytes (4-element Uint8Array, platform-native byte order)
```

Under the AnQst contract, the value presented to this codec is already a valid `quint32`. The use of `Uint32Array` is the implementation mechanism that materializes the 32-bit unsigned byte representation.

### 3.2 TS Decoder (bytes → number)

```
Reconstruct the unsigned 32-bit value:
  const buf = new ArrayBuffer(4);
  new Uint8Array(buf).set(bytes);
  const value = new Uint32Array(buf)[0];
→ value (number, always ≥ 0)
```

### 3.3 C++ Encoder (quint32 → bytes)

```cpp
uint8_t bytes[4];
std::memcpy(bytes, &value, 4);
```

### 3.4 C++ Decoder (bytes → quint32)

```cpp
quint32 value;
std::memcpy(&value, bytes, 4);
```

## 4. Standalone Behavior

- **Emission:** A single 5-character base93 string.
- **QWebChannel envelope:** `{"d": "<5 base93 chars>"}`

## 5. Composite Behavior

Identical to `Integer_qint32_Codec.md` Section 5. The 4 bytes concatenate with other numeric bytes and are base93-encoded as part of a single blob.

## 6. Packing Characteristics

Same as `Integer_qint32_Codec.md` Section 6. The 4-byte width aligns perfectly with the base93 encoder's 4-byte word size.

## 7. Edge Cases

Under the AnQst contract, this codec is used only with values that are already valid `quint32` integers. It does not perform runtime range checks or type verification.

If that contract is violated, JavaScript `Uint32Array` semantics apply as an implementation detail: fractional values truncate, out-of-range values wrap in unsigned 32-bit space, and `NaN`/`±Infinity` become `0`. That behavior is descriptive only and not part of the intended codec contract.

## 8. Acceptance Criteria Compliance

| Criterion | Satisfied |
|---|---|
| Best case: single string | **Yes** — 5-char base93 string |
| Worst case: flat array of strings | **Yes** |
| No subarrays | **Yes** |
| No objects for strongly typed fields | **Yes** |

## 9. Relationship to `AnQst.Type.uint32`

`AnQst.Type.quint32` and `AnQst.Type.uint32` have **identical codec behavior**. They differ only in the C++ type name:
- `quint32` → Qt unsigned integer typedef
- `uint32_t` → C++ standard unsigned integer typedef

See `Integer_uint32_Codec.md`.
