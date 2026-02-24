# AnQst Generator Output Contracts

## 1. Purpose

This document defines deterministic generated output for:

- TypeScript bundle (Angular-facing APIs),
- Qt/C++ widget library artifacts.

Normative keywords: **MUST**, **MUST NOT**, **SHOULD**, **MAY**.

## 2. Naming and Artifact Layout

Given widget namespace `WidgetName` and service interface `ServiceName`:

- Generated Qt class name MUST be `WidgetName`.
- Generated TypeScript service class/token name MUST be `ServiceName`.
- Generated output MUST be stable and reproducible for the same spec input.

Minimum output groups:

1. TypeScript bundle:
   - Generated service APIs,
   - Generated TS declarations for exchange types,
   - Angular DI registration helpers.
2. QtWidget bundle:
   - QWidget subclass header/source,
   - Data structs for exchange models,
   - CMake files for integration.

Type generation is REQUIRED even for type-only specs (widget namespace with no services).

## 3. TypeScript Bundle Contract

## 3.0 Type generation baseline

For all namespace-local `interface` and `type` declarations:

- Generator MUST emit corresponding TypeScript definitions in output artifacts.
- Aliases MUST preserve alias identity where possible (for example `type UserType = User` remains an alias).
- Literal unions MUST be preserved in TypeScript output (for example `'this' | 'that'`).

Imported types referenced by namespace declarations MUST be resolved and represented according to project packaging strategy.

## 3.1 Generated service API surface

For each service member:

- `Call<T>` -> `method(args): Promise<T>`
- `CallSync<T>` -> `method(args): T`
- `Slot<T>` -> `onSlot.method(handler: (...args) => T): void`
- `Emitter` -> `method(args): void`
- `Output<T>` -> readonly reactive accessor `prop(): T` and `set.prop(value: T): void`
- `Input<T>` -> readonly reactive accessor `prop(): T` and `set.prop(value: T): void`

`set` namespace object MUST be generated once per service.
`onSlot` namespace object MUST be generated once per service.

## 3.2 Angular integration contract

- Service MUST be injectable through Angular DI.
- Accessors for `Input` and `Output` MUST integrate with Angular reactive consumption patterns (signal-like pull accessor).
- No generator-emitted API should require direct bridge object usage from application code.
- Generated bridge runtime MUST support both:
  - Qt-native `QWebChannel` transport when `window.qt.webChannelTransport` is available, and
  - development WebSocket bridge transport when served through host development mode.

## 3.3 Error/diagnostic surface

- `Call`/`CallSync` errors MUST map to thrown/rejected errors as defined in interaction semantics.
- Generator SHOULD emit a diagnostic event stream API for non-throwing constructs (`Emitter`, `Input`, `Output` transport failures).

## 4. Qt/C++ Bundle Contract

## 4.1 Generated QWidget subclass

Class MUST:

- Inherit from the project bridge-capable widget base (currently specialized QWidget-compatible bridge class).
- Include `Q_OBJECT`.
- Expose generated properties for `Input` and `Output` members via `Q_PROPERTY`.
- Expose Qt signals for emitted widget-to-parent events and bridge request dispatch.
- Expose one-way development mode switch API (`enableDebug()`) that keeps generated widget host surface transport-agnostic.

## 4.2 Generated request/reply wiring

For each `Call<T>` or `CallSync<T>` method:

- Generate callback alias:
  - `using MethodNameCallback = std::function<void(const T&)>;`
- Generate signal:
  - `void methodName(<mapped args>, MethodNameCallback reply);`

For each `Slot<T>` method:

- Generate invokable/public method on widget class:
  - `T methodName(<mapped args>);`
- For `Slot<void>`:
  - `void methodName(<mapped args>);`

For each `Emitter` method:

- Generate Qt signal:
  - `void methodName(<mapped args>);`

Development transport note:

- In generated TypeScript service output, each `CallSync<T>` member MUST also emit an additive async companion method `methodNameAsync(...): Promise<T>`.
- This companion is intended for development WebSocket mode where strict sync semantics cannot be provided safely in browser JavaScript.

## 4.3 Generated struct contract

All namespace-local object payload types and all transitively referenced object payload types MUST produce deterministic C++ data carriers:

- Plain fields only (no behavior methods required),
- Field names preserved from TS unless conflict resolution rule applies,
- Include optionality mapping support.

Additional rules:

- Type aliases MUST generate deterministic C++ type aliases or wrapper mappings in generated headers.
- Literal unions MUST map deterministically (for example enum/variant strategy) or fail generation with actionable diagnostics.
- Generation MUST still emit model headers/structs when no service interfaces are declared.

## 4.4 CMake contract

Generated CMake files MUST include:

- A target for the widget library,
- Inclusion of generated headers/sources,
- Qt MOC/autogen requirements,
- Exported include directories for generated API headers.

## 5. Type Mapping Rules

Default mappings:

- `string` -> `QString`
- `boolean` -> `bool`
- `number` -> `double` (default numeric representation)
- `T[]` -> `QList<TMapped>`
- object type -> generated `struct TypeName`
- optional property `x?: T` -> `std::optional<TMapped>` (or project-defined equivalent, but MUST be consistent)

Mapping policy MUST be globally consistent within one generator version.

## 5.1 Directive resolution pipeline (`AnQst.Type.*`)

Canonical spelling:

- `AnQst.Type.*` is canonical.
- `AnQst.Types.*` in source docs/examples is treated as a typo and normalized.

Resolution pipeline (deterministic):

1. Parse DSL types and collect all advisory directives (`AnQst.Type.*`).
2. Compute inferred/default mapping for each payload position.
3. Attempt to apply advisory directive mapping at the exact position.
4. If advisory mapping is unsupported at that position, keep inferred/default mapping.
5. Persist final chosen mapping and advisory status in generation metadata.

Semantics:

- `AnQst.Type.*` is advisory, not mandatory override.
- `T[]` and `Array<T>` are equivalent.
- `AnQst.Type.X[]` and `Array<AnQst.Type.X>` are equivalent element-mapping directives.
- Nested object fields MAY carry advisory directives.

## 5.2 Advisory mismatch diagnostics

When an advisory mapping is not honored, generator MUST emit a deterministic diagnostic entry containing:

- source location (file, declaration, member path),
- requested advisory mapping token,
- chosen effective mapping,
- concise reason code.

Recommended reason codes:

- `UNSUPPORTED_POSITION`
- `UNSUPPORTED_TARGET_TYPE`
- `CONFLICTING_CONSTRAINTS`
- `BACKEND_LIMITATION`

Diagnostics MUST be emitted for both service payloads and type-only generation roots.

## 6. Identifier Collision Rules

- Reserved C++ keywords MUST be escaped/mangled deterministically.
- Reserved TypeScript keywords in generated members MUST be escaped deterministically.
- Collisions after casing/mangling MUST fail generation with actionable diagnostics.

## 7. Stability and Versioning

- Generator MUST encode output contract version in generated metadata.
- Breaking output changes MUST require contract version increment.
- Mapping metadata SHOULD include advisory-vs-effective mapping outcomes for traceability.

