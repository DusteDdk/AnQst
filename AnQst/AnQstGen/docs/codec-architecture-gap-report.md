# Codec Architecture Gap Report

## Scope

This report describes the mismatch between the removed structured-codec architecture and the required boundary-planner architecture now implemented in `AnQstGen`.

## Previous Architecture

The previous implementation centered strongly typed codec generation in `src/structured-top-level-codecs.ts`.

That module owned all of the following at once:

- Type resolution into `TypeShape` and `NamedShape`
- Transport analysis via `analyzeShape()`
- TypeScript helper naming and rendering
- C++ helper naming and rendering
- Per-site codec catalog construction

`src/emit.ts` then consumed that mixed catalog directly while generating TS, C++, and node outputs.

## Target Architecture

The corrected architecture separates responsibilities into explicit stages:

- `src/boundary-codec-leaves.ts`: leaf capability descriptors
- `src/boundary-codec-analysis.ts`: transport analysis from the resolved type graph
- `src/boundary-codec-plan.ts`: whole-boundary codec plan IR
- `src/boundary-codec-render.ts`: TS/C++ rendering of an already chosen plan
- `src/boundary-codecs.ts`: catalog construction, boundary site lookup, and debug-plan export

`src/emit.ts` now builds one `BoundaryCodecCatalog` up front and passes it into each renderer.

## Major Mismatches That Were Removed

### Early Emission Boundaries

`src/structured-top-level-codecs.ts` mixed analysis and source emission in the same module. Functions such as `emitTsCodec()` and `emitCppCodec()` consumed the same `TypeShape` tree that was also acting as the planner model. There was no explicit whole-boundary plan that could be inspected before code generation.

The replacement fixes this by making `buildBoundaryCodecCatalog()` create transport analyses and plans before any TS or C++ emission occurs.

### Wrong Abstraction Ownership

The removed module let leaf handling and recursive shape walking dictate layout details directly:

- booleans were serialized through the string lane
- arrays and optionals encoded their metadata inline during recursive emission
- nested named declarations owned helper identities through `NamedShape`

Those responsibilities now belong to the planner. Leaves only describe capabilities such as region, fixed-width status, packing options, and target materialization.

### Hidden Runtime Framework Behavior

The previous generator emitted framework-like helper fleets:

- `__anqstNamed_*` TS helper banks
- `anqstNamed_*` C++ helper banks
- generic recursive count walkers
- helper families emitted from reusable shape descriptors rather than a chosen boundary plan

That made generated codecs look like a mini runtime serialization system instead of type-specific transport code.

The replacement renders direct boundary codecs from `BoundaryCodecPlan` and only emits support helpers required by the set of plans in the catalog.

### Structural Identity Leakage

`NamedShape`, `collectNamedShapes()`, and the named encode/count/decode helper families preserved independent transport identity for non-boundary structs. Nested declarations were effectively treated as reusable standalone sub-codecs.

That violated the one-codec-per-boundary principle. The new planner keeps inner structs as structural analysis and reconstruction nodes only. They no longer emit separately named wire codecs.

### Silent Fallback And Transitional Pressure

The removed resolver degraded difficult cases instead of failing clearly:

- unsupported unions fell back to string transport
- `Partial<T>` and `Promise<T>` were unwrapped
- recursive named references were neutralized through cached empty analysis instead of hard failure

Those behaviors created a natural path for hybrid coexistence and silent generic fallback. The new analyzer fails with explicit diagnostics for unsupported unions, tuples, recursion, `Partial<T>`, `Promise<T>`, and nullish unions.

## Files That Owned The Old Mismatch

- `src/structured-top-level-codecs.ts`: incorrect ownership of shape resolution, analysis, layout choice, and rendering
- `src/emit.ts`: direct dependence on the old structured codec catalog instead of an explicit pre-emission plan

## Old Assumptions That Had To Be Removed

- Strongly typed nested structs can own reusable standalone codecs
- Unsupported shapes may degrade to generic string or dynamic transport
- Leaf handlers may decide region layout during emission
- Runtime helper banks may be emitted as a standing framework independent of actual plan requirements
- Strongly typed boundary transport may be described by recursive sub-codec composition rather than a whole-boundary plan
