import type { Express, Request } from "express";
import type { WebSocket, WebSocketServer } from "ws";



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


export interface PingServiceNodeHandlers {
  ping(bridge: TortureWidgetHandlerBridge, value: string): string | Promise<string>;
}

export interface TortureWidgetNodeImplementation {
  PingService: PingServiceNodeHandlers;
}

export interface PingServiceSessionBridgeService {

  signal: {

  };
  property: {

  };
}

export interface TortureWidgetSessionBridge {
  TortureWidget: {
    PingService: PingServiceSessionBridgeService;
  };
}

export interface TortureWidgetHandlerBridge {
  own: TortureWidgetSessionBridge;
  others: Record<string, TortureWidgetSessionBridge>;
  sessions: Record<string, TortureWidgetSessionBridge>;
  sessionId: string;
}

export interface AnQstDiagnostic {
  code: string;
  severity: "info" | "warn" | "error" | "fatal";
  category: string;
  recoverable: boolean;
  message: string;
  timestamp: string;
  sessionId?: string;
  service?: string;
  member?: string;
  requestId?: string;
  context?: Record<string, unknown>;
}

type SlotPending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type QueuedSlotInvocation = {
  requestId: string;
  service: string;
  member: string;
  args: unknown[];
  timeoutMs: number;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

function sendJson(socket: WebSocket, payload: Record<string, unknown>): void {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(payload));
  }
}

function makeWsUrl(req: Request, wsPath: string): string {
  const forwarded = req.header("x-forwarded-proto");
  const protocol = (forwarded ?? req.protocol).toLowerCase() === "https" ? "wss" : "ws";
  return `${protocol}://${req.get("host") ?? "localhost"}${wsPath}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

class TortureWidgetNodeSession {
  readonly registeredSlots = new Set<string>();
  private readonly pending = new Map<string, SlotPending>();
  private readonly queued = new Map<string, QueuedSlotInvocation[]>();
  private readonly signalListeners = new Map<string, Set<(...args: unknown[]) => void>>();
  private readonly inputListeners = new Map<string, Set<(value: unknown) => void>>();
  private readonly inputState = new Map<string, unknown>();
  private requestCounter = 0;

  constructor(
    readonly id: string,
    readonly socket: WebSocket,
    private readonly defaultSlotTimeoutMs: number,
    private readonly maxQueuedPerSlot: number,
    private readonly emitDiagnostic: (diagnostic: Omit<AnQstDiagnostic, "timestamp">) => void
  ) {}

  close(reason = "Session closed"): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
    }
    this.pending.clear();
    for (const queue of this.queued.values()) {
      for (const item of queue) item.reject(new Error(reason));
    }
    this.queued.clear();
    this.signalListeners.clear();
    this.inputListeners.clear();
    this.inputState.clear();
  }

  registerSlot(service: string, member: string): void {
    const key = `${service}::${member}`;
    this.registeredSlots.add(key);
    const queue = this.queued.get(key);
    if (!queue || queue.length === 0) return;
    this.queued.delete(key);
    for (const item of queue) this.dispatchSlot(item);
  }

  resolveSlot(requestId: string, ok: boolean, payload: unknown, error: string): void {
    const pending = this.pending.get(requestId);
    if (!pending) return;
    clearTimeout(pending.timeout);
    this.pending.delete(requestId);
    if (ok) {
      pending.resolve(payload);
      return;
    }
    pending.reject(new Error(error || "Slot invocation failed."));
  }

  invokeSlot(service: string, member: string, args: unknown[], timeoutMs = this.defaultSlotTimeoutMs): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = `slot-${this.id}-${++this.requestCounter}`;
      const item: QueuedSlotInvocation = { requestId, service, member, args, timeoutMs, resolve, reject };
      const key = `${service}::${member}`;
      if (!this.registeredSlots.has(key)) {
        const queue = this.queued.get(key) ?? [];
        if (queue.length >= this.maxQueuedPerSlot) {
          const dropped = queue.shift();
          dropped?.reject(new Error("Slot queue overflow."));
          this.emitDiagnostic({
            code: "SlotQueueOverflowError",
            severity: "warn",
            category: "bridge",
            recoverable: true,
            message: "Slot queue exceeded capacity; oldest queued request dropped.",
            sessionId: this.id,
            service,
            member,
            context: { maxQueuedPerSlot: this.maxQueuedPerSlot }
          });
        }
        queue.push(item);
        this.queued.set(key, queue);
        return;
      }
      this.dispatchSlot(item);
    });
  }

  setOutputValue(service: string, member: string, value: unknown): void {
    sendJson(this.socket, { type: "outputUpdated", service, member, value });
  }

  onSignal(service: string, member: string, handler: (...args: unknown[]) => void): () => void {
    const key = `${service}::${member}`;
    const listeners = this.signalListeners.get(key) ?? new Set<(...args: unknown[]) => void>();
    listeners.add(handler);
    this.signalListeners.set(key, listeners);
    return () => {
      const existing = this.signalListeners.get(key);
      if (!existing) return;
      existing.delete(handler);
      if (existing.size === 0) this.signalListeners.delete(key);
    };
  }

  emitSignal(service: string, member: string, args: unknown[]): void {
    const key = `${service}::${member}`;
    for (const handler of this.signalListeners.get(key) ?? []) {
      try {
        handler(...args);
      } catch {
        // Listener errors are intentionally isolated from protocol handling.
      }
    }
  }

  onInput(service: string, member: string, handler: (value: unknown) => void): () => void {
    const key = `${service}::${member}`;
    const listeners = this.inputListeners.get(key) ?? new Set<(value: unknown) => void>();
    listeners.add(handler);
    this.inputListeners.set(key, listeners);
    if (this.inputState.has(key)) {
      handler(this.inputState.get(key));
    }
    return () => {
      const existing = this.inputListeners.get(key);
      if (!existing) return;
      existing.delete(handler);
      if (existing.size === 0) this.inputListeners.delete(key);
    };
  }

  setInputState(service: string, member: string, value: unknown): void {
    const key = `${service}::${member}`;
    this.inputState.set(key, value);
    for (const handler of this.inputListeners.get(key) ?? []) {
      try {
        handler(value);
      } catch {
        // Listener errors are intentionally isolated from protocol handling.
      }
    }
  }

  readInput(service: string, member: string): Promise<unknown> {
    const key = `${service}::${member}`;
    if (!this.inputState.has(key)) {
      return Promise.reject(new Error(`Input value for ${service}.${member} is unavailable`));
    }
    return Promise.resolve(this.inputState.get(key));
  }




  private dispatchSlot(item: QueuedSlotInvocation): void {
    const timeout = setTimeout(() => {
      this.pending.delete(item.requestId);
      item.reject(new Error("slot invocation timeout"));
      this.emitDiagnostic({
        code: "BridgeTimeoutError",
        severity: "error",
        category: "bridge",
        recoverable: true,
        message: "Slot invocation timed out.",
        sessionId: this.id,
        service: item.service,
        member: item.member,
        requestId: item.requestId
      });
    }, item.timeoutMs);
    this.pending.set(item.requestId, { resolve: item.resolve, reject: item.reject, timeout });
    sendJson(this.socket, {
      type: "slotInvocationRequested",
      requestId: item.requestId,
      service: item.service,
      member: item.member,
      args: item.args
    });
  }
}

export interface TortureWidgetNodeBridgeOptions {
  app: Express;
  wsServer: WebSocketServer;
  implementation: TortureWidgetNodeImplementation;
  wsPath?: string;
  wsUrl?: string;
  devConfigPath?: string;
  defaultSlotTimeoutMs?: number;
  maxQueuedSlotInvocationsPerSlot?: number;
}

export interface TortureWidgetNodeBridge {
  onSession(listener: (session: TortureWidgetNodeSession) => void): () => void;
  subscribeDiagnostics(listener: (diagnostic: AnQstDiagnostic) => void): () => void;
  getSessions(): ReadonlyArray<TortureWidgetNodeSession>;
  getSessionInterfaces(): Record<string, TortureWidgetSessionBridge>;
  close(): void;
}

export function createTortureWidgetNodeExpressWsBridge(options: TortureWidgetNodeBridgeOptions): TortureWidgetNodeBridge {
  const wsPath = options.wsPath ?? "/anqst-bridge";
  const devConfigPath = options.devConfigPath ?? "/anqst-dev-config.json";
  const defaultSlotTimeoutMs = options.defaultSlotTimeoutMs ?? 1000;
  const maxQueuedPerSlot = options.maxQueuedSlotInvocationsPerSlot ?? 1024;
  const sessions = new Map<WebSocket, TortureWidgetNodeSession>();
  const diagnosticListeners = new Set<(diagnostic: AnQstDiagnostic) => void>();
  const sessionListeners = new Set<(session: TortureWidgetNodeSession) => void>();
  let sessionCounter = 0;
  const implementation = options.implementation;

  const emitDiagnostic = (diagnostic: Omit<AnQstDiagnostic, "timestamp">): void => {
    const next: AnQstDiagnostic = { ...diagnostic, timestamp: nowIso() };
    for (const listener of diagnosticListeners) listener(next);
  };

  const getSessionInterfaces = (): Record<string, TortureWidgetSessionBridge> => {
    const out: Record<string, TortureWidgetSessionBridge> = {};
    for (const session of sessions.values()) {
      out[session.id] = {
        TortureWidget: {
      PingService: {

        signal: {

        },
        property: {

        }
      },
        }
      };
    }
    return out;
  };

  const buildHandlerBridge = (session: TortureWidgetNodeSession): TortureWidgetHandlerBridge => {
    const byId = getSessionInterfaces();
    const others: Record<string, TortureWidgetSessionBridge> = {};
    for (const [id, view] of Object.entries(byId)) {
      if (id === session.id) continue;
      others[id] = view;
    }
    return {
      own: byId[session.id],
      others,
      sessions: byId,
      sessionId: session.id
    };
  };

  options.app.get(devConfigPath, (req, res) => {
    res.json({
      wsUrl: options.wsUrl ?? makeWsUrl(req, wsPath),
      bridgeObject: "TortureWidgetBridge"
    });
  });

  const handleMessage = (session: TortureWidgetNodeSession, raw: string): void => {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      emitDiagnostic({
        code: "DeserializationError",
        severity: "warn",
        category: "bridge",
        recoverable: true,
        message: "Incoming WS payload is not valid JSON.",
        sessionId: session.id
      });
      return;
    }
    const type = String(message.type ?? "");
    if (type === "registerSlot") {
      session.registerSlot(String(message.service ?? ""), String(message.member ?? ""));
      return;
    }
    if (type === "resolveSlot") {
      session.resolveSlot(String(message.requestId ?? ""), Boolean(message.ok), message.payload, String(message.error ?? ""));
      return;
    }
    if (type === "call") {
      const service = String(message.service ?? "");
      const member = String(message.member ?? "");
      const requestId = String(message.requestId ?? "");
      const args = Array.isArray(message.args) ? (message.args as unknown[]) : [];
    if (service === "PingService" && member === "ping") {
      const handler = implementation.PingService.ping;
      if (typeof handler !== "function") {
        const err = new Error("Missing Call handler PingService.ping");
        emitDiagnostic({
          code: "HandlerNotRegisteredError",
          severity: "fatal",
          category: "bridge",
          recoverable: false,
          message: err.message,
          sessionId: session.id,
          service,
          member,
          requestId
        });
        sendJson(session.socket, {
          type: "callResult",
          requestId,
          result: { code: "HandlerNotRegisteredError", message: err.message, service, member, requestId }
        });
        throw err;
      }
      Promise.resolve(handler(buildHandlerBridge(session), decodeAnQstStructured_string(args[0])))
        .then((result) => sendJson(session.socket, { type: "callResult", requestId, result: encodeAnQstStructured_string(result) }))
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          emitDiagnostic({
            code: "CallHandlerError",
            severity: "error",
            category: "bridge",
            recoverable: true,
            message,
            sessionId: session.id,
            service,
            member,
            requestId
          });
          sendJson(session.socket, {
            type: "callResult",
            requestId,
            result: { code: "CallHandlerError", message, service, member, requestId }
          });
        });
      return;
    }
      const err = new Error(`No Call mapping found for ${service}.${member}`);
      emitDiagnostic({
        code: "HandlerNotRegisteredError",
        severity: "fatal",
        category: "bridge",
        recoverable: false,
        message: err.message,
        sessionId: session.id,
        service,
        member,
        requestId
      });
      sendJson(session.socket, {
        type: "callResult",
        requestId,
        result: { code: "HandlerNotRegisteredError", message: err.message, service, member, requestId }
      });
      throw err;
    }
    if (type === "emit") {
      const service = String(message.service ?? "");
      const member = String(message.member ?? "");
      const args = Array.isArray(message.args) ? (message.args as unknown[]) : [];

      const err = new Error(`No Emitter mapping found for ${service}.${member}`);
      emitDiagnostic({
        code: "HandlerNotRegisteredError",
        severity: "fatal",
        category: "bridge",
        recoverable: false,
        message: err.message,
        sessionId: session.id,
        service,
        member
      });
      throw err;
    }
    if (type === "setInput") {
      const service = String(message.service ?? "");
      const member = String(message.member ?? "");
      const value = message.value;

      const err = new Error(`No Input mapping found for ${service}.${member}`);
      emitDiagnostic({
        code: "HandlerNotRegisteredError",
        severity: "fatal",
        category: "bridge",
        recoverable: false,
        message: err.message,
        sessionId: session.id,
        service,
        member
      });
      throw err;
    }
    emitDiagnostic({
      code: "ProtocolMessageUnknown",
      severity: "warn",
      category: "bridge",
      recoverable: true,
      message: `Unknown WS message type '${type}'.`,
      sessionId: session.id
    });
  };

  const onConnection = (socket: WebSocket): void => {
    const session = new TortureWidgetNodeSession(
      `session-${++sessionCounter}`,
      socket,
      defaultSlotTimeoutMs,
      maxQueuedPerSlot,
      emitDiagnostic
    );
    sessions.set(socket, session);
    for (const listener of sessionListeners) listener(session);
    sendJson(socket, { type: "hostReady" });
    socket.on("message", (data) => {
      handleMessage(session, typeof data === "string" ? data : data.toString());
    });
    socket.on("close", () => {
      session.close("Session closed");
      sessions.delete(socket);
    });
  };

  options.wsServer.on("connection", onConnection);

  return {
    onSession(listener) {
      sessionListeners.add(listener);
      for (const session of sessions.values()) listener(session);
      return () => sessionListeners.delete(listener);
    },
    subscribeDiagnostics(listener) {
      diagnosticListeners.add(listener);
      return () => diagnosticListeners.delete(listener);
    },
    getSessions() {
      return [...sessions.values()];
    },
    getSessionInterfaces() {
      return getSessionInterfaces();
    },
    close() {
      options.wsServer.off("connection", onConnection);
      for (const session of sessions.values()) session.close("Bridge closed");
      sessions.clear();
    }
  };
}
