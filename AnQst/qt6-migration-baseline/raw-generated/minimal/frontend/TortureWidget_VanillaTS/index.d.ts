export {};
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

declare class PingService {
  ping(value: string): Promise<string>;
}

interface TortureWidgetFrontend {
  diagnostics: AnQstBridgeDiagnostics;
  PingService: PingService;
}

declare function createFrontend(): Promise<TortureWidgetFrontend>;

interface TortureWidgetGlobal {
  createFrontend(): Promise<TortureWidgetFrontend>;
}

interface AnQstGeneratedRoot {
  TortureWidget: TortureWidgetGlobal;
}

declare global {
  interface Window {
    AnQstGenerated: AnQstGeneratedRoot;
  }

  var AnQstGenerated: AnQstGeneratedRoot;
}

export { AnQstBridgeDiagnostics, PingService, createFrontend };
export type { AnQstBridgeDiagnostic, AnQstBridgeState, TortureWidgetFrontend, TortureWidgetGlobal, AnQstGeneratedRoot };
