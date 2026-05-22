import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";
import { parseSpecFile } from "../src/parser";
import { generateOutputs } from "../src/emit";
import { runCppProgram } from "./helpers/emitted-code";

const CPP_COMPILER_CANDIDATES = ["c++", "g++", "clang++"] as const;

let cachedCppCompiler: string | null | undefined;
let cachedBase93CppPaths: { includeDir: string; sourcePath: string } | null | undefined;

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

function resolveBase93CppPaths(): { includeDir: string; sourcePath: string } | null {
  if (cachedBase93CppPaths !== undefined) return cachedBase93CppPaths;

  const includeCandidates = [
    path.resolve(process.cwd(), "..", "AnQstWidget", "AnQstWebBase", "src"),
    path.resolve(process.cwd(), "AnQstWidget", "AnQstWebBase", "src"),
    path.resolve(__dirname, "..", "..", "..", "AnQstWidget", "AnQstWebBase", "src")
  ];

  for (const includeDir of includeCandidates) {
    const sourcePath = path.join(includeDir, "AnQstBase93.cpp");
    const headerPath = path.join(includeDir, "AnQstBase93.h");
    if (fs.existsSync(sourcePath) && fs.existsSync(headerPath)) {
      cachedBase93CppPaths = { includeDir, sourcePath };
      return cachedBase93CppPaths;
    }
  }

  cachedBase93CppPaths = null;
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
    t.skip("Skipping Qt deep-structure interoperability test: no C++ compiler found.");
    return null;
  }
  const base93CppPaths = resolveBase93CppPaths();
  if (!base93CppPaths) {
    t.skip("Skipping Qt deep-structure interoperability test: AnQstBase93 runtime sources were not found.");
    return null;
  }

  const cflags = spawnSync("pkg-config", ["--cflags", qtPkg], { encoding: "utf8" });
  const libs = spawnSync("pkg-config", ["--libs", qtPkg], { encoding: "utf8" });
  assert.equal(cflags.status, 0, formatSpawnFailure("pkg-config", "pkg-config", ["--cflags", qtPkg], cflags));
  assert.equal(libs.status, 0, formatSpawnFailure("pkg-config", "pkg-config", ["--libs", qtPkg], libs));

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-deep-structured-cpp-"));
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
  const args = [
    "-std=c++17",
    "-fPIC",
    ...cflagsArgs,
    `-I${base93CppPaths.includeDir}`,
    sourcePath,
    base93CppPaths.sourcePath,
    "-o",
    executablePath,
    ...libArgs
  ];
  const compile = spawnSync(compiler, args, { encoding: "utf8" });
  assert.equal(compile.status, 0, formatSpawnFailure("C++ compilation", compiler, args, compile));

  return executablePath;
}

function extractBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `missing marker: ${endMarker}`);
  return source.slice(start, end);
}

function buildTsDraftCodec(servicesSource: string): {
  encodeAnQstStructured_Draft: (value: unknown) => unknown;
  decodeAnQstStructured_Draft: (wire: unknown) => unknown;
} {
  const helperSource = extractBetween(
    servicesSource,
    "// Boundary codec plan helpers",
    "export type AnQstBridgeSeverity"
  );
  const transpiled = ts.transpileModule(helperSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  return new Function(
    `${transpiled}\nreturn { encodeAnQstStructured_Draft, decodeAnQstStructured_Draft };`
  )() as ReturnType<typeof buildTsDraftCodec>;
}

function normalizeForJson(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map((item) => normalizeForJson(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, inner]) => [key, normalizeForJson(inner)])
    );
  }
  return value;
}

test("generated deep structured boundary codecs interoperate between TypeScript and C++ in both directions", (t) => {
  const qtPkg = detectQtCorePkg();
  if (!qtPkg) {
    t.skip("Skipping deep structured boundary interoperability test: Qt6Core/Qt5Core not found via pkg-config.");
    return;
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-deep-structured-interop-"));
  t.after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const specPath = path.join(tempRoot, "DeepWidget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace DeepWidget {
  interface Friend {
    id: AnQst.Type.qint32;
    alias: string;
  }

  interface UserMeta {
    friends: Friend[];
    favoriteNumbers: number[];
  }

  interface User {
    name: string;
    meta: UserMeta;
  }

  interface Track {
    title: string;
    durationSeconds: number;
    tags: string[];
  }

  interface Draft {
    cdId: AnQst.Type.qint64;
    albumTitle: string;
    published: boolean;
    tracks: Track[];
    createdBy: User;
  }

  interface DeepService extends AnQst.Service {
    draft: AnQst.Input<Draft>;
    result: AnQst.Output<Draft>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  const outputs = generateOutputs(parsed, { emitAngularService: true, emitQWidget: true, emitNodeExpressWs: false });
  const tsCodec = buildTsDraftCodec(outputs["frontend/DeepWidget_Angular/services.ts"]);
  const headerSource = outputs["backend/cpp/qt/DeepWidget_widget/include/DeepWidgetTypes.h"];
  const widgetHeaderSource = outputs["backend/cpp/qt/DeepWidget_widget/include/DeepWidgetWidget.h"];
  const cppSource = outputs["backend/cpp/qt/DeepWidget_widget/DeepWidget.cpp"];
  assert.equal(widgetHeaderSource.includes("BridgeBindingRow"), false);
  assert.equal(widgetHeaderSource.includes("kBridgeBindings"), false);
  assert.equal(cppSource.includes("BridgeBindingRow"), false);
  assert.equal(cppSource.includes("kBridgeBindings"), false);
  assert.equal(cppSource.includes("#include \"AnQstBase93.h\""), true);
  assert.equal(cppSource.includes("inline int base93AlphabetIndex"), false);
  const helperSource = extractBetween(
    cppSource,
    "using namespace DeepWidget;",
    "DeepWidgetWidget::DeepWidgetWidget("
  );

  const sampleDraft = {
    cdId: 1234567890123n,
    albumTitle: "Kind of Blue",
    published: true,
    tracks: [
      { title: "So What", durationSeconds: 545.5, tags: ["modal", "opening"] },
      { title: "Freddie Freeloader", durationSeconds: 589.25, tags: ["swing", "blues"] }
    ],
    createdBy: {
      name: "Miles",
      meta: {
        friends: [
          { id: 7, alias: "Coltrane" },
          { id: -3, alias: "Bill Evans" }
        ],
        favoriteNumbers: [3.5, -7.25, 0]
      }
    }
  };
  const expectedJson = normalizeForJson(sampleDraft);

  const cppProgram = [
    "#include <QByteArray>",
    "#include <QJsonArray>",
    "#include <QJsonDocument>",
    "#include <QJsonObject>",
    "#include <QJsonParseError>",
    "#include <QString>",
    "#include <QVariant>",
    "#include <QVariantList>",
    "#include \"AnQstBase93.h\"",
    "#include <cstring>",
    "#include <iostream>",
    "#include <stdexcept>",
    "#include <string>",
    "",
    headerSource,
    "",
    helperSource,
    "",
    "static DeepWidget::Draft makeSampleDraft() {",
    "  using namespace DeepWidget;",
    "  Draft draft{};",
    "  draft.cdId = static_cast<qint64>(1234567890123LL);",
    "  draft.albumTitle = QStringLiteral(\"Kind of Blue\");",
    "  draft.published = true;",
    "  Track first{};",
    "  first.title = QStringLiteral(\"So What\");",
    "  first.durationSeconds = 545.5;",
    "  first.tags = QList<QString>{QStringLiteral(\"modal\"), QStringLiteral(\"opening\")};",
    "  Track second{};",
    "  second.title = QStringLiteral(\"Freddie Freeloader\");",
    "  second.durationSeconds = 589.25;",
    "  second.tags = QList<QString>{QStringLiteral(\"swing\"), QStringLiteral(\"blues\")};",
    "  draft.tracks = QList<Track>{first, second};",
    "  Friend a{};",
    "  a.id = static_cast<qint32>(7);",
    "  a.alias = QStringLiteral(\"Coltrane\");",
    "  Friend b{};",
    "  b.id = static_cast<qint32>(-3);",
    "  b.alias = QStringLiteral(\"Bill Evans\");",
    "  UserMeta meta{};",
    "  meta.friends = QList<Friend>{a, b};",
    "  meta.favoriteNumbers = QList<double>{3.5, -7.25, 0.0};",
    "  User user{};",
    "  user.name = QStringLiteral(\"Miles\");",
    "  user.meta = meta;",
    "  draft.createdBy = user;",
    "  return draft;",
    "}",
    "",
    "static QJsonObject friendToJson(const DeepWidget::Friend& value) {",
    "  QJsonObject obj;",
    "  obj.insert(QStringLiteral(\"id\"), value.id);",
    "  obj.insert(QStringLiteral(\"alias\"), value.alias);",
    "  return obj;",
    "}",
    "",
    "static QJsonObject userMetaToJson(const DeepWidget::UserMeta& value) {",
    "  QJsonArray friends;",
    "  for (const auto& item : value.friends) friends.append(friendToJson(item));",
    "  QJsonArray favoriteNumbers;",
    "  for (double item : value.favoriteNumbers) favoriteNumbers.append(item);",
    "  QJsonObject obj;",
    "  obj.insert(QStringLiteral(\"friends\"), friends);",
    "  obj.insert(QStringLiteral(\"favoriteNumbers\"), favoriteNumbers);",
    "  return obj;",
    "}",
    "",
    "static QJsonObject userToJson(const DeepWidget::User& value) {",
    "  QJsonObject obj;",
    "  obj.insert(QStringLiteral(\"name\"), value.name);",
    "  obj.insert(QStringLiteral(\"meta\"), userMetaToJson(value.meta));",
    "  return obj;",
    "}",
    "",
    "static QJsonObject trackToJson(const DeepWidget::Track& value) {",
    "  QJsonArray tags;",
    "  for (const auto& item : value.tags) tags.append(item);",
    "  QJsonObject obj;",
    "  obj.insert(QStringLiteral(\"title\"), value.title);",
    "  obj.insert(QStringLiteral(\"durationSeconds\"), value.durationSeconds);",
    "  obj.insert(QStringLiteral(\"tags\"), tags);",
    "  return obj;",
    "}",
    "",
    "static QByteArray draftToJson(const DeepWidget::Draft& value) {",
    "  QJsonArray tracks;",
    "  for (const auto& item : value.tracks) tracks.append(trackToJson(item));",
    "  QJsonObject obj;",
    "  obj.insert(QStringLiteral(\"cdId\"), QString::number(value.cdId));",
    "  obj.insert(QStringLiteral(\"albumTitle\"), value.albumTitle);",
    "  obj.insert(QStringLiteral(\"published\"), value.published);",
    "  obj.insert(QStringLiteral(\"tracks\"), tracks);",
    "  obj.insert(QStringLiteral(\"createdBy\"), userToJson(value.createdBy));",
    "  return QJsonDocument(obj).toJson(QJsonDocument::Compact);",
    "}",
    "",
    "static QVariant parseWireJson(const QByteArray& input) {",
    "  QJsonParseError parseError{};",
    "  const QJsonDocument document = QJsonDocument::fromJson(input, &parseError);",
    "  if (parseError.error != QJsonParseError::NoError || !document.isArray()) throw std::runtime_error(\"invalid wire json\");",
    "  return document.array().toVariantList();",
    "}",
    "",
    "int main() {",
    "  std::string mode;",
    "  if (!std::getline(std::cin, mode)) return 1;",
    "  if (mode == \"decode\") {",
    "    std::string wireJson;",
    "    if (!std::getline(std::cin, wireJson)) return 2;",
    "    const DeepWidget::Draft draft = decodeAnQstStructured_Draft(parseWireJson(QByteArray::fromStdString(wireJson)));",
    "    std::cout << draftToJson(draft).toStdString();",
    "    return 0;",
    "  }",
    "  if (mode == \"encode\") {",
    "    const QVariant wire = encodeAnQstStructured_Draft(makeSampleDraft());",
    "    const QJsonDocument document(QJsonArray::fromVariantList(anqstNormalizeWireItems(wire)));",
    "    std::cout << document.toJson(QJsonDocument::Compact).toStdString();",
    "    return 0;",
    "  }",
    "  return 3;",
    "}"
  ].join("\n");

  const exe = compileQtCppProgram(t, "deep-structured-boundary-codec", cppProgram, qtPkg);
  if (!exe) return;

  const tsWire = tsCodec.encodeAnQstStructured_Draft(sampleDraft);
  const tsWireJson = JSON.stringify(Array.isArray(tsWire) ? tsWire : [tsWire]);
  const cppDecoded = JSON.parse(runCppProgram(exe, `decode\n${tsWireJson}\n`));
  assert.deepEqual(cppDecoded, expectedJson, "C++ must decode TS-generated deep structured wire");

  const cppWireJson = runCppProgram(exe, "encode\n").trim();
  const tsDecoded = tsCodec.decodeAnQstStructured_Draft(JSON.parse(cppWireJson));
  assert.deepEqual(normalizeForJson(tsDecoded), expectedJson, "TS must decode C++-generated deep structured wire");
});
