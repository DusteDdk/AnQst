# Boundary Codec Refactor Execution Plan

## Replacement Order

The refactor was executed as a boundary replacement, not as a phased migration.

1. Define the new internal IR in `src/boundary-codec-model.ts`.
2. Replace code-first leaf ownership with capability descriptors in `src/boundary-codec-leaves.ts`.
3. Build `src/boundary-codec-analysis.ts` so transport analysis exists before any target emission.
4. Build `src/boundary-codec-plan.ts` so each boundary type receives a concrete whole-boundary plan.
5. Build `src/boundary-codec-render.ts` so TS and C++ codecs render directly from the plan.
6. Introduce `src/boundary-codecs.ts` as the integration point that builds the catalog, exposes site lookup, and exports debug summaries.
7. Rewire `src/emit.ts` to build one `BoundaryCodecCatalog` up front and pass it through every emitter that needs typed boundary transport.
8. Add regression coverage in `test/boundary-codecs.test.ts` and update `test/emit.test.ts` for the new rendered shape.
9. Delete `src/structured-top-level-codecs.ts` and remove the old structured-codec mental model completely.

## Non-Goals

- No compatibility layer for the old structured codec emitter
- No feature flag to choose old versus new architecture
- No preservation of previous internal helper shapes
- No preservation of old wire layout merely because it already existed

## Dependency Rationale

This order prevents emission code from remaining architecturally in charge. The renderer rewrite is intentionally late in the sequence so it consumes a finished planner rather than forcing the planner to mimic the old emitter-first model.
