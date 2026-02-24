# Single CD Entry Editor - AnQst-Spec

This document defines a focused AnQst-Spec for one widget that edits a single CD entry in a larger Qt application.

## Domain focus

- Edit one CD record (title, artist, year, tracks, catalog number, notes).
- Validate and enrich metadata via parent-side services.
- Publish draft state changes from widget to parent while receiving contextual state from parent.

## Proposed AnQst-Spec input

```ts
import { AnQst } from 'AnQst-Spec-DSL';

declare namespace CdEntryEditor {
  type Genre = 'Rock' | 'Pop' | 'Jazz' | 'Classical' | 'Electronic' | 'Other';

  interface Track {
    title: string;
    durationSeconds: number;
  }

  interface CdDraft {
    cdId: AnQst.Type.qint64; // advisory: prefer qint64 in C++
    artist: string;
    albumTitle: string;
    releaseYear: AnQst.Type.qint32; // advisory: prefer qint32 in C++
    genre: Genre;
    catalogNumber: string;
    barcode: string;
    tracks: Track[];
    notes: string;
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
    // Widget -> Parent: async lookup
    suggestCatalogNumber(artist: string, albumTitle: string): AnQst.Call<string>;
    suggestGenres(artist: string, albumTitle: string): AnQst.Call<Genre[]>;

    // Widget -> Parent: sync validation and normalization
    validateDraft(draft: CdDraft): AnQst.CallSync<ValidationResult>;
    normalizeBarcode(rawValue: string): AnQst.CallSync<string>;

    // Parent -> Widget: request immediate UI behavior
    focusField(fieldName: string): AnQst.Slot<void>;
    replaceTracks(tracks: Track[]): AnQst.Slot<void>;

    // Widget -> Parent: fire-and-forget notifications
    dirtyChanged(isDirty: boolean): AnQst.Emitter;
    fieldTouched(fieldName: string): AnQst.Emitter;

    // Parent -> Widget reactive values
    readOnlyMode: AnQst.Output<boolean>;
    currentCollectionName: AnQst.Output<string>;
    saveInProgress: AnQst.Output<boolean>;

    // Widget -> Parent mirrored values
    draft: AnQst.Input<CdDraft>;
    selectedTrackIndex: AnQst.Input<number>;
  }
}
```

## Expected generated TypeScript surface (summary)

- `CdEntryService` injectable API with:
  - `suggestCatalogNumber(...): Promise<string>`
  - `suggestGenres(...): Promise<Genre[]>`
  - `validateDraft(...): ValidationResult`
  - `normalizeBarcode(...): string`
  - `dirtyChanged(...)` and `fieldTouched(...)` as `void` emitters
  - `onSlot.focusField(handler)` and `onSlot.replaceTracks(handler)`
  - signal-like accessors for `readOnlyMode`, `currentCollectionName`, `saveInProgress`, `draft`, `selectedTrackIndex`
  - `set.*` methods for all `Input`/`Output` properties in generated service API style

## Expected generated C++ surface (summary)

- QWidget subclass `CdEntryEditor` with:
  - request/reply signal wiring for `Call` and `CallSync`
  - invokable methods for `Slot<void>` members (`focusField`, `replaceTracks`)
  - Qt signals for `dirtyChanged` and `fieldTouched`
  - `Q_PROPERTY` entries for `readOnlyMode`, `currentCollectionName`, `saveInProgress`, `draft`, `selectedTrackIndex`
- data-carrying generated structs for `Track`, `CdDraft`, `ValidationResult`, `SaveResult`
- advisory mapping attempts:
  - `AnQst.Type.qint64` for `cdId`
  - `AnQst.Type.qint32` for `releaseYear`
  - with diagnostics emitted if advisory mappings are not honored

