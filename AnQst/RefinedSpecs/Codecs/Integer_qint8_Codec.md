# AnQst Base-Type Codec: `AnQst.Type.qint8`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.qint8` |
| TypeScript type | `number` |
| C++ type | `qint8` (Qt alias for `signed char`, guaranteed 8-bit signed) |
| Codec classification | **Transform** — base93-encoded 1-byte representation |
| Byte width | 1 byte |
| Base93 width | 2 characters |
| Range | −128 to 127 |

## 2. Wire Representation

A `qint8` value is represented as its **1-byte signed two's complement representation**, base93-encoded into a **2-character string**.

## 3. Base-Type Factory

### 3.1 TS Encoder (number → byte)

```
Extract 1 byte of the signed 8-bit two's complement representation:
  const buf = new ArrayBuffer(1);
  new Int8Array(buf)[0] = value;
  const byte = new Uint8Array(buf)[0];
→ byte (single unsigned byte value 0-255)
```

### 3.2 TS Decoder (byte → number)

```
Reconstruct the signed 8-bit value:
  const buf = new ArrayBuffer(1);
  new Uint8Array(buf)[0] = byte;
  const value = new Int8Array(buf)[0];
→ value (number, −128 to 127)
```

### 3.3 C++ Encoder / Decoder

```cpp
// Encode
uint8_t byte = static_cast<uint8_t>(value);

// Decode
qint8 value = static_cast<qint8>(byte);
```

## 4. Standalone Behavior

- **Emission:** A single 2-character base93 string.
- **QWebChannel envelope:** `{"d": "<2 base93 chars>"}`

## 5. Composite Behavior

The 1 byte concatenates with other numeric bytes in the base93 blob.

## 6. Packing Characteristics

| Property | Value |
|---|---|
| Contributes to base93 blob | **Yes** — 1 byte |
| Fixed-width on wire | **Yes** — always 1 byte / 2 base93 chars when standalone |
| Can be packed with other numeric types | **Yes** |

### 6.1 Sub-Word Packing

8-bit values are the most packing-efficient when combined:

| Combination | Separate | Packed | Savings |
|---|---|---|---|
| 4 × qint8 | 8 chars | 5 chars (4 bytes = 1 word) | 3 chars |
| 3 × qint8 | 6 chars | 4 chars (3 bytes remainder) | 2 chars |
| 2 × qint8 | 4 chars | 3 chars (2 bytes remainder) | 1 char |
| 1 × qint8 + 1 × qint16 | 2+3 = 5 chars | 4 chars (3 bytes remainder) | 1 char |
| 1 × qint8 + 1 × qint32 | 2+5 = 7 chars | 7 chars (5 bytes = 1 word + 1 remainder) | 0 chars |

The top-level codec achieves maximum efficiency by grouping 8-bit fields to fill 4-byte words. Four `qint8` fields pack into exactly one word (5 chars), saving 3 chars vs. separate encoding.

## 7. Edge Cases

Under the AnQst contract, this codec is used only with values that are already valid `qint8` integers. It does not perform runtime range checks or type verification.

If that contract is violated, JavaScript `Int8Array` semantics apply as an implementation detail: fractional values truncate, out-of-range values wrap in signed 8-bit space, and `NaN`/`±Infinity` become `0`. That behavior is descriptive only and not part of the intended codec contract.

## 8. Acceptance Criteria Compliance

| Criterion | Satisfied |
|---|---|
| Best case: single string | **Yes** — 2-char base93 string |
| Worst case: flat array of strings | **Yes** |
| No subarrays | **Yes** |
| No objects for strongly typed fields | **Yes** |

## 9. Relationship to `AnQst.Type.int8`

`AnQst.Type.qint8` and `AnQst.Type.int8` have **identical codec behavior**. They differ only in the C++ type name:
- `qint8` → Qt signed 8-bit typedef (`signed char`)
- `int8_t` → C++ standard signed 8-bit typedef

See `Integer_int8_Codec.md`.
