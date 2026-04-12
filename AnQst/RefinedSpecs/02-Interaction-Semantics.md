# AnQst Interaction Semantics

## 1. Purpose

This document defines runtime interaction contracts between:

- Browser widget runtime (generated TypeScript or JavaScript APIs),
- Bridge layer,
- Generated Qt widget class.

Normative keywords: **MUST**, **MUST NOT**, **SHOULD**, **MAY**.

## 2. Directional Model

- `Call<T>`: Widget -> Parent (async request/reply).
- `Slot<T>`: Parent -> Widget (request/reply).
- `Emitter`: Widget -> Parent (fire-and-forget event).
- `Output<T>`: Parent -> Widget (reactive state push).
- `Input<T>`: Widget -> Parent (reactive state push).

## 3. Handler Lifecycle

## 3.1 Call handlers (parent side)

- For each `method(args): Call<T>`, parent has one active callback slot.
- Registration API is generated as `widget->handle.methodName(handler)`.
- Registering a new handler REPLACES the previous handler.
- If no handler exists at invocation time:
  - call MUST queue per endpoint (FIFO) until a handler appears.
  - queue limit is 1024 entries per endpoint.
  - overflow drops oldest and keeps newest.

## 3.2 Slot handlers (widget side)

- Widget side registers via generated `onSlot.method(handler)` API when the service declares `Slot` members (the `onSlot` namespace is not emitted when there are no slots).
- Exactly one active handler per slot method.
- Re-registering MUST replace active handler atomically.

### 3.2.1 Slot pre-registration queue

- Calls arriving before first handler registration MUST be queued FIFO.
- Default queue size limit: 1024 calls per slot.
- On overflow, oldest queued entry is dropped and a `SlotQueueOverflowError` diagnostic MUST be emitted.
- After first handler registration, queued calls MUST drain in FIFO order using current handler.

## 4. Per-Construct Contracts

## 4.1 `Call<T>`

### Invocation
- TS generated signature: `method(args): Promise<T>`.
- Widget invocation sends one request envelope with correlation id.

### Completion
- Parent handler success resolves Promise with serialized `T`.
- Parent handler failure rejects Promise with propagated error payload.

### Ordering
- Per-method ordering is preserved for request dispatch.
- Reply ordering MAY differ due to async completion.

## 4.2 `Slot<T>`

### Invocation
- Parent calls generated Qt method `method(args)`.
- Bridge dispatches to widget slot handler.

### Completion
- `Slot<T>` returns `T` to parent.
- `Slot<void>` is valid and returns completion only (no payload).
- Generated C++ slot methods expose no explicit error out-parameters.
- Slot failures use exceptional control flow:
  - timeout -> `std::runtime_error("[Timeout] <service>.<member>: The webapp inside the widget did not anwser within <timeout> ms.")`
  - non-timeout failure -> `std::runtime_error("[RequestFailed]: <TS MESSAGE>")`
- Default Slot timeout is `1000ms`.

### Missing handler behavior
- Before first registration: queue (Section 3.2.1).
- After at least one registration, if handler is temporarily absent due to replacement race, bridge MUST queue with same policy.

## 4.3 `Emitter`

### Invocation
- TS generated signature: `method(args): void`.
- Event is emitted to parent without reply channel.

### Completion and failure
- Caller returns immediately.
- Delivery failure MUST NOT throw to caller; MUST emit bridge diagnostic event.

## 4.4 `Output<T>`

### Meaning
- Parent-authored value exposed to widget as reactive readonly signal-like property.

### Behavior
- Parent set operation updates Qt-side property storage.
- Bridge pushes new value to widget service store.
- Widget observable/signal emits change to subscribers.

### Generated surface
- Widget side:
  - readonly getter signal/value accessor: `prop() -> T`.
  - convenience setter API namespace: `set.prop(value: T): void`.
- Parent side:
  - read/write property on generated widget.

## 4.5 `Input<T>`

### Meaning
- Widget-authored value exposed to parent as mirrored widget property.

### Behavior
- Widget calls `set.prop(value)` to publish value.
- Bridge writes value to Qt-side property storage.
- Parent may read current property value and subscribe to change signal.

### Generated surface
- Widget side:
  - readonly accessor: `prop() -> T`.
  - setter API: `set.prop(value: T): void`.
- Parent side:
  - read/write-compatible property endpoint for integration symmetry.

## 5. Error Contract

Standard bridge error identifiers:

- `HandlerNotRegisteredError`
- `SerializationError`
- `DeserializationError`
- `SlotQueueOverflowError`
- `BridgeDisconnectedError`

Rules:

- `Call`: errors reject Promise.
- `Slot`: parent call throws `std::runtime_error` on failure per Section 4.2.
- `Emitter`, `Input`, `Output`: errors are diagnostic events and MUST NOT hard-crash caller by default.

## 6. Timeouts and Cancellation

- `Call<T>` timeout config is optional:
  - `AnQst.Call<T, { timeoutSeconds: N }>`
  - `AnQst.Call<T, { timeoutMilliseconds: N }>`
- exactly one timeout key is allowed, integer `>= 0`, max `2147483647`.
- Default `Call` timeout is 120 seconds.
- `Call` timeout `0` means wait forever.
- `Emitter` has no timeout config.
- Cancellation tokens are out of scope for this revision.

## 7. Deterministic Mapping Summary

- Interaction kind fully determines direction and completion model.
- Method parameters define request payload schema.
- Generic `T` defines reply/state payload schema when applicable.
- `Emitter` has no generic; payload is method parameter tuple only.
- `AnQst.Type.*` directives influence payload mapping preferences only; they do not change interaction direction, lifecycle, or completion semantics.
- If advisory mapping cannot be honored for a payload position, runtime behavior remains unchanged and a deterministic advisory-mismatch diagnostic MUST be emitted.

## 8. Call/Emitter Overhaul Addendum (Authoritative)

This addendum supersedes conflicting statements above for `Call<T>` and `Emitter`.

### 8.1 `Call<T>` runtime contract

- Parent integration uses callback registration, not Qt signal + reply object.
- Generated C++ registration surface:
  - `widget->handle.methodName(handler);`
- Handler form is synchronous return only:
  - `T handler(args...)`
- Success resolves Promise payload-only (`Promise<T>` resolves to `T`).
- Failure rejects with plain object containing mandatory keys:
  - `code`, `message`, `service`, `member`, `requestId`.
- Queueing:
  - if no callback is registered, call is queued per `(service,member)` endpoint (FIFO).
  - queue limit is 1024 per endpoint; overflow drops oldest and keeps newest.
- Disconnect:
  - pending and queued calls reject with `BridgeDisconnectedError`.
  - rejected/disconnected calls are not replayed on reconnect.

### 8.2 `Emitter` runtime contract

- `Emitter` uses Qt signal emission on the generated widget.
- Signal names are natural (`methodName`), not `signal_`-prefixed.
- Generated `Slot<T>` C++ methods keep `slot_` prefix and are emitted under `public slots:`.
- Generated widget class name is `${WidgetName}Widget` and is emitted outside the widget namespace.
- If listener exists, dispatch is immediate.
- If no listener, event is dropped immediately.
- `Emitter` has no timeout config (`AnQst.Emitter` only).

