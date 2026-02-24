# AnQst Project Overview

This is a quick map of the project root so you can find the right place fast.

## Start Here

- `WorkFlowExample.md`  
  End-to-end developer flow (bootstrap, spec authoring, verify/build behavior).
- `spec/AnQst-Main-Spec.md`  
  Main product/CLI behavior notes and near-term targets.
- `AnQstGen/README.md`  
  How to build and use the generator CLI.

## Intended Structure

- `AnQstGen/`  
  Installable npm package exposing the `anqst` CLI (`npx anqst ...`).
- `AnQstWidget/AnQstWebBase/`  
  Linkable C++/Qt base host library (`anqstwebhostbase`) for generated widgets.
- `Examples/`  
  Integration examples (webapp specs + generated outputs + Qt demo consumer).

## Phase Status Snapshot

- **PHASE-1:** Complete (host lifecycle, bridge channels, diagnostics, local-only policy are implemented and tested).
- **PHASE-2:** Complete (AnQst behavior mapping into generated Angular runtime/service layer is implemented).
- **PHASE-3:** Complete (generated C++ widget output is host-derived, bridge-wired, and used by the `AnQstWebBase` demo app).
- **PHASE-4:** Partial (host/runtime tests are strong, but generated-widget + host integration contract tests are still missing).

## Core Implementation

- `AnQstGen/src/`  
  TypeScript implementation of the `AnQst` CLI and generator.
  - `app.ts`: command entry logic (`instill`, `test`, `build`, `generate`, `verify`)
  - `project.ts`: npm project bootstrap/config (`package.json` patching, spec lookup)
  - `parser.ts` + `verify.ts`: DSL parsing and validation
  - `emit.ts`: generated artifact emission + install-to-`src/anqst-generated` + Qt integration entrypoint emission (`anqst-cmake/CMakeLists.txt`)

## Specs and Language Definition

- `spec/AnQst-Spec-DSL.d.ts`  
  Canonical DSL type surface (`AnQst.Service`, `Call`, `Slot`, `Input`, `Output`, etc.).
- `spec/AnQst-Main-Spec.md`  
  Main behavioral spec for bootstrap/input/command expectations.

## Examples / Playground

- `Examples/example_comprehension_proof/`  
  Main playground example for spec-to-output comprehension.
  - `SingleCdEntryEditorSpec.AnQst.d.ts`: concrete input spec
  - `SingleCdEntryEditorSpec.md`: narrative companion doc
  - `generated_output/` (when generated): expected raw outputs
- `Examples/full_workflow_example/`
  Full Angular widget example running the complete flow:
  - Angular app scaffold
  - `anqst instill` + `anqst build` integration
  - generated install target under `src/anqst-generated/`
  - strict build/runtime verification report in `VERIFICATION.md`

## Refined Design Docs

- `RefinedSpecs/`  
  Deeper design/contract docs used to guide implementation:
  - `01-DSL-Structure-and-Validity.md`
  - `02-Interaction-Semantics.md`
  - `03-Generator-Output-Contracts.md`
  - `04-Canonical-UserManagement-Example.md`

## Tests

- `AnQstGen/test/`
  - `cli.test.ts`: command behavior and integration-ish flows
  - `parser_verify.test.ts`: parser/verification expectations
  - `emit.test.ts`: generated output shape checks

## Historical / Underspecified Notes

- `underspecced/`  
  Archived earlier wording for docs that were aligned to implemented behavior:
  - `underspecced/WorkFlowExample.md`
  - `underspecced/AnQst-Main-Spec.md`
