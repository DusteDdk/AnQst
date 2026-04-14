import type { AnQst } from "@dusted/anqst";

import type { Magic } from "../../VanillaJsWidget/AnQst/generated/frontend/VanillaJsWidget_VanillaTS/index.d.ts";

declare namespace VanillaTsWidget {
  interface MagicMirrorService extends AnQst.Service {
    onMagic(magic: Magic): AnQst.Slot<void>;
    requestReset(): AnQst.Emitter;
  }
}
