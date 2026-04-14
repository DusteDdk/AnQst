# Example Qt app widgets

## Vanilla JS + TS bridge (`VanillaJsWidget`, `VanillaTsWidget`)

- **Build order:** run `VanillaJsWidget` first, then `VanillaTsWidget` (the TS spec imports shared types from the JS package). Use:

  ```bash
  ./build-vanilla-widgets.sh
  ```

  or `npm install` / `npx anqst build` in `VanillaJsWidget`, then `npm install` / `npm run build` in `VanillaTsWidget`.

- **Shared `Magic` type:** `VanillaTsWidget` imports `Magic` from the generated `VanillaJsWidget_VanillaTS/index.d.ts` artifact. Build `VanillaJsWidget` first so that generated type is available before `VanillaTsWidget` runs `anqst generate` / its local TS bundle step.

- **Qt host:** `Examples/example-qt-app` links both generated widget libraries and forwards both bridge directions through small queued host adapters: `requestReset` → `slot_reset`, and `newMagic` → `slot_onMagic` with a `tick` / `value` copy into the TS widget’s C++ struct type.

- **Performance:** The main window only constructs the two vanilla `QWebEngineView` instances when you first open the **Vanilla bridge** tab, so the CD editor is not competing with two extra Chromium views on startup.
