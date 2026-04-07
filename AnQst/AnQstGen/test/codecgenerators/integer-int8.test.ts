import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { decoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-int8/decoder";
import { descriptor, encoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-int8/encoder";
import {
  assertBase93Alphabet,
  compileCppProgram,
  runCppProgram
} from "./helpers/emitted-code";

interface Int8Codec {
  encodeInt8Standalone: (value: number) => string;
  decodeInt8Standalone: (encoded: string) => number;
  encodeBytes: (value: Uint8Array) => string;
}

function buildTsCodec(): Int8Codec {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeInt8Standalone, decodeInt8Standalone, encodeBytes: base93Encode };"
  ].join("\n");

  return new Function(source)() as Int8Codec;
}

test("int8 descriptor stays distinct from qint8 while keeping the same 1-byte strategy", () => {
  assert.equal(descriptor.codecId, "integer-int8");
  assert.equal(descriptor.specPath, "RefinedSpecs/Codecs/Integer_int8_Codec.md");
  assert.equal(descriptor.tsType, "number");
  assert.equal(descriptor.cppType, "int8_t");
  assert.equal(descriptor.wireCategory, "fixed-width-scalar");
  assert.equal(descriptor.fixedWidth?.byteWidth, 1);
  assert.equal(descriptor.fixedWidth?.tsViewCtor, "Int8Array");
  assert.equal(descriptor.fixedWidth?.cppType, "int8_t");
  assert.match(descriptor.strategySummary, /Wire-identical to qint8/);
  assert.deepEqual(decoderEmitter.descriptor, descriptor);

  const cppEncoder = encoderEmitter.emitCppEncoder();
  const cppDecoder = decoderEmitter.emitCppDecoder();
  assert.match(cppEncoder, /\bint8_t\b/);
  assert.match(cppDecoder, /\bint8_t\b/);
  assert.doesNotMatch(cppEncoder, /\bqint8\b/);
  assert.doesNotMatch(cppDecoder, /\bqint8\b/);
});

test("int8 standalone round-trip preserves signed 8-bit values and 2-character wire", () => {
  const { encodeInt8Standalone, decodeInt8Standalone, encodeBytes } = buildTsCodec();
  const values = [-128, -127, -42, -1, 0, 1, 42, 126, 127];

  for (const value of values) {
    const encoded = encodeInt8Standalone(value);
    const expectedWire = encodeBytes(new Uint8Array(new Int8Array([value]).buffer));

    assert.equal(encoded.length, 2, "1 raw byte packs to 2 base93 characters");
    assertBase93Alphabet(encoded);
    assert.equal(encoded, expectedWire, `wire-identical signed-byte encoding for ${value}`);

    const decoded = decodeInt8Standalone(encoded);
    assert.equal(decoded, value, `parity for ${value}`);
    assert.equal(decodeInt8Standalone(encodeInt8Standalone(decoded)), value, `repeat parity for ${value}`);
  }
});

test("C++ emitted int8 codec matches TypeScript for signed-byte wire in both directions", (t) => {
  const { encodeInt8Standalone } = buildTsCodec();
  const values = [-128, -1, 0, 1, 42, 127];
  const encodedSamples = values.map((value) => encodeInt8Standalone(value));

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
    "  const int8_t values[] = {",
    ...values.map((value) => `    static_cast<int8_t>(${value}),`),
    "  };",
    "  for (int8_t value : values) {",
    "    std::cout << encodeInt8Standalone(value) << '\\n';",
    "  }",
    "  const char* encodedSamples[] = {",
    ...encodedSamples.map((encoded) => `    ${JSON.stringify(encoded)},`),
    "  };",
    "  for (const char* encoded : encodedSamples) {",
    "    std::cout << static_cast<int>(decodeInt8Standalone(encoded)) << '\\n';",
    "  }",
    "  return 0;",
    "}",
    ""
  ].join("\n");

  const exe = compileCppProgram(t, "int8-standalone-codec", cpp);
  if (!exe) return;

  const raw = runCppProgram(exe).replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

  assert.deepEqual(lines.slice(0, values.length), encodedSamples);
  assert.deepEqual(lines.slice(values.length), values.map(String));
});
