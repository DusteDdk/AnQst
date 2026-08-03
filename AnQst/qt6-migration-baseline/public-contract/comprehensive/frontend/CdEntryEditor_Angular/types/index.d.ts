export type Services = typeof import("../services");
export type Types = typeof import("../types");

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

import type { Genre, Track, CdDraft, ValidationResult, SaveResult } from "./types";

export type AnQstBridgeSeverity = "info" | "warn" | "error" | "fatal";

export type AnQstBridgeSource = "frontend" | "host";

export type AnQstBridgeTransport = "qt-webchannel" | "dev-websocket";

export type AnQstBridgeState = "starting" | "ready" | "failed" | "disconnected";

export interface AnQstBridgeDiagnostic {
  code: string;
  severity: AnQstBridgeSeverity;
  category: string;
  recoverable: boolean;
  message: string;
  timestamp: string;
  source: AnQstBridgeSource;
  transport?: AnQstBridgeTransport;
  service?: string;
  member?: string;
  requestId?: string;
  context?: Record<string, unknown>;
}

export declare class AnQstBridgeDiagnostics {
  diagnostics(): readonly AnQstBridgeDiagnostic[];
  state(): AnQstBridgeState;
  subscribe(listener: (diagnostic: AnQstBridgeDiagnostic) => void): () => void;
}

export interface CdEntryServiceSet {
  draft(value: CdDraft): void;
  selectedTrackIndex(value: number): void;
}

export interface CdEntryServiceOnSlot {
  focusField(handler: (fieldName: string) => void | Promise<void> | Error): void;
  showDraft(handler: (draft: CdDraft, selectedTrackIndex: number) => void | Promise<void> | Error): void;
  replaceTracks(handler: (tracks: Track[]) => void | Promise<void> | Error): void;
}

export declare class CdEntryService {
  readonly set: CdEntryServiceSet;
  readonly onSlot: CdEntryServiceOnSlot;
  suggestCatalogNumber(artist: string, albumTitle: string): Promise<string>;
  suggestGenres(artist: string, albumTitle: string): Promise<Genre[]>;
  validateDraft(draft: CdDraft): Promise<ValidationResult>;
  normalizeBarcode(rawValue: string): Promise<string>;
  saveRequested(draft: CdDraft): Promise<SaveResult>;
  dirtyChanged(isDirty: boolean): void;
  fieldTouched(fieldName: string): void;
  readOnlyMode(): boolean | undefined;
  currentCollectionName(): string | undefined;
  saveInProgress(): boolean | undefined;
  draft(): CdDraft | undefined;
  selectedTrackIndex(): number | undefined;
  cdDropped(): { payload: CdDraft; x: number; y: number } | null;
  cdHovering(): { payload: CdDraft; x: number; y: number } | null;
}
