import type { Express, Request } from "express";
import type { WebSocket, WebSocketServer } from "ws";

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


// Boundary codec plan helpers
const __anqstBase93Encode: (d: Uint8Array) => string = function(d) {
var A = " !#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~", n = d.length, f = n >>> 2, r = n & 3,
o = new Array(f * 5 + (r ? r + 1 : 0)), p = 0, i, v, b, j;
for (i = 0; i < f; i++) {
b = i << 2;
v = ((d[b] << 24) | (d[b+1] << 16) | (d[b+2] << 8) | d[b+3]) >>> 0;
o[p+4] = A[v % 93]; v = (v / 93) | 0;
o[p+3] = A[v % 93]; v = (v / 93) | 0;
o[p+2] = A[v % 93]; v = (v / 93) | 0;
o[p+1] = A[v % 93];
o[p] = A[(v / 93) | 0];
p += 5;
}
if (r) {
b = f << 2; v = 0;
for (j = 0; j < r; j++) v = (v << 8) | d[b + j];
for (j = r; j >= 0; j--) { o[p + j] = A[v % 93]; v = (v / 93) | 0; }
}
return o.join("");
};
const __anqstBase93Decode: (s: string) => Uint8Array = function(s) {
var n = s.length, f = (n / 5) | 0, r = n - f * 5,
o = new Uint8Array(f * 4 + (r ? r - 1 : 0)), p = 0, i, v, c, b;
for (i = 0; i < f; i++) {
b = i * 5;
c = s.charCodeAt(b); v = c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
c = s.charCodeAt(b + 1); v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
c = s.charCodeAt(b + 2); v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
c = s.charCodeAt(b + 3); v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
c = s.charCodeAt(b + 4); v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
o[p] = v >>> 24; o[p+1] = (v >>> 16) & 255; o[p+2] = (v >>> 8) & 255; o[p+3] = v & 255;
p += 4;
}
if (r) {
v = 0;
for (i = 0; i < r; i++) { c = s.charCodeAt(f * 5 + i); v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0); }
for (i = r - 2; i >= 0; i--) { o[p + i] = v & 255; v = (v / 256) | 0; }
}
return o;
};

function __anqstEncodeWire(bytes: number[], items: unknown[]): unknown {
  if (bytes.length === 0) {
    if (items.length === 1) return items[0];
    return items;
  }
  const out = new Array<unknown>(items.length + 1);
  out[0] = __anqstBase93Encode(Uint8Array.from(bytes));
  for (let i = 0; i < items.length; i += 1) out[i + 1] = items[i];
  if (out.length === 1) return out[0];
  return out;
}

const __anqstScalarScratchBuffer = new ArrayBuffer(8);
const __anqstScalarScratchView = new DataView(__anqstScalarScratchBuffer);
const __anqstScalarScratchBytes = new Uint8Array(__anqstScalarScratchBuffer);

function __anqstEncodeBinary_ArrayBuffer(value: ArrayBuffer): string { return __anqstBase93Encode(new Uint8Array(value)); }
function __anqstDecodeBinary_ArrayBuffer(encoded: string): ArrayBuffer { const bytes = __anqstBase93Decode(encoded); if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) return bytes.buffer as ArrayBuffer; return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); }
function __anqstEncodeBinary_Float32Array(value: Float32Array): string { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Float32Array(encoded: string): Float32Array { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 4) === 0) return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4); const copy = bytes.slice(); return new Float32Array(copy.buffer, 0, copy.byteLength / 4); }
function __anqstEncodeBinary_Float64Array(value: Float64Array): string { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Float64Array(encoded: string): Float64Array { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 8) === 0) return new Float64Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 8); const copy = bytes.slice(); return new Float64Array(copy.buffer, 0, copy.byteLength / 8); }
function __anqstEncodeBinary_Int16Array(value: Int16Array): string { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Int16Array(encoded: string): Int16Array { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 2) === 0) return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2); const copy = bytes.slice(); return new Int16Array(copy.buffer, 0, copy.byteLength / 2); }
function __anqstEncodeBinary_Int32Array(value: Int32Array): string { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Int32Array(encoded: string): Int32Array { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 4) === 0) return new Int32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4); const copy = bytes.slice(); return new Int32Array(copy.buffer, 0, copy.byteLength / 4); }
function __anqstEncodeBinary_Int8Array(value: Int8Array): string { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Int8Array(encoded: string): Int8Array { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 1) === 0) return new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 1); const copy = bytes.slice(); return new Int8Array(copy.buffer, 0, copy.byteLength / 1); }
function __anqstEncodeBinary_Uint16Array(value: Uint16Array): string { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Uint16Array(encoded: string): Uint16Array { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 2) === 0) return new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2); const copy = bytes.slice(); return new Uint16Array(copy.buffer, 0, copy.byteLength / 2); }
function __anqstEncodeBinary_Uint32Array(value: Uint32Array): string { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Uint32Array(encoded: string): Uint32Array { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 4) === 0) return new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4); const copy = bytes.slice(); return new Uint32Array(copy.buffer, 0, copy.byteLength / 4); }
function __anqstEncodeBinary_Uint8Array(value: Uint8Array): string { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Uint8Array(encoded: string): Uint8Array { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 1) === 0) return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 1); const copy = bytes.slice(); return new Uint8Array(copy.buffer, 0, copy.byteLength / 1); }

function __anqstNamed_AnQstStructured_ScalarLeaves_ScalarLeaves_encode(value: ScalarLeaves, __bytes: number[], __items: unknown[]): void {
  __anqstScalarScratchView.setBigInt64(0, value.qint64Value, true);
  __bytes.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!);
  __anqstScalarScratchView.setBigUint64(0, value.quint64Value, true);
  __bytes.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!);
  const __u321 = ((value.qint32Value) as number) >>> 0;
  __bytes.push(__u321 & 0xff, (__u321 >>> 8) & 0xff, (__u321 >>> 16) & 0xff, (__u321 >>> 24) & 0xff);
  const __u322 = ((value.quint32Value) as number) >>> 0;
  __bytes.push(__u322 & 0xff, (__u322 >>> 8) & 0xff, (__u322 >>> 16) & 0xff, (__u322 >>> 24) & 0xff);
  const __u163 = ((value.qint16Value) as number) & 0xffff;
  __bytes.push(__u163 & 0xff, (__u163 >>> 8) & 0xff);
  const __u164 = ((value.quint16Value) as number) & 0xffff;
  __bytes.push(__u164 & 0xff, (__u164 >>> 8) & 0xff);
  __bytes.push(((value.qint8Value) as number) & 0xff);
  __bytes.push(((value.quint8Value) as number) & 0xff);
  const __u325 = ((value.int32Value) as number) >>> 0;
  __bytes.push(__u325 & 0xff, (__u325 >>> 8) & 0xff, (__u325 >>> 16) & 0xff, (__u325 >>> 24) & 0xff);
  const __u326 = ((value.uint32Value) as number) >>> 0;
  __bytes.push(__u326 & 0xff, (__u326 >>> 8) & 0xff, (__u326 >>> 16) & 0xff, (__u326 >>> 24) & 0xff);
  const __u167 = ((value.int16Value) as number) & 0xffff;
  __bytes.push(__u167 & 0xff, (__u167 >>> 8) & 0xff);
  const __u168 = ((value.uint16Value) as number) & 0xffff;
  __bytes.push(__u168 & 0xff, (__u168 >>> 8) & 0xff);
  __bytes.push(((value.int8Value) as number) & 0xff);
  __bytes.push(((value.uint8Value) as number) & 0xff);
  __anqstScalarScratchView.setBigInt64(0, value.bigintValue, true);
  __bytes.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!);
}

function __anqstNamed_AnQstStructured_ScalarLeaves_ScalarLeaves_decode(
  __blob: Uint8Array,
  __blobView: DataView,
  __dataCursor: { offset: number },
  __items: unknown[],
  __itemIndex: { value: number }
): ScalarLeaves {
  const __value1 = {} as ScalarLeaves;
  __value1.qint64Value = ((__dataCursor.offset += 8, __blobView.getBigInt64(__dataCursor.offset - 8, true))) as bigint;
  __value1.quint64Value = ((__dataCursor.offset += 8, __blobView.getBigUint64(__dataCursor.offset - 8, true))) as bigint;
  __value1.qint32Value = ((__dataCursor.offset += 4, __blobView.getInt32(__dataCursor.offset - 4, true))) as number;
  __value1.quint32Value = ((__dataCursor.offset += 4, __blobView.getUint32(__dataCursor.offset - 4, true))) as number;
  __value1.qint16Value = ((__dataCursor.offset += 2, __blobView.getInt16(__dataCursor.offset - 2, true))) as number;
  __value1.quint16Value = ((__dataCursor.offset += 2, __blobView.getUint16(__dataCursor.offset - 2, true))) as number;
  __value1.qint8Value = (__blobView.getInt8(__dataCursor.offset++)) as number;
  __value1.quint8Value = (__blob[__dataCursor.offset++]!) as number;
  __value1.int32Value = ((__dataCursor.offset += 4, __blobView.getInt32(__dataCursor.offset - 4, true))) as number;
  __value1.uint32Value = ((__dataCursor.offset += 4, __blobView.getUint32(__dataCursor.offset - 4, true))) as number;
  __value1.int16Value = ((__dataCursor.offset += 2, __blobView.getInt16(__dataCursor.offset - 2, true))) as number;
  __value1.uint16Value = ((__dataCursor.offset += 2, __blobView.getUint16(__dataCursor.offset - 2, true))) as number;
  __value1.int8Value = (__blobView.getInt8(__dataCursor.offset++)) as number;
  __value1.uint8Value = (__blob[__dataCursor.offset++]!) as number;
  __value1.bigintValue = ((__dataCursor.offset += 8, __blobView.getBigInt64(__dataCursor.offset - 8, true))) as bigint;
  return __value1;
}

function encodeAnQstStructured_ScalarLeaves(value: ScalarLeaves): unknown {
  const __bytes: number[] = [];
  const __items: unknown[] = [];
  __anqstNamed_AnQstStructured_ScalarLeaves_ScalarLeaves_encode(value, __bytes, __items);
  return __anqstEncodeWire(__bytes, __items);
}

function decodeAnQstStructured_ScalarLeaves(wire: unknown): ScalarLeaves {
  const __items = Array.isArray(wire) ? wire : [wire];
  const __blob = __anqstBase93Decode(String(__items[0] ?? ""));
  const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
  const __itemIndex = { value: 1 };
  const __dataCursor = { offset: 0 };

  const __result = __anqstNamed_AnQstStructured_ScalarLeaves_ScalarLeaves_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);


  return __result;
}

function __anqstNamed_AnQstStructured_BinaryLeaves_BinaryLeaves_encode(value: BinaryLeaves, __bytes: number[], __items: unknown[]): void {
  __items.push(__anqstEncodeBinary_ArrayBuffer(value.bufferValue));
  __items.push(__anqstEncodeBinary_ArrayBuffer(value.blobValue));
  __items.push(__anqstEncodeBinary_Uint8Array(value.typedArrayValue));
  __items.push(__anqstEncodeBinary_Uint8Array(value.uint8ArrayValue));
  __items.push(__anqstEncodeBinary_Int8Array(value.int8ArrayValue));
  __items.push(__anqstEncodeBinary_Uint16Array(value.uint16ArrayValue));
  __items.push(__anqstEncodeBinary_Int16Array(value.int16ArrayValue));
  __items.push(__anqstEncodeBinary_Uint32Array(value.uint32ArrayValue));
  __items.push(__anqstEncodeBinary_Int32Array(value.int32ArrayValue));
  __items.push(__anqstEncodeBinary_Float32Array(value.float32ArrayValue));
  __items.push(__anqstEncodeBinary_Float64Array(value.float64ArrayValue));
}

function __anqstNamed_AnQstStructured_BinaryLeaves_BinaryLeaves_decode(
  __blob: Uint8Array,
  __blobView: DataView,
  __dataCursor: { offset: number },
  __items: unknown[],
  __itemIndex: { value: number }
): BinaryLeaves {
  const __value1 = {} as BinaryLeaves;
  __value1.bufferValue = (__anqstDecodeBinary_ArrayBuffer(String(__items[__itemIndex.value++]!))) as ArrayBuffer;
  __value1.blobValue = (__anqstDecodeBinary_ArrayBuffer(String(__items[__itemIndex.value++]!))) as ArrayBuffer;
  __value1.typedArrayValue = (__anqstDecodeBinary_Uint8Array(String(__items[__itemIndex.value++]!))) as Uint8Array;
  __value1.uint8ArrayValue = (__anqstDecodeBinary_Uint8Array(String(__items[__itemIndex.value++]!))) as Uint8Array;
  __value1.int8ArrayValue = (__anqstDecodeBinary_Int8Array(String(__items[__itemIndex.value++]!))) as Int8Array;
  __value1.uint16ArrayValue = (__anqstDecodeBinary_Uint16Array(String(__items[__itemIndex.value++]!))) as Uint16Array;
  __value1.int16ArrayValue = (__anqstDecodeBinary_Int16Array(String(__items[__itemIndex.value++]!))) as Int16Array;
  __value1.uint32ArrayValue = (__anqstDecodeBinary_Uint32Array(String(__items[__itemIndex.value++]!))) as Uint32Array;
  __value1.int32ArrayValue = (__anqstDecodeBinary_Int32Array(String(__items[__itemIndex.value++]!))) as Int32Array;
  __value1.float32ArrayValue = (__anqstDecodeBinary_Float32Array(String(__items[__itemIndex.value++]!))) as Float32Array;
  __value1.float64ArrayValue = (__anqstDecodeBinary_Float64Array(String(__items[__itemIndex.value++]!))) as Float64Array;
  return __value1;
}

function encodeAnQstStructured_BinaryLeaves(value: BinaryLeaves): unknown {
  const __bytes: number[] = [];
  const __items: unknown[] = [];
  __anqstNamed_AnQstStructured_BinaryLeaves_BinaryLeaves_encode(value, __bytes, __items);
  return __anqstEncodeWire(__bytes, __items);
}

function decodeAnQstStructured_BinaryLeaves(wire: unknown): BinaryLeaves {
  const __items = Array.isArray(wire) ? wire : [wire];
  const __blob = new Uint8Array();
  const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
  const __itemIndex = { value: 0 };
  const __dataCursor = { offset: 0 };

  const __result = __anqstNamed_AnQstStructured_BinaryLeaves_BinaryLeaves_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);


  return __result;
}


export interface CodecServiceNodeHandlers {
  roundTripScalars(bridge: CodecLeafWidgetHandlerBridge, value: ScalarLeaves): ScalarLeaves | Promise<ScalarLeaves>;
  roundTripBinary(bridge: CodecLeafWidgetHandlerBridge, value: BinaryLeaves): BinaryLeaves | Promise<BinaryLeaves>;
}

export interface CodecLeafWidgetNodeImplementation {
  CodecService: CodecServiceNodeHandlers;
}

export interface CodecServiceSessionBridgeService {

  signal: {

  };
  property: {

  };
}

export interface CodecLeafWidgetSessionBridge {
  CodecLeafWidget: {
    CodecService: CodecServiceSessionBridgeService;
  };
}

export interface CodecLeafWidgetHandlerBridge {
  own: CodecLeafWidgetSessionBridge;
  others: Record<string, CodecLeafWidgetSessionBridge>;
  sessions: Record<string, CodecLeafWidgetSessionBridge>;
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

class CodecLeafWidgetNodeSession {
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

export interface CodecLeafWidgetNodeBridgeOptions {
  app: Express;
  wsServer: WebSocketServer;
  implementation: CodecLeafWidgetNodeImplementation;
  wsPath?: string;
  wsUrl?: string;
  devConfigPath?: string;
  defaultSlotTimeoutMs?: number;
  maxQueuedSlotInvocationsPerSlot?: number;
}

export interface CodecLeafWidgetNodeBridge {
  onSession(listener: (session: CodecLeafWidgetNodeSession) => void): () => void;
  subscribeDiagnostics(listener: (diagnostic: AnQstDiagnostic) => void): () => void;
  getSessions(): ReadonlyArray<CodecLeafWidgetNodeSession>;
  getSessionInterfaces(): Record<string, CodecLeafWidgetSessionBridge>;
  close(): void;
}

export function createCodecLeafWidgetNodeExpressWsBridge(options: CodecLeafWidgetNodeBridgeOptions): CodecLeafWidgetNodeBridge {
  const wsPath = options.wsPath ?? "/anqst-bridge";
  const devConfigPath = options.devConfigPath ?? "/anqst-dev-config.json";
  const defaultSlotTimeoutMs = options.defaultSlotTimeoutMs ?? 1000;
  const maxQueuedPerSlot = options.maxQueuedSlotInvocationsPerSlot ?? 1024;
  const sessions = new Map<WebSocket, CodecLeafWidgetNodeSession>();
  const diagnosticListeners = new Set<(diagnostic: AnQstDiagnostic) => void>();
  const sessionListeners = new Set<(session: CodecLeafWidgetNodeSession) => void>();
  let sessionCounter = 0;
  const implementation = options.implementation;

  const emitDiagnostic = (diagnostic: Omit<AnQstDiagnostic, "timestamp">): void => {
    const next: AnQstDiagnostic = { ...diagnostic, timestamp: nowIso() };
    for (const listener of diagnosticListeners) listener(next);
  };

  const getSessionInterfaces = (): Record<string, CodecLeafWidgetSessionBridge> => {
    const out: Record<string, CodecLeafWidgetSessionBridge> = {};
    for (const session of sessions.values()) {
      out[session.id] = {
        CodecLeafWidget: {
      CodecService: {

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

  const buildHandlerBridge = (session: CodecLeafWidgetNodeSession): CodecLeafWidgetHandlerBridge => {
    const byId = getSessionInterfaces();
    const others: Record<string, CodecLeafWidgetSessionBridge> = {};
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
      bridgeObject: "CodecLeafWidgetBridge"
    });
  });

  const handleMessage = (session: CodecLeafWidgetNodeSession, raw: string): void => {
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
    if (service === "CodecService" && member === "roundTripScalars") {
      const handler = implementation.CodecService.roundTripScalars;
      if (typeof handler !== "function") {
        const err = new Error("Missing Call handler CodecService.roundTripScalars");
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
      Promise.resolve(handler(buildHandlerBridge(session), decodeAnQstStructured_ScalarLeaves(args[0])))
        .then((result) => sendJson(session.socket, { type: "callResult", requestId, result: encodeAnQstStructured_ScalarLeaves(result) }))
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
    if (service === "CodecService" && member === "roundTripBinary") {
      const handler = implementation.CodecService.roundTripBinary;
      if (typeof handler !== "function") {
        const err = new Error("Missing Call handler CodecService.roundTripBinary");
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
      Promise.resolve(handler(buildHandlerBridge(session), decodeAnQstStructured_BinaryLeaves(args[0])))
        .then((result) => sendJson(session.socket, { type: "callResult", requestId, result: encodeAnQstStructured_BinaryLeaves(result) }))
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
    const session = new CodecLeafWidgetNodeSession(
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
