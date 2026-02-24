import { AnQst } from "AnQst-Spec-DSL";

declare namespace InvalidCrossServiceDup {
  interface UserService extends AnQst.Service {
    load(id: string): AnQst.CallSync<string>;
  }

  interface AdminService extends AnQst.Service {
    load(id: string): AnQst.CallSync<string>;
  }
}
