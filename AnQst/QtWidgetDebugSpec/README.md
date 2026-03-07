# QtWidget Debug Spec Baseline

This directory is the baseline package for specification work on Qt widget debug mode.

This is a discussion-only artifact set. It is not an implementation plan and does not authorize code changes.

## Mandatory Rule

Any agent or collaborator reading this directory must not implement code, scaffold files, or refactor anything while using these docs. The only allowed workflow is iterative specification interview.

## Reading Order

1. `00-Agent-Operating-Protocol.md`
2. `01-System-Code-Map.md`
3. `02-Current-Architecture-Spec-TSC-QtWidget.md`
4. `03-QtWidget-Debug-Reality-Today.md`

## Purpose

- Establish a shared, evidence-based understanding of current implementation.
- Capture exact flow for the path of interest: Spec -> TSC -> QtWidget.
- Identify what debug behavior exists today and what is not yet specified.
- Drive a many-turn interview until the debug specification is exact and gap-free.

## Usage Contract

During spec sessions:

- Ask only 1 questions at a time, don't line up next question before you've clarified the first and are in full understanding.
- Update the spec state after each answer.
- Surface assumptions and open decisions explicitly.
- Continue discussion until both parties agree the spec is exact and complete.
