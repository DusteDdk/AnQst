# AnQst Base-Type Codec: `AnQst.Type.quint64`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.quint64` |
| TypeScript type | `bigint` |
| C++ type | `quint64` (Qt alias for `unsigned long long`, guaranteed 64-bit unsigned) |
| Codec classification | **Transform** — base93-encoded 8-byte representation |
| Byte width | 8 bytes |
| Base93 width | 10 characters |
| Range | 0 to 18,446,744,073,709,551,615 |

## 2. Wire Representation

A `quint64` value is represented as its **8-byte unsigned representation** in platform-native byte order, base93-encoded into a **10-character string**.

The encoding is structurally identical to `qint64` — 8 bytes → base93 → 10 characters. The difference is the interpretation of the bytes: unsigned (no sign bit in two's complement sense; all 64 bits represent magnitude).

## 3. Base-Type Factory

### 3.1 TS Encoder (bigint → bytes)

```
Extract 8 bytes of the unsigned 64-bit representation:
  const buf = new ArrayBuffer(8);
  new BigUint64Array(buf)[0] = value;
  const bytes = new Uint8Array(buf);
→ bytes (8-element Uint8Array, platform-native byte order)
```

Under the AnQst contract, the value presented to this codec is already a valid `quint64`. The use of `BigUint64Array` is the implementation mechanism that materializes the unsigned 64-bit byte representation.

### 3.2 TS Decoder (bytes → bigint)

```
Reconstruct the unsigned 64-bit value:
  const buf = new ArrayBuffer(8);
  new Uint8Array(buf).set(bytes);
  const value = new BigUint64Array(buf)[0];
→ value (bigint, always ≥ 0n)
```

### 3.3 C++ Encoder (quint64 → bytes)

```cpp
uint8_t bytes[8];
std::memcpy(bytes, &value, 8);
```

### 3.4 C++ Decoder (bytes → quint64)

```cpp
quint64 value;
std::memcpy(&value, bytes, 8);
```

## 4. Standalone Behavior

When `quint64` is the **entire** service-boundary type:

- **Emission:** A single 10-character base93 string.
- **QWebChannel envelope:** `{"d": "<10 base93 chars>"}`

## 5. Composite Behavior

Identical to `BigInt_qint64_Codec.md` Section 5. The 8 bytes are concatenated with other numeric/boolean/binary bytes and base93-encoded as a single blob. The decoder knows the byte offset and interprets the bytes as unsigned.

## 6. Packing Characteristics

| Property | Value |
|---|---|
| Contributes to base93 blob | **Yes** — 8 bytes |
| Contributes to string collection | **No** |
| Fixed-width on wire | **Yes** — always 8 bytes / 10 base93 chars when standalone |
| Can be packed with other numeric types | **Yes** |

## 7. Differences from `qint64`

The only difference between `quint64` and `qint64` at the codec level is:

1. **JavaScript TypedArray view:** `BigUint64Array` instead of `BigInt64Array`.
2. **Decoder output:** The decoded `bigint` is always ≥ 0n (unsigned interpretation).
3. **C++ type:** `quint64` instead of `qint64`.

The wire representation is identical: 8 bytes, base93-encoded into 10 characters. The byte content differs only in the semantic interpretation (unsigned vs. signed), which is handled by the TypedArray view constructor on the TS side and the C++ type on the C++ side.

## 8. Edge Cases

### 8.1 BigUint64Array Availability

`BigUint64Array` has the same browser/engine support as `BigInt64Array` (Chrome 67+, Firefox 68+, Safari 15+, Node.js 10.3+). Available in all AnQst target environments.

### 8.2 Invalid Input Outside the `quint64` Contract

Under the AnQst contract, this codec is used only with values that are already valid `quint64` values. It does not perform runtime range checks or sign validation.

If that contract is violated, `BigUint64Array` applies the host-language unsigned 64-bit conversion semantics. For example, `-1n` becomes `18446744073709551615n` (2^64 − 1). That behavior is descriptive only and not part of the intended codec contract.

### 8.3 Qt QVariant Limitations

`QVariant` can hold `quint64` via `QVariant::fromValue(quint64)`, and extraction via `.toULongLong()` works correctly. However, `QJsonValue` uses `double` internally and would lose precision for values > 2^53. The base93 encoding completely bypasses this limitation.

## 9. Acceptance Criteria Compliance

| Criterion | Satisfied |
|---|---|
| Best case: single string | **Yes** |
| Worst case: flat array of strings | **Yes** |
| No subarrays | **Yes** |
| No objects for strongly typed fields | **Yes** |

## 10. Supersedes Previous Investigation

Same as `BigInt_qint64_Codec.md` Section 10 — the base93 byte-level encoding supersedes the hi/lo split approach from the Codecs Investigation. The hi/lo approach violates acceptance criteria (emits a JSON object for a strongly typed field) and is less compact.
