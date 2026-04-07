# AnQst Base-Type Codec: `AnQst.Type.json`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.json` |
| TypeScript type | `object` (opaque JavaScript object) |
| C++ type | `QJsonObject` |
| Codec classification | **Dynamic pass-through** — JSON Object emitted as-is |
| Byte width | Variable |

## 2. Wire Representation

Identical to `AnQst.Type.object` at the wire level: a **native JSON Object** emitted as-is. No transformation, no base93, no structural flattening.

The `json` type exists as a distinct AnQst.Type member to provide a C++ API preference: the generated C++ code exposes the field as `QJsonObject` rather than `QVariantMap`. On the wire, both produce and consume identical JSON Objects.

## 3. Base-Type Factory

### 3.1 Encoder

**Identity.** Same as `Dynamic_object_Codec.md` Section 4.1.

- **TS encode:** The object value is used directly. No encoding function.
- **C++ encode:** `QJsonObject` is already a JSON-native Qt type. It is placed directly into the `QJsonValue`: `QJsonValue(jsonObj)`.

### 3.2 Decoder

**Identity.**

- **TS decode:** The parsed JSON object is the domain value. No decoding function.
- **C++ decode:** `QJsonValue::toObject()` → `QJsonObject`. No intermediate conversion through `QVariantMap` — this is more direct than the `object` type's decode path.

## 4. Standalone Behavior

When `json` is the **entire** service-boundary type:

- **Emission:** A single JSON Object. Valid per Codec Design Principles Section 7.4 (exception for fully dynamic types).
- **QWebChannel envelope:** `{"d": { ... the json object ... }}`

## 5. Composite Behavior

When `json` appears as a field within a structured type:

- The JSON Object occupies one position in the flat output array as an Object-typed item.
- Identical behavior to `AnQst.Type.object` in composite context. See `Dynamic_object_Codec.md` Section 6.

## 6. Constraint: Only JSON-Native Members

Same constraint as `AnQst.Type.object`. See `Dynamic_object_Codec.md` Section 7. Since the value is transported as a JSON Object, all nested content must be JSON-representable.

## 7. Difference from `AnQst.Type.object`

| Aspect | `AnQst.Type.object` | `AnQst.Type.json` |
|---|---|---|
| Wire format | JSON Object | JSON Object (identical) |
| TS type | `object` | `object` (identical) |
| C++ type | `QVariantMap` | `QJsonObject` |
| C++ encode path | `QJsonObject::fromVariantMap(map)` | Direct `QJsonValue(jsonObj)` |
| C++ decode path | `.toObject().toVariantMap()` | `.toObject()` |
| Semantic intent | Generic variant container | JSON-specific container |

### 7.1 When to Use Which

- **`AnQst.Type.object`:** When the C++ code interacts with the data through Qt's `QVariantMap` API (e.g., iterating with `QMap` methods, using `.value()` with type conversion). `QVariantMap` is more natural for C++ code that treats the data as a property bag.
- **`AnQst.Type.json`:** When the C++ code interacts with the data through Qt's JSON API (e.g., serializing to JSON text, nesting within larger JSON documents, using `QJsonObject::contains()` / `QJsonObject::value()`). `QJsonObject` is more natural for C++ code that treats the data as a JSON document.

This is a C++ API preference, not a codec difference. The wire representation and JavaScript behavior are identical.

## 8. Packing Characteristics

Same as `Dynamic_object_Codec.md` Section 9. The Object is an opaque item in the output array.

## 9. Acceptance Criteria Compliance

Same as `Dynamic_object_Codec.md` Section 10. Object emission is valid for explicitly dynamic types.

## 10. C++ Type Correspondence

- C++ type: `QJsonObject`
- `QVariant` wrapping: `QVariant::fromValue(QJsonObject)` or `QVariant(QJsonValue(jsonObj))`
- `QVariant` extraction: `QJsonObject::fromVariantMap(variant.toMap())` or via `QJsonValue`
- `QJsonValue` wrapping: `QJsonValue(jsonObj)` — direct, no conversion needed
- `QJsonValue` extraction: `.toObject()` — direct, no conversion needed

The `json` type has a **simpler C++ codec path** than `object` because `QJsonObject` is directly interoperable with `QJsonValue` without an intermediate `QVariantMap` conversion.

## 11. Implementation Notes

### 11.1 Consolidation with `AnQst.Type.object`

Since `object` and `json` are identical on the wire and differ only in the C++ type, the generator uses a single codec implementation for both, parameterized by the C++ output type. This reduces generator complexity without affecting generated output quality. The base-type factory is identity in both cases; only the C++ type declarations and QVariant/QJson conversion calls differ.

### 11.2 QJsonObject vs QVariantMap Performance

`QJsonObject` stores data in a binary JSON format internally and may have different performance characteristics than `QVariantMap` for large dynamic objects. For typical AnQst use cases, where dynamic payloads are rare and small, this difference is negligible. If performance is critical for a given payload, the preferred remedy is to statically type more of the structure so the specialized codec system can optimize it.
