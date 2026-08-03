class ScalarLeaves {
    constructor(qint64Value, quint64Value, qint32Value, quint32Value, qint16Value, quint16Value, qint8Value, quint8Value, int32Value, uint32Value, int16Value, uint16Value, int8Value, uint8Value, bigintValue) {
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
    constructor(bufferValue, blobValue, typedArrayValue, uint8ArrayValue, int8ArrayValue, uint16ArrayValue, int16ArrayValue, uint32ArrayValue, int32ArrayValue, float32ArrayValue, float64ArrayValue) {
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
const __anqstBase93Encode = function (d) {
    var A = " !#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~", n = d.length, f = n >>> 2, r = n & 3, o = new Array(f * 5 + (r ? r + 1 : 0)), p = 0, i, v, b, j;
    for (i = 0; i < f; i++) {
        b = i << 2;
        v = ((d[b] << 24) | (d[b + 1] << 16) | (d[b + 2] << 8) | d[b + 3]) >>> 0;
        o[p + 4] = A[v % 93];
        v = (v / 93) | 0;
        o[p + 3] = A[v % 93];
        v = (v / 93) | 0;
        o[p + 2] = A[v % 93];
        v = (v / 93) | 0;
        o[p + 1] = A[v % 93];
        o[p] = A[(v / 93) | 0];
        p += 5;
    }
    if (r) {
        b = f << 2;
        v = 0;
        for (j = 0; j < r; j++)
            v = (v << 8) | d[b + j];
        for (j = r; j >= 0; j--) {
            o[p + j] = A[v % 93];
            v = (v / 93) | 0;
        }
    }
    return o.join("");
};
const __anqstBase93Decode = function (s) {
    var n = s.length, f = (n / 5) | 0, r = n - f * 5, o = new Uint8Array(f * 4 + (r ? r - 1 : 0)), p = 0, i, v, c, b;
    for (i = 0; i < f; i++) {
        b = i * 5;
        c = s.charCodeAt(b);
        v = c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
        c = s.charCodeAt(b + 1);
        v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
        c = s.charCodeAt(b + 2);
        v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
        c = s.charCodeAt(b + 3);
        v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
        c = s.charCodeAt(b + 4);
        v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
        o[p] = v >>> 24;
        o[p + 1] = (v >>> 16) & 255;
        o[p + 2] = (v >>> 8) & 255;
        o[p + 3] = v & 255;
        p += 4;
    }
    if (r) {
        v = 0;
        for (i = 0; i < r; i++) {
            c = s.charCodeAt(f * 5 + i);
            v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
        }
        for (i = r - 2; i >= 0; i--) {
            o[p + i] = v & 255;
            v = (v / 256) | 0;
        }
    }
    return o;
};
function __anqstEncodeWire(bytes, items) {
    if (bytes.length === 0) {
        if (items.length === 1)
            return items[0];
        return items;
    }
    const out = new Array(items.length + 1);
    out[0] = __anqstBase93Encode(Uint8Array.from(bytes));
    for (let i = 0; i < items.length; i += 1)
        out[i + 1] = items[i];
    if (out.length === 1)
        return out[0];
    return out;
}
const __anqstScalarScratchBuffer = new ArrayBuffer(8);
const __anqstScalarScratchView = new DataView(__anqstScalarScratchBuffer);
const __anqstScalarScratchBytes = new Uint8Array(__anqstScalarScratchBuffer);
function __anqstEncodeBinary_ArrayBuffer(value) { return __anqstBase93Encode(new Uint8Array(value)); }
function __anqstDecodeBinary_ArrayBuffer(encoded) { const bytes = __anqstBase93Decode(encoded); if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength)
    return bytes.buffer; return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); }
function __anqstEncodeBinary_Float32Array(value) { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Float32Array(encoded) { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 4) === 0)
    return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4); const copy = bytes.slice(); return new Float32Array(copy.buffer, 0, copy.byteLength / 4); }
function __anqstEncodeBinary_Float64Array(value) { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Float64Array(encoded) { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 8) === 0)
    return new Float64Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 8); const copy = bytes.slice(); return new Float64Array(copy.buffer, 0, copy.byteLength / 8); }
function __anqstEncodeBinary_Int16Array(value) { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Int16Array(encoded) { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 2) === 0)
    return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2); const copy = bytes.slice(); return new Int16Array(copy.buffer, 0, copy.byteLength / 2); }
function __anqstEncodeBinary_Int32Array(value) { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Int32Array(encoded) { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 4) === 0)
    return new Int32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4); const copy = bytes.slice(); return new Int32Array(copy.buffer, 0, copy.byteLength / 4); }
function __anqstEncodeBinary_Int8Array(value) { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Int8Array(encoded) { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 1) === 0)
    return new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 1); const copy = bytes.slice(); return new Int8Array(copy.buffer, 0, copy.byteLength / 1); }
function __anqstEncodeBinary_Uint16Array(value) { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Uint16Array(encoded) { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 2) === 0)
    return new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2); const copy = bytes.slice(); return new Uint16Array(copy.buffer, 0, copy.byteLength / 2); }
function __anqstEncodeBinary_Uint32Array(value) { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Uint32Array(encoded) { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 4) === 0)
    return new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4); const copy = bytes.slice(); return new Uint32Array(copy.buffer, 0, copy.byteLength / 4); }
function __anqstEncodeBinary_Uint8Array(value) { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
function __anqstDecodeBinary_Uint8Array(encoded) { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % 1) === 0)
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 1); const copy = bytes.slice(); return new Uint8Array(copy.buffer, 0, copy.byteLength / 1); }
function __anqstNamed_AnQstStructured_ScalarLeaves_ScalarLeaves_encode(value, __bytes, __items) {
    __anqstScalarScratchView.setBigInt64(0, value.qint64Value, true);
    __bytes.push(__anqstScalarScratchBytes[0], __anqstScalarScratchBytes[1], __anqstScalarScratchBytes[2], __anqstScalarScratchBytes[3], __anqstScalarScratchBytes[4], __anqstScalarScratchBytes[5], __anqstScalarScratchBytes[6], __anqstScalarScratchBytes[7]);
    __anqstScalarScratchView.setBigUint64(0, value.quint64Value, true);
    __bytes.push(__anqstScalarScratchBytes[0], __anqstScalarScratchBytes[1], __anqstScalarScratchBytes[2], __anqstScalarScratchBytes[3], __anqstScalarScratchBytes[4], __anqstScalarScratchBytes[5], __anqstScalarScratchBytes[6], __anqstScalarScratchBytes[7]);
    const __u321 = (value.qint32Value) >>> 0;
    __bytes.push(__u321 & 0xff, (__u321 >>> 8) & 0xff, (__u321 >>> 16) & 0xff, (__u321 >>> 24) & 0xff);
    const __u322 = (value.quint32Value) >>> 0;
    __bytes.push(__u322 & 0xff, (__u322 >>> 8) & 0xff, (__u322 >>> 16) & 0xff, (__u322 >>> 24) & 0xff);
    const __u163 = (value.qint16Value) & 0xffff;
    __bytes.push(__u163 & 0xff, (__u163 >>> 8) & 0xff);
    const __u164 = (value.quint16Value) & 0xffff;
    __bytes.push(__u164 & 0xff, (__u164 >>> 8) & 0xff);
    __bytes.push((value.qint8Value) & 0xff);
    __bytes.push((value.quint8Value) & 0xff);
    const __u325 = (value.int32Value) >>> 0;
    __bytes.push(__u325 & 0xff, (__u325 >>> 8) & 0xff, (__u325 >>> 16) & 0xff, (__u325 >>> 24) & 0xff);
    const __u326 = (value.uint32Value) >>> 0;
    __bytes.push(__u326 & 0xff, (__u326 >>> 8) & 0xff, (__u326 >>> 16) & 0xff, (__u326 >>> 24) & 0xff);
    const __u167 = (value.int16Value) & 0xffff;
    __bytes.push(__u167 & 0xff, (__u167 >>> 8) & 0xff);
    const __u168 = (value.uint16Value) & 0xffff;
    __bytes.push(__u168 & 0xff, (__u168 >>> 8) & 0xff);
    __bytes.push((value.int8Value) & 0xff);
    __bytes.push((value.uint8Value) & 0xff);
    __anqstScalarScratchView.setBigInt64(0, value.bigintValue, true);
    __bytes.push(__anqstScalarScratchBytes[0], __anqstScalarScratchBytes[1], __anqstScalarScratchBytes[2], __anqstScalarScratchBytes[3], __anqstScalarScratchBytes[4], __anqstScalarScratchBytes[5], __anqstScalarScratchBytes[6], __anqstScalarScratchBytes[7]);
}
function __anqstNamed_AnQstStructured_ScalarLeaves_ScalarLeaves_decode(__blob, __blobView, __dataCursor, __items, __itemIndex) {
    const __value1 = {};
    __value1.qint64Value = ((__dataCursor.offset += 8, __blobView.getBigInt64(__dataCursor.offset - 8, true)));
    __value1.quint64Value = ((__dataCursor.offset += 8, __blobView.getBigUint64(__dataCursor.offset - 8, true)));
    __value1.qint32Value = ((__dataCursor.offset += 4, __blobView.getInt32(__dataCursor.offset - 4, true)));
    __value1.quint32Value = ((__dataCursor.offset += 4, __blobView.getUint32(__dataCursor.offset - 4, true)));
    __value1.qint16Value = ((__dataCursor.offset += 2, __blobView.getInt16(__dataCursor.offset - 2, true)));
    __value1.quint16Value = ((__dataCursor.offset += 2, __blobView.getUint16(__dataCursor.offset - 2, true)));
    __value1.qint8Value = (__blobView.getInt8(__dataCursor.offset++));
    __value1.quint8Value = (__blob[__dataCursor.offset++]);
    __value1.int32Value = ((__dataCursor.offset += 4, __blobView.getInt32(__dataCursor.offset - 4, true)));
    __value1.uint32Value = ((__dataCursor.offset += 4, __blobView.getUint32(__dataCursor.offset - 4, true)));
    __value1.int16Value = ((__dataCursor.offset += 2, __blobView.getInt16(__dataCursor.offset - 2, true)));
    __value1.uint16Value = ((__dataCursor.offset += 2, __blobView.getUint16(__dataCursor.offset - 2, true)));
    __value1.int8Value = (__blobView.getInt8(__dataCursor.offset++));
    __value1.uint8Value = (__blob[__dataCursor.offset++]);
    __value1.bigintValue = ((__dataCursor.offset += 8, __blobView.getBigInt64(__dataCursor.offset - 8, true)));
    return __value1;
}
function encodeAnQstStructured_ScalarLeaves(value) {
    const __bytes = [];
    const __items = [];
    __anqstNamed_AnQstStructured_ScalarLeaves_ScalarLeaves_encode(value, __bytes, __items);
    return __anqstEncodeWire(__bytes, __items);
}
function decodeAnQstStructured_ScalarLeaves(wire) {
    var _a;
    const __items = Array.isArray(wire) ? wire : [wire];
    const __blob = __anqstBase93Decode(String((_a = __items[0]) !== null && _a !== void 0 ? _a : ""));
    const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
    const __itemIndex = { value: 1 };
    const __dataCursor = { offset: 0 };
    const __result = __anqstNamed_AnQstStructured_ScalarLeaves_ScalarLeaves_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
    return __result;
}
function __anqstNamed_AnQstStructured_BinaryLeaves_BinaryLeaves_encode(value, __bytes, __items) {
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
function __anqstNamed_AnQstStructured_BinaryLeaves_BinaryLeaves_decode(__blob, __blobView, __dataCursor, __items, __itemIndex) {
    const __value1 = {};
    __value1.bufferValue = (__anqstDecodeBinary_ArrayBuffer(String(__items[__itemIndex.value++])));
    __value1.blobValue = (__anqstDecodeBinary_ArrayBuffer(String(__items[__itemIndex.value++])));
    __value1.typedArrayValue = (__anqstDecodeBinary_Uint8Array(String(__items[__itemIndex.value++])));
    __value1.uint8ArrayValue = (__anqstDecodeBinary_Uint8Array(String(__items[__itemIndex.value++])));
    __value1.int8ArrayValue = (__anqstDecodeBinary_Int8Array(String(__items[__itemIndex.value++])));
    __value1.uint16ArrayValue = (__anqstDecodeBinary_Uint16Array(String(__items[__itemIndex.value++])));
    __value1.int16ArrayValue = (__anqstDecodeBinary_Int16Array(String(__items[__itemIndex.value++])));
    __value1.uint32ArrayValue = (__anqstDecodeBinary_Uint32Array(String(__items[__itemIndex.value++])));
    __value1.int32ArrayValue = (__anqstDecodeBinary_Int32Array(String(__items[__itemIndex.value++])));
    __value1.float32ArrayValue = (__anqstDecodeBinary_Float32Array(String(__items[__itemIndex.value++])));
    __value1.float64ArrayValue = (__anqstDecodeBinary_Float64Array(String(__items[__itemIndex.value++])));
    return __value1;
}
function encodeAnQstStructured_BinaryLeaves(value) {
    const __bytes = [];
    const __items = [];
    __anqstNamed_AnQstStructured_BinaryLeaves_BinaryLeaves_encode(value, __bytes, __items);
    return __anqstEncodeWire(__bytes, __items);
}
function decodeAnQstStructured_BinaryLeaves(wire) {
    const __items = Array.isArray(wire) ? wire : [wire];
    const __blob = new Uint8Array();
    const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
    const __itemIndex = { value: 0 };
    const __dataCursor = { offset: 0 };
    const __result = __anqstNamed_AnQstStructured_BinaryLeaves_BinaryLeaves_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
    return __result;
}
function createValueCell(initial) {
    let current = initial;
    return {
        get() {
            return current;
        },
        set(value) {
            current = value;
        }
    };
}
function errorMessage(error) {
    if (error instanceof Error && typeof error.message === "string" && error.message.length > 0) {
        return error.message;
    }
    return String(error);
}
function normalizeSeverity(value) {
    if (value === "info" || value === "warn" || value === "error" || value === "fatal") {
        return value;
    }
    return "error";
}
function asRecord(value) {
    if (value === null || typeof value !== "object") {
        return undefined;
    }
    return value;
}
function readString(record, key) {
    const value = record === null || record === void 0 ? void 0 : record[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
}
function readBoolean(record, key) {
    const value = record === null || record === void 0 ? void 0 : record[key];
    return typeof value === "boolean" ? value : undefined;
}
function readContext(record) {
    const context = asRecord(record === null || record === void 0 ? void 0 : record["context"]);
    return context === undefined ? undefined : context;
}
function normalizeHostDiagnostic(payload, transport) {
    var _a, _b, _c, _d, _e, _f, _g;
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
        code: (_a = readString(row, "code")) !== null && _a !== void 0 ? _a : "HostDiagnostic",
        severity: normalizeSeverity(row["severity"]),
        category: (_b = readString(row, "category")) !== null && _b !== void 0 ? _b : "bridge",
        recoverable: (_c = readBoolean(row, "recoverable")) !== null && _c !== void 0 ? _c : true,
        message: (_d = readString(row, "message")) !== null && _d !== void 0 ? _d : "Host emitted a diagnostic payload.",
        source: "host",
        transport,
        service: (_e = readString(row, "service")) !== null && _e !== void 0 ? _e : readString(context, "service"),
        member: (_f = readString(row, "member")) !== null && _f !== void 0 ? _f : readString(context, "member"),
        requestId: (_g = readString(row, "requestId")) !== null && _g !== void 0 ? _g : readString(context, "requestId"),
        context
    };
}
function isBridgeCallError(value) {
    if (value === null || typeof value !== "object")
        return false;
    const row = value;
    return (Object.prototype.hasOwnProperty.call(row, "code")
        && Object.prototype.hasOwnProperty.call(row, "message")
        && Object.prototype.hasOwnProperty.call(row, "service")
        && Object.prototype.hasOwnProperty.call(row, "member")
        && Object.prototype.hasOwnProperty.call(row, "requestId"));
}
class QtWebChannelAdapter {
    constructor(host) {
        this.host = host;
        this.transport = "qt-webchannel";
    }
    static async create() {
        var _a;
        const anyWindow = window;
        if (typeof anyWindow.QWebChannel !== "function" || ((_a = anyWindow.qt) === null || _a === void 0 ? void 0 : _a.webChannelTransport) === undefined) {
            throw new Error("Qt WebChannel transport is unavailable.");
        }
        return await new Promise((resolve, reject) => {
            try {
                const QWebChannel = anyWindow.QWebChannel;
                new QWebChannel(anyWindow.qt.webChannelTransport, (channel) => {
                    try {
                        const host = channel.objects["CodecLeafWidgetBridge"];
                        if (host === undefined) {
                            reject(new Error("CodecLeafWidgetBridge bridge object is unavailable."));
                            return;
                        }
                        resolve(new QtWebChannelAdapter(host));
                    }
                    catch (error) {
                        reject(error instanceof Error ? error : new Error(String(error)));
                    }
                });
            }
            catch (error) {
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }
    async call(service, member, args) {
        return new Promise((resolve, reject) => {
            this.host.anQstBridge_call(service, member, args, (result) => {
                if (isBridgeCallError(result)) {
                    reject(result);
                    return;
                }
                resolve(result);
            });
        });
    }
    emit(service, member, args) {
        this.host.anQstBridge_emit(service, member, args);
    }
    setInput(service, member, value) {
        this.host.anQstBridge_setInput(service, member, value);
    }
    registerSlot(service, member) {
        this.host.anQstBridge_registerSlot(service, member);
    }
    resolveSlot(requestId, ok, payload, error) {
        this.host.anQstBridge_resolveSlot(requestId, ok, payload, error);
    }
    onOutput(handler) {
        this.host.anQstBridge_outputUpdated.connect(handler);
    }
    onSlotInvocation(handler) {
        this.host.anQstBridge_slotInvocationRequested.connect(handler);
    }
    onHostDiagnostic(handler) {
        var _a;
        (_a = this.host.anQstBridge_hostDiagnostic) === null || _a === void 0 ? void 0 : _a.connect(handler);
    }
    onDisconnected(_handler) {
        // QWebChannel does not expose a deterministic disconnect event here.
    }
    onDrop(handler) {
        this.host.anQstBridge_dropReceived.connect(handler);
    }
    onHover(handler) {
        this.host.anQstBridge_hoverUpdated.connect(handler);
    }
    onHoverLeft(handler) {
        this.host.anQstBridge_hoverLeft.connect(handler);
    }
}
class WebSocketBridgeAdapter {
    constructor(socket) {
        this.socket = socket;
        this.transport = "dev-websocket";
        this.pending = new Map();
        this.outputListeners = [];
        this.slotListeners = [];
        this.hostDiagnosticListeners = [];
        this.disconnectListeners = [];
        this.dropListeners = [];
        this.hoverListeners = [];
        this.hoverLeftListeners = [];
        this.requestCounter = 0;
        this.socket.addEventListener("message", (event) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
            const raw = typeof event.data === "string" ? event.data : String(event.data);
            const message = JSON.parse(raw);
            const type = String((_a = message["type"]) !== null && _a !== void 0 ? _a : "");
            if (type === "callResult") {
                const requestId = String((_b = message["requestId"]) !== null && _b !== void 0 ? _b : "");
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
                const service = String((_c = message["service"]) !== null && _c !== void 0 ? _c : "");
                const member = String((_d = message["member"]) !== null && _d !== void 0 ? _d : "");
                for (const listener of this.outputListeners) {
                    listener(service, member, message["value"]);
                }
                return;
            }
            if (type === "slotInvocationRequested") {
                const requestId = String((_e = message["requestId"]) !== null && _e !== void 0 ? _e : "");
                const service = String((_f = message["service"]) !== null && _f !== void 0 ? _f : "");
                const member = String((_g = message["member"]) !== null && _g !== void 0 ? _g : "");
                const args = Array.isArray(message["args"]) ? message["args"] : [];
                for (const listener of this.slotListeners) {
                    listener(requestId, service, member, args);
                }
                return;
            }
            if (type === "dropReceived") {
                const service = String((_h = message["service"]) !== null && _h !== void 0 ? _h : "");
                const member = String((_j = message["member"]) !== null && _j !== void 0 ? _j : "");
                const x = Number((_k = message["x"]) !== null && _k !== void 0 ? _k : 0);
                const y = Number((_l = message["y"]) !== null && _l !== void 0 ? _l : 0);
                for (const listener of this.dropListeners) {
                    listener(service, member, message["payload"], x, y);
                }
                return;
            }
            if (type === "hoverUpdated") {
                const service = String((_m = message["service"]) !== null && _m !== void 0 ? _m : "");
                const member = String((_o = message["member"]) !== null && _o !== void 0 ? _o : "");
                const x = Number((_p = message["x"]) !== null && _p !== void 0 ? _p : 0);
                const y = Number((_q = message["y"]) !== null && _q !== void 0 ? _q : 0);
                for (const listener of this.hoverListeners) {
                    listener(service, member, message["payload"], x, y);
                }
                return;
            }
            if (type === "hoverLeft") {
                const service = String((_r = message["service"]) !== null && _r !== void 0 ? _r : "");
                const member = String((_s = message["member"]) !== null && _s !== void 0 ? _s : "");
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
    static async create() {
        const configResponse = await fetch("/anqst-dev-config.json", { cache: "no-store" });
        if (!configResponse.ok) {
            throw new Error("AnQst host bootstrap missing: unable to read /anqst-dev-config.json");
        }
        const config = (await configResponse.json());
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
        }
        else if (wsUrl.startsWith("https://")) {
            wsUrl = "wss://" + wsUrl.slice("https://".length);
        }
        return await new Promise((resolve, reject) => {
            const socket = new WebSocket(wsUrl);
            socket.addEventListener("open", () => resolve(new WebSocketBridgeAdapter(socket)));
            socket.addEventListener("error", () => reject(new Error("Failed to connect to AnQst WebSocket bridge.")));
        });
    }
    async call(service, member, args) {
        const requestId = `req-${++this.requestCounter}`;
        const payload = { type: "call", requestId, service, member, args };
        return await new Promise((resolve, reject) => {
            this.pending.set(requestId, {
                service,
                member,
                requestId,
                resolve: (value) => resolve(value),
                reject
            });
            this.socket.send(JSON.stringify(payload));
        });
    }
    emit(service, member, args) {
        this.socket.send(JSON.stringify({ type: "emit", service, member, args }));
    }
    setInput(service, member, value) {
        this.socket.send(JSON.stringify({ type: "setInput", service, member, value }));
    }
    registerSlot(service, member) {
        this.socket.send(JSON.stringify({ type: "registerSlot", service, member }));
    }
    resolveSlot(requestId, ok, payload, error) {
        this.socket.send(JSON.stringify({ type: "resolveSlot", requestId, ok, payload, error }));
    }
    onOutput(handler) {
        this.outputListeners.push(handler);
    }
    onSlotInvocation(handler) {
        this.slotListeners.push(handler);
    }
    onHostDiagnostic(handler) {
        this.hostDiagnosticListeners.push(handler);
    }
    onDisconnected(handler) {
        this.disconnectListeners.push(handler);
    }
    onDrop(handler) {
        this.dropListeners.push(handler);
    }
    onHover(handler) {
        this.hoverListeners.push(handler);
    }
    onHoverLeft(handler) {
        this.hoverLeftListeners.push(handler);
    }
}
class AnQstBridgeRuntime {
    constructor() {
        this.adapter = null;
        this.slotHandlers = new Map();
        this.outputHandlers = new Map();
        this.dropHandlers = new Map();
        this.hoverHandlers = new Map();
        this.hoverLeftHandlers = new Map();
        this.diagnosticListeners = new Set();
        this._diagnostics = createValueCell([]);
        this._state = createValueCell("starting");
        this.startup = this.init().catch((error) => {
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
    }
    diagnostics() {
        return this._diagnostics.get();
    }
    state() {
        return this._state.get();
    }
    subscribeDiagnostics(listener) {
        this.diagnosticListeners.add(listener);
        return () => this.diagnosticListeners.delete(listener);
    }
    async ready() {
        return this.startup;
    }
    reportFrontendDiagnostic(diagnostic) {
        var _a, _b;
        this.pushDiagnostic({
            ...diagnostic,
            source: "frontend",
            transport: (_a = diagnostic.transport) !== null && _a !== void 0 ? _a : (_b = this.adapter) === null || _b === void 0 ? void 0 : _b.transport,
            timestamp: new Date().toISOString()
        });
    }
    async call(service, member, args) {
        const adapter = await this.requireAdapter();
        return adapter.call(service, member, args);
    }
    emit(service, member, args) {
        this.publishNonCall("Emitter", service, member, (adapter) => adapter.emit(service, member, args));
    }
    setInput(service, member, value) {
        this.publishNonCall("Input", service, member, (adapter) => adapter.setInput(service, member, value));
    }
    registerSlot(service, member, handler) {
        const key = this.key(service, member);
        this.slotHandlers.set(key, handler);
        if (this.adapter !== null) {
            try {
                this.adapter.registerSlot(service, member);
            }
            catch (error) {
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
            }
            catch (error) {
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
    onOutput(service, member, handler) {
        var _a;
        const key = this.key(service, member);
        const existing = (_a = this.outputHandlers.get(key)) !== null && _a !== void 0 ? _a : [];
        existing.push(handler);
        this.outputHandlers.set(key, existing);
    }
    onDrop(service, member, handler) {
        var _a;
        const key = this.key(service, member);
        const existing = (_a = this.dropHandlers.get(key)) !== null && _a !== void 0 ? _a : [];
        existing.push(handler);
        this.dropHandlers.set(key, existing);
    }
    onHover(service, member, handler) {
        var _a;
        const key = this.key(service, member);
        const existing = (_a = this.hoverHandlers.get(key)) !== null && _a !== void 0 ? _a : [];
        existing.push(handler);
        this.hoverHandlers.set(key, existing);
    }
    onHoverLeft(service, member, handler) {
        var _a;
        const key = this.key(service, member);
        const existing = (_a = this.hoverLeftHandlers.get(key)) !== null && _a !== void 0 ? _a : [];
        existing.push(handler);
        this.hoverLeftHandlers.set(key, existing);
    }
    requireAdapterSync() {
        if (this.adapter === null) {
            throw new Error("AnQst bridge is not ready.");
        }
        return this.adapter;
    }
    async requireAdapter() {
        await this.startup;
        return this.requireAdapterSync();
    }
    pushDiagnostic(diagnostic) {
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
    publishNonCall(interaction, service, member, publish) {
        if (this.adapter !== null) {
            try {
                publish(this.adapter);
            }
            catch (error) {
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
            }
            catch (error) {
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
    async init() {
        var _a;
        const anyWindow = window;
        if (typeof anyWindow.QWebChannel === "function" && ((_a = anyWindow.qt) === null || _a === void 0 ? void 0 : _a.webChannelTransport) !== undefined) {
            this.adapter = await QtWebChannelAdapter.create();
        }
        else {
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
            var _a;
            const key = this.key(service, member);
            for (const outputHandler of (_a = this.outputHandlers.get(key)) !== null && _a !== void 0 ? _a : []) {
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
            }
            catch (error) {
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
            var _a;
            const key = this.key(service, member);
            for (const handler of (_a = this.dropHandlers.get(key)) !== null && _a !== void 0 ? _a : []) {
                handler(payload, x, y);
            }
        });
        adapter.onHover((service, member, payload, x, y) => {
            var _a;
            const key = this.key(service, member);
            for (const handler of (_a = this.hoverHandlers.get(key)) !== null && _a !== void 0 ? _a : []) {
                handler(payload, x, y);
            }
        });
        adapter.onHoverLeft((service, member) => {
            var _a;
            const key = this.key(service, member);
            for (const handler of (_a = this.hoverLeftHandlers.get(key)) !== null && _a !== void 0 ? _a : []) {
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
    key(service, member) {
        return `${service}::${member}`;
    }
}
AnQstBridgeRuntime.maxDiagnostics = 50;
class AnQstBridgeDiagnostics {
    constructor(_bridge) {
        this._bridge = _bridge;
    }
    diagnostics() {
        return this._bridge.diagnostics();
    }
    state() {
        return this._bridge.state();
    }
    subscribe(listener) {
        return this._bridge.subscribeDiagnostics(listener);
    }
}
class CodecService {
    constructor(_bridge) {
        this._bridge = _bridge;
    }
    async roundTripScalars(value) { const result = await this._bridge.call("CodecService", "roundTripScalars", [encodeAnQstStructured_ScalarLeaves(value)]); return decodeAnQstStructured_ScalarLeaves(result); }
    async roundTripBinary(value) { const result = await this._bridge.call("CodecService", "roundTripBinary", [encodeAnQstStructured_BinaryLeaves(value)]); return decodeAnQstStructured_BinaryLeaves(result); }
}
async function createFrontend() {
    const bridge = new AnQstBridgeRuntime();
    await bridge.ready();
    return {
        diagnostics: new AnQstBridgeDiagnostics(bridge),
        CodecService: new CodecService(bridge),
        ScalarLeaves,
        BinaryLeaves
    };
}
(function bootstrapAnQstGenerated(global) {
    var _a;
    const root = (_a = global.AnQstGenerated) !== null && _a !== void 0 ? _a : (global.AnQstGenerated = {});
    root["CodecLeafWidget"] = {
        createFrontend
    };
})(window);
