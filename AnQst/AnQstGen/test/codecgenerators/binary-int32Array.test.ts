/**
 * Generator tests for the `binary-int32Array` base codec emitter.
 * Covers raw-byte base93 wire parity, signed 32-bit patterns, non-zero byteOffset
 * subviews, 4-byte divisibility checks, and portable C++ QByteArray interoperability.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import {
  decoder,
  decoderEmitter,
  descriptor as decoderDescriptor
} from "../../src/codecgenerators/basecodecemitters/binary-int32Array/decoder";
import {
  descriptor as encoderDescriptor,
  encoder,
  encoderEmitter
} from "../../src/codecgenerators/basecodecemitters/binary-int32Array/encoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

function buildTsCodec(): {
  encodeBinaryInt32ArrayStandalone: (value: Int32Array) => string;
  decodeBinaryInt32ArrayStandalone: (encoded: string) => Int32Array;
  decodeBase93: (encoded: string) => Uint8Array;
  encodeBase93: (bytes: Uint8Array) => string;
} {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return {",
    "  encodeBinaryInt32ArrayStandalone,",
    "  decodeBinaryInt32ArrayStandalone,",
    "  decodeBase93: base93Decode,",
    "  encodeBase93: base93Encode",
    "};"
  ].join("\n");

  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

function viewBytes(value: Int32Array): Uint8Array {
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function copyBytes(value: Int32Array): Uint8Array {
  return Uint8Array.from(viewBytes(value));
}

function sameElements(actual: Int32Array, expected: Int32Array): void {
  assert.deepEqual(Array.from(actual), Array.from(expected));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function stripTrailingNewline(value: string): string {
  return value.replace(/\r?\n$/, "");
}

test("binary-int32Array exports shared descriptor and encoder/decoder emitters", () => {
  assert.equal(encoder, encoderEmitter);
  assert.equal(decoder, decoderEmitter);
  assert.deepEqual(encoderDescriptor, decoderDescriptor);
  assert.equal(encoderDescriptor.codecId, "binary-int32Array");
  assert.equal(encoderDescriptor.specPath, "RefinedSpecs/Codecs/Binary_int32Array_Codec.md");
  assert.equal(encoderDescriptor.tsType, "Int32Array");
  assert.equal(encoderDescriptor.cppType, "QByteArray");
  assert.equal(encoderDescriptor.wireCategory, "binary");
  assert.match(encoderDescriptor.strategySummary, /Int32Array/);
});

test("binary-int32Array TypeScript codec round-trips representative signed patterns with wire parity", () => {
  const { encodeBinaryInt32ArrayStandalone, decodeBinaryInt32ArrayStandalone } = buildTsCodec();
  const cases = [
    new Int32Array([]),
    new Int32Array([0]),
    new Int32Array([-1, 0, 1]),
    new Int32Array([0x7fffffff, -0x80000000]),
    new Int32Array([-2147483648, -123456789, -1, 0, 1, 123456789, 2147483647]),
    new Int32Array([0x01020304, -0x01020304, 0x11223344, -0x11223344])
  ];

  for (const sample of cases) {
    const wire = encodeBinaryInt32ArrayStandalone(sample);
    assertBase93Alphabet(wire);

    const roundTrip = decodeBinaryInt32ArrayStandalone(wire);
    sameElements(roundTrip, sample);
    assert.deepEqual(copyBytes(roundTrip), copyBytes(sample), "signed raw bytes remain intact");

    const wireAgain = encodeBinaryInt32ArrayStandalone(roundTrip);
    assert.equal(wireAgain, wire, "encode/decode parity on wire");
    sameElements(decodeBinaryInt32ArrayStandalone(wireAgain), sample);
  }
});

test("binary-int32Array wire is the raw stored bytes, including non-zero byteOffset views", () => {
  const { encodeBinaryInt32ArrayStandalone, decodeBinaryInt32ArrayStandalone, decodeBase93 } = buildTsCodec();
  const backing = new ArrayBuffer(24);
  const raw = new Uint8Array(backing);
  raw.set([
    0xaa,
    0xbb,
    0xcc,
    0xdd,
    0x04,
    0x03,
    0x02,
    0x01,
    0xfc,
    0xfc,
    0xfd,
    0xfe,
    0x78,
    0x56,
    0x34,
    0x12,
    0x88,
    0x99,
    0xaa,
    0xbb,
    0xcc,
    0xdd,
    0xee,
    0xff
  ]);

  const sample = new Int32Array(backing, 4, 3);
  assert.equal(sample.byteOffset, 4);

  const expectedBytes = copyBytes(sample);
  const wire = encodeBinaryInt32ArrayStandalone(sample);

  assert.deepEqual(decodeBase93(wire), expectedBytes);
  sameElements(decodeBinaryInt32ArrayStandalone(wire), sample);
});

test("binary-int32Array decoder rejects decoded byte lengths not divisible by 4", () => {
  const { decodeBinaryInt32ArrayStandalone, encodeBase93 } = buildTsCodec();
  const corruptWire = encodeBase93(new Uint8Array([0x12, 0x34, 0x56]));
  assert.throws(() => decodeBinaryInt32ArrayStandalone(corruptWire), RangeError);
});

test("binary-int32Array emitted helpers include required strategy comments and concrete Int32Array decode", () => {
  const tsEncoder = encoderEmitter.emitTsEncoder();
  const tsDecoder = decoderEmitter.emitTsDecoder();
  const cppEncoder = encoderEmitter.emitCppEncoder();
  const cppDecoder = decoderEmitter.emitCppDecoder();

  assert.match(tsEncoder, /^\/\*\*/);
  assert.match(tsEncoder, /byteOffset/);
  assert.match(tsEncoder, /base93Encode/);
  assert.match(tsDecoder, /^\/\*\*/);
  assert.match(tsDecoder, /base93Decode/);
  assert.match(tsDecoder, /new Int32Array\(buffer\)/);
  assert.match(tsDecoder, /divisible by 4/);
  assert.match(cppEncoder, /QByteArray/);
  assert.match(cppDecoder, /QByteArray/);
});

test("binary-int32Array portable C++ wire interop matches TypeScript raw bytes", (t) => {
  const { encodeBinaryInt32ArrayStandalone } = buildTsCodec();
  const cpp = [
    "#include <cctype>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <stdexcept>",
    "#include <string>",
    "#include <vector>",
    "",
    "class QByteArray {",
    "public:",
    "  QByteArray() = default;",
    "  QByteArray(const char* data, int len) : bytes_(len > 0 ? static_cast<std::size_t>(len) : 0) {",
    "    if (!bytes_.empty() && data != nullptr) {",
    "      std::memcpy(bytes_.data(), data, bytes_.size());",
    "    }",
    "  }",
    "  const char* constData() const {",
    "    return bytes_.empty() ? nullptr : reinterpret_cast<const char*>(bytes_.data());",
    "  }",
    "  int size() const {",
    "    return static_cast<int>(bytes_.size());",
    "  }",
    "private:",
    "  std::vector<std::uint8_t> bytes_;",
    "};",
    "",
    "static int nibble(char c) {",
    "  if (c >= '0' && c <= '9') return c - '0';",
    "  c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));",
    "  if (c >= 'a' && c <= 'f') return 10 + (c - 'a');",
    "  return -1;",
    "}",
    "",
    "static QByteArray fromHex(const std::string& hex) {",
    "  if ((hex.size() & 1u) != 0u) throw std::runtime_error(\"odd hex length\");",
    "  std::vector<std::uint8_t> bytes(hex.size() / 2u);",
    "  for (std::size_t i = 0; i < bytes.size(); ++i) {",
    "    const int hi = nibble(hex[i * 2u]);",
    "    const int lo = nibble(hex[i * 2u + 1u]);",
    "    if (hi < 0 || lo < 0) throw std::runtime_error(\"invalid hex\");",
    "    bytes[i] = static_cast<std::uint8_t>((hi << 4) | lo);",
    "  }",
    "  return QByteArray(reinterpret_cast<const char*>(bytes.data()), static_cast<int>(bytes.size()));",
    "}",
    "",
    "static std::string toHex(const QByteArray& value) {",
    "  static constexpr char HEX[] = \"0123456789abcdef\";",
    "  std::string out;",
    "  out.resize(static_cast<std::size_t>(value.size()) * 2u);",
    "  const auto* data = reinterpret_cast<const unsigned char*>(value.constData());",
    "  for (int i = 0; i < value.size(); ++i) {",
    "    const unsigned char byte = data[i];",
    "    out[static_cast<std::size_t>(i) * 2u] = HEX[byte >> 4];",
    "    out[static_cast<std::size_t>(i) * 2u + 1u] = HEX[byte & 0x0f];",
    "  }",
    "  return out;",
    "}",
    "",
    emitBase93CppFunctions(),
    "",
    encoderEmitter.emitCppEncoder(),
    "",
    decoderEmitter.emitCppDecoder(),
    "",
    "int main() {",
    "  std::string mode;",
    "  std::string payload;",
    "  if (!std::getline(std::cin, mode)) return 1;",
    "  if (!std::getline(std::cin, payload)) return 2;",
    "  if (mode == \"encode\") {",
    "    std::cout << encodeBinaryInt32ArrayStandalone(fromHex(payload));",
    "    return 0;",
    "  }",
    "  if (mode == \"decode\") {",
    "    std::cout << toHex(decodeBinaryInt32ArrayStandalone(payload));",
    "    return 0;",
    "  }",
    "  return 3;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "binary_int32array_codec_cpp", cpp);
  if (!exe) return;

  const cases = [
    new Int32Array([]),
    new Int32Array([0]),
    new Int32Array([-1]),
    new Int32Array([0x12345678, -0x1234567]),
    new Int32Array([-2147483648, -1, 0, 1, 2147483647])
  ];

  for (const sample of cases) {
    const hex = bytesToHex(copyBytes(sample));
    const wire = encodeBinaryInt32ArrayStandalone(sample);

    assert.equal(stripTrailingNewline(runCppProgram(exe, `encode\n${hex}\n`)), wire);
    assert.equal(stripTrailingNewline(runCppProgram(exe, `decode\n${wire}\n`)), hex);
  }
});
