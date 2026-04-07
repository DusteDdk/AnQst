import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { AnQstBridgeDiagnostics, CdEntryService } from 'anqst-generated/services';
import type { CdDraft, Genre, Track } from 'anqst-generated/types';
import { createEmptyDraft, formatCdId, parseCdIdInput } from './cd-draft';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly service = inject(CdEntryService);
  readonly bridgeDiagnostics = inject(AnQstBridgeDiagnostics);
  readonly genres: Genre[] = ['Rock', 'Pop', 'Jazz', 'Classical', 'Electronic', 'Other'];
  readonly statusBanner = signal<string | null>(null);
  readonly cdIdText = signal('0');
  readonly cdIdError = signal<string | null>(null);

  private readonly emptyDraft = createEmptyDraft();
  private readonly bannerTimeoutMs = 5000;

  readonly draft = computed(() => this.service.draft() ?? this.emptyDraft);
  readonly selectedTrackIndex = computed(() => this.service.selectedTrackIndex() ?? 0);
  readonly currentCollectionName = computed(() => this.service.currentCollectionName() ?? 'N/A');
  readonly readOnlyMode = computed(() => this.service.readOnlyMode() ?? false);
  readonly saveInProgress = computed(() => this.service.saveInProgress() ?? false);
  readonly latestDiagnostic = computed(() => {
    const diagnostics = this.bridgeDiagnostics.diagnostics();
    return diagnostics.length > 0 ? diagnostics[diagnostics.length - 1] : undefined;
  });
  readonly bridgeState = computed(() => this.bridgeDiagnostics.state());

  constructor() {
    effect(() => {
      const drop = this.service.cdDropped();
      if (drop !== null) {
        untracked(() => {
          this.handleDroppedCd(drop);
        });
      }
    });

    this.service.onSlot.focusField((fieldName) => this.focusByFieldName(fieldName));
    this.service.onSlot.showDraft((draft, selectedTrackIndex) => this.showDraftFromSlot(draft, selectedTrackIndex));
    this.service.onSlot.replaceTracks((tracks) => this.replaceTracksFromSlot(tracks));

    const initialDraft = this.service.draft();
    if (initialDraft === undefined) {
      this.replaceDraft(this.createDraft());
    } else {
      this.syncCdIdField(initialDraft.cdId);
    }

    if (this.service.selectedTrackIndex() === undefined) {
      this.service.set.selectedTrackIndex(0);
    }
  }

  onTextField(field: 'artist' | 'albumTitle' | 'catalogNumber' | 'barcode' | 'notes', value: string): void {
    const draft = this.requireDraft();
    this.updateDraft({ ...draft, [field]: value }, field);
  }

  onYearInput(value: string): void {
    const parsed = Number.parseInt(value, 10);
    const releaseYear = Number.isFinite(parsed) ? parsed : 0;
    const draft = this.requireDraft();
    this.updateDraft({ ...draft, releaseYear }, 'releaseYear');
  }

  onGenreChange(value: string): void {
    const draft = this.requireDraft();
    this.updateDraft({ ...draft, genre: value as Genre }, 'genre');
  }

  onCdIdInput(value: string): void {
    this.cdIdText.set(value);
    const cdId = parseCdIdInput(value);
    if (cdId === null) {
      this.cdIdError.set('CD Id must be a signed 64-bit integer.');
      return;
    }

    const draft = this.requireDraft();
    this.cdIdError.set(null);
    this.updateDraft({ ...draft, cdId }, 'cdId');
  }

  onCreatedByName(value: string): void {
    const draft = this.requireDraft();
    this.updateDraft({
      ...draft,
      createdBy: { ...draft.createdBy, name: value }
    }, 'createdBy.name');
  }

  onCreatedByFriends(value: string): void {
    const numbers = value
      .split(',')
      .map((item) => Number.parseInt(item.trim(), 10))
      .filter((item) => Number.isFinite(item));
    const draft = this.requireDraft();
    this.updateDraft({
      ...draft,
      createdBy: { ...draft.createdBy, meta: { friends: numbers } }
    }, 'createdBy.meta.friends');
  }

  addTrack(): void {
    const draft = this.requireDraft();
    const tracks = [...draft.tracks, { title: '', durationSeconds: 0 }];
    this.replaceDraft({ ...draft, tracks });
    this.service.set.selectedTrackIndex(tracks.length - 1);
    this.markDirty();
  }

  removeTrack(index: number): void {
    const draft = this.requireDraft();
    const tracks = draft.tracks.filter((_, trackIndex) => trackIndex !== index);
    this.replaceDraft({ ...draft, tracks });
    this.service.set.selectedTrackIndex(Math.max(0, tracks.length - 1));
    this.markDirty();
  }

  onTrackTitle(index: number, value: string): void {
    const draft = this.requireDraft();
    const tracks = draft.tracks.map((track, trackIndex) => (
      trackIndex === index ? { ...track, title: value } : track
    ));
    this.updateDraft({ ...draft, tracks }, `tracks.${index}.title`);
  }

  onTrackDuration(index: number, value: string): void {
    const durationSeconds = Number.parseInt(value, 10);
    const draft = this.requireDraft();
    const tracks = draft.tracks.map((track, trackIndex) => (
      trackIndex === index
        ? { ...track, durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0 }
        : track
    ));
    this.updateDraft({ ...draft, tracks }, `tracks.${index}.durationSeconds`);
  }

  selectTrack(index: number): void {
    this.service.set.selectedTrackIndex(index);
  }

  async suggestCatalogNumber(): Promise<void> {
    const draft = this.requireDraft();
    const catalogNumber = await this.service.suggestCatalogNumber(draft.artist, draft.albumTitle);
    this.updateDraft({ ...draft, catalogNumber }, 'catalogNumber');
  }

  async suggestGenres(): Promise<void> {
    const draft = this.requireDraft();
    const suggestions = await this.service.suggestGenres(draft.artist, draft.albumTitle);
    if (suggestions.length > 0) {
      this.updateDraft({ ...draft, genre: suggestions[0] }, 'genre');
    }
  }

  async normalizeBarcode(): Promise<void> {
    const draft = this.requireDraft();
    const barcode = await this.service.normalizeBarcode(draft.barcode);
    this.updateDraft({ ...draft, barcode }, 'barcode');
  }

  async validateDraft(): Promise<void> {
    const draft = this.requireDraft();
    const result = await this.service.validateDraft(draft);
    const message = result.valid ? `Valid: ${result.message}` : `Invalid: ${result.message}`;
    this.updateDraft({ ...draft, notes: `${draft.notes}\n${message}`.trim() }, 'notes');
  }

  saveDraft(): void {
    const draft = this.requireDraft();
    void this.service.saveRequested(draft)
      .then((result) => {
        this.showBanner(result.message);
        if (result.saved) {
          const currentDraft = this.requireDraft();
          if (currentDraft.cdId !== result.cdId) {
            this.replaceDraft({ ...currentDraft, cdId: result.cdId });
          }
          this.service.dirtyChanged(false);
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.showBanner(`Save failed: ${message}`);
      });
  }

  friendsCsv(): string {
    return this.draft().createdBy.meta.friends.join(', ');
  }

  private focusByFieldName(fieldName: string): void {
    const id = `field-${fieldName.replaceAll('.', '-')}`;
    document.getElementById(id)?.focus();
  }

  private replaceTracksFromSlot(tracks: Track[]): void {
    const draft = this.requireDraft();
    this.replaceDraft({ ...draft, tracks });
    this.service.set.selectedTrackIndex(0);
  }

  private showDraftFromSlot(draft: CdDraft, selectedTrackIndex: number): void {
    this.replaceDraft(draft);
    this.service.set.selectedTrackIndex(selectedTrackIndex);
  }

  private handleDroppedCd(drop: { payload: CdDraft; x: number; y: number }): void {
    if (this.isNotesDropTarget(drop.x, drop.y)) {
      this.appendRelatedAlbumNote(drop.payload);
      return;
    }

    this.showBanner(`Try dropping it into the notes field instead.`);
  }

  private isNotesDropTarget(x: number, y: number): boolean {
    const notesField = document.getElementById('field-notes');
    if (notesField === null) {
      return false;
    }

    const dropTarget = document.elementFromPoint(x, y);
    return dropTarget === notesField;
  }

  private appendRelatedAlbumNote(relatedDraft: CdDraft): void {
    const draft = this.requireDraft();
    const relatedAlbumLine = `Related album: ${relatedDraft.albumTitle} (${formatCdId(relatedDraft.cdId)})`;
    const notes = draft.notes.trim().length > 0
      ? `${draft.notes}\n${relatedAlbumLine}`
      : relatedAlbumLine;
    this.updateDraft({ ...draft, notes }, 'notes');
  }

  private syncCdIdField(cdId: bigint): void {
    this.cdIdText.set(formatCdId(cdId));
    this.cdIdError.set(null);
  }

  private replaceDraft(draft: CdDraft): void {
    this.service.set.draft(draft);
    this.syncCdIdField(draft.cdId);
  }

  private updateDraft(draft: CdDraft, fieldName?: string): void {
    this.replaceDraft(draft);
    this.markDirty(fieldName);
  }

  private markDirty(fieldName?: string): void {
    if (fieldName !== undefined) {
      this.service.fieldTouched(fieldName);
    }
    this.service.dirtyChanged(true);
  }

  private showBanner(message: string): void {
    this.statusBanner.set(message);
    setTimeout(() => {
      if (this.statusBanner() === message) {
        this.statusBanner.set(null);
      }
    }, this.bannerTimeoutMs);
  }

  private requireDraft(): CdDraft {
    const draft = this.service.draft();
    if (draft !== undefined) {
      return draft;
    }

    const fallback = this.createDraft();
    this.replaceDraft(fallback);
    return fallback;
  }

  private createDraft(): CdDraft {
    return createEmptyDraft();
  }
}
