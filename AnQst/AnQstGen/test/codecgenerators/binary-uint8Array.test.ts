/**
 * Focused tests for the `binary-uint8Array` base codec emitter.
 * Covers standalone raw-byte base93 parity, offset-safe Uint8Array views, and practical
 * C++ interoperability with a portable QByteArray-compatible stub.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { decoderEmitter, descriptor } from "../../src/codecgenerators/basecodecemitters/binary-uint8Array/decoder";
import { encoderEmitter } from "../../src/codecgenerators/basecodecemitters/binary-uint8Array/encoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

function buildTsCodec(): {
  encodeBinaryUint8ArrayStandalone: (value: Uint8Array) => string;
  decodeBinaryUint8ArrayStandalone: (encoded: string) => Uint8Array;
} {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeBinaryUint8ArrayStandalone, decodeBinaryUint8ArrayStandalone };"
  ].join("\n");

  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

function expectedBase93Length(byteLength: number): number {
  const fullGroups = Math.floor(byteLength / 4);
  const remainder = byteLength % 4;
  return fullGroups * 5 + (remainder === 0 ? 0 : remainder + 1);
}

function splitStdoutLines(out: string): string[] {
  const lines = out.replace(/\r\n/g, "\n").split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

test("binary-uint8Array descriptor describes standalone raw-byte base93 strategy", () => {
  assert.equal(descriptor.codecId, "binary-uint8Array");
  assert.equal(descriptor.specPath, "RefinedSpecs/Codecs/Binary_uint8Array_Codec.md");
  assert.equal(descriptor.tsType, "Uint8Array");
  assert.equal(descriptor.cppType, "QByteArray");
  assert.equal(descriptor.wireCategory, "binary");
  assert.match(descriptor.strategySummary, /base93/i);
});

test("binary-uint8Array TS codec round-trips representative byte sequences", () => {
  const { encodeBinaryUint8ArrayStandalone, decodeBinaryUint8ArrayStandalone } = buildTsCodec();
  const samples = [
    new Uint8Array([]),
    new Uint8Array([0]),
    new Uint8Array([255]),
    new Uint8Array([0, 1, 2]),
    new Uint8Array([0, 1, 2, 3]),
    new Uint8Array([0, 1, 2, 3, 4]),
    new Uint8Array([255, 254, 253, 252, 251, 250, 249]),
    Uint8Array.from({ length: 32 }, (_, i) => (i * 17 + 5) & 255)
  ];

  for (const sample of samples) {
    const wire = encodeBinaryUint8ArrayStandalone(sample);
    assert.equal(wire.length, expectedBase93Length(sample.length));
    assertBase93Alphabet(wire);

    const decoded = decodeBinaryUint8ArrayStandalone(wire);
    assert.deepEqual(decoded, sample, `parity for ${toHex(sample) || "<empty>"}`);

    const wire2 = encodeBinaryUint8ArrayStandalone(decoded);
    const decoded2 = decodeBinaryUint8ArrayStandalone(wire2);
    assert.equal(wire2, wire, "encode/decode parity keeps the same base93 payload");
    assert.deepEqual(decoded2, sample, "repeated parity keeps the same bytes");
  }
});

test("binary-uint8Array TS encoder is offset-safe for Uint8Array subarray views", () => {
  const { encodeBinaryUint8ArrayStandalone, decodeBinaryUint8ArrayStandalone } = buildTsCodec();

  const backing = Uint8Array.from([111, 222, 10, 20, 30, 40, 50, 60, 77]);
  const view = backing.subarray(2, 7);
  const isolated = new Uint8Array([10, 20, 30, 40, 50]);

  const viewWire = encodeBinaryUint8ArrayStandalone(view);
  const isolatedWire = encodeBinaryUint8ArrayStandalone(isolated);
  const backingWire = encodeBinaryUint8ArrayStandalone(backing);

  assert.equal(view.byteOffset, 2);
  assert.equal(view.byteLength, 5);
  assert.equal(viewWire, isolatedWire, "subarray view must encode only its visible bytes");
  assert.notEqual(viewWire, backingWire, "encoder must not leak prefix/suffix bytes from the backing buffer");
  assert.deepEqual(decodeBinaryUint8ArrayStandalone(viewWire), isolated);
});

test("binary-uint8Array emitted functions include strategy comments and raw-byte helpers", () => {
  const tsEncoder = encoderEmitter.emitTsEncoder();
  const tsDecoder = decoderEmitter.emitTsDecoder();
  const cppEncoder = encoderEmitter.emitCppEncoder();
  const cppDecoder = decoderEmitter.emitCppDecoder();

  assert.match(tsEncoder, /^\/\*\*/);
  assert.match(tsEncoder, /base93Encode/);
  assert.match(tsEncoder, /byteOffset/);
  assert.match(tsDecoder, /^\/\*\*/);
  assert.match(tsDecoder, /base93Decode/);
  assert.match(cppEncoder, /QByteArray/);
  assert.match(cppDecoder, /QByteArray/);
});

test("binary-uint8Array C++ helpers match TS wire and decode TS payloads", (t) => {
  const { encodeBinaryUint8ArrayStandalone } = buildTsCodec();
  const samples = [
    new Uint8Array([]),
    new Uint8Array([0]),
    new Uint8Array([1, 2, 3, 4, 5]),
    Uint8Array.from({ length: 12 }, (_, i) => (255 - i * 9) & 255)
  ];

  const cppSource = [
    "#include <cstdint>",
    "#include <initializer_list>",
    "#include <iostream>",
    "#include <sstream>",
    "#include <string>",
    "#include <vector>",
    "",
    "class QByteArray {",
    "public:",
    "  QByteArray() = default;",
    "  QByteArray(const char* data, int size) {",
    "    if (data != nullptr && size > 0) {",
    "      bytes_.assign(reinterpret_cast<const std::uint8_t*>(data), reinterpret_cast<const std::uint8_t*>(data) + static_cast<std::size_t>(size));",
    "    }",
    "  }",
    "  explicit QByteArray(std::initializer_list<std::uint8_t> init) : bytes_(init) {}",
    "  const char* constData() const {",
    "    return reinterpret_cast<const char*>(bytes_.data());",
    "  }",
    "  int size() const {",
    "    return static_cast<int>(bytes_.size());",
    "  }",
    "  std::string hex() const {",
    "    static constexpr char HEX[] = \"0123456789abcdef\";",
    "    std::string out;",
    "    out.reserve(bytes_.size() * 2);",
    "    for (std::uint8_t byte : bytes_) {",
    "      out.push_back(HEX[byte >> 4]);",
    "      out.push_back(HEX[byte & 0x0f]);",
    "    }",
    "    return out;",
    "  }",
    "private:",
    "  std::vector<std::uint8_t> bytes_;",
    "};",
    "",
    "QByteArray makeByteArray(std::initializer_list<std::uint8_t> init) {",
    "  return QByteArray(init);",
    "}",
    "",
    emitBase93CppFunctions(),
    "",
    encoderEmitter.emitCppEncoder(),
    "",
    decoderEmitter.emitCppDecoder(),
    "",
    "int main() {",
    "  const QByteArray samples[] = {",
    "    makeByteArray({}),",
    "    makeByteArray({0}),",
    "    makeByteArray({1, 2, 3, 4, 5}),",
    "    makeByteArray({255, 246, 237, 228, 219, 210, 201, 192, 183, 174, 165, 156})",
    "  };",
    "  for (const QByteArray& value : samples) {",
    "    std::cout << encodeBinaryUint8ArrayStandalone(value) << '\\n';",
    "  }",
    `  const QByteArray decoded0 = decodeBinaryUint8ArrayStandalone("${encodeBinaryUint8ArrayStandalone(samples[0])}");`,
    `  const QByteArray decoded1 = decodeBinaryUint8ArrayStandalone("${encodeBinaryUint8ArrayStandalone(samples[1])}");`,
    `  const QByteArray decoded2 = decodeBinaryUint8ArrayStandalone("${encodeBinaryUint8ArrayStandalone(samples[2])}");`,
    `  const QByteArray decoded3 = decodeBinaryUint8ArrayStandalone("${encodeBinaryUint8ArrayStandalone(samples[3])}");`,
    "  std::cout << decoded0.hex() << '\\n';",
    "  std::cout << decoded1.hex() << '\\n';",
    "  std::cout << decoded2.hex() << '\\n';",
    "  std::cout << decoded3.hex() << '\\n';",
    "  return 0;",
    "}",
    ""
  ].join("\n");

  const exe = compileCppProgram(t, "binary-uint8array-codec", cppSource);
  if (!exe) return;

  const lines = splitStdoutLines(runCppProgram(exe));
  assert.equal(lines.length, samples.length * 2);

  const expectedWire = samples.map((sample) => encodeBinaryUint8ArrayStandalone(sample));
  const expectedHex = samples.map((sample) => toHex(sample));

  assert.deepEqual(lines.slice(0, samples.length), expectedWire);
  assert.deepEqual(lines.slice(samples.length), expectedHex);
});
