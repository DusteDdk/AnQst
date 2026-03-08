// Built by AnQst 94b2aeb_dirty_build_8
export type Services = typeof import("../services");
export type Types = typeof import("../types");

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

import type { User } from "../../../types/User";

import type { Genre, Track, CdDraft, ValidationResult, SaveResult } from "./types";

export interface CdEntryServiceSet {
  draft(value: CdDraft): void;
  selectedTrackIndex(value: number): void;
}

export interface CdEntryServiceOnSlot {
  focusField(handler: (fieldName: string) => void): void;
  showDraft(handler: (draftJson: string, selectedTrackIndex: number) => void): void;
  replaceTracks(handler: (tracks: Track[]) => void): void;
}

export declare class CdEntryService {
  readonly set: CdEntryServiceSet;
  readonly onSlot: CdEntryServiceOnSlot;
  suggestCatalogNumber(artist: string, albumTitle: string): Promise<string>;
  suggestGenres(artist: string, albumTitle: string): Promise<Genre[]>;
  validateDraft(draft: CdDraft): Promise<ValidationResult>;
  normalizeBarcode(rawValue: string): Promise<string>;
  saveRequested(draftJson: string): void;
  dirtyChanged(isDirty: boolean): void;
  fieldTouched(fieldName: string): void;
  readOnlyMode(): boolean;
  currentCollectionName(): string;
  saveInProgress(): boolean;
  draft(): CdDraft;
  selectedTrackIndex(): number;
}
