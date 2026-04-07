/**
 * Generator tests for the `binary-float32Array` base codec emitter.
 * Focus: raw-byte base93 parity, IEEE 754 special values, representative float32 values,
 * subview/offset safety, corrupted length rejection, and portable C++ wire interoperability.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { encoder } from "../../src/codecgenerators/basecodecemitters/binary-float32Array/encoder";
import { decoder } from "../../src/codecgenerators/basecodecemitters/binary-float32Array/decoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

function loadTsCodec(): {
  encode: (value: Float32Array) => string;
  decode: (encoded: string) => Float32Array;
  decodeBase93: (encoded: string) => Uint8Array;
  encodeBase93: (bytes: Uint8Array) => string;
} {
  const body = `
var base93Encode = ${emitBase93Encoder()};
var base93Decode = ${emitBase93Decoder()};
${encoder.emitTsEncoder()}
${decoder.emitTsDecoder()}
return {
  encode: encodeBinaryFloat32ArrayStandalone,
  decode: decodeBinaryFloat32ArrayStandalone,
  decodeBase93: base93Decode,
  encodeBase93: base93Encode
};
`;
  return new Function(body)() as ReturnType<typeof loadTsCodec>;
}

function viewBytes(value: Float32Array): Uint8Array {
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function copyBytes(value: Float32Array): Uint8Array {
  return Uint8Array.from(viewBytes(value));
}

function sameFloatBits(actual: Float32Array, expected: Float32Array): void {
  assert.equal(actual instanceof Float32Array, true);
  assert.deepEqual(copyBytes(actual), copyBytes(expected));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

test("binary-float32Array descriptor exports the spec-facing contract", () => {
  assert.equal(encoder.descriptor, decoder.descriptor);
  assert.equal(encoder.descriptor.codecId, "binary-float32Array");
  assert.equal(encoder.descriptor.specPath, "RefinedSpecs/Codecs/Binary_float32Array_Codec.md");
  assert.equal(encoder.descriptor.tsType, "Float32Array");
  assert.equal(encoder.descriptor.cppType, "QByteArray");
  assert.equal(encoder.descriptor.wireCategory, "binary");
});

test("binary-float32Array TypeScript codec round-trips representative float32 arrays with wire parity", () => {
  const { encode, decode } = loadTsCodec();
  const cases = [
    new Float32Array([]),
    new Float32Array([0]),
    new Float32Array([1.5, -2.25, Math.fround(Math.PI)]),
    new Float32Array([Math.fround(1 / 3), Math.fround(0.1), Math.fround(123456.75)]),
    new Float32Array([Math.fround(1.17549435e-38), Math.fround(1.401298464324817e-45), Math.fround(3.4028235e38)])
  ];

  for (const sample of cases) {
    const wire = encode(sample);
    assertBase93Alphabet(wire);

    const roundTrip = decode(wire);
    sameFloatBits(roundTrip, sample);

    const wireAgain = encode(roundTrip);
    assert.equal(wireAgain, wire, "encode/decode parity on wire");
    sameFloatBits(decode(wireAgain), sample);
  }
});

test("binary-float32Array preserves NaN, infinities, and signed zero by raw bits", () => {
  const { encode, decode, decodeBase93 } = loadTsCodec();
  const sample = new Float32Array([NaN, Infinity, -Infinity, -0, 0]);
  const expectedBytes = copyBytes(sample);

  const wire = encode(sample);
  assert.deepEqual(decodeBase93(wire), expectedBytes);

  const roundTrip = decode(wire);
  sameFloatBits(roundTrip, sample);
  assert.equal(Number.isNaN(roundTrip[0]), true);
  assert.equal(roundTrip[1], Infinity);
  assert.equal(roundTrip[2], -Infinity);
  assert.equal(Object.is(roundTrip[3], -0), true);
  assert.equal(Object.is(roundTrip[4], 0), true);
});

test("binary-float32Array encoder respects byteOffset and byteLength for subviews", () => {
  const { encode, decode, decodeBase93 } = loadTsCodec();
  const backing = new ArrayBuffer(20);
  const raw = new Uint8Array(backing);
  raw.set([
    0xaa, 0xbb, 0xcc, 0xdd,
    0x00, 0x00, 0xc0, 0x3f,
    0xdb, 0x0f, 0x49, 0x40,
    0x00, 0x00, 0x28, 0xc2,
    0xee, 0xff, 0x11, 0x22
  ]);

  const sample = new Float32Array(backing, 4, 3);
  const expectedBytes = copyBytes(sample);
  const wire = encode(sample);

  assert.deepEqual(decodeBase93(wire), expectedBytes);
  sameFloatBits(decode(wire), sample);
});

test("binary-float32Array decoder rejects decoded byte counts not divisible by 4", () => {
  const { decode, encodeBase93 } = loadTsCodec();
  const corruptWire = encodeBase93(new Uint8Array([0x12, 0x34, 0x56]));
  assert.throws(() => decode(corruptWire), RangeError);
});

test("binary-float32Array portable C++ wire interop matches TypeScript raw bytes", (t) => {
  const { encode } = loadTsCodec();
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
    "    const int hi = nibble(hex[i * 2]);",
    "    const int lo = nibble(hex[i * 2 + 1]);",
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
    "    const unsigned char b = data[i];",
    "    out[static_cast<std::size_t>(i) * 2u] = HEX[b >> 4];",
    "    out[static_cast<std::size_t>(i) * 2u + 1u] = HEX[b & 0x0f];",
    "  }",
    "  return out;",
    "}",
    "",
    emitBase93CppFunctions(),
    "",
    encoder.emitCppEncoder(),
    "",
    decoder.emitCppDecoder(),
    "",
    "int main() {",
    "  std::string mode;",
    "  std::string payload;",
    "  if (!std::getline(std::cin, mode)) return 1;",
    "  if (!std::getline(std::cin, payload)) return 2;",
    "  if (mode == \"encode\") {",
    "    std::cout << encodeBinaryFloat32ArrayStandalone(fromHex(payload));",
    "    return 0;",
    "  }",
    "  if (mode == \"decode\") {",
    "    std::cout << toHex(decodeBinaryFloat32ArrayStandalone(payload));",
    "    return 0;",
    "  }",
    "  return 3;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "binary_float32array_codec_cpp", cpp);
  if (!exe) return;

  const cases = [
    new Float32Array([]),
    new Float32Array([1.5]),
    new Float32Array([NaN, Infinity, -Infinity, -0]),
    new Float32Array([Math.fround(Math.PI), Math.fround(1 / 3), Math.fround(-1234.5)])
  ];

  for (const sample of cases) {
    const hex = bytesToHex(copyBytes(sample));
    const wire = encode(sample);

    assert.equal(runCppProgram(exe, `encode\n${hex}\n`), wire);
    assert.equal(runCppProgram(exe, `decode\n${wire}\n`), hex);
  }
});
