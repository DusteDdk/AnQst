/**
 * Focused tests for the `integer-uint16` base codec emitter.
 * Covers descriptor distinction from quint16, 3-character fixed-width base93
 * parity for representative unsigned values, and portable C++ interoperability.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { decoderEmitter, descriptor } from "../../src/codecgenerators/basecodecemitters/integer-uint16/decoder";
import { encoderEmitter } from "../../src/codecgenerators/basecodecemitters/integer-uint16/encoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

function buildTsCodec(): {
  encodeUint16Standalone: (value: number) => string;
  decodeUint16Standalone: (encoded: string) => number;
  encodeBytes: (bytes: Uint8Array) => string;
} {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeUint16Standalone, decodeUint16Standalone, encodeBytes: base93Encode };"
  ].join("\n");

  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

function uint16Bytes(value: number): Uint8Array {
  return new Uint8Array(new Uint16Array([value]).buffer);
}

test("integer-uint16 descriptor stays distinct while keeping quint16-identical wire metadata", () => {
  assert.equal(descriptor.codecId, "AnQst.Type.uint16");
  assert.equal(descriptor.specPath, "RefinedSpecs/Codecs/Integer_uint16_Codec.md");
  assert.equal(descriptor.tsType, "number");
  assert.equal(descriptor.cppType, "uint16_t");
  assert.equal(descriptor.wireCategory, "fixed-width-scalar");
  assert.deepEqual(descriptor.fixedWidth, {
    byteWidth: 2,
    tsViewCtor: "Uint16Array",
    cppType: "uint16_t"
  });
  assert.match(descriptor.strategySummary, /wire-identical to quint16/i);
  assert.notEqual(descriptor.cppType, "quint16");
});

test("integer-uint16 TS codec round-trips representative unsigned values as 3-char base93", () => {
  const { encodeUint16Standalone: encode, decodeUint16Standalone: decode } = buildTsCodec();
  const values = [0, 1, 2, 42, 92, 93, 255, 256, 4660, 32768, 65534, 65535];

  for (const value of values) {
    const wire = encode(value);
    assert.equal(wire.length, 3, `2 raw bytes pack to 3 base93 characters (${value})`);
    assertBase93Alphabet(wire);
    assert.equal(decode(wire), value, `parity for ${value}`);
  }
});

test("integer-uint16 TS wire matches raw Uint16Array bytes and remains parity-stable", () => {
  const { encodeUint16Standalone: encode, decodeUint16Standalone: decode, encodeBytes } = buildTsCodec();

  for (const value of [0, 1, 255, 256, 0x1234, 0xabcd, 0xfffe, 0xffff]) {
    const wire = encode(value);
    const expectedWire = encodeBytes(uint16Bytes(value));
    assert.equal(wire, expectedWire, `wire-identical Uint16Array bytes for ${value}`);

    const value2 = decode(wire);
    const wire2 = encode(value2);
    assert.equal(value2, value, `decode parity for ${value}`);
    assert.equal(wire2, wire, `re-encode parity for ${value}`);
  }
});

test("integer-uint16 emitted helpers include top block comments", () => {
  assert.match(encoderEmitter.emitTsEncoder(), /^\/\*\*/);
  assert.match(decoderEmitter.emitTsDecoder(), /^\/\*\*/);
  assert.match(encoderEmitter.emitCppEncoder(), /^\/\*\*/);
  assert.match(decoderEmitter.emitCppDecoder(), /^\/\*\*/);
});

test("integer-uint16 portable C++ interoperability matches TypeScript both ways", (t) => {
  const { encodeUint16Standalone: encode, decodeUint16Standalone: decode } = buildTsCodec();
  const values = [0, 1, 42, 93, 255, 256, 4660, 32768, 65535];
  const stripTrailingNewline = (text: string): string => text.replace(/\r?\n$/, "");

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
    "    const uint16_t value = static_cast<uint16_t>(std::stoul(line));",
    "    std::cout << encodeUint16Standalone(value);",
    "    return 0;",
    "  }",
    "  if (mode == \"decode\") {",
    "    const uint16_t value = decodeUint16Standalone(line);",
    "    std::cout << static_cast<unsigned int>(value);",
    "    return 0;",
    "  }",
    "  return 3;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "integer-uint16-codec", cppSource);
  if (!exe) return;

  for (const value of values) {
    const tsWire = encode(value);
    assert.equal(tsWire.length, 3, `TS wire width for ${value}`);
    assert.equal(runCppProgram(exe, `decode\n${tsWire}\n`).trim(), String(value), `C++ decode vs TS encode for ${value}`);

    const cppWire = stripTrailingNewline(runCppProgram(exe, `encode\n${value}\n`));
    assert.equal(cppWire.length, 3, `C++ wire width for ${value}`);
    assertBase93Alphabet(cppWire);
    assert.equal(decode(cppWire), value, `TS decode vs C++ encode for ${value}`);
  }
});
