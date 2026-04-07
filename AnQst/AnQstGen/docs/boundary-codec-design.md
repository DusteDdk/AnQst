# Boundary Codec Planning Design

## Status

This document now reflects the active implementation rather than a partial replacement target.

The current pipeline preserves finite domains in analysis, records planner-owned decisions in the boundary plan, emits one-pass blob-plus-item-order codecs, and uses canonical declaration identity for generated C++ nested types.

## Design Statement

Leaves describe capabilities, inner nodes describe shape, the boundary planner chooses layout, and emitters render the chosen plan.

## Pipeline

### 1. Shared Model

`src/boundary-codec-model.ts` defines the internal contracts for the replacement architecture:

- `LeafCapabilityDescriptor`
- transport analysis nodes for leaf, finite-domain, array, and struct
- planner-owned blob entries and ordered non-blob item entries
- `BoundaryCodecPlan`
- `BoundaryCodecCatalog`

This file is the stable internal vocabulary used by analysis, planning, and rendering.

### 2. Leaf Capability Registry

`src/boundary-codec-leaves.ts` maps supported leaf types to transport facts:

- chosen region
- fixed byte width
- tail-consumption allowance
- shared-region eligibility
- supported packings
- count-metadata requirement
- TS and C++ materialization hints

Leaf modules no longer expose structured codec emitters. They only describe what a leaf can participate in.

### 3. Transport Analysis

`src/boundary-codec-analysis.ts` converts reachable service-boundary types into transport analysis trees.

Analysis records:

- leaf versus finite-domain versus array versus struct
- field optionality
- repeated-structure count requirements
- leaf transport region
- closed-domain variant sets
- canonical type identity and C++ name hints
- fixed-width status
- reconstruction obligations

Unsupported strongly typed cases fail here with detailed diagnostics. The analyzer does not emit TS or C++.

### 4. Whole-Boundary Plan

`src/boundary-codec-plan.ts` converts analysis into a `BoundaryCodecPlan`.

The plan assigns each transport participant to explicit entries:

- `blobEntries` for fixed-width leaves, array counts, optional-presence bytes, and finite-domain codes
- `itemEntries` for non-blob values in emitted order
- finite-domain representation choices for closed sets
- array extent strategies such as explicit count versus blob-tail
- field ordering choices such as source order versus tail-optimized order

The plan also computes boundary-wide requirements such as:

- whether a blob region exists
- whether non-blob items exist
- whether optional presence metadata exists
- whether finite-domain code generation is active
- which scalar and binary helpers are actually needed

### 5. Boundary Catalog And Debug Dumps

`src/boundary-codecs.ts` builds one catalog for the whole spec.

It is responsible for:

- deduplicating boundary codecs by boundary type text
- mapping payload sites and parameter sites to codec ids
- exposing plan lookup to renderers
- writing inspectable debug dumps to:
  - `codecs/boundary-transport-analysis.txt`
  - `codecs/boundary-plans.txt`

This satisfies the requirement that planning be inspectable before emission.

### 6. Plan Rendering

`src/boundary-codec-render.ts` renders TS and C++ only from `BoundaryCodecPlan`.

Key properties:

- no named structured sub-codecs for nested structs
- no descriptor interpreter at runtime
- no generic serializer fallback
- support helper emission is trimmed to the helpers required by the catalog's plans

The rendered codec body walks the chosen plan directly.

## Invariants

- One strongly typed codec plan exists per boundary type.
- Non-boundary structs contribute structure and reconstruction only.
- Dynamic object/json transport remains exceptional and declaration-site specific.
- Unsupported strongly typed shapes fail planning instead of degrading.
- Emitters never invent layout. They project an already chosen plan.
