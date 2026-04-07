/**
 * Tests for the standalone `AnQst.Type.qint32` base codec emitters.
 *
 * These verify the fixed-width Int32Array/base93 contract, repeated parity, and
 * portable interoperability with the emitted C++ qint32 helpers.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { encoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-qint32/encoder";
import { decoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-qint32/decoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

const QINT32_MIN = -2147483648;
const QINT32_MAX = 2147483647;

function buildTsCodec(): {
  encodeQint32Standalone: (value: number) => string;
  decodeQint32Standalone: (encoded: string) => number;
} {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeQint32Standalone, decodeQint32Standalone };"
  ].join("\n");

  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

test("integer-qint32 TS standalone round-trip: min/max and signed representatives", () => {
  const { encodeQint32Standalone: encode, decodeQint32Standalone: decode } = buildTsCodec();
  const values = [QINT32_MIN, -2147483647, -1234567890, -1, 0, 1, 1234567890, QINT32_MAX];

  for (const value of values) {
    const wire = encode(value);
    assert.equal(wire.length, 5, `4 raw bytes pack to 5 base93 characters (${value})`);
    assertBase93Alphabet(wire);
    assert.equal(decode(wire), value, `parity for ${value}`);
  }
});

test("integer-qint32 TS repeated encode/decode parity", () => {
  const { encodeQint32Standalone: encode, decodeQint32Standalone: decode } = buildTsCodec();

  for (const value of [QINT32_MIN, -1, 0, 1, QINT32_MAX]) {
    const wire1 = encode(value);
    const value2 = decode(wire1);
    const wire2 = encode(value2);
    const value3 = decode(wire2);

    assert.equal(value2, value);
    assert.equal(wire2, wire1, `stable wire for ${value}`);
    assert.equal(value3, value, `repeated parity for ${value}`);
  }
});

test("integer-qint32 portable C++ interoperability: TS and C++ agree both ways", (t) => {
  const { encodeQint32Standalone: encode, decodeQint32Standalone: decode } = buildTsCodec();
  const cppSource = [
    "#include <array>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <limits>",
    "#include <string>",
    "#include <vector>",
    "",
    "using qint32 = std::int32_t;",
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
    "    const qint32 value = static_cast<qint32>(std::stoll(line));",
    "    std::cout << encodeQint32Standalone(value);",
    "    return 0;",
    "  }",
    "  if (mode == \"decode\") {",
    "    const qint32 value = decodeQint32Standalone(line);",
    "    std::cout << value;",
    "    return 0;",
    "  }",
    "  return 3;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "integer-qint32-codec", cppSource);
  if (!exe) return;

  for (const value of [QINT32_MIN, -1234567890, -1, 0, 1, 1234567890, QINT32_MAX]) {
    const tsWire = encode(value);
    assert.equal(runCppProgram(exe, `decode\n${tsWire}\n`).trim(), String(value), `C++ decode vs TS encode for ${value}`);

    const cppWire = runCppProgram(exe, `encode\n${value}\n`);
    assert.equal(cppWire.length, 5, `C++ wire width for ${value}`);
    assertBase93Alphabet(cppWire);
    assert.equal(decode(cppWire), value, `TS decode vs C++ encode for ${value}`);
  }
});
