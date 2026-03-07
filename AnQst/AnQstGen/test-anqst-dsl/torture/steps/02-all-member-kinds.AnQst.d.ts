import { AnQst } from "anqst";

declare namespace TortureWidget {
  interface PingService extends AnQst.Service {
    ping(value: string): AnQst.Call<string>;
    setMode(mode: string): AnQst.Slot<void>;
    draft: AnQst.Input<string>;
    ready: AnQst.Output<boolean>;
    pulse(value: number): AnQst.Emitter;
  }
}
