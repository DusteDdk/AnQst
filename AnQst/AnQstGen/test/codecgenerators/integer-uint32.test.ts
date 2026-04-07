/**
 * Focused tests for the `integer-uint32` base codec emitter.
 *
 * Covers descriptor distinction from `quint32`, fixed-width 5-character base93
 * parity for representative unsigned values, repeated wire stability, and
 * portable C++ interoperability for the standalone `uint32_t` wire format.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { decoder, decoderEmitter, descriptor } from "../../src/codecgenerators/basecodecemitters/integer-uint32/decoder";
import { encoder, encoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-uint32/encoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

const UINT32_MAX = 4294967295;

function buildTsCodec(): {
  encodeUint32Standalone: (value: number) => string;
  decodeUint32Standalone: (encoded: string) => number;
} {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoder.emitTsEncoder(),
    decoder.emitTsDecoder(),
    "return { encodeUint32Standalone, decodeUint32Standalone };"
  ].join("\n");

  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

function encodeUint32Bytes(value: number): string {
  const encodeBytes = new Function(`return (${emitBase93Encoder()});`)() as (bytes: Uint8Array) => string;
  const buf = new ArrayBuffer(4);
  new Uint32Array(buf)[0] = value;
  return encodeBytes(new Uint8Array(buf));
}

test("integer-uint32 descriptor stays distinct while keeping quint32-identical wire metadata", () => {
  assert.equal(descriptor.codecId, "AnQst.Type.uint32");
  assert.equal(descriptor.specPath, "RefinedSpecs/Codecs/Integer_uint32_Codec.md");
  assert.equal(descriptor.tsType, "number");
  assert.equal(descriptor.cppType, "uint32_t");
  assert.equal(descriptor.wireCategory, "fixed-width-scalar");
  assert.deepEqual(descriptor.fixedWidth, {
    byteWidth: 4,
    tsViewCtor: "Uint32Array",
    cppType: "uint32_t"
  });
  assert.match(descriptor.strategySummary, /wire-identical to quint32/i);
  assert.notEqual(descriptor.cppType, "quint32");
});

test("integer-uint32 TS standalone round-trips representative unsigned values as 5-char base93", () => {
  const { encodeUint32Standalone: encode, decodeUint32Standalone: decode } = buildTsCodec();
  const values = [0, 1, 2, 42, 92, 93, 255, 256, 65535, 65536, 2147483647, 2147483648, UINT32_MAX];

  for (const value of values) {
    const wire = encode(value);
    assert.equal(wire.length, 5, `4 raw bytes pack to 5 base93 characters (${value})`);
    assertBase93Alphabet(wire);
    assert.equal(decode(wire), value, `parity for ${value}`);
  }
});

test("integer-uint32 TS wire matches raw Uint32Array bytes and repeated parity stays stable", () => {
  const { encodeUint32Standalone: encode, decodeUint32Standalone: decode } = buildTsCodec();
  const samples = [0, 1, 17, 93, 255, 65535, 65536, 2147483648, UINT32_MAX];

  for (const value of samples) {
    const wire1 = encode(value);
    const wire2 = encodeUint32Bytes(value);
    const value2 = decode(wire1);
    const wire3 = encode(value2);

    assert.equal(wire1, wire2, `wire-identical raw uint32 bytes for ${value}`);
    assert.equal(value2, value, `decode parity for ${value}`);
    assert.equal(wire3, wire1, `re-encode parity for ${value}`);
  }
});

test("integer-uint32 emitted helpers include top block comments and uint32_t mapping", () => {
  assert.match(encoderEmitter.emitTsEncoder(), /^\/\*\*/);
  assert.match(decoderEmitter.emitTsDecoder(), /^\/\*\*/);
  assert.match(encoderEmitter.emitCppEncoder(), /^\/\*\*/);
  assert.match(decoderEmitter.emitCppDecoder(), /^\/\*\*/);
  assert.match(encoderEmitter.emitCppEncoder(), /uint32_t/);
  assert.match(decoderEmitter.emitCppDecoder(), /uint32_t/);
});

test("integer-uint32 portable C++ interoperability: TS and C++ agree both ways", (t) => {
  const { encodeUint32Standalone: encode, decodeUint32Standalone: decode } = buildTsCodec();
  const values = [0, 1, 42, 255, 65535, 65536, 2147483648, UINT32_MAX];

  const cppSource = [
    "#include <array>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
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
    "    const uint32_t value = static_cast<uint32_t>(std::stoull(line));",
    "    std::cout << encodeUint32Standalone(value);",
    "    return 0;",
    "  }",
    "  if (mode == \"decode\") {",
    "    const uint32_t value = decodeUint32Standalone(line);",
    "    std::cout << value;",
    "    return 0;",
    "  }",
    "  return 3;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "integer-uint32-codec", cppSource);
  if (!exe) return;

  for (const value of values) {
    const tsWire = encode(value);
    assert.equal(runCppProgram(exe, `decode\n${tsWire}\n`).trim(), String(value), `C++ decode vs TS encode for ${value}`);

    const cppWire = runCppProgram(exe, `encode\n${value}\n`);
    assert.equal(cppWire.length, 5, `C++ wire width for ${value}`);
    assertBase93Alphabet(cppWire);
    assert.equal(decode(cppWire), value, `TS decode vs C++ encode for ${value}`);
  }
});
