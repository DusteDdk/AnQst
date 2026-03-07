import { AnQst } from "anqst";

declare namespace TortureWidget {
  interface PingService extends AnQst.Service {
    ping(value: string): AnQst.Call<string>;
  }
}
