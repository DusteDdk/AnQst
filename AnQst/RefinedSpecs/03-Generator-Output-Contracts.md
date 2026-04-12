# AnQst Generator Output Contracts

## 1. Purpose

This document defines deterministic generated output for:

- Browser frontend bundles,
- Qt/C++ widget library artifacts,
- Node backend artifacts.

Normative keywords: **MUST**, **MUST NOT**, **SHOULD**, **MAY**.

## 2. Target taxonomy

AnQst target selection chooses which already-valid artifacts are emitted for a project. It does **not** change what counts as a valid AnQst spec.

Supported target groups:

- Browser frontend targets:
  - `AngularService`
  - `VanillaTS`
  - `VanillaJS`
- Backend targets:
  - `QWidget`
  - `node_express_ws`

A spec remains valid only when every supported generator can generate it coherently and exactly.

## 3. Naming and Artifact Layout

Given widget namespace `WidgetName` and service interface `ServiceName`:

- Generated Qt class name MUST be `WidgetNameWidget`.
- Generated umbrella header MUST be `WidgetName.h` and include:
  - `WidgetNameWidget.h`
  - `WidgetNameTypes.h`
- Generated TypeScript service class/token name MUST be `ServiceName`.
- Generated output MUST be stable and reproducible for the same spec input.

Minimum output groups:

1. Browser frontend bundle:
   - Generated browser-facing service APIs,
   - Generated TS declarations for exchange types when the target exposes TypeScript types,
   - Target-specific integration helpers.
2. QtWidget bundle:
   - QWidget subclass header/source,
   - Data structs for exchange models,
   - CMake files for integration.
3. Node backend bundle:
   - Generated backend-facing bridge helpers,
   - Generated TS declarations for exchange types,
   - Node integration surface.

Type generation is REQUIRED even for type-only specs (widget namespace with no services).

## 4. Browser Frontend Bundle Contract

## 4.0 Type generation baseline

For all namespace-local `interface` and `type` declarations:

- Generator MUST emit corresponding TypeScript definitions in output artifacts.
- Aliases MUST preserve alias identity where possible (for example `type UserType = User` remains an alias).
- Literal unions MUST be preserved in TypeScript output (for example `'this' | 'that'`).

Imported types referenced by namespace declarations MUST be resolved and represented according to project packaging strategy.

## 4.1 Generated service API surface

For each service member:

- `Call<T>` -> `method(args): Promise<T>`
- `Slot<T>` -> `onSlot.method(handler: (...args) => T | Promise<T> | Error): void`
- `Emitter` -> `method(args): void`
- `Output<T>` -> readonly reactive accessor `prop(): T | undefined` and `set.prop(value: T): void`
- `Input<T>` -> readonly reactive accessor `prop(): T | undefined` and `set.prop(value: T): void`

`set` namespace object MUST be generated for a service only when that service declares at least one `Input` member (the object holds one method per `Input`).
`onSlot` namespace object MUST be generated for a service only when that service declares at least one `Slot` member (the object holds one registration method per `Slot`).

When a namespace has no members, the generator MUST NOT emit an empty placeholder object or empty helper interface for that namespace.

Until the first value has been observed or published, generated `Input`/`Output` accessors MUST model the unset state honestly rather than fabricating a value.

## 4.2 Shared browser runtime contract

- Browser frontend targets MUST expose a generated application-facing API that does not require direct bridge object usage from application code.
- Generated browser bridge runtime MUST support both:
  - Qt-native `QWebChannel` transport when `window.qt.webChannelTransport` is available, and
  - development WebSocket bridge transport when served through host development mode.
- Browser frontend targets MUST preserve the same interaction semantics across transports.
- Browser frontend targets MUST preserve the same service/member/type names for the same spec.

## 4.3 Angular profile contract

- Service MUST be injectable through Angular DI.
- Accessors for `Input` and `Output` MUST integrate with Angular reactive consumption patterns (signal-like pull accessor).
- Generated Angular surface SHOULD expose diagnostics through a dedicated injectable service rather than requiring direct bridge-runtime access.

## 4.4 Vanilla profile contract

- `VanillaTS` and `VanillaJS` MUST share the same browser runtime behavior and application-facing factory shape.
- `VanillaTS` MUST provide TypeScript-grade typing for the same browser runtime that `VanillaJS` exposes.
- `VanillaJS` MUST be directly usable from a browser `<script>` load without requiring bundlers or ESM imports.
- `VanillaTS` and `VanillaJS` MUST expose a browser-global API surface that keeps transport details out of application code.

## 4.5 Error/diagnostic surface

- `Call` errors MUST map to rejected errors as defined in interaction semantics.
- Generator SHOULD emit a diagnostic event stream API for non-throwing constructs (`Emitter`, `Input`, `Output` transport failures).

## 5. Qt/C++ Bundle Contract

## 5.1 Generated QWidget subclass

Class MUST:

- Inherit from the project bridge-capable widget base (currently specialized QWidget-compatible bridge class).
- Include `Q_OBJECT`.
- Expose generated properties for `Input` and `Output` members via `Q_PROPERTY`.
- Expose Qt signals for emitted widget-to-parent events and bridge request dispatch.
- Expose one-way development mode switch API (`enableDebug()`) that keeps generated widget host surface transport-agnostic.

## 5.2 Generated request/handler wiring

For each `Call<T>` method:

- Generate callback type alias and handler registration method in the widget handle registry:
  - `using MethodNameHandler = std::function<T(<mapped args>)>;`
  - `widget->handle.methodName(handler);`

For each `Slot<T>` method:

- Generate invokable/public method on widget class with `slot_` prefix:
  - `T slot_methodName(<mapped args>);`
- For `Slot<void>`:
  - `void slot_methodName(<mapped args>);`
- Generated method MUST be a Qt slot (`public slots:` section).

For each `Emitter` method:

- Generate Qt signal with natural name:
  - `void methodName(<mapped args>);`

Class naming and placement:

- Generated widget class name MUST be `${WidgetName}Widget`.
- Generated widget class MUST be emitted outside the `declare namespace WidgetName` namespace.

Development transport note:

- In generated TypeScript service output, development WebSocket transport MUST provide the same `Call<T>` async API shape as Qt WebChannel transport.

## 5.3 Generated struct contract

All namespace-local object payload types and all transitively referenced object payload types MUST produce deterministic C++ data carriers:

- Plain fields only (no behavior methods required),
- Field names preserved from TS unless conflict resolution rule applies,
- Include optionality mapping support.

Additional rules:

- Type aliases MUST generate deterministic C++ type aliases or wrapper mappings in generated headers.
- Literal unions MUST map deterministically (for example enum/variant strategy) or fail generation with actionable diagnostics.
- Generation MUST still emit model headers/structs when no service interfaces are declared.

## 5.4 CMake contract

Generated CMake files MUST include:

- A target for the widget library,
- Inclusion of generated headers/sources,
- Qt MOC/autogen requirements,
- Exported include directories for generated API headers.
- A stable integration entrypoint that consumes the existing `AnQst/generated` widget tree.

Generated integration CMake:

- MUST NOT require `npm`, `npx`, or other Node-specific tools.
- MUST fail fast with an actionable diagnostic if the required generated widget files are missing.
- MUST preserve the same widget target name, include structure, and link requirements as the widget-local generated CMake it wraps.

## 6. Type Mapping Rules

Default mappings:

- `string` -> `QString`
- `boolean` -> `bool`
- `number` -> `double` (default numeric representation)
- `T[]` -> `QList<TMapped>`
- object type -> generated `struct TypeName`
- optional property `x?: T` -> `std::optional<TMapped>` (or project-defined equivalent, but MUST be consistent)

Mapping policy MUST be globally consistent within one generator version.

## 6.1 Directive resolution pipeline (`AnQst.Type.*`)

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

## 6.2 Advisory mismatch diagnostics

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

## 7. Identifier Collision Rules

- Reserved C++ keywords MUST be escaped/mangled deterministically.
- Reserved TypeScript keywords in generated members MUST be escaped deterministically.
- Collisions after casing/mangling MUST fail generation with actionable diagnostics.

## 8. Stability and Versioning

- Generator MUST encode output contract version in generated metadata.
- Breaking output changes MUST require contract version increment.
- Mapping metadata SHOULD include advisory-vs-effective mapping outcomes for traceability.

Browser frontend `package.json` metadata includes `anqst.outputContractVersion`:

- `2`: `set` and `onSlot` namespace objects are emitted only when the service has at least one corresponding `Input` or `Slot` member (no empty placeholder objects or empty helper interfaces).

## 9. Call/Emitter Overhaul Addendum (Authoritative)

This addendum supersedes conflicting Call/Emitter API shape statements above.

### 9.1 C++ Call API shape

- Generator MUST emit callback-registration API through `handle`:
  - `widget->handle.methodName(handler);`
- Exactly one callback is active per endpoint; later registration replaces earlier.
- Public API MUST NOT expose reply object parameter.
- `Call` timeout config remains supported on DSL side (`timeoutSeconds`/`timeoutMilliseconds`).

### 9.2 Browser frontend Call surface

- `Call<T>` remains `method(args): Promise<T>`.
- Promise success payload is `T` (no envelope).
- Promise rejection object MUST include mandatory fields:
  - `code`, `message`, `service`, `member`, `requestId`.

### 9.3 Emitter surface

- Generator MUST emit Qt signal for each emitter method.
- Emitter MUST have no config generic (`AnQst.Emitter` only).
- If no listener is connected, emitter event MUST be dropped.

