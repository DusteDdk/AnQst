# Gap Matrix

Consolidated view of all identified gaps. Each row links to the detailed entry in `01-Doc-Stronger-Than-Impl.md` or `02-Impl-Stronger-Than-Doc.md`.

## Legend

- **Direction** — `Doc > Impl` = spec mandates something not done; `Impl > Doc` = implementation does something undocumented
- **Severity** — Critical / High / Medium / Low
- **Layer** — where in the stack the gap lives

---

## Full Gap Table

| ID | Direction | Severity | Layer | Summary |
|---|---|---|---|---|
| GAP-D01 | Doc > Impl | **Critical** | C++ Generated API | `Call<T>` uses handler-based pattern; spec mandates Qt signal with callback argument |
| GAP-D02 | Doc > Impl | **Critical** | C++ Generated API | `Emitter` uses handler-based pattern; spec mandates Qt signal |
| GAP-D03 | Doc > Impl | **Critical** | Generator / Diagnostics | `AnQst.Type.*` advisory-mismatch diagnostics never emitted |
| GAP-D04 | Doc > Impl | **High** | Host Runtime | Slot queue limit is 10M; spec says 1024 |
| GAP-D05 | Doc > Impl | **High** | Bridge / Error handling | `SerializationError`, `DeserializationError`, `BridgeDisconnectedError`, `BridgeTimeoutError` not used as named identifiers |
| GAP-D06 | Doc > Impl | **High** | TS Generated API | `Output<T>` missing `set.prop()` in generated TypeScript service surface |
| GAP-D07 | Doc > Impl | **Medium** | Generator / Verification | C++ and TypeScript keyword collision detection absent |
| GAP-D08 | Doc > Impl | **Medium** | Generator / Metadata | Output contract version not encoded; build stamp ≠ contract version |
| GAP-D09 | Doc > Impl | **Medium** | C++ Generated API | No `HandlerNotRegisteredError` path when C++ call handler is null |
| GAP-D10 | Doc > Impl | **Low** | DSL Parsing | `import * as X` prohibition enforced but not documented in DSL spec |
| GAP-D11 | Doc > Impl | **Low** | CLI / instill | `ANQST_INSTILL_WIDGET_NAME_CHOICE` env var and non-TTY fallback undocumented |
| GAP-D12 | Doc > Impl | **Low** | CLI / Backend | `--backend tsc` disabling `AngularService` not in user-facing docs |
| GAP-I01 | Impl > Doc | **High** | node_express_ws | Complete Node/WS bridge target exists with session API, diagnostics, reconnect; zero user docs |
| GAP-I02 | Impl > Doc | **High** | CLI / Generator | `--designerplugin` flag and Qt Designer plugin generation entirely undocumented |
| GAP-I03 | Impl > Doc | **High** | Host Runtime | Debug dialog (Shift+F12), resource provider modes, LAN toggle, browser host mode undocumented |
| GAP-I04 | Impl > Doc | **Medium** | Host Runtime | `AnQstHostBridgeFacade` / `AnQstBridgeProxy` internal architecture not described |
| GAP-I05 | Impl > Doc | **Medium** | C++ Generated API | `publishXxx()` convenience method generated for `Output<T>` but not in any spec |
| GAP-I06 | Impl > Doc | **Medium** | TS Generated Runtime | Widget reattach flow, `/config` endpoint bootstrap, slot replay on reconnect undocumented |
| GAP-I07 | Impl > Doc | **Medium** | CLI | `clean` command exists but absent from workflow and user docs |
| GAP-I08 | Impl > Doc | **Low** | CLI | `install` → `instill` alias with ANSI-colored message |
| GAP-I09 | Impl > Doc | **Low** | Generator / Designer | PNG/ICO icon embedding for Designer plugin not documented |
| GAP-I10 | Impl > Doc | **Low** | Generator / Metadata | Build stamp mechanism (`withBuildStamp`) not described |
| GAP-I11 | Impl > Doc | **Low** | DSL / Generator | `AngularHTTPBaseServerClass` flag effects on generated output not specified |

---

## Gaps by Severity

### Critical (3)

| ID | Summary |
|---|---|
| GAP-D01 | C++ `Call<T>`: spec=Qt signal w/ callback, impl=pre-registered handler |
| GAP-D02 | C++ `Emitter`: spec=Qt signal, impl=pre-registered handler |
| GAP-D03 | `AnQst.Type.*` advisory diagnostics: spec=MUST emit, impl=silent |

### High (6)

| ID | Summary |
|---|---|
| GAP-D04 | Slot queue limit: spec=1024, impl=10,000,000 |
| GAP-D05 | Error identifiers: 4 of the 6 standard error codes unused |
| GAP-D06 | `Output<T>` missing `set.prop()` on TS side |
| GAP-I01 | `node_express_ws` target completely undocumented |
| GAP-I02 | `--designerplugin` feature completely undocumented |
| GAP-I03 | Debug dialog (Shift+F12) and runtime debug modes undocumented |

### Medium (6)

| ID | Summary |
|---|---|
| GAP-D07 | No C++/TS keyword collision detection |
| GAP-D08 | Build stamp ≠ contract version; no contract versioning |
| GAP-D09 | Null C++ call handler → undefined behavior, not `HandlerNotRegisteredError` |
| GAP-I04 | `AnQstHostBridgeFacade` / `AnQstBridgeProxy` architecture undescribed |
| GAP-I05 | `publishXxx()` for `Output<T>` undocumented |
| GAP-I06 | Widget reattach and `/config` WebSocket bootstrap undocumented |
| GAP-I07 | `clean` command undocumented in user-facing materials |

### Low (7)

| ID | Summary |
|---|---|
| GAP-D10 | `import * as X` prohibition enforced but not documented |
| GAP-D11 | `ANQST_INSTILL_WIDGET_NAME_CHOICE` env var undocumented |
| GAP-D12 | `--backend tsc` disabling `AngularService` not in user docs |
| GAP-I08 | `install`→`instill` alias undocumented |
| GAP-I09 | Icon embedding undocumented |
| GAP-I10 | Build stamp mechanism undocumented |
| GAP-I11 | `AngularHTTPBaseServerClass` flag effects unspecified |

---

## Priority Remediation Order

If addressing these gaps, suggested order:

1. **GAP-D01 / GAP-D02** — Resolve the C++ `Call<T>` and `Emitter` API shape. Either update the spec to match the handler pattern, or change the generator to emit Qt signals. This is the single largest contract mismatch and blocks any parent app written against the spec.

2. **GAP-D06** — Add `set.prop()` for `Output<T>` to the generated TS service, or update the spec to say `Output` does not get a `set.xxx` entry. The canonical example and the spec disagree with the implementation.

3. **GAP-D03** — Wire advisory-mismatch diagnostics into the emit pipeline so `AnQst.Type.*` mismatches produce actionable output.

4. **GAP-I01 / GAP-I02 / GAP-I03** — Write user documentation for the three major undocumented features: `node_express_ws`, `--designerplugin`, and the runtime debug dialog.

5. **GAP-D04** — Reconcile queue size (decide whether 1024 or 10M is correct and update the other).

6. **GAP-D07 / GAP-D08** — Keyword collision checking and proper contract versioning.
