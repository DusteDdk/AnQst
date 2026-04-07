import test from "node:test";
import assert from "node:assert/strict";
import { descriptor as encoderDescriptor, encoder } from "../../src/codecgenerators/basecodecemitters/dynamic-json/encoder";
import { descriptor as decoderDescriptor, decoder } from "../../src/codecgenerators/basecodecemitters/dynamic-json/decoder";
import { evalEmittedFunction } from "./helpers/emitted-code";

test("dynamic json descriptor is distinct for QJsonObject-facing generation", () => {
  assert.deepEqual(encoderDescriptor, decoderDescriptor);
  assert.equal(encoderDescriptor.codecId, "AnQst.Type.json");
  assert.equal(encoderDescriptor.cppType, "QJsonObject");
  assert.equal(encoderDescriptor.tsType, "object");
  assert.equal(encoderDescriptor.wireCategory, "dynamic");
  assert.match(encoderDescriptor.strategySummary, /QJsonObject/);
  assert.equal(encoderDescriptor.specPath, "RefinedSpecs/Codecs/Dynamic_json_Codec.md");
});

test("TypeScript encoder and decoder are identity; nested JSON-native values round-trip", () => {
  const encode = evalEmittedFunction<(value: unknown) => unknown>(encoder.emitTsEncoder());
  const decode = evalEmittedFunction<(wire: unknown) => unknown>(decoder.emitTsDecoder());

  const nested = {
    n: 42,
    s: "hello",
    b: true,
    z: null,
    a: [1, 2, { inner: "x" }],
    o: { k: "v" }
  };

  const once = decode(encode(nested));
  assert.deepEqual(once, nested);

  let v: unknown = nested;
  for (let i = 0; i < 10; i++) {
    v = decode(encode(v));
  }
  assert.deepEqual(v, nested);

  const viaJson = JSON.parse(JSON.stringify(encode(nested))) as typeof nested;
  assert.deepEqual(decode(viaJson), nested);
});

test("C++ emitted encoder uses direct QJsonValue(jsonObj), not QVariantMap conversion", () => {
  const cpp = encoder.emitCppEncoder();
  assert.match(cpp, /QJsonValue\s*\(\s*jsonObj\s*\)/);
  assert.match(cpp, /const\s+QJsonObject\s*&\s*jsonObj/);
  assert.equal(cpp.includes("fromVariantMap"), false);
});

test("C++ emitted decoder uses toObject() into QJsonObject, not toVariantMap", () => {
  const cpp = decoder.emitCppDecoder();
  assert.match(cpp, /\.toObject\s*\(\s*\)/);
  assert.match(cpp, /QJsonObject\s+decodeDynamicJsonFromJsonValue/);
  assert.equal(cpp.includes("toVariantMap"), false);
});
