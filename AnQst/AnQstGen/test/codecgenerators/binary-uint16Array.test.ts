/**
 * Generator tests for the `binary-uint16Array` base codec emitter.
 * Focus: raw-byte base93 parity, endianness preservation on the current platform,
 * subview/offset safety, corrupted odd-byte rejection, and portable C++ wire interoperability.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { encoder } from "../../src/codecgenerators/basecodecemitters/binary-uint16Array/encoder";
import { decoder } from "../../src/codecgenerators/basecodecemitters/binary-uint16Array/decoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

function loadTsCodec(): {
  encode: (value: Uint16Array) => string;
  decode: (encoded: string) => Uint16Array;
  decodeBase93: (encoded: string) => Uint8Array;
  encodeBase93: (bytes: Uint8Array) => string;
} {
  const body = `
var base93Encode = ${emitBase93Encoder()};
var base93Decode = ${emitBase93Decoder()};
${encoder.emitTsEncoder()}
${decoder.emitTsDecoder()}
return {
  encode: encodeBinaryUint16ArrayStandalone,
  decode: decodeBinaryUint16ArrayStandalone,
  decodeBase93: base93Decode,
  encodeBase93: base93Encode
};
`;
  return new Function(body)() as ReturnType<typeof loadTsCodec>;
}

function viewBytes(value: Uint16Array): Uint8Array {
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function copyBytes(value: Uint16Array): Uint8Array {
  return Uint8Array.from(viewBytes(value));
}

function sameElements(actual: Uint16Array, expected: Uint16Array): void {
  assert.deepEqual(Array.from(actual), Array.from(expected));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

test("binary-uint16Array descriptor exports the spec-facing contract", () => {
  assert.equal(encoder.descriptor, decoder.descriptor);
  assert.equal(encoder.descriptor.codecId, "binary-uint16Array");
  assert.equal(encoder.descriptor.specPath, "RefinedSpecs/Codecs/Binary_uint16Array_Codec.md");
  assert.equal(encoder.descriptor.tsType, "Uint16Array");
  assert.equal(encoder.descriptor.cppType, "QByteArray");
  assert.equal(encoder.descriptor.wireCategory, "binary");
});

test("binary-uint16Array TypeScript codec round-trips representative arrays with wire parity", () => {
  const { encode, decode } = loadTsCodec();
  const cases = [
    new Uint16Array([]),
    new Uint16Array([0]),
    new Uint16Array([1, 2, 3]),
    new Uint16Array([0xffff, 0x1234, 0xabcd, 0x0001]),
    new Uint16Array([0x0102, 0x0304, 0x0506, 0x0708, 0x090a])
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

test("binary-uint16Array preserves raw platform byte order on the wire", () => {
  const { encode, decode, decodeBase93 } = loadTsCodec();
  const sample = new Uint16Array([0x1234, 0xabcd, 0x00ff, 0xff00]);
  const expectedBytes = copyBytes(sample);

  const wire = encode(sample);
  const wireBytes = decodeBase93(wire);
  assert.deepEqual(wireBytes, expectedBytes);

  const roundTrip = decode(wire);
  assert.deepEqual(copyBytes(roundTrip), expectedBytes);
  sameElements(roundTrip, sample);
});

test("binary-uint16Array encoder respects byteOffset and byteLength for subviews", () => {
  const { encode, decode, decodeBase93 } = loadTsCodec();
  const backing = new ArrayBuffer(10);
  const raw = new Uint8Array(backing);
  raw.set([0xaa, 0xbb, 0x34, 0x12, 0xcd, 0xab, 0xee, 0xff, 0x11, 0x22]);

  const sample = new Uint16Array(backing, 2, 2);
  const expectedBytes = copyBytes(sample);
  const wire = encode(sample);

  assert.deepEqual(decodeBase93(wire), expectedBytes);
  sameElements(decode(wire), sample);
});

test("binary-uint16Array decoder rejects odd decoded byte counts", () => {
  const { decode, encodeBase93 } = loadTsCodec();
  const corruptWire = encodeBase93(new Uint8Array([0x12, 0x34, 0x56]));
  assert.throws(() => decode(corruptWire), RangeError);
});

test("binary-uint16Array portable C++ wire interop matches TypeScript raw bytes", (t) => {
  const { encode } = loadTsCodec();
  const cpp = [
    "#include <cctype>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
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
    "    std::cout << encodeBinaryUint16ArrayStandalone(fromHex(payload));",
    "    return 0;",
    "  }",
    "  if (mode == \"decode\") {",
    "    std::cout << toHex(decodeBinaryUint16ArrayStandalone(payload));",
    "    return 0;",
    "  }",
    "  return 3;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "binary_uint16array_codec_cpp", cpp);
  if (!exe) return;

  const cases = [
    new Uint16Array([]),
    new Uint16Array([0x1234]),
    new Uint16Array([0x1234, 0xabcd, 0x00ff]),
    new Uint16Array([0xffff, 0x0000, 0x0102, 0xf0f1])
  ];

  for (const sample of cases) {
    const hex = bytesToHex(copyBytes(sample));
    const wire = encode(sample);

    assert.equal(runCppProgram(exe, `encode\n${hex}\n`).trim(), wire);
    assert.equal(runCppProgram(exe, `decode\n${wire}\n`).trim(), hex);
  }
});
