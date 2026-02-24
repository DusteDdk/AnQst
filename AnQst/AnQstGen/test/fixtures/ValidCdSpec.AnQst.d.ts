import { AnQst } from "AnQst-Spec-DSL";

declare namespace CdWidget {
  interface Track {
    title: string;
    durationSeconds: number;
  }

  interface CdDraft {
    album: string;
    year: AnQst.Type.qint32;
    tracks: Track[];
  }

  interface CdService extends AnQst.Service {
    validate(draft: CdDraft): AnQst.CallSync<boolean>;
    publishDirty(value: boolean): AnQst.Emitter;
    draft: AnQst.Input<CdDraft>;
    readOnlyMode: AnQst.Output<boolean>;
  }
}
