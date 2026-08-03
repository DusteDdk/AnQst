export {};
export interface ScalarLeaves {
    qint64Value: bigint;
    quint64Value: bigint;
    qint32Value: number;
    quint32Value: number;
    qint16Value: number;
    quint16Value: number;
    qint8Value: number;
    quint8Value: number;
    int32Value: number;
    uint32Value: number;
    int16Value: number;
    uint16Value: number;
    int8Value: number;
    uint8Value: number;
    bigintValue: bigint;
  }

export interface BinaryLeaves {
    bufferValue: ArrayBuffer;
    blobValue: ArrayBuffer;
    typedArrayValue: Uint8Array;
    uint8ArrayValue: Uint8Array;
    int8ArrayValue: Int8Array;
    uint16ArrayValue: Uint16Array;
    int16ArrayValue: Int16Array;
    uint32ArrayValue: Uint32Array;
    int32ArrayValue: Int32Array;
    float32ArrayValue: Float32Array;
    float64ArrayValue: Float64Array;
  }

interface ScalarLeaves {
  qint64Value: bigint;
  quint64Value: bigint;
  qint32Value: number;
  quint32Value: number;
  qint16Value: number;
  quint16Value: number;
  qint8Value: number;
  quint8Value: number;
  int32Value: number;
  uint32Value: number;
  int16Value: number;
  uint16Value: number;
  int8Value: number;
  uint8Value: number;
  bigintValue: bigint;
}

declare const ScalarLeaves: {
  new (qint64Value: bigint, quint64Value: bigint, qint32Value: number, quint32Value: number, qint16Value: number, quint16Value: number, qint8Value: number, quint8Value: number, int32Value: number, uint32Value: number, int16Value: number, uint16Value: number, int8Value: number, uint8Value: number, bigintValue: bigint): ScalarLeaves;
  prototype: ScalarLeaves;
};

interface BinaryLeaves {
  bufferValue: ArrayBuffer;
  blobValue: ArrayBuffer;
  typedArrayValue: Uint8Array;
  uint8ArrayValue: Uint8Array;
  int8ArrayValue: Int8Array;
  uint16ArrayValue: Uint16Array;
  int16ArrayValue: Int16Array;
  uint32ArrayValue: Uint32Array;
  int32ArrayValue: Int32Array;
  float32ArrayValue: Float32Array;
  float64ArrayValue: Float64Array;
}

declare const BinaryLeaves: {
  new (bufferValue: ArrayBuffer, blobValue: ArrayBuffer, typedArrayValue: Uint8Array, uint8ArrayValue: Uint8Array, int8ArrayValue: Int8Array, uint16ArrayValue: Uint16Array, int16ArrayValue: Int16Array, uint32ArrayValue: Uint32Array, int32ArrayValue: Int32Array, float32ArrayValue: Float32Array, float64ArrayValue: Float64Array): BinaryLeaves;
  prototype: BinaryLeaves;
};

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

declare class CodecService {
  roundTripScalars(value: ScalarLeaves): Promise<ScalarLeaves>;
  roundTripBinary(value: BinaryLeaves): Promise<BinaryLeaves>;
}

interface CodecLeafWidgetFrontend {
  diagnostics: AnQstBridgeDiagnostics;
  CodecService: CodecService;
  ScalarLeaves: typeof ScalarLeaves;
  BinaryLeaves: typeof BinaryLeaves;
}

declare function createFrontend(): Promise<CodecLeafWidgetFrontend>;

interface CodecLeafWidgetGlobal {
  createFrontend(): Promise<CodecLeafWidgetFrontend>;
}

interface AnQstGeneratedRoot {
  CodecLeafWidget: CodecLeafWidgetGlobal;
}

declare global {
  interface Window {
    AnQstGenerated: AnQstGeneratedRoot;
  }

  var AnQstGenerated: AnQstGeneratedRoot;
}

export { AnQstBridgeDiagnostics, CodecService, ScalarLeaves, BinaryLeaves, createFrontend };
export type { AnQstBridgeDiagnostic, AnQstBridgeState, CodecLeafWidgetFrontend, CodecLeafWidgetGlobal, AnQstGeneratedRoot };
