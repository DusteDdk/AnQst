# AnQst Base-Type Codec: `AnQst.Type.object`

## 1. Type Identity

| Property | Value |
|---|---|
| DSL name | `AnQst.Type.object` |
| TypeScript type | `object` (opaque JavaScript object) |
| C++ type | `QVariantMap` |
| Codec classification | **Dynamic pass-through** — JSON Object emitted as-is |
| Byte width | Variable |

## 2. Wire Representation

An `object` value is emitted as a **native JSON Object**. No transformation, no base93, no structural flattening. The value passes through `JSON.stringify`/`JSON.parse` unchanged.

This is the **only** base type (along with `json`) for which Object emission is valid. Per Codec Design Principles Section 7.4:
> "Where the AnQst-Spec explicitly specifies a truly dynamic type (`AnQst.Type.object`, `AnQst.Type.json`), an Object containing only allowed members may be emitted."

And Section 9:
> "An Object emission is allowed ONLY when it is the fastest and cleanest transport for a truly dynamic type. It is never a fallback for types that the generator does not know how to handle."

## 3. Nature of Dynamic Types in AnQst

Dynamic types are **rare and exceptional** (Codec Design Principles Section 9). They represent cases where the spec author intentionally declares that the structure is not statically known — for example, user-defined metadata, plugin configuration, or schema-free data blobs.

The generator does **not** treat `AnQst.Type.object` as a general-purpose container. It is a deliberate declaration: "this field carries opaque data whose shape I do not wish to define in the spec." The generator validates that this declaration is intentional and does not allow it as a fallback for types that could be statically typed.

## 4. Base-Type Factory

### 4.1 Encoder

**Identity.** The JavaScript object is emitted as-is into the JSON serialization. No encoding function is generated.

- **TS encode:** The object value is used directly. `JSON.stringify` handles it.
- **C++ encode:** The `QVariantMap` is converted to a `QJsonObject` via Qt's standard `QJsonObject::fromVariantMap()`.

### 4.2 Decoder

**Identity.** The received JSON Object is the domain value.

- **TS decode:** The parsed JSON object is the domain value. No decoding function.
- **C++ decode:** `QJsonValue::toObject()` → `QJsonObject::toVariantMap()` → `QVariantMap`.

## 5. Standalone Behavior

When `object` is the **entire** service-boundary type (e.g., `Call<AnQst.Type.object>`):

- **Emission:** A single JSON Object. This is the **exception case** per Codec Design Principles Section 7.4.
- **QWebChannel envelope:** `{"d": { ... the object ... }}`
- This is valid **only** because the entire type is explicitly declared as dynamic.

## 6. Composite Behavior

When `object` appears as a **field** within a structured type:

- The dynamic object is emitted as a **member of the flat output array** (Codec Design Principles Section 7.4: "a member of the array").
- The object occupies one position in the array alongside string values (base93 blobs and native strings).
- The decoder knows which array position contains the dynamic object by construction.

**Example:** A struct `{name: string, metadata: AnQst.Type.object, age: number}`:
- `age` → base93 blob (1 string)
- `name` → native string (1 string)
- `metadata` → JSON Object (1 object in the array)
- Emission: `["<base93_age>", "Alice", {"key": "value"}]` — flat array of strings and one Object. Valid per Section 7.2.

## 7. Constraint: Only JSON-Native Members

Per Codec Design Principles Section 7.5:
> "The AnQst-Spec-DSL must not allow declaration of non-JSON-native types as members of truly dynamic types."

Since `object` is transported as-is via JSON, its contents must be JSON-representable:
- `string`, `number`, `boolean`, `null` — valid
- Nested objects and arrays of the above — valid
- `bigint` — **invalid** (not JSON-native, `JSON.stringify` throws)
- `ArrayBuffer`, `TypedArray` — **invalid** (not JSON-native)
- `undefined` — silently dropped by `JSON.stringify` (allowed but may cause data loss)
- `Date`, `RegExp`, `Map`, `Set`, `Function` — **invalid** (no meaningful JSON representation)

The generator validates this constraint at spec-validation time. If a dynamic type is declared with members that would require codec transformation (e.g., `bigint`), this is a generation error, not a silent fallback.

## 8. No Structural Optimization

The codec does **not** attempt to optimize the internal structure of dynamic objects:
- No field reordering
- No string collection from within the object
- No base93 encoding of numeric fields within the object
- No flattening of nested structures

This is by design: the generator has no static knowledge of the object's shape, so it cannot apply any of the specialized optimizations that depend on static type-graph knowledge. The object is treated as an opaque JSON blob.

## 9. Packing Characteristics

| Property | Value |
|---|---|
| Contributes to base93 blob | **No** |
| Contributes to string collection | **No** |
| Fixed-width on wire | **No** — variable (JSON Object) |
| Can be packed with other types | **No** — occupies its own position as an Object in the array |

## 10. Acceptance Criteria Compliance

| Criterion | Satisfied |
|---|---|
| Best case: single string | N/A — dynamic types use the Object exception |
| Exception: single Object for fully dynamic type | **Yes** — standalone object emits as Object |
| Worst case: flat array of allowed items | **Yes** — in composites, the Object is an array member |
| No subarrays | **Yes** — the object is a single JSON Object, not an array |
| Objects only for dynamic types | **Yes** — `object` is explicitly dynamic in the DSL |

## 11. C++ Type Correspondence

- C++ type: `QVariantMap`
- `QVariant` wrapping: `QVariant::fromValue(QVariantMap)`
- `QVariant` extraction: `.toMap()`
- `QJsonValue` wrapping: `QJsonValue(QJsonObject::fromVariantMap(map))`
- `QJsonValue` extraction: `.toObject().toVariantMap()`

## 12. Difference from `AnQst.Type.json`

See `Dynamic_json_Codec.md`. Both `object` and `json` are dynamic types with Object emission. The distinction is the C++ type:
- `object` → `QVariantMap` (Qt's generic variant container)
- `json` → `QJsonObject` (Qt's JSON-specific container)

At the wire level, both produce identical JSON Objects. The difference affects only the C++ API surface and the QVariant conversion path. See `Dynamic_json_Codec.md` Section 7 for the detailed comparison.

## 13. Normative Clarifications

### 13.1 Scope Minimization

Codec Design Principles Section 9 emphasizes that dynamic codecs apply to the "smallest possible subset." When a struct has one `AnQst.Type.object` member among many statically-typed members, only that one member uses the dynamic (pass-through) codec. The other members use their specialized base-type codecs and are packed into the base93 blob / string collection as usual.

The top-level codec must not "infect" the entire struct with dynamic treatment because one field is dynamic. The dynamic field is simply an Object-typed item at a known position in the output array, surrounded by optimized base93 strings and collected native strings.

### 13.2 Generator Validation: Dynamic Is Not a Fallback

Per Architecture Principles Section 4.2 (All-or-Nothing Generation): "The generator never does 'best effort' conversion or generation." If a type cannot be statically handled, the generator must fail — it must not silently degrade the type to `AnQst.Type.object` or `AnQst.Type.json`. The dynamic designation is only valid when the spec author explicitly writes it. The generator must verify that every use of `AnQst.Type.object` or `AnQst.Type.json` is an intentional declaration, not a fallback for an unrecognized type. In practice, this means: if the generator encounters a type it cannot statically handle (which should never happen since all `AnQst.Type` members are supported), it must produce a generation error with a detailed diagnostic (Architecture Principles Section 4.2), never a silent downgrade to dynamic.

### 13.3 No Runtime Validation of Dynamic Object Content

The codec does not validate the contents of dynamic objects at runtime. If the JavaScript code places a non-JSON-serializable value inside the object (e.g., a function, a circular reference), the failure occurs at `JSON.stringify` time as a standard JavaScript error, not as an AnQst diagnostic. This is consistent with Architecture Principles Section 3.5 (no generated diagnostics) and Section 4.4 (errors signal program bugs).

### 13.4 Deeply Nested Dynamic Objects

A dynamic object may itself contain nested objects, arrays, and deeply nested structures. None of these are inspected, validated, or transformed by the codec. The entire object is a single opaque JSON blob. If the spec author needs type safety for the nested structure, they should define the structure as a static type in the spec rather than using `AnQst.Type.object`.
