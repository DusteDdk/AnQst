import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { numberEncoderEmitter } from "../../src/codecgenerators/basecodecemitters/number/encoder";
import { numberDecoderEmitter } from "../../src/codecgenerators/basecodecemitters/number/decoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

function loadTsNumberCodec(): { encode: (v: number) => string; decode: (s: string) => number } {
  const body = `
var base93Encode = ${emitBase93Encoder()};
var base93Decode = ${emitBase93Decoder()};
${numberEncoderEmitter.emitTsEncoder()}
${numberDecoderEmitter.emitTsDecoder()}
return { encode: encodeAnQstNumber, decode: decodeAnQstNumber };
`;
  return new Function(body)() as { encode: (v: number) => string; decode: (s: string) => number };
}

function doubleToLittleEndianHex(value: number): string {
  const b = new Uint8Array(new Float64Array([value]).buffer);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function sameNumber(a: number, b: number): void {
  if (Number.isNaN(a)) {
    assert.ok(Number.isNaN(b));
    return;
  }
  assert.equal(Object.is(a, -0), Object.is(b, -0), "signed zero mismatch");
  assert.equal(a, b);
}

test("number base codec: standalone wire is 10 base93 characters", () => {
  const { encode } = loadTsNumberCodec();
  assertBase93Alphabet(encode(0));
  assert.equal(encode(0).length, 10);
  assert.equal(encode(Math.PI).length, 10);
});

test("number base codec: IEEE specials and ±0 round-trip (TypeScript)", () => {
  const { encode, decode } = loadTsNumberCodec();
  const cases: number[] = [
    0,
    -0,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NaN,
    1.5,
    -Math.PI,
    2.2250738585072014e-308,
    1.7976931348623157e308
  ];

  for (const v of cases) {
    const wire = encode(v);
    const w = decode(wire);
    sameNumber(v, w);
    const again = encode(w);
    assert.equal(again, wire, "encode/decode parity on wire string");
    assert.equal(decode(again), decode(wire));
  }
});

test("number base codec: NaN payload preserved through encode/decode", () => {
  const { encode, decode } = loadTsNumberCodec();
  const buf = new ArrayBuffer(8);
  const u = new Uint8Array(buf);
  u[0] = 1;
  u[6] = 0xf8;
  u[7] = 0x7f;
  const quietNan = new Float64Array(buf)[0];
  const wire = encode(quietNan);
  const back = decode(wire);
  const u2 = new Uint8Array(new Float64Array([back]).buffer);
  assert.deepEqual(u2, u);
  assert.equal(encode(decode(wire)), wire);
});

test("number base codec: C++ encode/decode round-trip", (t) => {
  const cpp = [
    "#include <array>",
    "#include <cmath>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <limits>",
    "#include <string>",
    "#include <vector>",
    "",
    emitBase93CppFunctions(),
    "",
    numberEncoderEmitter.emitCppEncoder(),
    "",
    numberDecoderEmitter.emitCppDecoder(),
    "",
    "int main() {",
    "  const double values[] = {",
    "    0.0, -0.0, 1.5, -3.141592653589793,",
    "    2.2250738585072014e-308, 1.7976931348623157e308,",
    "    std::numeric_limits<double>::infinity(),",
    "    -std::numeric_limits<double>::infinity(),",
    "    std::numeric_limits<double>::quiet_NaN()",
    "  };",
    "  for (double v : values) {",
    "    const std::string s = encodeAnQstNumber(v);",
    "    if (s.size() != 10) return 1;",
    "    const double w = decodeAnQstNumber(s);",
    "    if (std::isnan(v)) {",
    "      if (!std::isnan(w)) return 2;",
    "    } else if (v == 0.0) {",
    "      if (w != 0.0 || std::signbit(v) != std::signbit(w)) return 3;",
    "    } else if (v != w) return 4;",
    "  }",
    "  std::cout << \"ok\";",
    "  return 0;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "number_codec_cpp_rt", cpp);
  if (!exe) return;
  assert.equal(runCppProgram(exe).trim(), "ok");
});

test("number base codec: TypeScript wire decodes to same bytes in C++", (t) => {
  const { encode } = loadTsNumberCodec();
  const cpp = [
    "#include <cmath>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iomanip>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    "",
    emitBase93CppFunctions(),
    "",
    numberDecoderEmitter.emitCppDecoder(),
    "",
    "int main() {",
    "  std::string line;",
    "  if (!std::getline(std::cin, line)) return 1;",
    "  if (line.size() != 10) return 2;",
    "  const double w = decodeAnQstNumber(line);",
    "  std::uint8_t bytes[8];",
    "  std::memcpy(bytes, &w, 8);",
    "  for (int i = 0; i < 8; ++i) {",
    "    std::cout << std::hex << std::setfill('0') << std::setw(2) << static_cast<unsigned>(bytes[i]);",
    "  }",
    "  return 0;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "number_codec_ts_to_cpp", cpp);
  if (!exe) return;

  for (const v of [0, -0, 1.25, -Math.PI, Number.MAX_VALUE]) {
    const wire = encode(v);
    const hex = runCppProgram(exe, `${wire}\n`).trim();
    assert.equal(hex, doubleToLittleEndianHex(v), `TS→C++ bytes for ${v}`);
  }
});
