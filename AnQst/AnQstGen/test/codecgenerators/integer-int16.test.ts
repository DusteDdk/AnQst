/**
 * Focused tests for the `integer-int16` base codec emitter.
 * Covers descriptor distinctness, fixed-width 3-character base93 parity for
 * signed 16-bit values, repeated round-trips, and portable C++ interoperability.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { decoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-int16/decoder";
import { descriptor, encoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-int16/encoder";
import {
  assertBase93Alphabet,
  compileCppProgram,
  runCppProgram
} from "./helpers/emitted-code";

interface Int16Codec {
  encodeInt16Standalone: (value: number) => string;
  decodeInt16Standalone: (encoded: string) => number;
  encodeBytes: (value: Uint8Array) => string;
}

function buildTsCodec(): Int16Codec {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeInt16Standalone, decodeInt16Standalone, encodeBytes: base93Encode };"
  ].join("\n");

  return new Function(source)() as Int16Codec;
}

test("int16 descriptor stays distinct from qint16 while keeping the same 2-byte strategy", () => {
  assert.equal(descriptor.codecId, "integer-int16");
  assert.equal(descriptor.specPath, "RefinedSpecs/Codecs/Integer_int16_Codec.md");
  assert.equal(descriptor.tsType, "number");
  assert.equal(descriptor.cppType, "int16_t");
  assert.equal(descriptor.wireCategory, "fixed-width-scalar");
  assert.equal(descriptor.fixedWidth?.byteWidth, 2);
  assert.equal(descriptor.fixedWidth?.tsViewCtor, "Int16Array");
  assert.equal(descriptor.fixedWidth?.cppType, "int16_t");
  assert.match(descriptor.strategySummary, /Wire-identical to qint16/);
  assert.deepEqual(decoderEmitter.descriptor, descriptor);

  const tsEncoder = encoderEmitter.emitTsEncoder();
  const tsDecoder = decoderEmitter.emitTsDecoder();
  const cppEncoder = encoderEmitter.emitCppEncoder();
  const cppDecoder = decoderEmitter.emitCppDecoder();

  assert.match(tsEncoder, /^\/\*\*/);
  assert.match(tsDecoder, /^\/\*\*/);
  assert.match(tsEncoder, /\bInt16Array\b/);
  assert.match(tsDecoder, /\bInt16Array\b/);
  assert.match(cppEncoder, /encodeInt16Standalone\(const int16_t& value\)/);
  assert.match(cppDecoder, /inline int16_t decodeInt16Standalone\(const std::string& encoded\)/);
});

test("int16 standalone round-trip preserves signed 16-bit values and 3-character wire", () => {
  const { encodeInt16Standalone, decodeInt16Standalone, encodeBytes } = buildTsCodec();
  const values = [-32768, -32767, -1024, -1, 0, 1, 1024, 32766, 32767];

  for (const value of values) {
    const encoded = encodeInt16Standalone(value);
    const expectedWire = encodeBytes(new Uint8Array(new Int16Array([value]).buffer));

    assert.equal(encoded.length, 3, "2 raw bytes pack to 3 base93 characters");
    assertBase93Alphabet(encoded);
    assert.equal(encoded, expectedWire, `wire-identical signed-16 encoding for ${value}`);

    const decoded = decodeInt16Standalone(encoded);
    assert.equal(decoded, value, `parity for ${value}`);
    assert.equal(decodeInt16Standalone(encodeInt16Standalone(decoded)), value, `repeat parity for ${value}`);
  }
});

test("C++ emitted int16 codec matches TypeScript for signed 16-bit wire in both directions", (t) => {
  const { encodeInt16Standalone } = buildTsCodec();
  const values = [-32768, -1, 0, 1, 1024, 32767];
  const encodedSamples = values.map((value) => encodeInt16Standalone(value));

  const cpp = [
    "#include <array>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    "",
    emitBase93CppFunctions(),
    "",
    encoderEmitter.emitCppEncoder(),
    "",
    decoderEmitter.emitCppDecoder(),
    "",
    "int main() {",
    "  const int16_t values[] = {",
    ...values.map((value) => `    static_cast<int16_t>(${value}),`),
    "  };",
    "  for (int16_t value : values) {",
    "    std::cout << encodeInt16Standalone(value) << '\\n';",
    "  }",
    "  const char* encodedSamples[] = {",
    ...encodedSamples.map((encoded) => `    ${JSON.stringify(encoded)},`),
    "  };",
    "  for (const char* encoded : encodedSamples) {",
    "    std::cout << static_cast<int>(decodeInt16Standalone(encoded)) << '\\n';",
    "  }",
    "  return 0;",
    "}",
    ""
  ].join("\n");

  const exe = compileCppProgram(t, "int16-standalone-codec", cpp);
  if (!exe) return;

  const raw = runCppProgram(exe).replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

  assert.deepEqual(lines.slice(0, values.length), encodedSamples);
  assert.deepEqual(lines.slice(values.length), values.map(String));
});
