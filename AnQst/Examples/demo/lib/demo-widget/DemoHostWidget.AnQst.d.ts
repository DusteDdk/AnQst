import { AnQst } from "./anqst-dsl/AnQst-Spec-DSL";

declare namespace DemoHostWidget {
  interface DemoBehaviorService extends AnQst.Service {
    callGreeting(userName: string): AnQst.Call<string>;
    callNextCounter(seed: number): AnQst.Call<number>;
    slotPrompt(message: string): AnQst.Slot<string>;
    emitterTelemetry(tag: string, value: number): AnQst.Emitter;
    inputTypedValue: AnQst.Input<string>;
    outputParentState: AnQst.Output<string>;
  }
}
