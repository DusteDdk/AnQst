# AnQst Gap Analysis

A systematic comparison of what the documentation specifies versus what the implementation delivers.

## Reading Order

1. **`README.md`** (this file) — orientation and scope
2. **`01-Doc-Stronger-Than-Impl.md`** — areas where docs specify behavior the implementation does not yet satisfy
3. **`02-Impl-Stronger-Than-Doc.md`** — areas where the implementation has behaviour or APIs the docs do not describe
4. **`03-Gap-Matrix.md`** — tabular summary of all gaps with severity ratings
5. **`architecture-flow.html`** — rendered Mermaid diagram of the full system flow (open in browser)
6. **`gap-overview.html`** — rendered Mermaid diagram mapping each gap to its layer (open in browser)

## Scope

Documents reviewed:
- `README.md`, `Overview.md`, `WorkFlowExample.md`
- `spec/AnQst-Spec-DSL.d.ts` (referenced by name, not re-read in full)
- `RefinedSpecs/01-DSL-Structure-and-Validity.md`
- `RefinedSpecs/02-Interaction-Semantics.md`
- `RefinedSpecs/03-Generator-Output-Contracts.md`
- `RefinedSpecs/04-Canonical-UserManagement-Example.md`
- `QtWidgetDebugSpec/00-Agent-Operating-Protocol.md`
- `QtWidgetDebugSpec/01-System-Code-Map.md`
- `QtWidgetDebugSpec/02-Current-Architecture-Spec-TSC-QtWidget.md`
- `QtWidgetDebugSpec/03-QtWidget-Debug-Reality-Today.md`

Implementation reviewed:
- `AnQstGen/src/` — full TypeScript generator source
- `AnQstGen/test/` — test fixtures and test suites
- `AnQstWidget/AnQstWebBase/src/` — C++ host base headers

## Severity Scale

| Severity | Meaning |
|---|---|
| **Critical** | Spec says MUST; implementation silently omits or contradicts it |
| **High** | Significant behavioral divergence or missing API surface |
| **Medium** | Behaviour exists but differs from spec in observable ways |
| **Low** | Minor naming, wording, or completeness gap |

## Quick Score

- **Doc stronger than impl:** 12 gaps
- **Impl stronger than doc:** 11 gaps
- **Critical gaps:** 3 (C++ Call/Emitter API shape, advisory diagnostics, slot queue limit)
