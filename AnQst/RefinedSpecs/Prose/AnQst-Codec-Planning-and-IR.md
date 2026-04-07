# AnQst Codec Planning and Intermediate Representation

## 1. Purpose

This document defines the internal architecture of AnQst codec generation.

It exists to remove ambiguity about what a "codec generator" is inside AnQstGen. In AnQst, a codec generator is not primarily a source-code emitter. It is a participant in a planning system that describes how values may be transported, how structures may be traversed and reconstructed, and how a complete service-boundary type may be lowered into one optimal wire representation.

The planning target is bridge-first, not wire-first.

The primary job of an AnQst codec is to move strongly typed values between the JavaScript/TypeScript/V8 side and the C++/Qt side in forms that are efficient and natural for those runtimes.

The JSON/QWebChannel carrier is a hard external constraint on the final top-level result, but it is not the architectural product. The product is the generated boundary-specific transport plan and the generated boundary-specific materialization code.

This document is prescriptive. It constrains the design of the generator implementation.

It must be read together with:

- `AnQst-Codec-Design-Principles.md`
- `AnQst-Opaque-Wire-Contract.md`
- `AnQst-Architecture-and-Design-Principles.md`
- `AnQst-Mission-and-Philosophy.md`

If any implementation conflicts with this document, this document takes precedence for codec-planning architecture.

---

## 2. Core Rule

A service-boundary codec is planned as a whole before any target-language source code is emitted.

This is a hard rule.

The generator must not build a top-level codec by asking child nodes or child types to directly emit encoder or decoder source code and then stitching those code fragments together. That would reduce the planning stage to an assembly step and would prevent global optimization of the wire layout.

Instead, codec generation proceeds in this order:

1. Analyse the reachable type graph.
2. Build an internal transport description for that graph.
3. Produce a whole-boundary codec plan.
4. Emit target-language code from that plan.

Emission is the final projection of a chosen plan, not the primary interface between codec components.

The planner must therefore reason about the entire service-boundary problem at once:

- bridge carrier constraint
- runtime encode/decode cost
- runtime materialization cost
- finite-domain specialization opportunities
- target-language public type fidelity

---

## 3. The Three Kinds of Codec Participants

### 3.1 Leaf Type Participants

A leaf type participant corresponds to a transportable leaf kind such as:

- integer types
- bigint types
- boolean
- number
- string
- binary/blob/buffer/typed array forms
- explicitly dynamic types, where allowed by the spec

A leaf type participant does not define a top-level wire representation for structures.

Its job is to describe:

- the logical value kind it represents
- the wire strategies it supports
- the constraints those strategies impose
- the target-language materialization rules for each supported backend
- how to emit encode/decode logic once a concrete placement has already been chosen

A leaf participant may expose reusable low-level rendering helpers, but these helpers are private implementation details. They do not define the wire contract for a service-boundary type.

A leaf participant must not force the top-level planner into a specific layout merely because it is easiest for that leaf to emit code in that form.

### 3.2 Structural Participants

A structural participant corresponds to a non-leaf node in the reachable type graph: object types, named structs, arrays, tuples, optional members, unions where supported, recursive shapes where transportable.

A structural participant is not a codec in the wire-boundary sense.

Its job is to describe:

- what children exist
- which children are singular, optional, repeated, or recursively repeated
- whether runtime traversal is required
- whether flattening across this node is allowed
- what reconstruction shape must exist on the receiving side
- what information would be required to delimit variable-length descendants if they are reordered or grouped

A structural participant must never assume that it preserves declaration order or structural identity on the wire.

A structural participant must never emit an independent sub-codec output for a non-boundary substructure.

### 3.3 Boundary Codec Planner

The boundary codec planner is the only component allowed to choose the wire layout of a service-boundary type.

For every type that appears at the service boundary, the planner must consume the fully analysed reachable type graph and choose:

- the number of wire regions
- the order of those regions
- the ordering of leaf values within each region
- whether strings are naked, grouped, or tailed
- whether fixed-width values are grouped into a shared blob
- whether booleans are packed with bytes or separately represented
- when lengths are needed
- when lengths are unnecessary because a field consumes the tail
- how repeated structures are flattened
- how recursive runtime traversal is performed when allowed
- how the runtime value is reconstructed from the chosen wire layout

Only the boundary planner defines the actual codec for a strongly typed service-boundary type.

---

## 4. Mandatory Internal Stages

The codec subsystem must internally distinguish the following stages.

### 4.1 Type Graph

This is the resolved logical graph of the transported type.

It describes the programmer-visible structure.

It is not yet a transport plan.

### 4.2 Transport Analysis Graph

This is a tree or graph of transport-relevant descriptions derived from the type graph.

Each node in this graph describes transport facts, such as:

- fixed-width vs variable-width
- leaf vs structural
- repeatable vs singular
- tail-consumable vs length-requiring
- binary-packable vs string-only
- dynamic-only vs statically specialized
- finite-domain vs open-domain
- target materialization requirements

This graph contains no target-language source code.

It must also avoid erasing closed-world information prematurely. Literal unions and other finite domains must survive transport analysis long enough for the boundary planner to choose a representation from full boundary context.

### 4.3 Boundary Codec Plan

This is the chosen transport plan for one service-boundary type.

It is a complete answer to the question:

"How will this exact boundary type be carried over the wire and reconstructed on the other side?"

The plan may differ significantly from the source structure. It may:

- reorder fields
- flatten nested structures
- group leaves by transport strategy
- append variable-length data to the end
- place counts before repeated sections
- inline repeated descendants into shared regions
- choose different packing based on the full reachable type graph

The plan may also preserve or recode finite-domain values when that is justified by the generated runtime behavior.

Finite-domain recoding is valid only when it is a real specialization enabled by closed-world knowledge. It is not valid merely because a smaller carrier item exists.

The plan is authoritative. Once chosen, emission is mechanical.

### 4.4 Target-Language Emission

Only after the boundary codec plan exists may the generator emit TypeScript, C++, or other target code.

Emitters render the chosen plan. They do not choose layout.

---

## 5. Required Shape of Leaf Descriptions

Every leaf type participant must describe at least the following.

### 5.1 Logical Kind

The semantic kind of value, such as:

- signed 8/16/32/64-bit integer
- unsigned 8/16/32/64-bit integer
- IEEE double
- boolean
- string
- binary blob
- typed array
- explicitly dynamic JSON/object value

This is distinct from the wire strategy.

### 5.2 Wire Capabilities

The wire strategies supported by the leaf, for example:

- fixed-width binary packable
- fixed-width textual packable
- variable-width
- may consume tail
- may appear in a grouped string region
- may appear in a grouped binary region
- requires per-value length if followed by additional variable data
- may be preceded by count metadata
- may be bit-packed
- may be emitted as naked JSON string
- may only appear in a dynamic Object emission

These are capabilities, not decisions.

### 5.3 Target Materialization

For every backend target, the leaf must describe:

- the native target type
- how the value is read once placed
- how the value is written once placed
- whether direct trivial copying is valid
- whether decoding or allocation is required
- ownership and copying constraints where relevant

This includes cases that are not POD in the strict C++ sense. The concern is target materialization, not merely trivial memory layout.

Where a finite domain is part of the programmer-visible boundary type, the target materialization model should preserve that closed domain in generated public target types when feasible rather than widening it away before or during planning.

### 5.4 Rendering Hooks

A leaf may provide rendering hooks of the form:

- render this value as fixed-width binary read/write
- render this value as fixed-width text read/write
- render this value as grouped string slot read/write
- render this value as dynamic member read/write

These hooks are selected only after the boundary planner has chosen a layout.

A leaf must not provide only a monolithic `emitEncoder()` / `emitDecoder()` API that presupposes its own standalone wire position.

---

## 6. Structural Nodes Are Guidance, Not Sub-Codecs

For strongly typed non-boundary structures, the generator must never create an independently meaningful wire representation.

This rule is absolute.

A named struct that exists only as a field inside another boundary type is a structural concept for the programmer and for reconstruction. It is not a wire-contract boundary.

Its purpose in planning is to contribute:

- child relationships
- repetition structure
- optionality
- recursive traversal shape
- reconstruction instructions

It must not produce its own emitted wire payload.

It must not force the top-level plan to mirror the source structure.

It must not preserve declaration order merely because the source was written in that order.

---

## 7. Reordering Is the Default Freedom

The planner is free to reorder fields and descendants in whatever way yields the best codec for the boundary type.

This includes, but is not limited to:

- moving the only variable-length field to the end so it consumes the remainder without a length
- grouping fixed-width numeric leaves together into one shared blob
- grouping all strings in the reachable type graph into one flat string region
- separating counts from payload regions
- flattening repeated nested values into shared repeated regions
- reconstructing the logical structure in a different order from the wire order

Declaration order is not a wire-format obligation.

Preserving declaration order is allowed only when it is equal or superior to all alternatives for the chosen strategy, or when a specific supported construct requires it.

---

## 8. Counts, Tails, and Repetition

The planner must treat variable-size layout information as a whole-boundary concern.

### 8.1 Tail Consumption

If exactly one variable-length field is placed last in the chosen region and no later data depends on delimiting it, that field should normally consume the tail and no explicit length should be emitted.

### 8.2 Count Prefixes

If repeated data or multiple variable-length sections require delimitation, counts should normally be emitted before the corresponding region or subsection.

The decoder already knows what kind of node it is reconstructing. It therefore needs only the minimal metadata required to know how many values to consume or where the next section begins.

This is a runtime-cost decision as much as a wire-cost decision. The planner may choose slightly larger metadata when that removes a second pass or otherwise improves generated decode speed.

### 8.3 No Generic Sentinel Grammar

The planner must not invent a general-purpose structural token language equivalent to a mini parser format.

It is valid to emit counts, sizes, or other minimal metadata needed by a known boundary plan.

It is invalid to drift into a reusable grammar of generic runtime tokens such as start-object, end-object, start-array, and so on for strongly typed values. That would reintroduce parser-like behavior and violate the specialized-codec architecture.

### 8.4 Recursive Shapes

Transportable cyclic named shapes are allowed when the runtime traversal strategy is statically known and supported.

In those cases, the planner may emit runtime traversal logic, but the node layout must still be statically known. Recursion does not justify a generic parser.

---

## 9. What a Codec Generator Module Must Not Be

A codec generator module must not be defined primarily as:

- a source-code emitter for a standalone structured codec
- a mini-framework that owns its own wire format
- a reusable sub-codec producing arrays or objects for non-boundary typed structures
- a generic serializer selected by runtime type
- a fallback mechanism for types the generator has not fully specialized

These are all architectural errors.

The only valid meaning of "codec generator" below the boundary-planner layer is:

- a provider of transport capabilities
- a provider of structural analysis
- a provider of rendering hooks for already chosen placements

---

## 10. Relation to the Existing Base Codec Catalogue

The existing codec-generator catalogue is interpreted under this document as a catalogue of leaf transport participants and exceptional dynamic participants, not as a catalogue of standalone structured codec emitters.

Examples include categories such as:

- integer leaf kinds
- bigint leaf kinds
- string leaf kinds
- boolean leaf kinds
- number leaf kinds
- binary and typed-array leaf kinds
- explicitly dynamic object/json leaf kinds

The existence of a module in this catalogue does not entitle it to define top-level wire layout for a structured boundary type.

Its role is to inform planning and to render selected leaf placements once planning is complete.

---

## 11. Required Internal API Direction

The internal API of codec participants should flow in this direction:

- describe capabilities
- contribute analysis
- accept chosen placement
- render target-specific code for that placement

The internal API must not flow primarily in this direction:

- emit standalone code first
- ask parent to concatenate it later

If an implementation cannot represent, before emission, facts such as:

- this string may consume the tail
- this boolean may be bit-packed or byte-packed
- this integer may join a fixed-width shared blob
- this repeated child needs a count if moved ahead of later data

then the implementation is too code-emission-centric and does not satisfy this architecture.

---

## 12. Emission Must Look Specific

The emitted code for a service-boundary type should appear as though it was handwritten specifically for that one type.

That is a good outcome.

It is acceptable and expected that two unrelated boundary types produce visibly different decode functions, different field orders, different grouping choices, and different helper usage patterns.

A generated decoder that merely orchestrates a generic runtime codec framework is evidence that planning has been left incomplete.

The target is not a schema-aware runtime serializer library.

The target is a generator that performs the schema-aware planning at build time and emits direct, highly specific encode/decode code.

---

## 13. Diagnostics

If the planner cannot produce a coherent whole-boundary plan for a type, generation must fail.

It must not silently degrade to:

- generic object transport
- generic JSON conversion
- runtime type inspection
- per-struct sub-codec composition
- ad hoc fallback layouts

The failure must explain:

- which type could not be planned
- which node or leaf caused the issue
- which requirement or constraint made planning impossible
- whether the problem is a forbidden type, unsupported runtime traversal strategy, impossible target mapping, or invalid dynamic usage

---

## 14. Final Rule

The wire contract for a strongly typed service-boundary type belongs only to the root boundary codec plan.

Leaves contribute capabilities.
Inner nodes contribute shape.
The boundary planner chooses layout.
Emitters render the chosen plan.

Generic runtime hosting is allowed at the bridge layer.

Generic codec behavior is not.

Shared QWebChannel, host-facade, and `QVariant` plumbing may remain generic because they are bridge-hosting infrastructure. Descriptor-driven, fallback, or framework-like codec/layout behavior for strongly typed boundaries is an architectural error because it belongs in the boundary plan, not in shared runtime machinery.

Any implementation that assigns wire-contract ownership to non-boundary nodes is not an AnQst codec architecture.