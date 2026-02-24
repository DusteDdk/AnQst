import { AnQst } from "AnQst-Spec-DSL";

declare namespace DevBridgeWidget {
  interface DevService extends AnQst.AngularHTTPBaseServerClass {
    ping(value: string): AnQst.Call<string>;
    draft: AnQst.Input<string>;
    ready: AnQst.Output<boolean>;
  }
}
