# Codec Architecture Overhaul Execution

## Goal

Replace the current planner-shaped boundary codec system with a planner-owned, bridge-first, compute-first architecture that:

- preserves finite domains through planning
- emits boundary-specific TS/C++ code
- preserves closed domains in generated public target types when feasible
- keeps bridge hosting generic while removing generic codec behavior

## Dependency Order

1. Codify architecture precedence in prose/spec docs and explicitly demote stale lower-level codec docs.
2. Redesign the boundary codec IR so it records selected decisions, not just capabilities and region membership.
3. Preserve finite-domain and canonical structural identity facts through transport analysis and catalog construction.
4. Replace traversal-owned defaults with a real planner that chooses:
   - field and decode order
   - array count vs tail strategy
   - optional metadata strategy
   - boolean representation
   - binary grouping strategy
   - trivial fast paths
5. Align C++ type generation with the planner so public types preserve finite domains and nested anonymous structs resolve to one canonical generated identity.
6. Rewrite TS/C++ renderers so they project only chosen plans and avoid generic runtime scaffolding where the plan has already specialized the boundary.
7. Remove emitted drag/drop transport genericity while keeping host bridge plumbing generic.
8. Extend validation so plans, public types, emitted code shape, and the `CdEntryEditor` compile case all prove completion.

## Non-Goals

- no phased migration
- no compatibility mode
- no old/new dual architecture
- no silent generic fallback
- no preservation of current wire layouts for compatibility

## Completion Evidence

The work is complete only when the repository can demonstrate all of the following:

- plans are inspectable before emission
- finite domains survive into planning
- emitted code looks boundary-specific instead of framework-like
- generated public C++ types preserve closed domains where feasible
- nested non-boundary structs do not own independent wire contracts
- `CdEntryEditor` no longer fails due to generated nested-type identity mismatch
