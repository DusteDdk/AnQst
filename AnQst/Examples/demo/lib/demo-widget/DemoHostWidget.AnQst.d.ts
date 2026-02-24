import { AnQst } from "./anqst-dsl/AnQst-Spec-DSL";

declare namespace DemoHostWidget {
  interface DemoBehaviorService extends AnQst.Service {
    callGreeting(userName: string): AnQst.Call<string>;
    callSyncNextCounter(seed: number): AnQst.CallSync<number>;
    slotPrompt(message: string): AnQst.Slot<string>;
    emitterTelemetry(tag: string, value: number): AnQst.Emitter;
    inputTypedValue: AnQst.Input<string>;
    outputParentState: AnQst.Output<string>;
  }
}
