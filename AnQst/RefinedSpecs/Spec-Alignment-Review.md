# AnQst Spec Alignment Review

Comprehensive cross-referencing of **Prose** (5 files), **DSL** (`AnQst-Spec-DSL.d.ts`), and **Codecs** (32 files).
Each finding has a concrete action: **ADD**, **REMOVE**, **REFINE**, or **RETAIN**.

---

## 1 — Must Fix: Cross-Spec Alignment Errors

These are conflicts between authoritative sources that must be resolved before the specs can be considered aligned.

### 1.1 ~~`boolean` missing from `AnQst.Type` enum~~ RESOLVED — No change needed

**Original concern:** `boolean` has no `AnQst.Type` enum entry while `string` does, appearing asymmetric.

**Resolution:** The `AnQst.Type` enum is not a catalog of all transportable types. It provides advisory mapping directives only for types where the C++ mapping is ambiguous or non-obvious (see the `@remarks` above the enum). `boolean` maps exclusively to `bool` — no alternative C++ mapping exists, so no directive is needed. `string` is in the enum because the C++ target could be `QString` or `std::string` (non-obvious). `number` is included because its mapping to `double` is only obvious upon reflection, and it also disambiguates integer-width alternatives.

**Action — RETAIN** current DSL as-is. `Boolean_boolean_Codec.md` Section 1 updated to explain the rationale rather than framing it as a gap.

---

### 1.2 ~~`ForbiddenType` enum vs Architecture Principles mismatch~~ RESOLVED

**Original concern:** DSL and prose listed different forbidden type sets.

**Resolution:** Both sources now enumerate the same 9 types: `Function`, `Class`, `Type`, `Promise`, `Callable`, `any`, `symbol`, `unknown`, `never`. The supervisor added `symbol`, `unknown`, `never` to the DSL. `Type` and `Callable` were confirmed correct (Type: types are not runtime values; Callable: AnQst requires explicit Service interfaces instead). Architecture Principles §4.3 updated to match and explain `Type`/`Callable` rationale. The canonical list is the `AnQst.ForbiddenType` enum in `AnQst-Spec-DSL.d.ts`.

**Action — RESOLVED.** No further changes needed.

---

### 1.3 ~~Broken cross-references in Opaque Wire Contract §8~~ RESOLVED

**Original concern:** Section 8 referenced `RefinedSpecs/03-Generator-Output-Contracts.md` and `RefinedSpecs/02-Interaction-Semantics.md`, which do not exist.

**Resolution:** References updated to point to their current locations:
- `03-Generator-Output-Contracts.md` → `Prose/AnQst-Architecture-and-Design-Principles.md` Section 5
- `02-Interaction-Semantics.md` → `AnQst-Spec-DSL.d.ts` + `Prose/AnQst-Architecture-and-Design-Principles.md` Section 4

**Action — RESOLVED.** No further changes needed.

---

### 1.4 ~~Void payloads absent from Acceptance Criteria~~ RESOLVED

**Original concern:** `"d": null` for void payloads technically fell outside the three valid emission forms.

**Resolution:** Added a scope statement to Codec Design Principles Section 7 clarifying that the acceptance criteria apply only to non-void payload types. Void payloads carry `null` in the `"d"` value, bypass the codec layer entirely, and are not subject to these criteria.

**Action — RESOLVED.** No further changes needed.

---

## 2 — Should Add: Missing Documentation

### 2.1 ~~Default bare-TypeScript-type mapping table~~ RESOLVED — documented as generator behavior

**Original concern:** Default mappings from bare TS types to C++ types were scattered across individual enum descriptions.

**Resolution:** Added Architecture Principles §3.7 ("Automatic Type Resolution and Universal Codec Requirement") which explains:
- Bare TS types with unambiguous C++ mappings are resolved automatically; `AnQst.Type` directives are only for ambiguous/non-obvious cases.
- Every type that crosses the bridge gets an explicit generated codec — no exceptions.
- Any type-graph containing a non-transportable type makes the entire spec invalid (`anqst build` fails at verification).

A per-type defaults table was deliberately not added to the DSL to avoid encouraging spec authors to write unnecessary `AnQst.Type` directives. The individual codec specs already document each mapping.

**Action — RESOLVED.** No further changes needed.

---

## 3 — "To Be Considered" Items: Resolved (REMOVE or make normative)

The following 18 TBC sections contain their own answers. The recommendation is to remove the "To Be Considered" wrapper and either delete the section (if it merely restates an existing principle) or convert it to a normative statement.

### 3.1 `Boolean_boolean_Codec.md` §10.1 — Single-Character Boolean Encoding

Already recommends: "Use the standard 1-byte → 2-character encoding for uniformity."

**Action — REMOVE** TBC framing. Replace with normative text:

> "Boolean uses the standard 1-byte base93 encoding (2 characters). A single-character special encoding is not used; uniformity with the byte-level encoder outweighs the 1-character saving."

---

### 3.2 `Boolean_boolean_Codec.md` §10.2 — Boolean as a JSON-Native Type

Already explains why base93 is required: bare `true`/`false` is neither a string nor an array of strings, violating acceptance criteria (Codec Design Principles §7) and the no-identity-elision rule (Architecture Principles §3.4).

**Action — REMOVE** TBC framing. The explanation is already normative; it is not an open question.

---

### 3.3 `Binary_typedArray_Codec.md` §11.1 — Element Count vs. Byte Count

Already states: "This is a program error, not a codec concern — it indicates data corruption or a mismatched encoder/decoder, which would violate the build-together convention."

**Action — REMOVE** TBC framing. Convert to a normative edge-case statement under the existing Edge Cases section.

---

### 3.4 `Binary_typedArray_Codec.md` §11.2 — Generator Inference of Concrete Type

Clear answer: when `AnQst.Type.typedArray` is used without a concrete TypedArray subtype in the TS annotation, it is a validation error.

**Action — REMOVE** TBC framing. Make normative:

> "When `AnQst.Type.typedArray` is used, the spec must provide a concrete TypedArray subtype (e.g., `Float32Array`, `Int16Array`) in the TypeScript type annotation. Abstract `TypedArray` is a generation error. Alternatively, the spec author should use the specific `AnQst.Type.<variant>` form."

---

### 3.5 `Dynamic_object_Codec.md` §13.1 — Scope Minimization

Restates Codec Design Principles §9 ("dynamic codec applies only to the smallest possible subset"). Not a question.

**Action — REMOVE** TBC framing. Retain the text as a normative clarification without the "To Be Considered" heading.

---

### 3.6 `Dynamic_object_Codec.md` §13.2 — Generator Validation: Dynamic Is Not a Fallback

Restates Architecture Principles §4.2 (all-or-nothing generation). Not a question.

**Action — REMOVE** TBC framing. Retain as normative clarification.

---

### 3.7 `Dynamic_object_Codec.md` §13.3 — No Runtime Validation of Dynamic Object Content

Restates Architecture Principles §3.5 (no generated diagnostics) and §4.4 (errors signal program bugs). Not a question.

**Action — REMOVE** TBC framing. Retain as normative clarification.

---

### 3.8 `Dynamic_object_Codec.md` §13.4 — Deeply Nested Dynamic Objects

States the obvious consequence of opacity: nested structures are not inspected. Not a question.

**Action — REMOVE** TBC framing. Retain as normative clarification.

---

### 3.9 `Number_number_Codec.md` §10.1 — Rejected Alternative: Decimal String Representation

Already marked "rejected" with full rationale (loses bit-level fidelity, breaks uniform base93 rule, inconsistent architecture).

**Action — REMOVE** TBC framing. Retitle section to "Design Record: Rejected Alternative" — this is a decision record, not an open question.

---

### 3.10 `Binary_buffer_Codec.md` §11.1 — Composite Packing: Concatenation vs. Separate String

Already analyzed and decided: "Strategy A is preferred" (separate base93 string for variable-length binary, separate from numeric blob).

**Action — REMOVE** TBC framing. Convert to normative:

> "Variable-length binary fields occupy their own base93 string in the output array, separate from the numeric blob. Concatenation into the numeric blob is only viable for fixed-size buffers (rare) and should not be added proactively."

---

### 3.11 `String_stringArray_Codec.md` §10.1 — Count Elision for Standalone Payload

Already decided: count-prefix is recommended. The ambiguity analysis (empty-array vs empty-string, one-element array vs naked string) is conclusive.

**Action — REMOVE** TBC framing. The count-prefix strategy in §4.1 is the normative strategy.

---

### 3.12 `String_stringArray_Codec.md` §10.2 — Interaction with Composite String Collection

Already answered within its own text: "The count-prefix strategy (encoding the array length as part of the numeric blob) resolves this cleanly."

**Action — REMOVE** TBC framing. Fold into the composite behavior section (§5).

---

### 3.13 `Structured_TopLevelCodec_Strategy.md` §14.4 — Codec Simplification for All-String Types

Fully explained: all-string types produce a flat array of strings with positional assignment, no base93, no blob. The codec is minimal but still necessary for structural flattening.

**Action — REMOVE** TBC framing. Convert to normative description within the main body.

---

### 3.14 `Structured_TopLevelCodec_Strategy.md` §14.5 — Cyclic Named Types

The previous wording was too strong. A cyclic named-type graph is not automatically non-transportable. What matters is whether the reachable leaf kinds are transportable and whether the generator has a correct runtime traversal strategy for the self-similar shape.

**Action — REFINE** the wording into a normative rule:

> "Cyclic or self-referencing named types are allowed when their reachable leaf values are transportable and the generated codec can traverse runtime instances using the statically-known node layout. The generator must reject only non-transportable reachable leaves or declaration patterns for which it has no correct runtime traversal strategy."

This refined rule should also be reflected in Architecture Principles so the design no longer conflates cyclic named shapes with unsupported transport.

---

### 3.15 `Structured_TopLevelCodec_Strategy.md` §14.6 — Consistency of Byte Blob Field Ordering

Already stated: "the generator must be deterministic" (Architecture Principles §3.2) and any deterministic ordering is valid.

**Action — REMOVE** TBC framing. The text is already normative.

---

### 3.16 `Dynamic_json_Codec.md` §11.1 — Consolidation with `AnQst.Type.object`

Clear recommendation: share a single codec implementation, parameterized by C++ output type.

**Action — REMOVE** TBC framing. Convert to normative:

> "The generator uses a single codec implementation for both `object` and `json`. The implementation is parameterized by the C++ output type (`QVariantMap` vs `QJsonObject`). The wire format is identical."

---

### 3.17 `Dynamic_json_Codec.md` §11.2 — QJsonObject vs QVariantMap Performance

Answered: "For most AnQst use cases (where dynamic types are rare and small), this difference is negligible."

**Action — REMOVE** TBC framing. Convert to a brief normative note:

> "Performance differences between `QJsonObject` and `QVariantMap` are negligible for typical AnQst dynamic payloads. If performance is critical, the spec author should statically type the structure."

---

### 3.18 `Structured_TopLevelCodec_Strategy.md` §7.1 — Enum Encoding for String Unions

Has recommendation: "Use string identity encoding as the default." The trade-off analysis concludes that the wire-size savings are marginal and the complexity cost is real.

**Action — REMOVE** TBC framing. Make normative:

> "String literal unions are transported as native JSON strings (identity encoding). Numeric index encoding is not used. Per Architecture Principles §3.1, simplicity takes priority, and the wire-size savings are marginal for typical union sizes."

---

## 4 — "To Be Considered" Items: Retain for Supervisor

These 4 items have substantive trade-offs that require a design decision from the supervisor.

### 4.1 ~~`Structured_TopLevelCodec_Strategy.md` §14.1 — Optional Field Strategy: Always-Allocate vs. Skip~~ RESOLVED

**Decision:** Skip. Each optional field gets its own full presence byte (`0x01` present, `0x00` absent) — no bit-packing (CPU cost of bitwise extraction exceeds transport cost of extra bytes). When absent, no data bytes are included. Zero is a valid numeric value and must not be confused with absence. The decoder computes offsets dynamically. Always-allocate is rejected. Specs updated: §6.1, §6.3, §14.1. Boolean bit-packing also removed from `Boolean_boolean_Codec.md` §5.1 for the same reason.

**Action — RESOLVED.** No further changes needed.

---

### 4.2 ~~`Structured_TopLevelCodec_Strategy.md` §14.2 — Optional String Fields: Sentinel vs. Skip~~ RESOLVED

**Decision:** Skip with presence bytes. No sentinel or placeholder strings. The decoder uses a running string index, advancing only for present fields. Empty string `""` is a valid domain value and must not be confused with absence. Specs updated: §6.2, §14.2.

**Action — RESOLVED.** No further changes needed.

---

### 4.3 ~~`Structured_TopLevelCodec_Strategy.md` §14.3 — Direction-Aware Codec Generation~~ RESOLVED

**Decision:** SHOULD, not MUST. The generator should omit unused encoder/decoder functions when the direction analysis is straightforward, but is not required to do so if it would introduce significant complexity. Emitting both directions is always correct. Spec updated: §14.3.

**Action — RESOLVED.** No further changes needed.

---

### 4.4 ~~`Number_number_Codec.md` §10.2 — Endianness Across Heterogeneous Deployments~~ RESOLVED

**Decision:** Not a concern. All targets are little-endian, both sides run on the same platform. The spec no longer speculates about big-endian scenarios. §10.2 simplified to a brief normative statement.

**Action — RESOLVED.** No further changes needed.

---

## 5 — Verified Correct: No Action Needed

The following aspects were reviewed and found to be fully aligned, consistent, and complete.

### 5.1 Acceptance criteria wording (Codec Design Principles vs HumanOriginals)

The refined `AnQst-Codec-Design-Principles.md` §7.2 correctly upgraded "array of strings" (from `MissionAndCodecs.md`) to "array of allowed items (strings and, where the type contains explicitly dynamic members, Objects)." This is an improvement, not a conflict.

**Action — RETAIN.** No change needed.

---

### 5.2 `stringArray` dual count-encoding strategy

`String_stringArray_Codec.md` uses two different count-encoding strategies depending on context:
- Standalone (§4.1): base93 positional integer as a separate string element.
- Composite (§5): fixed-width uint32 within the byte blob.

This is explicitly documented as intentional and is justified by the different constraints of each context.

**Action — RETAIN.** No change needed.

---

### 5.3 Architecture Principles §5.2 cross-references

Multiple codec specs reference "Architecture Principles Section 5.2" for "Globally consistent mapping." The actual text is under "5.2 Behavioral Principles for Artifacts" and the referenced paragraph is present. All references are accurate.

**Action — RETAIN.** No change needed.

---

### 5.4 HumanOriginals/MissionAndCodecs.md typos

The human-written source contains typos ("invokation", "delcaration", "frameworkd", "explaination", "explicitely", "vbariable"). All refined prose specs have corrected these. The original is a historical source document.

**Action — RETAIN** the original as-is. The refined versions are correct.

---

### 5.5 Complete codec coverage: all 30 `AnQst.Type` enum members

Every type in the enum has a corresponding codec spec file:

| Category | Count | Types |
|---|---|---|
| Integer (Qt) | 6 | qint8, quint8, qint16, quint16, qint32, quint32 |
| Integer (C++ std) | 6 | int8, uint8, int16, uint16, int32, uint32 |
| BigInt | 2 | qint64, quint64 |
| Number | 1 | number |
| String | 2 | string, stringArray |
| Dynamic | 2 | object, json |
| Binary (general) | 3 | buffer, blob, typedArray |
| Binary (typed arrays) | 8 | uint8Array, int8Array, uint16Array, int16Array, uint32Array, int32Array, float32Array, float64Array |
| **Total** | **30** | |

Plus: `boolean` (has codec spec, no DSL entry — intentionally implicit, see §1.1), `Structured_TopLevelCodec_Strategy.md` (strategy document, not a base type).

**Action — RETAIN.** Coverage is complete.

---

### 5.6 All codec specs self-certify acceptance criteria compliance

Every base-type codec spec includes an "Acceptance Criteria Compliance" section with a checklist. `Structured_TopLevelCodec_Strategy.md` §13 provides the composite-level compliance summary. All pass.

**Action — RETAIN.** No change needed.

---

### 5.7 Internal cross-references between codec specs

Codec specs correctly reference each other:
- All `int*` variants reference their `qint*` counterparts for codec equivalence.
- All TypedArray variants reference `Binary_buffer_Codec.md` for shared behavior.
- `blob` references `buffer` for codec equivalence.
- Packing characteristics, byte widths, and base93 character widths are mathematically consistent across all 32 specs.

**Action — RETAIN.** No change needed.

---

## 6 — Summary Action Matrix

### Must Fix (3 items)

| # | Finding | Action | Scope |
|---|---|---|---|
| ~~1.1~~ | ~~`boolean` missing from `AnQst.Type` enum~~ | ~~RESOLVED~~ — no change needed | — |
| ~~1.2~~ | ~~`ForbiddenType` vs Architecture Principles mismatch~~ | ~~RESOLVED~~ — both aligned (9 types) | — |
| ~~1.3~~ | ~~Broken cross-references in Opaque Wire Contract §8~~ | ~~RESOLVED~~ — references updated | — |
| ~~1.4~~ | ~~Void payloads absent from acceptance criteria~~ | ~~RESOLVED~~ — scope statement added | — |

### Should Add (1 item)

| # | Finding | Action | Scope |
|---|---|---|---|
| ~~2.1~~ | ~~Default bare-TS-type mapping table~~ | ~~RESOLVED~~ — Architecture Principles §3.7 added | — |

### TBC Items to Remove (18 items)

| # | Location | Current TBC | Action |
|---|---|---|---|
| 3.1 | `Boolean_boolean_Codec.md` §10.1 | Single-char encoding | REMOVE — make normative (use standard 2-char) |
| 3.2 | `Boolean_boolean_Codec.md` §10.2 | Boolean as JSON-native | REMOVE — already normative |
| 3.3 | `Binary_typedArray_Codec.md` §11.1 | Element count vs byte count | REMOVE — normative edge case |
| 3.4 | `Binary_typedArray_Codec.md` §11.2 | Generator inference | REMOVE — normative validation rule |
| 3.5 | `Dynamic_object_Codec.md` §13.1 | Scope minimization | REMOVE — restates existing principle |
| 3.6 | `Dynamic_object_Codec.md` §13.2 | Dynamic not a fallback | REMOVE — restates existing principle |
| 3.7 | `Dynamic_object_Codec.md` §13.3 | No runtime validation | REMOVE — restates existing principle |
| 3.8 | `Dynamic_object_Codec.md` §13.4 | Deeply nested objects | REMOVE — restates existing principle |
| 3.9 | `Number_number_Codec.md` §10.1 | Decimal string rejected | REMOVE — already a decision record |
| 3.10 | `Binary_buffer_Codec.md` §11.1 | Concat vs separate | REMOVE — already decided (separate) |
| 3.11 | `String_stringArray_Codec.md` §10.1 | Count elision | REMOVE — already decided (count-prefix) |
| 3.12 | `String_stringArray_Codec.md` §10.2 | Composite interaction | REMOVE — already answered |
| 3.13 | `Structured_TopLevelCodec_Strategy.md` §14.4 | All-string types | REMOVE — already explained |
| 3.14 | `Structured_TopLevelCodec_Strategy.md` §14.5 | Recursive types | REMOVE — reject at validation (add to Architecture Principles) |
| 3.15 | `Structured_TopLevelCodec_Strategy.md` §14.6 | Byte blob ordering | REMOVE — already normative |
| 3.16 | `Dynamic_json_Codec.md` §11.1 | Consolidation with object | REMOVE — share implementation |
| 3.17 | `Dynamic_json_Codec.md` §11.2 | QJsonObject vs QVariantMap perf | REMOVE — negligible |
| 3.18 | `Structured_TopLevelCodec_Strategy.md` §7.1 | Enum encoding for string unions | REMOVE — use identity encoding |

### TBC Items to Retain for Supervisor (4 items)

| # | Location | Decision Needed |
|---|---|---|
| ~~4.1~~ | ~~`Structured_TopLevelCodec_Strategy.md` §14.1~~ | ~~RESOLVED~~ — skip with full presence bytes, no bit-packing |
| ~~4.2~~ | ~~`Structured_TopLevelCodec_Strategy.md` §14.2~~ | ~~RESOLVED~~ — skip with presence bytes, no sentinels |
| ~~4.3~~ | ~~`Structured_TopLevelCodec_Strategy.md` §14.3~~ | ~~RESOLVED~~ — SHOULD, not MUST |
| ~~4.4~~ | ~~`Number_number_Codec.md` §10.2~~ | ~~RESOLVED~~ — not a concern, simplified |

### Verified Correct (7 items)

| # | Aspect | Status |
|---|---|---|
| 5.1 | Acceptance criteria wording upgrade | Correct improvement |
| 5.2 | `stringArray` dual count-encoding | Intentional, documented |
| 5.3 | Architecture Principles §5.2 references | Accurate |
| 5.4 | HumanOriginals typos | Corrected in refined versions |
| 5.5 | Full codec coverage (30/30 enum types) | Complete |
| 5.6 | Acceptance criteria self-certification | All pass |
| 5.7 | Internal codec cross-references | Consistent |
