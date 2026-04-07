import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93Decoder, emitBase93Encoder, emitBase93CppFunctions } from "../../src/base93";
import { encoderEmitter } from "../../src/codecgenerators/basecodecemitters/bigint-qint64/encoder";
import { decoderEmitter } from "../../src/codecgenerators/basecodecemitters/bigint-qint64/decoder";
import {
  assertBase93Alphabet,
  compileCppProgram,
  evalEmittedFunction,
  runCppProgram
} from "./helpers/emitted-code";

const QINT64_MIN = -9223372036854775808n;
const QINT64_MAX = 9223372036854775807n;

function buildTsCodec(): {
  encodeQint64Standalone: (value: bigint) => string;
  decodeQint64Standalone: (encoded: string) => bigint;
} {
  const base93EncodeAssign = `const base93Encode = ${emitBase93Encoder()};`;
  const base93DecodeAssign = `const base93Decode = ${emitBase93Decoder()};`;
  const source = [
    base93EncodeAssign,
    base93DecodeAssign,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeQint64Standalone, decodeQint64Standalone };"
  ].join("\n");
  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

test("qint64 standalone round-trip: edge and representative bigints", () => {
  const { encodeQint64Standalone, decodeQint64Standalone } = buildTsCodec();
  const values: bigint[] = [
    0n,
    -1n,
    1n,
    QINT64_MIN,
    QINT64_MAX,
    -9223372036854775807n,
    9223372036854775806n,
    42n,
    -1234567890123456789n
  ];

  for (const v of values) {
    const encoded = encodeQint64Standalone(v);
    assert.equal(encoded.length, 10, "8 raw bytes pack to 10 base93 characters");
    assertBase93Alphabet(encoded);
    const decoded = decodeQint64Standalone(encoded);
    assert.equal(decoded, v, `parity for ${v}`);
    assert.equal(decodeQint64Standalone(encodeQint64Standalone(decoded)), v, "repeated encode/decode parity");
  }
});

test("qint64 wire is not JSON-native: bigint cannot be stringified as JSON number", () => {
  assert.throws(() => JSON.stringify(0n), TypeError);
  const { encodeQint64Standalone } = buildTsCodec();
  const wire = encodeQint64Standalone(0n);
  const asJson = JSON.stringify(wire);
  assert.equal(typeof wire, "string");
  assert.ok(asJson.startsWith('"') && asJson.endsWith('"'), "payload is a JSON string literal, not a numeric token");
  assert.notEqual(asJson, "0");
});

test("C++ emitted qint64 codec matches TypeScript base93 string (native endian)", (t) => {
  const { encodeQint64Standalone } = buildTsCodec();

  const cpp = [
    "#include <array>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <limits>",
    "#include <string>",
    "#include <vector>",
    "",
    "using qint64 = std::int64_t;",
    "",
    emitBase93CppFunctions(),
    "",
    encoderEmitter.emitCppEncoder(),
    "",
    "int main() {",
    "  const qint64 samples[] = {",
    "    0,",
    "    -1,",
    "    (std::numeric_limits<qint64>::min)(),",
    "    (std::numeric_limits<qint64>::max)(),",
    "    42",
    "  };",
    "  for (qint64 v : samples) {",
    "    std::cout << encodeQint64Standalone(v) << '\\n';",
    "  }",
    "  return 0;",
    "}",
    ""
  ].join("\n");

  const exe = compileCppProgram(t, "qint64-standalone-encode", cpp);
  if (!exe) return;

  const raw = runCppProgram(exe).replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const expected = [0n, -1n, QINT64_MIN, QINT64_MAX, 42n].map((v) => encodeQint64Standalone(v));
  assert.deepEqual(lines, expected);
});
