# Example Qt app widgets

## Vanilla JS + TS bridge (`VanillaJsWidget`, `VanillaTsWidget`)

- **Build order:** run `VanillaJsWidget` first, then `VanillaTsWidget` (the TS spec imports shared types from the JS package). Use:

  ```bash
  ./build-vanilla-widgets.sh
  ```

  or `npm install` / `npx anqst build` in each folder in that order.

- **Shared `Magic` type:** `VanillaTsWidget` imports `Magic` from `VanillaJsWidget/AnQst/Magic.shared.d.ts` (a tiny hand-maintained mirror of the JS widget spec). Importing the full generated `VanillaTS/index.d.ts` from another spec is not supported: the parser would pull in the whole frontend model and break C++ type emission.

- **Qt host:** `Examples/example-qt-app` links both generated widget libraries and forwards both bridge directions through small queued host adapters: `requestReset` → `slot_reset`, and `newMagic` → `slot_onMagic` with a `tick` / `value` copy into the TS widget’s C++ struct type.

- **Performance:** The main window only constructs the two vanilla `QWebEngineView` instances when you first open the **Vanilla bridge** tab, so the CD editor is not competing with two extra Chromium views on startup.
