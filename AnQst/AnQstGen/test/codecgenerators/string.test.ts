import test from "node:test";
import assert from "node:assert/strict";
import { encoder, descriptor as encoderDescriptor } from "../../src/codecgenerators/basecodecemitters/string/encoder";
import { decoder, descriptor as decoderDescriptor } from "../../src/codecgenerators/basecodecemitters/string/decoder";
import { compileCppProgram, evalEmittedFunction, runCppProgram } from "./helpers/emitted-code";

test("string base codec descriptors match and classify as native string wire", () => {
  assert.deepEqual(encoderDescriptor, decoderDescriptor);
  assert.equal(encoderDescriptor.wireCategory, "string");
  assert.equal(encoderDescriptor.tsType, "string");
  assert.equal(encoderDescriptor.cppType, "QString");
  assert.ok(!encoderDescriptor.fixedWidth);
});

test("TypeScript string codec is identity and round-trips representative values", () => {
  const encode = evalEmittedFunction<(value: string) => string>(encoder.emitTsEncoder());
  const decode = evalEmittedFunction<(wire: string) => string>(decoder.emitTsDecoder());

  const samples = [
    "",
    "plain",
    "\"quoted\"",
    "back\\slash",
    "line1\nline2\t\r",
    "\u0000\u001f",
    "你好 🚀 𝄞",
    "mixed \" \\ \n \u2028 emoji 🔁"
  ];

  for (const s of samples) {
    assert.equal(encode(s), s, `encode identity for ${JSON.stringify(s)}`);
    assert.equal(decode(s), s, `decode identity for ${JSON.stringify(s)}`);
    assert.equal(decode(encode(s)), s, `parity for ${JSON.stringify(s)}`);
  }
});

test("JSON stringify/parse leaves domain strings consistent with identity codec", () => {
  const encode = evalEmittedFunction<(value: string) => string>(encoder.emitTsEncoder());
  const decode = evalEmittedFunction<(wire: string) => string>(decoder.emitTsDecoder());

  const needsJsonEscaping = ['"', "\\", "\n", "\r", "\t", "\b", "\f", "a\"b\\c"];
  for (const s of needsJsonEscaping) {
    const afterJson = JSON.parse(JSON.stringify(s)) as string;
    assert.equal(afterJson, s);
    assert.equal(decode(encode(afterJson)), s);
  }
});

test("repeated encode/decode stays stable", () => {
  const encode = evalEmittedFunction<(value: string) => string>(encoder.emitTsEncoder());
  const decode = evalEmittedFunction<(wire: string) => string>(decoder.emitTsDecoder());
  let v = "x\"\\y\nz🎵";
  for (let i = 0; i < 5; i++) {
    v = decode(encode(v));
  }
  assert.equal(v, 'x"\\y\nz🎵');
});

test("C++ emitted string helpers are thin identity wrappers", (t) => {
  const cpp = [
    "#include <cassert>",
    "#include <iostream>",
    "#include <string>",
    "",
    encoder.emitCppEncoder(),
    "",
    decoder.emitCppDecoder(),
    "",
    "int main() {",
    '  const std::string samples[] = {',
    '    "",',
    '    "plain",',
    '    "\\\"quoted\\\"",',
    '    "back\\\\\\\\slash",',
    '    "line1\\nline2",',
    '    "hello \\xF0\\x9F\\x9A\\x80",',
    "  };",
    "  for (const auto& s : samples) {",
    "    assert(encodeAnqstBase_string(s) == s);",
    "    assert(decodeAnqstBase_string(s) == s);",
    "    assert(decodeAnqstBase_string(encodeAnqstBase_string(s)) == s);",
    "  }",
    "  std::cout << \"ok\" << std::endl;",
    "  return 0;",
    "}",
    ""
  ].join("\n");

  const exe = compileCppProgram(t, "string_codec_identity", cpp);
  if (!exe) return;
  assert.equal(runCppProgram(exe).trim(), "ok");
});
