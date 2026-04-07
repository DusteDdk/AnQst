import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { descriptor, encoderEmitter } from "../../src/codecgenerators/basecodecemitters/binary-blob/encoder";
import { decoderEmitter } from "../../src/codecgenerators/basecodecemitters/binary-blob/decoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

function buildTsCodec(): {
  encodeBinaryBlobStandalone: (value: ArrayBuffer) => string;
  decodeBinaryBlobStandalone: (wire: string) => ArrayBuffer;
} {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeBinaryBlobStandalone, decodeBinaryBlobStandalone };"
  ].join("\n");
  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

function toArrayBuffer(bytes: number[]): ArrayBuffer {
  return Uint8Array.from(bytes).buffer.slice(0);
}

function toBytes(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const REPRESENTATIVE_CASES = [
  [],
  [0],
  [0, 1, 2, 3],
  [255, 128, 64, 32, 16],
  [0, 255, 17, 34, 51, 68, 85, 102, 119]
] satisfies number[][];

test("binary-blob descriptor stays distinct while matching buffer wire strategy", () => {
  assert.equal(descriptor.codecId, "binary-blob");
  assert.equal(descriptor.specPath, "RefinedSpecs/Codecs/Binary_blob_Codec.md");
  assert.equal(descriptor.tsType, "ArrayBuffer");
  assert.equal(descriptor.cppType, "QByteArray");
  assert.equal(descriptor.wireCategory, "binary");
  assert.match(descriptor.strategySummary, /wire-identical to buffer/i);
});

test("binary-blob standalone: empty ArrayBuffer encodes as empty string", () => {
  const { encodeBinaryBlobStandalone, decodeBinaryBlobStandalone } = buildTsCodec();
  const wire = encodeBinaryBlobStandalone(new ArrayBuffer(0));
  assert.equal(wire, "");
  assert.deepEqual(toBytes(decodeBinaryBlobStandalone(wire)), new Uint8Array([]));
});

test("binary-blob standalone: representative bytes round-trip with direct base93 parity", () => {
  const { encodeBinaryBlobStandalone, decodeBinaryBlobStandalone } = buildTsCodec();
  const directBase93Encode = new Function(`return (${emitBase93Encoder()});`)() as (value: Uint8Array) => string;

  for (const sample of REPRESENTATIVE_CASES) {
    const bytes = Uint8Array.from(sample);
    const wire = encodeBinaryBlobStandalone(toArrayBuffer(sample));
    assert.equal(wire, directBase93Encode(bytes), `wire parity for [${sample.join(",")}]`);
    assertBase93Alphabet(wire);

    const roundTrip = toBytes(decodeBinaryBlobStandalone(wire));
    assert.deepEqual(roundTrip, bytes, `decoded bytes for [${sample.join(",")}]`);
    assert.equal(
      encodeBinaryBlobStandalone(decodeBinaryBlobStandalone(wire)),
      wire,
      `encode/decode parity for [${sample.join(",")}]`
    );
  }
});

test("binary-blob emitted codec interoperates with portable C++ QByteArray shim", (t) => {
  const { encodeBinaryBlobStandalone } = buildTsCodec();
  const cpp = [
    "#include <cstdint>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    "",
    "class QByteArray {",
    "public:",
    "  QByteArray() = default;",
    "  QByteArray(const char* data, int size) {",
    "    if (size > 0) bytes_.assign(data, data + size);",
    "  }",
    "  const char* constData() const {",
    "    return bytes_.empty() ? \"\" : bytes_.data();",
    "  }",
    "  int size() const {",
    "    return static_cast<int>(bytes_.size());",
    "  }",
    "private:",
    "  std::vector<char> bytes_;",
    "};",
    "",
    "static QByteArray makeQByteArray(const std::vector<std::uint8_t>& bytes) {",
    "  return QByteArray(",
    "    reinterpret_cast<const char*>(bytes.empty() ? nullptr : bytes.data()),",
    "    static_cast<int>(bytes.size())",
    "  );",
    "}",
    "",
    "static bool sameBytes(const QByteArray& value, const std::vector<std::uint8_t>& expected) {",
    "  if (value.size() != static_cast<int>(expected.size())) return false;",
    "  const std::uint8_t* data = reinterpret_cast<const std::uint8_t*>(value.constData());",
    "  for (std::size_t i = 0; i < expected.size(); ++i) {",
    "    if (data[i] != expected[i]) return false;",
    "  }",
    "  return true;",
    "}",
    "",
    emitBase93CppFunctions(),
    "",
    encoderEmitter.emitCppEncoder(),
    "",
    decoderEmitter.emitCppDecoder(),
    "",
    "int main() {",
    "  const std::vector<std::vector<std::uint8_t>> samples = {",
    "    {},",
    "    {0},",
    "    {0, 1, 2, 3},",
    "    {255, 128, 64, 32, 16},",
    "    {0, 255, 17, 34, 51, 68, 85, 102, 119}",
    "  };",
    "  for (const auto& sample : samples) {",
    "    const QByteArray value = makeQByteArray(sample);",
    "    const std::string wire = encodeBinaryBlobStandalone(value);",
    "    std::cout << wire << '\\n';",
    "    const QByteArray roundTrip = decodeBinaryBlobStandalone(wire);",
    "    if (!sameBytes(roundTrip, sample)) return 1;",
    "  }",
    "  return 0;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "binary_blob_codec_portable_cpp", cpp);
  if (!exe) return;

  const output = runCppProgram(exe).replace(/\r\n/g, "\n").trimEnd().split("\n");
  const expected = REPRESENTATIVE_CASES.map((sample) => encodeBinaryBlobStandalone(toArrayBuffer(sample)));
  assert.deepEqual(output, expected);
});

test("binary-blob TypeScript wire decodes to identical bytes in portable C++", (t) => {
  const { encodeBinaryBlobStandalone } = buildTsCodec();
  const cpp = [
    "#include <cstdint>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    "",
    "class QByteArray {",
    "public:",
    "  QByteArray() = default;",
    "  QByteArray(const char* data, int size) {",
    "    if (size > 0) bytes_.assign(data, data + size);",
    "  }",
    "  const char* constData() const {",
    "    return bytes_.empty() ? \"\" : bytes_.data();",
    "  }",
    "  int size() const {",
    "    return static_cast<int>(bytes_.size());",
    "  }",
    "private:",
    "  std::vector<char> bytes_;",
    "};",
    "",
    emitBase93CppFunctions(),
    "",
    decoderEmitter.emitCppDecoder(),
    "",
    "int main() {",
    "  std::string wire;",
    "  if (!std::getline(std::cin, wire)) return 1;",
    "  const QByteArray value = decodeBinaryBlobStandalone(wire);",
    "  const std::uint8_t* data = reinterpret_cast<const std::uint8_t*>(value.constData());",
    "  for (int i = 0; i < value.size(); ++i) {",
    "    if (i) std::cout << ',';",
    "    std::cout << static_cast<unsigned>(data[i]);",
    "  }",
    "  return 0;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "binary_blob_codec_ts_to_cpp", cpp);
  if (!exe) return;

  for (const sample of REPRESENTATIVE_CASES) {
    const wire = encodeBinaryBlobStandalone(toArrayBuffer(sample));
    const decodedCsv: string = runCppProgram(exe, `${wire}\n`).trim();
    const expected = toHex(Uint8Array.from(sample));
    const actualHex: string =
      decodedCsv === ""
        ? ""
        : toHex(Uint8Array.from(decodedCsv.split(",").map((part: string) => Number(part))));
    assert.equal(actualHex, expected, `TS -> C++ bytes for [${sample.join(",")}]`);
  }
});
