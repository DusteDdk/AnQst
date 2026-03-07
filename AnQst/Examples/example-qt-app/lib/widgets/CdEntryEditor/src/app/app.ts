import { Component, inject } from '@angular/core';
import { CdEntryService } from '../anqst-generated/services';
import type { CdDraft, Genre, Track } from '../anqst-generated/types';
import type { User } from '../../types/User';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})


export class App {
  readonly service = inject(CdEntryService);
  readonly genres: Genre[] = ['Rock', 'Pop', 'Jazz', 'Classical', 'Electronic', 'Other'];

  constructor() {
    if (!this.safeDraft()) {
      this.service.set.draft(this.createDraft());
    }
    this.service.set.selectedTrackIndex(0);
    this.service.onSlot.focusField((fieldName) => this.focusByFieldName(fieldName));
    this.service.onSlot.showDraft((draftJson, selectedTrackIndex) => this.showDraftFromSlot(draftJson, selectedTrackIndex));
    this.service.onSlot.replaceTracks((tracks) => this.replaceTracksFromSlot(tracks));
  }

  onTextField(field: 'artist' | 'albumTitle' | 'catalogNumber' | 'barcode' | 'notes', value: string): void {
    const draft = this.requireDraft();
    this.service.set.draft({ ...draft, [field]: value });
    this.service.fieldTouched(field);
    this.service.dirtyChanged(true);
  }

  onYearInput(value: string): void {
    const parsed = Number.parseInt(value, 10);
    const releaseYear = Number.isFinite(parsed) ? parsed : 0;
    const draft = this.requireDraft();
    this.service.set.draft({ ...draft, releaseYear });
    this.service.fieldTouched('releaseYear');
    this.service.dirtyChanged(true);
  }

  onGenreChange(value: string): void {
    const draft = this.requireDraft();
    this.service.set.draft({ ...draft, genre: value as Genre });
    this.service.fieldTouched('genre');
    this.service.dirtyChanged(true);
  }

  onCdIdInput(value: string): void {
    const draft = this.requireDraft();
    const parsed = Number.parseInt(value, 10);
    const cdId = (Number.isFinite(parsed) ? parsed : 0) as unknown as bigint;
    this.service.set.draft({ ...draft, cdId });
    this.service.fieldTouched('cdId');
    this.service.dirtyChanged(true);
  }

  onCreatedByName(value: string): void {
    const draft = this.requireDraft();
    this.service.set.draft({
      ...draft,
      createdBy: { ...draft.createdBy, name: value }
    });
    this.service.fieldTouched('createdBy.name');
    this.service.dirtyChanged(true);
  }

  onCreatedByFriends(value: string): void {
    const numbers = value
      .split(',')
      .map((x) => Number.parseInt(x.trim(), 10))
      .filter((x) => Number.isFinite(x));
    const draft = this.requireDraft();
    this.service.set.draft({
      ...draft,
      createdBy: { ...draft.createdBy, meta: { friends: numbers } }
    });
    this.service.fieldTouched('createdBy.meta.friends');
    this.service.dirtyChanged(true);
  }

  addTrack(): void {
    const draft = this.requireDraft();
    const tracks = [...draft.tracks, { title: '', durationSeconds: 0 }];
    this.service.set.draft({ ...draft, tracks });
    this.service.set.selectedTrackIndex(tracks.length - 1);
    this.service.dirtyChanged(true);
  }

  removeTrack(index: number): void {
    const draft = this.requireDraft();
    const tracks = draft.tracks.filter((_, i) => i !== index);
    this.service.set.draft({ ...draft, tracks });
    this.service.set.selectedTrackIndex(Math.max(0, tracks.length - 1));
    this.service.dirtyChanged(true);
  }

  onTrackTitle(index: number, value: string): void {
    const draft = this.requireDraft();
    const tracks = draft.tracks.map((track, i) => (i === index ? { ...track, title: value } : track));
    this.service.set.draft({ ...draft, tracks });
    this.service.fieldTouched(`tracks.${index}.title`);
    this.service.dirtyChanged(true);
  }

  onTrackDuration(index: number, value: string): void {
    const durationSeconds = Number.parseInt(value, 10);
    const draft = this.requireDraft();
    const tracks = draft.tracks.map((track, i) =>
      i === index ? { ...track, durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0 } : track
    );
    this.service.set.draft({ ...draft, tracks });
    this.service.fieldTouched(`tracks.${index}.durationSeconds`);
    this.service.dirtyChanged(true);
  }

  selectTrack(index: number): void {
    this.service.set.selectedTrackIndex(index);
  }

  async suggestCatalogNumber(): Promise<void> {
    const draft = this.requireDraft();
    const suggestion = await this.service.suggestCatalogNumber(draft.artist, draft.albumTitle);
    this.service.set.draft({ ...draft, catalogNumber: suggestion });
  }

  async suggestGenres(): Promise<void> {
    const draft = this.requireDraft();
    const suggestions = await this.service.suggestGenres(draft.artist, draft.albumTitle);
    if (suggestions.length > 0) {
      this.service.set.draft({ ...draft, genre: suggestions[0] });
    }
  }

  async normalizeBarcode(): Promise<void> {
    const draft = this.requireDraft();
    const normalized = await this.service.normalizeBarcode(draft.barcode);
    this.service.set.draft({ ...draft, barcode: normalized });
  }

  async validateDraft(): Promise<void> {
    const draft = this.requireDraft();
    const result = await this.service.validateDraft(draft);
    const message = result.valid ? `Valid: ${result.message}` : `Invalid: ${result.message}`;
    this.service.set.draft({ ...draft, notes: `${draft.notes}\n${message}`.trim() });
  }

  saveDraft(): void {
    this.service.saveRequested(this.serializeDraftForHost(this.requireDraft()));
  }

  friendsCsv(): string {
    return this.safeDraft()?.createdBy.meta.friends.join(', ') ?? '';
  }

  private focusByFieldName(fieldName: string): void {
    const id = `field-${fieldName.replaceAll('.', '-')}`;
    document.getElementById(id)?.focus();
  }

  private replaceTracksFromSlot(tracks: Track[]): void {
    const draft = this.requireDraft();
    this.service.set.draft({ ...draft, tracks });
    this.service.set.selectedTrackIndex(0);
  }

  private showDraftFromSlot(draftJson: string, selectedTrackIndex: number): void {
    const draft = this.parseDraftJson(draftJson);
    this.service.set.draft(draft);
    this.service.set.selectedTrackIndex(selectedTrackIndex);
  }

  private parseDraftJson(draftJson: string): CdDraft {
    try {
      const parsed = JSON.parse(draftJson) as Partial<CdDraft> | null;
      if (!parsed || typeof parsed !== 'object') {
        return this.createDraft();
      }
      const fallback = this.createDraft();
      return {
        ...fallback,
        ...parsed,
        createdBy: {
          ...fallback.createdBy,
          ...(parsed.createdBy ?? {})
        },
        tracks: Array.isArray(parsed.tracks) ? parsed.tracks : fallback.tracks
      };
    } catch {
      return this.createDraft();
    }
  }

  private serializeDraftForHost(draft: CdDraft): string {
    return JSON.stringify(draft, (_, value: unknown) => (typeof value === 'bigint' ? value.toString() : value));
  }

  private safeDraft(): CdDraft | undefined {
    try {
      return this.service.draft();
    } catch {
      return undefined;
    }
  }

  private requireDraft(): CdDraft {
    return this.safeDraft() ?? this.createDraft();
  }

  private createDraft(): CdDraft {
    const defaultUser: User = { name: '', meta: { friends: [] } };
    return {
      cdId: 0 as unknown as bigint,
      artist: '',
      albumTitle: '',
      releaseYear: new Date().getFullYear(),
      genre: 'Other',
      catalogNumber: '',
      barcode: '',
      tracks: [],
      notes: '',
      createdBy: defaultUser
    };
  }
}
