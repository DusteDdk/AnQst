# Codec Architecture Alignment Report

## Authoritative Reading

The governing architecture is:

- bridge-first, not wire-first
- one whole-boundary planning problem per service-boundary type
- leaves contribute capabilities and materialization facts
- inner nodes contribute shape and reconstruction obligations
- the boundary planner chooses layout and optimization strategy
- emitters render a chosen plan
- runtime encode/decode/materialization cost beats carrier compactness
- finite-domain information must survive long enough for planner specialization
- generated public target-language types should preserve finite domains when feasible
- the final top-level output must still satisfy the current JSON/QWebChannel carrier constraint
- there is no phased migration, compatibility mode, or silent generic fallback

## Current Mismatches

### Planner-Shaped, Not Planner-Owned

The active boundary pipeline in:

- `AnQstGen/src/boundary-codec-analysis.ts`
- `AnQstGen/src/boundary-codec-plan.ts`
- `AnQstGen/src/boundary-codec-render.ts`

does plan before emission, but the plan mostly records region membership and entry IDs. Important decisions remain hard-coded or erased:

- array counts are unconditional
- optional presence bytes are unconditional
- region count pre-scan is a renderer default
- field order follows traversal order
- finite domains are widened before planning

### Finite-Domain Erasure

`boundary-codec-analysis.ts` currently collapses literal unions into generic `string`, `boolean`, or `number` leaves. This prevents:

- planner-owned recoding
- planner-owned runtime specialization
- preservation of closed-world knowledge into generated C++ public types

### Public C++ Type Widening

`emit.ts` currently maps unions to broad runtime types such as `QString`, `bool`, and `double`. This discards closed-domain information even when the source boundary type is finite and statically known.

### Canonical Nested-Type Identity Gap

The `CdEntryEditor` case shows a concrete mismatch:

- the generator test fixture expects `User_meta`
- the build log shows emitted decode code referring to `CdEntryService_validateDraft_draft_createdBy_meta`

That means nested structural type identity is not canonical across planner, renderer, and C++ declaration normalization.

### Acceptable Genericity vs Forbidden Genericity

The host bridge code in:

- `AnQstWidget/AnQstWebBase/src/AnQstWebHostBase.*`
- `AnQstWidget/AnQstWebBase/src/AnQstHostBridgeFacade.*`

is acceptable generic hosting infrastructure. It moves `QString`, `QVariant`, and `QVariantList` values through the bridge.

The problem is not generic hosting.

The problem is generic codec/layout behavior in generated strongly typed boundary code:

- descriptor-shaped helper fleets
- fixed carrier recipes
- generic cursor/count scaffolding for trivial codecs
- drag/drop JSON round-tripping of already-planned payloads

## Stale Or Conflicting Layers

### `RefinedSpecs/Codecs/Structured_TopLevelCodec_Strategy.md`

Useful for:

- one-boundary flattening
- no sub-codecs for nested strongly typed structs

Not authoritative for:

- fixed carrier recipe
- fixed count strategy
- fixed optional metadata strategy
- literal-union identity transport

### `RefinedSpecs/Codecs/Boolean_boolean_Codec.md`

Useful only as a leaf-level historical note.

It must not be treated as authority for the actual boundary wire representation of booleans. Boolean placement and coding are planner-owned choices.

## Corrective Direction

The replacement must:

1. make finite domains first-class in analysis and planning
2. make layout decisions explicit in the plan IR
3. make nested structural type identity canonical across analysis, planning, and C++ declaration generation
4. move array/tail/count decisions into the planner
5. move optional/boolean/binary strategy selection into the planner
6. make emitters project a chosen plan rather than a fixed runtime scaffold
7. preserve generic host plumbing while removing generic codec behavior
8. validate the result with `CdEntryEditor` as the anchor case
