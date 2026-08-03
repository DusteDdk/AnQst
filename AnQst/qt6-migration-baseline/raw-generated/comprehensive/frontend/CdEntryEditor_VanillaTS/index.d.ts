export {};
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

interface Track {
  title: string;
  durationSeconds: number;
}

declare const Track: {
  new (title: string, durationSeconds: number): Track;
  prototype: Track;
};

interface CdDraft {
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

declare const CdDraft: {
  new (cdId: bigint, artist: string, albumTitle: string, releaseYear: number, genre: Genre, catalogNumber: string, barcode: string, tracks: Track[], notes: string, createdBy: User): CdDraft;
  prototype: CdDraft;
};

interface ValidationResult {
  valid: boolean;
  message: string;
  field?: string;
}

declare const ValidationResult: {
  new (valid: boolean, message: string, field?: string): ValidationResult;
  prototype: ValidationResult;
};

interface SaveResult {
  saved: boolean;
  cdId: bigint;
  message: string;
}

declare const SaveResult: {
  new (saved: boolean, cdId: bigint, message: string): SaveResult;
  prototype: SaveResult;
};

interface User {
  name: string;
  meta: {
        friends: number[];
    };
}

declare const User: {
  new (name: string, meta: {
        friends: number[];
    }): User;
  prototype: User;
};

type AnQstBridgeSeverity = "info" | "warn" | "error" | "fatal";

type AnQstBridgeSource = "frontend" | "host";

type AnQstBridgeTransport = "qt-webchannel" | "dev-websocket";

type AnQstBridgeState = "starting" | "ready" | "failed" | "disconnected";

interface AnQstBridgeDiagnostic {
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

declare class AnQstBridgeDiagnostics {
  diagnostics(): readonly AnQstBridgeDiagnostic[];
  state(): AnQstBridgeState;
  subscribe(listener: (diagnostic: AnQstBridgeDiagnostic) => void): () => void;
}

interface CdEntryServiceSet {
  draft(value: CdDraft): void;
  selectedTrackIndex(value: number): void;
}

interface CdEntryServiceOnSlot {
  focusField(handler: (fieldName: string) => void | Promise<void> | Error): void;
  showDraft(handler: (draft: CdDraft, selectedTrackIndex: number) => void | Promise<void> | Error): void;
  replaceTracks(handler: (tracks: Track[]) => void | Promise<void> | Error): void;
}

declare class CdEntryService {
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

interface CdEntryEditorFrontend {
  diagnostics: AnQstBridgeDiagnostics;
  CdEntryService: CdEntryService;
  Track: typeof Track;
  CdDraft: typeof CdDraft;
  ValidationResult: typeof ValidationResult;
  SaveResult: typeof SaveResult;
  User: typeof User;
}

declare function createFrontend(): Promise<CdEntryEditorFrontend>;

interface CdEntryEditorGlobal {
  createFrontend(): Promise<CdEntryEditorFrontend>;
}

interface AnQstGeneratedRoot {
  CdEntryEditor: CdEntryEditorGlobal;
}

declare global {
  interface Window {
    AnQstGenerated: AnQstGeneratedRoot;
  }

  var AnQstGenerated: AnQstGeneratedRoot;
}

export { AnQstBridgeDiagnostics, CdEntryService, Track, CdDraft, ValidationResult, SaveResult, User, createFrontend };
export type { AnQstBridgeDiagnostic, AnQstBridgeState, CdEntryEditorFrontend, CdEntryEditorGlobal, AnQstGeneratedRoot };
