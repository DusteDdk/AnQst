# AnQst Opaque Wire Contract

## 1. Purpose

This document describes the central design choice of AnQst: the wire format between frontend and backend is opaque, unstable, and entirely under generator control. This is a deliberate inversion of the approach taken by OpenAPI and similar frameworks, and it is the single most important architectural decision in the project.

## 2. The Inversion

OpenAPI and similar frameworks freeze the wire format. They define a stable, versioned, self-describing protocol that allows any conforming client to communicate with any conforming server, regardless of when each was built. The wire format is the contract.

AnQst inverts this. AnQst freezes the generated type declarations and public API surface — the TypeScript interfaces, C++ classes, struct definitions, method signatures, and property names. The wire format is explicitly excluded from the contract. It is opaque, undocumented, and not guaranteed to be stable between any two invocations of `anqst build`, even on the same spec, even between minor versions of the generator.

| Concern | OpenAPI approach | AnQst approach |
|---|---|---|
| Wire format | Stable, versioned, documented | Opaque, unstable, undocumented |
| Generated types/API | May vary by codegen tool | Stable: same spec = same public API |
| Interoperability | Any conforming client with any conforming server | Only artifacts from the same `anqst build` invocation |
| Runtime overhead | Type tags, version headers, format negotiation | None — both sides are compiled from the same knowledge |

## 3. What Is Guaranteed

Given the same AnQst-Spec input, the generator produces the same:

- TypeScript types, interfaces, and type aliases
- TypeScript service class shapes (method names, parameter types, return types)
- Browser-global frontend factory surfaces and browser frontend diagnostic surfaces
- C++ struct definitions (field names, field types)
- C++ widget class public API (signals, slots, properties, handler registration methods)
- Angular DI tokens and injection surface when the Angular frontend profile is generated
- CMake target names and include structure

These are the **explicit, stable interface** exposed to users of the generated artifacts.

## 4. What Is Not Guaranteed

The following are explicitly unstable and may change between any two invocations of `anqst build`:

- The wire representation of any type (field ordering, encoding, packing strategy)
- The number and shape of JSON values transmitted per method call
- Whether a given type is transported as a single string, a flat array of allowed items, or exceptionally an Object for a truly dynamic type
- The internal codec functions and their signatures
- The base93 alphabet or packing boundaries
- The structure of the `"d"` payload in the QWebChannel envelope

Two subsequent runs of `anqst build` on the same AnQst-Spec could, in theory, produce two wildly different and incompatible wire formats. The public methods, members, types, structs, interfaces, and services that are generated would be identical.

## 5. The Build-Together Convention

Because only artifacts from the same `anqst build` invocation are guaranteed to work together, a project using AnQst must treat `anqst build` as the single artifact-generation step for the matched frontend/backend set. It is supported to compile the generated backend artifacts later in a separate pure C++/Qt/CMake environment, but only when that second stage consumes the exact generated outputs from that prior invocation. It is not supported — and not guaranteed to work — to build the frontend from one invocation and the backend from another.

This is a convention, not an enforcement mechanism. AnQst does not carry any code or complexity to detect mismatched builds. There are no version stamps compared at runtime, no handshake protocols, no compatibility checks. The responsibility lies entirely with the user's build pipeline to ensure that one `anqst build` invocation produces the matched artifact set, that any later pure-C++ compile stage consumes that exact generated tree, and that the resulting outputs are deployed together.

This is a deliberate choice. Adding runtime detection of mismatched builds would require version information in the wire format, which would add overhead and complexity to every message. The entire point of the opaque wire contract is to avoid exactly this kind of runtime coordination. The convention is simple, easy to follow (invoke `anqst build` once, deploy all outputs), and the cost of violating it is obvious and immediate (nothing works).

## 6. Why This Design Exists

### 6.1 Zero-Overhead Operations

When the wire format is stable and self-describing, the recipient must validate what it receives. It must check field names, verify types, handle missing or extra fields, negotiate versions. These are runtime costs that exist in every message, on every field, for the lifetime of the application.

When the wire format is opaque and both sides are generated from the same knowledge at the same time, none of this is necessary. The decoder knows exactly what the encoder sent because they were compiled from the same type graph in the same invocation. There are no field names to look up — the decoder knows the position of every value. There are no type checks — the decoder knows the type of every value. There is no version to negotiate — there is only one version, the one baked into this particular set of generated artifacts.

This enables zero-overhead operations that are structurally impossible in frameworks with stable wire formats.

### 6.2 Total Static Knowledge

AnQstGen has complete knowledge of all static and dynamic structures before it begins generating code. It knows every type, every field, every nesting relationship, every array element type, every optional field. This is not a feature — it is an invariant of the architecture.

Because of this total knowledge, the generated frontends and backends have full and exact knowledge of all structures and fields that will be transported, and exactly where and how they are provided and consumed. The generated code contains no runtime coordination, no feature exchange, no capability discovery, and no version information exchange. All of this information is baked in at build time.

### 6.3 Codec Freedom

Because the wire format is under full generator control and is not part of the public contract, the generator is free to choose the most efficient representation for each type in each context. It can:

- Pack multiple small integers into one shared base93-encoded byte blob
- Rearrange fields for optimal packing rather than preserving declaration order
- Encode binary data as base93 strings rather than base64 or hex
- Flatten nested structures into a single array
- Change any of these strategies in the next generator version without breaking user code

A framework that promises wire-format stability cannot do any of this without a major version bump. AnQst can do it on every build.

### 6.4 Endianness Is Irrelevant

Since AnQstGen controls both the encoder and the decoder, and both are generated from the same spec in the same invocation, byte order never needs to be communicated. The wire format uses JSON-safe primitives (numbers, strings, arrays) that have no endianness concern, and any binary encoding strategy is shared by construction between sender and recipient.

## 7. Implications for Users

- **Build pipeline:** `anqst build` must remain the single generation step that produces the matched artifacts (frontend, backend, and optionally dev bridge) together. A later pure C++/Qt/CMake compile stage may consume the generated backend tree, but only from that same prior invocation.
- **No artifact mixing:** You cannot take the TypeScript services from one build and the C++ widget from another build. Even if the spec has not changed, the wire format may have.
- **No wire-format inspection:** The wire format is not documented and must not be relied upon. Do not write code that inspects, logs, or processes the raw messages between frontend and backend. Use the generated public API exclusively.
- **Upgrades are seamless:** When you upgrade the AnQst generator and rebuild, your application code (which depends only on the stable public API) continues to work. The wire format may change silently to take advantage of new optimizations. This is a feature, not a risk.
- **No partial updates:** If you change the spec and rebuild, you must deploy both the new frontend and the new backend. There is no mechanism for backward-compatible wire-format evolution, and none is needed — the spec change already implies both sides must be updated.

## 8. Relationship to Other AnQst Documents

- The **stable public API contract** (what the generated types/interfaces look like) and **generated artifact principles** are defined in `Prose/AnQst-Architecture-and-Design-Principles.md` Section 5 ("Generated Artifact Principles").
- The **interaction semantics** (how Call, Slot, Emitter, etc. behave at runtime) are defined in `AnQstGen/spec/AnQst-Spec-DSL.d.ts` (canonical interaction type definitions) and `Prose/AnQst-Architecture-and-Design-Principles.md` Section 4 ("Behavior Principles").
- The **codec architecture** (how the opaque wire format is actually constructed) is described in `Prose/AnQst-Codec-Design-Principles.md`.
- This document defines the **design boundary** between what is stable and what is opaque. The other documents operate within that boundary.
