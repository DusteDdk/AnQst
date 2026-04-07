# AnQst Codec Laws

## 1. Purpose

This document defines a strict, implementation-facing law set for codec work in AnQst.

It is written as a standalone starting point for agents with no prior thread context.

Its job is to remove ambiguity in three areas:

- who owns wire-layout decisions
- when generated code should inline operations versus call helpers
- where runtime error detection is valid versus architecturally incorrect

This document is prescriptive.

---

## 2. Scope

These laws apply to strongly typed service-boundary codec generation in:

- `AnQstGen/src/boundary-codec-analysis.ts`
- `AnQstGen/src/boundary-codec-plan.ts`
- `AnQstGen/src/boundary-codec-render.ts`
- `AnQstGen/src/boundary-codec-leaves.ts`
- generated TS/C++ codec sections emitted through `AnQstGen/src/emit.ts`

These laws do not turn generic bridge-host infrastructure into typed codec owners.
Generic bridge host plumbing remains valid in:

- `AnQstWidget/AnQstWebBase/src/AnQstWebHostBase.*`
- `AnQstWidget/AnQstWebBase/src/AnQstHostBridgeFacade.*`

---

## 3. Required Context For New Agents

AnQst is bridge-first and opaque-wire by design.

- The public contract is generated API surface (types, methods, properties).
- The wire format is not a public contract and may change per build.
- Frontend/backend artifacts are expected to be built and deployed together.

The codec architecture is planner-centric.

- Leaves describe capabilities.
- Structural nodes describe shape/reconstruction obligations.
- Boundary planner chooses concrete layout.
- Emitters project the chosen plan.

Key references:

- `Prose/AnQst-Codec-Planning-and-IR.md`
- `Prose/AnQst-Codec-Design-Principles.md`
- `Prose/AnQst-Opaque-Wire-Contract.md`
- `Prose/AnQst-Architecture-and-Design-Principles.md`
- `Prose/Prime-Directives.md`

---

## 4. Trust Model

For codec laws, distinguish two path classes:

1. Trusted generated boundary path
- generated frontend and generated backend from the same `anqst build` invocation
- strongly typed payload movement between generated peer codecs

2. Untrusted ingress path
- drag/drop MIME payloads
- development WebSocket messages
- any externally supplied payload text/JSON outside generated peer-to-peer codec flow

This distinction is mandatory for deciding runtime validation behavior.

---

## 5. Law Set

### A. Ownership And Planning

1. **Boundary Ownership Law**
- Only the boundary codec plan may define wire layout for a strongly typed service-boundary type.

2. **Leaf Non-Ownership Law**
- Leaves must not own standalone wire contracts.
- Leaves may only contribute capabilities, materialization facts, and placement rendering options.

3. **Structural Non-Ownership Law**
- Non-boundary structs/named nodes are reconstruction guidance, not independent wire codec boundaries.

4. **Plan-First Law**
- Analysis and planning must complete before any target source emission.

5. **Plan Authoritativeness Law**
- Emitters must project a chosen plan.
- Emitters must not invent layout defaults that the plan did not select.

6. **Plan Completeness Law**
- Every runtime-relevant choice must be explicit in IR, including packing, array extent strategy, optional strategy, and lowering mode.

7. **Determinism Law**
- Same input + same generator version must produce byte-identical plan and emitted codec behavior.

### B. Lowering And Helper Strategy

8. **Placement-Driven Lowering Law**
- Leaf lowering choice is per placement and per target language, selected by planner.

9. **Inline-First Law**
- Trivial leaf operations should be emitted as direct inline expressions/statements when this reduces call and indirection overhead.

10. **Helper Admission Law**
- Helper calls are allowed only when they reduce duplication or encapsulate non-trivial logic.

11. **No Monolithic Leaf Emitter Law**
- Leaves must not expose only monolithic `emitEncoder` / `emitDecoder` APIs that presuppose standalone wire position.

12. **Helper Opacity Law**
- Helpers are implementation details and must not imply independent wire ownership.

13. **Specific Emission Law**
- Emitted boundary codecs should look type-specific, not like orchestration of a generic runtime serializer framework.

### C. Error Semantics And Runtime Checks

14. **Trusted-Path Totality Law**
- For trusted generated peers, decode(encode(x)) is a generator invariant, not a recoverable runtime uncertainty.

15. **No Trusted-Path Validation Law**
- Strongly typed generated codec core must not perform runtime integrity/type/version checks on trusted path payloads.

16. **Ingress Validation Law**
- Validation is valid at untrusted ingress edges only, before data enters typed codec core.

17. **Bug Signaling Law**
- Trusted-path decode mismatch is a program/build-pipeline bug and must not be treated as recoverable transport noise.

18. **No Catch-and-Continue Law**
- Generated typed surface code must not catch trusted-path codec failures only to convert them into recoverable diagnostics and continue.

19. **Error Taxonomy Partition Law**
- `DeserializationError` is valid for untrusted ingress parse/shape failures.
- It is not a substitute for trusted-path codec invariant failure handling.

20. **No Runtime Compatibility Negotiation Law**
- Generated artifacts must not implement runtime build/version handshake logic.

### D. Wire And Type Guarantees

21. **No Fallback Law**
- Unsupported strongly typed cases must fail generation; no runtime generic fallback.

22. **Finite-Domain Preservation Law**
- Finite domains must survive analysis into planning so planner can choose representation with closed-world knowledge.

23. **Planner-Owned Packing Law**
- Boolean representation, finite-domain coding, array delimitation, and metadata grouping are planner decisions, not fixed renderer defaults.

24. **Flattening Law**
- One comprehensive codec per service-boundary type; nested non-boundary nodes must be absorbed, not emitted as standalone wire payloads.

25. **Opaque-Wire Compliance Law**
- Generated public APIs must remain transport-agnostic; codec/wire mechanics stay internal.

### E. Process And Verification

26. **All-Or-Nothing Generation Law**
- If coherent codec planning is impossible, generation must fail with actionable diagnostics.

27. **Plan Inspectability Law**
- Boundary analysis and boundary plan artifacts must remain inspectable before emission.

28. **Conformance-Test Law**
- Tests must assert law compliance on both IR and emitted code, including absence of forbidden trusted-path checks.

---

## 6. Immediate Tasking Guidance For New Agents

When assigned codec work:

1. Identify whether task affects analysis, plan IR, renderer, runtime support, or ingress adapters.
2. Classify each touched path as trusted generated path or untrusted ingress path.
3. Ensure planning owns every new behavior choice before changing emitter output.
4. Decide lowering mode per leaf placement (`inline` vs helper) by law, not habit.
5. Remove or avoid trusted-path runtime checks and catch-and-continue patterns in generated typed codec flow.
6. Keep ingress validation at ingress boundaries only.
7. Add/adjust tests proving the change at IR and emitted-source level.

---

## 7. Minimum Acceptance Checklist

A codec change is not complete unless all items pass:

- Plan IR contains explicit fields for the new behavior decision.
- Emitters only consume those plan fields; no hidden layout defaults.
- Generated codec output follows inline/helper law for affected leaves.
- Trusted-path generated typed codec flow has no newly introduced runtime shape/integrity guards.
- Untrusted ingress paths still validate payload envelopes and report diagnostics.
- Existing deterministic output expectations and boundary-plan debug artifacts remain stable.
- Tests cover both success path and law-protected failure path.

---

## 8. Conflict Handling

If any existing file appears to conflict with these laws:

1. treat this as a spec-alignment task, not an implementation shortcut
2. document the exact conflict with file+line references
3. resolve by keeping planner ownership, trusted-path totality, and no-fallback behavior intact

Do not silently reintroduce generic codec behavior, runtime fallback checks, or helper-heavy abstraction drift.

