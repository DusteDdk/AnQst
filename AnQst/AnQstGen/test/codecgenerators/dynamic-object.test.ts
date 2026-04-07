import test from "node:test";
import assert from "node:assert/strict";
import { encoder } from "../../src/codecgenerators/basecodecemitters/dynamic-object/encoder";
import { decoder } from "../../src/codecgenerators/basecodecemitters/dynamic-object/decoder";
import { evalEmittedFunction } from "./helpers/emitted-code";

test("dynamic object descriptor matches shared contract", () => {
  assert.equal(encoder.descriptor.codecId, "AnQst.Type.object");
  assert.equal(decoder.descriptor.codecId, "AnQst.Type.object");
  assert.equal(encoder.descriptor.wireCategory, "dynamic");
  assert.equal(decoder.descriptor.cppType, "QVariantMap");
  assert.deepEqual(encoder.descriptor, decoder.descriptor);
});

test("TypeScript encode/decode: nested JSON-native object and arrays round-trip via JSON parity", () => {
  const encode = evalEmittedFunction<(value: unknown) => unknown>(encoder.emitTsEncoder());
  const decode = evalEmittedFunction<(value: unknown) => unknown>(decoder.emitTsDecoder());
  const value = {
    a: 1,
    b: "x",
    c: true,
    d: null,
    nested: { k: [1, 2, { deep: [] }] }
  };
  const wire = JSON.parse(JSON.stringify(encode(value)));
  const round = decode(wire);
  assert.deepEqual(round, value);
});

test("TypeScript encode/decode: empty object parity", () => {
  const encode = evalEmittedFunction<(value: unknown) => unknown>(encoder.emitTsEncoder());
  const decode = evalEmittedFunction<(value: unknown) => unknown>(decoder.emitTsDecoder());
  const value = {};
  assert.deepEqual(decode(JSON.parse(JSON.stringify(encode(value)))), value);
});

test("TypeScript encode/decode repeated application is stable", () => {
  const encode = evalEmittedFunction<(value: unknown) => unknown>(encoder.emitTsEncoder());
  const decode = evalEmittedFunction<(value: unknown) => unknown>(decoder.emitTsDecoder());
  const value = { n: 42, items: ["a", "b"] };
  let v: unknown = value;
  for (let i = 0; i < 5; i++) {
    v = decode(JSON.parse(JSON.stringify(encode(v))));
  }
  assert.deepEqual(v, value);
});

test("C++ emitter source is QVariantMap-oriented thin helper (no Qt compile)", () => {
  const enc = encoder.emitCppEncoder();
  const dec = decoder.emitCppDecoder();
  assert.match(enc, /QJsonObject::fromVariantMap/);
  assert.match(enc, /QVariantMap/);
  assert.match(dec, /\.toVariantMap\s*\(/);
  assert.match(dec, /QJsonObject/);
});
