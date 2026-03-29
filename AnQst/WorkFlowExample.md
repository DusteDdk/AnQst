# This document describes the goal for AnQst workflows
- From "No project"
- To "Ready for Widget Implementation"
- To "Generated C++ QtWidget library ready for use"
- And further development and maintenance of the Angular widget.
- Note: AnQst is a play on Danish word "Angst", instill is not a typo.

## Existing template behavior

- If `<WidgetName>.AnQst.d.ts` already exists, `anqst instill` only normalizes the `AnQst` import to `import { AnQst } from "anqst";`.
- If the existing `declare namespace ...` differs from the command argument widget name, instill prompts for which name to use.
