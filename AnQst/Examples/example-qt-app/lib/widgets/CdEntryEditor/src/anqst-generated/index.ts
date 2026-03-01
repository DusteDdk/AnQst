import { Injectable, inject, signal } from "@angular/core";
import type { User } from "../../types/User";



type SlotHandler = (...args: unknown[]) => unknown;
type OutputHandler = (value: unknown) => void;
type SlotInvocationListener = (requestId: string, service: string, member: string, args: unknown[]) => void;
type OutputListener = (service: string, member: string, value: unknown) => void;

interface HostBridgeApi {
  anQstBridge_call(service: string, member: string, args: unknown[], callback: (result: unknown) => void): void;
  anQstBridge_emit(service: string, member: string, args: unknown[]): void;
  anQstBridge_setInput(service: string, member: string, value: unknown): void;
  anQstBridge_registerSlot(service: string, member: string): void;
  anQstBridge_resolveSlot(requestId: string, ok: boolean, payload: unknown, error: string): void;
  anQstBridge_outputUpdated: { connect: (cb: (service: string, member: string, value: unknown) => void) => void };
  anQstBridge_slotInvocationRequested: {
    connect: (cb: (requestId: string, service: string, member: string, args: unknown[]) => void) => void;
  };
}

interface QWebChannelCtor {
  new (
    transport: unknown,
    initCallback: (channel: { objects: Record<string, HostBridgeApi | undefined> }) => void
  ): unknown;
}

interface BridgeAdapter {
  call<T>(service: string, member: string, args: unknown[]): Promise<T>;
  emit(service: string, member: string, args: unknown[]): void;
  setInput(service: string, member: string, value: unknown): void;
  registerSlot(service: string, member: string): void;
  resolveSlot(requestId: string, ok: boolean, payload: unknown, error: string): void;
  onOutput(handler: OutputListener): void;
  onSlotInvocation(handler: SlotInvocationListener): void;
}

class QtWebChannelAdapter implements BridgeAdapter {
  private constructor(private readonly host: HostBridgeApi) {}

  static async create(): Promise<QtWebChannelAdapter> {
    const anyWindow = window as unknown as {
      qt?: { webChannelTransport?: unknown };
      QWebChannel?: QWebChannelCtor;
    };
    if (typeof anyWindow.QWebChannel !== "function" || anyWindow.qt?.webChannelTransport === undefined) {
      throw new Error("Qt WebChannel transport is unavailable.");
    }
    return await new Promise<QtWebChannelAdapter>((resolve, reject) => {
      try {
        const QWebChannel = anyWindow.QWebChannel as QWebChannelCtor;
        new QWebChannel(anyWindow.qt!.webChannelTransport, (channel) => {
          const host = channel.objects["CdEntryEditorBridge"];
          if (host === undefined) {
            reject(new Error("CdEntryEditorBridge bridge object is unavailable."));
            return;
          }
          resolve(new QtWebChannelAdapter(host));
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  async call<T>(service: string, member: string, args: unknown[]): Promise<T> {
    return new Promise<T>((resolve) => {
      this.host.anQstBridge_call(service, member, args, (result) => resolve(result as T));
    });
  }

  emit(service: string, member: string, args: unknown[]): void {
    this.host.anQstBridge_emit(service, member, args);
  }

  setInput(service: string, member: string, value: unknown): void {
    this.host.anQstBridge_setInput(service, member, value);
  }

  registerSlot(service: string, member: string): void {
    this.host.anQstBridge_registerSlot(service, member);
  }

  resolveSlot(requestId: string, ok: boolean, payload: unknown, error: string): void {
    this.host.anQstBridge_resolveSlot(requestId, ok, payload, error);
  }

  onOutput(handler: OutputListener): void {
    this.host.anQstBridge_outputUpdated.connect(handler);
  }

  onSlotInvocation(handler: SlotInvocationListener): void {
    this.host.anQstBridge_slotInvocationRequested.connect(handler);
  }
}

class WebSocketBridgeAdapter implements BridgeAdapter {
  private readonly pending = new Map<string, (result: unknown) => void>();
  private readonly outputListeners: OutputListener[] = [];
  private readonly slotListeners: SlotInvocationListener[] = [];
  private requestCounter = 0;

  private constructor(private readonly socket: WebSocket) {
    this.socket.addEventListener("message", (event) => {
      const raw = typeof event.data === "string" ? event.data : String(event.data);
      const message = JSON.parse(raw) as Record<string, unknown>;
      const type = String(message["type"] ?? "");
      if (type === "callResult") {
        const requestId = String(message["requestId"] ?? "");
        const resolver = this.pending.get(requestId);
        if (resolver) {
          this.pending.delete(requestId);
          resolver(message["result"]);
        }
        return;
      }
      if (type === "outputUpdated") {
        const service = String(message["service"] ?? "");
        const member = String(message["member"] ?? "");
        for (const listener of this.outputListeners) {
          listener(service, member, message["value"]);
        }
        return;
      }
      if (type === "slotInvocationRequested") {
        const requestId = String(message["requestId"] ?? "");
        const service = String(message["service"] ?? "");
        const member = String(message["member"] ?? "");
        const args = Array.isArray(message["args"]) ? (message["args"] as unknown[]) : [];
        for (const listener of this.slotListeners) {
          listener(requestId, service, member, args);
        }
        return;
      }
      if (type === "hostError") {
        console.error("AnQst host error:", message["payload"]);
      }
    });
  }

  static async create(): Promise<WebSocketBridgeAdapter> {
    const configResponse = await fetch("/anqst-dev-config.json", { cache: "no-store" });
    if (!configResponse.ok) {
      throw new Error("AnQst host bootstrap missing: unable to read /anqst-dev-config.json");
    }
    const config = (await configResponse.json()) as { wsUrl?: string };
    if (!config.wsUrl) {
      throw new Error("AnQst host bootstrap missing: wsUrl is unavailable.");
    }
    return await new Promise<WebSocketBridgeAdapter>((resolve, reject) => {
      const socket = new WebSocket(config.wsUrl!);
      socket.addEventListener("open", () => resolve(new WebSocketBridgeAdapter(socket)));
      socket.addEventListener("error", () => reject(new Error("Failed to connect to AnQst WebSocket bridge.")));
    });
  }

  async call<T>(service: string, member: string, args: unknown[]): Promise<T> {
    const requestId = `req-${++this.requestCounter}`;
    const payload = { type: "call", requestId, service, member, args };
    return await new Promise<T>((resolve) => {
      this.pending.set(requestId, (value) => resolve(value as T));
      this.socket.send(JSON.stringify(payload));
    });
  }

  emit(service: string, member: string, args: unknown[]): void {
    this.socket.send(JSON.stringify({ type: "emit", service, member, args }));
  }

  setInput(service: string, member: string, value: unknown): void {
    this.socket.send(JSON.stringify({ type: "setInput", service, member, value }));
  }

  registerSlot(service: string, member: string): void {
    this.socket.send(JSON.stringify({ type: "registerSlot", service, member }));
  }

  resolveSlot(requestId: string, ok: boolean, payload: unknown, error: string): void {
    this.socket.send(JSON.stringify({ type: "resolveSlot", requestId, ok, payload, error }));
  }

  onOutput(handler: OutputListener): void {
    this.outputListeners.push(handler);
  }

  onSlotInvocation(handler: SlotInvocationListener): void {
    this.slotListeners.push(handler);
  }
}

@Injectable({ providedIn: "root" })
class AnQstBridgeRuntime {
  private adapter: BridgeAdapter | null = null;
  private readonly slotHandlers = new Map<string, SlotHandler>();
  private readonly outputHandlers = new Map<string, OutputHandler[]>();
  private readonly startup = this.init();

  async ready(): Promise<void> {
    return this.startup;
  }

  async call<T>(service: string, member: string, args: unknown[]): Promise<T> {
    const adapter = await this.requireAdapter();
    return adapter.call<T>(service, member, args);
  }

  emit(service: string, member: string, args: unknown[]): void {
    this.requireAdapterSync().emit(service, member, args);
  }

  setInput(service: string, member: string, value: unknown): void {
    this.requireAdapterSync().setInput(service, member, value);
  }

  registerSlot(service: string, member: string, handler: SlotHandler): void {
    const key = this.key(service, member);
    this.slotHandlers.set(key, handler);
    if (this.adapter !== null) {
      this.adapter.registerSlot(service, member);
      return;
    }
    this.ready()
      .then(() => this.requireAdapterSync().registerSlot(service, member))
      .catch((error) => console.error(error));
  }

  onOutput(service: string, member: string, handler: OutputHandler): void {
    const key = this.key(service, member);
    const existing = this.outputHandlers.get(key) ?? [];
    existing.push(handler);
    this.outputHandlers.set(key, existing);
  }

  private requireAdapterSync(): BridgeAdapter {
    if (this.adapter === null) {
      throw new Error("AnQst bridge is not ready.");
    }
    return this.adapter;
  }

  private async requireAdapter(): Promise<BridgeAdapter> {
    await this.startup;
    return this.requireAdapterSync();
  }

  private async init(): Promise<void> {
    const anyWindow = window as unknown as { qt?: { webChannelTransport?: unknown }; QWebChannel?: QWebChannelCtor };
    if (typeof anyWindow.QWebChannel === "function" && anyWindow.qt?.webChannelTransport !== undefined) {
      this.adapter = await QtWebChannelAdapter.create();
    } else {
      this.adapter = await WebSocketBridgeAdapter.create();
    }

    this.adapter.onOutput((service, member, value) => {
      const key = this.key(service, member);
      for (const outputHandler of this.outputHandlers.get(key) ?? []) {
        outputHandler(value);
      }
    });
    this.adapter.onSlotInvocation((requestId, service, member, args) => {
      const key = this.key(service, member);
      const handler = this.slotHandlers.get(key);
      if (handler === undefined) {
        this.adapter!.resolveSlot(requestId, false, undefined, "No slot handler registered.");
        return;
      }
      try {
        const result = handler(...args);
        this.adapter!.resolveSlot(requestId, true, result, "");
      } catch (error) {
        this.adapter!.resolveSlot(requestId, false, undefined, String(error));
      }
    });
    for (const key of this.slotHandlers.keys()) {
      const parts = key.split("::");
      if (parts.length === 2) {
        this.adapter.registerSlot(parts[0], parts[1]);
      }
    }
  }

  private key(service: string, member: string): string {
    return `${service}::${member}`;
  }

}

type Genre = "Rock" | "Pop" | "Jazz" | "Classical" | "Electronic" | "Other";

interface Track {
    title: string;
    durationSeconds: number;
  }

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

interface ValidationResult {
    valid: boolean;
    message: string;
    field?: string;
  }

interface SaveResult {
    saved: boolean;
    cdId: bigint;
    message: string;
  }

@Injectable({ providedIn: "root" })
export class CdEntryService {
  private readonly _bridge = inject(AnQstBridgeRuntime);
  private readonly _readOnlyMode = signal<boolean>((undefined as unknown) as boolean);
  private readonly _currentCollectionName = signal<string>((undefined as unknown) as string);
  private readonly _saveInProgress = signal<boolean>((undefined as unknown) as boolean);
  private readonly _draft = signal<CdDraft>((undefined as unknown) as CdDraft);
  private readonly _selectedTrackIndex = signal<number>((undefined as unknown) as number);
  constructor() {
    this._bridge.ready().catch((error) => console.error(error));
    this._bridge.onOutput("CdEntryService", "readOnlyMode", (value) => this._readOnlyMode.set(value as boolean));
    this._bridge.onOutput("CdEntryService", "currentCollectionName", (value) => this._currentCollectionName.set(value as string));
    this._bridge.onOutput("CdEntryService", "saveInProgress", (value) => this._saveInProgress.set(value as boolean));
  }
  readonly set = {
    draft: (value: CdDraft): void => {
      this._draft.set(value);
      this._bridge.setInput("CdEntryService", "draft", value);
    },
    selectedTrackIndex: (value: number): void => {
      this._selectedTrackIndex.set(value);
      this._bridge.setInput("CdEntryService", "selectedTrackIndex", value);
    },
  };
  readonly onSlot = {
    focusField: (handler: (fieldName: string) => void): void => {
      this._bridge.registerSlot("CdEntryService", "focusField", handler as (...args: unknown[]) => unknown);
    },
    replaceTracks: (handler: (tracks: Track[]) => void): void => {
      this._bridge.registerSlot("CdEntryService", "replaceTracks", handler as (...args: unknown[]) => unknown);
    },
  };
  async suggestCatalogNumber(artist: string, albumTitle: string): Promise<string> { return this._bridge.call<string>("CdEntryService", "suggestCatalogNumber", [artist, albumTitle]); }
  async suggestGenres(artist: string, albumTitle: string): Promise<Genre[]> { return this._bridge.call<Genre[]>("CdEntryService", "suggestGenres", [artist, albumTitle]); }
  async validateDraft(draft: CdDraft): Promise<ValidationResult> { return this._bridge.call<ValidationResult>("CdEntryService", "validateDraft", [draft]); }
  async normalizeBarcode(rawValue: string): Promise<string> { return this._bridge.call<string>("CdEntryService", "normalizeBarcode", [rawValue]); }
  dirtyChanged(isDirty: boolean): void { this._bridge.emit("CdEntryService", "dirtyChanged", [isDirty]); }
  fieldTouched(fieldName: string): void { this._bridge.emit("CdEntryService", "fieldTouched", [fieldName]); }
  readOnlyMode(): boolean { return this._readOnlyMode(); }
  currentCollectionName(): string { return this._currentCollectionName(); }
  saveInProgress(): boolean { return this._saveInProgress(); }
  draft(): CdDraft { return this._draft(); }
  selectedTrackIndex(): number { return this._selectedTrackIndex(); }
}

