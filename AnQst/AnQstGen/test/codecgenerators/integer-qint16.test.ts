import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { encoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-qint16/encoder";
import { decoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-qint16/decoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

const QINT16_MIN = -32768;
const QINT16_MAX = 32767;

function buildTsCodec(): {
  encodeQint16Standalone: (value: number) => string;
  decodeQint16Standalone: (encoded: string) => number;
} {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeQint16Standalone, decodeQint16Standalone };"
  ].join("\n");

  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

test("integer-qint16 TS standalone round-trip: min/max/signed representatives", () => {
  const { encodeQint16Standalone: encode, decodeQint16Standalone: decode } = buildTsCodec();
  const values = [QINT16_MIN, -12345, -42, -1, 0, 1, 42, 12345, QINT16_MAX];

  for (const value of values) {
    const wire = encode(value);
    assert.equal(wire.length, 3, `2 raw bytes pack to 3 base93 characters (${value})`);
    assertBase93Alphabet(wire);
    assert.equal(decode(wire), value, `parity for ${value}`);
  }
});

test("integer-qint16 TS repeated encode/decode parity", () => {
  const { encodeQint16Standalone: encode, decodeQint16Standalone: decode } = buildTsCodec();

  for (const value of [QINT16_MIN, -1, 0, 1, QINT16_MAX]) {
    const wire1 = encode(value);
    const value2 = decode(wire1);
    const wire2 = encode(value2);
    const value3 = decode(wire2);

    assert.equal(value2, value);
    assert.equal(wire2, wire1, `stable wire for ${value}`);
    assert.equal(value3, value, `repeated parity for ${value}`);
  }
});

test("integer-qint16 portable C++ interoperability: TS and C++ agree both ways", (t) => {
  const { encodeQint16Standalone: encode, decodeQint16Standalone: decode } = buildTsCodec();
  const cppSource = [
    "#include <array>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    "",
    "using qint16 = std::int16_t;",
    "",
    emitBase93CppFunctions(),
    "",
    encoderEmitter.emitCppEncoder(),
    "",
    decoderEmitter.emitCppDecoder(),
    "",
    "int main() {",
    "  std::string mode;",
    "  std::string line;",
    "  if (!std::getline(std::cin, mode)) return 1;",
    "  if (!std::getline(std::cin, line)) return 2;",
    "  if (mode == \"encode\") {",
    "    const qint16 value = static_cast<qint16>(std::stoi(line));",
    "    std::cout << encodeQint16Standalone(value);",
    "    return 0;",
    "  }",
    "  if (mode == \"decode\") {",
    "    const qint16 value = decodeQint16Standalone(line);",
    "    std::cout << static_cast<int>(value);",
    "    return 0;",
    "  }",
    "  return 3;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "integer-qint16-codec", cppSource);
  if (!exe) return;

  for (const value of [QINT16_MIN, -12345, -42, -1, 0, 1, 42, 12345, QINT16_MAX]) {
    const tsWire = encode(value);
    assert.equal(runCppProgram(exe, `decode\n${tsWire}\n`).trim(), String(value), `C++ decode vs TS encode for ${value}`);

    const cppWire = runCppProgram(exe, `encode\n${value}\n`);
    assert.equal(cppWire.length, 3, `C++ wire width for ${value}`);
    assertBase93Alphabet(cppWire);
    assert.equal(decode(cppWire), value, `TS decode vs C++ encode for ${value}`);
  }
});
