import { Injectable, inject, signal } from "@angular/core";

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
          const host = channel.objects["DemoHostWidgetBridge"];
          if (host === undefined) {
            reject(new Error("DemoHostWidgetBridge bridge object is unavailable."));
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


@Injectable({ providedIn: "root" })
export class DemoBehaviorService {
  private readonly _bridge = inject(AnQstBridgeRuntime);
  private readonly _inputTypedValue = signal<string>((undefined as unknown) as string);
  private readonly _outputParentState = signal<string>((undefined as unknown) as string);
  constructor() {
    this._bridge.ready().catch((error) => console.error(error));
    this._bridge.onOutput("DemoBehaviorService", "outputParentState", (value) => this._outputParentState.set(value as string));
  }
  readonly set = {
    inputTypedValue: (value: string): void => {
      this._inputTypedValue.set(value);
      this._bridge.setInput("DemoBehaviorService", "inputTypedValue", value);
    },
  };
  readonly onSlot = {
    slotPrompt: (handler: (message: string) => string): void => {
      this._bridge.registerSlot("DemoBehaviorService", "slotPrompt", handler as (...args: unknown[]) => unknown);
    },
  };
  async callGreeting(userName: string): Promise<string> { return this._bridge.call<string>("DemoBehaviorService", "callGreeting", [userName]); }
  async callNextCounter(seed: number): Promise<number> { return this._bridge.call<number>("DemoBehaviorService", "callNextCounter", [seed]); }
  emitterTelemetry(tag: string, value: number): void { this._bridge.emit("DemoBehaviorService", "emitterTelemetry", [tag, value]); }
  inputTypedValue(): string { return this._inputTypedValue(); }
  outputParentState(): string { return this._outputParentState(); }
}

