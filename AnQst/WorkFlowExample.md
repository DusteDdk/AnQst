# This document describes the goal for AnQst workflows
- From "No project"
- To "Ready for Widget Implementation"
- To "Generated C++ QtWidget library ready for use"
- And further development and maintenance of the Angular widget.
- Note: AnQst is a play on Danish word "Angst", instill is not a typo.

# Init the Angular Widget project: BurgerConstructor
```bash
~/hax/AngularWidgets $ mkdir BurgerConstructorWidget && cd BurgerConstructorWidget
~/hax/AngularWidgets $ ng new BurgerConstructorWidget
~/hax/AngularWidgets/BurgerConstructorWidget $ npm run build
~/hax/AngularWidgets/BurgerConstructorWidget $ npx anqst instill BurgerConstructor
~/hax/AngularWidgets/BurgerConstructorWidget $ ls
```
### Look at what was installed
```
... plus your project files ...
anqst-dsl/
BurgerConstructor.AnQst.d.ts
```

### There is also a file in the project root, next to package.json
```bash
~/hax/AngularWidgets $ cat BurgerConstructor.AnQst.d.ts
```
```TypeScript
import { AnQst } from "./anqst-dsl/AnQst-Spec-DSL";

declare namespace BurgerConstructor {



}
```

## Fill out AnQst Widget Specification ( <WidgetName>.AnQst.d.ts )
```bash
~/hax/AngularWidgets $ code BurgerConstructor.AnQst.d.ts # Add the Implemenationz
~/hax/AngularWidgets $ cat BurgerConstructor.AnQst.d.ts # Cat haz cheezbrgr?
```
```TypeScript
import { AnQst } from "./anqst-dsl/AnQst-Spec-DSL";

declare namespace BurgerConstructor {
    interface Burger {
        salad: boolean;
        meat: 'Beef' | 'Chicken';
    }

  interface BurgerService extends AnQst.Service
  {
    getBurgerById(burgerId: string): AnQst.Call<Burger>;
    addBurger(burger: Burger): AnQst.Call<boolean>;
    replaceBurger(burgerId: string, burger: Burger): AnQst.Call<boolean>;
  }
}
```

## Verify and generate from spec
```bash
~/hax/AngularWidgets/BurgerConstructorWidget $ npx anqst test
```

## Build and install generated TypeScript artifacts
```bash
~/hax/AngularWidgets/BurgerConstructorWidget $ npm run build
# (Implicit: anqst instill added `npx anqst` commands to package.json scripts)
# `anqst build` regenerates `generated_output`.
# By default (`AnQst.generate` contains both "AngularService" and "QWidget"):
# - installs generated TypeScript types/services to `src/anqst-generated`
# - writes C++ output under `generated_output/<WidgetName>_QtWidget/`
# - writes `anqst-cmake/CMakeLists.txt` for Qt integration
# For Angular projects, QWidget mode runs a production `ng build` and embeds the web output in
# `generated_output/<WidgetName>_QtWidget/webapp` via generated `<WidgetName>.qrc`.
# The Qt host app only needs to link against the generated widget library target.
```

## Runtime bootstrap contract

- Angular application files stay framework-native and must not include Qt-specific bridge script tags manually.
- `AnQstWebHostBase` injects bridge bootstrap automatically.
