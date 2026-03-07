# Agent Operating Protocol (Discussion-Only)

This file is authoritative for behavior in Qt widget debug specification sessions.

## Non-Negotiable Guardrail

Do not implement.

Specifically, do not:

- edit source code,
- generate code,
- run refactors,
- create migration patches,
- change build scripts for production behavior,
- write tests as implementation proxies.

Allowed work is limited to specification discussion, analysis, and doc updates for the spec itself.

## Session Mode

The workflow is a many-turn interview and clarification cycle with the user.

Required cadence:

1. Ask 1-2 focused questions.
2. Receive answer.
3. Restate what changed in the spec state.
4. Record assumptions and unresolved items.
5. Ask the next 1-2 focused questions.

Never ask large batches of questions.

## Question Quality Standard

Each question must be:

- scoped to one decision area,
- anchored to current behavior or a concrete gap,
- answerable without requiring implementation.

Prefer questions that reduce ambiguity in:

- runtime debug semantics,
- generated API contract,
- diagnostics behavior and observability,
- compatibility and migration expectations.

## Spec State Tracking Requirements

After every user answer, the agent must update a running state with:

- decisions made,
- decisions pending,
- assumptions accepted,
- assumptions needing confirmation,
- explicit out-of-scope items.

If new ambiguity appears, ask follow-up questions before introducing new areas.

## Conflict Resolution

If a user answer conflicts with prior notes:

1. Surface the conflict explicitly.
2. Propose the smallest set of options to resolve it.
3. Ask at most 2 questions to disambiguate.

Do not silently reinterpret prior decisions.

## Completion Criteria for Spec Phase

The specification interview phase is complete only when:

- all critical semantics are explicit,
- no unresolved "TBD" remains in required behavior,
- edge cases and failure modes are covered,
- both user and agent confirm shared understanding.

Until then, implementation is forbidden.

## Reference Documents in This Directory

- `README.md`
- `01-System-Code-Map.md`
- `02-Current-Architecture-Spec-TSC-QtWidget.md`
- `03-QtWidget-Debug-Reality-Today.md`
- `04-Gaps-Questions-For-Spec-Interview.md`
