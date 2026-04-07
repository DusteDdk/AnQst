import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { decoder, descriptor } from "../../src/codecgenerators/basecodecemitters/integer-uint8/decoder";
import { encoder } from "../../src/codecgenerators/basecodecemitters/integer-uint8/encoder";
import { assertBase93Alphabet, compileCppProgram, runCppProgram } from "./helpers/emitted-code";

function buildTsCodec(): {
  encodeUint8Standalone: (value: number) => string;
  decodeUint8Standalone: (encoded: string) => number;
} {
  const source = [
    `const base93Encode = ${emitBase93Encoder()};`,
    `const base93Decode = ${emitBase93Decoder()};`,
    encoder.emitTsEncoder(),
    decoder.emitTsDecoder(),
    "return { encodeUint8Standalone, decodeUint8Standalone };"
  ].join("\n");
  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

test("integer-uint8 descriptor stays distinct while keeping fixed-width uint8 metadata", () => {
  assert.equal(descriptor.codecId, "AnQst.Type.uint8");
  assert.equal(descriptor.specPath, "RefinedSpecs/Codecs/Integer_uint8_Codec.md");
  assert.equal(descriptor.tsType, "number");
  assert.equal(descriptor.cppType, "uint8_t");
  assert.equal(descriptor.wireCategory, "fixed-width-scalar");
  assert.deepEqual(descriptor.fixedWidth, {
    byteWidth: 1,
    tsViewCtor: "Uint8Array",
    cppType: "uint8_t"
  });
  assert.match(descriptor.strategySummary, /wire-identical to quint8/i);
  assert.notEqual(descriptor.cppType, "quint8");
});

test("integer-uint8 TS standalone round-trips representative unsigned values as 2-char base93", () => {
  const { encodeUint8Standalone: encode, decodeUint8Standalone: decode } = buildTsCodec();

  for (const value of [0, 1, 2, 42, 92, 93, 127, 128, 254, 255]) {
    const encoded = encode(value);
    assert.equal(encoded.length, 2, `2-char wire width for ${value}`);
    assertBase93Alphabet(encoded);
    assert.equal(decode(encoded), value, `TS parity for ${value}`);
  }
});

test("integer-uint8 TS wire matches raw unsigned-byte base93 and stays parity-stable", () => {
  const { encodeUint8Standalone: encode, decodeUint8Standalone: decode } = buildTsCodec();
  const encodeBytes = new Function(`return (${emitBase93Encoder()});`)() as (bytes: Uint8Array) => string;

  for (const value of [0, 1, 17, 93, 127, 128, 255]) {
    const wire = encode(value);
    const expectedWire = encodeBytes(new Uint8Array([value]));
    assert.equal(wire, expectedWire, `wire-identical unsigned byte for ${value}`);

    const value2 = decode(wire);
    const wire2 = encode(value2);
    assert.equal(value2, value, `decode parity for ${value}`);
    assert.equal(wire2, wire, `re-encode parity for ${value}`);
  }
});

test("integer-uint8 emitted helpers include top block comments", () => {
  assert.match(encoder.emitTsEncoder(), /^\/\*\*/);
  assert.match(decoder.emitTsDecoder(), /^\/\*\*/);
  assert.match(encoder.emitCppEncoder(), /^\/\*\*/);
  assert.match(decoder.emitCppDecoder(), /^\/\*\*/);
});

test("integer-uint8 C++ decode matches TS encode for representative unsigned values", (t) => {
  const { encodeUint8Standalone: encode } = buildTsCodec();
  const cppSource = [
    "#include <array>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    emitBase93CppFunctions(),
    decoder.emitCppDecoder(),
    "int main() {",
    "  std::string line;",
    "  std::getline(std::cin, line);",
    "  const uint8_t value = decodeUint8Standalone(line);",
    "  std::cout << static_cast<unsigned int>(value);",
    "  return 0;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "uint8-decode", cppSource);
  if (!exe) return;

  for (const value of [0, 1, 93, 127, 128, 255]) {
    const wire = encode(value);
    const out = runCppProgram(exe, `${wire}\n`);
    assert.equal(Number(out.trim()), value, `C++ decode vs TS encode for ${value}`);
  }
});

test("integer-uint8 C++ encode matches TS decode for representative unsigned values", (t) => {
  const { decodeUint8Standalone: decode } = buildTsCodec();
  const cppSource = [
    "#include <array>",
    "#include <cstdint>",
    "#include <cstring>",
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    emitBase93CppFunctions(),
    encoder.emitCppEncoder(),
    "int main() {",
    "  unsigned int raw = 0;",
    "  std::cin >> raw;",
    "  const uint8_t value = static_cast<uint8_t>(raw);",
    "  std::cout << encodeUint8Standalone(value);",
    "  return 0;",
    "}"
  ].join("\n");

  const exe = compileCppProgram(t, "uint8-encode", cppSource);
  if (!exe) return;

  const stripTrailingNewline = (text: string): string => text.replace(/\r?\n$/, "");

  for (const value of [0, 1, 93, 127, 128, 255]) {
    const wire = stripTrailingNewline(runCppProgram(exe, `${value}\n`));
    assert.equal(wire.length, 2, `C++ wire width for ${value}`);
    assertBase93Alphabet(wire);
    assert.equal(decode(wire), value, `TS decode vs C++ encode for ${value}`);
  }
});
