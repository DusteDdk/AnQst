# AnQst Architecture and Design Principles

## 1. Purpose

This document defines the architectural, implementation, behavioral, and generated-artifact principles that govern AnQst. These principles are prescriptive: they guide current development and constrain future changes.

## 2. Architecture Principles

### 2.1 Single-Pass Pipeline

The generator operates as a deterministic, single-pass pipeline:

1. **Parse** — Read the `.d.ts` spec file, extract the widget namespace, service interfaces, and type declarations.
2. **Verify** — Validate the parsed model against DSL rules (no forbidden types, no duplicate signatures, no invalid member forms, all references resolvable).
3. **Type-graph resolution** — Resolve all payload and parameter types through the TypeScript type checker, building a complete graph of every type that will cross the bridge.
4. **Codec planning** — Walk the resolved type graph and produce a codec plan: how each service-boundary type is lowered into the wire representation, which leaf values emit native strings, which values are packed into base93 byte blobs, where dynamic Objects are allowed, how structs flatten, and how fields pack.
5. **Emission** — Generate all output artifacts (TypeScript services, C++ widget, Node bridge, CMake files) from the verified model and codec plan.

Each stage consumes the output of the previous stage. There are no feedback loops, no iterative passes, and no deferred decisions. This makes the generator deterministic and its output reproducible.

### 2.2 Specialized Generation Over Generic Conversion

There is no generic "serialize anything" function, no runtime type introspection, and no dispatch table that maps type names to conversion strategies. The codec system is specialized at two levels:

- **Base-type factories:** Each `AnQst.Type` primitive gets a dedicated, reusable encode/decode routine.
- **Top-level codecs:** Each type that appears at the service boundary (method argument, return payload, property value) gets a single comprehensive codec that handles the entire type-graph reachable from that type. Substructure types that are not themselves at the service boundary do not get independent codecs — their fields are absorbed into the containing top-level codec, which calls base-type factories for leaf values and flattens all structural composition into a single wire representation.

The only exception is types explicitly declared as dynamic (`AnQst.Type.object`, `AnQst.Type.json`) in the spec, which by definition have no static structure to specialize on. Even then, the dynamic codec is purpose-built for the declaration site, not a generic fallback. See `AnQst-Codec-Design-Principles.md` for the full codec architecture.

### 2.3 Topological Ordering

Type declarations (C++ structs, TypeScript interfaces) are emitted in topological order (dependencies first). This ensures that when a type is declared, all types it references have already been declared. This ordering is computed once during type-graph resolution and used by all emitters. Note that topological ordering governs the order of type declarations in the generated output, not the existence of independent codecs per struct — top-level codecs handle their entire type-graph inline (see Section 2.2).

### 2.4 Separation of Concerns

The generator's internal architecture separates:

- **DSL validity** (`parser.ts`, `verify.ts`) — Is this a legal AnQst-Spec?
- **Type resolution** (`typegraph.ts`, `program.ts`) — What types exist, and how do they relate?
- **Model** (`model.ts`) — The intermediate representation of the parsed spec.
- **Code generation** (`emit.ts`) — How to render the validated, resolved model as output artifacts.

These concerns do not leak into each other. The parser does not know about C++ types. The type resolver does not know about Angular. The emitter does not re-validate the spec.

## 3. Implementation Principles

### 3.1 Priority Hierarchy: Generated Output Over Generator Simplicity Over Generator Performance

The generator's own implementation is governed by a strict priority ordering:

1. **Quality and correctness of generated code** (highest priority). The generated output must be exact, correct, performant, and optimal. This is the generator's reason for existence and always takes first priority over all other considerations, including simplicity or performance of the generator itself.
2. **Simplicity and clarity of the generator implementation.** When choosing between two generator implementations that produce equally good output, prefer the one that is simpler to reason about, maintain, and verify.
3. **Generator runtime performance** (lowest priority). AnQstGen generation can be as compute-heavy as needed to produce the best result. When a simpler generator implementation is available, it is selected over a faster one — even if the simpler approach is significantly slower at generation time.

This priority ordering is the inverse of the priorities for the generated output. The generated code must be fast; the generator itself does not need to be. The generator is run at build time, typically once; the generated code runs in production, continuously.

### 3.2 Deterministic Generation

The generator is a pure function of its inputs. Given the same spec file, the same imported types, and the same generator version, the output is byte-for-byte identical. There are no timestamps, random identifiers, or environment-dependent values in the generated code (except the build stamp, which is a controlled, explicit input).

### 3.3 No Runtime Reflection in Generated Code

Generated code must not use runtime type introspection, `typeof` checks, `instanceof` tests, or any other mechanism that determines behavior based on the runtime type of a value. All type information is resolved at generation time and baked into the generated code as static structure.

This principle follows directly from the opaque wire contract: because both sides of the bridge share total static knowledge, runtime reflection is unnecessary and its absence is a performance guarantee.

### 3.4 No Identity Elision at the Codec Boundary

There is a strict requirement that the final output of a codec is either a naked string, a flat array of allowed items, or exceptionally an Object for a truly dynamic type. The interpretation of those values is opaque to all but the encoder and decoder generated for that type.

This means there is no identity elision at the codec boundary. A service-boundary type does not "pass through as-is" merely because its fields are JSON-native. Even an all-string structure still requires a generated codec that flattens its strings into the generated ordering expected by the decoder. Leaf-level strings may be emitted as native JSON strings, and booleans may use an optimal raw-string representation when that is the chosen codec strategy, but structured values do not preserve their in-memory object shape on the wire unless the type is explicitly declared dynamic.

### 3.5 No Generated Diagnostics or Version Exchange

Generated code must not contain diagnostic logging, version stamping, capability negotiation, or any other runtime coordination between frontend and backend. The generated bridge is silent: it serializes, transmits, and deserializes. If something goes wrong, the failure is immediate and obvious (wrong types, missing data), not diagnosed at runtime by the bridge itself.

The sole exception is error propagation for interaction failures (Call timeouts, Slot failures), which is part of the interaction semantics contract, not the codec or wire-format layer.

### 3.6 Type Mapping Directives Are Always Honored

`AnQst.Type.*` directives specify the type mapping for a given position. Since the generator has comprehensive codec support for every type in the `AnQst.Type` enum, every directive is honored — there is no scenario where a supported directive is silently downgraded to a different mapping. If a directive is used in a position where it is semantically invalid (e.g., a type that contradicts the actual TypeScript type, or a directive in an unsupported position), this is a generation error, not a silent fallback.

Type mapping directives do not change interaction semantics. A `Call<AnQst.Type.qint64>` behaves identically to `Call<bigint>` in terms of direction, completion model, and error handling. The directive affects only the generated type mapping and codec strategy.

### 3.7 Automatic Type Resolution and Universal Codec Requirement

Bare TypeScript types that have an unambiguous C++ mapping are resolved automatically by the generator. The `AnQst.Type` enum exists only for types where the C++ target is ambiguous (e.g., `number` can map to `double`, `qint32`, `quint16`, etc.) or non-obvious (e.g., `string` maps to `QString`, not `std::string`). Types with a single, obvious mapping — such as `boolean` to `bool` — do not need and do not have enum entries. Spec authors should use bare TypeScript types whenever possible and reach for `AnQst.Type` directives only when they need to control the specific C++ type.

Regardless of whether a type is resolved via an explicit `AnQst.Type` directive or via automatic resolution, every type that crosses the bridge gets an explicit, purpose-built generated codec. No type is ever transported without a codec. This extends to user-defined structured types (TypeScript interfaces and object type aliases): the generator walks the complete type-graph, resolves every leaf node to its C++ mapping, and produces a comprehensive top-level codec for the service-boundary type.

As a direct corollary, any type-graph reachable from a service-boundary parameter or return type must consist entirely of transportable types. If any leaf node or intermediate type in the graph is a forbidden type (see §4.3) or any type that the generator cannot produce a codec for, the entire spec is invalid. `anqst build` must fail at verification time — before any code generation begins — with a diagnostic that identifies the non-transportable type and the path through the type-graph that reached it.

## 4. Behavior Principles

### 4.1 Interaction Kind Determines Everything

The interaction kind (`Call`, `Slot`, `Emitter`, `Output`, `Input`, `DropTarget`, `HoverTarget`) fully determines:

- Direction (Widget->Parent, Parent->Widget, or framework-mediated)
- Completion model (async Promise, synchronous return, fire-and-forget, reactive push)
- Error semantics (Promise rejection, C++ exception, diagnostic event, silent drop)
- Handler lifecycle (single active handler, FIFO queue, replace-on-register)

There is no configuration that changes these semantics. The interaction kind is the contract.

### 4.2 All-or-Nothing Generation

The generator never does "best effort" conversion or generation. If coherent, consistent, exact, and correct types, codecs, and methods cannot be generated for all frontends and backends supported by AnQst — not simply those enabled by the particular project — then the generator must not emit any code at all.

This means validation is cross-backend: if a type in the spec cannot be correctly generated for any backend that AnQst supports (even one the current project does not use), the generator must fail. This ensures that a spec is unconditionally valid, not just valid-for-this-project's-configuration.

On failure, the generator must write a detailed and informative error message with sufficient plain-language explanation of exactly what went wrong, where, and how, including technical details about the particular failure. Terse error codes or opaque diagnostics are not acceptable.

### 4.3 Forbidden Types Are Rejected at Parse Time

Types that cannot be safely transported across the bridge boundary (`Function`, `Class`, `Type`, `Promise`, `Callable`, `any`, `symbol`, `unknown`, `never`) are rejected during verification, before any code generation occurs. This is a hard failure, not a warning. `Type` is forbidden because types are not first-class runtime values in either C++ or native JavaScript — there is no meaningful data to serialize. `Callable` is forbidden because while it could be interpreted as an RPC mechanism, AnQst deliberately requires the stricter, safer approach of declaring explicit `AnQst.Service` interfaces with typed interaction methods. The canonical list is the `AnQst.ForbiddenType` enum in `AnQst-Spec-DSL.d.ts`.

### 4.4 Errors Signal Program Bugs

When the AnQst bridge encounters a JavaScript `Error` instance, it does not serialize and transport it. Instead, it signals an exception on the receiving side. This is intentional: Error objects represent unrecoverable program errors, not domain-specific results. Expected outcomes — including failures — must be modeled as explicit types in the spec (e.g., a `ValidationResult` struct with a `success: boolean` field).

### 4.5 Slot Pre-Registration Queuing

When a parent invokes a Slot before the widget has registered a handler, the call is queued (FIFO, bounded at 1024 entries per endpoint). Once a handler is registered, the queue drains through it. This ensures that race conditions during widget initialization do not lose messages. The queue is a safety net, not a feature: well-designed widgets register handlers before the parent begins invoking slots.

### 4.6 Emitter Fire-and-Forget Semantics

Emitters have true Qt signal semantics. If a listener is connected, the event is dispatched immediately. If no listener is connected, the event is silently dropped. There is no queue, no retry, and no error. This is the correct semantic for notifications that are informational, not critical.

### 4.7 Cyclic Named Types Are Allowed When Transportable

Recursive or self-referencing named types (directly or indirectly) are transportable when their reachable leaf values are transportable and the generated codec strategy can iterate the runtime structure without requiring infinite compile-time expansion.

The generator's planning stage still requires total static knowledge of the node shapes, field kinds, and leaf transport rules. What it does not require is a finite acyclic declaration graph. A self-similar type such as a tree node that contains `children: Node[]` is valid when the node shape is fully known and every reachable leaf kind is transportable.

Validation must therefore distinguish between:

- **Transportable cyclic named shapes** — allowed. The generator emits runtime traversal/recursion using the statically-known node layout.
- **Non-transportable reachable leaves or unsupported runtime strategies** — rejected with a clear diagnostic.

## 5. Generated Artifact Principles

### 5.1 Implementation Principles for Artifacts

**Self-contained outputs.** Each generated output target (TypeScript bundle, C++ library, Node bridge) is self-contained. It does not depend on a shared AnQst runtime library beyond the project's bridge base class. All codec functions, type declarations, and bridge wiring are emitted directly into the generated code.

**Angular DI integration.** Generated TypeScript services are injectable through Angular dependency injection. The generator emits DI tokens and provider registration. Application code uses `inject(ServiceToken)` and never interacts with bridge internals.

**Qt integration.** The generated C++ widget subclass includes `Q_OBJECT`, `Q_PROPERTY` declarations, signals, and slots. It integrates with the Qt meta-object system and is usable from Qt Designer. The generated CMake target handles MOC, autogen, and include directories.

**Dual-transport support.** When a service extends `AnQst.AngularHTTPBaseServerClass`, the generated TypeScript supports both Qt WebChannel transport (for production) and WebSocket transport (for development with `ng serve` and browser dev tools). The same service API shape is used in both modes; only the transport differs.

**Naming conventions.** Generated widget class: `${WidgetName}Widget`. Umbrella header: `${WidgetName}.h`. Service classes preserve their spec names. These conventions are fixed and deterministic.

### 5.2 Behavioral Principles for Artifacts

**Stable public API per spec.** The generated public API surface is a function of the spec, not the generator version. Same spec produces same types, same method signatures, same property names. Application code that compiles against one build will compile against any subsequent build from the same spec (within semver of the generator).

**Opaque internals.** Everything below the public API — wire format, codec functions, bridge protocol, internal method names — is opaque and may change without notice. Application code must not depend on these internals. The generated public API itself must not expose any type, function, parameter, import, or naming that reveals transport mechanics, codec details, or wire-format concepts. A user reading only the generated public API should see domain types and interaction methods — never encoders, decoders, wire representations, or bridge objects.

**Globally consistent mapping.** Type mapping rules (TypeScript `string` to C++ `QString`, `number` to `double`, etc.) are globally consistent within one generator version. A type mapped one way in one service will be mapped the same way in every other service and every namespace-local declaration.

**Deterministic diagnostics.** When the generator encounters an error — a type mapping directive in an invalid position, a type that cannot be generated for all supported backends, or any other condition that prevents correct generation — it fails with a detailed, deterministic diagnostic. The same input always produces the same diagnostic. Diagnostics include the source location and a plain-language explanation of the failure.

**No runtime compatibility checks.** Generated artifacts do not contain code to verify that the frontend and backend were built from the same invocation. This is consistent with the opaque wire contract: compatibility is ensured by convention (build together, deploy together), not by runtime detection.
