/**
 * Generator tests for the `integer-int32` base codec emitter.
 * Verifies descriptor distinction from `qint32`, 5-character base93 wire
 * parity for signed 32-bit values, and emitted C++ interoperability via
 * `int32_t` rather than the Qt typedef.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { decoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-int32/decoder";
import { descriptor, encoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-int32/encoder";
import {
  assertBase93Alphabet,
  compileCppProgram,
  runCppProgram
} from "./helpers/emitted-code";

interface Int32Codec {
  encodeInt32Standalone: (value: number) => string;
  decodeInt32Standalone: (encoded: string) => number;
  encodeBytes: (value: Uint8Array) => string;
}

function buildTsCodec(): Int32Codec {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeInt32Standalone, decodeInt32Standalone, encodeBytes: base93Encode };"
  ].join("\n");

  return new Function(source)() as Int32Codec;
}

test("int32 descriptor stays distinct from qint32 while keeping the same 4-byte strategy", () => {
  assert.equal(descriptor.codecId, "integer-int32");
  assert.equal(descriptor.specPath, "RefinedSpecs/Codecs/Integer_int32_Codec.md");
  assert.equal(descriptor.tsType, "number");
  assert.equal(descriptor.cppType, "int32_t");
  assert.equal(descriptor.wireCategory, "fixed-width-scalar");
  assert.equal(descriptor.fixedWidth?.byteWidth, 4);
  assert.equal(descriptor.fixedWidth?.tsViewCtor, "Int32Array");
  assert.equal(descriptor.fixedWidth?.cppType, "int32_t");
  assert.match(descriptor.strategySummary, /wire-identical to qint32/i);
  assert.deepEqual(decoderEmitter.descriptor, descriptor);

  const cppEncoder = encoderEmitter.emitCppEncoder();
  const cppDecoder = decoderEmitter.emitCppDecoder();
  assert.match(cppEncoder, /\bint32_t\b/);
  assert.match(cppDecoder, /\bint32_t\b/);
  assert.doesNotMatch(cppEncoder, /\bqint32\b/);
  assert.doesNotMatch(cppDecoder, /\bqint32\b/);
});

test("int32 standalone round-trip preserves signed 32-bit values, 5-character wire, and parity", () => {
  const { encodeInt32Standalone, decodeInt32Standalone, encodeBytes } = buildTsCodec();
  const values = [-2147483648, -2147483647, -123456789, -1, 0, 1, 123456789, 2147483646, 2147483647];

  for (const value of values) {
    const encoded = encodeInt32Standalone(value);
    const expectedWire = encodeBytes(new Uint8Array(new Int32Array([value]).buffer));

    assert.equal(encoded.length, 5, "4 raw bytes pack to 5 base93 characters");
    assertBase93Alphabet(encoded);
    assert.equal(encoded, expectedWire, `wire-identical signed-32 encoding for ${value}`);

    const decoded = decodeInt32Standalone(encoded);
    assert.equal(decoded, value, `parity for ${value}`);
    assert.equal(decodeInt32Standalone(encodeInt32Standalone(decoded)), value, `repeat parity for ${value}`);
  }
});

test("C++ emitted int32 codec matches TypeScript for signed 32-bit wire in both directions", (t) => {
  const { encodeInt32Standalone } = buildTsCodec();
  const values = [-2147483648, -1, 0, 1, 123456789, 2147483647];
  const encodedSamples = values.map((value) => encodeInt32Standalone(value));

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
    "  const int32_t values[] = {",
    ...values.map((value) => `    static_cast<int32_t>(${value}),`),
    "  };",
    "  for (int32_t value : values) {",
    "    std::cout << encodeInt32Standalone(value) << '\\n';",
    "  }",
    "  const char* encodedSamples[] = {",
    ...encodedSamples.map((encoded) => `    ${JSON.stringify(encoded)},`),
    "  };",
    "  for (const char* encoded : encodedSamples) {",
    "    std::cout << decodeInt32Standalone(encoded) << '\\n';",
    "  }",
    "  return 0;",
    "}",
    ""
  ].join("\n");

  const exe = compileCppProgram(t, "int32-standalone-codec", cpp);
  if (!exe) return;

  const raw = runCppProgram(exe).replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

  assert.deepEqual(lines.slice(0, values.length), encodedSamples);
  assert.deepEqual(lines.slice(values.length), values.map(String));
});
