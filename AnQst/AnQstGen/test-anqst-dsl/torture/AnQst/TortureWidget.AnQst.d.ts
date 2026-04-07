import { AnQst } from "anqst";

declare namespace TortureWidget {
  interface UserRecord {
    id: string;
    name: string;
  }

  interface GenericEdgeService extends AnQst.Service {
    merge(input: Partial<UserRecord>): AnQst.Call<Partial<UserRecord>>;
  }
}
