# AnQst Base-Type Codec: `AnQst.Type.qint32`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.qint32` |
| TypeScript type | `number` |
| C++ type | `qint32` (Qt alias for `int`, guaranteed 32-bit signed) |
| Codec classification | **Transform** — base93-encoded 4-byte representation |
| Byte width | 4 bytes |
| Base93 width | 5 characters |
| Range | −2,147,483,648 to 2,147,483,647 |

## 2. Wire Representation

A `qint32` value is represented as its **4-byte signed two's complement representation** in platform-native byte order, base93-encoded into a **5-character string**.

JavaScript `number` (IEEE 754 double) can represent all 32-bit integers exactly (the safe integer range extends to 2^53), so no precision loss occurs in the TS ↔ wire ↔ C++ round-trip.

## 3. Base-Type Factory

### 3.1 TS Encoder (number → bytes)

```
Extract 4 bytes of the signed 32-bit two's complement representation:
  const buf = new ArrayBuffer(4);
  new Int32Array(buf)[0] = value;
  const bytes = new Uint8Array(buf);
→ bytes (4-element Uint8Array, platform-native byte order)
```

Under the AnQst contract, the value presented to this codec is already a valid `qint32`. The use of `Int32Array` is the implementation mechanism that materializes the 32-bit signed byte representation.

### 3.2 TS Decoder (bytes → number)

```
Reconstruct the signed 32-bit value:
  const buf = new ArrayBuffer(4);
  new Uint8Array(buf).set(bytes);
  const value = new Int32Array(buf)[0];
→ value (number)
```

### 3.3 C++ Encoder (qint32 → bytes)

```cpp
uint8_t bytes[4];
std::memcpy(bytes, &value, 4);
```

### 3.4 C++ Decoder (bytes → qint32)

```cpp
qint32 value;
std::memcpy(&value, bytes, 4);
```

## 4. Standalone Behavior

When `qint32` is the **entire** service-boundary type:

- **Emission:** A single 5-character base93 string.
- **QWebChannel envelope:** `{"d": "<5 base93 chars>"}`

## 5. Composite Behavior

When `qint32` appears as a field within a structured type:

- The 4 bytes are concatenated with bytes from other numeric/boolean/binary fields.
- All bytes are base93-encoded as a single blob.
- The decoder knows the exact byte offset for this field within the blob.

## 6. Packing Characteristics

| Property | Value |
|---|---|
| Contributes to base93 blob | **Yes** — 4 bytes |
| Contributes to string collection | **No** |
| Fixed-width on wire | **Yes** — always 4 bytes / 5 base93 chars when standalone |
| Can be packed with other numeric types | **Yes** |

### 6.1 Sub-Word Packing

A `qint32` consumes exactly one 4-byte word in the base93 encoder's natural alignment (4 bytes → 5 chars). This is the most efficient unit for the base93 encoder. When combined with other 32-bit fields, each contributes exactly one 4-byte word, maximizing base93 encoding efficiency (no remainder bytes).

When combined with smaller types (16-bit, 8-bit), the mixed byte counts may produce remainder bytes. The top-level codec should order fields to minimize remainder: group 32-bit fields together, then 16-bit, then 8-bit, to fill 4-byte words as completely as possible.

## 7. Edge Cases

Under the AnQst contract, this codec is used only with values that are already valid `qint32` integers. It does not perform runtime range checks, fractional checks, or integrity verification.

As a JavaScript implementation detail, the `Int32Array` view follows standard JS typed-array coercion semantics if that contract is violated: fractional values truncate toward zero, out-of-range values wrap in signed 32-bit two's complement space, and `NaN`/`±Infinity` become `0`. These behaviors are not an alternate codec contract; they are only the host platform behavior for invalid input.

## 8. Acceptance Criteria Compliance

| Criterion | Satisfied |
|---|---|
| Best case: single string | **Yes** — 5-char base93 string |
| Worst case: flat array of strings | **Yes** — contributes to base93 blob string |
| No subarrays | **Yes** |
| No objects for strongly typed fields | **Yes** |

## 9. C++ Type Correspondence

- C++ type: `qint32` (Qt typedef, equivalent to `int` on all Qt-supported platforms)
- Functionally identical to `AnQst.Type.int32` (`int32_t`). See `Integer_int32_Codec.md`.
- The only difference is the C++ type name used in generated struct declarations and function signatures.

## 10. Relationship to `AnQst.Type.int32`

`AnQst.Type.qint32` and `AnQst.Type.int32` have **identical codec behavior**: same byte width (4), same signedness (signed), same base93 encoding (5 chars), same TypedArray view (`Int32Array`), same range. They differ only in the C++ type used in generated declarations:
- `qint32` → Qt integer typedef
- `int32_t` → C++ standard integer typedef

The generator may share the same base-type factory implementation for both, differing only in the emitted C++ type name.
