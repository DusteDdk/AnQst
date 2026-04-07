import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { encoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-qint8/encoder";
import { decoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-qint8/decoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

const QINT8_MIN = -128;
const QINT8_MAX = 127;

function buildTsCodec(): {
  encodeQint8Standalone: (value: number) => string;
  decodeQint8Standalone: (encoded: string) => number;
} {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeQint8Standalone, decodeQint8Standalone };"
  ].join("\n");

  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

test("integer-qint8 TS standalone round-trip: min/max/negative/zero representatives", () => {
  const { encodeQint8Standalone: encode, decodeQint8Standalone: decode } = buildTsCodec();
  const values = [QINT8_MIN, -127, -42, -1, 0, 1, 42, QINT8_MAX];

  for (const value of values) {
    const wire = encode(value);
    assert.equal(wire.length, 2, `1 raw byte packs to 2 base93 characters (${value})`);
    assertBase93Alphabet(wire);
    assert.equal(decode(wire), value, `parity for ${value}`);
  }
});

test("integer-qint8 TS repeated encode/decode parity", () => {
  const { encodeQint8Standalone: encode, decodeQint8Standalone: decode } = buildTsCodec();

  for (const value of [QINT8_MIN, -1, 0, 1, QINT8_MAX]) {
    const wire1 = encode(value);
    const value2 = decode(wire1);
    const wire2 = encode(value2);
    const value3 = decode(wire2);

    assert.equal(value2, value);
    assert.equal(wire2, wire1, `stable wire for ${value}`);
    assert.equal(value3, value, `repeated parity for ${value}`);
  }
});

test("integer-qint8 portable C++ interoperability: TS and C++ agree both ways", (t) => {
  const { encodeQint8Standalone: encode, decodeQint8Standalone: decode } = buildTsCodec();
  const cppSource = [
    "#include <array>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    "",
    "using qint8 = std::int8_t;",
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
    "    const qint8 value = static_cast<qint8>(std::stoi(line));",
    "    std::cout << encodeQint8Standalone(value);",
    "    return 0;",
    "  }",
    "  if (mode == \"decode\") {",
    "    const qint8 value = decodeQint8Standalone(line);",
    "    std::cout << static_cast<int>(value);",
    "    return 0;",
    "  }",
    "  return 3;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "integer-qint8-codec", cppSource);
  if (!exe) return;

  for (const value of [QINT8_MIN, -42, -1, 0, 1, 42, QINT8_MAX]) {
    const tsWire = encode(value);
    assert.equal(runCppProgram(exe, `decode\n${tsWire}\n`).trim(), String(value), `C++ decode vs TS encode for ${value}`);

    const cppWire = runCppProgram(exe, `encode\n${value}\n`);
    assert.equal(cppWire.length, 2, `C++ wire width for ${value}`);
    assertBase93Alphabet(cppWire);
    assert.equal(decode(cppWire), value, `TS decode vs C++ encode for ${value}`);
  }
});
