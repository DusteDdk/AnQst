import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  emitPositionalBase93CountDecoder,
  emitPositionalBase93CountEncoder,
  emitPositionalBase93CountCppFunctions
} from "../../src/codecgenerators/basecodecemitters/shared";
import { encoderEmitter } from "../../src/codecgenerators/basecodecemitters/stringArray/encoder";
import { decoderEmitter } from "../../src/codecgenerators/basecodecemitters/stringArray/decoder";
import { runCppProgram } from "./helpers/emitted-code";

const CPP_COMPILER_CANDIDATES = ["c++", "g++", "clang++"] as const;

let cachedCppCompiler: string | null | undefined;

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

function detectQtCorePkg(): string | null {
  for (const pkg of ["Qt6Core", "Qt5Core"]) {
    const probe = spawnSync("pkg-config", ["--exists", pkg], { encoding: "utf8" });
    if (!probe.error && probe.status === 0) return pkg;
  }
  return null;
}

function formatSpawnFailure(step: string, command: string, args: string[], result: ReturnType<typeof spawnSync>): string {
  const message = result.error?.message ?? `exit status ${result.status ?? "unknown"}`;
  const stderr = String(result.stderr ?? "").trim();
  return [step + " failed: " + command + " " + args.join(" "), message, stderr ? "stderr:\n" + stderr : ""]
    .filter(Boolean)
    .join("\n");
}

function compileQtCppProgram(t: TestContext, programName: string, source: string, qtPkg: string): string | null {
  const compiler = detectCppCompiler();
  if (!compiler) {
    t.skip("Skipping Qt C++ test: no C++ compiler found.");
    return null;
  }

  const cflags = spawnSync("pkg-config", ["--cflags", qtPkg], { encoding: "utf8" });
  const libs = spawnSync("pkg-config", ["--libs", qtPkg], { encoding: "utf8" });
  assert.equal(cflags.status, 0, formatSpawnFailure("pkg-config", "pkg-config", ["--cflags", qtPkg], cflags));
  assert.equal(libs.status, 0, formatSpawnFailure("pkg-config", "pkg-config", ["--libs", qtPkg], libs));

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-string-array-cpp-"));
  t.after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const sourcePath = path.join(tempRoot, `${programName}.cpp`);
  const executablePath = path.join(tempRoot, process.platform === "win32" ? `${programName}.exe` : programName);
  fs.writeFileSync(sourcePath, source, "utf8");

  const cflagsArgs = cflags.stdout
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0);
  const libArgs = libs.stdout
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 0);
  const args = ["-std=c++17", "-fPIC", ...cflagsArgs, sourcePath, "-o", executablePath, ...libArgs];
  const compile = spawnSync(compiler, args, { encoding: "utf8" });
  assert.equal(compile.status, 0, formatSpawnFailure("C++ compilation", compiler, args, compile));

  return executablePath;
}

function buildTsCodec(): {
  encodeStringArrayStandalone: (value: string[]) => string | string[];
  decodeStringArrayStandalone: (payload: unknown) => string[];
  encodeBase93Count: (n: number) => string;
} {
  const source = [
    emitPositionalBase93CountEncoder("encodeBase93Count"),
    emitPositionalBase93CountDecoder("decodeBase93Count"),
    encoderEmitter.emitTsEncoder(),
    decoderEmitter.emitTsDecoder(),
    "return { encodeStringArrayStandalone, decodeStringArrayStandalone, encodeBase93Count };"
  ].join("\n");
  return new Function(source)() as ReturnType<typeof buildTsCodec>;
}

function countPrefixFromWire(wire: string | string[]): string {
  return typeof wire === "string" ? wire : String(wire[0]);
}

test("stringArray standalone: empty array emits single positional count string", () => {
  const { encodeStringArrayStandalone, decodeStringArrayStandalone } = buildTsCodec();
  const wire = encodeStringArrayStandalone([]);
  assert.equal(typeof wire, "string");
  const back = decodeStringArrayStandalone(wire);
  assert.deepEqual(back, []);
});

test("stringArray standalone: singleton and multi-element arrays", () => {
  const { encodeStringArrayStandalone, decodeStringArrayStandalone } = buildTsCodec();
  const one = encodeStringArrayStandalone(["only"]);
  assert.ok(Array.isArray(one));
  assert.deepEqual(decodeStringArrayStandalone(one), ["only"]);

  const two = encodeStringArrayStandalone(["alpha", "beta"]);
  assert.ok(Array.isArray(two));
  assert.deepEqual(decodeStringArrayStandalone(two), ["alpha", "beta"]);
});

test("stringArray standalone: empty string element and unicode", () => {
  const { encodeStringArrayStandalone, decodeStringArrayStandalone } = buildTsCodec();
  const withEmpty = encodeStringArrayStandalone(["", "z"]);
  assert.deepEqual(decodeStringArrayStandalone(withEmpty), ["", "z"]);

  const u = encodeStringArrayStandalone(["你好", "café"]);
  assert.deepEqual(decodeStringArrayStandalone(u), ["你好", "café"]);
});

test("stringArray standalone: repeated encode/decode parity", () => {
  const { encodeStringArrayStandalone, decodeStringArrayStandalone } = buildTsCodec();
  const samples = [[], ["x"], ["a", "b", "c"], ["", ""], ["mix", "你好"]];
  for (const s of samples) {
    const w1 = encodeStringArrayStandalone(s);
    const d1 = decodeStringArrayStandalone(w1);
    const w2 = encodeStringArrayStandalone(d1);
    const d2 = decodeStringArrayStandalone(w2);
    assert.deepEqual(d1, s);
    assert.deepEqual(d2, s);
    assert.equal(JSON.stringify(w1), JSON.stringify(w2));
  }
});

test("stringArray: TS wire count prefix matches positional base93 count", () => {
  const { encodeStringArrayStandalone, encodeBase93Count } = buildTsCodec();
  const lengths = [0, 1, 2, 93, 94];
  for (const n of lengths) {
    const arr = Array.from({ length: n }, (_, i) => `i${i}`);
    const wire = encodeStringArrayStandalone(arr);
    assert.equal(countPrefixFromWire(wire), encodeBase93Count(n));
  }
});

test("C++ encode/decode matches TypeScript JSON wire (Qt)", (t) => {
  const qtPkg = detectQtCorePkg();
  if (!qtPkg) {
    t.skip("Skipping Qt C++ test: Qt6Core/Qt5Core not found via pkg-config.");
    return;
  }

  const { encodeStringArrayStandalone } = buildTsCodec();

  const cpp = [
    "#include <QByteArray>",
    "#include <QJsonArray>",
    "#include <QJsonDocument>",
    "#include <QJsonValue>",
    "#include <QStringList>",
    "#include <cstdint>",
    "#include <iostream>",
    "#include <stdexcept>",
    "#include <string>",
    "",
    emitPositionalBase93CountCppFunctions(),
    "",
    encoderEmitter.emitCppEncoder(),
    "",
    decoderEmitter.emitCppDecoder(),
    "",
    "static QByteArray jsonStringLiteralUtf8(const QString& s) {",
    "  QByteArray out = \"\\\"\";",
    "  const QByteArray u = s.toUtf8();",
    "  for (int i = 0; i < u.size(); ++i) {",
    "    const char c = u.at(i);",
    "    if (c == '\\\\' || c == '\\\"') {",
    "      out += '\\\\';",
    "      out += c;",
    "    } else if (static_cast<unsigned char>(c) < 0x20) {",
    "      out += QByteArray(\"\\\\u\") + QByteArray::number(static_cast<unsigned char>(c), 16).rightJustified(4, '0');",
    "    } else {",
    "      out += c;",
    "    }",
    "  }",
    "  out += '\\\"';",
    "  return out;",
    "}",
    "",
    "static QByteArray stringArrayWireToJsonUtf8(const QJsonValue& v) {",
    "  if (v.isArray())",
    "    return QJsonDocument(v.toArray()).toJson(QJsonDocument::Compact);",
    "  return jsonStringLiteralUtf8(v.toString());",
    "}",
    "",
    "static bool sameStringList(const QStringList& a, const QStringList& b) {",
    "  if (a.size() != b.size()) return false;",
    "  for (int i = 0; i < a.size(); ++i) {",
    "    if (a.at(i) != b.at(i)) return false;",
    "  }",
    "  return true;",
    "}",
    "",
    "int main() {",
    "  const QStringList samples[] = {",
    "    {},",
    "    QStringList{QStringLiteral(\"only\")},",
    "    QStringList{QStringLiteral(\"alpha\"), QStringLiteral(\"beta\")},",
    "    QStringList{QStringLiteral(\"\"), QStringLiteral(\"z\")},",
    "    QStringList{QString::fromUtf8(\"\\xe4\\xbd\\xa0\\xe5\\xa5\\xbd\"), QString::fromUtf8(\"caf\\xc3\\xa9\")}",
    "  };",
    "  for (const QStringList& list : samples) {",
    "    const QJsonValue w = encodeStringArrayStandalone(list);",
    "    std::cout << stringArrayWireToJsonUtf8(w).constData() << '\\n';",
    "    const QStringList round = decodeStringArrayStandalone(w);",
    "    if (!sameStringList(round, list)) {",
    "      std::cerr << \"decode mismatch\\n\";",
    "      return 1;",
    "    }",
    "  }",
    "  return 0;",
    "}",
    ""
  ].join("\n");

  const exe = compileQtCppProgram(t, "string-array-standalone", cpp, qtPkg);
  if (!exe) return;

  const tsSamples = [[], ["only"], ["alpha", "beta"], ["", "z"], ["你好", "café"]];
  const expectedLines = tsSamples.map((s) => JSON.stringify(encodeStringArrayStandalone(s)));
  const out = runCppProgram(exe).trimEnd().split("\n");
  assert.deepEqual(out, expectedLines);
});
