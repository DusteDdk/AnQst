/**
 * Focused tests for the `integer-quint8` base codec emitter.
 * Covers descriptor shape, fixed-width 2-character base93 parity, repeated round-trips,
 * and portable C++ interoperability for the standalone byte wire format.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { decoderEmitter, descriptor } from "../../src/codecgenerators/basecodecemitters/integer-quint8/decoder";
import { encoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-quint8/encoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

function buildTsCodec(): {
  encodeQuint8Standalone: (value: number) => string;
  decodeQuint8Standalone: (encoded: string) => number;
} {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeQuint8Standalone, decodeQuint8Standalone };"
  ].join("\n");

  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

function splitStdoutLines(out: string): string[] {
  const lines = out.replace(/\r\n/g, "\n").split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

test("integer-quint8 descriptor describes 1-byte fixed-width standalone base93 strategy", () => {
  assert.equal(descriptor.codecId, "integer-quint8");
  assert.equal(descriptor.specPath, "RefinedSpecs/Codecs/Integer_quint8_Codec.md");
  assert.equal(descriptor.tsType, "number");
  assert.equal(descriptor.cppType, "quint8");
  assert.equal(descriptor.wireCategory, "fixed-width-scalar");
  assert.equal(descriptor.fixedWidth?.byteWidth, 1);
  assert.equal(descriptor.fixedWidth?.tsViewCtor, "Uint8Array");
  assert.match(descriptor.strategySummary, /2-character standalone string/i);
});

test("integer-quint8 TS codec round-trips exact quint8 values with repeated parity", () => {
  const { encodeQuint8Standalone, decodeQuint8Standalone } = buildTsCodec();
  const values = [0, 1, 7, 42, 93, 127, 128, 200, 254, 255];

  for (const value of values) {
    const wire = encodeQuint8Standalone(value);
    assert.equal(wire.length, 2, "1 raw byte packs to 2 base93 characters");
    assertBase93Alphabet(wire);

    const decoded = decodeQuint8Standalone(wire);
    assert.equal(decoded, value, `parity for ${value}`);

    const wire2 = encodeQuint8Standalone(decoded);
    const decoded2 = decodeQuint8Standalone(wire2);
    assert.equal(wire2, wire, `re-encoding preserves wire for ${value}`);
    assert.equal(decoded2, value, `repeated parity preserves value for ${value}`);
  }
});

test("integer-quint8 emitted functions include strategy comments and quint8 helpers", () => {
  const tsEncoder = encoderEmitter.emitTsEncoder();
  const tsDecoder = decoderEmitter.emitTsDecoder();
  const cppEncoder = encoderEmitter.emitCppEncoder();
  const cppDecoder = decoderEmitter.emitCppDecoder();

  assert.match(tsEncoder, /^\/\*\*/);
  assert.match(tsEncoder, /Uint8Array/);
  assert.match(tsEncoder, /base93Encode/);
  assert.match(tsDecoder, /^\/\*\*/);
  assert.match(tsDecoder, /Uint8Array/);
  assert.match(tsDecoder, /base93Decode/);
  assert.match(cppEncoder, /quint8/);
  assert.match(cppDecoder, /quint8/);
});

test("integer-quint8 portable C++ interop matches TypeScript wires and values", (t) => {
  const { encodeQuint8Standalone } = buildTsCodec();
  const samples = [0, 1, 42, 93, 127, 128, 200, 255];

  const cppSource = [
    "#include <array>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    "",
    "using quint8 = std::uint8_t;",
    "",
    emitBase93CppFunctions(),
    "",
    encoderEmitter.emitCppEncoder(),
    "",
    decoderEmitter.emitCppDecoder(),
    "",
    "int main() {",
    "  const quint8 samples[] = {0, 1, 42, 93, 127, 128, 200, 255};",
    "  for (quint8 value : samples) {",
    "    std::cout << encodeQuint8Standalone(value) << '\\n';",
    "  }",
    `  std::cout << static_cast<unsigned int>(decodeQuint8Standalone("${encodeQuint8Standalone(samples[0])}")) << '\\n';`,
    `  std::cout << static_cast<unsigned int>(decodeQuint8Standalone("${encodeQuint8Standalone(samples[1])}")) << '\\n';`,
    `  std::cout << static_cast<unsigned int>(decodeQuint8Standalone("${encodeQuint8Standalone(samples[2])}")) << '\\n';`,
    `  std::cout << static_cast<unsigned int>(decodeQuint8Standalone("${encodeQuint8Standalone(samples[3])}")) << '\\n';`,
    `  std::cout << static_cast<unsigned int>(decodeQuint8Standalone("${encodeQuint8Standalone(samples[4])}")) << '\\n';`,
    `  std::cout << static_cast<unsigned int>(decodeQuint8Standalone("${encodeQuint8Standalone(samples[5])}")) << '\\n';`,
    `  std::cout << static_cast<unsigned int>(decodeQuint8Standalone("${encodeQuint8Standalone(samples[6])}")) << '\\n';`,
    `  std::cout << static_cast<unsigned int>(decodeQuint8Standalone("${encodeQuint8Standalone(samples[7])}")) << '\\n';`,
    "  return 0;",
    "}",
    ""
  ].join("\n");

  const exe = compileCppProgram(t, "integer-quint8-codec", cppSource);
  if (!exe) return;

  const lines = splitStdoutLines(runCppProgram(exe));
  assert.equal(lines.length, samples.length * 2);

  const expectedWire = samples.map((sample) => encodeQuint8Standalone(sample));
  const expectedDecoded = samples.map(String);

  assert.deepEqual(lines.slice(0, samples.length), expectedWire);
  assert.deepEqual(lines.slice(samples.length), expectedDecoded);
});
