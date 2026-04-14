import type { AnQst } from "@dusted/anqst";
import type { Magic } from "./Magic.d.ts";

declare namespace VanillaJsWidget {

  interface MagicTickerService extends AnQst.Service {
    spreadMagic(magic: Magic): AnQst.Emitter;
    reset(): AnQst.Slot<void>;
  }
}
