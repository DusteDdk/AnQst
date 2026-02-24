# AnQst
AnQst is a code-generator that allows Angular developers to write Widgets for use in Qt applications.

# Bootstrap
When running `anqst instill <widgetName>` in a directory, AnQst looks for `package.json`.
- Not found, exit with message: "No package.json: Can only instill AnQst inside an npm project."
- Found:
  - Key "AnQst" present, exit with message: "AnQst already instilled, did you mean to run 'npx anqst build'?"
  - Key "AnQst" not present:
    - Add key `"AnQst": { "spec": "<widgetName>.AnQst.d.ts" }` to `package.json`
    - Enrich `package.json` build so first command run is `npx anqst build`
    - Enrich `package.json` test so first command run is `npx anqst test`
    - Install project-local `anqst-dsl/AnQst-Spec-DSL.d.ts`
      - Exposes DSL helpers for specifying the widget.
    - Create `<widgetName>.AnQst.d.ts` scaffold in project root.
      - Scaffold import must be local-relative (`./anqst-dsl/AnQst-Spec-DSL`).

## Host bridge bootstrap contract

- Angular apps generated/used with AnQst must not include Qt bridge scripts manually
  (for example `<script src="qrc:///qtwebchannel/qwebchannel.js"></script>`).
- `AnQstWebHostBase` owns bridge bootstrap injection and must provide `QWebChannel`
  before application scripts execute.
- Missing host bootstrap is a runtime contract violation and should surface as a
  hard runtime error/diagnostic instead of silent fallback behavior.


# Input
AnQst reads `package.json` in its current working directory and finds the key `"AnQst"`.

- `anqst test`
  - Reads `package.json.AnQst.spec`.
  - Verifies the referenced spec.
- `anqst build`
  - Reads `package.json.AnQst.spec`.
  - Generates raw output to `generated_output/`.
  - Installs generated TypeScript artifacts to `src/anqst-generated/`.
  - Keeps C++ output under `generated_output/cpplibrary/`.
  - Writes a Qt-consumer CMake entrypoint to `anqst-cmake/CMakeLists.txt`.
  - If `angular.json` exists, runs production Angular build and embeds resulting web assets into generated widget library resources (`<WidgetName>.qrc` + `webapp/*`).
- `anqst generate <specFile>`
  - Generates raw output only (no install step).

## 9) Concrete target features (project not done yet)

These are implementation targets for upcoming iterations.
They do not override canonical semantics, but they define concrete deliverables.

### A) CLI stabilization

Target:

- finalize command behavior for `instill`, `build`, `test`, and `generate`.
- define deterministic exit-code contract.

Acceptance criteria:

- documented command matrix with success/failure examples.
- stable exit code table referenced by CI.
- one golden integration test per command path.

### B) Bootstrap output contract

Target:

- make bootstrap side effects deterministic and inspectable.

Acceptance criteria:

- `package.json` patch behavior is idempotent.
- script injection order is deterministic and tested.
- generated widget spec scaffold is created with canonical naming.

### C) Type-only generation parity

Target:

- ensure model generation works when no services are declared.

Acceptance criteria:

- generator emits TS and C++ model outputs for namespace-local declarations.
- transitive import resolution is tested with fixture coverage.
- unresolved import path fails with actionable diagnostics.

### D) Advisory mapping observability (`AnQst.Type.*`)

Target:

- expose advisory-vs-effective mapping outcomes in artifacts and diagnostics.

Acceptance criteria:

- advisory mismatch emits deterministic reason code.
- metadata includes source path, requested mapping, effective mapping.
- docs include at least one successful and one fallback example.

### E) Runtime diagnostics channel

Target:

- provide a non-throwing diagnostic stream for bridge-level failures.

Acceptance criteria:

- `Emitter`/`Input`/`Output` transport failures are observable.
- diagnostic identifiers align with interaction/output contract docs.
- at least one consumer example shows subscription and handling.

### F) Contract versioning discipline

Target:

- enforce output contract version stamping and breaking-change policy.

Acceptance criteria:

- generated metadata contains contract version.
- CI check blocks breaking output diffs without version bump.
- release notes template includes contract change section.

## 10) Near-term delivery plan (suggested)

- Milestone 1: CLI matrix + idempotent bootstrap
- Milestone 2: type-only generation parity + diagnostics catalog
- Milestone 3: advisory mapping metadata + runtime diagnostics stream
- Milestone 4: versioned contract governance in CI
