/**
 * Focused tests for the `integer-quint16` base codec emitter.
 * Covers descriptor shape, fixed-width 3-character base93 parity, representative values,
 * repeated round-trips, and portable C++ interoperability for the standalone quint16 wire format.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { decoderEmitter, descriptor } from "../../src/codecgenerators/basecodecemitters/integer-quint16/decoder";
import { encoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-quint16/encoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

function buildTsCodec(): {
  encodeQuint16Standalone: (value: number) => string;
  decodeQuint16Standalone: (encoded: string) => number;
} {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeQuint16Standalone, decodeQuint16Standalone };"
  ].join("\n");

  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

function splitStdoutLines(out: string): string[] {
  const lines = out.replace(/\r\n/g, "\n").split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

test("integer-quint16 descriptor describes 2-byte fixed-width standalone base93 strategy", () => {
  assert.equal(descriptor.codecId, "integer-quint16");
  assert.equal(descriptor.specPath, "RefinedSpecs/Codecs/Integer_quint16_Codec.md");
  assert.equal(descriptor.tsType, "number");
  assert.equal(descriptor.cppType, "quint16");
  assert.equal(descriptor.wireCategory, "fixed-width-scalar");
  assert.equal(descriptor.fixedWidth?.byteWidth, 2);
  assert.equal(descriptor.fixedWidth?.tsViewCtor, "Uint16Array");
  assert.match(descriptor.strategySummary, /3-character standalone string/i);
});

test("integer-quint16 TS codec round-trips exact quint16 values with 3-char wire parity", () => {
  const { encodeQuint16Standalone, decodeQuint16Standalone } = buildTsCodec();
  const values = [0, 1, 2, 42, 93, 255, 256, 1024, 4660, 43981, 65534, 65535];

  for (const value of values) {
    const wire = encodeQuint16Standalone(value);
    assert.equal(wire.length, 3, "2 raw bytes pack to 3 base93 characters");
    assertBase93Alphabet(wire);
    assert.equal(decodeQuint16Standalone(wire), value, `parity for ${value}`);
  }
});

test("integer-quint16 TS repeated encode/decode parity is stable", () => {
  const { encodeQuint16Standalone: encode, decodeQuint16Standalone: decode } = buildTsCodec();
  const samples = [0, 1, 65535, 0x1234, 0xabcd];

  for (const value of samples) {
    const wire1 = encode(value);
    const wire2 = encode(decode(wire1));
    const value2 = decode(wire2);

    assert.equal(wire2, wire1, `re-encoding preserves wire for ${value}`);
    assert.equal(value2, value, `repeated parity preserves value for ${value}`);
  }
});

test("integer-quint16 emitted functions include strategy comments and quint16 helpers", () => {
  const tsEncoder = encoderEmitter.emitTsEncoder();
  const tsDecoder = decoderEmitter.emitTsDecoder();
  const cppEncoder = encoderEmitter.emitCppEncoder();
  const cppDecoder = decoderEmitter.emitCppDecoder();

  assert.match(tsEncoder, /^\/\*\*/);
  assert.match(tsEncoder, /Uint16Array/);
  assert.match(tsEncoder, /base93Encode/);
  assert.match(tsDecoder, /^\/\*\*/);
  assert.match(tsDecoder, /Uint16Array/);
  assert.match(tsDecoder, /base93Decode/);
  assert.match(cppEncoder, /quint16/);
  assert.match(cppDecoder, /quint16/);
});

test("integer-quint16 portable C++ interop matches TypeScript wires and values", (t) => {
  const { encodeQuint16Standalone } = buildTsCodec();
  const samples = [0, 1, 42, 255, 256, 4660, 43981, 65535];

  const cppSource = [
    "#include <array>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    "",
    "using quint16 = std::uint16_t;",
    "",
    emitBase93CppFunctions(),
    "",
    encoderEmitter.emitCppEncoder(),
    "",
    decoderEmitter.emitCppDecoder(),
    "",
    "int main() {",
    "  const quint16 samples[] = {0, 1, 42, 255, 256, 4660, 43981, 65535};",
    "  for (quint16 value : samples) {",
    "    std::cout << encodeQuint16Standalone(value) << '\\n';",
    "  }",
    `  std::cout << decodeQuint16Standalone("${encodeQuint16Standalone(samples[0])}") << '\\n';`,
    `  std::cout << decodeQuint16Standalone("${encodeQuint16Standalone(samples[1])}") << '\\n';`,
    `  std::cout << decodeQuint16Standalone("${encodeQuint16Standalone(samples[2])}") << '\\n';`,
    `  std::cout << decodeQuint16Standalone("${encodeQuint16Standalone(samples[3])}") << '\\n';`,
    `  std::cout << decodeQuint16Standalone("${encodeQuint16Standalone(samples[4])}") << '\\n';`,
    `  std::cout << decodeQuint16Standalone("${encodeQuint16Standalone(samples[5])}") << '\\n';`,
    `  std::cout << decodeQuint16Standalone("${encodeQuint16Standalone(samples[6])}") << '\\n';`,
    `  std::cout << decodeQuint16Standalone("${encodeQuint16Standalone(samples[7])}") << '\\n';`,
    "  return 0;",
    "}",
    ""
  ].join("\n");

  const exe = compileCppProgram(t, "integer-quint16-codec", cppSource);
  if (!exe) return;

  const lines = splitStdoutLines(runCppProgram(exe));
  assert.equal(lines.length, samples.length * 2);

  const expectedWire = samples.map((sample) => encodeQuint16Standalone(sample));
  const expectedDecoded = samples.map(String);

  assert.deepEqual(lines.slice(0, samples.length), expectedWire);
  assert.deepEqual(lines.slice(samples.length), expectedDecoded);
});
