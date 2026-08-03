# Runtime behavior compatibility baseline

The existing native characterization suite is the executable baseline. Stage 0 does not duplicate those tests; this matrix identifies the assertions that later stages must keep passing.

| Behavior | Existing characterization |
|---|---|
| Call dispatch and return value | `bridge Call handler is invoked` |
| Emitter and Input forwarding | `bridge Emitter and Input handlers are forwarded` |
| Emitter/Input exception diagnostics | `facade emitter handler failures emit diagnostics without throwing`; `facade input handler failures emit diagnostics without throwing` |
| Slot registration queue and successful reply | `Slot queueing dispatches when handler is registered` |
| Slot registration timeout | `facade distinguishes slot registration timeout diagnostics` |
| Slot reply timeout | `facade distinguishes slot reply timeout diagnostics` |
| Queueing while bridge dispatch is unavailable | `Slot invocation queues across bridge readiness loss` |
| Output publication and reload snapshot | `Output value emits through bridge signal when host is ready`; `Output snapshot replays when ready host finishes loading again` |
| WebSocket handshake and output snapshot | `Output snapshot replays to development WebSocket client on handshake` |
| Hover payload, service/member and coordinates | `hover targets preserve tagged drag-drop payload text after validating array carriers` |
| Invalid drop diagnostics | `drop targets reject legacy object MIME payloads with diagnostics` |
| Host diagnostics | Tests tagged `[diagnostics]`, plus bootstrap, policy, load, JavaScript-console, certificate and renderer-error cases |
| WebChannel endpoint/bootstrap | Tests for custom bridge registration, bootstrap installation/reinstallation, script presence and embedded loading |
| WebSocket framing/transport | Output-handshake test and tests tagged `[websocket]`, including split upgrade headers and proxy forwarding |

All names above are `TEST_CASE` names in `AnQstWidget/AnQstWebBase/tests/test_AnQstWebHostBase.cpp`. The frozen payload names and field order are separately captured in `public-contract/wire-contract.json`.

The TypeScript tests provide the executable codec and generated-runtime baseline:

- `deep-structured-codec-interop.test.ts`: TypeScript/C++ round trips.
- `boundary-codecs.test.ts`: plans, finite domains, bigint, recursive types and carrier selection.
- `base93.test.ts`: binary encoding vectors and TypeScript/C++ agreement.
- `emit.test.ts`: generated API and implementation shapes across targets.
- `cli.test.ts`: complete generation/build command behavior.
