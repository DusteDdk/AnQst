import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import { encoder } from "../../src/codecgenerators/basecodecemitters/boolean/encoder";
import { decoder } from "../../src/codecgenerators/basecodecemitters/boolean/decoder";
import { compileCppProgram, runCppProgram } from "./helpers/emitted-code";

/** Wire text can start with ASCII space (base93); do not `String#trim` whole stdout. */
function splitStdoutLines(out: string): string[] {
  const lines = out.replace(/\r\n/g, "\n").split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function tsFunctionExpression(namedSource: string): string {
  return namedSource.replace(/^function \w+/, "function");
}

function createTsBooleanRuntime(): {
  encodeBoolean: (value: boolean) => string;
  decodeBoolean: (encoded: string) => boolean;
} {
  const encodeSrc = encoder.emitTsEncoder();
  const decodeSrc = decoder.emitTsDecoder();
  const program = [
    `var base93Encode = ${emitBase93Encoder()};`,
    `var base93Decode = ${emitBase93Decoder()};`,
    `var encodeBoolean = ${tsFunctionExpression(encodeSrc)};`,
    `var decodeBoolean = ${tsFunctionExpression(decodeSrc)};`,
    "return { encodeBoolean, decodeBoolean };"
  ].join("\n");
  return new Function(program)() as {
    encodeBoolean: (value: boolean) => string;
    decodeBoolean: (encoded: string) => boolean;
  };
}

test('boolean TS codec: false and true round-trip as raw "0"/"1" strings', () => {
  const { encodeBoolean, decodeBoolean } = createTsBooleanRuntime();

  for (const [value, wire] of [[false, "0"], [true, "1"]] as const) {
    assert.equal(encodeBoolean(value), wire);
    assert.equal(decodeBoolean(wire), value);
  }
});

test("boolean TS codec: encode → decode → encode → decode parity", () => {
  const { encodeBoolean, decodeBoolean } = createTsBooleanRuntime();

  for (const value of [false, true]) {
    const s1 = encodeBoolean(value);
    const v2 = decodeBoolean(s1);
    const s2 = encodeBoolean(v2);
    const v3 = decodeBoolean(s2);
    assert.equal(v2, value);
    assert.equal(s1, s2);
    assert.equal(v3, value);
  }
});

test('boolean C++ helpers: match TS wire strings and decode TS payloads', (t) => {
  const cppSource = [
    "#include <iostream>",
    "#include <string>",
    "#include <vector>",
    "#include <cstdint>",
    "",
    emitBase93CppFunctions(),
    "",
    encoder.emitCppEncoder(),
    "",
    decoder.emitCppDecoder(),
    "",
    "int main() {",
    '  std::string line;',
    "  std::getline(std::cin, line);",
    "  if (!line.empty()) {",
    "    std::cout << (decodeBoolean(line) ? \"1\" : \"0\");",
    "    return 0;",
    "  }",
    '  const std::string ef = encodeBoolean(false);',
    '  const std::string et = encodeBoolean(true);',
    "  std::cout << ef << \"\\n\" << et << \"\\n\";",
    "  std::cout << (decodeBoolean(ef) ? \"1\" : \"0\") << (decodeBoolean(et) ? \"1\" : \"0\") << \"\\n\";",
    "  return 0;",
    "}",
    ""
  ].join("\n");

  const exe = compileCppProgram(t, "boolean-codec", cppSource);
  if (!exe) return;

  const { encodeBoolean, decodeBoolean } = createTsBooleanRuntime();

  const encOut = runCppProgram(exe, "");
  const lines = splitStdoutLines(encOut);
  assert.equal(lines.length, 3);
  assert.equal(lines[0], encodeBoolean(false));
  assert.equal(lines[1], encodeBoolean(true));
  assert.equal(lines[2], "01");
  assert.equal(lines[0].length, 1);
  assert.equal(lines[1].length, 1);

  assert.equal(splitStdoutLines(runCppProgram(exe, `${encodeBoolean(false)}\n`))[0], "0");
  assert.equal(splitStdoutLines(runCppProgram(exe, `${encodeBoolean(true)}\n`))[0], "1");

  assert.equal(decodeBoolean(lines[0]), false);
  assert.equal(decodeBoolean(lines[1]), true);
});

test("emitted TS encode is a standalone function source", () => {
  const src = encoder.emitTsEncoder();
  assert.match(src, /^function encodeBoolean\(/);
  assert.match(src, /"1"/);
  const { encodeBoolean } = createTsBooleanRuntime();
  assert.equal(encodeBoolean(false), "0");
  assert.equal(encodeBoolean(true), "1");
});
