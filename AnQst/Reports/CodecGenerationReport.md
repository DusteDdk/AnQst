# AnQst Codec Generation Report

This report documents how AnQstGen currently generates encode/decode logic for:

- every `AnQst.Type.*` that is supported by the boundary codec system
- every additional non-`AnQst.Type` type that is also supported implicitly

For each type family, the report describes:

- TypeScript/JavaScript runtime behavior
- C++ runtime behavior
- where this behavior is implemented in AnQstGen

## 1. Where codec behavior is decided

The codec behavior for all types is split into four stages.

1. Leaf capability mapping:
   `AnQst/AnQstGen/src/boundary-codec-leaves.ts` defines canonical leaf capabilities (`LEAF_CAPABILITIES`) and input-type alias resolution (`resolveLeafCapability`) (`:7`, `:527`).
2. Type analysis:
   `AnQst/AnQstGen/src/boundary-codec-analysis.ts` converts parsed type syntax into transport nodes (`leaf`, `finite-domain`, `array`, `struct`, `named`) and rejects unsupported forms (`:241-427`).
3. Boundary planning:
   `AnQst/AnQstGen/src/boundary-codec-plan.ts` chooses wire layout per boundary type (blob entries, item entries, array extent strategy, optional presence) (`:163-431`).
4. Per-language render:
   `AnQst/AnQstGen/src/boundary-codec-render.ts` emits TS and C++ codec helpers and plan-specific encode/decode functions (`:88-1225`).
5. Shared C++ base93 runtime:
   C++ helpers call `anqstBase93Encode` / `anqstBase93Decode` from `AnQst/AnQstWidget/AnQstWebBase/src/AnQstBase93.h` + `AnQstBase93.cpp` (central runtime, not per-widget emitted algorithm).

Catalog integration happens in:

- `AnQst/AnQstGen/src/boundary-codecs.ts` (`buildBoundaryCodecCatalog`, `:119-185`)
- `AnQst/AnQstGen/src/emit.ts` where TS helper blocks are embedded in frontend/node output (`:2345`, `:3584`) and C++ helpers in widget output (`renderCppBoundaryCodecHelpers` use in widget emission path, `:4108-4110`).

## 2. AnQst.Type coverage

### 2.1 `AnQst.Type.string`

`AnQst.Type.string` resolves to the `string` leaf capability (`boundary-codec-leaves.ts:529`) with `region: "string"` (`:13`).

TypeScript/JavaScript:

- Encode: pushed to `__items` as string (`boundary-codec-render.ts:256-262`).
- Decode: read from item stream via checked `__anqstReadItem` and coerced with `String(...)` (`:332`, runtime guard `:592`).

C++:

- Encode: pushed into `QVariantList items` as `QString` (`:842-847` path for string leaf encode/decode).
- Decode: `anqstReadItem(items, itemIndex).toString()` with item-underflow check (`:846`, `:1138-1141`).

### 2.2 `AnQst.Type.number`

`AnQst.Type.number` resolves to `number` leaf capability (`boundary-codec-leaves.ts:531`) in blob region with fixed width 8 bytes (`:50-56`).

TypeScript/JavaScript:

- Encode: scalar helper `__anqstPushFloat64` (`boundary-codec-render.ts:91`, `:612`).
- Decode: scalar helper `__anqstReadFloat64` with bounds check (`:112`, `:625`, `:617`).

C++:

- Encode: `anqstPushFloat64` (`:133`, `:1183`).
- Decode: `anqstReadFloat64` (`:154`, `:1200`) with `anqstRequireBytes` guards (`:1186`).

### 2.3 Integer families exposed as `AnQst.Type.*`

These map in `resolveLeafCapability` (`boundary-codec-leaves.ts:532-545`) and in C++ public type mapping (`emit.ts:194-220`).

#### `AnQst.Type.qint64`, `AnQst.Type.quint64`

TypeScript/JavaScript:

- `qint64` encode/decode uses BigInt helpers (`boundary-codec-render.ts:92-93`, `:113-114`, runtime helpers `:613-614`, `:626-627`).

C++:

- `qint64`/`quint64` encode/decode use `anqstPushQint64`/`anqstPushQuint64`, `anqstReadQint64`/`anqstReadQuint64` (`:134-135`, `:155-156`, runtime `:1181-1182`, `:1198-1199`).

#### `AnQst.Type.qint32`, `AnQst.Type.quint32`

TypeScript/JavaScript:

- Use int32/uint32 little-endian helpers (`boundary-codec-render.ts:94-95`, `:115-116`, runtime `:610`, `:623-624`).

C++:

- Use qint32/quint32 wrappers over 32-bit byte helpers (`:136-137`, `:157-158`, runtime `:1179-1180`, `:1196-1197`).

#### `AnQst.Type.qint16`, `AnQst.Type.quint16`

TypeScript/JavaScript:

- Use int16/uint16 helpers (`boundary-codec-render.ts:96-97`, `:117-118`, runtime `:609`, `:621-622`).

C++:

- Use qint16/quint16 wrappers (`:138-139`, `:159-160`, runtime `:1175-1176`, `:1192-1193`).

#### `AnQst.Type.qint8`, `AnQst.Type.quint8`

TypeScript/JavaScript:

- Use int8/uint8 helpers (`boundary-codec-render.ts:98-99`, `:119-120`, runtime `:606`, `:618-619`).

C++:

- Use int8/uint8 byte helpers directly (`:140-141`, `:161-162`, runtime `:1170-1171`, `:1187-1188`).

#### `AnQst.Type.int32`, `AnQst.Type.uint32`

TypeScript/JavaScript:

- Same 4-byte scalar path as above (`boundary-codec-render.ts:100-101`, `:121-122`, runtime `:610`, `:623-624`).

C++:

- `mapTsTypeToCpp` emits `int32_t` / `uint32_t` in public type mapping (`emit.ts:218-220`).
- Wire helpers use `anqstPushInt32`/`anqstPushUint32` and reads via `anqstReadInt32`/`anqstReadUint32` (`boundary-codec-render.ts:142-143`, `:163-164`, runtime `:1177-1178`, `:1194-1195`).

#### `AnQst.Type.int16`, `AnQst.Type.uint16`

TypeScript/JavaScript:

- Same 2-byte scalar path (`boundary-codec-render.ts:102-103`, `:123-124`, runtime `:608-609`, `:621-622`).

C++:

- `mapTsTypeToCpp` emits `int16_t` / `uint16_t` (`emit.ts:216-218`).
- Wire helpers use int16/uint16 push/read (`boundary-codec-render.ts:144-145`, `:165-166`, runtime `:1173-1174`, `:1190-1191`).

#### `AnQst.Type.int8`, `AnQst.Type.uint8`

TypeScript/JavaScript:

- Same 1-byte scalar path (`boundary-codec-render.ts:104-105`, `:125-126`, runtime `:605-606`, `:618-619`).

C++:

- `mapTsTypeToCpp` emits `int8_t` / `uint8_t` (`emit.ts:214-216`).
- Wire helpers use byte push/read (`boundary-codec-render.ts:146-147`, `:167-168`, runtime `:1170-1171`, `:1187-1188`).

### 2.4 `AnQst.Type.object` and `AnQst.Type.json`

These resolve to the `dynamic` leaf capability (`boundary-codec-leaves.ts:546-547`, descriptor `:503-517`).

TypeScript/JavaScript:

- Encode: value is pushed to dynamic item stream (`boundary-codec-render.ts:268`).
- Decode: value is read from item stream as unknown and cast to target type (`:337`).

C++:

- Public type mapping goes to `QVariantMap` (`emit.ts:206`, `:228`, `:278`).
- Decode path uses `cppVariantToValueExpr(...toMap())` (`boundary-codec-render.ts:715-720`, leaf decode dispatch `:851`).

### 2.5 `AnQst.Type.buffer`, `AnQst.Type.blob`

Both map to `ArrayBuffer` binary leaf capability (`boundary-codec-leaves.ts:549-550`, descriptor `:332-348`).

TypeScript/JavaScript:

- Encode: bytes base93-encoded (`boundary-codec-render.ts:641`).
- Decode: base93 decode; returns underlying buffer directly when contiguous, otherwise slices exact window (`:642`).

C++:

- Public type maps to `QByteArray` (`emit.ts:208-210`, `:229`).
- Encode/decode via `anqstEncodeBinary`/`anqstDecodeBinary` (`boundary-codec-render.ts:1203-1211`).

### 2.6 `AnQst.Type.typedArray` and typed array family

Mappings in `resolveLeafCapability`:

- `AnQst.Type.typedArray` -> `Uint8Array` capability (`boundary-codec-leaves.ts:552`).
- `AnQst.Type.uint8Array` -> `Uint8Array` capability (`boundary-codec-leaves.ts:553`).
- `AnQst.Type.int8Array` -> `Int8Array` capability (`boundary-codec-leaves.ts:554`).
- `AnQst.Type.uint16Array` -> `Uint16Array` capability (`boundary-codec-leaves.ts:555`).
- `AnQst.Type.int16Array` -> `Int16Array` capability (`boundary-codec-leaves.ts:556`).
- `AnQst.Type.uint32Array` -> `Uint32Array` capability (`boundary-codec-leaves.ts:557`).
- `AnQst.Type.int32Array` -> `Int32Array` capability (`boundary-codec-leaves.ts:558`).
- `AnQst.Type.float32Array` -> `Float32Array` capability (`boundary-codec-leaves.ts:559`).
- `AnQst.Type.float64Array` -> `Float64Array` capability (`boundary-codec-leaves.ts:560`).

TypeScript/JavaScript:

- Encode: all typed arrays encode their byte windows via base93 (`boundary-codec-render.ts:648`).
- Decode: validates byte-length divisibility, uses zero-copy view when alignment allows, otherwise copies to aligned buffer (`:649`).

C++:

- All typed arrays are represented as `QByteArray` in generated C++ type mapping (`emit.ts:208-210`, `:230-243`).
- Wire codec remains binary helper based (`boundary-codec-render.ts:1203-1211`).

### 2.7 `AnQst.Type.stringArray`

`AnQst.Type.stringArray` is explicitly recognized in analysis and converted into an array node of string leafs (`boundary-codec-analysis.ts:358-372`).

TypeScript/JavaScript:

- Encode: standard array encoding loop over string item leafs (`boundary-codec-render.ts:297-305`).
- Decode: array count source depends on planner strategy (`explicit-count`, `blob-tail`, or `item-tail`) and then item decode loop (`:356-385`).

C++:

- Public type maps to `QStringList` (`emit.ts:204`, `:277`).
- Runtime decode/encode follows array plan strategy with reserve + push_back (`boundary-codec-render.ts:885-913`).

## 3. Implicitly supported non-AnQst.Type types

This section documents supported types that are not written as `AnQst.Type.*`.

## 3.1 `string`, `number`, `boolean`, `bigint`, `object` (TS keywords)

Implicit support note:

- These are supported because analysis directly handles TS syntax kinds and routes to leaf capabilities (`boundary-codec-analysis.ts:389-424`).
- `boolean` is intentionally implicit because resolver/mapping logic recognizes `boolean` directly, and there is no `AnQst.Type.boolean` alias (`boundary-codec-leaves.ts:530`, `emit.ts:225`).

TypeScript/JavaScript:

- `string`, `number`, `object`, and `bigint` follow the same leaf behavior as sections 2.1, 2.2, 2.4, and 2.3 (`qint64`) respectively.
- `boolean` encodes to one blob byte (`__anqstPushBool`) and decodes via `__anqstReadBool` (`boundary-codec-render.ts:90`, `:111`, runtime helpers `:607`, `:620`).

C++:

- `string`, `number`, `object`, and `bigint` follow the same leaf behavior as sections 2.1, 2.2, 2.4, and 2.3 (`qint64`) respectively.
- `boolean` encodes with `anqstPushBool` and decodes with `anqstReadBool` (`boundary-codec-render.ts:132`, `:153`, runtime helpers `:1172`, `:1189`).

## 3.2 `ArrayBuffer` and typed array constructor names

Implicit support note:

- `resolveLeafCapability` accepts plain constructor names (`ArrayBuffer`, `Uint8Array`, etc.) and type-reference names (`boundary-codec-leaves.ts:549-568`).

TypeScript/JavaScript and C++ behavior:

- Identical to `AnQst.Type.buffer/blob/typedArray*` behavior described in sections 2.5 and 2.6.

## 3.3 `T[]`, `Array<T>`, `ReadonlyArray<T>`

Implicit support note:

- Analysis recognizes all three array syntaxes and creates `TransportArrayAnalysis` nodes (`boundary-codec-analysis.ts:254-263`, `:329-341`).

TypeScript/JavaScript:

- Encode loops elements; decode computes count by strategy:
  `explicit-count` (u32 header), `blob-tail` (remaining bytes / fixed width), or `item-tail` (remaining item payloads / fixed item arity) (`boundary-codec-render.ts:298-379`).

C++:

- Same strategy variants with safety checks (`boundary-codec-render.ts:890-906`).

Planner details:

- Strategy chosen in `chooseRootArrayExtentStrategy` (`boundary-codec-plan.ts:177-181`).
- `explicit-count` adds an `array-count` blob entry (`:352`).
- `blob-tail` and `item-tail` avoid count metadata when safely derivable.

## 3.4 `Record<...>` and `Map<...>`

Implicit support note:

- Analysis maps both generic names to object/dynamic leaf (`boundary-codec-analysis.ts:343-350`).

TypeScript/JavaScript and C++ behavior:

- Same as dynamic object/json behavior in section 2.4.

## 3.5 Finite literal types and literal unions

Implicit support note:

- String/number/boolean literals and finite literal unions are promoted to finite-domain analysis nodes (`boundary-codec-analysis.ts:267-299`).

TypeScript/JavaScript:

- Coded finite domains encode through a generated `switch` into `uint8/uint16/uint32` scalar code; decode `switch` maps code back to typed literal (`boundary-codec-render.ts:195-227`, `:288-293`, `:348-352`).
- Identity-text finite domains encode as string items and decode via text `switch` (`:230-247`, `:294`, `:353-355`).

C++:

- Coded finite domains encode/decode with generated `switch` (`boundary-codec-render.ts:723-753`, `:858-867`).
- Identity-text finite domains use string conversion + compare chain (`:689-713`, `:868-881`).

Planner details:

- Width selection (`uint8/16/32`) in `chooseFiniteDomainScalar` (`boundary-codec-plan.ts:171-174`).
- Root boolean finite domain currently chooses identity-text (`boundary-codec-plan.ts:298-319`).

## 3.6 String-like / boolean-like / number-like non-finite unions

Implicit support note:

- If a union is not finite literals but still “like” one primitive family, analysis reduces it to a leaf capability (`boundary-codec-analysis.ts:300-323`).

TypeScript/JavaScript and C++ behavior:

- Same as ordinary string/boolean/number leaf behavior.

## 3.7 Named interfaces, type aliases, inline object literals, optional fields, recursion

Implicit support note:

- Analyzer produces `struct` and `named` transport nodes for declarations and supports recursive named shapes (`boundary-codec-analysis.ts:223-238`, `:251-253`, `:383-386`).

TypeScript/JavaScript:

- Struct encode/decode traverses fields directly (`boundary-codec-render.ts:307-321`, `:386-403`).
- Optional fields are encoded with presence byte flags (`:312-315`) and decoded via flag checks (`:391-397`).
- Named recursive types use generated named helper functions rather than generic runtime descriptors (`:285`, `:346`, named helper generation around `:505-520`).

C++:

- Same struct/optional traversal and named helper delegation (`boundary-codec-render.ts:811-824`, `:914-931`, `:852-853`).

Planner details:

- Optional presence metadata entries are created as blob bytes (`boundary-codec-plan.ts:407`).
- Root struct ordering may be tail-optimized in specific cases (`boundary-codec-plan.ts:378-389`).

## 4. C++ public-type mapping and wire-type mapping interaction

For C++, the codec generator separates:

- public C++ model type mapping (`emit.ts:194-255`, and AST-aware mapping in `CppTypeNormalizer.mapTypeNode`, `:665-722`)
- wire codec helper selection (`boundary-codec-render.ts:130-170`, `:1127-1225`)

This is why, for example:

- typed arrays become `QByteArray` publicly in C++ (`emit.ts:208-210`, `:230-243`)
- but can still use binary leaf behavior in wire codecs (`boundary-codec-render.ts:1203-1211`)

Finite domains in public C++ types are preserved as `enum class` when available (`emit.ts:640-650`, enum rendering `:848-858`), while codec planning can still choose coded or identity-text transport.

## 5. JavaScript vs TypeScript note

There is one TS codec emitter, and JavaScript behavior is the compiled output of that same logic.

- TS helpers are emitted into frontend Angular services (`emit.ts:2345`) and node bridge code (`emit.ts:3584`).
- The same plan catalog is reused across all outputs (`emit.ts:4090`).

So “TypeScript/Javascript codec behavior” is intentionally identical at runtime.

## 6. Explicitly unsupported (for context)

The following are intentionally rejected by analysis and therefore have no generated codec:

- tuples (`boundary-codec-analysis.ts:264-266`)
- nullish unions (`:284-287`)
- unsupported unions beyond string/boolean/number-like forms (`:324`)
- generic `Partial<T>` and `Promise<T>` transport (`:352-357`)

These are included here so the support boundary is explicit when reading per-type coverage above.
