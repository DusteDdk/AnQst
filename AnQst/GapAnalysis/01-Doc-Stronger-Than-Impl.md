# Documentation Stronger Than Implementation

These are areas where the specification mandates behaviour that the implementation does not deliver.

---

## GAP-D01 — C++ `Call<T>` API shape: signal-based vs handler-based

**Severity: Critical**

### What the spec says

`RefinedSpecs/03-Generator-Output-Contracts.md §4.2` and `RefinedSpecs/04-Canonical-UserManagement-Example.md §4`:

```cpp
// Spec-mandated shape for Call<T>:
using GetUserByIdCallback = std::function<void(const User&)>;
void getUserById(QString userId, GetUserByIdCallback reply);   // Qt SIGNAL
```

The spec mandates a Qt signal that carries the arguments _plus_ a callback for the reply. The parent connects to this signal and resolves the reply via the callback.

### What the implementation generates

`AnQstGen/src/emit.ts` `renderWidgetHeader()`:

```cpp
// Actually generated:
using GetUserByIdHandler = std::function<User(QString userId)>;
void setGetUserByIdHandler(const GetUserByIdHandler& handler);
```

The implementation generates a pre-registered synchronous handler that the parent sets once. There is no Qt signal. The bridge calls the handler directly.

### Observable difference

- The parent API contract is different: `connect(&w, &Widget::getUserById, ...)` vs `w.setGetUserByIdHandler(...)`.
- The spec's callback-bearing-signal pattern supports multiple listeners and late binding. The handler pattern allows only one handler at a time.
- Callback name suffix is `Callback` in spec, `Handler` in implementation.

### Affected docs

`RefinedSpecs/04-Canonical-UserManagement-Example.md §4`, `RefinedSpecs/03-Generator-Output-Contracts.md §4.2`

---

## GAP-D02 — C++ `Emitter` API shape: Qt signal vs handler-based

**Severity: Critical**

### What the spec says

`RefinedSpecs/03-Generator-Output-Contracts.md §4.2`:

```cpp
// For each Emitter method — generate Qt signal:
void badWord(QString word);  // Qt SIGNAL
```

### What the implementation generates

`AnQstGen/src/emit.ts` `renderWidgetHeader()`:

```cpp
using BadWordHandler = std::function<void(QString word)>;
void setBadWordHandler(const BadWordHandler& handler);
```

Again a handler-based pattern instead of a Qt signal. A parent that expects to `connect` to a `badWord` signal cannot do so.

### Affected docs

`RefinedSpecs/03-Generator-Output-Contracts.md §4.2`, `RefinedSpecs/04-Canonical-UserManagement-Example.md §4`

---

## GAP-D03 — Advisory mapping diagnostics not emitted

**Severity: Critical**

### What the spec says

`RefinedSpecs/03-Generator-Output-Contracts.md §5.1–5.2`:

> When an advisory mapping is not honored, generator **MUST** emit a deterministic diagnostic entry containing:
> - source location (file, declaration, member path)
> - requested advisory mapping token
> - chosen effective mapping
> - concise reason code (`UNSUPPORTED_POSITION`, `UNSUPPORTED_TARGET_TYPE`, `CONFLICTING_CONSTRAINTS`, `BACKEND_LIMITATION`)

`RefinedSpecs/02-Interaction-Semantics.md §7`:

> If advisory mapping cannot be honored for a payload position, runtime behavior remains unchanged and a **deterministic advisory-mismatch diagnostic MUST be emitted**.

### What the implementation does

`AnQstGen/src/emit.ts` `mapTsTypeToCpp()` and `CppTypeNormalizer.mapTypeNode()`:

`AnQst.Type.*` directives are honored silently when recognized and silently ignored when not. No diagnostic is emitted for:
- unrecognized `AnQst.Type.*` tokens
- positions where advisory mapping cannot be applied
- fallback-to-default situations

There is no diagnostic output path for advisory mismatches anywhere in the emit or verify pipeline.

### Affected docs

`RefinedSpecs/03-Generator-Output-Contracts.md §5.1–5.2`, `RefinedSpecs/02-Interaction-Semantics.md §7`

---

## GAP-D04 — Slot pre-registration queue size: 1024 vs 10,000,000

**Severity: High**

### What the spec says

`RefinedSpecs/02-Interaction-Semantics.md §3.2.1`:

> Default queue size limit: **1024 calls per slot**.
> On overflow, oldest queued entry is dropped and a `SlotQueueOverflowError` diagnostic MUST be emitted.

### What the implementation uses

`AnQstWidget/AnQstWebBase/src/AnQstHostBridgeFacade.h`:

```cpp
static constexpr int kMaxQueuedSlotInvocations = 10000000;
```

`AnQstWidget/AnQstWebBase/src/AnQstWebHostBase.h`:

```cpp
static constexpr int kMaxQueuedSlotInvocations = 10000000;
```

The limit is 10 million, effectively removing the back-pressure guarantee the spec describes.

### Affected docs

`RefinedSpecs/02-Interaction-Semantics.md §3.2.1`

---

## GAP-D05 — Standard bridge error identifiers not fully used

**Severity: High**

### What the spec says

`RefinedSpecs/02-Interaction-Semantics.md §5` defines these as standard identifiers:

- `HandlerNotRegisteredError`
- `SerializationError`
- `DeserializationError`
- `SlotQueueOverflowError`
- `BridgeDisconnectedError`
- (from §6) `BridgeTimeoutError`

### What the implementation uses

`AnQstGen/src/emit.ts` `renderNodeExpressWsIndex()` uses `HandlerNotRegisteredError` and `CallHandlerError`/`EmitterHandlerError`. The C++ host emits `QVariantMap` errors with `code` fields, but none of `SerializationError`, `DeserializationError`, `BridgeDisconnectedError`, or `BridgeTimeoutError` appear as explicit named error codes in the generated bridge or the host base.

### Affected docs

`RefinedSpecs/02-Interaction-Semantics.md §5`

---

## GAP-D06 — `Output<T>` missing `set.prop` in generated TypeScript surface

**Severity: High**

### What the spec says

`RefinedSpecs/02-Interaction-Semantics.md §4.4` and `RefinedSpecs/04-Canonical-UserManagement-Example.md §2`:

> Widget side for `Output<T>`:
> - readonly getter signal/value accessor: `prop() -> T`
> - **convenience setter API namespace: `set.prop(value: T): void`**

The canonical example shows both `activeUsers` (Output) and `currentUsername` (Input) present in the generated `set` namespace:

```ts
set: {
  activeUsers(value: number): void;      // Output
  currentUsername(value: string): void;  // Input
  passwordPolicy(value: PasswordPolicy): void; // Output
};
```

### What the implementation generates

`AnQstGen/src/emit.ts` `renderTsService()` and `renderTsServiceDts()`:

`set.xxx` is generated **only for `Input<T>`**. `Output<T>` receives no entry in the `set` namespace. Angular code cannot call `set.activeUsers(...)`.

### Affected docs

`RefinedSpecs/02-Interaction-Semantics.md §4.4`, `RefinedSpecs/04-Canonical-UserManagement-Example.md §2`

---

## GAP-D07 — Identifier collision detection missing

**Severity: Medium**

### What the spec says

`RefinedSpecs/03-Generator-Output-Contracts.md §6`:

> Reserved C++ keywords **MUST** be escaped/mangled deterministically.
> Reserved TypeScript keywords in generated members **MUST** be escaped deterministically.
> Collisions after casing/mangling **MUST** fail generation with actionable diagnostics.

### What the implementation does

No keyword collision detection exists in `AnQstGen/src/verify.ts` or `AnQstGen/src/emit.ts`. A spec member named `class`, `delete`, `namespace`, `template`, or `using` would generate invalid C++. A member named `constructor` or `function` would generate broken TypeScript without error.

---

## GAP-D08 — Generator output contract version not encoded

**Severity: Medium**

### What the spec says

`RefinedSpecs/03-Generator-Output-Contracts.md §7`:

> Generator **MUST** encode output contract version in generated metadata.
> Breaking output changes **MUST** require contract version increment.
> Mapping metadata **SHOULD** include advisory-vs-effective mapping outcomes for traceability.

### What the implementation does

`AnQstGen/src/emit.ts` `withBuildStamp()` embeds a build stamp (`Built by AnQst <stamp>`) in generated files. This is a build identity marker, not a contract version. No contract version field appears in any generated artifact. There is no mechanism to increment a contract version on breaking changes.

---

## GAP-D09 — `Call<T>` with no-handler rejection not specified in generated Qt API

**Severity: Medium**

### What the spec says

`RefinedSpecs/02-Interaction-Semantics.md §3.1`:

> If no handler exists at invocation time: `Call<T>` MUST reject with `HandlerNotRegisteredError`.

### What the implementation does

The generated C++ `handleGeneratedCall()` in `renderCppStub()` dispatches through the bridge's `m_callHandler`. If no handler was ever set (null `std::function`), the behavior is undefined in C++ (calling a null `std::function` throws `std::bad_function_call`). The spec requires a deterministic `HandlerNotRegisteredError` rejection path.

---

## GAP-D10 — Namespace import prohibition not documented in main DSL spec

**Severity: Low**

### What the spec says

`RefinedSpecs/01-DSL-Structure-and-Validity.md` does not explicitly list `import * as X` as invalid. The document's import section only covers general resolution rules.

### What the implementation enforces

`AnQstGen/src/parser.ts` `parseImportedTypeDecls()`:

```typescript
} else if (bindings && ts.isNamespaceImport(bindings)) {
  throw new VerifyError(
    "Namespace imports ('import * as X') are not allowed in AnQst spec files.",
    ...
  );
}
```

This is an enforced restriction with no backing documentation in the DSL spec. It would surprise users who try a namespace import pattern.

---

## GAP-D11 — `instill` name-conflict prompt behavior undocumented

**Severity: Low**

### What the spec says

`WorkFlowExample.md`:

> If the existing `declare namespace ...` differs from the command argument widget name, instill prompts for which name to use.

### What the implementation adds

`AnQstGen/src/project.ts` `chooseWidgetNamePreference()` also supports:

- `ANQST_INSTILL_WIDGET_NAME_CHOICE` environment variable (`"argument"` or `"namespace"`) to bypass the prompt
- Non-TTY stdin detection that silently defaults to the argument name

Neither the env var nor the non-interactive fallback behaviour is documented anywhere.

---

## GAP-D12 — `tsc` backend's AngularService exclusion not documented for users

**Severity: Low**

### What the spec says

User-facing documentation (`WorkFlowExample.md`, `README.md`, `Overview.md`) does not mention that `--backend tsc` disables the `AngularService` generation target.

### What the implementation enforces

`AnQstGen/src/app.ts` `generationTargetsForBackend()`:

```typescript
if (backendId !== "tsc") return targets;
return {
  emitQWidget: targets.emitQWidget,
  emitAngularService: false,   // forcibly disabled
  emitNodeExpressWs: targets.emitNodeExpressWs
};
```

This only appears in `QtWidgetDebugSpec/02-Current-Architecture-Spec-TSC-QtWidget.md §1`, which is a debug-session-only document, not user-facing documentation.
