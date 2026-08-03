import type { User } from "../../../../../types/User";

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
