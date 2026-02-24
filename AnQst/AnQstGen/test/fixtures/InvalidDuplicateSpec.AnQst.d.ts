import { AnQst } from "AnQst-Spec-DSL";

declare namespace InvalidDup {
  interface DupService extends AnQst.Service {
    getUserMetaInfo(userId: string): AnQst.CallSync<AnQst.Type.json>;
    getUserMetaInfo(userId: string): AnQst.CallSync<object>;
  }
}
