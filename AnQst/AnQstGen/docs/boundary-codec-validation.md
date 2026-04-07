# Boundary Codec Validation

## What Was Validated

- Planning precedes emission
- Strongly typed nested structs do not emit standalone sub-codecs
- Unsupported shapes fail instead of degrading to a generic fallback
- Generated codecs look boundary-specific rather than framework-like
- Runtime helper emission is trimmed to actual plan needs

## Code Evidence

- `generateOutputs()` builds `const codecCatalog = buildBoundaryCodecCatalog(spec);` before any TS, C++, or node emitter runs.
- `buildBoundaryCodecCatalog()` writes debug artifacts to `codecs/boundary-transport-analysis.txt` and `codecs/boundary-plans.txt`, making plans inspectable before rendering.
- `test/boundary-codecs.test.ts` inspects `catalog.plans` directly before calling `generateOutputs()`.
- `test/boundary-codecs.test.ts` asserts that generated TS and node output no longer contain `__anqstNamed_` helpers.
- `test/boundary-codecs.test.ts` now asserts that unsupported unions throw a planner diagnostic instead of degrading.
- `test/emit.test.ts` validates the rendered TS, C++, and node integration points produced by the new boundary-plan pipeline.

## Emission Evidence

The generated code now contains direct plan-shaped operations such as:

- `value.album` and `value.tracks` writes into region-specific accumulators
- explicit array-count handling
- explicit optional-presence handling
- direct `decodeAnQstStructured_*` and `encodeAnQstStructured_*` calls at service boundaries

The generated code no longer looks like a reusable nested codec framework for non-boundary structs.

## Verification Commands

The replacement was verified with these commands:

- `npm run build:test`
- `node --test dist/test/boundary-codecs.test.js dist/test/emit.test.js`
- `npm test`

## Command Results

- `npm run build:test`: passed
- `node --test dist/test/boundary-codecs.test.js dist/test/emit.test.js`: passed, 11 tests
- `npm test`: passed, 147 tests
