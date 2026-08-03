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

class ScalarLeaves {
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

  constructor(qint64Value: bigint, quint64Value: bigint, qint32Value: number, quint32Value: number, qint16Value: number, quint16Value: number, qint8Value: number, quint8Value: number, int32Value: number, uint32Value: number, int16Value: number, uint16Value: number, int8Value: number, uint8Value: number, bigintValue: bigint) {
    this.qint64Value = qint64Value;
    this.quint64Value = quint64Value;
    this.qint32Value = qint32Value;
    this.quint32Value = quint32Value;
    this.qint16Value = qint16Value;
    this.quint16Value = quint16Value;
    this.qint8Value = qint8Value;
    this.quint8Value = quint8Value;
    this.int32Value = int32Value;
    this.uint32Value = uint32Value;
    this.int16Value = int16Value;
    this.uint16Value = uint16Value;
    this.int8Value = int8Value;
    this.uint8Value = uint8Value;
    this.bigintValue = bigintValue;
  }
}

class BinaryLeaves {
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

  constructor(bufferValue: ArrayBuffer, blobValue: ArrayBuffer, typedArrayValue: Uint8Array, uint8ArrayValue: Uint8Array, int8ArrayValue: Int8Array, uint16ArrayValue: Uint16Array, int16ArrayValue: Int16Array, uint32ArrayValue: Uint32Array, int32ArrayValue: Int32Array, float32ArrayValue: Float32Array, float64ArrayValue: Float64Array) {
    this.bufferValue = bufferValue;
    this.blobValue = blobValue;
    this.typedArrayValue = typedArrayValue;
    this.uint8ArrayValue = uint8ArrayValue;
    this.int8ArrayValue = int8ArrayValue;
    this.uint16ArrayValue = uint16ArrayValue;
    this.int16ArrayValue = int16ArrayValue;
    this.uint32ArrayValue = uint32ArrayValue;
    this.int32ArrayValue = int32ArrayValue;
    this.float32ArrayValue = float32ArrayValue;
    this.float64ArrayValue = float64ArrayValue;
  }
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
            const host = channel.objects["CodecLeafWidgetBridge"];
            if (host === undefined) {
              reject(new Error("CodecLeafWidgetBridge bridge object is unavailable."));
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

class CodecService {

  constructor(private readonly _bridge: AnQstBridgeRuntime) {
  }
  async roundTripScalars(value: ScalarLeaves): Promise<ScalarLeaves> { const result = await this._bridge.call<unknown>("CodecService", "roundTripScalars", [encodeAnQstStructured_ScalarLeaves(value)]); return decodeAnQstStructured_ScalarLeaves(result); }
  async roundTripBinary(value: BinaryLeaves): Promise<BinaryLeaves> { const result = await this._bridge.call<unknown>("CodecService", "roundTripBinary", [encodeAnQstStructured_BinaryLeaves(value)]); return decodeAnQstStructured_BinaryLeaves(result); }
}

interface CodecLeafWidgetFrontend {
  diagnostics: AnQstBridgeDiagnostics;
  CodecService: CodecService;
  ScalarLeaves: typeof ScalarLeaves;
  BinaryLeaves: typeof BinaryLeaves;
}

async function createFrontend(): Promise<CodecLeafWidgetFrontend> {
  const bridge = new AnQstBridgeRuntime();
  await bridge.ready();
  return {
    diagnostics: new AnQstBridgeDiagnostics(bridge),
    CodecService: new CodecService(bridge),
    ScalarLeaves,
    BinaryLeaves
  };
}

(function bootstrapAnQstGenerated(global: typeof globalThis & { AnQstGenerated?: Record<string, unknown> }) {
  const root = global.AnQstGenerated ?? (global.AnQstGenerated = {});
  root["CodecLeafWidget"] = {
    createFrontend
  };
})(window as typeof globalThis & { AnQstGenerated?: Record<string, unknown> });

export { AnQstBridgeDiagnostics, CodecService, ScalarLeaves, BinaryLeaves, createFrontend };
export type { AnQstBridgeDiagnostic, AnQstBridgeState, CodecLeafWidgetFrontend, CodecLeafWidgetGlobal, AnQstGeneratedRoot };
