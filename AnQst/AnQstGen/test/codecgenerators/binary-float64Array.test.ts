/**
 * Generator tests for the `binary-float64Array` base codec emitter.
 * Focus: raw-byte base93 parity, IEEE 754 special-value preservation, subview/offset safety,
 * corrupted non-multiple-of-8 rejection, and practical C++ wire interoperability.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { encoder } from "../../src/codecgenerators/basecodecemitters/binary-float64Array/encoder";
import { decoder } from "../../src/codecgenerators/basecodecemitters/binary-float64Array/decoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

function loadTsCodec(): {
  encode: (value: Float64Array) => string;
  decode: (encoded: string) => Float64Array;
  decodeBase93: (encoded: string) => Uint8Array;
  encodeBase93: (bytes: Uint8Array) => string;
} {
  const body = `
var base93Encode = ${emitBase93Encoder()};
var base93Decode = ${emitBase93Decoder()};
${encoder.emitTsEncoder()}
${decoder.emitTsDecoder()}
return {
  encode: encodeBinaryFloat64ArrayStandalone,
  decode: decodeBinaryFloat64ArrayStandalone,
  decodeBase93: base93Decode,
  encodeBase93: base93Encode
};
`;
  return new Function(body)() as ReturnType<typeof loadTsCodec>;
}

function viewBytes(value: Float64Array): Uint8Array {
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function copyBytes(value: Float64Array): Uint8Array {
  return Uint8Array.from(viewBytes(value));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function assertSameFloat64Array(actual: Float64Array, expected: Float64Array): void {
  assert.equal(actual.length, expected.length, "float64 length parity");
  for (let i = 0; i < expected.length; i++) {
    assert.ok(
      Object.is(actual[i], expected[i]),
      `Float64Array value mismatch at ${i}: expected ${String(expected[i])}, got ${String(actual[i])}`
    );
  }
}

test("binary-float64Array descriptor exports the spec-facing contract", () => {
  assert.equal(encoder.descriptor, decoder.descriptor);
  assert.equal(encoder.descriptor.codecId, "binary-float64Array");
  assert.equal(encoder.descriptor.specPath, "RefinedSpecs/Codecs/Binary_float64Array_Codec.md");
  assert.equal(encoder.descriptor.tsType, "Float64Array");
  assert.equal(encoder.descriptor.cppType, "QByteArray");
  assert.equal(encoder.descriptor.wireCategory, "binary");
});

test("binary-float64Array TypeScript codec round-trips representative float64 values and special cases", () => {
  const { encode, decode } = loadTsCodec();
  const cases = [
    new Float64Array([]),
    new Float64Array([0]),
    new Float64Array([-0]),
    new Float64Array([Number.NaN]),
    new Float64Array([Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]),
    new Float64Array([Math.PI, -Math.E, Number.MIN_VALUE, Number.MAX_VALUE]),
    new Float64Array([1.5, -2.25, 9007199254740991, -9007199254740991])
  ];

  for (const sample of cases) {
    const wire = encode(sample);
    assertBase93Alphabet(wire);

    const roundTrip = decode(wire);
    assertSameFloat64Array(roundTrip, sample);
    assert.deepEqual(copyBytes(roundTrip), copyBytes(sample), "raw byte parity");

    const wireAgain = encode(roundTrip);
    assert.equal(wireAgain, wire, "encode/decode parity on wire");
    assertSameFloat64Array(decode(wireAgain), sample);
  }
});

test("binary-float64Array preserves raw platform byte order on the wire", () => {
  const { encode, decode, decodeBase93 } = loadTsCodec();
  const sample = new Float64Array([Math.PI, -0, Number.POSITIVE_INFINITY, Number.NaN]);
  const expectedBytes = copyBytes(sample);

  const wire = encode(sample);
  const wireBytes = decodeBase93(wire);
  assert.deepEqual(wireBytes, expectedBytes);

  const roundTrip = decode(wire);
  assert.deepEqual(copyBytes(roundTrip), expectedBytes);
  assertSameFloat64Array(roundTrip, sample);
});

test("binary-float64Array encoder respects byteOffset and byteLength for subviews", () => {
  const { encode, decode, decodeBase93, encodeBase93 } = loadTsCodec();
  const backing = new Float64Array([111.25, Math.PI, -0, Number.NEGATIVE_INFINITY]);
  const sample = new Float64Array(backing.buffer, 8, 2);
  const expectedBytes = copyBytes(sample);
  const wire = encode(sample);

  assert.equal(wire, encodeBase93(new Uint8Array(sample.buffer, sample.byteOffset, sample.byteLength)));
  assert.notEqual(wire, encodeBase93(new Uint8Array(sample.buffer)), "must not encode bytes outside the active view window");
  assert.deepEqual(decodeBase93(wire), expectedBytes);
  assertSameFloat64Array(decode(wire), sample);
});

test("binary-float64Array decoder rejects decoded byte counts not divisible by 8", () => {
  const { decode, encodeBase93 } = loadTsCodec();
  const corruptWire = encodeBase93(new Uint8Array([0, 1, 2, 3, 4, 5, 6]));
  assert.throws(() => decode(corruptWire), RangeError);
});

test("binary-float64Array portable C++ wire interop matches TypeScript raw bytes", (t) => {
  const { encode, decode } = loadTsCodec();
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
    "    std::cout << encodeBinaryFloat64ArrayStandalone(fromHex(payload));",
    "    return 0;",
    "  }",
    "  if (mode == \"decode\") {",
    "    std::cout << toHex(decodeBinaryFloat64ArrayStandalone(payload));",
    "    return 0;",
    "  }",
    "  return 3;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "binary_float64array_codec_cpp", cpp);
  if (!exe) return;

  const cases = [
    new Float64Array([]),
    new Float64Array([Math.PI]),
    new Float64Array([-0, Number.POSITIVE_INFINITY]),
    new Float64Array([Number.NaN, -1.25, Number.MIN_VALUE, Number.MAX_VALUE])
  ];

  for (const sample of cases) {
    const hex = bytesToHex(copyBytes(sample));
    const wire = encode(sample);

    assert.equal(runCppProgram(exe, `encode\n${hex}\n`), wire);
    assert.equal(runCppProgram(exe, `decode\n${wire}\n`), hex);
    assertSameFloat64Array(decode(wire), sample);
  }
});
