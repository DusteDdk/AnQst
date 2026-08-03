import type { Express, Request } from "express";
import type { WebSocket, WebSocketServer } from "ws";
import type { User } from "../../../../../../types/User";


export type Genre = "Rock" | "Pop" | "Jazz" | "Classical" | "Electronic" | "Other";

export interface Track {
    title: string;
    durationSeconds: number;
  }

export interface CdDraft {
    cdId: bigint;
    artist: string;
    albumTitle: string;
    releaseYear: number;
    genre: Genre;
    catalogNumber: string;
    barcode: string;
    tracks: Track[];
    notes: string;
    createdBy: User;
  }

export interface ValidationResult {
    valid: boolean;
    message: string;
    field?: string;
  }

export interface SaveResult {
    saved: boolean;
    cdId: bigint;
    message: string;
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


function encodeAnQstStructured_string(value: string): unknown {
  return value;
}

function decodeAnQstStructured_string(wire: unknown): string {
  return (String(wire ?? "")) as string;
}

function __anqstNamed_AnQstStructured_Genre_Genre_encode(value: Genre, __bytes: number[], __items: unknown[]): void {
  let __code1 = 0;
  switch (value) {
    case "Rock": __code1 = 0; break;
    case "Pop": __code1 = 1; break;
    case "Jazz": __code1 = 2; break;
    case "Classical": __code1 = 3; break;
    case "Electronic": __code1 = 4; break;
    case "Other": __code1 = 5; break;
    default: throw new Error("AnQst finite-domain encode received an unsupported value.");
  }
  __bytes.push(((__code1) as number) & 0xff);
}

function __anqstNamed_AnQstStructured_Genre_Genre_decode(
  __blob: Uint8Array,
  __blobView: DataView,
  __dataCursor: { offset: number },
  __items: unknown[],
  __itemIndex: { value: number }
): Genre {
  const __code1 = __blob[__dataCursor.offset++]!;
  let __value2: Genre = ("Rock") as Genre;
  switch (__code1) {
    case 0: __value2 = ("Rock") as Genre; break;
    case 1: __value2 = ("Pop") as Genre; break;
    case 2: __value2 = ("Jazz") as Genre; break;
    case 3: __value2 = ("Classical") as Genre; break;
    case 4: __value2 = ("Electronic") as Genre; break;
    case 5: __value2 = ("Other") as Genre; break;
  }
  return __value2;
}

function encodeAnQstStructured_Genre(value: Genre[]): unknown {
  const __bytes: number[] = [];
  const __items: unknown[] = [];
  for (const __item1 of value) {
    __anqstNamed_AnQstStructured_Genre_Genre_encode(__item1, __bytes, __items);
  }
  return __anqstEncodeWire(__bytes, __items);
}

function decodeAnQstStructured_Genre(wire: unknown): Genre[] {
  const __items = Array.isArray(wire) ? wire : [wire];
  const __blob = __anqstBase93Decode(String(__items[0] ?? ""));
  const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
  const __itemIndex = { value: 1 };
  const __dataCursor = { offset: 0 };
  const __remainingBytes4 = __blob.length - __dataCursor.offset;
  const __count2 = __remainingBytes4 / 1;
  const __array1 = new Array(__count2) as Genre[];
  for (let __index3 = 0; __index3 < __count2; __index3 += 1) {
    __array1[__index3] = __anqstNamed_AnQstStructured_Genre_Genre_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
  }
  const __result = __array1;


  return __result;
}

function __anqstNamed_AnQstStructured_ValidationResult_ValidationResult_encode(value: ValidationResult, __bytes: number[], __items: unknown[]): void {
  __bytes.push(value.valid ? 1 : 0);
  __items.push(value.message);
  const __present1 = value.field !== undefined;
  __bytes.push(((__present1 ? 1 : 0) as number) & 0xff);
  if (__present1) {
    __items.push(value.field!);
  }
}

function __anqstNamed_AnQstStructured_ValidationResult_ValidationResult_decode(
  __blob: Uint8Array,
  __blobView: DataView,
  __dataCursor: { offset: number },
  __items: unknown[],
  __itemIndex: { value: number }
): ValidationResult {
  const __value1 = {} as ValidationResult;
  __value1.valid = (((__blob[__dataCursor.offset++]! & 1) === 1)) as boolean;
  __value1.message = (String(__items[__itemIndex.value++]!)) as string;
  const __present2 = __blob[__dataCursor.offset++]! !== 0;
  if (__present2) {
    __value1.field = (String(__items[__itemIndex.value++]!)) as string;
  }
  return __value1;
}

function encodeAnQstStructured_ValidationResult(value: ValidationResult): unknown {
  const __bytes: number[] = [];
  const __items: unknown[] = [];
  __anqstNamed_AnQstStructured_ValidationResult_ValidationResult_encode(value, __bytes, __items);
  return __anqstEncodeWire(__bytes, __items);
}

function decodeAnQstStructured_ValidationResult(wire: unknown): ValidationResult {
  const __items = Array.isArray(wire) ? wire : [wire];
  const __blob = __anqstBase93Decode(String(__items[0] ?? ""));
  const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
  const __itemIndex = { value: 1 };
  const __dataCursor = { offset: 0 };

  const __result = __anqstNamed_AnQstStructured_ValidationResult_ValidationResult_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);


  return __result;
}

function __anqstNamed_AnQstStructured_CdDraft_CdDraft_encode(value: CdDraft, __bytes: number[], __items: unknown[]): void {
  __anqstScalarScratchView.setBigInt64(0, value.cdId, true);
  __bytes.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!);
  __items.push(value.artist);
  __items.push(value.albumTitle);
  const __u321 = ((value.releaseYear) as number) >>> 0;
  __bytes.push(__u321 & 0xff, (__u321 >>> 8) & 0xff, (__u321 >>> 16) & 0xff, (__u321 >>> 24) & 0xff);
  __anqstNamed_AnQstStructured_CdDraft_Genre_encode(value.genre, __bytes, __items);
  __items.push(value.catalogNumber);
  __items.push(value.barcode);
  const __u322 = ((value.tracks.length >>> 0) as number) >>> 0;
  __bytes.push(__u322 & 0xff, (__u322 >>> 8) & 0xff, (__u322 >>> 16) & 0xff, (__u322 >>> 24) & 0xff);
  for (const __item3 of value.tracks) {
    __anqstNamed_AnQstStructured_CdDraft_Track_encode(__item3, __bytes, __items);
  }
  __items.push(value.notes);
  __anqstNamed_AnQstStructured_CdDraft_User_encode(value.createdBy, __bytes, __items);
}

function __anqstNamed_AnQstStructured_CdDraft_CdDraft_decode(
  __blob: Uint8Array,
  __blobView: DataView,
  __dataCursor: { offset: number },
  __items: unknown[],
  __itemIndex: { value: number }
): CdDraft {
  const __value1 = {} as CdDraft;
  __value1.cdId = ((__dataCursor.offset += 8, __blobView.getBigInt64(__dataCursor.offset - 8, true))) as bigint;
  __value1.artist = (String(__items[__itemIndex.value++]!)) as string;
  __value1.albumTitle = (String(__items[__itemIndex.value++]!)) as string;
  __value1.releaseYear = ((__dataCursor.offset += 4, __blobView.getInt32(__dataCursor.offset - 4, true))) as number;
  __value1.genre = __anqstNamed_AnQstStructured_CdDraft_Genre_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
  __value1.catalogNumber = (String(__items[__itemIndex.value++]!)) as string;
  __value1.barcode = (String(__items[__itemIndex.value++]!)) as string;
  const __count3 = (__dataCursor.offset += 4, __blobView.getUint32(__dataCursor.offset - 4, true));
  const __array2 = new Array(__count3) as Track[];
  for (let __index4 = 0; __index4 < __count3; __index4 += 1) {
    __array2[__index4] = __anqstNamed_AnQstStructured_CdDraft_Track_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
  }
  __value1.tracks = __array2;
  __value1.notes = (String(__items[__itemIndex.value++]!)) as string;
  __value1.createdBy = __anqstNamed_AnQstStructured_CdDraft_User_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
  return __value1;
}

function __anqstNamed_AnQstStructured_CdDraft_Genre_encode(value: Genre, __bytes: number[], __items: unknown[]): void {
  let __code1 = 0;
  switch (value) {
    case "Rock": __code1 = 0; break;
    case "Pop": __code1 = 1; break;
    case "Jazz": __code1 = 2; break;
    case "Classical": __code1 = 3; break;
    case "Electronic": __code1 = 4; break;
    case "Other": __code1 = 5; break;
    default: throw new Error("AnQst finite-domain encode received an unsupported value.");
  }
  __bytes.push(((__code1) as number) & 0xff);
}

function __anqstNamed_AnQstStructured_CdDraft_Genre_decode(
  __blob: Uint8Array,
  __blobView: DataView,
  __dataCursor: { offset: number },
  __items: unknown[],
  __itemIndex: { value: number }
): Genre {
  const __code1 = __blob[__dataCursor.offset++]!;
  let __value2: Genre = ("Rock") as Genre;
  switch (__code1) {
    case 0: __value2 = ("Rock") as Genre; break;
    case 1: __value2 = ("Pop") as Genre; break;
    case 2: __value2 = ("Jazz") as Genre; break;
    case 3: __value2 = ("Classical") as Genre; break;
    case 4: __value2 = ("Electronic") as Genre; break;
    case 5: __value2 = ("Other") as Genre; break;
  }
  return __value2;
}

function __anqstNamed_AnQstStructured_CdDraft_Track_encode(value: Track, __bytes: number[], __items: unknown[]): void {
  __items.push(value.title);
  __anqstScalarScratchView.setFloat64(0, value.durationSeconds, true);
  __bytes.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!);
}

function __anqstNamed_AnQstStructured_CdDraft_Track_decode(
  __blob: Uint8Array,
  __blobView: DataView,
  __dataCursor: { offset: number },
  __items: unknown[],
  __itemIndex: { value: number }
): Track {
  const __value1 = {} as Track;
  __value1.title = (String(__items[__itemIndex.value++]!)) as string;
  __value1.durationSeconds = ((__dataCursor.offset += 8, __blobView.getFloat64(__dataCursor.offset - 8, true))) as number;
  return __value1;
}

function __anqstNamed_AnQstStructured_CdDraft_User_encode(value: User, __bytes: number[], __items: unknown[]): void {
  __items.push(value.name);
  const __u321 = ((value.meta.friends.length >>> 0) as number) >>> 0;
  __bytes.push(__u321 & 0xff, (__u321 >>> 8) & 0xff, (__u321 >>> 16) & 0xff, (__u321 >>> 24) & 0xff);
  for (const __item2 of value.meta.friends) {
    __anqstScalarScratchView.setFloat64(0, __item2, true);
    __bytes.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!);
  }
}

function __anqstNamed_AnQstStructured_CdDraft_User_decode(
  __blob: Uint8Array,
  __blobView: DataView,
  __dataCursor: { offset: number },
  __items: unknown[],
  __itemIndex: { value: number }
): User {
  const __value1 = {} as User;
  __value1.name = (String(__items[__itemIndex.value++]!)) as string;
  const __value2 = {} as {
        friends: number[];
    };
  const __count4 = (__dataCursor.offset += 4, __blobView.getUint32(__dataCursor.offset - 4, true));
  const __array3 = new Array(__count4) as number[];
  for (let __index5 = 0; __index5 < __count4; __index5 += 1) {
    __array3[__index5] = ((__dataCursor.offset += 8, __blobView.getFloat64(__dataCursor.offset - 8, true))) as number;
  }
  __value2.friends = __array3;
  __value1.meta = __value2;
  return __value1;
}

function encodeAnQstStructured_CdDraft(value: CdDraft): unknown {
  const __bytes: number[] = [];
  const __items: unknown[] = [];
  __anqstNamed_AnQstStructured_CdDraft_CdDraft_encode(value, __bytes, __items);
  return __anqstEncodeWire(__bytes, __items);
}

function decodeAnQstStructured_CdDraft(wire: unknown): CdDraft {
  const __items = Array.isArray(wire) ? wire : [wire];
  const __blob = __anqstBase93Decode(String(__items[0] ?? ""));
  const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
  const __itemIndex = { value: 1 };
  const __dataCursor = { offset: 0 };

  const __result = __anqstNamed_AnQstStructured_CdDraft_CdDraft_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);


  return __result;
}

function encodeAnQstStructured_number(value: number): unknown {
  const __bytes: number[] = [];
  __anqstScalarScratchView.setFloat64(0, value, true);
  __bytes.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!);
  return __anqstBase93Encode(Uint8Array.from(__bytes));
}

function decodeAnQstStructured_number(wire: unknown): number {
  const __blob = __anqstBase93Decode(String(wire ?? ""));
  const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
  const __dataCursor = { offset: 0 };
  const __result = ((__dataCursor.offset += 8, __blobView.getFloat64(__dataCursor.offset - 8, true))) as number;

  return __result;
}

function __anqstNamed_AnQstStructured_Track_Track_encode(value: Track, __bytes: number[], __items: unknown[]): void {
  __items.push(value.title);
  __anqstScalarScratchView.setFloat64(0, value.durationSeconds, true);
  __bytes.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!);
}

function __anqstNamed_AnQstStructured_Track_Track_decode(
  __blob: Uint8Array,
  __blobView: DataView,
  __dataCursor: { offset: number },
  __items: unknown[],
  __itemIndex: { value: number }
): Track {
  const __value1 = {} as Track;
  __value1.title = (String(__items[__itemIndex.value++]!)) as string;
  __value1.durationSeconds = ((__dataCursor.offset += 8, __blobView.getFloat64(__dataCursor.offset - 8, true))) as number;
  return __value1;
}

function encodeAnQstStructured_Track(value: Track[]): unknown {
  const __bytes: number[] = [];
  const __items: unknown[] = [];
  for (const __item1 of value) {
    __anqstNamed_AnQstStructured_Track_Track_encode(__item1, __bytes, __items);
  }
  return __anqstEncodeWire(__bytes, __items);
}

function decodeAnQstStructured_Track(wire: unknown): Track[] {
  const __items = Array.isArray(wire) ? wire : [wire];
  const __blob = __anqstBase93Decode(String(__items[0] ?? ""));
  const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
  const __itemIndex = { value: 1 };
  const __dataCursor = { offset: 0 };
  const __remainingBytes4 = __blob.length - __dataCursor.offset;
  const __count2 = __remainingBytes4 / 8;
  const __array1 = new Array(__count2) as Track[];
  for (let __index3 = 0; __index3 < __count2; __index3 += 1) {
    __array1[__index3] = __anqstNamed_AnQstStructured_Track_Track_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);
  }
  const __result = __array1;


  return __result;
}

function __anqstNamed_AnQstStructured_SaveResult_SaveResult_encode(value: SaveResult, __bytes: number[], __items: unknown[]): void {
  __bytes.push(value.saved ? 1 : 0);
  __anqstScalarScratchView.setBigInt64(0, value.cdId, true);
  __bytes.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!);
  __items.push(value.message);
}

function __anqstNamed_AnQstStructured_SaveResult_SaveResult_decode(
  __blob: Uint8Array,
  __blobView: DataView,
  __dataCursor: { offset: number },
  __items: unknown[],
  __itemIndex: { value: number }
): SaveResult {
  const __value1 = {} as SaveResult;
  __value1.saved = (((__blob[__dataCursor.offset++]! & 1) === 1)) as boolean;
  __value1.cdId = ((__dataCursor.offset += 8, __blobView.getBigInt64(__dataCursor.offset - 8, true))) as bigint;
  __value1.message = (String(__items[__itemIndex.value++]!)) as string;
  return __value1;
}

function encodeAnQstStructured_SaveResult(value: SaveResult): unknown {
  const __bytes: number[] = [];
  const __items: unknown[] = [];
  __anqstNamed_AnQstStructured_SaveResult_SaveResult_encode(value, __bytes, __items);
  return __anqstEncodeWire(__bytes, __items);
}

function decodeAnQstStructured_SaveResult(wire: unknown): SaveResult {
  const __items = Array.isArray(wire) ? wire : [wire];
  const __blob = __anqstBase93Decode(String(__items[0] ?? ""));
  const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
  const __itemIndex = { value: 1 };
  const __dataCursor = { offset: 0 };

  const __result = __anqstNamed_AnQstStructured_SaveResult_SaveResult_decode(__blob, __blobView, __dataCursor, __items, __itemIndex);


  return __result;
}

function encodeAnQstStructured_boolean(value: boolean): unknown {
  const __bytes: number[] = [];
  __bytes.push(value ? 1 : 0);
  return __anqstBase93Encode(Uint8Array.from(__bytes));
}

function decodeAnQstStructured_boolean(wire: unknown): boolean {
  const __blob = __anqstBase93Decode(String(wire ?? ""));
  const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
  const __dataCursor = { offset: 0 };
  const __result = (((__blob[__dataCursor.offset++]! & 1) === 1)) as boolean;

  return __result;
}


export interface CdEntryServiceNodeHandlers {
  suggestCatalogNumber(bridge: CdEntryEditorHandlerBridge, artist: string, albumTitle: string): string | Promise<string>;
  suggestGenres(bridge: CdEntryEditorHandlerBridge, artist: string, albumTitle: string): Genre[] | Promise<Genre[]>;
  validateDraft(bridge: CdEntryEditorHandlerBridge, draft: CdDraft): ValidationResult | Promise<ValidationResult>;
  normalizeBarcode(bridge: CdEntryEditorHandlerBridge, rawValue: string): string | Promise<string>;
  saveRequested(bridge: CdEntryEditorHandlerBridge, draft: CdDraft): SaveResult | Promise<SaveResult>;
  dirtyChanged(bridge: CdEntryEditorHandlerBridge, isDirty: boolean): void | Promise<void>;
  fieldTouched(bridge: CdEntryEditorHandlerBridge, fieldName: string): void | Promise<void>;
  draft(bridge: CdEntryEditorHandlerBridge, value: CdDraft): void | Promise<void>;
  selectedTrackIndex(bridge: CdEntryEditorHandlerBridge, value: number): void | Promise<void>;
}

export interface CdEntryEditorNodeImplementation {
  CdEntryService: CdEntryServiceNodeHandlers;
}

export interface CdEntryServiceSessionBridgeService {
  focusField(fieldName: string, timeoutMs?: number): Promise<void>;
  showDraft(draft: CdDraft, selectedTrackIndex: number, timeoutMs?: number): Promise<void>;
  replaceTracks(tracks: Track[], timeoutMs?: number): Promise<void>;
  signal: {
    dirtyChanged(handler: (isDirty: boolean) => void): () => void;
    fieldTouched(handler: (fieldName: string) => void): () => void;
  };
  property: {
    readOnlyMode: {
      set(value: boolean): void;
    };
    currentCollectionName: {
      set(value: string): void;
    };
    saveInProgress: {
      set(value: boolean): void;
    };
    draft: {
      get(): Promise<CdDraft>;
      on(handler: (value: CdDraft) => void): () => void;
    };
    selectedTrackIndex: {
      get(): Promise<number>;
      on(handler: (value: number) => void): () => void;
    };
  };
}

export interface CdEntryEditorSessionBridge {
  CdEntryEditor: {
    CdEntryService: CdEntryServiceSessionBridgeService;
  };
}

export interface CdEntryEditorHandlerBridge {
  own: CdEntryEditorSessionBridge;
  others: Record<string, CdEntryEditorSessionBridge>;
  sessions: Record<string, CdEntryEditorSessionBridge>;
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

class CdEntryEditorNodeSession {
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

  CdEntryService_focusField(fieldName: string, timeoutMs = this.defaultSlotTimeoutMs): Promise<void> {
    return this.invokeSlot("CdEntryService", "focusField", [encodeAnQstStructured_string(fieldName)], timeoutMs).then((value) => value as void);
  }
  CdEntryService_showDraft(draft: CdDraft, selectedTrackIndex: number, timeoutMs = this.defaultSlotTimeoutMs): Promise<void> {
    return this.invokeSlot("CdEntryService", "showDraft", [encodeAnQstStructured_CdDraft(draft), encodeAnQstStructured_number(selectedTrackIndex)], timeoutMs).then((value) => value as void);
  }
  CdEntryService_replaceTracks(tracks: Track[], timeoutMs = this.defaultSlotTimeoutMs): Promise<void> {
    return this.invokeSlot("CdEntryService", "replaceTracks", [encodeAnQstStructured_Track(tracks)], timeoutMs).then((value) => value as void);
  }
  setCdEntryService_ReadOnlyMode(value: boolean): void {
    this.setOutputValue("CdEntryService", "readOnlyMode", encodeAnQstStructured_boolean(value));
  }
  setCdEntryService_CurrentCollectionName(value: string): void {
    this.setOutputValue("CdEntryService", "currentCollectionName", encodeAnQstStructured_string(value));
  }
  setCdEntryService_SaveInProgress(value: boolean): void {
    this.setOutputValue("CdEntryService", "saveInProgress", encodeAnQstStructured_boolean(value));
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

export interface CdEntryEditorNodeBridgeOptions {
  app: Express;
  wsServer: WebSocketServer;
  implementation: CdEntryEditorNodeImplementation;
  wsPath?: string;
  wsUrl?: string;
  devConfigPath?: string;
  defaultSlotTimeoutMs?: number;
  maxQueuedSlotInvocationsPerSlot?: number;
}

export interface CdEntryEditorNodeBridge {
  onSession(listener: (session: CdEntryEditorNodeSession) => void): () => void;
  subscribeDiagnostics(listener: (diagnostic: AnQstDiagnostic) => void): () => void;
  getSessions(): ReadonlyArray<CdEntryEditorNodeSession>;
  getSessionInterfaces(): Record<string, CdEntryEditorSessionBridge>;
  close(): void;
}

export function createCdEntryEditorNodeExpressWsBridge(options: CdEntryEditorNodeBridgeOptions): CdEntryEditorNodeBridge {
  const wsPath = options.wsPath ?? "/anqst-bridge";
  const devConfigPath = options.devConfigPath ?? "/anqst-dev-config.json";
  const defaultSlotTimeoutMs = options.defaultSlotTimeoutMs ?? 1000;
  const maxQueuedPerSlot = options.maxQueuedSlotInvocationsPerSlot ?? 1024;
  const sessions = new Map<WebSocket, CdEntryEditorNodeSession>();
  const diagnosticListeners = new Set<(diagnostic: AnQstDiagnostic) => void>();
  const sessionListeners = new Set<(session: CdEntryEditorNodeSession) => void>();
  let sessionCounter = 0;
  const implementation = options.implementation;

  const emitDiagnostic = (diagnostic: Omit<AnQstDiagnostic, "timestamp">): void => {
    const next: AnQstDiagnostic = { ...diagnostic, timestamp: nowIso() };
    for (const listener of diagnosticListeners) listener(next);
  };

  const getSessionInterfaces = (): Record<string, CdEntryEditorSessionBridge> => {
    const out: Record<string, CdEntryEditorSessionBridge> = {};
    for (const session of sessions.values()) {
      out[session.id] = {
        CdEntryEditor: {
      CdEntryService: {
          focusField: (fieldName: string, timeoutMs = defaultSlotTimeoutMs) => session.CdEntryService_focusField(fieldName, timeoutMs),
          showDraft: (draft: CdDraft, selectedTrackIndex: number, timeoutMs = defaultSlotTimeoutMs) => session.CdEntryService_showDraft(draft, selectedTrackIndex, timeoutMs),
          replaceTracks: (tracks: Track[], timeoutMs = defaultSlotTimeoutMs) => session.CdEntryService_replaceTracks(tracks, timeoutMs),
        signal: {
            dirtyChanged: (handler: (isDirty: boolean) => void) => session.onSignal("CdEntryService", "dirtyChanged", handler as (...args: unknown[]) => void),
            fieldTouched: (handler: (fieldName: string) => void) => session.onSignal("CdEntryService", "fieldTouched", handler as (...args: unknown[]) => void),
        },
        property: {
            readOnlyMode: {
              set: (value: boolean) => session.setCdEntryService_ReadOnlyMode(value)
            },
            currentCollectionName: {
              set: (value: string) => session.setCdEntryService_CurrentCollectionName(value)
            },
            saveInProgress: {
              set: (value: boolean) => session.setCdEntryService_SaveInProgress(value)
            },
            draft: {
              get: () => session.readInput("CdEntryService", "draft").then((value) => decodeAnQstStructured_CdDraft(value)),
              on: (handler: (value: CdDraft) => void) => session.onInput("CdEntryService", "draft", (value) => handler(decodeAnQstStructured_CdDraft(value)))
            },
            selectedTrackIndex: {
              get: () => session.readInput("CdEntryService", "selectedTrackIndex").then((value) => decodeAnQstStructured_number(value)),
              on: (handler: (value: number) => void) => session.onInput("CdEntryService", "selectedTrackIndex", (value) => handler(decodeAnQstStructured_number(value)))
            },
        }
      },
        }
      };
    }
    return out;
  };

  const buildHandlerBridge = (session: CdEntryEditorNodeSession): CdEntryEditorHandlerBridge => {
    const byId = getSessionInterfaces();
    const others: Record<string, CdEntryEditorSessionBridge> = {};
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
      bridgeObject: "CdEntryEditorBridge"
    });
  });

  const handleMessage = (session: CdEntryEditorNodeSession, raw: string): void => {
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
    if (service === "CdEntryService" && member === "suggestCatalogNumber") {
      const handler = implementation.CdEntryService.suggestCatalogNumber;
      if (typeof handler !== "function") {
        const err = new Error("Missing Call handler CdEntryService.suggestCatalogNumber");
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
      Promise.resolve(handler(buildHandlerBridge(session), decodeAnQstStructured_string(args[0]), decodeAnQstStructured_string(args[1])))
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
    if (service === "CdEntryService" && member === "suggestGenres") {
      const handler = implementation.CdEntryService.suggestGenres;
      if (typeof handler !== "function") {
        const err = new Error("Missing Call handler CdEntryService.suggestGenres");
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
      Promise.resolve(handler(buildHandlerBridge(session), decodeAnQstStructured_string(args[0]), decodeAnQstStructured_string(args[1])))
        .then((result) => sendJson(session.socket, { type: "callResult", requestId, result: encodeAnQstStructured_Genre(result) }))
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
    if (service === "CdEntryService" && member === "validateDraft") {
      const handler = implementation.CdEntryService.validateDraft;
      if (typeof handler !== "function") {
        const err = new Error("Missing Call handler CdEntryService.validateDraft");
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
      Promise.resolve(handler(buildHandlerBridge(session), decodeAnQstStructured_CdDraft(args[0])))
        .then((result) => sendJson(session.socket, { type: "callResult", requestId, result: encodeAnQstStructured_ValidationResult(result) }))
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
    if (service === "CdEntryService" && member === "normalizeBarcode") {
      const handler = implementation.CdEntryService.normalizeBarcode;
      if (typeof handler !== "function") {
        const err = new Error("Missing Call handler CdEntryService.normalizeBarcode");
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
    if (service === "CdEntryService" && member === "saveRequested") {
      const handler = implementation.CdEntryService.saveRequested;
      if (typeof handler !== "function") {
        const err = new Error("Missing Call handler CdEntryService.saveRequested");
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
      Promise.resolve(handler(buildHandlerBridge(session), decodeAnQstStructured_CdDraft(args[0])))
        .then((result) => sendJson(session.socket, { type: "callResult", requestId, result: encodeAnQstStructured_SaveResult(result) }))
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
    if (service === "CdEntryService" && member === "dirtyChanged") {
      const handler = implementation.CdEntryService.dirtyChanged;
      if (typeof handler !== "function") {
        const err = new Error("Missing Emitter handler CdEntryService.dirtyChanged");
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
      session.emitSignal(service, member, [decodeAnQstStructured_boolean(args[0])]);
      void Promise.resolve(handler(buildHandlerBridge(session), decodeAnQstStructured_boolean(args[0]))).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        emitDiagnostic({
          code: "EmitterHandlerError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message,
          sessionId: session.id,
          service,
          member
        });
      });
      return;
    }
    if (service === "CdEntryService" && member === "fieldTouched") {
      const handler = implementation.CdEntryService.fieldTouched;
      if (typeof handler !== "function") {
        const err = new Error("Missing Emitter handler CdEntryService.fieldTouched");
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
      session.emitSignal(service, member, [decodeAnQstStructured_string(args[0])]);
      void Promise.resolve(handler(buildHandlerBridge(session), decodeAnQstStructured_string(args[0]))).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        emitDiagnostic({
          code: "EmitterHandlerError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message,
          sessionId: session.id,
          service,
          member
        });
      });
      return;
    }
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
    if (service === "CdEntryService" && member === "draft") {
      const handler = implementation.CdEntryService.draft;
      if (typeof handler !== "function") {
        const err = new Error("Missing Input handler CdEntryService.draft");
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
      const decodedValue = decodeAnQstStructured_CdDraft(value);
      session.setInputState(service, member, decodedValue);
      void Promise.resolve(handler(buildHandlerBridge(session), decodedValue)).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        emitDiagnostic({
          code: "InputHandlerError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message,
          sessionId: session.id,
          service,
          member
        });
      });
      return;
    }
    if (service === "CdEntryService" && member === "selectedTrackIndex") {
      const handler = implementation.CdEntryService.selectedTrackIndex;
      if (typeof handler !== "function") {
        const err = new Error("Missing Input handler CdEntryService.selectedTrackIndex");
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
      const decodedValue = decodeAnQstStructured_number(value);
      session.setInputState(service, member, decodedValue);
      void Promise.resolve(handler(buildHandlerBridge(session), decodedValue)).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        emitDiagnostic({
          code: "InputHandlerError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message,
          sessionId: session.id,
          service,
          member
        });
      });
      return;
    }
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
    const session = new CdEntryEditorNodeSession(
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
