/**
 * Focused tests for the `integer-quint32` base codec emitter.
 * Covers descriptor shape, fixed-width 5-character base93 parity, repeated round-trips,
 * and portable C++ interoperability for the standalone unsigned 32-bit wire format.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { decoderEmitter, descriptor } from "../../src/codecgenerators/basecodecemitters/integer-quint32/decoder";
import { encoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-quint32/encoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

const MAX_QUINT32 = 4294967295;

function buildTsCodec(): {
  encodeQuint32Standalone: (value: number) => string;
  decodeQuint32Standalone: (encoded: string) => number;
} {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeQuint32Standalone, decodeQuint32Standalone };"
  ].join("\n");

  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

function splitStdoutLines(out: string): string[] {
  const lines = out.replace(/\r\n/g, "\n").split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

test("integer-quint32 descriptor describes 4-byte fixed-width standalone base93 strategy", () => {
  assert.equal(descriptor.codecId, "integer-quint32");
  assert.equal(descriptor.specPath, "RefinedSpecs/Codecs/Integer_quint32_Codec.md");
  assert.equal(descriptor.tsType, "number");
  assert.equal(descriptor.cppType, "quint32");
  assert.equal(descriptor.wireCategory, "fixed-width-scalar");
  assert.equal(descriptor.fixedWidth?.byteWidth, 4);
  assert.equal(descriptor.fixedWidth?.tsViewCtor, "Uint32Array");
  assert.match(descriptor.strategySummary, /5-character string/i);
});

test("integer-quint32 TS codec round-trips 0, 1, max, and representative values", () => {
  const { encodeQuint32Standalone, decodeQuint32Standalone } = buildTsCodec();
  const values = [0, 1, 2, 42, 93, 255, 256, 65535, 65536, 16777215, 16777216, 305419896, 2147483647, 2147483648, 4000000000, MAX_QUINT32];

  for (const value of values) {
    const wire = encodeQuint32Standalone(value);
    assert.equal(wire.length, 5, "4 raw bytes pack to 5 base93 characters");
    assertBase93Alphabet(wire);
    assert.equal(decodeQuint32Standalone(wire), value, `parity for ${value}`);
  }
});

test("integer-quint32 TS repeated encode/decode parity preserves wire and value", () => {
  const { encodeQuint32Standalone, decodeQuint32Standalone } = buildTsCodec();
  const values = [0, 1, 42, 65535, 305419896, 4000000000, MAX_QUINT32];

  for (const value of values) {
    const wire1 = encodeQuint32Standalone(value);
    const value1 = decodeQuint32Standalone(wire1);
    const wire2 = encodeQuint32Standalone(value1);
    const value2 = decodeQuint32Standalone(wire2);

    assert.equal(wire2, wire1, `re-encoding preserves wire for ${value}`);
    assert.equal(value1, value, `first round-trip preserves value for ${value}`);
    assert.equal(value2, value, `repeated parity preserves value for ${value}`);
  }
});

test("integer-quint32 emitted functions include top block comments and Uint32Array helpers", () => {
  const tsEncoder = encoderEmitter.emitTsEncoder();
  const tsDecoder = decoderEmitter.emitTsDecoder();
  const cppEncoder = encoderEmitter.emitCppEncoder();
  const cppDecoder = decoderEmitter.emitCppDecoder();

  assert.match(tsEncoder, /^\/\*\*/);
  assert.match(tsEncoder, /Uint32Array/);
  assert.match(tsEncoder, /base93Encode/);
  assert.match(tsDecoder, /^\/\*\*/);
  assert.match(tsDecoder, /Uint32Array/);
  assert.match(tsDecoder, /base93Decode/);
  assert.match(cppEncoder, /quint32/);
  assert.match(cppDecoder, /quint32/);
});

test("integer-quint32 C++ decode matches TypeScript encode", (t) => {
  const { encodeQuint32Standalone } = buildTsCodec();
  const samples = [0, 1, 42, 65535, 305419896, 4000000000, MAX_QUINT32];

  const cppSource = [
    "#include <array>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    "",
    "using quint32 = std::uint32_t;",
    "",
    emitBase93CppFunctions(),
    "",
    decoderEmitter.emitCppDecoder(),
    "",
    "int main() {",
    "  std::string line;",
    "  while (std::getline(std::cin, line)) {",
    "    std::cout << decodeQuint32Standalone(line) << '\\n';",
    "  }",
    "  return 0;",
    "}",
    ""
  ].join("\n");

  const exe = compileCppProgram(t, "integer-quint32-decode", cppSource);
  if (!exe) return;

  const input = samples.map((sample) => encodeQuint32Standalone(sample)).join("\n") + "\n";
  const lines = splitStdoutLines(runCppProgram(exe, input));
  assert.deepEqual(lines, samples.map(String));
});

test("integer-quint32 C++ encode matches TypeScript decode", (t) => {
  const { decodeQuint32Standalone } = buildTsCodec();
  const samples = [0, 1, 42, 65535, 305419896, 4000000000, MAX_QUINT32];

  const cppSource = [
    "#include <array>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    "",
    "using quint32 = std::uint32_t;",
    "",
    emitBase93CppFunctions(),
    "",
    encoderEmitter.emitCppEncoder(),
    "",
    "int main() {",
    "  std::string line;",
    "  while (std::getline(std::cin, line)) {",
    "    const quint32 value = static_cast<quint32>(std::stoull(line));",
    "    std::cout << encodeQuint32Standalone(value) << '\\n';",
    "  }",
    "  return 0;",
    "}",
    ""
  ].join("\n");

  const exe = compileCppProgram(t, "integer-quint32-encode", cppSource);
  if (!exe) return;

  const input = samples.map(String).join("\n") + "\n";
  const lines = splitStdoutLines(runCppProgram(exe, input));
  assert.equal(lines.length, samples.length);

  for (let i = 0; i < samples.length; i++) {
    assertBase93Alphabet(lines[i]);
    assert.equal(lines[i].length, 5, `C++ wire length for ${samples[i]}`);
    assert.equal(decodeQuint32Standalone(lines[i]), samples[i], `TS decode vs C++ encode for ${samples[i]}`);
  }
});
