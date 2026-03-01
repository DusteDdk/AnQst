import type { User } from "../../../types/User";

export type Genre = "Rock" | "Pop" | "Jazz" | "Classical" | "Electronic" | "Other";

export interface Track {
    title: string;
    durationSeconds: number;
  }

export interface CdDraft {
    cdId: bigint;
    artist: string;
    albumTitle: string;
    releaseYear: number;
    genre: Genre;
    catalogNumber: string;
    barcode: string;
    tracks: Track[];
    notes: string;
    createdBy: User;
  }

export interface ValidationResult {
    valid: boolean;
    message: string;
    field?: string;
  }

export interface SaveResult {
    saved: boolean;
    cdId: bigint;
    message: string;
  }

export interface CdEntryServiceSet {
  draft(value: CdDraft): void;
  selectedTrackIndex(value: number): void;
}

export interface CdEntryServiceOnSlot {
  focusField(handler: (fieldName: string) => void): void;
  replaceTracks(handler: (tracks: Track[]) => void): void;
}

export declare class CdEntryService {
  readonly set: CdEntryServiceSet;
  readonly onSlot: CdEntryServiceOnSlot;
  suggestCatalogNumber(artist: string, albumTitle: string): Promise<string>;
  suggestGenres(artist: string, albumTitle: string): Promise<Genre[]>;
  validateDraft(draft: CdDraft): Promise<ValidationResult>;
  normalizeBarcode(rawValue: string): Promise<string>;
  dirtyChanged(isDirty: boolean): void;
  fieldTouched(fieldName: string): void;
  readOnlyMode(): boolean;
  currentCollectionName(): string;
  saveInProgress(): boolean;
  draft(): CdDraft;
  selectedTrackIndex(): number;
}
