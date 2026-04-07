import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { binaryInt8ArrayDecoderEmitter, descriptor as decoderDescriptor } from "../../src/codecgenerators/basecodecemitters/binary-int8Array/decoder";
import { binaryInt8ArrayEncoderEmitter, descriptor } from "../../src/codecgenerators/basecodecemitters/binary-int8Array/encoder";
import {
  assertBase93Alphabet,
  compileCppProgram,
  evalEmittedFunction,
  runCppProgram
} from "./helpers/emitted-code";

function loadTsBinaryInt8ArrayCodec(): {
  encode: (value: Int8Array) => string;
  decode: (wire: string) => Int8Array;
} {
  const body = `
var base93Encode = ${emitBase93Encoder()};
var base93Decode = ${emitBase93Decoder()};
${binaryInt8ArrayEncoderEmitter.emitTsEncoder()}
${binaryInt8ArrayDecoderEmitter.emitTsDecoder()}
return {
  encode: encodeAnQstBinaryInt8Array,
  decode: decodeAnQstBinaryInt8Array
};
`;
  return new Function(body)() as {
    encode: (value: Int8Array) => string;
    decode: (wire: string) => Int8Array;
  };
}

function asRawBytes(value: Int8Array): Uint8Array {
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function toSignedList(value: Int8Array): number[] {
  return Array.from(value);
}

test("binary-int8Array base codec: descriptor stays aligned across encoder and decoder", () => {
  assert.equal(descriptor.codecId, "AnQst.Type.int8Array");
  assert.equal(descriptor.specPath, "RefinedSpecs/Codecs/Binary_int8Array_Codec.md");
  assert.equal(descriptor.tsType, "Int8Array");
  assert.equal(descriptor.cppType, "QByteArray");
  assert.equal(descriptor.wireCategory, "binary");
  assert.equal(decoderDescriptor, descriptor);
  assert.equal(binaryInt8ArrayEncoderEmitter.descriptor, descriptor);
  assert.equal(binaryInt8ArrayDecoderEmitter.descriptor, descriptor);
});

test("binary-int8Array base codec: TypeScript wire parity and round-trip", () => {
  const { encode, decode } = loadTsBinaryInt8ArrayCodec();
  const encodeBase93 = evalEmittedFunction<(value: Uint8Array) => string>(emitBase93Encoder());
  const cases = [
    new Int8Array([]),
    new Int8Array([0]),
    new Int8Array([-1]),
    new Int8Array([-128, -1, 0, 1, 127]),
    new Int8Array([-5, 12, -64, 90, -91, 33, -7])
  ];

  for (const value of cases) {
    const wire = encode(value);
    const decoded = decode(wire);
    const expectedWire = encodeBase93(asRawBytes(value));
    assertBase93Alphabet(wire);
    assert.equal(wire, expectedWire, `wire parity for [${toSignedList(value).join(",")}]`);
    assert.deepEqual(toSignedList(decoded), toSignedList(value));
    assert.equal(encode(decoded), wire, "encode/decode parity on wire string");
  }
});

test("binary-int8Array base codec: negative-byte patterns preserve exact signed values", () => {
  const { encode, decode } = loadTsBinaryInt8ArrayCodec();
  const patterns = [
    new Int8Array([-1, -1, -1, -1]),
    new Int8Array([-128, -127, -64, -32, -16, -8, -4, -2, -1]),
    new Int8Array([-128, 127, -1, 1, -64, 64, -32, 32])
  ];

  for (const value of patterns) {
    const wire = encode(value);
    const decoded = decode(wire);
    assert.deepEqual(toSignedList(decoded), toSignedList(value));
    assert.deepEqual(Array.from(asRawBytes(decoded)), Array.from(asRawBytes(value)));
  }
});

test("binary-int8Array base codec: non-zero byteOffset encodes only the active Int8Array view", () => {
  const { encode, decode } = loadTsBinaryInt8ArrayCodec();
  const backing = new Int8Array([-99, -88, -77, -66, -55, -44, -33, -22, -11]);
  const view = new Int8Array(backing.buffer, 2, 4);
  const encodeBase93 = evalEmittedFunction<(value: Uint8Array) => string>(emitBase93Encoder());

  assert.deepEqual(toSignedList(view), [-77, -66, -55, -44]);

  const wire = encode(view);
  const expected = encodeBase93(new Uint8Array([179, 190, 201, 212]));
  const decoded = decode(wire);

  assert.equal(wire, expected);
  assert.notEqual(wire, encode(backing), "view encoding must exclude bytes outside the slice");
  assert.deepEqual(toSignedList(decoded), toSignedList(view));
});

test("binary-int8Array base codec: TypeScript and portable C++ agree on wire bytes", (t) => {
  const { encode } = loadTsBinaryInt8ArrayCodec();
  const cpp = [
    "#include <cstdint>",
    "#include <iostream>",
    "#include <sstream>",
    "#include <string>",
    "#include <vector>",
    "",
    emitBase93CppFunctions(),
    "",
    "inline std::string encodePortableInt8Array(const std::vector<std::int8_t>& value) {",
    "  std::vector<std::uint8_t> bytes;",
    "  bytes.reserve(value.size());",
    "  for (std::int8_t v : value) bytes.push_back(static_cast<std::uint8_t>(v));",
    "  return base93Encode(bytes);",
    "}",
    "",
    "inline std::vector<std::int8_t> decodePortableInt8Array(const std::string& encoded) {",
    "  const std::vector<std::uint8_t> bytes = base93Decode(encoded);",
    "  std::vector<std::int8_t> out;",
    "  out.reserve(bytes.size());",
    "  for (std::uint8_t v : bytes) out.push_back(static_cast<std::int8_t>(v));",
    "  return out;",
    "}",
    "",
    "int main() {",
    "  std::string mode;",
    "  if (!std::getline(std::cin, mode)) return 1;",
    "  if (mode == \"encode\") {",
    "    std::string line;",
    "    if (!std::getline(std::cin, line)) return 2;",
    "    std::istringstream in(line);",
    "    std::vector<std::int8_t> values;",
    "    int temp = 0;",
    "    while (in >> temp) values.push_back(static_cast<std::int8_t>(temp));",
    "    std::cout << encodePortableInt8Array(values);",
    "    return 0;",
    "  }",
    "  if (mode == \"decode\") {",
    "    std::string wire;",
    "    if (!std::getline(std::cin, wire)) return 3;",
    "    const std::vector<std::int8_t> values = decodePortableInt8Array(wire);",
    "    for (std::size_t i = 0; i < values.size(); ++i) {",
    "      if (i) std::cout << ',';",
    "      std::cout << static_cast<int>(values[i]);",
    "    }",
    "    return 0;",
    "  }",
    "  return 4;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "binary_int8array_codec_cpp_rt", cpp);
  if (!exe) return;

  const cases = [
    new Int8Array([]),
    new Int8Array([-128, -1, 0, 1, 127]),
    new Int8Array([-5, 12, -64, 90, -91, 33, -7])
  ];

  for (const value of cases) {
    const wire = encode(value);
    const expectedCsv = toSignedList(value).join(",");
    const encodedByCpp = runCppProgram(exe, `encode\n${toSignedList(value).join(" ")}\n`).trim();
    const decodedByCpp = runCppProgram(exe, `decode\n${wire}\n`).trim();

    assert.equal(encodedByCpp, wire, `portable C++ encode parity for [${expectedCsv}]`);
    assert.equal(decodedByCpp, expectedCsv, `portable C++ decode parity for [${expectedCsv}]`);
  }
});
