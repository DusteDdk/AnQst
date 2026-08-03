export type AnQstBridgeSeverity = "info" | "warn" | "error" | "fatal";

export type AnQstBridgeSource = "frontend" | "host";

export type AnQstBridgeTransport = "qt-webchannel" | "dev-websocket";

export type AnQstBridgeState = "starting" | "ready" | "failed" | "disconnected";

export interface AnQstBridgeDiagnostic {
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

export declare class AnQstBridgeDiagnostics {
  diagnostics(): readonly AnQstBridgeDiagnostic[];
  state(): AnQstBridgeState;
  subscribe(listener: (diagnostic: AnQstBridgeDiagnostic) => void): () => void;
}

export declare class PingService {
  ping(value: string): Promise<string>;
}
