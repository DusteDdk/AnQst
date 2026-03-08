# Architectural Overhaul Plan: TSC-Only Backend

## Goal

Deprecate and remove the `ast` backend. Establish the TSC backend as the single, unified pipeline for all generation targets, including Angular services.

## Documents

1. **`01-Current-State.md`** — precise map of the current two-backend structure and its problems
2. **`02-Target-Architecture.md`** — the clean target design: one pipeline, no backend abstraction
3. **`03-Migration-Phases.md`** — phased, safe migration steps with explicit contracts per phase
4. **`structure-diagram.html`** — side-by-side Mermaid diagrams: current vs target file structure and data flow

## Why Now

- The TSC backend produces strictly better output: TypeChecker-resolved types handle `z.infer<>`, deep generics, and aliased imports correctly where the AST parser produces raw text.
- The only thing the AST backend offered was speed at the cost of correctness. That trade-off is not worth maintaining two codepaths.
- The Angular service generation gap (GAP-D12 in `GapAnalysis/`) exists entirely because of the backend split. Removing the split removes the gap.
- `anqst test` currently uses the AST backend, meaning it can pass specs that the TSC backend would reject on type errors. This is a correctness hole.

## Non-Goals

- No changes to generated artifact shape (same `emit.ts` logic, same output files).
- No changes to `package.json` `AnQst` config format.
- No changes to the C++ host base (`AnQstWebBase`).
- No new features in this overhaul — only structural simplification.
