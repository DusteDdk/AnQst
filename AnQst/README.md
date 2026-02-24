# AnQst: AngularApp to QtWidget*

- * And much more in the future (nodejs, openapi, c++ webserver) (Not in scope for current development).

- Generates native Angular Services and QtWidgets from declaration.
- Angular App with AnQst-DSL.spec.d.ts => AnQstGen => Angular Services and QtWidget out
- Allows Angular developers to effortlessly develop Angular Applications using standar Angular workflows and interfaces ( ng, npm, node, services ) that are compiled into native Qt Widgets ( regular C++ library providing a native QWidget with the widget-domain specific C++ API shape defined by the AnQst-Spec.
- `AnQstGen` is packaged as the `anqst` CLI (usable via `npx anqst`), and `AnQstWidget/AnQstWebBase` provides the linkable C++ host base library.

## Resources

### AnQst Developers
- See Overview.md for AnQst-Project developement information.
- spec/AnQst-Spec-DSL.d.ts - Canonical source of truth for the AnQst-DSL language in which AnQst-Specs are written.
- spec/AnQst-Main-Spec.md main canonical specification.
  - Supported and informed by canonical source of truth for AnQst usage example ( WorkFlowExample.md ).

### Angular and Qt Developers (AnQst Users)
- See WorkFlowExample.md for AnQst a workflow example where AnQst is used.
- See Examples/example_comprehension_proof/ for an example AnQst-Spec.
