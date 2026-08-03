class Track {
    constructor(title, durationSeconds) {
        this.title = title;
        this.durationSeconds = durationSeconds;
    }
}
class CdDraft {
    constructor(cdId, artist, albumTitle, releaseYear, genre, catalogNumber, barcode, tracks, notes, createdBy) {
        this.cdId = cdId;
        this.artist = artist;
        this.albumTitle = albumTitle;
        this.releaseYear = releaseYear;
        this.genre = genre;
        this.catalogNumber = catalogNumber;
        this.barcode = barcode;
        this.tracks = tracks;
        this.notes = notes;
        this.createdBy = createdBy;
    }
}
class ValidationResult {
    constructor(valid, message, field) {
        this.valid = valid;
        this.message = message;
        this.field = field;
    }
}
class SaveResult {
    constructor(saved, cdId, message) {
        this.saved = saved;
        this.cdId = cdId;
        this.message = message;
    }
}
class User {
    constructor(name, meta) {
        this.name = name;
        this.meta = meta;
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
function encodeAnQstStructured_string(value) {
    return value;
}
function decodeAnQstStructured_string(wire) {
    return (String(wire !== null && wire !== void 0 ? wire : ""));
}
function __anqstNamed_AnQstStructured_Genre_Genre_encode(value, __bytes, __items) {
    let __code1 = 0;
    switch (value) {
        case "Rock":
            __code1 = 0;
            break;
        case "Pop":
            __code1 = 1;
            break;
        case "Jazz":
            __code1 = 2;
            break;
        case "Classical":
            __code1 = 3;
            break;
        case "Electronic":
            __code1 = 4;
            break;
        case "Other":
            __code1 = 5;
            break;
        default: throw new Error("AnQst finite-domain encode received an unsupported value.");
    }
    __bytes.push((__code1) & 0xff);
}
function __anqstNamed_AnQstStructured_Genre_Genre_decode(__blob, __blobView, __dataCursor, __items, __itemIndex) {
    const __code1 = __blob[__dataCursor.offset++];
    let __value2 = ("Rock");
    switch (__code1) {
        case 0:
            __value2 = ("Rock");
            break;
        case 1:
            __value2 = ("Pop");
            break;
        case 2:
            __value2 = ("Jazz");
            break;
        case 3:
            __value2 = ("Classical");
            break;
        case 4:
            __value2 = ("Electronic");
            break;
        case 5:
            __value2 = ("Other");
            break;
    }
    return __value2;
}
function encodeAnQstStructured_Genre(value) {
    const __bytes = [];
    const __items = [];
    for (const __item1 of value) {
        __anqstNamed_AnQstStructured_Genre_Genre_encode(__item1, __bytes, __items);
    }
    return __anqstEncodeWire(__bytes, __items);
}
function decodeAnQstStructured_Genre(wire) {
    var _a;
    const __items = Array.isArray(wire) ? wire : [wire];
    const __blob = __anqstBase93Decode(String((_a = __items[0]) !== null && _a !== void 0 ? _a : ""));
    const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
    const __itemIndex = { value: 1 };
    const __dataCursor = { offset: 0 };
    const __remainingBytes4 = __blob.length - __dataCursor.offset;
    const __count2 = __remainingBytes4 / 1;
    const __array1 = new Array(__count2);
    for (let __index3 = 0; __index3 < __count2; __index3 += 1) {
        __array1[__index3] = __anqstNamed_AnQstStructured_Genre_Genre_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
    }
    const __result = __array1;
    return __result;
}
function __anqstNamed_AnQstStructured_ValidationResult_ValidationResult_encode(value, __bytes, __items) {
    __bytes.push(value.valid ? 1 : 0);
    __items.push(value.message);
    const __present1 = value.field !== undefined;
    __bytes.push((__present1 ? 1 : 0) & 0xff);
    if (__present1) {
        __items.push(value.field);
    }
}
function __anqstNamed_AnQstStructured_ValidationResult_ValidationResult_decode(__blob, __blobView, __dataCursor, __items, __itemIndex) {
    const __value1 = {};
    __value1.valid = (((__blob[__dataCursor.offset++] & 1) === 1));
    __value1.message = (String(__items[__itemIndex.value++]));
    const __present2 = __blob[__dataCursor.offset++] !== 0;
    if (__present2) {
        __value1.field = (String(__items[__itemIndex.value++]));
    }
    return __value1;
}
function encodeAnQstStructured_ValidationResult(value) {
    const __bytes = [];
    const __items = [];
    __anqstNamed_AnQstStructured_ValidationResult_ValidationResult_encode(value, __bytes, __items);
    return __anqstEncodeWire(__bytes, __items);
}
function decodeAnQstStructured_ValidationResult(wire) {
    var _a;
    const __items = Array.isArray(wire) ? wire : [wire];
    const __blob = __anqstBase93Decode(String((_a = __items[0]) !== null && _a !== void 0 ? _a : ""));
    const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
    const __itemIndex = { value: 1 };
    const __dataCursor = { offset: 0 };
    const __result = __anqstNamed_AnQstStructured_ValidationResult_ValidationResult_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
    return __result;
}
function __anqstNamed_AnQstStructured_CdDraft_CdDraft_encode(value, __bytes, __items) {
    __anqstScalarScratchView.setBigInt64(0, value.cdId, true);
    __bytes.push(__anqstScalarScratchBytes[0], __anqstScalarScratchBytes[1], __anqstScalarScratchBytes[2], __anqstScalarScratchBytes[3], __anqstScalarScratchBytes[4], __anqstScalarScratchBytes[5], __anqstScalarScratchBytes[6], __anqstScalarScratchBytes[7]);
    __items.push(value.artist);
    __items.push(value.albumTitle);
    const __u321 = (value.releaseYear) >>> 0;
    __bytes.push(__u321 & 0xff, (__u321 >>> 8) & 0xff, (__u321 >>> 16) & 0xff, (__u321 >>> 24) & 0xff);
    __anqstNamed_AnQstStructured_CdDraft_Genre_encode(value.genre, __bytes, __items);
    __items.push(value.catalogNumber);
    __items.push(value.barcode);
    const __u322 = (value.tracks.length >>> 0) >>> 0;
    __bytes.push(__u322 & 0xff, (__u322 >>> 8) & 0xff, (__u322 >>> 16) & 0xff, (__u322 >>> 24) & 0xff);
    for (const __item3 of value.tracks) {
        __anqstNamed_AnQstStructured_CdDraft_Track_encode(__item3, __bytes, __items);
    }
    __items.push(value.notes);
    __anqstNamed_AnQstStructured_CdDraft_User_encode(value.createdBy, __bytes, __items);
}
function __anqstNamed_AnQstStructured_CdDraft_CdDraft_decode(__blob, __blobView, __dataCursor, __items, __itemIndex) {
    const __value1 = {};
    __value1.cdId = ((__dataCursor.offset += 8, __blobView.getBigInt64(__dataCursor.offset - 8, true)));
    __value1.artist = (String(__items[__itemIndex.value++]));
    __value1.albumTitle = (String(__items[__itemIndex.value++]));
    __value1.releaseYear = ((__dataCursor.offset += 4, __blobView.getInt32(__dataCursor.offset - 4, true)));
    __value1.genre = __anqstNamed_AnQstStructured_CdDraft_Genre_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
    __value1.catalogNumber = (String(__items[__itemIndex.value++]));
    __value1.barcode = (String(__items[__itemIndex.value++]));
    const __count3 = (__dataCursor.offset += 4, __blobView.getUint32(__dataCursor.offset - 4, true));
    const __array2 = new Array(__count3);
    for (let __index4 = 0; __index4 < __count3; __index4 += 1) {
        __array2[__index4] = __anqstNamed_AnQstStructured_CdDraft_Track_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
    }
    __value1.tracks = __array2;
    __value1.notes = (String(__items[__itemIndex.value++]));
    __value1.createdBy = __anqstNamed_AnQstStructured_CdDraft_User_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
    return __value1;
}
function __anqstNamed_AnQstStructured_CdDraft_Genre_encode(value, __bytes, __items) {
    let __code1 = 0;
    switch (value) {
        case "Rock":
            __code1 = 0;
            break;
        case "Pop":
            __code1 = 1;
            break;
        case "Jazz":
            __code1 = 2;
            break;
        case "Classical":
            __code1 = 3;
            break;
        case "Electronic":
            __code1 = 4;
            break;
        case "Other":
            __code1 = 5;
            break;
        default: throw new Error("AnQst finite-domain encode received an unsupported value.");
    }
    __bytes.push((__code1) & 0xff);
}
function __anqstNamed_AnQstStructured_CdDraft_Genre_decode(__blob, __blobView, __dataCursor, __items, __itemIndex) {
    const __code1 = __blob[__dataCursor.offset++];
    let __value2 = ("Rock");
    switch (__code1) {
        case 0:
            __value2 = ("Rock");
            break;
        case 1:
            __value2 = ("Pop");
            break;
        case 2:
            __value2 = ("Jazz");
            break;
        case 3:
            __value2 = ("Classical");
            break;
        case 4:
            __value2 = ("Electronic");
            break;
        case 5:
            __value2 = ("Other");
            break;
    }
    return __value2;
}
function __anqstNamed_AnQstStructured_CdDraft_Track_encode(value, __bytes, __items) {
    __items.push(value.title);
    __anqstScalarScratchView.setFloat64(0, value.durationSeconds, true);
    __bytes.push(__anqstScalarScratchBytes[0], __anqstScalarScratchBytes[1], __anqstScalarScratchBytes[2], __anqstScalarScratchBytes[3], __anqstScalarScratchBytes[4], __anqstScalarScratchBytes[5], __anqstScalarScratchBytes[6], __anqstScalarScratchBytes[7]);
}
function __anqstNamed_AnQstStructured_CdDraft_Track_decode(__blob, __blobView, __dataCursor, __items, __itemIndex) {
    const __value1 = {};
    __value1.title = (String(__items[__itemIndex.value++]));
    __value1.durationSeconds = ((__dataCursor.offset += 8, __blobView.getFloat64(__dataCursor.offset - 8, true)));
    return __value1;
}
function __anqstNamed_AnQstStructured_CdDraft_User_encode(value, __bytes, __items) {
    __items.push(value.name);
    const __u321 = (value.meta.friends.length >>> 0) >>> 0;
    __bytes.push(__u321 & 0xff, (__u321 >>> 8) & 0xff, (__u321 >>> 16) & 0xff, (__u321 >>> 24) & 0xff);
    for (const __item2 of value.meta.friends) {
        __anqstScalarScratchView.setFloat64(0, __item2, true);
        __bytes.push(__anqstScalarScratchBytes[0], __anqstScalarScratchBytes[1], __anqstScalarScratchBytes[2], __anqstScalarScratchBytes[3], __anqstScalarScratchBytes[4], __anqstScalarScratchBytes[5], __anqstScalarScratchBytes[6], __anqstScalarScratchBytes[7]);
    }
}
function __anqstNamed_AnQstStructured_CdDraft_User_decode(__blob, __blobView, __dataCursor, __items, __itemIndex) {
    const __value1 = {};
    __value1.name = (String(__items[__itemIndex.value++]));
    const __value2 = {};
    const __count4 = (__dataCursor.offset += 4, __blobView.getUint32(__dataCursor.offset - 4, true));
    const __array3 = new Array(__count4);
    for (let __index5 = 0; __index5 < __count4; __index5 += 1) {
        __array3[__index5] = ((__dataCursor.offset += 8, __blobView.getFloat64(__dataCursor.offset - 8, true)));
    }
    __value2.friends = __array3;
    __value1.meta = __value2;
    return __value1;
}
function encodeAnQstStructured_CdDraft(value) {
    const __bytes = [];
    const __items = [];
    __anqstNamed_AnQstStructured_CdDraft_CdDraft_encode(value, __bytes, __items);
    return __anqstEncodeWire(__bytes, __items);
}
function decodeAnQstStructured_CdDraft(wire) {
    var _a;
    const __items = Array.isArray(wire) ? wire : [wire];
    const __blob = __anqstBase93Decode(String((_a = __items[0]) !== null && _a !== void 0 ? _a : ""));
    const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
    const __itemIndex = { value: 1 };
    const __dataCursor = { offset: 0 };
    const __result = __anqstNamed_AnQstStructured_CdDraft_CdDraft_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
    return __result;
}
function encodeAnQstStructured_number(value) {
    const __bytes = [];
    __anqstScalarScratchView.setFloat64(0, value, true);
    __bytes.push(__anqstScalarScratchBytes[0], __anqstScalarScratchBytes[1], __anqstScalarScratchBytes[2], __anqstScalarScratchBytes[3], __anqstScalarScratchBytes[4], __anqstScalarScratchBytes[5], __anqstScalarScratchBytes[6], __anqstScalarScratchBytes[7]);
    return __anqstBase93Encode(Uint8Array.from(__bytes));
}
function decodeAnQstStructured_number(wire) {
    const __blob = __anqstBase93Decode(String(wire !== null && wire !== void 0 ? wire : ""));
    const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
    const __dataCursor = { offset: 0 };
    const __result = ((__dataCursor.offset += 8, __blobView.getFloat64(__dataCursor.offset - 8, true)));
    return __result;
}
function __anqstNamed_AnQstStructured_Track_Track_encode(value, __bytes, __items) {
    __items.push(value.title);
    __anqstScalarScratchView.setFloat64(0, value.durationSeconds, true);
    __bytes.push(__anqstScalarScratchBytes[0], __anqstScalarScratchBytes[1], __anqstScalarScratchBytes[2], __anqstScalarScratchBytes[3], __anqstScalarScratchBytes[4], __anqstScalarScratchBytes[5], __anqstScalarScratchBytes[6], __anqstScalarScratchBytes[7]);
}
function __anqstNamed_AnQstStructured_Track_Track_decode(__blob, __blobView, __dataCursor, __items, __itemIndex) {
    const __value1 = {};
    __value1.title = (String(__items[__itemIndex.value++]));
    __value1.durationSeconds = ((__dataCursor.offset += 8, __blobView.getFloat64(__dataCursor.offset - 8, true)));
    return __value1;
}
function encodeAnQstStructured_Track(value) {
    const __bytes = [];
    const __items = [];
    for (const __item1 of value) {
        __anqstNamed_AnQstStructured_Track_Track_encode(__item1, __bytes, __items);
    }
    return __anqstEncodeWire(__bytes, __items);
}
function decodeAnQstStructured_Track(wire) {
    var _a;
    const __items = Array.isArray(wire) ? wire : [wire];
    const __blob = __anqstBase93Decode(String((_a = __items[0]) !== null && _a !== void 0 ? _a : ""));
    const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
    const __itemIndex = { value: 1 };
    const __dataCursor = { offset: 0 };
    const __remainingBytes4 = __blob.length - __dataCursor.offset;
    const __count2 = __remainingBytes4 / 8;
    const __array1 = new Array(__count2);
    for (let __index3 = 0; __index3 < __count2; __index3 += 1) {
        __array1[__index3] = __anqstNamed_AnQstStructured_Track_Track_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
    }
    const __result = __array1;
    return __result;
}
function __anqstNamed_AnQstStructured_SaveResult_SaveResult_encode(value, __bytes, __items) {
    __bytes.push(value.saved ? 1 : 0);
    __anqstScalarScratchView.setBigInt64(0, value.cdId, true);
    __bytes.push(__anqstScalarScratchBytes[0], __anqstScalarScratchBytes[1], __anqstScalarScratchBytes[2], __anqstScalarScratchBytes[3], __anqstScalarScratchBytes[4], __anqstScalarScratchBytes[5], __anqstScalarScratchBytes[6], __anqstScalarScratchBytes[7]);
    __items.push(value.message);
}
function __anqstNamed_AnQstStructured_SaveResult_SaveResult_decode(__blob, __blobView, __dataCursor, __items, __itemIndex) {
    const __value1 = {};
    __value1.saved = (((__blob[__dataCursor.offset++] & 1) === 1));
    __value1.cdId = ((__dataCursor.offset += 8, __blobView.getBigInt64(__dataCursor.offset - 8, true)));
    __value1.message = (String(__items[__itemIndex.value++]));
    return __value1;
}
function encodeAnQstStructured_SaveResult(value) {
    const __bytes = [];
    const __items = [];
    __anqstNamed_AnQstStructured_SaveResult_SaveResult_encode(value, __bytes, __items);
    return __anqstEncodeWire(__bytes, __items);
}
function decodeAnQstStructured_SaveResult(wire) {
    var _a;
    const __items = Array.isArray(wire) ? wire : [wire];
    const __blob = __anqstBase93Decode(String((_a = __items[0]) !== null && _a !== void 0 ? _a : ""));
    const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
    const __itemIndex = { value: 1 };
    const __dataCursor = { offset: 0 };
    const __result = __anqstNamed_AnQstStructured_SaveResult_SaveResult_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
    return __result;
}
function encodeAnQstStructured_boolean(value) {
    const __bytes = [];
    __bytes.push(value ? 1 : 0);
    return __anqstBase93Encode(Uint8Array.from(__bytes));
}
function decodeAnQstStructured_boolean(wire) {
    const __blob = __anqstBase93Decode(String(wire !== null && wire !== void 0 ? wire : ""));
    const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
    const __dataCursor = { offset: 0 };
    const __result = (((__blob[__dataCursor.offset++] & 1) === 1));
    return __result;
}
// Drag/drop payload helpers
function decodeDragDropPayload_CdDraft(rawPayload) {
    if (typeof rawPayload !== "string") {
        throw new Error("Drag/drop payload must be tagged text.");
    }
    if (rawPayload.length === 0) {
        throw new Error("Drag/drop payload is empty.");
    }
    const transportTag = rawPayload[0];
    const payloadText = rawPayload.slice(1);
    if (transportTag === "A") {
        const parsed = JSON.parse(payloadText);
        if (!Array.isArray(parsed)) {
            throw new Error("Drag/drop payload must be a JSON array.");
        }
        return decodeAnQstStructured_CdDraft(parsed);
    }
    throw new Error(`Drag/drop payload has an unknown transport tag: ${transportTag}`);
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
                        const host = channel.objects["CdEntryEditorBridge"];
                        if (host === undefined) {
                            reject(new Error("CdEntryEditorBridge bridge object is unavailable."));
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
class CdEntryService {
    constructor(_bridge) {
        this._bridge = _bridge;
        this._readOnlyMode = createValueCell(undefined);
        this._currentCollectionName = createValueCell(undefined);
        this._saveInProgress = createValueCell(undefined);
        this._draft = createValueCell(undefined);
        this._selectedTrackIndex = createValueCell(undefined);
        this._cdDropped = createValueCell(null);
        this._cdHovering = createValueCell(null);
        this.set = {
            draft: (value) => {
                let encodedValue;
                try {
                    encodedValue = encodeAnQstStructured_CdDraft(value);
                }
                catch (error) {
                    this._bridge.reportFrontendDiagnostic({
                        code: "SerializationError",
                        severity: "error",
                        category: "bridge",
                        recoverable: true,
                        message: `Failed to serialize Input CdEntryService.draft: ${errorMessage(error)}`,
                        service: "CdEntryService",
                        member: "draft",
                        context: { interaction: "Input" }
                    });
                    return;
                }
                this._draft.set(value);
                this._bridge.setInput("CdEntryService", "draft", encodedValue);
            },
            selectedTrackIndex: (value) => {
                let encodedValue;
                try {
                    encodedValue = encodeAnQstStructured_number(value);
                }
                catch (error) {
                    this._bridge.reportFrontendDiagnostic({
                        code: "SerializationError",
                        severity: "error",
                        category: "bridge",
                        recoverable: true,
                        message: `Failed to serialize Input CdEntryService.selectedTrackIndex: ${errorMessage(error)}`,
                        service: "CdEntryService",
                        member: "selectedTrackIndex",
                        context: { interaction: "Input" }
                    });
                    return;
                }
                this._selectedTrackIndex.set(value);
                this._bridge.setInput("CdEntryService", "selectedTrackIndex", encodedValue);
            },
        };
        this.onSlot = {
            focusField: (handler) => {
                this._bridge.registerSlot("CdEntryService", "focusField", (...wireArgs) => {
                    const result = handler(decodeAnQstStructured_string(wireArgs[0]));
                    return result;
                });
            },
            showDraft: (handler) => {
                this._bridge.registerSlot("CdEntryService", "showDraft", (...wireArgs) => {
                    const result = handler(decodeAnQstStructured_CdDraft(wireArgs[0]), decodeAnQstStructured_number(wireArgs[1]));
                    return result;
                });
            },
            replaceTracks: (handler) => {
                this._bridge.registerSlot("CdEntryService", "replaceTracks", (...wireArgs) => {
                    const result = handler(decodeAnQstStructured_Track(wireArgs[0]));
                    return result;
                });
            },
        };
        this._bridge.onOutput("CdEntryService", "readOnlyMode", (value) => {
            this._readOnlyMode.set(decodeAnQstStructured_boolean(value));
        });
        this._bridge.onOutput("CdEntryService", "currentCollectionName", (value) => {
            this._currentCollectionName.set(decodeAnQstStructured_string(value));
        });
        this._bridge.onOutput("CdEntryService", "saveInProgress", (value) => {
            this._saveInProgress.set(decodeAnQstStructured_boolean(value));
        });
        this._bridge.onDrop("CdEntryService", "cdDropped", (payload, x, y) => {
            try {
                this._cdDropped.set({ payload: decodeDragDropPayload_CdDraft(payload), x, y });
            }
            catch (error) {
                this._bridge.reportFrontendDiagnostic({
                    code: "DeserializationError",
                    severity: "error",
                    category: "bridge",
                    recoverable: true,
                    message: `Failed to deserialize DropTarget CdEntryService.cdDropped: ${errorMessage(error)}`,
                    service: "CdEntryService",
                    member: "cdDropped",
                    context: { interaction: "DropTarget" }
                });
            }
        });
        this._bridge.onHover("CdEntryService", "cdHovering", (payload, x, y) => {
            try {
                this._cdHovering.set({ payload: decodeDragDropPayload_CdDraft(payload), x, y });
            }
            catch (error) {
                this._bridge.reportFrontendDiagnostic({
                    code: "DeserializationError",
                    severity: "error",
                    category: "bridge",
                    recoverable: true,
                    message: `Failed to deserialize HoverTarget CdEntryService.cdHovering: ${errorMessage(error)}`,
                    service: "CdEntryService",
                    member: "cdHovering",
                    context: { interaction: "HoverTarget" }
                });
            }
        });
        this._bridge.onHoverLeft("CdEntryService", "cdHovering", () => this._cdHovering.set(null));
    }
    async suggestCatalogNumber(artist, albumTitle) { const result = await this._bridge.call("CdEntryService", "suggestCatalogNumber", [encodeAnQstStructured_string(artist), encodeAnQstStructured_string(albumTitle)]); return decodeAnQstStructured_string(result); }
    async suggestGenres(artist, albumTitle) { const result = await this._bridge.call("CdEntryService", "suggestGenres", [encodeAnQstStructured_string(artist), encodeAnQstStructured_string(albumTitle)]); return decodeAnQstStructured_Genre(result); }
    async validateDraft(draft) { const result = await this._bridge.call("CdEntryService", "validateDraft", [encodeAnQstStructured_CdDraft(draft)]); return decodeAnQstStructured_ValidationResult(result); }
    async normalizeBarcode(rawValue) { const result = await this._bridge.call("CdEntryService", "normalizeBarcode", [encodeAnQstStructured_string(rawValue)]); return decodeAnQstStructured_string(result); }
    async saveRequested(draft) { const result = await this._bridge.call("CdEntryService", "saveRequested", [encodeAnQstStructured_CdDraft(draft)]); return decodeAnQstStructured_SaveResult(result); }
    dirtyChanged(isDirty) {
        let encodedArgs;
        try {
            encodedArgs = [encodeAnQstStructured_boolean(isDirty)];
        }
        catch (error) {
            this._bridge.reportFrontendDiagnostic({
                code: "SerializationError",
                severity: "error",
                category: "bridge",
                recoverable: true,
                message: `Failed to serialize Emitter CdEntryService.dirtyChanged: ${errorMessage(error)}`,
                service: "CdEntryService",
                member: "dirtyChanged",
                context: { interaction: "Emitter" }
            });
            return;
        }
        this._bridge.emit("CdEntryService", "dirtyChanged", encodedArgs);
    }
    fieldTouched(fieldName) {
        let encodedArgs;
        try {
            encodedArgs = [encodeAnQstStructured_string(fieldName)];
        }
        catch (error) {
            this._bridge.reportFrontendDiagnostic({
                code: "SerializationError",
                severity: "error",
                category: "bridge",
                recoverable: true,
                message: `Failed to serialize Emitter CdEntryService.fieldTouched: ${errorMessage(error)}`,
                service: "CdEntryService",
                member: "fieldTouched",
                context: { interaction: "Emitter" }
            });
            return;
        }
        this._bridge.emit("CdEntryService", "fieldTouched", encodedArgs);
    }
    readOnlyMode() { return this._readOnlyMode.get(); }
    currentCollectionName() { return this._currentCollectionName.get(); }
    saveInProgress() { return this._saveInProgress.get(); }
    draft() { return this._draft.get(); }
    selectedTrackIndex() { return this._selectedTrackIndex.get(); }
    cdDropped() { return this._cdDropped.get(); }
    cdHovering() { return this._cdHovering.get(); }
}
async function createFrontend() {
    const bridge = new AnQstBridgeRuntime();
    await bridge.ready();
    return {
        diagnostics: new AnQstBridgeDiagnostics(bridge),
        CdEntryService: new CdEntryService(bridge),
        Track,
        CdDraft,
        ValidationResult,
        SaveResult,
        User
    };
}
(function bootstrapAnQstGenerated(global) {
    var _a;
    const root = (_a = global.AnQstGenerated) !== null && _a !== void 0 ? _a : (global.AnQstGenerated = {});
    root["CdEntryEditor"] = {
        createFrontend
    };
})(window);
