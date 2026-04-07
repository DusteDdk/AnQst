import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  BASE93_ALPHABET,
  emitBase93CppFunctions,
  emitBase93Encoder,
  emitBase93Decoder
} from "../src/base93";

const VALID_CHARS = new Set(BASE93_ALPHABET.split(""));

const CPP_COMPILER_CANDIDATES = ["c++", "g++", "clang++"] as const;

let cachedCppCompiler: string | null | undefined;

function buildDifficultPayload(): Uint8Array {
  const parts: number[] = [];

  for (let i = 0; i < 256; i++) parts.push(i);
  for (let i = 255; i >= 0; i--) parts.push(i);

  const critical = [
    0x00000000, 0x00000001, 0x0000005C, 0x0000005D,
    0x000021C8, 0x000021C9,
    0x000C4524, 0x000C4525,
    0x04752F10, 0x04752F11,
    0x7FFFFFFF, 0x80000000,
    0xFFFFFFFE, 0xFFFFFFFF,
  ];
  for (const v of critical) {
    parts.push((v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF);
  }

  for (let i = 0; i < 16; i++) parts.push(i % 2 === 0 ? 0x00 : 0xFF);
  for (let i = 0; i < 16; i++) parts.push(i % 2 === 0 ? 0xAA : 0x55);

  for (let i = 0; i < 8; i++) parts.push(0x00);
  for (let i = 0; i < 8; i++) parts.push(0xFF);
  for (let i = 0; i < 8; i++) parts.push(0x80);

  parts.push(0xDE, 0xAD, 0xBE);
  return new Uint8Array(parts);
}

function formatCppByteList(bytes: Uint8Array): string {
  return Array.from(bytes, byte => `0x${byte.toString(16).padStart(2, "0")}`).join(", ");
}

function detectCppCompiler(): string | null {
  if (cachedCppCompiler !== undefined) return cachedCppCompiler;

  for (const candidate of CPP_COMPILER_CANDIDATES) {
    const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (!probe.error && probe.status === 0) {
      cachedCppCompiler = candidate;
      return candidate;
    }
  }

  cachedCppCompiler = null;
  return null;
}

function formatSpawnFailure(step: string, command: string, args: string[], result: ReturnType<typeof spawnSync>): string {
  const message = result.error?.message ?? `exit status ${result.status ?? "unknown"}`;
  const stderr = String(result.stderr ?? "").trim();
  return [
    `${step} failed: ${command} ${args.join(" ")}`,
    message,
    stderr ? `stderr:\n${stderr}` : "",
  ].filter(Boolean).join("\n");
}

function compileCppProgram(t: TestContext, programName: string, source: string): string | null {
  const compiler = detectCppCompiler();
  if (!compiler) {
    t.skip("Skipping generated C++ interoperability test because no compiler was found.");
    return null;
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-base93-cpp-"));
  t.after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const sourcePath = path.join(tempRoot, `${programName}.cpp`);
  const executablePath = path.join(tempRoot, process.platform === "win32" ? `${programName}.exe` : programName);
  fs.writeFileSync(sourcePath, source, "utf8");

  const compile = spawnSync(
    compiler,
    ["-std=c++17", "-O2", sourcePath, "-o", executablePath],
    { encoding: "utf8" }
  );
  assert.equal(
    compile.status,
    0,
    formatSpawnFailure("C++ compilation", compiler, ["-std=c++17", "-O2", sourcePath, "-o", executablePath], compile)
  );

  return executablePath;
}

function runCppProgram(executablePath: string, input = ""): string {
  const run = spawnSync(executablePath, [], { encoding: "utf8", input });
  assert.equal(run.status, 0, formatSpawnFailure("Generated C++ program", executablePath, [], run));
  return run.stdout;
}

function emitCppProgram(mainBody: string): string {
  return `#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <iterator>
#include <string>
#include <vector>

${emitBase93CppFunctions()}

${mainBody}
`;
}

function emitCppSelfTestProgram(): string {
  const difficultPayload = formatCppByteList(buildDifficultPayload());
  return emitCppProgram(`static void expect(bool cond, const char* message) {
  if (!cond) {
    std::cerr << message << std::endl;
    std::exit(1);
  }
}

static void expectString(const std::string& actual, const std::string& expected, const char* message) {
  expect(actual == expected, message);
}

static void expectBytes(const std::vector<std::uint8_t>& actual, const std::vector<std::uint8_t>& expected, const char* message) {
  expect(actual == expected, message);
}

int main() {
  expectString(base93Encode(std::vector<std::uint8_t>{}), "", "encode empty");
  expectString(base93Encode(std::vector<std::uint8_t>{0}), "  ", "encode zero");
  expectString(base93Encode(std::vector<std::uint8_t>{1}), " !", "encode one");
  expectString(base93Encode(std::vector<std::uint8_t>{93}), "! ", "encode ninety-three");
  expectString(base93Encode(std::vector<std::uint8_t>{255}), "#g", "encode byte 255");
  expectString(base93Encode(std::vector<std::uint8_t>{0, 0, 0, 0}), "     ", "encode zero block");
  expectString(base93Encode(std::vector<std::uint8_t>{255, 255, 255, 255}), "ZG[H$", "encode max block");

  for (std::size_t n = 0; n <= 20; ++n) {
    const std::vector<std::uint8_t> bytes(n);
    const std::size_t expectedLength = (n / 4) * 5 + ((n % 4) ? (n % 4) + 1 : 0);
    expect(base93Encode(bytes).size() == expectedLength, "encode length formula");
  }

  std::vector<std::uint8_t> allBytes(256);
  for (std::size_t i = 0; i < allBytes.size(); ++i) allBytes[i] = static_cast<std::uint8_t>(i);
  const std::string encodedAllBytes = base93Encode(allBytes);
  for (char c : encodedAllBytes) {
    const int idx = base93AlphabetIndex(c);
    expect(idx >= 0 && idx < 93, "encode alphabet membership");
  }
  expect(encodedAllBytes.find('"') == std::string::npos, "encode avoids quote");
  expect(encodedAllBytes.find('\\\\') == std::string::npos, "encode avoids backslash");
  expectString(base93Encode(allBytes), encodedAllBytes, "encode deterministic");

  expectBytes(base93Decode(""), std::vector<std::uint8_t>{}, "decode empty");
  expectBytes(base93Decode("  "), std::vector<std::uint8_t>{0}, "decode zero");
  expectBytes(base93Decode(" !"), std::vector<std::uint8_t>{1}, "decode one");
  expectBytes(base93Decode("! "), std::vector<std::uint8_t>{93}, "decode ninety-three");
  expectBytes(base93Decode("#g"), std::vector<std::uint8_t>{255}, "decode byte 255");
  expectBytes(base93Decode("     "), std::vector<std::uint8_t>{0, 0, 0, 0}, "decode zero block");
  expectBytes(base93Decode("ZG[H$"), std::vector<std::uint8_t>{255, 255, 255, 255}, "decode max block");

  expect(base93Decode("").size() == 0, "decode empty length");
  expect(base93Decode("  ").size() == 1, "decode 2-char tail length");
  expect(base93Decode("   ").size() == 2, "decode 3-char tail length");
  expect(base93Decode("    ").size() == 3, "decode 4-char tail length");
  expect(base93Decode("     ").size() == 4, "decode full block length");
  expect(base93Decode("       ").size() == 5, "decode mixed length");

  for (int b = 0; b < 256; ++b) {
    const std::vector<std::uint8_t> input{static_cast<std::uint8_t>(b)};
    expectBytes(base93Decode(base93Encode(input)), input, "single-byte round-trip");
  }

  for (std::size_t n = 0; n <= 20; ++n) {
    std::vector<std::uint8_t> bytes(n);
    for (std::size_t i = 0; i < n; ++i) bytes[i] = static_cast<std::uint8_t>((i * 37 + 13) & 0xFF);
    expectBytes(base93Decode(base93Encode(bytes)), bytes, "pattern round-trip");
  }

  expectBytes(
    base93Decode(base93Encode(std::vector<std::uint8_t>{255, 255, 255, 255, 255, 255, 255, 255})),
    std::vector<std::uint8_t>{255, 255, 255, 255, 255, 255, 255, 255},
    "max blocks round-trip"
  );
  expectBytes(
    base93Decode(base93Encode(std::vector<std::uint8_t>{0, 0, 0, 0, 0, 0, 0, 0})),
    std::vector<std::uint8_t>{0, 0, 0, 0, 0, 0, 0, 0},
    "min blocks round-trip"
  );
  expectBytes(
    base93Decode(base93Encode(std::vector<std::uint8_t>{0xAA, 0x55, 0xAA, 0x55, 0xAA})),
    std::vector<std::uint8_t>{0xAA, 0x55, 0xAA, 0x55, 0xAA},
    "alternating round-trip"
  );

  const std::vector<std::uint8_t> difficultPayload{${difficultPayload}};
  const std::string s1 = base93Encode(difficultPayload);
  const std::vector<std::uint8_t> d1 = base93Decode(s1);
  const std::string s2 = base93Encode(d1);
  const std::vector<std::uint8_t> d2 = base93Decode(s2);
  const std::string s3 = base93Encode(d2);
  expectBytes(d1, difficultPayload, "first difficult decode parity");
  expectBytes(d2, difficultPayload, "second difficult decode parity");
  expectString(s2, s1, "second difficult encode parity");
  expectString(s3, s1, "third difficult encode parity");
  for (char c : s1) {
    const int idx = base93AlphabetIndex(c);
    expect(idx >= 0 && idx < 93, "difficult payload alphabet membership");
  }

  std::cout << "ok";
  return 0;
}`);
}

function emitCppReencodeProgram(): string {
  return emitCppProgram(`int main() {
  const std::string input(
    (std::istreambuf_iterator<char>(std::cin)),
    std::istreambuf_iterator<char>()
  );
  std::cout << base93Encode(base93Decode(input));
  return 0;
}`);
}

function emitCppEncodedPayloadProgram(payload: Uint8Array): string {
  return emitCppProgram(`int main() {
  const std::vector<std::uint8_t> payload{${formatCppByteList(payload)}};
  std::cout << base93Encode(payload);
  return 0;
}`);
}

test("emitBase93Encoder produces correct encoder for all edge cases", () => {
  const src = emitBase93Encoder();
  assert.equal(typeof src, "string");
  const encode: (d: Uint8Array) => string = new Function("return " + src)();
  assert.equal(typeof encode, "function");

  // Empty input
  assert.equal(encode(new Uint8Array(0)), "");

  // Single byte 0 → two spaces (alphabet index 0 twice)
  assert.equal(encode(new Uint8Array([0])), "  ");

  // Single byte 1 → A[0] then A[1] = " !"
  assert.equal(encode(new Uint8Array([1])), " !");

  // Single byte 93 → 93 = 1*93 + 0 → A[1] A[0] = "! "
  assert.equal(encode(new Uint8Array([93])), "! ");

  // Single byte 255 → 255 = 2*93 + 69 → A[2] A[69] = "#g"
  assert.equal(encode(new Uint8Array([255])), "#g");

  // Four zero bytes → five spaces
  assert.equal(encode(new Uint8Array([0, 0, 0, 0])), "     ");

  // Four max bytes → 0xFFFFFFFF = [57,38,58,39,3] → "ZG[H$"
  assert.equal(encode(new Uint8Array([255, 255, 255, 255])), "ZG[H$");

  // Output length formula: floor(n/4)*5 + (n%4 ? n%4+1 : 0)
  for (let n = 0; n <= 20; n++) {
    const d = new Uint8Array(n);
    const expected = Math.floor(n / 4) * 5 + (n % 4 ? n % 4 + 1 : 0);
    assert.equal(encode(d).length, expected, `length for ${n} input bytes`);
  }

  // All output characters must be JSON-string-safe (in the 93-char alphabet)
  const allBytes = new Uint8Array(256);
  for (let i = 0; i < 256; i++) allBytes[i] = i;
  const encoded = encode(allBytes);
  for (let i = 0; i < encoded.length; i++) {
    assert.ok(VALID_CHARS.has(encoded[i]),
      `char '${encoded[i]}' (0x${encoded.charCodeAt(i).toString(16)}) at pos ${i} not in alphabet`);
  }

  // Output must never contain " or backslash
  assert.equal(encoded.indexOf('"'), -1);
  assert.equal(encoded.indexOf('\\'), -1);

  // Deterministic: same input always produces same output
  assert.equal(encode(allBytes), encoded);
});

test("emitBase93Decoder produces correct decoder for all edge cases", () => {
  const src = emitBase93Decoder();
  assert.equal(typeof src, "string");
  const decode: (s: string) => Uint8Array = new Function("return " + src)();
  assert.equal(typeof decode, "function");

  // Empty string
  assert.deepEqual(decode(""), new Uint8Array(0));

  // Hand-verified test vectors (independent of encoder)
  assert.deepEqual(decode("  "), new Uint8Array([0]));
  assert.deepEqual(decode(" !"), new Uint8Array([1]));
  assert.deepEqual(decode("! "), new Uint8Array([93]));
  assert.deepEqual(decode("#g"), new Uint8Array([255]));
  assert.deepEqual(decode("     "), new Uint8Array([0, 0, 0, 0]));
  assert.deepEqual(decode("ZG[H$"), new Uint8Array([255, 255, 255, 255]));

  // Output length: 5 encoded chars → 4 bytes, tail of r chars → r-1 bytes
  assert.equal(decode("").length, 0);
  assert.equal(decode("  ").length, 1);       // 2 chars → 1 byte
  assert.equal(decode("   ").length, 2);      // 3 chars → 2 bytes
  assert.equal(decode("    ").length, 3);     // 4 chars → 3 bytes
  assert.equal(decode("     ").length, 4);    // 5 chars → 4 bytes
  assert.equal(decode("       ").length, 5);  // 7 chars → 5 bytes (1 block + 2-char tail)

  // Round-trip every single byte value
  const encode: (d: Uint8Array) => string = new Function("return " + emitBase93Encoder())();
  for (let b = 0; b < 256; b++) {
    const input = new Uint8Array([b]);
    assert.deepEqual(decode(encode(input)), input, `single byte ${b} round-trip`);
  }

  // Round-trip for all tail sizes (1, 2, 3 remainder bytes) and multiple blocks
  for (let n = 0; n <= 20; n++) {
    const d = new Uint8Array(n);
    for (let i = 0; i < n; i++) d[i] = (i * 37 + 13) & 0xFF;
    assert.deepEqual(decode(encode(d)), d, `round-trip for ${n} bytes`);
  }

  // Round-trip with max-value blocks
  const maxBlock = new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255]);
  assert.deepEqual(decode(encode(maxBlock)), maxBlock);

  const minBlock = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(decode(encode(minBlock)), minBlock);

  // Round-trip alternating patterns
  const alt = new Uint8Array([0xAA, 0x55, 0xAA, 0x55, 0xAA]);
  assert.deepEqual(decode(encode(alt)), alt);
});

test("round-trip binary parity: binData → encode → decode → encode → decode → encode", () => {
  const encode: (d: Uint8Array) => string = new Function("return " + emitBase93Encoder())();
  const decode: (s: string) => Uint8Array = new Function("return " + emitBase93Decoder())();
  const binDataIn = buildDifficultPayload();

  // binData → encode → decode → encode → decode → encode
  const s1 = encode(binDataIn);
  const d1 = decode(s1);
  const s2 = encode(d1);
  const d2 = decode(s2);
  const s3 = encode(d2);

  // Binary parity at each decode step
  assert.deepEqual(d1, binDataIn, "first decode must recover original binary");
  assert.deepEqual(d2, binDataIn, "second decode must recover original binary");

  // String parity at each encode step
  assert.equal(s2, s1, "second encode must match first encode");
  assert.equal(s3, s1, "third encode must match first encode");

  // Verify the encoded output is valid for JSON embedding
  for (let i = 0; i < s1.length; i++) {
    assert.ok(VALID_CHARS.has(s1[i]),
      `encoded char at ${i} not in alphabet`);
  }
});

test("encode survives JSON.stringify/parse round-trip without escape overhead", (t) => {
  const encode: (d: Uint8Array) => string = new Function("return " + emitBase93Encoder())();
  const decode: (s: string) => Uint8Array = new Function("return " + emitBase93Decoder())();

  // Build payload: all 256 byte values + reversed + tail + 16 KiB of PRNG bytes
  const parts: number[] = [];
  for (let i = 0; i < 256; i++) parts.push(i);
  for (let i = 255; i >= 0; i--) parts.push(i);
  parts.push(0xDE, 0xAD, 0xBE);

  // xorshift32 PRNG seeded with 1337
  let seed = 1337;
  for (let i = 0; i < 16384; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    parts.push((seed >>> 0) & 0xFF);
  }

  const binDataIn = new Uint8Array(parts);

  const encoded = encode(binDataIn);

  // binData → encode → JSON.stringify([encoded]) → JSON.parse → decode(parsed[0])
  const jsonString = JSON.stringify([encoded]);
  const parsed: string[] = JSON.parse(jsonString);
  const binDataOut = decode(parsed[0]);

  t.diagnostic(`binary in:     ${binDataIn.length} bytes`);
  t.diagnostic(`encoded raw:   ${encoded.length} bytes`);
  t.diagnostic(`json string:   ${jsonString.length} bytes`);
  t.diagnostic(`binary out:    ${binDataOut.length} bytes`);

  assert.deepEqual(binDataOut, binDataIn, "binary data must survive JSON transport");

  // The JSON string must contain zero backslashes — any escape sequence means overhead
  assert.equal(jsonString.indexOf('\\'), -1,
    `JSON.stringify must not introduce escape characters, but got: ...${jsonString.slice(
      Math.max(0, jsonString.indexOf('\\') - 10),
      jsonString.indexOf('\\') + 10
    )}...`);
});

test("emitBase93CppFunctions can generate a native self-test program", (t) => {
  const executablePath = compileCppProgram(t, "base93-selftest", emitCppSelfTestProgram());
  if (!executablePath) return;

  const stdout = runCppProgram(executablePath);
  assert.equal(stdout, "ok");
});

test("generated C++ decoder/encoder preserves JS encoded payloads end-to-end", (t) => {
  const executablePath = compileCppProgram(t, "base93-reencode", emitCppReencodeProgram());
  if (!executablePath) return;

  const encode: (d: Uint8Array) => string = new Function("return " + emitBase93Encoder())();
  const decode: (s: string) => Uint8Array = new Function("return " + emitBase93Decoder())();
  const rawBytes = buildDifficultPayload();
  const encodedIn = encode(rawBytes);
  const encodedOut = runCppProgram(executablePath, encodedIn);

  assert.equal(encodedOut, encodedIn, "C++ decode/encode must preserve the encoded payload");
  assert.deepEqual(decode(encodedOut), rawBytes, "JS decode must recover the original binary payload");
});

test("generated C++ encoder output decodes correctly in JS", (t) => {
  const rawBytes = buildDifficultPayload();
  const executablePath = compileCppProgram(t, "base93-emit-payload", emitCppEncodedPayloadProgram(rawBytes));
  if (!executablePath) return;

  const decode: (s: string) => Uint8Array = new Function("return " + emitBase93Decoder())();
  const encoded = runCppProgram(executablePath);

  for (let i = 0; i < encoded.length; i++) {
    assert.ok(VALID_CHARS.has(encoded[i]), `generated C++ emitted non-alphabet char at ${i}`);
  }
  assert.deepEqual(decode(encoded), rawBytes, "JS decoder must accept generated C++ encoder output");
});
