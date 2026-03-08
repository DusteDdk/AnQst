# Implementation Stronger Than Documentation

These are areas where the implementation has functionality, APIs, or behaviors that the documentation does not describe.

---

## GAP-I01 — `node_express_ws` target: complete but undocumented

**Severity: High**

### What exists in the implementation

`AnQstGen/src/emit.ts` `renderNodeExpressWsIndex()` generates a complete Node.js + Express + WebSocket server bridge with:

- Per-session connection state (`AnQstSessionBridge` class)
- Per-service typed handler interfaces (`${ServiceName}NodeHandlers`)
- Typed session bridge with `Slot` invoke helpers, `Output` setters, `Input` accessors, `Emitter` signal subscriptions
- Structured diagnostic subscription API (`onDiagnostic(handler)`)
- Session reconnection / "widget reattach" flow
- `HandlerNotRegisteredError`, `CallHandlerError`, `EmitterHandlerError` diagnostic codes
- `/config` HTTP endpoint for WebSocket URL bootstrap
- `defaultSlotTimeoutMs` configuration

### What the docs say

`Overview.md`: mentions `node_express_ws` as a commented-out default (`"//node_express_ws"`).
`WorkFlowExample.md`: no mention.
No document describes the generated Node bridge API surface, the session model, diagnostic subscription, or how to use it.

---

## GAP-I02 — Qt Designer plugin generation (`--designerplugin`)

**Severity: High**

### What exists in the implementation

`AnQstGen/src/app.ts` `runBuild()` and `AnQstGen/src/emit.ts` `installQtDesignerPluginCMake()`:

- `--designerplugin` flag triggers CMake-based build of a Qt Designer plugin
- Generated plugin includes a preview widget with placeholder rendering for all service members (type-appropriate defaults: `QString`, `bool`, numeric types)
- `ANQST_WEBBASE_DIR` environment variable required for plugin build
- Binary placed in `anqst-cmake/build-designerplugin/`
- Install instructions emitted to stdout
- `widgetCategory` from `package.json` configures Qt Designer widget category

### What the docs say

Zero documentation. `--designerplugin` does not appear in `README.md`, `WorkFlowExample.md`, `Overview.md`, or any spec document.

---

## GAP-I03 — `AnQstWebHostBase` debug dialog and runtime debug plane

**Severity: High**

### What exists in the implementation

`AnQstWidget/AnQstWebBase/src/AnQstWebHostBase.h` and `AnQstWidgetDebugDialog`:

- `Shift+F12` keyboard shortcut activates an in-situ debug dialog
- Debug dialog has three resource provider modes: **QRC**, **Filesystem directory**, **HTTP URL**
- Two app host modes: **Application** (embedded `QWebEngineView`) and **Browser** (opens OS browser + shows placeholder)
- LAN access toggle (`setDevelopmentModeAllowLan`)
- `developmentModeEnabled(const QString& url)` signal on mode activation
- Debug state machine with `applyDebugStateChange`, `applyApplicationHostState`, `applyBrowserHostState`
- `AnQstWidgetDebugDialog.ui` — a full Qt Designer UI form

### What the docs say

`AnQstWidget/AnQstWebBase/README.md` mentions `enableDebug()` and switching to HTTP/WS dev flow. It does not describe the keyboard shortcut, the debug dialog, resource provider modes, LAN toggle, or browser host mode.

`QtWidgetDebugSpec/03-QtWidget-Debug-Reality-Today.md §3` describes `enableDebug()` and transport fallback but explicitly acknowledges the debug contract is "not unified" and pending specification.

---

## GAP-I04 — `AnQstHostBridgeFacade` — bridge dispatch architecture

**Severity: Medium**

### What exists in the implementation

`AnQstWidget/AnQstWebBase/src/AnQstHostBridgeFacade.h`:

A dedicated `QObject` (`AnQstHostBridgeFacade`) owns all bridge dispatch logic:
- Generic `CallHandler`, `EmitterHandler`, `InputHandler` function types
- Slot FIFO queue with per-slot registration tracking
- Slot invocation response synchronization with timeout
- `dispatchEnabled` state gate (used during bootstrap)
- `emitOutputSnapshot()` for pushing all current output values after bridge is ready
- Routing by `(service, member)` string pair

`AnQstBridgeProxy` (`AnQstBridgeProxy.h`) is a separate thin `QObject` registered with `QWebChannel` to avoid property-without-NOTIFY warnings.

### What the docs say

No specification document describes the `AnQstHostBridgeFacade` / `AnQstBridgeProxy` split, the generic handler dispatch pattern, or the output snapshot mechanism. The `RefinedSpecs` describe the _contract_ but say nothing about internal decomposition.

---

## GAP-I05 — `Output<T>` C++ API generates both `setXxx` and `publishXxx`

**Severity: Medium**

### What exists in the implementation

`AnQstGen/src/emit.ts` `renderWidgetHeader()` and `renderCppStub()`:

For each `Output<T>` member, two public methods are generated:

```cpp
void setActiveUsers(const double& value);    // Q_PROPERTY setter
void publishActiveUsers(const double& value); // explicit publish helper
```

`publishXxx` calls `setXxx` internally and is provided as a semantic alias. The C++ `set` method also calls `setOutputValue(...)` to push the value into the bridge for the Angular side.

### What the docs say

`RefinedSpecs/04-Canonical-UserManagement-Example.md §4` shows only `setActiveUsers`. No document mentions the `publishXxx` convenience method.

---

## GAP-I06 — `AnQstBridgeRuntime` Angular service: reconnection and reattach flow

**Severity: Medium**

### What exists in the implementation

`AnQstGen/src/emit.ts` `renderTsServices()` — the `WebSocketBridgeAdapter`:

- On WebSocket message `type: "widgetReattached"`, the page sets `document.body.textContent = "Widget Reattached"` and then calls `window.location.reload()`
- `WebSocketBridgeAdapter.create()` fetches `/config` endpoint for `wsUrl`/`wsPath` before connecting
- Slot registration is replayed after bridge reconnect (`for (const key of this.slotHandlers.keys()) { ... adapter.registerSlot(...) }`)

### What the docs say

`RefinedSpecs/03-Generator-Output-Contracts.md §3.2` says:

> Generated bridge runtime MUST support both QWebChannel transport and development WebSocket bridge transport.

It says nothing about reconnection semantics, the `/config` endpoint, the page-reload-on-reattach behavior, or slot handler replay.

---

## GAP-I07 — `clean` command

**Severity: Medium**

### What exists in the implementation

`AnQstGen/src/app.ts` `runClean()`:

- `anqst clean <path>` removes `generated_output`, `src/anqst-generated`, `anqst-cmake`
- Without `--force`, reads `package.json` to resolve the widget name and clean widget-specific subdirectories only
- With `--force`, removes the broad set of directories unconditionally
- Produces a structured clean summary report

### What the docs say

The `clean` command appears in the CLI help output and is listed in `renderHelp()` in `app.ts`, but it does not appear in `WorkFlowExample.md`, `README.md`, or `Overview.md`.

---

## GAP-I08 — `install` → `instill` alias with colored terminal message

**Severity: Low**

### What exists in the implementation

`AnQstGen/src/app.ts` `runCommand()`:

```typescript
const normalizedCommand = command === "install" ? "instill" : command;
if (command === "install") {
  console.log(renderInstallAliasMessage());
}
```

`renderInstallAliasMessage()` emits an orange-colored ANSI message on TTY:

> [AnQst] 'install' spotted. Muscle memory is undefeated - running 'instill' for you.

### What the docs say

Not documented anywhere. This is entirely undocumented behavior.

---

## GAP-I09 — PNG icon embedding in generated Qt widget

**Severity: Low**

### What exists in the implementation

`AnQstGen/src/emit.ts` imports `pngjs`. `generateOutputs()` accepts optional `iconPng` and `iconIco` buffers and embeds them in the Designer plugin CMake output. The emit test suite (`emit.test.ts`) uses `createSolidPng` and `createIcoFromPng` helpers to exercise icon handling.

### What the docs say

No documentation mentions widget icons, `.ico` files, or PNG embedding.

---

## GAP-I10 — Build stamp embedded in all generated artifacts

**Severity: Low**

### What exists in the implementation

`AnQstGen/src/emit.ts` `withBuildStamp()`:

Every generated file (`.h`, `.cpp`, `.ts`, `.cmake`, `.qrc`, `.json`) receives a comment or metadata entry: `Built by AnQst <stamp>`. The stamp is sourced from `ANQST_BUILD_STAMP` env var or `.anqstgen-version-active.json`.

### What the docs say

No documentation describes the build stamp mechanism, the stamp file format, or how to control the stamp.

---

## GAP-I11 — `AngularHTTPBaseServerClass` development transport behaviour

**Severity: Low**

### What exists in the implementation

`AnQstGen/src/parser.ts`:

When a service extends `AnQst.AngularHTTPBaseServerClass`, `supportsDevelopmentModeTransport = true` is set on `ParsedSpecModel`. This flag is emitted into the generated `package.json`:

```json
"anqst": {
  "supportsDevelopmentModeTransport": true
}
```

`AnQstGen/src/emit.ts` `renderTsServices()` includes conditional behavior based on `spec.supportsDevelopmentModeTransport`.

### What the docs say

`RefinedSpecs/01-DSL-Structure-and-Validity.md §3` says `AnQst.AngularHTTPBaseServerClass` is "a capability marker for generation/runtime mode" but does not describe what it actually changes in the generated output or how the flag propagates.
