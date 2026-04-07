import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { descriptor as encoderDescriptor, encoder } from "../../src/codecgenerators/basecodecemitters/binary-buffer/encoder";
import { descriptor as decoderDescriptor, decoder } from "../../src/codecgenerators/basecodecemitters/binary-buffer/decoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

function buildTsBufferCodec(): {
  encode: (value: ArrayBuffer) => string;
  decode: (encoded: string) => ArrayBuffer;
} {
  const program = [
    `var base93Encode = ${emitBase93Encoder()};`,
    `var base93Decode = ${emitBase93Decoder()};`,
    encoder.emitTsEncoder(),
    decoder.emitTsDecoder(),
    "return { encode: encodeAnqstBase_buffer, decode: decodeAnqstBase_buffer };"
  ].join("\n");
  return new Function(program)() as {
    encode: (value: ArrayBuffer) => string;
    decode: (encoded: string) => ArrayBuffer;
  };
}

function bytesToBuffer(bytes: number[]): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function bufferToBytes(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(bufferToBytes(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

test("binary-buffer descriptor is shared and classified as binary wire", () => {
  assert.deepEqual(encoderDescriptor, decoderDescriptor);
  assert.equal(encoderDescriptor.codecId, "AnQst.Type.buffer");
  assert.equal(encoderDescriptor.specPath, "RefinedSpecs/Codecs/Binary_buffer_Codec.md");
  assert.equal(encoderDescriptor.tsType, "ArrayBuffer");
  assert.equal(encoderDescriptor.cppType, "QByteArray");
  assert.equal(encoderDescriptor.wireCategory, "binary");
  assert.ok(!encoderDescriptor.fixedWidth);
});

test("binary-buffer TS codec handles the empty buffer as an empty standalone string", () => {
  const { encode, decode } = buildTsBufferCodec();
  const wire = encode(new ArrayBuffer(0));
  assert.equal(wire, "");
  assert.equal(decode(wire).byteLength, 0);
});

test("binary-buffer TS codec round-trips representative raw bytes with base93 alphabet validity", () => {
  const { encode, decode } = buildTsBufferCodec();
  const samples: number[][] = [
    [0x00],
    [0xff],
    [0x00, 0x01, 0x02],
    [0x00, 0x01, 0x02, 0x03],
    [0x00, 0x01, 0x02, 0x03, 0x04],
    [0xff, 0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]
  ];

  for (const sample of samples) {
    const wire = encode(bytesToBuffer(sample));
    assertBase93Alphabet(wire);
    assert.deepEqual(Array.from(bufferToBytes(decode(wire))), sample);
  }
});

test("binary-buffer TS codec stays stable across repeated encode/decode cycles", () => {
  const { encode, decode } = buildTsBufferCodec();
  const original = bytesToBuffer([0xde, 0xad, 0xbe, 0xef, 0x00, 0x7f, 0x80, 0xff, 0x11]);
  const wire = encode(original);
  let current = decode(wire);

  for (let i = 0; i < 5; i++) {
    current = decode(encode(current));
  }

  assert.equal(encode(current), wire);
  assert.deepEqual(Array.from(bufferToBytes(current)), Array.from(bufferToBytes(original)));
});

test("binary-buffer portable C++ helpers interoperate with TypeScript wire strings", (t) => {
  const cpp = [
    "#include <cstddef>",
    "#include <cstdint>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    "",
    "using QByteArray = std::vector<std::uint8_t>;",
    "",
    emitBase93CppFunctions(),
    "",
    encoder.emitCppEncoder(),
    "",
    decoder.emitCppDecoder(),
    "",
    "int hexNibble(char c) {",
    "  if (c >= '0' && c <= '9') return c - '0';",
    "  if (c >= 'a' && c <= 'f') return c - 'a' + 10;",
    "  if (c >= 'A' && c <= 'F') return c - 'A' + 10;",
    "  return -1;",
    "}",
    "",
    "QByteArray fromHex(const std::string& hex) {",
    "  QByteArray bytes;",
    "  bytes.reserve(hex.size() / 2);",
    "  for (std::size_t i = 0; i + 1 < hex.size(); i += 2) {",
    "    const int hi = hexNibble(hex[i]);",
    "    const int lo = hexNibble(hex[i + 1]);",
    "    bytes.push_back(static_cast<std::uint8_t>((hi << 4) | lo));",
    "  }",
    "  return bytes;",
    "}",
    "",
    "std::string toHex(const QByteArray& bytes) {",
    "  static constexpr char HEX[] = \"0123456789abcdef\";",
    "  std::string out;",
    "  out.reserve(bytes.size() * 2);",
    "  for (std::uint8_t byte : bytes) {",
    "    out.push_back(HEX[byte >> 4]);",
    "    out.push_back(HEX[byte & 0x0f]);",
    "  }",
    "  return out;",
    "}",
    "",
    "int main() {",
    "  std::string mode;",
    "  if (!std::getline(std::cin, mode)) return 1;",
    "  if (mode == \"encode\") {",
    "    std::string hex;",
    "    if (!std::getline(std::cin, hex)) return 2;",
    "    std::cout << encodeAnqstBase_buffer(fromHex(hex));",
    "    return 0;",
    "  }",
    "  if (mode == \"decode\") {",
    "    std::string wire;",
    "    if (!std::getline(std::cin, wire)) return 3;",
    "    std::cout << toHex(decodeAnqstBase_buffer(wire));",
    "    return 0;",
    "  }",
    "  return 4;",
    "}",
    ""
  ].join("\n");

  const exe = compileCppProgram(t, "binary_buffer_codec_cpp_interop", cpp);
  if (!exe) return;

  const { encode, decode } = buildTsBufferCodec();
  const samples: number[][] = [
    [],
    [0x00],
    [0x00, 0x01, 0x02, 0x03, 0x04],
    [0xde, 0xad, 0xbe, 0xef, 0xff, 0x7f, 0x00]
  ];

  for (const sample of samples) {
    const buffer = bytesToBuffer(sample);
    const tsWire = encode(buffer);
    const hex = bufferToHex(buffer);
    const cppWire = runCppProgram(exe, `encode\n${hex}\n`);
    assert.equal(cppWire, tsWire, `C++ encode parity for ${hex}`);

    const cppHex = runCppProgram(exe, `decode\n${tsWire}\n`);
    assert.equal(cppHex, hex, `C++ decode parity for ${hex}`);

    assert.deepEqual(Array.from(bufferToBytes(decode(cppWire))), sample, `TS decodes C++ wire for ${hex}`);
  }
});
