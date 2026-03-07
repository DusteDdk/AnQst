import { AnQst } from "anqst";

declare namespace TortureWidget {
  interface Track {
    title: string;
    seconds: number;
  }

  interface Album {
    name: string;
    tracks: Track[];
  }

  interface AlbumService extends AnQst.Service {
    validate(album: Album): AnQst.Call<boolean>;
    upsert(album: Album): AnQst.Slot<void>;
    current: AnQst.Input<Album>;
    locked: AnQst.Output<boolean>;
    pulse(value: string): AnQst.Emitter;
  }
}
