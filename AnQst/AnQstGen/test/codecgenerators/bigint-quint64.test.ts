import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93Decoder, emitBase93Encoder, emitBase93CppFunctions } from "../../src/base93";
import { encoder } from "../../src/codecgenerators/basecodecemitters/bigint-quint64/encoder";
import { decoder } from "../../src/codecgenerators/basecodecemitters/bigint-quint64/decoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

const MAX_UINT64 = 18446744073709551615n;

function buildTsCodec(): {
  encodeQuint64Standalone: (value: bigint) => string;
  decodeQuint64Standalone: (encoded: string) => bigint;
} {
  const base93EncodeAssign = `const base93Encode = ${emitBase93Encoder()};`;
  const base93DecodeAssign = `const base93Decode = ${emitBase93Decoder()};`;
  const source = [
    base93EncodeAssign,
    base93DecodeAssign,
    encoder.emitTsEncoder(),
    decoder.emitTsDecoder(),
    "return { encodeQuint64Standalone, decodeQuint64Standalone };"
  ].join("\n");
  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

test("bigint-quint64 TS standalone round-trip: 0, 1, max, representatives", () => {
  const { encodeQuint64Standalone: encode, decodeQuint64Standalone: decode } = buildTsCodec();
  const values = [
    0n,
    1n,
    255n,
    65535n,
    4294967295n,
    4294967296n,
    9223372036854775807n,
    9223372036854775808n,
    MAX_UINT64
  ];

  for (const value of values) {
    const encoded = encode(value);
    assert.equal(encoded.length, 10, `length 10 for 8 bytes (value ${value})`);
    assertBase93Alphabet(encoded);
    assert.equal(decode(encoded), value, `parity for ${value}`);
  }
});

test("bigint-quint64 TS repeated encode/decode parity", () => {
  const { encodeQuint64Standalone: encode, decodeQuint64Standalone: decode } = buildTsCodec();
  const samples = [0n, 1n, 0x123456789abcdef0n, MAX_UINT64];

  for (const value of samples) {
    const once = encode(value);
    const twice = encode(value);
    assert.equal(once, twice, "encode is deterministic");
    assert.equal(decode(once), value);
    assert.equal(decode(once), decode(twice), "decode is deterministic");
  }
});

test("bigint-quint64 C++ decode matches TS encode (interoperability)", (t) => {
  const { encodeQuint64Standalone: encode } = buildTsCodec();
  const cppSource = [
    "#include <array>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    'using quint64 = std::uint64_t;',
    emitBase93CppFunctions(),
    decoder.emitCppDecoder(),
    "int main() {",
    "  std::string line;",
    "  std::getline(std::cin, line);",
    "  const quint64 v = decodeQuint64Standalone(line);",
    "  std::cout << v;",
    "  return 0;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "quint64-decode", cppSource);
  if (!exe) return;

  for (const value of [0n, 1n, MAX_UINT64, 0xdeadbeefcafef00dn]) {
    const encoded = encode(value);
    const out = runCppProgram(exe, `${encoded}\n`);
    assert.equal(BigInt(out.trim()), value, `C++ decode vs TS encode for ${value}`);
  }
});

test("bigint-quint64 C++ encode matches TS decode (interoperability)", (t) => {
  const { decodeQuint64Standalone: decode } = buildTsCodec();
  const cppSource = [
    "#include <array>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    'using quint64 = std::uint64_t;',
    emitBase93CppFunctions(),
    encoder.emitCppEncoder(),
    "int main() {",
    "  std::string line;",
    "  std::getline(std::cin, line);",
    "  const quint64 v = static_cast<quint64>(std::stoull(line));",
    "  std::cout << encodeQuint64Standalone(v);",
    "  return 0;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "quint64-encode", cppSource);
  if (!exe) return;

  const stripTrailingNewline = (s: string): string => s.replace(/\r?\n$/, "");

  for (const value of [0n, 1n, 4294967295n]) {
    const out = stripTrailingNewline(runCppProgram(exe, `${value.toString()}\n`));
    assertBase93Alphabet(out);
    assert.equal(decode(out), value, `TS decode vs C++ encode for ${value}`);
  }

  const outMax = stripTrailingNewline(runCppProgram(exe, "18446744073709551615\n"));
  assert.equal(decode(outMax), MAX_UINT64);
});
