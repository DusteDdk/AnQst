# Boundary Codec Deletion Report

## Removed Obsolete Components

- `src/structured-top-level-codecs.ts`
- The old structured-codec imports and accessors from `src/emit.ts`
- TS named helper families rooted in `__anqstNamed_*`
- C++ named helper families rooted in `anqstNamed_*`
- The old `TypeShape` and `NamedShape` transport model

## Removed Transitional Abstractions

- Reusable standalone wire identities for nested non-boundary structs
- Emission-first layout choice embedded inside recursive encode/decode walkers
- Blanket helper-bank emission independent of actual boundary-plan requirements

## Removed Invalid Old Assumptions

- Unsupported unions may silently degrade to string transport
- `Partial<T>` and `Promise<T>` may be unwrapped and treated as transport-compatible
- Recursive strongly typed boundaries may limp through analysis without a hard failure
- Boolean strongly typed leaves belong in the string lane
- Strongly typed boundary codecs may be composed from child-emitted standalone sub-codecs

## Result

There is no remaining first-class path for strongly typed codec generation outside the boundary analysis -> boundary plan -> renderer pipeline.
