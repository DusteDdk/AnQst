type Genre = "Rock" | "Pop" | "Jazz" | "Classical" | "Electronic" | "Other";

interface Track {
    title: string;
    durationSeconds: number;
  }

interface CdDraft {
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

interface ValidationResult {
    valid: boolean;
    message: string;
    field?: string;
  }

interface SaveResult {
    saved: boolean;
    cdId: bigint;
    message: string;
  }

class Track {
  title: string;
  durationSeconds: number;

  constructor(title: string, durationSeconds: number) {
    this.title = title;
    this.durationSeconds = durationSeconds;
  }
}

class CdDraft {
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

  constructor(cdId: bigint, artist: string, albumTitle: string, releaseYear: number, genre: Genre, catalogNumber: string, barcode: string, tracks: Track[], notes: string, createdBy: User) {
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
  valid: boolean;
  message: string;
  field?: string;

  constructor(valid: boolean, message: string, field?: string) {
    this.valid = valid;
    this.message = message;
    this.field = field;
  }
}

class SaveResult {
  saved: boolean;
  cdId: bigint;
  message: string;

  constructor(saved: boolean, cdId: bigint, message: string) {
    this.saved = saved;
    this.cdId = cdId;
    this.message = message;
  }
}

class User {
  name: string;
  meta: {
        friends: number[];
    };

  constructor(name: string, meta: {
        friends: number[];
    }) {
    this.name = name;
    this.meta = meta;
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


// Drag/drop payload helpers
function decodeDragDropPayload_CdDraft(rawPayload: unknown): CdDraft {
  if (typeof rawPayload !== "string") {
    throw new Error("Drag/drop payload must be tagged text.");
  }
  if (rawPayload.length === 0) {
    throw new Error("Drag/drop payload is empty.");
  }
  const transportTag = rawPayload[0];
  const payloadText = rawPayload.slice(1);
  if (transportTag === "A") {
    const parsed = JSON.parse(payloadText) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("Drag/drop payload must be a JSON array.");
    }
    return decodeAnQstStructured_CdDraft(parsed);
  }
  throw new Error(`Drag/drop payload has an unknown transport tag: ${transportTag}`);
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
            const host = channel.objects["CdEntryEditorBridge"];
            if (host === undefined) {
              reject(new Error("CdEntryEditorBridge bridge object is unavailable."));
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

class CdEntryService {
  private readonly _readOnlyMode = createValueCell<boolean | undefined>(undefined);
  private readonly _currentCollectionName = createValueCell<string | undefined>(undefined);
  private readonly _saveInProgress = createValueCell<boolean | undefined>(undefined);
  private readonly _draft = createValueCell<CdDraft | undefined>(undefined);
  private readonly _selectedTrackIndex = createValueCell<number | undefined>(undefined);
  private readonly _cdDropped = createValueCell<{ payload: CdDraft; x: number; y: number } | null>(null);
  private readonly _cdHovering = createValueCell<{ payload: CdDraft; x: number; y: number } | null>(null);
  constructor(private readonly _bridge: AnQstBridgeRuntime) {
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
      } catch (error) {
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
      } catch (error) {
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
  readonly set = {
    draft: (value: CdDraft): void => {
      let encodedValue: unknown;
      try {
        encodedValue = encodeAnQstStructured_CdDraft(value);
      } catch (error) {
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
    selectedTrackIndex: (value: number): void => {
      let encodedValue: unknown;
      try {
        encodedValue = encodeAnQstStructured_number(value);
      } catch (error) {
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
  readonly onSlot = {
    focusField: (handler: (fieldName: string) => void | Promise<void> | Error): void => {
      this._bridge.registerSlot("CdEntryService", "focusField", (...wireArgs: unknown[]) => {
        const result = handler(decodeAnQstStructured_string(wireArgs[0]));
        return result;
      });
    },
    showDraft: (handler: (draft: CdDraft, selectedTrackIndex: number) => void | Promise<void> | Error): void => {
      this._bridge.registerSlot("CdEntryService", "showDraft", (...wireArgs: unknown[]) => {
        const result = handler(decodeAnQstStructured_CdDraft(wireArgs[0]), decodeAnQstStructured_number(wireArgs[1]));
        return result;
      });
    },
    replaceTracks: (handler: (tracks: Track[]) => void | Promise<void> | Error): void => {
      this._bridge.registerSlot("CdEntryService", "replaceTracks", (...wireArgs: unknown[]) => {
        const result = handler(decodeAnQstStructured_Track(wireArgs[0]));
        return result;
      });
    },
  };
  async suggestCatalogNumber(artist: string, albumTitle: string): Promise<string> { const result = await this._bridge.call<unknown>("CdEntryService", "suggestCatalogNumber", [encodeAnQstStructured_string(artist), encodeAnQstStructured_string(albumTitle)]); return decodeAnQstStructured_string(result); }
  async suggestGenres(artist: string, albumTitle: string): Promise<Genre[]> { const result = await this._bridge.call<unknown>("CdEntryService", "suggestGenres", [encodeAnQstStructured_string(artist), encodeAnQstStructured_string(albumTitle)]); return decodeAnQstStructured_Genre(result); }
  async validateDraft(draft: CdDraft): Promise<ValidationResult> { const result = await this._bridge.call<unknown>("CdEntryService", "validateDraft", [encodeAnQstStructured_CdDraft(draft)]); return decodeAnQstStructured_ValidationResult(result); }
  async normalizeBarcode(rawValue: string): Promise<string> { const result = await this._bridge.call<unknown>("CdEntryService", "normalizeBarcode", [encodeAnQstStructured_string(rawValue)]); return decodeAnQstStructured_string(result); }
  async saveRequested(draft: CdDraft): Promise<SaveResult> { const result = await this._bridge.call<unknown>("CdEntryService", "saveRequested", [encodeAnQstStructured_CdDraft(draft)]); return decodeAnQstStructured_SaveResult(result); }
  dirtyChanged(isDirty: boolean): void {
    let encodedArgs: unknown[];
    try {
      encodedArgs = [encodeAnQstStructured_boolean(isDirty)];
    } catch (error) {
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
  fieldTouched(fieldName: string): void {
    let encodedArgs: unknown[];
    try {
      encodedArgs = [encodeAnQstStructured_string(fieldName)];
    } catch (error) {
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
  readOnlyMode(): boolean | undefined { return this._readOnlyMode.get(); }
  currentCollectionName(): string | undefined { return this._currentCollectionName.get(); }
  saveInProgress(): boolean | undefined { return this._saveInProgress.get(); }
  draft(): CdDraft | undefined { return this._draft.get(); }
  selectedTrackIndex(): number | undefined { return this._selectedTrackIndex.get(); }
  cdDropped(): { payload: CdDraft; x: number; y: number } | null { return this._cdDropped.get(); }
  cdHovering(): { payload: CdDraft; x: number; y: number } | null { return this._cdHovering.get(); }
}

interface CdEntryEditorFrontend {
  diagnostics: AnQstBridgeDiagnostics;
  CdEntryService: CdEntryService;
  Track: typeof Track;
  CdDraft: typeof CdDraft;
  ValidationResult: typeof ValidationResult;
  SaveResult: typeof SaveResult;
  User: typeof User;
}

async function createFrontend(): Promise<CdEntryEditorFrontend> {
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

(function bootstrapAnQstGenerated(global: typeof globalThis & { AnQstGenerated?: Record<string, unknown> }) {
  const root = global.AnQstGenerated ?? (global.AnQstGenerated = {});
  root["CdEntryEditor"] = {
    createFrontend
  };
})(window as typeof globalThis & { AnQstGenerated?: Record<string, unknown> });

export { AnQstBridgeDiagnostics, CdEntryService, Track, CdDraft, ValidationResult, SaveResult, User, createFrontend };
export type { AnQstBridgeDiagnostic, AnQstBridgeState, CdEntryEditorFrontend, CdEntryEditorGlobal, AnQstGeneratedRoot };
