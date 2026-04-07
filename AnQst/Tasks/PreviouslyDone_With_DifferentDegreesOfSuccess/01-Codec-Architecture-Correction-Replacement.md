# AnQst Codec Architecture Correction and Replacement Plan

## 1. Purpose

This document instructs the implementation agent how to replace the current codec-generation architecture with one that fully adheres to AnQst's design principles.

This document is prescriptive. It is not a discussion of options. It defines the required approach for correcting the existing implementation.

It must be read together with:

- `AnQst-Codec-Design-Principles.md`
- `AnQst-Opaque-Wire-Contract.md`
- `AnQst-Architecture-and-Design-Principles.md`
- `AnQst-Mission-and-Philosophy.md`
- `AnQst-Codec-Planning-and-IR.md`

If the current code conflicts with these documents, the code must change. The documents define the architecture. Existing code does not. The generator is required to plan codecs before emission, produce one comprehensive codec per service-boundary type, treat the wire as opaque and unstable, and use that freedom to generate the most specialized and efficient codec that can be derived from the full reachable type graph.

The governing interpretation is bridge-first, not wire-first.

The implementation target is the strongly typed bridge between JS/V8 and C++/Qt runtimes. The JSON/QWebChannel carrier is a hard transport constraint on the final top-level output, not the primary architectural product.

---

## 2. Mission

The goal is not to "improve" the current codec system incrementally.

The goal is to replace the existing codec-generation architecture wherever necessary so that it becomes a true whole-boundary codec planner followed by emission from a chosen plan.

The corrected system must satisfy all of the following:

- Leaf codec modules describe transport capabilities and target materialization, not standalone structured codecs.
- Non-leaf nodes contribute structural guidance, not independent wire formats.
- Each service-boundary type is planned as a whole before any encode/decode source is emitted.
- Emission is the final projection of the chosen whole-boundary plan.
- No generated strongly typed codec behaves like a runtime framework, generic parser, descriptor interpreter, generic serializer, or composition of reusable sub-codecs.
- The wire format remains fully under generator control and may change completely as required.
- The planner must exploit total static knowledge to minimize runtime encode/decode cost first, and wire size second where that does not materially worsen runtime cost.
- A result that is merely "architecturally cleaner" but still leaves obvious specialization opportunities unused is not an acceptable end state.
- Generated public target-language types must preserve finite domains when feasible instead of widening them away before or during planning.

---

## 3. Non-Negotiable Rules

### 3.1 No Phased Migration

Do not design a phased rollout.

Do not propose or implement a temporary hybrid architecture in which the old codec-emitter model and the new planner model coexist as first-class strategies for strongly typed codecs.

Do not preserve the old architecture behind feature flags, compatibility modes, fallback planners, or transitional code paths, except where a very small temporary internal scaffold is strictly necessary to complete the replacement in one uninterrupted line of work and is removed before completion.

The target state is the only supported state.

### 3.2 No Backward Compatibility

Do not preserve backward compatibility with the current internal codec architecture.

Do not preserve old generated internal codec function shapes, helper APIs, wire layouts, planner interfaces, or emitter contracts merely because code already exists.

Do not attempt to preserve compatibility with previously generated wire formats. That would directly contradict the opaque wire contract, which explicitly excludes wire representation, internal codec functions and payload shape from stability guarantees.

### 3.3 No Compatibility Layer

Do not build an adapter layer whose purpose is to let old codec emitters continue to function under the new architecture.

Do not wrap old `emitEncoder()` / `emitDecoder()` style modules in thin planning facades and call that a correction.

If a module fundamentally expresses the wrong abstraction boundary, rewrite or replace it.

### 3.4 No Generic Fallback

If the new planner cannot produce a coherent whole-boundary plan for a strongly typed boundary type, generation must fail with a detailed diagnostic.

The system must never silently fall back to:

- generic JSON conversion
- per-struct sub-codec composition
- generic object transport
- runtime descriptor interpretation
- generic "serialize anything" helpers
- preserving old code because the new path was hard to finish

This follows AnQst's all-or-nothing generation principle.

### 3.5 No Under-Specialized Completion

Do not stop once the code is merely "planner-shaped".

The replacement is not complete if the new architecture still emits code that is obviously more generic, more compute-intensive, or less compact than the full static type knowledge allows.

The implementing agent must treat the following as required planner-owned decisions whenever the type graph makes them knowable:

- whether a finite-domain value should remain a generic string/number/bool or be represented as a smaller explicit code
- whether booleans should be byte-packed, bit-packed, or otherwise represented
- whether arrays actually need explicit count metadata, or may consume the tail or infer length from the chosen layout
- whether optional-presence metadata should be grouped or packed
- whether binary values should be emitted separately or grouped into a shared binary strategy
- whether field order, decode order, and region order should differ from declaration order for better runtime behaviour or tighter wire size
- whether a trivial boundary type should emit direct straight-line code rather than a generic helper/cursor framework

If the planner does not own and resolve these choices, the architecture correction is incomplete.

---

## 4. Required End State

The corrected architecture must contain the following conceptual stages.

### 4.1 Type Graph

The resolved logical type graph reachable from each service-boundary type.

This already exists in AnQst's architecture and must remain separate from emission.

### 4.2 Transport Analysis

A representation derived from the type graph that records transport-relevant facts, not source code.

This stage must describe, at minimum:

- leaf versus structural node kind
- fixed-width versus variable-width behaviour
- whether a leaf may consume the tail
- whether a leaf may be grouped into a shared region
- whether a leaf may be bit-packed, byte-packed, text-packed, or binary-packed
- whether repeated structures require count metadata
- whether a value is finite-domain and therefore eligible for explicit compact coding rather than generic widening
- target-language materialization facts
- reconstruction obligations

This stage must not contain emitted TS or C++ code.

### 4.3 Whole-Boundary Codec Plan

For each service-boundary type, a complete plan must be produced before emission.

The plan must be allowed to:

- reorder fields
- flatten nested structures
- group fixed-width leaves
- move the only variable-length value to the end
- separate counts from payloads
- group string-like values
- group binary values
- preserve finite-domain identity instead of widening it away before planning
- choose explicit compact encodings for finite-domain values
- omit unnecessary counts when the chosen layout already determines the repeated extent
- pack optional-presence or boolean metadata more tightly where possible
- flatten repeated descendants
- choose one or more wire regions
- choose decode order independently of source declaration order

This is required by the existing architecture and opaque wire contract.

### 4.4 Target Emission

Only after the plan exists may TypeScript, C++, or other target code be emitted.

The emitter must render a chosen plan.

The emitter must not be the place where the wire-layout decision is invented.

---

## 5. Interpretation of Existing Codec Modules

The current codec module catalogue must be reinterpreted as a catalogue of leaf transport participants and exceptional dynamic participants, not as a catalogue of standalone structured codec emitters.

This includes categories such as:

- integer and bigint leaves
- boolean
- number
- string
- string array if retained as a leaf-level transport participant rather than a structured boundary codec
- binary/blob/buffer/typed-array leaves
- explicitly dynamic object/json participants
- shared low-level helpers where still useful

Their role in the corrected architecture is:

- describe capabilities
- contribute analysis
- provide target materialization rules
- render chosen placements

Their role is not:

- owning standalone wire contracts for structured types
- dictating whole-boundary layout
- composing structured codecs recursively
- exposing monolithic codec-emitter APIs as the primary abstraction

---

## 6. What the Agent Must First Prove About the Existing Code

Before making code changes, the agent must identify and document exactly where the current implementation violates the intended architecture.

This analysis must be explicit, file-by-file and responsibility-by-responsibility.

At minimum, the agent must identify:

### 6.1 Early Emission Boundaries

Where source code emission happens before whole-boundary layout planning.

### 6.2 Wrong Abstraction Ownership

Where leaf modules, shared emitters, or structural helpers currently own decisions that should belong only to the boundary planner.

### 6.3 Hidden Runtime Framework Behaviour

Where generated code still resembles a generic runtime codec system rather than a concretised boundary-specific plan.

Examples include:

- generic cursor walkers
- generic read/write helper fleets emitted independent of actual need
- descriptor-driven decode orchestration
- reusable sub-codecs for non-boundary structures
- emitted helper banks that imply a runtime serialization library rather than direct code for the chosen type
- emitted code that obviously widens finite-domain values into larger runtime or wire representations without planner justification

### 6.4 Missed Specialization Opportunities

Where the implementation discards or ignores static knowledge that should enable a more optimal codec plan.

Examples include:

- literal unions being widened to generic string/number/bool too early
- arrays always receiving count metadata even when the layout can infer extent
- optional flags always consuming full bytes when the planner could group them
- booleans always using a fixed representation despite multiple supported packings
- binary leaves being emitted as one-value-per-region-item despite shared grouping being possible
- trivial leaf-only boundary types still emitting generic helper/cursor scaffolding

### 6.5 Structural Identity Leakage

Where non-boundary structs retain independent wire identities, nested arrays, or nested codec outputs contrary to the one-codec-per-boundary principle.

### 6.6 Transitional Temptations

Where the current implementation invites a hybrid migration strategy. These places must be called out explicitly so they can be avoided.

The output of this analysis must be a written architectural gap report, not only code comments.

---

## 7. Required Refactor Strategy

The agent must plan the refactor as a replacement of architectural boundaries, not as a sequence of local patches.

The work must be organised in the following order.

### 7.1 Define the New Internal IR and Contracts First

Before changing emitters, define the internal shapes that the corrected system will use.

At minimum this must include:

- a leaf capability description
- a structural-node analysis description
- a boundary codec plan representation
- a target placement/rendering contract

The boundary codec plan representation must be rich enough to express actual chosen optimization decisions, not merely region membership.

It must be able to represent, where relevant:

- selected packing strategy
- selected finite-domain representation
- selected count strategy
- selected tail-consumption strategy
- selected metadata packing strategy
- selected reconstruction order

The agent must not begin by editing existing emitter functions in place without first fixing the internal architecture they are supposed to serve.

### 7.2 Build the Planner Before Rewriting Emission

The planner must exist first.

It must be capable of producing a concrete whole-boundary plan from a resolved type graph and leaf/structural descriptions.

That plan must be optimization-capable, not only structurally descriptive.

It is not sufficient for the planner to say only that a value belongs to "blob", "string", "binary", or "dynamic". It must carry the decisions that make the emitted code optimal for that exact boundary type.

Only once the planner exists should emission be rewritten to render that plan.

### 7.3 Rewrite Leaf Modules to Describe Capabilities

Existing leaf codec generators must be rewritten from code-first emitters into capability-first participants.

A leaf module may still contain rendering code, but rendering must be selected by the chosen placement, not exposed as the module's primary identity.

### 7.4 Remove Structured Sub-Codec Assumptions

Any code that assumes nested structs, arrays, or other non-boundary nodes emit their own standalone codec outputs must be removed or rewritten.

### 7.5 Rewrite Emission to Render Plans

The new emitters must operate from the boundary codec plan and generate code that looks specific to the boundary type being transported.

The emitted code should look like the result of a resolved plan, not orchestration over a generic framework.

Where the plan has resolved a trivial or highly specialized case, the emitted code must look trivial or highly specialized as well. The emitter must not reintroduce a generic helper framework merely because that is easier to render.

### 7.6 Delete Invalid Architecture, Do Not Preserve It

Once the replacement path works, delete superseded code.

Do not leave the old architecture around "just in case".

Do not leave dead transitional APIs that preserve the previous mental model.

---

## 8. Constraints on the Agent's Planning

### 8.1 The Agent Must Prefer Architectural Correctness Over Local Reuse

Reusing existing code is permitted only where that code already matches the new abstraction boundary.

The existence of code is not a reason to keep a bad abstraction.

### 8.2 The Agent Must Prefer Explicitness Over Cleverness

The new internal plan and IR must be easy to inspect and reason about.

The generator may be compute-heavy if that produces better generated output. This is already an established AnQst principle. 

The generator should spend complexity at generation time to remove avoidable work from runtime. If a more expensive planner produces materially faster emitted codecs, that is the preferred trade.

### 8.3 The Agent Must Preserve Stable Public Artifacts, Not Internal Shapes

The stable contract is the generated public API and DSL surface, not the internal codec architecture or wire format. The refactor may therefore radically change internal codec planning and emitted wire representation without violating AnQst's guarantees.

### 8.4 The Agent Must Not Introduce Runtime Reflection

The corrected implementation must not reintroduce runtime `typeof`, `instanceof`, type discovery, capability negotiation, version exchange, or any runtime structural interpretation that the planner could have resolved at generation time.

### 8.5 The Agent Must Distinguish Generic Hosting From Generic Codec Behavior

Generic bridge hosting is acceptable where it belongs:

- QWebChannel plumbing
- host bridge facades
- `QVariant` and `QVariantList` transport surfaces
- registration and dispatch infrastructure

Generic codec behavior is not acceptable for strongly typed boundaries.

The corrected implementation must not hide boundary-specific layout decisions behind descriptor interpreters, reusable runtime codec frameworks, or generic serializer helpers merely because the outer bridge host is generic.

---

## 9. Deliverables the Agent Must Produce

The implementation agent must produce all of the following.

### 9.1 Architectural Gap Report

A document describing:

- the current architecture
- the target architecture
- every major mismatch
- which files/modules own the mismatch
- which old assumptions must be removed

### 9.2 New Internal Codec-Planning Design

A document or code-level design for:

- leaf capability descriptors
- structural analysis nodes
- boundary codec plan IR
- rendering contracts

### 9.3 Refactor Execution Plan

A concrete execution plan that names the code areas to change, in dependency order, from architecture-first to emission-last.

This plan must describe replacement, not phased coexistence.

### 9.4 Actual Code Changes

The codebase must be changed accordingly.

### 9.5 Deletion Report

A short list of removed obsolete components, transitional abstractions and old-emitter assumptions, proving that the old architecture was not quietly preserved.

### 9.6 Validation Evidence

Evidence that the new system now produces:

- whole-boundary plans before emission
- no structured sub-codecs for non-boundary nodes
- no generic fallback
- no nested array emissions for strongly typed sub-codecs
- emitted code that is visibly boundary-specific rather than framework-like
- emitted code that does not leave obvious runtime or representation optimizations on the table when the type graph made those optimizations statically knowable
- generated public target-language types that preserve finite domains where the implementation declares that preservation feasible

---

## 10. Validation Criteria for Completion

The work is complete only when all of the following are true.

### 10.1 Planning Precedes Emission

It is possible to inspect a boundary type's plan before any TS or C++ source is emitted.

### 10.2 Leaf Modules No Longer Dictate Layout

Leaf modules expose capabilities and rendering hooks, but the root planner owns placement and layout.

### 10.3 Structured Non-Boundary Nodes Do Not Emit Standalone Wire Codecs

They contribute shape only.

### 10.4 The Emitted Codec Looks Type-Specific

For a given boundary type, the emitted encode/decode functions should look as if they were written specifically for that type's chosen wire plan.

A result that still looks like "generic decoder plus helpers plus cursor plus descriptors" is evidence of incomplete correction.

### 10.5 The Planner Owns The Important Optimization Decisions

For every boundary type, the planner must be visibly responsible for the decisions that materially determine runtime cost and wire compactness.

This includes, where relevant:

- finite-domain representation
- boolean packing
- array count versus tail strategy
- optional metadata packing
- binary grouping
- field and decode order

If these decisions are still effectively hard-coded in emitters or silently erased before planning, the work is incomplete.

### 10.6 The Emitted Codec Avoids Obvious Runtime Overhead

The emitted code must not pay generic runtime costs that the planner could have removed.

Examples of evidence of incomplete work include:

- multi-pass decoding where the chosen layout could have made one pass sufficient
- generic cursor/count frameworks for trivial leaf-only boundary types
- array reconstruction that ignores already-known lengths
- helper fleets emitted as a mini-runtime instead of direct code for the chosen plan

### 10.7 Dynamic Types Remain Exceptional

Dynamic object/json handling remains purpose-built for the declaration site and never becomes a generic fallback for strongly typed values. 

### 10.8 Old Architectural Assumptions Are Gone

There is no remaining first-class pathway in which strongly typed codecs are built by concatenating child-emitted standalone codec fragments.

---

## 11. Failure Conditions

The agent must treat the following as failure, not as acceptable compromises.

- Creating a new planner but leaving the old emitter-first architecture functionally in charge.
- Wrapping old codec emitters in adapters and calling that a correction.
- Preserving old wire layout assumptions for compatibility.
- Introducing feature flags to choose between old and new architectures for strongly typed codecs.
- Quietly degrading difficult cases to dynamic object transport or generic JSON.
- Keeping non-boundary structured sub-codecs alive as a convenience.
- Leaving enough of the old abstraction in place that future contributors could continue thinking in terms of standalone structured codec emitters.
- Building a planner that records only coarse region membership while leaving the important optimization decisions implicit in emitters.
- Widening finite-domain values so early that the planner can no longer choose compact or fast representations.
- Accepting emitted code that is cleaner than before but still obviously not the fastest feasible codec for that boundary type.

---

## 12. Instruction to the Implementing Agent

You are not being asked to preserve the current codec architecture.

You are being asked to replace it with the architecture already mandated by the AnQst design documents.

Treat existing code as disposable whenever it conflicts with those principles.

Do not optimise for minimal code churn.

Do not optimise for migration smoothness.

Do not optimise for compatibility with previously generated internals.

Optimise for reaching the correct architecture decisively and unambiguously.

More specifically: optimise for a planner and emitter combination that can generate the fastest feasible strongly typed codec for each boundary type, using full static knowledge aggressively.

Do not confuse "planned before emitted" with "optimal". The planner is not complete unless it preserves and resolves the specialization opportunities implied by the type graph.

The public API contract is stable. The wire format and internal codec architecture are not. Use that freedom fully. 

---

## 13. Final Principle

The correction is complete only when this statement is true in code, not just in prose:

**Leaves describe capabilities, inner nodes describe shape, the boundary planner chooses layout and optimization strategy, and emitters render the chosen plan.**

Any implementation that still assigns wire-contract ownership to non-boundary nodes, or that emits code before whole-boundary planning, is not an AnQst codec architecture.

Any implementation that performs whole-boundary planning but still leaves major statically knowable optimization choices unresolved is also not a completed correction.
