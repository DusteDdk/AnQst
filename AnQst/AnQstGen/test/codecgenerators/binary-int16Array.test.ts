/**
 * Generator tests for the `binary-int16Array` base codec emitter.
 * Focus: raw-byte base93 parity, signed 16-bit pattern preservation, subview/offset safety,
 * odd-byte corruption rejection, and portable C++ wire interoperability.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { decoder } from "../../src/codecgenerators/basecodecemitters/binary-int16Array/decoder";
import { encoder } from "../../src/codecgenerators/basecodecemitters/binary-int16Array/encoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

function loadTsCodec(): {
  encode: (value: Int16Array) => string;
  decode: (encoded: string) => Int16Array;
  decodeBase93: (encoded: string) => Uint8Array;
  encodeBase93: (bytes: Uint8Array) => string;
} {
  const body = `
var base93Encode = ${emitBase93Encoder()};
var base93Decode = ${emitBase93Decoder()};
${encoder.emitTsEncoder()}
${decoder.emitTsDecoder()}
return {
  encode: encodeBinaryInt16ArrayStandalone,
  decode: decodeBinaryInt16ArrayStandalone,
  decodeBase93: base93Decode,
  encodeBase93: base93Encode
};
`;
  return new Function(body)() as ReturnType<typeof loadTsCodec>;
}

function viewBytes(value: Int16Array): Uint8Array {
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function copyBytes(value: Int16Array): Uint8Array {
  return Uint8Array.from(viewBytes(value));
}

function sameElements(actual: Int16Array, expected: Int16Array): void {
  assert.deepEqual(Array.from(actual), Array.from(expected));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function stringToHex(value: string): string {
  return Array.from(value, (char) => char.charCodeAt(0).toString(16).padStart(2, "0")).join("");
}

function stripTrailingLineBreak(value: string): string {
  return value.replace(/\r?\n$/, "");
}

test("binary-int16Array descriptor exports the spec-facing contract", () => {
  assert.equal(encoder.descriptor, decoder.descriptor);
  assert.equal(encoder.descriptor.codecId, "binary-int16Array");
  assert.equal(encoder.descriptor.specPath, "RefinedSpecs/Codecs/Binary_int16Array_Codec.md");
  assert.equal(encoder.descriptor.tsType, "Int16Array");
  assert.equal(encoder.descriptor.cppType, "QByteArray");
  assert.equal(encoder.descriptor.wireCategory, "binary");
});

test("binary-int16Array TypeScript codec round-trips representative signed arrays with wire parity", () => {
  const { encode, decode } = loadTsCodec();
  const cases = [
    new Int16Array([]),
    new Int16Array([0]),
    new Int16Array([-1, 0, 1]),
    new Int16Array([-32768, -16384, -1, 0, 1, 16384, 32767]),
    new Int16Array([0x1234, -0x1234, 0x00ff, -0x00ff, 0x7f00, -0x7f00])
  ];

  for (const sample of cases) {
    const wire = encode(sample);
    assertBase93Alphabet(wire);

    const roundTrip = decode(wire);
    sameElements(roundTrip, sample);

    const wireAgain = encode(roundTrip);
    assert.equal(wireAgain, wire, "encode/decode parity on wire");
    sameElements(decode(wireAgain), sample);
  }
});

test("binary-int16Array preserves raw platform byte order on the wire", () => {
  const { encode, decode, decodeBase93 } = loadTsCodec();
  const sample = new Int16Array([0x1234, -0x1234, -1, -32768, 32767]);
  const expectedBytes = copyBytes(sample);

  const wire = encode(sample);
  const wireBytes = decodeBase93(wire);
  assert.deepEqual(wireBytes, expectedBytes);

  const roundTrip = decode(wire);
  assert.deepEqual(copyBytes(roundTrip), expectedBytes);
  sameElements(roundTrip, sample);
});

test("binary-int16Array encoder respects byteOffset and byteLength for subviews", () => {
  const { encode, decode, decodeBase93 } = loadTsCodec();
  const backing = new ArrayBuffer(12);
  const raw = new Uint8Array(backing);
  raw.set([0xaa, 0xbb, 0x34, 0x12, 0xcc, 0xed, 0xff, 0xff, 0x00, 0x80, 0x11, 0x22]);

  const sample = new Int16Array(backing, 2, 4);
  const expectedBytes = copyBytes(sample);
  const wire = encode(sample);

  assert.deepEqual(decodeBase93(wire), expectedBytes);
  sameElements(decode(wire), sample);
});

test("binary-int16Array decoder rejects odd decoded byte counts", () => {
  const { decode, encodeBase93 } = loadTsCodec();
  const corruptWire = encodeBase93(new Uint8Array([0x12, 0x34, 0x56]));
  assert.throws(() => decode(corruptWire), RangeError);
});

test("binary-int16Array portable C++ wire interop matches TypeScript raw bytes", (t) => {
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
    "static std::string textToHex(const std::string& text) {",
    "  static constexpr char HEX[] = \"0123456789abcdef\";",
    "  std::string out;",
    "  out.resize(text.size() * 2u);",
    "  for (std::size_t i = 0; i < text.size(); ++i) {",
    "    const unsigned char c = static_cast<unsigned char>(text[i]);",
    "    out[i * 2u] = HEX[c >> 4];",
    "    out[i * 2u + 1u] = HEX[c & 0x0f];",
    "  }",
    "  return out;",
    "}",
    "",
    "static std::string hexToText(const std::string& hex) {",
    "  if ((hex.size() & 1u) != 0u) throw std::runtime_error(\"odd text-hex length\");",
    "  std::string out;",
    "  out.resize(hex.size() / 2u);",
    "  for (std::size_t i = 0; i < out.size(); ++i) {",
    "    const int hi = nibble(hex[i * 2]);",
    "    const int lo = nibble(hex[i * 2 + 1]);",
    "    if (hi < 0 || lo < 0) throw std::runtime_error(\"invalid text hex\");",
    "    out[i] = static_cast<char>((hi << 4) | lo);",
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
    "    std::cout << textToHex(encodeBinaryInt16ArrayStandalone(fromHex(payload)));",
    "    return 0;",
    "  }",
    "  if (mode == \"decode\") {",
    "    std::cout << toHex(decodeBinaryInt16ArrayStandalone(hexToText(payload)));",
    "    return 0;",
    "  }",
    "  return 3;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "binary_int16array_codec_cpp", cpp);
  if (!exe) return;

  const cases = [
    new Int16Array([]),
    new Int16Array([0x1234]),
    new Int16Array([-1, 0, 1]),
    new Int16Array([-32768, -1, 0, 1, 32767]),
    new Int16Array([0x1234, -0x1234, 0x00ff, -0x00ff])
  ];

  for (const sample of cases) {
    const hex = bytesToHex(copyBytes(sample));
    const wire = encode(sample);
    const wireHex = stringToHex(wire);

    assert.equal(stripTrailingLineBreak(runCppProgram(exe, `encode\n${hex}\n`)), wireHex);
    assert.equal(stripTrailingLineBreak(runCppProgram(exe, `decode\n${wireHex}\n`)), hex);
  }
});
