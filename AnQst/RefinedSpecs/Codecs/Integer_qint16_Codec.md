# AnQst Base-Type Codec: `AnQst.Type.qint16`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.qint16` |
| TypeScript type | `number` |
| C++ type | `qint16` (Qt alias for `short`, guaranteed 16-bit signed) |
| Codec classification | **Transform** — base93-encoded 2-byte representation |
| Byte width | 2 bytes |
| Base93 width | 3 characters |
| Range | −32,768 to 32,767 |

## 2. Wire Representation

A `qint16` value is represented as its **2-byte signed two's complement representation** in platform-native byte order, base93-encoded into a **3-character string**.

## 3. Base-Type Factory

### 3.1 TS Encoder (number → bytes)

```
Extract 2 bytes of the signed 16-bit two's complement representation:
  const buf = new ArrayBuffer(2);
  new Int16Array(buf)[0] = value;
  const bytes = new Uint8Array(buf);
→ bytes (2-element Uint8Array, platform-native byte order)
```

### 3.2 TS Decoder (bytes → number)

```
Reconstruct the signed 16-bit value:
  const buf = new ArrayBuffer(2);
  new Uint8Array(buf).set(bytes);
  const value = new Int16Array(buf)[0];
→ value (number)
```

### 3.3 C++ Encoder / Decoder

```cpp
// Encode
uint8_t bytes[2];
std::memcpy(bytes, &value, 2);

// Decode
qint16 value;
std::memcpy(&value, bytes, 2);
```

## 4. Standalone Behavior

- **Emission:** A single 3-character base93 string.
- **QWebChannel envelope:** `{"d": "<3 base93 chars>"}`

## 5. Composite Behavior

The 2 bytes are concatenated with bytes from other numeric/boolean/binary fields and base93-encoded as part of a single blob.

## 6. Packing Characteristics

| Property | Value |
|---|---|
| Contributes to base93 blob | **Yes** — 2 bytes |
| Fixed-width on wire | **Yes** — always 2 bytes / 3 base93 chars when standalone |
| Can be packed with other numeric types | **Yes** |

### 6.1 Sub-Word Packing

Two `qint16` values (2+2 = 4 bytes) pack perfectly into one base93 word (4 bytes → 5 chars), which is more efficient than encoding them separately (3+3 = 6 chars). The top-level codec should co-locate 16-bit fields to maximize 4-byte word utilization.

| Combination | Separate | Packed | Savings |
|---|---|---|---|
| 2 × qint16 | 6 chars | 5 chars | 1 char |
| 1 × qint16 + 2 × qint8 | 3+2+2 = 7 chars | 5 chars (4 bytes) | 2 chars |
| 1 × qint16 + 1 × qint8 | 3+2 = 5 chars | 4 chars (3 bytes) | 1 char |

## 7. Edge Cases

Under the AnQst contract, this codec is used only with values that are already valid `qint16` integers. It does not perform runtime range checks or type verification.

If that contract is violated, JavaScript `Int16Array` semantics apply as an implementation detail: fractional values truncate, out-of-range values wrap in signed 16-bit space, and `NaN`/`±Infinity` become `0`. That behavior is descriptive only and not part of the intended codec contract.

## 8. Acceptance Criteria Compliance

| Criterion | Satisfied |
|---|---|
| Best case: single string | **Yes** — 3-char base93 string |
| Worst case: flat array of strings | **Yes** |
| No subarrays | **Yes** |
| No objects for strongly typed fields | **Yes** |

## 9. Relationship to `AnQst.Type.int16`

`AnQst.Type.qint16` and `AnQst.Type.int16` have **identical codec behavior**. They differ only in the C++ type name:
- `qint16` → Qt signed 16-bit typedef
- `int16_t` → C++ standard signed 16-bit typedef

See `Integer_int16_Codec.md`.
