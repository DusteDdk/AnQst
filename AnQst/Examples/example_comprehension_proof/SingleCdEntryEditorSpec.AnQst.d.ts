import { AnQst } from "AnQst-Spec-DSL";
import { User } from './types/User'

declare namespace CdEntryEditor {
  type Genre = "Rock" | "Pop" | "Jazz" | "Classical" | "Electronic" | "Other";

  interface Track {
    title: string;
    durationSeconds: number;
  }

  interface CdDraft {
    cdId: AnQst.Type.qint64;
    artist: string;
    albumTitle: string;
    releaseYear: AnQst.Type.qint32;
    genre: Genre;
    catalogNumber: string;
    barcode: string;
    tracks: Track[];
    notes: string;
    createdBy: User;
  }

  interface ValidationResult {
    valid: boolean;
    message: string;
    field?: string;
  }

  interface SaveResult {
    saved: boolean;
    cdId: AnQst.Type.qint64;
    message: string;
  }

  interface CdEntryService extends AnQst.Service {
    suggestCatalogNumber(artist: string, albumTitle: string): AnQst.Call<string>;
    suggestGenres(artist: string, albumTitle: string): AnQst.Call<Genre[]>;

    validateDraft(draft: CdDraft): AnQst.Call<ValidationResult>;
    normalizeBarcode(rawValue: string): AnQst.Call<string>;

    focusField(fieldName: string): AnQst.Slot<void>;
    replaceTracks(tracks: Track[]): AnQst.Slot<void>;

    dirtyChanged(isDirty: boolean): AnQst.Emitter;
    fieldTouched(fieldName: string): AnQst.Emitter;

    readOnlyMode: AnQst.Output<boolean>;
    currentCollectionName: AnQst.Output<string>;
    saveInProgress: AnQst.Output<boolean>;

    draft: AnQst.Input<CdDraft>;
    selectedTrackIndex: AnQst.Input<number>;
  }
}
