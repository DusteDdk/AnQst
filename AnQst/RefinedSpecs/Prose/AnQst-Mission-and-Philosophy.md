# AnQst Mission and Philosophy

## 1. What AnQst Is

AnQst is a code generator. Its input is a TypeScript declaration file (`.d.ts`) written in the AnQst-Spec-DSL. Its output is a matched set of generated artifacts: Angular/TypeScript service APIs for the frontend, a Qt/C++ widget library for the backend, and a Node.js/Express/WebSocket bridge for development workflows. These artifacts together form a high-performance, efficient, and typesafe bridge between frontend and backend.

The generator is packaged as the `anqst` CLI (usable via `npx anqst`). The command `anqst build` is the central operation: it reads the spec, validates it, resolves types, plans codecs, and emits all artifacts in a single invocation.

## 2. What the AnQst-Spec Language Is

The AnQst-Spec-DSL is a domain-specific language transported as TypeScript declarations. A spec file declares a widget namespace and, optionally, one or more service interfaces within it. Each service interface declares methods and properties using AnQst interaction types (`Call`, `Slot`, `Emitter`, `Output`, `Input`, `DropTarget`, `HoverTarget`) that define how the frontend and backend communicate.

The DSL is not executable code. It is a declaration of intent: the shape of the widget's API surface, the direction and semantics of each interaction, and advisory type-mapping preferences. The generator reads this declaration and produces all implementation.

The canonical source of truth for the language is `AnQstGen/spec/AnQst-Spec-DSL.d.ts`. This file defines the available interaction types, the `AnQst.Type` enum for advisory mapping directives, forbidden types, and exceptional types. It is considered read-only and must only be updated with explicit permission.

## 3. What AnQst Is Used For

AnQst serves developers who need to embed Angular web applications as native Qt widgets. The workflow is:

1. An Angular developer authors a widget spec in the AnQst-Spec-DSL, declaring services, methods, properties, and their payload types.
2. `anqst build` generates all bridge infrastructure: TypeScript services with Angular DI integration, a C++ QWidget subclass with signals/slots/properties, and optionally a Node development bridge.
3. The Angular developer writes their application using standard Angular patterns — injecting generated services, calling methods that return Promises, binding to reactive properties. They never touch bridge internals.
4. The C++ developer integrates the generated widget into their Qt application using familiar Qt patterns — connecting signals, setting properties, registering callbacks. They never touch web internals.
5. The generated bridge handles all serialization, deserialization, and transport between the two worlds.

The result is that both sides work in their native idioms with full type safety, and neither side is aware of the bridge mechanics.

The codec system exists to make that bridge efficient and language-appropriate, not merely to make values JSON-transportable. Its job is to ensure that the data declared in an AnQst-Spec arrives on the other side in a representation that is usable and correct for that language and runtime. For example, JavaScript `bigint` and the multiple 64-bit integer forms available in C++ are not interchangeable by accident; the generated codecs deliberately preserve the semantics chosen in the spec. For the same reason, the purpose of codecs is never runtime type-checking, integrity checking, or compatibility verification. They assume matched artifacts and valid data, and focus purely on correct transport and reconstruction.

## 4. Philosophy

### 4.1 Declaration-Driven Generation

The spec is the single source of truth. There is no runtime framework to configure, no adapter to write, no protocol to implement. The developer declares what they want; the generator produces all implementation. This eliminates an entire class of integration bugs and removes the need for bridge-domain expertise from application developers.

### 4.2 Opinionated Over Flexible

AnQst makes strong choices and does not expose them as options. The wire format is not configurable. The serialization strategy is not pluggable. The generated API surface follows fixed conventions. This is deliberate: fewer choices means fewer mistakes, and it gives the generator maximum freedom to optimize.

### 4.3 Performance as a Design Constraint

Performance is not an optimization pass applied after correctness. It is a constraint that shapes the architecture from the beginning. The decision to make the wire format opaque and per-build exists specifically to enable zero-overhead operations that would be impossible in a framework that promises wire-format stability. Every design decision is evaluated against the question: does this allow or prevent the generator from producing the most efficient possible bridge?

### 4.4 Zero User-Visible Runtime Framework

Generated code does not expose bridge objects, transport layers, or serialization details to application code. The Angular developer sees services with methods and properties. The C++ developer sees a QWidget with signals, slots, and properties. There is no `AnQstBridge` object to instantiate, no `AnQstSerializer` to configure, no `AnQstTransport` to select. The bridge is an implementation detail of the generated code.

### 4.5 Errors Are Not for Control Flow

AnQst is opinionated about error semantics. JavaScript `Error` instances are not transported as data. They signal unrecoverable program errors. When an Error is encountered, AnQst causes an exception on the receiving side rather than serializing the Error object. Expected, handleable situations must be modeled as domain-specific types in the spec.

## 5. General Direction

### 5.1 The Stable Contract

The stable contract of AnQst is defined at two levels:

- **Language level:** The AnQst-Spec-DSL syntax. The same DSL input must produce the same public API surface (types, interfaces, classes, structs, method names, property names) across generator versions, within the guarantees of semantic versioning of the generator itself.
- **Generated API level:** The TypeScript service interfaces, C++ widget class public API, and Angular DI tokens. Application code written against these surfaces must not break when the generator is updated (within semver).

Everything below the public API — wire format, codec strategies, internal bridge mechanics, serialization representation — is explicitly excluded from stability guarantees. This is the foundational design choice that enables AnQst to evolve its performance characteristics without breaking user code.

### 5.2 Targets Beyond Qt

The architecture is designed with the awareness that future targets beyond Qt/C++ (Node.js backends, OpenAPI, C++ web servers) are plausible. The AnQst-Spec-DSL does not encode assumptions about Qt. The interaction types (`Call`, `Slot`, `Emitter`, `Output`, `Input`) describe communication patterns, not Qt concepts — even though their current implementation maps to Qt signals, slots, and properties. This abstraction is intentional and leaves room for future backend targets without DSL changes.

### 5.3 The Generator Knows Everything

A core architectural invariant is that AnQstGen has total knowledge of all static and dynamic structures before it begins generating code. This is not an optimization — it is a foundational property that makes the entire design possible. Because the generator can see the complete type graph at build time, the generated code needs no runtime coordination, no capability negotiation, no version information exchange. Both sides of the bridge are generated from the same knowledge at the same time, and that shared knowledge is baked into the generated code as static structure.
