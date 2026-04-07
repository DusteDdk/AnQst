# AnQst Base-Type Codec: `AnQst.Type.string`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.string` |
| TypeScript type | `string` |
| C++ type | `QString` |
| Codec classification | **Identity** — no transform required |
| Byte width | Variable (UTF-16 internally, UTF-8 on wire via JSON) |

## 2. Wire Representation

A string value is emitted as a **native JSON string**. No encoding, no base93, no transformation. The value passes through the JSON serializer/deserializer unchanged.

This follows directly from AnQst Codec Design Principles Section 4:
> "Strings are never base93-encoded. Strings are always emitted as native JSON strings — either as a naked value (when the type contains only one string) or as a member of a flat string array (when the type-graph contains multiple strings)."

## 3. Base-Type Factory

### 3.1 Encoder

**Identity.** The base-type factory for `string` is the identity function — the string value is already a string, which is the required codec output form per Architecture Principles Section 3.4. No transform-specific helper is required at the leaf level. This follows directly from Codec Design Principles Section 4: "Strings are never base93-encoded. Strings are always emitted as native JSON strings."

- **TS encode:** The string value is used as-is. No function call.
- **C++ encode:** The `QString` value is placed into the `QJsonValue` as-is (`QJsonValue(qstr)`). No function call.

### 3.2 Decoder

**Identity.** The string is extracted directly.

- **TS decode:** The string value from the wire is the domain value. No function call.
- **C++ decode:** `variant.toString()` extracts the `QString`. This is Qt's standard QVariant-to-QString conversion, not a generated codec function.

## 4. Standalone Behavior

When `string` is the **entire** service-boundary type (e.g., `Output<string>`, `Call<string>`, a method parameter of type `string`):

- **Emission:** A single naked JSON string. This is the **best case** per Codec Design Principles Section 7.1.
- **QWebChannel envelope:** `{"d": "the string value"}`
- **No transform-specific string helper is needed.** The value passes through unchanged, while the surrounding top-level codec still decides whether it is emitted naked or placed at a particular position in the flat output array.
- **No base93 involvement.** The string is already in the optimal wire form.

## 5. Composite Behavior

When `string` appears as a field within a structured type at the service boundary:

- The string value is **collected** into the flat string array alongside all other strings from the type-graph (Codec Design Principles Section 5.2).
- Its position in the flat array is determined at generation time. Both encoder and decoder know the position by construction.
- The string is not transformed, wrapped, or prefixed. It is a direct element of the output array.

**Example:** A struct `{name: string, title: string, age: number}` at the service boundary would produce an emission like `["<base93_age>", "Alice", "My Title"]` — the two strings are array elements alongside the base93-encoded numeric blob. The order is determined by the codec's packing strategy (Codec Design Principles Section 5.3), not by the struct's declaration order.

## 6. Packing Characteristics

| Property | Value |
|---|---|
| Contributes to base93 blob | **No** |
| Contributes to string collection | **Yes** |
| Fixed-width on wire | **No** (variable-length UTF-8) |
| Can be packed with other types | **No** — strings are always separate items in the output array |

Strings occupy their own positions in the flat output array and cannot be merged with other values. This is by design: strings are native JSON values and gain nothing from additional encoding.

## 7. Edge Cases

### 7.1 Empty String

An empty string `""` is a valid value. It is emitted as-is: `""`. When used standalone, the emission is `{"d": ""}`. The decoder receives an empty string and produces an empty string. No ambiguity.

### 7.2 Strings Containing Base93 Characters

Since the decoder knows whether a given position in the output is a native string or a base93 blob (by construction, not by inspection), there is no ambiguity if a user's string happens to contain characters from the base93 alphabet. The decoder never attempts to base93-decode a native string.

### 7.3 Unicode Content

JSON natively supports Unicode via UTF-8 encoding. No special handling is required for strings containing non-ASCII characters, emoji, or supplementary plane codepoints. The JSON serializer/deserializer on both sides (JavaScript's `JSON.stringify`/`JSON.parse` and Qt's `QJsonDocument`) handle Unicode correctly.

### 7.4 Strings Containing JSON-Special Characters

Characters like `"`, `\`, and control characters are escaped by the JSON serializer automatically. This is transparent to the codec — the codec operates on the deserialized string value, not on the raw JSON text.

## 8. Acceptance Criteria Compliance

| Criterion | Satisfied |
|---|---|
| Best case: single string | **Yes** — standalone string emits as a naked JSON string |
| Worst case: flat array of strings | **Yes** — in composite types, strings are elements of the flat array |
| No subarrays | **Yes** — strings are atomic values, never arrays |
| No objects for strongly typed fields | **Yes** — string is emitted as a string, never an object |

## 9. C++ Type Correspondence

The `QString` ↔ `string` mapping is globally consistent (Architecture Principles Section 5.2: "Globally consistent mapping"). This applies regardless of whether the string appears as a method parameter, return value, property, or nested struct field.

- `QVariant` wrapping: `QVariant::fromValue(QString)` or implicit `QVariant(qstr)`
- `QVariant` extraction: `.toString()`
- `QJsonValue` wrapping: `QJsonValue(qstr)`
- `QJsonValue` extraction: `.toString()`
