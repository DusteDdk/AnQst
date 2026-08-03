// Boundary codec plan helpers
function __anqstEncodeWire(bytes: number[], items: unknown[]): unknown {
  if (bytes.length === 0) {
    if (items.length === 1) return items[0];
    return items;
  }
  const out = new Array<unknown>(items.length + 1);
  throw new Error("AnQst boundary planner emitted unexpected blob bytes.");
  for (let i = 0; i < items.length; i += 1) out[i + 1] = items[i];
  if (out.length === 1) return out[0];
  return out;
}


function encodeAnQstStructured_string(value: string): unknown {
  return value;
}

function decodeAnQstStructured_string(wire: unknown): string {
  return (String(wire ?? "")) as string;
}



type SlotHandler = (...args: unknown[]) => unknown;
type OutputHandler = (value: unknown) => void;
type SlotInvocationListener = (requestId: string, service: string, member: string, args: unknown[]) => void;
type OutputListener = (service: string, member: string, value: unknown) => void;
type DropListener = (service: string, member: string, payload: unknown, x: number, y: number) => void;
type HoverListener = (service: string, member: string, payload: unknown, x: number, y: number) => void;
type HoverLeftListener = (service: string, member: string) => void;
type HostDiagnosticListener = (payload: unknown) => void;
type DisconnectListener = () => void;

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
  anQstBridge_hostDiagnostic?: { connect: (cb: (payload: unknown) => void) => void };
  anQstBridge_dropReceived: { connect: (cb: (service: string, member: string, payload: unknown, x: number, y: number) => void) => void };
  anQstBridge_hoverUpdated: { connect: (cb: (service: string, member: string, payload: unknown, x: number, y: number) => void) => void };
  anQstBridge_hoverLeft: { connect: (cb: (service: string, member: string) => void) => void };
}

interface QWebChannelCtor {
  new (
    transport: unknown,
    initCallback: (channel: { objects: Record<string, HostBridgeApi | undefined> }) => void
  ): unknown;
}

interface BridgeAdapter {
  readonly transport: AnQstBridgeTransport;
  call<T>(service: string, member: string, args: unknown[]): Promise<T>;
  emit(service: string, member: string, args: unknown[]): void;
  setInput(service: string, member: string, value: unknown): void;
  registerSlot(service: string, member: string): void;
  resolveSlot(requestId: string, ok: boolean, payload: unknown, error: string): void;
  onOutput(handler: OutputListener): void;
  onSlotInvocation(handler: SlotInvocationListener): void;
  onHostDiagnostic(handler: HostDiagnosticListener): void;
  onDisconnected(handler: DisconnectListener): void;
  onDrop(handler: DropListener): void;
  onHover(handler: HoverListener): void;
  onHoverLeft(handler: HoverLeftListener): void;
}

interface ValueCell<T> {
  get(): T;
  set(value: T): void;
}

function createValueCell<T>(initial: T): ValueCell<T> {
  let current = initial;
  return {
    get(): T {
      return current;
    },
    set(value: T): void {
      current = value;
    }
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string" && error.message.length > 0) {
    return error.message;
  }
  return String(error);
}

function normalizeSeverity(value: unknown): AnQstBridgeSeverity {
  if (value === "info" || value === "warn" || value === "error" || value === "fatal") {
    return value;
  }
  return "error";
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readBoolean(record: Record<string, unknown> | undefined, key: string): boolean | undefined {
  const value = record?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function readContext(record: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const context = asRecord(record?.["context"]);
  return context === undefined ? undefined : context;
}

function normalizeHostDiagnostic(payload: unknown, transport: AnQstBridgeTransport): Omit<AnQstBridgeDiagnostic, "timestamp"> {
  const row = asRecord(payload);
  if (row === undefined) {
    return {
      code: "HostDiagnosticMalformed",
      severity: "error",
      category: "bridge",
      recoverable: true,
      message: "Host emitted a malformed diagnostic payload.",
      source: "host",
      transport
    };
  }

  const context = readContext(row);
  return {
    code: readString(row, "code") ?? "HostDiagnostic",
    severity: normalizeSeverity(row["severity"]),
    category: readString(row, "category") ?? "bridge",
    recoverable: readBoolean(row, "recoverable") ?? true,
    message: readString(row, "message") ?? "Host emitted a diagnostic payload.",
    source: "host",
    transport,
    service: readString(row, "service") ?? readString(context, "service"),
    member: readString(row, "member") ?? readString(context, "member"),
    requestId: readString(row, "requestId") ?? readString(context, "requestId"),
    context
  };
}

function isBridgeCallError(value: unknown): value is {
  code: unknown;
  message: unknown;
  service: unknown;
  member: unknown;
  requestId: unknown;
} {
  if (value === null || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    Object.prototype.hasOwnProperty.call(row, "code")
    && Object.prototype.hasOwnProperty.call(row, "message")
    && Object.prototype.hasOwnProperty.call(row, "service")
    && Object.prototype.hasOwnProperty.call(row, "member")
    && Object.prototype.hasOwnProperty.call(row, "requestId")
  );
}

class QtWebChannelAdapter implements BridgeAdapter {
  readonly transport = "qt-webchannel" as const;

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
          try {
            const host = channel.objects["TortureWidgetBridge"];
            if (host === undefined) {
              reject(new Error("TortureWidgetBridge bridge object is unavailable."));
              return;
            }
            resolve(new QtWebChannelAdapter(host));
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  async call<T>(service: string, member: string, args: unknown[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.host.anQstBridge_call(service, member, args, (result) => {
        if (isBridgeCallError(result)) {
          reject(result);
          return;
        }
        resolve(result as T);
      });
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

  onHostDiagnostic(handler: HostDiagnosticListener): void {
    this.host.anQstBridge_hostDiagnostic?.connect(handler);
  }

  onDisconnected(_handler: DisconnectListener): void {
    // QWebChannel does not expose a deterministic disconnect event here.
  }

  onDrop(handler: DropListener): void {
    this.host.anQstBridge_dropReceived.connect(handler);
  }

  onHover(handler: HoverListener): void {
    this.host.anQstBridge_hoverUpdated.connect(handler);
  }

  onHoverLeft(handler: HoverLeftListener): void {
    this.host.anQstBridge_hoverLeft.connect(handler);
  }
}

class WebSocketBridgeAdapter implements BridgeAdapter {
  readonly transport = "dev-websocket" as const;
  private readonly pending = new Map<string, {
    service: string;
    member: string;
    requestId: string;
    resolve: (result: unknown) => void;
    reject: (error: unknown) => void;
  }>();
  private readonly outputListeners: OutputListener[] = [];
  private readonly slotListeners: SlotInvocationListener[] = [];
  private readonly hostDiagnosticListeners: HostDiagnosticListener[] = [];
  private readonly disconnectListeners: DisconnectListener[] = [];
  private readonly dropListeners: DropListener[] = [];
  private readonly hoverListeners: HoverListener[] = [];
  private readonly hoverLeftListeners: HoverLeftListener[] = [];
  private requestCounter = 0;

  private constructor(private readonly socket: WebSocket) {
    this.socket.addEventListener("message", (event) => {
      const raw = typeof event.data === "string" ? event.data : String(event.data);
      const message = JSON.parse(raw) as Record<string, unknown>;
      const type = String(message["type"] ?? "");
      if (type === "callResult") {
        const requestId = String(message["requestId"] ?? "");
        const pending = this.pending.get(requestId);
        if (pending) {
          this.pending.delete(requestId);
          const result = message["result"];
          if (isBridgeCallError(result)) {
            pending.reject(result);
            return;
          }
          pending.resolve(result);
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
      if (type === "dropReceived") {
        const service = String(message["service"] ?? "");
        const member = String(message["member"] ?? "");
        const x = Number(message["x"] ?? 0);
        const y = Number(message["y"] ?? 0);
        for (const listener of this.dropListeners) {
          listener(service, member, message["payload"], x, y);
        }
        return;
      }
      if (type === "hoverUpdated") {
        const service = String(message["service"] ?? "");
        const member = String(message["member"] ?? "");
        const x = Number(message["x"] ?? 0);
        const y = Number(message["y"] ?? 0);
        for (const listener of this.hoverListeners) {
          listener(service, member, message["payload"], x, y);
        }
        return;
      }
      if (type === "hoverLeft") {
        const service = String(message["service"] ?? "");
        const member = String(message["member"] ?? "");
        for (const listener of this.hoverLeftListeners) {
          listener(service, member);
        }
        return;
      }
      if (type === "hostError") {
        for (const listener of this.hostDiagnosticListeners) {
          listener(message["payload"]);
        }
        return;
      }
      if (type === "widgetReattached") {
        document.body.textContent = "Widget Reattached";
        this.socket.close();
      }
    });
    this.socket.addEventListener("close", () => {
      for (const pending of this.pending.values()) {
        pending.reject({
          code: "BridgeDisconnectedError",
          message: "Bridge disconnected before call completion.",
          service: pending.service,
          member: pending.member,
          requestId: pending.requestId
        });
      }
      this.pending.clear();
      for (const listener of this.disconnectListeners) {
        listener();
      }
    });
  }

  static async create(): Promise<WebSocketBridgeAdapter> {
    const configResponse = await fetch("/anqst-dev-config.json", { cache: "no-store" });
    if (!configResponse.ok) {
      throw new Error("AnQst host bootstrap missing: unable to read /anqst-dev-config.json");
    }
    const config = (await configResponse.json()) as { wsUrl?: string; wsPath?: string };
    let wsUrl = config.wsUrl;
    if (!wsUrl && config.wsPath) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = protocol + "//" + window.location.host + config.wsPath;
    }
    if (!wsUrl) {
      throw new Error("AnQst host bootstrap missing: wsUrl/wsPath is unavailable.");
    }
    if (wsUrl.startsWith("http://")) {
      wsUrl = "ws://" + wsUrl.slice("http://".length);
    } else if (wsUrl.startsWith("https://")) {
      wsUrl = "wss://" + wsUrl.slice("https://".length);
    }
    return await new Promise<WebSocketBridgeAdapter>((resolve, reject) => {
      const socket = new WebSocket(wsUrl!);
      socket.addEventListener("open", () => resolve(new WebSocketBridgeAdapter(socket)));
      socket.addEventListener("error", () => reject(new Error("Failed to connect to AnQst WebSocket bridge.")));
    });
  }

  async call<T>(service: string, member: string, args: unknown[]): Promise<T> {
    const requestId = `req-${++this.requestCounter}`;
    const payload = { type: "call", requestId, service, member, args };
    return await new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, {
        service,
        member,
        requestId,
        resolve: (value) => resolve(value as T),
        reject
      });
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

  onHostDiagnostic(handler: HostDiagnosticListener): void {
    this.hostDiagnosticListeners.push(handler);
  }

  onDisconnected(handler: DisconnectListener): void {
    this.disconnectListeners.push(handler);
  }

  onDrop(handler: DropListener): void {
    this.dropListeners.push(handler);
  }

  onHover(handler: HoverListener): void {
    this.hoverListeners.push(handler);
  }

  onHoverLeft(handler: HoverLeftListener): void {
    this.hoverLeftListeners.push(handler);
  }
}

class AnQstBridgeRuntime {
  private static readonly maxDiagnostics = 50;
  private adapter: BridgeAdapter | null = null;
  private readonly slotHandlers = new Map<string, SlotHandler>();
  private readonly outputHandlers = new Map<string, OutputHandler[]>();
  private readonly dropHandlers = new Map<string, ((payload: unknown, x: number, y: number) => void)[]>();
  private readonly hoverHandlers = new Map<string, ((payload: unknown, x: number, y: number) => void)[]>();
  private readonly hoverLeftHandlers = new Map<string, (() => void)[]>();
  private readonly diagnosticListeners = new Set<(diagnostic: AnQstBridgeDiagnostic) => void>();
  private readonly _diagnostics = createValueCell<readonly AnQstBridgeDiagnostic[]>([]);
  private readonly _state = createValueCell<AnQstBridgeState>("starting");
  private readonly startup = this.init().catch((error) => {
    this._state.set("failed");
    this.reportFrontendDiagnostic({
      code: "BridgeBootstrapError",
      severity: "fatal",
      category: "bridge",
      recoverable: false,
      message: `Failed to initialize bridge: ${errorMessage(error)}`
    });
    throw error;
  });

  diagnostics(): readonly AnQstBridgeDiagnostic[] {
    return this._diagnostics.get();
  }

  state(): AnQstBridgeState {
    return this._state.get();
  }

  subscribeDiagnostics(listener: (diagnostic: AnQstBridgeDiagnostic) => void): () => void {
    this.diagnosticListeners.add(listener);
    return () => this.diagnosticListeners.delete(listener);
  }

  async ready(): Promise<void> {
    return this.startup;
  }

  reportFrontendDiagnostic(diagnostic: Omit<AnQstBridgeDiagnostic, "timestamp" | "source">): void {
    this.pushDiagnostic({
      ...diagnostic,
      source: "frontend",
      transport: diagnostic.transport ?? this.adapter?.transport,
      timestamp: new Date().toISOString()
    });
  }

  async call<T>(service: string, member: string, args: unknown[]): Promise<T> {
    const adapter = await this.requireAdapter();
    return adapter.call<T>(service, member, args);
  }

  emit(service: string, member: string, args: unknown[]): void {
    this.publishNonCall("Emitter", service, member, (adapter) => adapter.emit(service, member, args));
  }

  setInput(service: string, member: string, value: unknown): void {
    this.publishNonCall("Input", service, member, (adapter) => adapter.setInput(service, member, value));
  }

  registerSlot(service: string, member: string, handler: SlotHandler): void {
    const key = this.key(service, member);
    this.slotHandlers.set(key, handler);
    if (this.adapter !== null) {
      try {
        this.adapter.registerSlot(service, member);
      } catch (error) {
        this.reportFrontendDiagnostic({
          code: "BridgePublishError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message: `Failed to register Slot ${service}.${member}: ${errorMessage(error)}`,
          service,
          member,
          context: { interaction: "Slot" }
        });
      }
      return;
    }
    this.ready()
      .then(() => {
        try {
          this.requireAdapterSync().registerSlot(service, member);
        } catch (error) {
          this.reportFrontendDiagnostic({
            code: "BridgePublishError",
            severity: "error",
            category: "bridge",
            recoverable: true,
            message: `Failed to register Slot ${service}.${member}: ${errorMessage(error)}`,
            service,
            member,
            context: { interaction: "Slot" }
          });
        }
      })
      .catch((error) => {
        this.reportFrontendDiagnostic({
          code: "BridgePublishError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message: `Failed to register Slot ${service}.${member}: ${errorMessage(error)}`,
          service,
          member,
          context: { interaction: "Slot" }
        });
      });
  }

  onOutput(service: string, member: string, handler: OutputHandler): void {
    const key = this.key(service, member);
    const existing = this.outputHandlers.get(key) ?? [];
    existing.push(handler);
    this.outputHandlers.set(key, existing);
  }

  onDrop(service: string, member: string, handler: (payload: unknown, x: number, y: number) => void): void {
    const key = this.key(service, member);
    const existing = this.dropHandlers.get(key) ?? [];
    existing.push(handler);
    this.dropHandlers.set(key, existing);
  }

  onHover(service: string, member: string, handler: (payload: unknown, x: number, y: number) => void): void {
    const key = this.key(service, member);
    const existing = this.hoverHandlers.get(key) ?? [];
    existing.push(handler);
    this.hoverHandlers.set(key, existing);
  }

  onHoverLeft(service: string, member: string, handler: () => void): void {
    const key = this.key(service, member);
    const existing = this.hoverLeftHandlers.get(key) ?? [];
    existing.push(handler);
    this.hoverLeftHandlers.set(key, existing);
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

  private pushDiagnostic(diagnostic: AnQstBridgeDiagnostic): void {
    const previous = this._diagnostics.get();
    const trimmed = previous.length >= AnQstBridgeRuntime.maxDiagnostics
      ? previous.slice(previous.length - (AnQstBridgeRuntime.maxDiagnostics - 1))
      : previous;
    const next = [...trimmed, diagnostic];
    this._diagnostics.set(next);
    for (const listener of this.diagnosticListeners) {
      listener(diagnostic);
    }
  }

  private publishNonCall(
    interaction: "Emitter" | "Input",
    service: string,
    member: string,
    publish: (adapter: BridgeAdapter) => void
  ): void {
    if (this.adapter !== null) {
      try {
        publish(this.adapter);
      } catch (error) {
        this.reportFrontendDiagnostic({
          code: "BridgePublishError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message: `Failed to publish ${interaction} ${service}.${member}: ${errorMessage(error)}`,
          service,
          member,
          context: { interaction }
        });
      }
      return;
    }

    this.ready()
      .then(() => {
        try {
          publish(this.requireAdapterSync());
        } catch (error) {
          this.reportFrontendDiagnostic({
            code: "BridgePublishError",
            severity: "error",
            category: "bridge",
            recoverable: true,
            message: `Failed to publish ${interaction} ${service}.${member}: ${errorMessage(error)}`,
            service,
            member,
            context: { interaction }
          });
        }
      })
      .catch((error) => {
        this.reportFrontendDiagnostic({
          code: "BridgePublishError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message: `Failed to publish ${interaction} ${service}.${member}: ${errorMessage(error)}`,
          service,
          member,
          context: { interaction }
        });
      });
  }

  private async init(): Promise<void> {
    const anyWindow = window as unknown as { qt?: { webChannelTransport?: unknown }; QWebChannel?: QWebChannelCtor };
    if (typeof anyWindow.QWebChannel === "function" && anyWindow.qt?.webChannelTransport !== undefined) {
      this.adapter = await QtWebChannelAdapter.create();
    } else {
      this.adapter = await WebSocketBridgeAdapter.create();
    }

    const adapter = this.adapter;
    adapter.onHostDiagnostic((payload) => {
      this.pushDiagnostic({
        ...normalizeHostDiagnostic(payload, adapter.transport),
        timestamp: new Date().toISOString()
      });
    });
    adapter.onDisconnected(() => {
      this._state.set("disconnected");
      this.reportFrontendDiagnostic({
        code: "BridgeDisconnectedError",
        severity: "error",
        category: "bridge",
        recoverable: true,
        message: "Bridge disconnected.",
        transport: adapter.transport
      });
    });

    adapter.onOutput((service, member, value) => {
      const key = this.key(service, member);
      for (const outputHandler of this.outputHandlers.get(key) ?? []) {
        outputHandler(value);
      }
    });
    adapter.onSlotInvocation(async (requestId, service, member, args) => {
      const key = this.key(service, member);
      const handler = this.slotHandlers.get(key);
      if (handler === undefined) {
        this.reportFrontendDiagnostic({
          code: "HandlerNotRegisteredError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message: `No slot handler registered for ${service}.${member}.`,
          service,
          member,
          requestId,
          context: { interaction: "Slot" }
        });
        adapter.resolveSlot(requestId, false, undefined, "No slot handler registered.");
        return;
      }
      try {
        const result = await Promise.resolve(handler(...args));
        if (result instanceof Error) {
          this.reportFrontendDiagnostic({
            code: "SlotRequestFailed",
            severity: "error",
            category: "bridge",
            recoverable: true,
            message: result.message.length > 0
              ? result.message
              : `Slot ${service}.${member} returned an Error.`,
            service,
            member,
            requestId,
            context: { interaction: "Slot" }
          });
          adapter.resolveSlot(requestId, false, undefined, result.message);
          return;
        }
        adapter.resolveSlot(requestId, true, result, "");
      } catch (error) {
        const message = errorMessage(error);
        this.reportFrontendDiagnostic({
          code: "SlotHandlerError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message: `Slot handler ${service}.${member} threw: ${message}`,
          service,
          member,
          requestId,
          context: { interaction: "Slot" }
        });
        adapter.resolveSlot(requestId, false, undefined, message);
      }
    });
    adapter.onDrop((service, member, payload, x, y) => {
      const key = this.key(service, member);
      for (const handler of this.dropHandlers.get(key) ?? []) {
        handler(payload, x, y);
      }
    });
    adapter.onHover((service, member, payload, x, y) => {
      const key = this.key(service, member);
      for (const handler of this.hoverHandlers.get(key) ?? []) {
        handler(payload, x, y);
      }
    });
    adapter.onHoverLeft((service, member) => {
      const key = this.key(service, member);
      for (const handler of this.hoverLeftHandlers.get(key) ?? []) {
        handler();
      }
    });
    for (const key of this.slotHandlers.keys()) {
      const parts = key.split("::");
      if (parts.length === 2) {
        adapter.registerSlot(parts[0], parts[1]);
      }
    }
    this._state.set("ready");
  }

  private key(service: string, member: string): string {
    return `${service}::${member}`;
  }
}

class AnQstBridgeDiagnostics {
  constructor(private readonly _bridge: AnQstBridgeRuntime) {}

  diagnostics(): readonly AnQstBridgeDiagnostic[] {
    return this._bridge.diagnostics();
  }

  state(): AnQstBridgeState {
    return this._bridge.state();
  }

  subscribe(listener: (diagnostic: AnQstBridgeDiagnostic) => void): () => void {
    return this._bridge.subscribeDiagnostics(listener);
  }
}

class PingService {

  constructor(private readonly _bridge: AnQstBridgeRuntime) {
  }
  async ping(value: string): Promise<string> { const result = await this._bridge.call<unknown>("PingService", "ping", [encodeAnQstStructured_string(value)]); return decodeAnQstStructured_string(result); }
}

interface TortureWidgetFrontend {
  diagnostics: AnQstBridgeDiagnostics;
  PingService: PingService;
}

async function createFrontend(): Promise<TortureWidgetFrontend> {
  const bridge = new AnQstBridgeRuntime();
  await bridge.ready();
  return {
    diagnostics: new AnQstBridgeDiagnostics(bridge),
    PingService: new PingService(bridge)
  };
}

(function bootstrapAnQstGenerated(global: typeof globalThis & { AnQstGenerated?: Record<string, unknown> }) {
  const root = global.AnQstGenerated ?? (global.AnQstGenerated = {});
  root["TortureWidget"] = {
    createFrontend
  };
})(window as typeof globalThis & { AnQstGenerated?: Record<string, unknown> });

export { AnQstBridgeDiagnostics, PingService, createFrontend };
export type { AnQstBridgeDiagnostic, AnQstBridgeState, TortureWidgetFrontend, TortureWidgetGlobal, AnQstGeneratedRoot };
