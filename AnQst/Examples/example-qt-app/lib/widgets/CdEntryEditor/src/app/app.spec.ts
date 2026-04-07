import { TestBed } from '@angular/core/testing';
import type { CdDraft } from 'anqst-generated/types';
import { vi } from 'vitest';
import { App } from './app';
import { MAX_QINT64, MIN_QINT64 } from './cd-draft';

describe('App', () => {
  function emitDrop(app: App, payload: CdDraft, x = 0, y = 0): void {
    const service = app.service as unknown as {
      _cdDropped: {
        set(value: { payload: CdDraft; x: number; y: number } | null): void;
      };
    };
    service._cdDropped.set({ payload, x, y });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('creates the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('bootstraps a draft with a real bigint cdId', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const app = fixture.componentInstance;
    expect(typeof app.draft().cdId).toBe('bigint');
    expect(app.draft().cdId).toBe(0n);
    expect(app.cdIdText()).toBe('0');
  });

  it('renders the default album title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Untitled Album');
  });

  it('parses the full qint64 range without losing precision', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const app = fixture.componentInstance;
    app.onCdIdInput(MAX_QINT64.toString());
    expect(app.draft().cdId).toBe(MAX_QINT64);
    expect(app.cdIdError()).toBeNull();

    app.onCdIdInput(MIN_QINT64.toString());
    expect(app.draft().cdId).toBe(MIN_QINT64);
    expect(app.cdIdError()).toBeNull();
  });

  it('keeps the current draft when CD Id input is invalid', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const app = fixture.componentInstance;
    const before = app.draft().cdId;
    app.onCdIdInput('not-a-bigint');

    expect(app.draft().cdId).toBe(before);
    expect(app.cdIdError()).toContain('signed 64-bit integer');
    expect(app.cdIdText()).toBe('not-a-bigint');
  });

  it('shows the existing banner when a drop does not land on Notes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const app = fixture.componentInstance;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => null),
    });

    emitDrop(app, {
      ...app.draft(),
      cdId: 1774821057091n,
      albumTitle: 'Blue Train',
    }, 12, 34);
    await fixture.whenStable();

    expect(app.statusBanner()).toBe("Try dropping it into the notes field instead.");
    expect(app.draft().notes).toBe('');
  });

  it('appends a related album line when the drop lands on Notes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const app = fixture.componentInstance;
    app.onTextField('notes', 'Existing note');
    fixture.detectChanges();

    const notesField = fixture.nativeElement.querySelector('#field-notes') as HTMLElement | null;
    expect(notesField).not.toBeNull();

    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => notesField),
    });

    emitDrop(app, {
      ...app.draft(),
      cdId: 1774821057091n,
      albumTitle: 'Blue Train',
    }, 56, 78);
    await fixture.whenStable();

    expect(app.statusBanner()).toBeNull();
    expect(app.draft().notes).toBe('Existing note\nRelated album: Blue Train (1774821057091)');
  });
});
