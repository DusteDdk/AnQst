import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { decoderEmitter } from "../../src/codecgenerators/basecodecemitters/binary-typedArray/decoder";
import { encoderEmitter } from "../../src/codecgenerators/basecodecemitters/binary-typedArray/encoder";
import { assertBase93Alphabet, evalEmittedFunction } from "./helpers/emitted-code";

type ConcreteTypedArray =
  | Uint8Array
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

type ConcreteTypedArrayCtor<T extends ConcreteTypedArray> = new (buffer: ArrayBufferLike) => T;
type DecodeBinaryTypedArrayStandalone = <T extends ConcreteTypedArray>(
  encoded: string,
  typedArrayCtor: ConcreteTypedArrayCtor<T>
) => T;

function buildTsCodec(): {
  encodeBinaryTypedArrayStandalone: (value: ConcreteTypedArray) => string;
  decodeBinaryTypedArrayStandalone: DecodeBinaryTypedArrayStandalone;
} {
  const base93EncodeAssign = `const base93Encode = ${emitBase93Encoder()};`;
  const base93DecodeAssign = `const base93Decode = ${emitBase93Decoder()};`;
  const source = [
    base93EncodeAssign,
    base93DecodeAssign,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeBinaryTypedArrayStandalone, decodeBinaryTypedArrayStandalone };"
  ].join("\n");
  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

function assertRoundTrip<T extends ConcreteTypedArray>(
  encodeBinaryTypedArrayStandalone: (value: ConcreteTypedArray) => string,
  decodeBinaryTypedArrayStandalone: DecodeBinaryTypedArrayStandalone,
  ctor: ConcreteTypedArrayCtor<T>,
  value: T
): void {
  const encoded = encodeBinaryTypedArrayStandalone(value);
  assertBase93Alphabet(encoded);

  const decoded = decodeBinaryTypedArrayStandalone(encoded, ctor);
  assert.equal(decoded.constructor, ctor);
  assert.deepEqual(
    Array.from(new Uint8Array(decoded.buffer, decoded.byteOffset, decoded.byteLength)),
    Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))
  );
  assert.equal(encodeBinaryTypedArrayStandalone(decoded), encoded, "repeat encode/decode parity");
}

test("binary-typedArray standalone encodes only the visible bytes of a non-zero-offset view", () => {
  const { encodeBinaryTypedArrayStandalone, decodeBinaryTypedArrayStandalone } = buildTsCodec();
  const base93Encode = evalEmittedFunction<(value: Uint8Array) => string>(emitBase93Encoder());
  const backing = new Uint8Array([0xaa, 0xbb, 0x01, 0x02, 0x03, 0x04, 0xcc, 0xdd]);
  const view = new Uint16Array(backing.buffer, 2, 2);

  const encoded = encodeBinaryTypedArrayStandalone(view);
  const expected = base93Encode(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
  const wholeBuffer = base93Encode(new Uint8Array(view.buffer));

  assert.equal(encoded, expected);
  assert.notEqual(encoded, wholeBuffer, "must not encode bytes outside the active view window");
  assertBase93Alphabet(encoded);

  const decoded = decodeBinaryTypedArrayStandalone(encoded, Uint16Array);
  assert.equal(decoded.constructor, Uint16Array);
  assert.deepEqual(Array.from(decoded), Array.from(view));
});

test("binary-typedArray standalone handles empty typed arrays as an empty base93 string", () => {
  const { encodeBinaryTypedArrayStandalone, decodeBinaryTypedArrayStandalone } = buildTsCodec();
  const value = new Float32Array(0);

  const encoded = encodeBinaryTypedArrayStandalone(value);

  assert.equal(encoded, "");
  const decoded = decodeBinaryTypedArrayStandalone(encoded, Float32Array);
  assert.equal(decoded.length, 0);
  assert.equal(decoded.constructor, Float32Array);
});

test("binary-typedArray standalone preserves parity across representative concrete typed arrays", () => {
  const { encodeBinaryTypedArrayStandalone, decodeBinaryTypedArrayStandalone } = buildTsCodec();

  assertRoundTrip(
    encodeBinaryTypedArrayStandalone,
    decodeBinaryTypedArrayStandalone,
    Uint8Array,
    new Uint8Array([0, 1, 2, 255])
  );
  assertRoundTrip(
    encodeBinaryTypedArrayStandalone,
    decodeBinaryTypedArrayStandalone,
    Int16Array,
    new Int16Array([-32768, -1, 0, 32767])
  );
  assertRoundTrip(
    encodeBinaryTypedArrayStandalone,
    decodeBinaryTypedArrayStandalone,
    Float32Array,
    new Float32Array([1.5, -2.25, Number.POSITIVE_INFINITY])
  );
});

test("binary-typedArray emitted decoder source documents the concrete-constructor requirement", () => {
  const encoderSource = encoderEmitter.emitTsEncoder();
  const decoderSource = decoderEmitter.emitTsDecoder();

  assert.match(
    encoderSource,
    /new Uint8Array\(value\.buffer, value\.byteOffset, value\.byteLength\)/,
    "encoder should encode only the active view bytes"
  );
  assert.match(
    decoderSource,
    /function decodeBinaryTypedArrayStandalone\(encoded, typedArrayCtor\)/,
    "decoder API should require a concrete constructor parameter"
  );
  assert.match(
    decoderSource,
    /abstract TypedArray is insufficient to reconstruct element width and view type/,
    "decoder comment should explain why a concrete constructor is required"
  );
  assert.match(
    decoderSource,
    /return new typedArrayCtor\(bytes\.buffer\);/,
    "decoder should reconstruct the concrete typed array from decoded raw bytes"
  );
});
