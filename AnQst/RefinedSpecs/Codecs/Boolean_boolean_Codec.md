# AnQst Base-Type Codec: `boolean`

## Status

This file is now a lower-level leaf reference, not an authoritative whole-boundary wire contract.

When it conflicts with:

- `RefinedSpecs/Prose/AnQst-Codec-Planning-and-IR.md`
- `RefinedSpecs/Prose/AnQst-Codec-Design-Principles.md`
- `Tasks/Codec-Architecture-Correction-Replacement.md`

the prose and replacement documents win.

In particular, boolean representation is a planner-owned whole-boundary decision. A boundary planner may choose raw text codes, byte-packed blob placement, or another closed-world specialization when that is better for the generated runtime behavior. The specific single-character string strategy described below is therefore illustrative, not mandatory.

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | *Implicit* — `boolean` is recognized by its TypeScript type. No `AnQst.Type.boolean` enum entry exists because the `AnQst.Type` enum provides advisory mapping directives only for types where the C++ mapping is ambiguous or non-obvious. `boolean` maps exclusively to `bool`; no alternative C++ mapping exists. |
| TypeScript type | `boolean` |
| C++ type | `bool` |
| Codec classification | **Transform** — raw JSON-safe single-character string |
| Wire width | 1 character |

## 2. Wire Representation

A `boolean` value is represented on the wire as a **single raw character string**:

- `"0"` for `false`
- `"1"` for `true`

This is still a string-valued codec output, so it satisfies AnQst's string-oriented transport rules without paying the overhead of a byte-level base93 round-trip for a two-state value.

## 3. Base-Type Factory

### 3.1 TS Encoder (boolean → string)

```
value ? "1" : "0"
```

### 3.2 TS Decoder (string → boolean)

```
encoded === "1" → true, anything else → false
```

### 3.3 C++ Encoder (bool → string)

```cpp
QString value = input ? QStringLiteral("1") : QStringLiteral("0");
```

### 3.4 C++ Decoder (string → bool)

```cpp
bool value = (encoded == QStringLiteral("1"));
```

## 4. Standalone Behavior

When `boolean` is the **entire** service-boundary type (e.g., `Output<boolean>`, `Emitter` parameter of type `boolean`):

- **Emission:** A single 1-character string (`"0"` or `"1"`). This is the **best case** per Codec Design Principles Section 7.1.
- **QWebChannel envelope:** `{"d": "0"}` or `{"d": "1"}`

## 5. Composite Behavior

When `boolean` appears as a field within a structured type, the top-level codec should preserve the same minimal string representation whenever doing so remains the optimal overall strategy. Unlike larger numeric types, booleans do not inherently benefit from byte-level base93 packing: the full value space already fits in a single JSON-safe character.

This means a composite codec may treat booleans as members of the flat string collection rather than forcing them through the byte blob. The decoder still knows the exact field position because the top-level codec was generated from the same type graph.

### 5.1 No Bit Packing

Multiple booleans in the same type-graph are **not** bit-packed. Each boolean remains independently encoded as `"0"` or `"1"`. The CPU cost of introducing bitwise extraction logic outweighs the transport savings for a two-state value that already fits in a single JSON-safe character.

**Example:** A struct `{a: boolean, b: boolean, c: boolean}` can contribute three string items `"0"`/`"1"` to the top-level flat string collection.

## 6. Packing Characteristics

| Property | Value |
|---|---|
| Contributes to base93 blob | **No** |
| Contributes to string collection | **Yes** — one single-character string |
| Fixed-width on wire | **Yes** — always 1 character |
| Can be packed with other numeric types | **Not required** — boolean already has an optimal standalone string form |
| Bit-packed with other booleans | **No** — each boolean stays an independent string |

## 7. Edge Cases

### 7.1 No Truthiness Semantics

The codec operates on the declared boolean value (`true` or `false`), not on JavaScript truthiness. Under the AnQst contract, generated APIs already provide the correct static type, so the codec does not define any separate coercion or validation behavior for `0`, `""`, `null`, or `undefined`. Those are outside the intended contract, not alternate accepted wire semantics.

### 7.2 C++ bool Width

The C++ `bool` type is guaranteed to be at least 1 byte but may be larger on some platforms. The codec does not depend on that storage width because it serializes to the explicit wire strings `"0"` and `"1"`.

## 8. Acceptance Criteria Compliance

| Criterion | Satisfied |
|---|---|
| Best case: single string | **Yes** — standalone boolean → `"0"` or `"1"` |
| Worst case: flat array of strings | **Yes** — in composites, booleans remain string items |
| No subarrays | **Yes** |
| No objects for strongly typed fields | **Yes** |

## 9. C++ Type Correspondence

- C++ type: `bool`
- The generated codec produces a `QString` containing `"0"` or `"1"` for the wire, not a `QJsonValue(bool)`.
- On decode, the `QString` is compared directly to `"1"` to recover `bool`.

## 10. Encoding Rationale

### 10.1 Boolean Uses A Dedicated 1-Character Wire Form

Boolean uses the dedicated raw string values `"0"` and `"1"`.

This is the optimal codec for a two-state value under AnQst's transport rules: it stays string-based, requires no JSON escaping, and avoids unnecessary byte packing plus base93 encode/decode overhead.

### 10.2 Boolean Is Not Emitted as a Bare JSON Boolean

Although `boolean` is JSON-native, Architecture Principles Section 3.4 explicitly states "There is no identity Elision" and requires that the final output of a codec is either a naked string or an array of strings. A bare JSON `true`/`false` value is neither a string nor an array of strings, so booleans still use a codec-specific string form rather than native JSON booleans.
