# AnQst Project Overview

This is a quick map of the project root so you can find the right place fast.

## Start Here

- `WorkFlowExample.md`
  End-to-end developer flow (bootstrap, spec authoring, verify/build behavior).
- `AnQstGen/spec/AnQst-Spec-DSL.md`
  Canonical source-of-truth of the AnQst Specification Domain Specific Language (AnqstSpec)
- `AnQstGen/README.md`
  How to build and use the generator CLI.

## Intended Structure

- `AnQstGen/`  
  Installable npm package exposing the `anqst` CLI (`npx anqst ...`).
- `AnQstWidget/AnQstWebBase/`  
  Linkable C++/Qt base host library (`anqstwebhostbase`) for generated widgets.
- `Examples/`  
  Integration examples (webapp specs + generated outputs + Qt demo consumer).


## Core Implementation

- `AnQstGen/src/`  
  TypeScript implementation of the `AnQst` CLI and generator.
  - `app.ts`: command entry logic (`instill`, `test`, `build`, `generate`, `verify`)
  - `project.ts`: npm project bootstrap/config (`package.json` patching, spec lookup)
  - `parser.ts` + `verify.ts`: DSL parsing and validation
  - `emit.ts`: generated artifact emission + install-to-`src/anqst-generated` + Qt integration entrypoint emission (`anqst-cmake/CMakeLists.txt`)

## Specs and Language Definition
- `AnQstGen/spec/AnQst-Spec-DSL.d.ts`  is the canonical source of truth for the AnQst-Spec language.
- `AnQstGen/spec/AnQst-Spec-DSL.d.ts` is considered read-only, and must only be updated with explicit permission.

## Refined Design Docs

- `RefinedSpecs/`  
  Deeper design/contract docs used to guide implementation
- `QtWidgetDebugSpec/`
  - Descriptions relating to the behavior of the debug mode which allows Web developers to use usual development workflow in-situ (browsers debug tools + ng serve)

## Tests

- `AnQstGen/test/`
  - `cli.test.ts`: command behavior and integration-ish flows
  - `parser_verify.test.ts`: parser/verification expectations
  - `emit.test.ts`: generated output shape checks

