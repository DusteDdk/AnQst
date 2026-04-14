import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseSpecFile } from "../src/parser";
import { PNG } from "pngjs";
import { generateOutputs, installQtDesignerPluginCMake, installQtIntegrationCMake } from "../src/emit";

const fixtures = path.resolve(__dirname, "../../test/fixtures");

function createSolidPng(r: number, g: number, b: number, a = 255): Buffer {
  const png = new PNG({ width: 1, height: 1 });
  png.data[0] = r;
  png.data[1] = g;
  png.data[2] = b;
  png.data[3] = a;
  return PNG.sync.write(png);
}

function createIcoFromPng(png: Buffer): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = 1;
  entry[1] = 1;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
}

test("generateOutputs returns required tree", () => {
  const specPath = path.join(fixtures, "ValidCdSpec.AnQst.d.ts");
  const parsed = parseSpecFile(specPath);
  const outputs = generateOutputs(parsed);

  assert.ok(outputs["frontend/CdWidget_Angular/package.json"]);
  assert.match(outputs["frontend/CdWidget_Angular/package.json"], /"outputContractVersion"\s*:\s*2/);
  assert.ok(outputs["frontend/CdWidget_Angular/index.ts"]);
  assert.ok(outputs["frontend/CdWidget_Angular/services.ts"]);
  assert.ok(outputs["frontend/CdWidget_Angular/types.ts"]);
  assert.ok(outputs["frontend/CdWidget_Angular/index.js"]);
  assert.ok(outputs["frontend/CdWidget_Angular/services.js"]);
  assert.ok(outputs["frontend/CdWidget_Angular/types.js"]);
  assert.ok(outputs["frontend/CdWidget_Angular/types/index.d.ts"]);
  assert.ok(outputs["frontend/CdWidget_Angular/types/services.d.ts"]);
  assert.ok(outputs["frontend/CdWidget_Angular/types/types.d.ts"]);
  assert.ok(outputs["frontend/CdWidget_VanillaTS/package.json"]);
  assert.match(outputs["frontend/CdWidget_VanillaTS/package.json"], /"outputContractVersion"\s*:\s*2/);
  assert.ok(outputs["frontend/CdWidget_VanillaTS/index.ts"]);
  assert.ok(outputs["frontend/CdWidget_VanillaTS/index.js"]);
  assert.ok(outputs["frontend/CdWidget_VanillaTS/index.d.ts"]);
  assert.ok(outputs["frontend/CdWidget_VanillaJS/package.json"]);
  assert.ok(outputs["frontend/CdWidget_VanillaJS/index.js"]);
  assert.ok(outputs["backend/cpp/qt/CdWidget_widget/CMakeLists.txt"]);
  assert.ok(outputs["backend/cpp/qt/CdWidget_widget/CdWidget.qrc"]);
  assert.ok(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidget.h"]);
  assert.ok(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidgetWidget.h"]);
  assert.ok(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidgetTypes.h"]);
  assert.ok(outputs["backend/cpp/qt/CdWidget_widget/CdWidget.cpp"]);

  assert.match(outputs["frontend/CdWidget_Angular/index.ts"], /export type Services = typeof import\("\.\/services"\);/);
  assert.match(outputs["frontend/CdWidget_Angular/index.ts"], /export type Types = typeof import\("\.\/types"\);/);
  assert.match(outputs["frontend/CdWidget_Angular/types/services.d.ts"], /export interface CdServiceSet/);
  assert.match(outputs["frontend/CdWidget_Angular/types/services.d.ts"], /validate\(draft: CdDraft\): Promise<boolean>;/);
  assert.match(outputs["frontend/CdWidget_Angular/services.ts"], /QtWebChannelAdapter/);
  assert.match(outputs["frontend/CdWidget_Angular/services.ts"], /WebSocketBridgeAdapter/);
  assert.match(outputs["frontend/CdWidget_Angular/services.ts"], /Boundary codec plan helpers/);
  assert.match(outputs["frontend/CdWidget_Angular/services.ts"], /encodeAnQstStructured_.*\(draft\)/);
  assert.match(outputs["frontend/CdWidget_Angular/services.ts"], /return decodeAnQstStructured_.*\(result\);/);
  assert.match(outputs["frontend/CdWidget_Angular/services.ts"], /encodedValue = encodeAnQstStructured_.*\(value\);/);
  assert.match(outputs["frontend/CdWidget_Angular/services.ts"], /setInput\("CdService", "draft", encodedValue\)/);
  assert.match(outputs["frontend/CdWidget_Angular/services.ts"], /onOutput\("CdService", "readOnlyMode", \(value\) => \{/);
  assert.match(outputs["frontend/CdWidget_Angular/services.ts"], /this\._readOnlyMode\.set\(decodeAnQstStructured_.*\(value\)\)/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.ts"], /export \{ .*createFrontend.* \};/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.ts"], /root\["CdWidget"\]\s*=\s*\{/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.js"], /AnQstGenerated/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.js"], /createFrontend/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.js"], /root\["CdWidget"\]\s*=\s*\{/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.js"], /class CdDraft/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.d.ts"], /interface CdDraft/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.d.ts"], /declare const CdDraft/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.d.ts"], /interface CdWidgetGlobal/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.d.ts"], /createFrontend\(\): Promise<CdWidgetFrontend>;/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.d.ts"], /CdService: CdService;/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.d.ts"], /CdDraft: typeof CdDraft;/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.d.ts"], /export \{ .*createFrontend.* \};/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.d.ts"], /interface AnQstGeneratedRoot \{\s*CdWidget: CdWidgetGlobal;/);
  assert.match(outputs["frontend/CdWidget_VanillaTS/index.d.ts"], /interface Window \{\s*AnQstGenerated: AnQstGeneratedRoot;/);
  assert.match(outputs["frontend/CdWidget_VanillaJS/index.js"], /AnQstGenerated/);
  assert.match(outputs["frontend/CdWidget_VanillaJS/index.js"], /root\["CdWidget"\]\s*=\s*\{/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidget.h"], /#include "CdWidgetWidget\.h"/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidget.h"], /#include "CdWidgetTypes\.h"/);
  assert.doesNotMatch(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidget.h"], /<AnQst_version>/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidgetWidget.h"], /class CdWidgetWidget : public AnQstWebHostBase/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidgetWidget.h"], /class handle/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidgetWidget.h"], /handle handle;/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidgetWidget.h"], /void validate\(const ValidateHandler& handler\) const;/);
  assert.doesNotMatch(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidgetWidget.h"], /bool\* ok = nullptr/);
  assert.doesNotMatch(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidgetWidget.h"], /QString\* error = nullptr/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/CdWidget.cpp"], /decodeAnQstStructured_CdDraft\(args\.value\(0\)\)/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/CdWidget.cpp"], /encodeAnQstStructured_boolean\(result\)/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/CdWidget.cpp"], /typedValue = decodeAnQstStructured_CdDraft\(value\)/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/CdWidget.cpp"], /encodedValue = encodeAnQstStructured_boolean\(value\);/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/CdWidget.cpp"], /setOutputValue\(QStringLiteral\("CdService"\), QStringLiteral\("readOnlyMode"\), encodedValue\);/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/CMakeLists.txt"], /add_library\(CdWidgetWidget/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/CdWidget.qrc"], /<qresource prefix="\/cdwidget">/);
});

test("generateOutputs wires structured codecs through TS, C++, and node boundaries", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-emit-structured-codecs-"));
  const specPath = path.join(tempRoot, "StructuredWidget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace StructuredWidget {
  interface Track {
    title: string;
    durationSeconds: number;
  }

  interface Draft {
    album: string;
    year: AnQst.Type.qint32;
    published: boolean;
    tracks: Track[];
    meta: {
      owner: string;
      notes?: string;
    };
  }

  interface Result {
    ok: boolean;
    message: string;
    field?: string;
  }

  interface StructuredService extends AnQst.Service {
    validate(draft: Draft): AnQst.Call<Result>;
    replaceDraft(draft: Draft): AnQst.Slot<Result>;
    draft: AnQst.Input<Draft>;
    result: AnQst.Output<Result>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  const outputs = generateOutputs(parsed, { emitAngularService: true, emitQWidget: true, emitNodeExpressWs: true });
  const tsServices = outputs["frontend/StructuredWidget_Angular/services.ts"];
  const cppWidget = outputs["backend/cpp/qt/StructuredWidget_widget/StructuredWidget.cpp"];
  const nodeIndex = outputs["backend/node/express/StructuredWidget_anQst/index.ts"];

  assert.match(tsServices, /Boundary codec plan helpers/);
  assert.match(tsServices, /encodeAnQstStructured_.*\(draft\)/);
  assert.match(tsServices, /const result = handler\(decodeAnQstStructured_.*\(wireArgs\[0\]\)\);/);
  assert.match(tsServices, /return result instanceof Error \? result : encodeAnQstStructured_.*\(result\);/);
  assert.match(tsServices, /encodedValue = encodeAnQstStructured_.*\(value\);/);
  assert.match(tsServices, /setInput\("StructuredService", "draft", encodedValue\)/);
  assert.match(tsServices, /onOutput\("StructuredService", "result", \(value\) => \{/);
  assert.match(tsServices, /this\._result\.set\(decodeAnQstStructured_.*\(value\)\)/);
  assert.match(tsServices, /const __anqstScalarScratchBuffer = new ArrayBuffer\(8\);/);
  assert.doesNotMatch(tsServices, /const __encodeScratchBuffer = new ArrayBuffer\(8\);/);

  assert.match(cppWidget, /inline QVariant encodeAnQstStructured_Draft/);
  assert.match(cppWidget, /inline Result decodeAnQstStructured_Result/);
  assert.match(cppWidget, /#include "AnQstBase93\.h"/);
  assert.match(cppWidget, /anqstBase93Encode\(/);
  assert.match(cppWidget, /anqstBase93Decode\(/);
  assert.doesNotMatch(cppWidget, /inline int base93AlphabetIndex/);
  assert.doesNotMatch(cppWidget, /inline std::string base93Encode/);
  assert.match(cppWidget, /const Draft draft = decodeAnQstStructured_Draft\(args\.value\(0\)\)/);
  assert.match(cppWidget, /return encodeAnQstStructured_Result\(result\);/);
  assert.match(cppWidget, /invokeArgs\.push_back\(encodeAnQstStructured_Draft\(draft\)\);/);
  assert.match(cppWidget, /return decodeAnQstStructured_Result\(result\);/);
  assert.match(cppWidget, /const Draft typedValue = decodeAnQstStructured_Draft\(value\);/);
  assert.match(cppWidget, /encodedValue = encodeAnQstStructured_Result\(value\);/);
  assert.match(cppWidget, /setOutputValue\(QStringLiteral\("StructuredService"\), QStringLiteral\("result"\), encodedValue\);/);

  assert.match(nodeIndex, /Boundary codec plan helpers/);
  assert.match(nodeIndex, /invokeSlot\("StructuredService", "replaceDraft", \[encodeAnQstStructured_.*\(draft\)\], timeoutMs\)\.then\(\(value\) => decodeAnQstStructured_.*\(value\)\)/);
  assert.match(nodeIndex, /Promise\.resolve\(handler\(buildHandlerBridge\(session\), decodeAnQstStructured_.*\(args\[0\]\)\)\)/);
  assert.match(nodeIndex, /result: encodeAnQstStructured_.*\(result\)/);
  assert.match(nodeIndex, /const decodedValue = decodeAnQstStructured_.*\(value\);/);
  assert.match(nodeIndex, /setOutputValue\("StructuredService", "result", encodeAnQstStructured_.*\(value\)\)/);
});

test("generateOutputs models unset TS state honestly and exposes bridge diagnostics for typed payloads", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-emit-diagnostics-"));
  const specPath = path.join(tempRoot, "EditorWidget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace EditorWidget {
  interface Draft {
    cdId: AnQst.Type.qint64;
    albumTitle: string;
  }

  interface SaveResult {
    saved: boolean;
    cdId: AnQst.Type.qint64;
  }

  interface EditorService extends AnQst.Service {
    showDraft(draft: Draft, selectedTrackIndex: number): AnQst.Slot<void>;
    saveRequested(draft: Draft): AnQst.Call<SaveResult>;
    draft: AnQst.Input<Draft>;
    currentCollectionName: AnQst.Output<string>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  const outputs = generateOutputs(parsed, { emitAngularService: true, emitQWidget: true, emitNodeExpressWs: false });
  const tsServices = outputs["frontend/EditorWidget_Angular/services.ts"];
  const tsServicesDts = outputs["frontend/EditorWidget_Angular/types/services.d.ts"];
  const cppHeader = outputs["backend/cpp/qt/EditorWidget_widget/include/EditorWidgetWidget.h"];
  const cppSource = outputs["backend/cpp/qt/EditorWidget_widget/EditorWidget.cpp"];

  assert.match(tsServices, /export class AnQstBridgeDiagnostics/);
  assert.match(tsServices, /private readonly _draft = signal<Draft \| undefined>\(undefined\);/);
  assert.match(tsServices, /draft\(\): Draft \| undefined \{ return this\._draft\(\); \}/);
  assert.match(tsServices, /reportFrontendDiagnostic\(diagnostic: Omit<AnQstBridgeDiagnostic, "timestamp" \| "source">\): void/);
  assert.match(tsServices, /Failed to serialize Input EditorService\.draft/);
  assert.match(tsServices, /anQstBridge_hostDiagnostic\?: \{ connect: \(cb: \(payload: unknown\) => void\) => void ?\};/);

  assert.match(tsServicesDts, /export declare class AnQstBridgeDiagnostics/);
  assert.match(tsServicesDts, /showDraft\(handler: \(draft: Draft, selectedTrackIndex: number\) => void \| Promise<void> \| Error\): void;/);
  assert.match(tsServicesDts, /saveRequested\(draft: Draft\): Promise<SaveResult>;/);
  assert.match(tsServicesDts, /draft\(\): Draft \| undefined;/);
  assert.match(tsServicesDts, /currentCollectionName\(\): string \| undefined;/);

  assert.match(
    cppHeader,
    /using SaveRequestedHandler = std::function<EditorWidget::SaveResult\(const EditorWidget::Draft& draft\)>;/
  );
  assert.match(cppHeader, /void slot_showDraft\(EditorWidget::Draft draft, double selectedTrackIndex\);/);
  assert.match(cppSource, /const Draft draft = decodeAnQstStructured_Draft\(args\.value\(0\)\);/);
  assert.match(cppSource, /invokeArgs\.push_back\(encodeAnQstStructured_Draft\(draft\)\);/);
  assert.match(cppSource, /emitHostError\(\s*QStringLiteral\("SerializationError"\),/);
});

test("generateOutputs emits canonical drag-drop MIME helpers for structured payloads", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-emit-dragdrop-"));
  const specPath = path.join(tempRoot, "DragDropWidget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace DragDropWidget {
  interface Draft {
    cdId: AnQst.Type.qint64;
    albumTitle: string;
  }

  interface DragService extends AnQst.Service {
    cdDropped: AnQst.DropTarget<Draft>;
    cdHovering: AnQst.HoverTarget<Draft>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  const outputs = generateOutputs(parsed, { emitAngularService: true, emitQWidget: true, emitNodeExpressWs: false });
  const tsServices = outputs["frontend/DragDropWidget_Angular/services.ts"];
  const cppHeader = outputs["backend/cpp/qt/DragDropWidget_widget/include/DragDropWidgetWidget.h"];
  const cppSource = outputs["backend/cpp/qt/DragDropWidget_widget/DragDropWidget.cpp"];

  assert.match(tsServices, /function decodeDragDropPayload_Draft\(rawPayload: unknown\): Draft \{/);
  assert.match(tsServices, /if \(transportTag === "A"\) \{/);
  assert.doesNotMatch(tsServices, /transportTag === "O"/);
  assert.match(tsServices, /this\._cdDropped\.set\(\{ payload: decodeDragDropPayload_Draft\(payload\), x, y \}\);/);
  assert.match(tsServices, /this\._cdHovering\.set\(\{ payload: decodeDragDropPayload_Draft\(payload\), x, y \}\);/);

  assert.match(cppHeader, /static QByteArray encodeDragDropPayload_Draft\(const DragDropWidget::Draft& payload\);/);
  assert.match(
    cppHeader,
    /static std::optional<DragDropWidget::Draft> decodeDragDropPayload_Draft\(const QByteArray& rawPayload\);/
  );

  assert.match(cppSource, /const QVariant wire = encodeAnQstStructured_Draft\(payload\);/);
  assert.match(cppSource, /if \(wire\.type\(\) == QVariant::List\) \{/);
  assert.match(cppSource, /out\.append\('A'\);/);
  assert.match(cppSource, /QJsonDocument\(QJsonArray::fromVariantList\(wire\.toList\(\)\)\)\.toJson\(QJsonDocument::Compact\)/);
  assert.doesNotMatch(cppSource, /out\.append\('J'\);/);
  assert.doesNotMatch(cppSource, /QJsonDocument::fromVariant\(wire\)/);
  assert.doesNotMatch(cppSource, /toVariantMap\(\)/);
  assert.match(cppSource, /const char transportTag = rawPayload\.at\(0\);/);
  assert.match(cppSource, /if \(transportTag == 'A'\) \{/);
  assert.match(cppSource, /const QJsonDocument document = QJsonDocument::fromJson\(payloadBytes, &parseError\);/);
  assert.match(cppSource, /if \(parseError\.error != QJsonParseError::NoError \|\| !document\.isArray\(\)\) \{/);
  assert.match(cppSource, /return decodeAnQstStructured_Draft\(QVariant\(document\.array\(\)\.toVariantList\(\)\)\);/);
  assert.match(cppSource, /const auto decodedPayload = decodeDragDropPayload_Draft\(payload\.toString\(\)\.toUtf8\(\)\);/);
});

test("generateOutputs preserves finite domains in public C++ types and emits coded finite-domain codecs", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-emit-finite-domain-"));
  const specPath = path.join(tempRoot, "FiniteWidget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace FiniteWidget {
  type Genre = "Rock" | "Jazz" | "Pop";

  interface Draft {
    genre: Genre;
    featured: true | false;
    albumTitle: string;
  }

  interface SaveResult {
    ok: boolean;
  }

  interface FiniteService extends AnQst.Service {
    save(draft: Draft): AnQst.Call<SaveResult>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  const outputs = generateOutputs(parsed, { emitAngularService: true, emitQWidget: true, emitNodeExpressWs: false });
  const tsServices = outputs["frontend/FiniteWidget_Angular/services.ts"];
  const cppTypes = outputs["backend/cpp/qt/FiniteWidget_widget/include/FiniteWidgetTypes.h"];
  const cppSource = outputs["backend/cpp/qt/FiniteWidget_widget/FiniteWidget.cpp"];

  assert.match(cppTypes, /enum class Genre : std::uint8_t \{/);
  assert.match(cppTypes, /Rock = 0,/);
  assert.match(cppTypes, /Jazz = 1,/);
  assert.match(cppTypes, /Pop = 2,/);
  assert.doesNotMatch(cppTypes, /using Genre = QString/);
  assert.match(cppTypes, /Genre genre;/);
  assert.match(cppTypes, /Q_DECLARE_METATYPE\(FiniteWidget::Genre\)/);

  assert.match(tsServices, /__anqstNamed_AnQstStructured_Draft_Genre_encode\(value\.genre, __bytes, __items\);/);
  assert.match(tsServices, /function __anqstNamed_AnQstStructured_Draft_Genre_encode\([^)]*\): void \{[\s\S]*?switch \(value\) \{/);
  assert.doesNotMatch(tsServices, /__items\.push\(value\.genre\);/);

  assert.match(cppSource, /anqstNamed_AnQstStructured_Draft_Genre_encode\(value\.genre, bytes, items\);/);
  assert.match(cppSource, /inline void anqstNamed_AnQstStructured_Draft_Genre_encode\([\s\S]*?switch \(value\) \{/);
  assert.match(cppSource, /switch \(value\.featured\) \{/);
  assert.match(cppSource, /Draft_featured value\d+\{\};/);
});

test("generateOutputs emits inline qint8/quint8 operations for trusted boundary codecs", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-emit-qint8-"));
  const specPath = path.join(tempRoot, "SmallIntWidget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace SmallIntWidget {
  interface Tiny {
    signed: AnQst.Type.qint8;
    unsigned: AnQst.Type.quint8;
    label: string;
  }

  interface SmallIntService extends AnQst.Service {
    validate(payload: Tiny): AnQst.Call<Tiny>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  const outputs = generateOutputs(parsed, { emitAngularService: true, emitQWidget: true, emitNodeExpressWs: false });
  const tsServices = outputs["frontend/SmallIntWidget_Angular/services.ts"];
  const cppSource = outputs["backend/cpp/qt/SmallIntWidget_widget/SmallIntWidget.cpp"];

  assert.match(tsServices, /__bytes\.push\(\(\(value\.signed\) as number\) & 0xff\);/);
  assert.match(tsServices, /__bytes\.push\(\(\(value\.unsigned\) as number\) & 0xff\);/);
  assert.match(tsServices, /__blobView\.getInt8\(__dataCursor\.offset\+\+\)/);
  assert.match(tsServices, /__blob\[__dataCursor\.offset\+\+\]!/);
  assert.doesNotMatch(tsServices, /function __anqstReadItem\(/);

  assert.match(cppSource, /bytes\.push_back\(static_cast<std::uint8_t>\(static_cast<std::int8_t>\(value\.signed\)\)\);/);
  assert.match(cppSource, /bytes\.push_back\(static_cast<std::uint8_t>\(value\.unsigned\)\);/);
  assert.match(cppSource, /static_cast<std::int8_t>\(\(blob\[dataOffset\+\+\]\)\)/);
  assert.match(cppSource, /blob\[dataOffset\+\+\]/);
  assert.doesNotMatch(cppSource, /inline const QVariant& anqstReadItem\(/);
  assert.doesNotMatch(cppSource, /\banqstRequireBytes\b/);
  assert.doesNotMatch(cppSource, /\banqstPushQint8\b/);
  assert.doesNotMatch(cppSource, /\banqstReadQint8\b/);
});

test("generateOutputs emits only required imported type bindings", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-emit-imports-"));
  const specPath = path.join(tempRoot, "DemoWidget.AnQst.d.ts");
  fs.mkdirSync(path.join(tempRoot, "types"), { recursive: true });
  fs.writeFileSync(
    path.join(tempRoot, "types/domain.ts"),
    `export interface User { id: string }
export interface Team { id: string }
`,
    "utf8"
  );
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";
import { User, Team } from "./types/domain";

declare namespace DemoWidget {
  interface Payload {
    user: User;
  }

  interface DemoService extends AnQst.Service {
    save(payload: Payload): AnQst.Slot<void>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  const outputs = generateOutputs(parsed);
  const tsServices = outputs["frontend/DemoWidget_Angular/services.ts"];
  const tsTypes = outputs["frontend/DemoWidget_Angular/types.ts"];
  const dtsServices = outputs["frontend/DemoWidget_Angular/types/services.d.ts"];
  const dtsTypes = outputs["frontend/DemoWidget_Angular/types/types.d.ts"];
  const dtsIndex = outputs["frontend/DemoWidget_Angular/types/index.d.ts"];
  const cppHeader = outputs["backend/cpp/qt/DemoWidget_widget/include/DemoWidgetWidget.h"];

  assert.match(tsServices, /import type \{ User \} from "\.\.\/\.\.\/\.\.\/types\/domain";/);
  assert.doesNotMatch(tsServices, /\bTeam\b/);

  assert.match(tsTypes, /import type \{ User \} from "\.\.\/\.\.\/\.\.\/types\/domain";/);
  assert.doesNotMatch(tsTypes, /\bTeam\b/);

  assert.match(dtsServices, /import type \{ User \} from "\.\.\/\.\.\/\.\.\/\.\.\/types\/domain";/);
  assert.doesNotMatch(dtsServices, /\bTeam\b/);

  assert.match(dtsTypes, /import type \{ User \} from "\.\.\/\.\.\/\.\.\/\.\.\/types\/domain";/);
  assert.doesNotMatch(dtsTypes, /\bTeam\b/);
  assert.equal((dtsIndex.match(/import type \{ User \} from "\.\.\/\.\.\/\.\.\/\.\.\/types\/domain";/g) ?? []).length, 1);
  assert.match(dtsServices, /save\(handler: \(payload: Payload\) => void \| Promise<void> \| Error\): void;/);
  assert.match(cppHeader, /public slots:/);
  assert.match(cppHeader, /void slot_save\(DemoWidget::Payload payload\);/);
});

test("generateOutputs keeps backend imports narrowed to the reachable imported type closure", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-emit-import-closure-"));
  const specPath = path.join(tempRoot, "MirrorWidget.AnQst.d.ts");
  fs.mkdirSync(path.join(tempRoot, "generated"), { recursive: true });
  fs.writeFileSync(
    path.join(tempRoot, "generated", "frontend-types.d.ts"),
    `export {};
interface Magic {
  tick: number;
  value: number;
}

interface FrontendBridge {
  diagnostics: BridgeDiagnostics;
  Magic: typeof Magic;
}

interface UnrelatedFrontend {
  active: boolean;
}

type BridgeDiagnostics = "ok" | "failed";

export type { Magic, FrontendBridge, UnrelatedFrontend, BridgeDiagnostics };
`,
    "utf8"
  );
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";
import type { Magic } from "./generated/frontend-types";

declare namespace MirrorWidget {
  interface MirrorService extends AnQst.Service {
    onMagic(magic: Magic): AnQst.Slot<void>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  const outputs = generateOutputs(parsed, { emitAngularService: false, emitQWidget: true, emitNodeExpressWs: false });
  const cppTypes = outputs["backend/cpp/qt/MirrorWidget_widget/include/MirrorWidgetTypes.h"];

  assert.match(cppTypes, /struct Magic \{/);
  assert.doesNotMatch(cppTypes, /\bFrontendBridge\b/);
  assert.doesNotMatch(cppTypes, /\bUnrelatedFrontend\b/);
  assert.doesNotMatch(cppTypes, /\bBridgeDiagnostics\b/);
});

test("generateOutputs can filter QWidget, browser frontends, and node_express_ws outputs independently", () => {
  const specPath = path.join(fixtures, "ValidCdSpec.AnQst.d.ts");
  const parsed = parseSpecFile(specPath);

  const angularOnly = generateOutputs(parsed, { emitAngularService: true, emitQWidget: false, emitNodeExpressWs: false });
  assert.ok(angularOnly["frontend/CdWidget_Angular/index.ts"]);
  assert.equal(angularOnly["frontend/CdWidget_VanillaTS/index.js"], undefined);
  assert.equal(angularOnly["frontend/CdWidget_VanillaJS/index.js"], undefined);
  assert.equal(angularOnly["backend/cpp/qt/CdWidget_widget/CdWidget.cpp"], undefined);
  assert.equal(angularOnly["backend/node/express/CdWidget_anQst/index.ts"], undefined);

  const vanillaTsOnly = generateOutputs(parsed, { emitAngularService: false, emitVanillaTS: true, emitQWidget: false, emitNodeExpressWs: false });
  assert.ok(vanillaTsOnly["frontend/CdWidget_VanillaTS/index.js"]);
  assert.ok(vanillaTsOnly["frontend/CdWidget_VanillaTS/index.d.ts"]);
  assert.equal(vanillaTsOnly["frontend/CdWidget_Angular/index.ts"], undefined);
  assert.equal(vanillaTsOnly["frontend/CdWidget_VanillaJS/index.js"], undefined);
  assert.equal(vanillaTsOnly["backend/cpp/qt/CdWidget_widget/CdWidget.cpp"], undefined);
  assert.equal(vanillaTsOnly["backend/node/express/CdWidget_anQst/index.ts"], undefined);

  const vanillaJsOnly = generateOutputs(parsed, { emitAngularService: false, emitVanillaJS: true, emitQWidget: false, emitNodeExpressWs: false });
  assert.ok(vanillaJsOnly["frontend/CdWidget_VanillaJS/index.js"]);
  assert.equal(vanillaJsOnly["frontend/CdWidget_VanillaJS/index.d.ts"], undefined);
  assert.equal(vanillaJsOnly["frontend/CdWidget_Angular/index.ts"], undefined);
  assert.equal(vanillaJsOnly["frontend/CdWidget_VanillaTS/index.js"], undefined);
  assert.equal(vanillaJsOnly["backend/cpp/qt/CdWidget_widget/CdWidget.cpp"], undefined);
  assert.equal(vanillaJsOnly["backend/node/express/CdWidget_anQst/index.ts"], undefined);

  const qwidgetOnly = generateOutputs(parsed, { emitAngularService: false, emitQWidget: true, emitNodeExpressWs: false });
  assert.ok(qwidgetOnly["backend/cpp/qt/CdWidget_widget/CdWidget.cpp"]);
  assert.equal(qwidgetOnly["frontend/CdWidget_Angular/index.ts"], undefined);
  assert.equal(qwidgetOnly["frontend/CdWidget_VanillaTS/index.js"], undefined);
  assert.equal(qwidgetOnly["frontend/CdWidget_VanillaJS/index.js"], undefined);
  assert.equal(qwidgetOnly["backend/node/express/CdWidget_anQst/index.ts"], undefined);

  const nodeOnly = generateOutputs(parsed, { emitAngularService: false, emitQWidget: false, emitNodeExpressWs: true });
  assert.ok(nodeOnly["backend/node/express/CdWidget_anQst/package.json"]);
  assert.ok(nodeOnly["backend/node/express/CdWidget_anQst/index.ts"]);
  assert.ok(nodeOnly["backend/node/express/CdWidget_anQst/types/index.d.ts"]);
  assert.match(nodeOnly["backend/node/express/CdWidget_anQst/index.ts"], /defaultSlotTimeoutMs = options\.defaultSlotTimeoutMs \?\? 1000/);
  assert.match(nodeOnly["backend/node/express/CdWidget_anQst/index.ts"], /Boundary codec plan helpers/);
  assert.match(nodeOnly["backend/node/express/CdWidget_anQst/index.ts"], /result: encodeAnQstStructured_.*\(result\)/);
  assert.match(nodeOnly["backend/node/express/CdWidget_anQst/index.ts"], /const decodedValue = decodeAnQstStructured_/);
  assert.equal(nodeOnly["frontend/CdWidget_Angular/index.ts"], undefined);
  assert.equal(nodeOnly["frontend/CdWidget_VanillaTS/index.js"], undefined);
  assert.equal(nodeOnly["frontend/CdWidget_VanillaJS/index.js"], undefined);
  assert.equal(nodeOnly["backend/cpp/qt/CdWidget_widget/CdWidget.cpp"], undefined);

  const none = generateOutputs(parsed, { emitAngularService: false, emitQWidget: false, emitNodeExpressWs: false });
  assert.equal(Object.keys(none).length, 0);
});

test("generateOutputs lifts anonymous object types for C++ and emits Qt metatype support", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-emit-anon-object-"));
  const specPath = path.join(tempRoot, "CdEntryEditor.AnQst.d.ts");
  fs.mkdirSync(path.join(tempRoot, "types"), { recursive: true });
  fs.writeFileSync(
    path.join(tempRoot, "types", "User.ts"),
    `export interface User {
  name: string;
  meta: {
    friends: number[];
  };
}
`,
    "utf8"
  );
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";
import { User } from "./types/User";

declare namespace CdEntryEditor {
  interface Track {
    title: string;
    durationSeconds: number;
  }

  interface CdDraft {
    tracks: Track[];
    createdBy: User;
  }

  interface ValidationResult {
    valid: boolean;
    message: string;
    field?: string;
  }

  interface CdEntryService extends AnQst.Service {
    validateDraft(draft: CdDraft): AnQst.Call<ValidationResult>;
    replaceTracks(tracks: Track[]): AnQst.Slot<void>;
    draft: AnQst.Input<CdDraft>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  const outputs = generateOutputs(parsed, { emitAngularService: false, emitQWidget: true, emitNodeExpressWs: false });
  const typesHeader = outputs["backend/cpp/qt/CdEntryEditor_widget/include/CdEntryEditorTypes.h"];
  const cppFile = outputs["backend/cpp/qt/CdEntryEditor_widget/CdEntryEditor.cpp"];

  assert.match(typesHeader, /struct User_meta \{/);
  assert.match(typesHeader, /QList<double> friends;/);
  assert.match(typesHeader, /Q_DECLARE_METATYPE\(CdEntryEditor::CdDraft\)/);
  assert.match(cppFile, /User_meta/);
  assert.doesNotMatch(cppFile, /CdEntryService_validateDraft_draft_createdBy_meta/);
  assert.match(cppFile, /qRegisterMetaType<CdEntryEditor::CdDraft>\("CdEntryEditor::CdDraft"\);/);
  assert.match(cppFile, /\[Timeout\] CdEntryService\.replaceTracks: The webapp inside the widget did not anwser within %1 ms\./);
  assert.match(cppFile, /\[RequestFailed\]: %1/);
});

test("browser frontend services omit empty set and onSlot namespaces", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-emit-frontend-namespaces-"));
  const specPath = path.join(tempRoot, "NsFrontendWidget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace NsFrontendWidget {
  interface SBoth extends AnQst.Service {
    draft: AnQst.Input<string>;
    go(): AnQst.Slot<void>;
  }
  interface SSetOnly extends AnQst.Service {
    draft: AnQst.Input<string>;
  }
  interface SSlotOnly extends AnQst.Service {
    go(): AnQst.Slot<void>;
  }
  interface SNeither extends AnQst.Service {
    ping(): AnQst.Call<void>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);

  function angularServiceBlock(src: string, className: string): string {
    const needle = `export class ${className}`;
    const start = src.indexOf(needle);
    assert.notEqual(start, -1);
    const next = src.indexOf("\nexport class ", start + needle.length);
    const end = next === -1 ? src.length : next;
    return src.slice(start, end);
  }

  function dtsServiceBlock(src: string, className: string): string {
    const needle = `export declare class ${className}`;
    const start = src.indexOf(needle);
    assert.notEqual(start, -1);
    const next = src.indexOf("\nexport declare class ", start + needle.length);
    const end = next === -1 ? src.length : next;
    return src.slice(start, end);
  }

  function vanillaClassBlock(src: string, className: string): string {
    const needle = `class ${className}`;
    const start = src.indexOf(needle);
    assert.notEqual(start, -1);
    const next = src.indexOf(`\nclass `, start + needle.length);
    const end = next === -1 ? src.length : next;
    return src.slice(start, end);
  }

  const outAngular = generateOutputs(parsed, {
    emitAngularService: true,
    emitQWidget: false,
    emitNodeExpressWs: false,
    emitVanillaTS: false,
    emitVanillaJS: false
  });
  const angularSvc = outAngular["frontend/NsFrontendWidget_Angular/services.ts"];
  const angularDts = outAngular["frontend/NsFrontendWidget_Angular/types/services.d.ts"];

  assert.match(angularSvc, /export class SBoth/);
  assert.match(angularServiceBlock(angularSvc, "SBoth"), /readonly set = \{/);
  assert.match(angularServiceBlock(angularSvc, "SBoth"), /readonly onSlot = \{/);

  assert.match(angularServiceBlock(angularSvc, "SSetOnly"), /readonly set = \{/);
  assert.doesNotMatch(angularServiceBlock(angularSvc, "SSetOnly"), /readonly onSlot/);

  assert.match(angularServiceBlock(angularSvc, "SSlotOnly"), /readonly onSlot = \{/);
  assert.doesNotMatch(angularServiceBlock(angularSvc, "SSlotOnly"), /readonly set/);

  assert.match(angularServiceBlock(angularSvc, "SNeither"), /async ping\(/);
  assert.doesNotMatch(angularServiceBlock(angularSvc, "SNeither"), /readonly set/);
  assert.doesNotMatch(angularServiceBlock(angularSvc, "SNeither"), /readonly onSlot/);

  assert.match(angularDts, /export interface SBothSet\b/);
  assert.match(angularDts, /export interface SBothOnSlot\b/);
  assert.match(angularDts, /export interface SSetOnlySet\b/);
  assert.doesNotMatch(angularDts, /export interface SSetOnlyOnSlot\b/);
  assert.match(angularDts, /export interface SSlotOnlyOnSlot\b/);
  assert.doesNotMatch(angularDts, /export interface SSlotOnlySet\b/);
  assert.doesNotMatch(angularDts, /export interface SNeitherSet\b/);
  assert.doesNotMatch(angularDts, /export interface SNeitherOnSlot\b/);

  assert.match(dtsServiceBlock(angularDts, "SSetOnly"), /readonly set: SSetOnlySet;/);
  assert.doesNotMatch(dtsServiceBlock(angularDts, "SSetOnly"), /readonly onSlot/);
  assert.match(dtsServiceBlock(angularDts, "SSlotOnly"), /readonly onSlot: SSlotOnlyOnSlot;/);
  assert.doesNotMatch(dtsServiceBlock(angularDts, "SSlotOnly"), /readonly set/);
  assert.doesNotMatch(dtsServiceBlock(angularDts, "SNeither"), /readonly set/);
  assert.doesNotMatch(dtsServiceBlock(angularDts, "SNeither"), /readonly onSlot/);

  const outVanilla = generateOutputs(parsed, {
    emitAngularService: false,
    emitVanillaTS: true,
    emitVanillaJS: false,
    emitQWidget: false,
    emitNodeExpressWs: false
  });
  const vanillaJs = outVanilla["frontend/NsFrontendWidget_VanillaTS/index.js"];
  const vanillaDts = outVanilla["frontend/NsFrontendWidget_VanillaTS/index.d.ts"];
  assert.match(outVanilla["frontend/NsFrontendWidget_VanillaTS/package.json"], /"outputContractVersion"\s*:\s*2/);

  // Transpiled bundle uses constructor assignments (this.set / this.onSlot), not class-field `readonly`.
  assert.match(vanillaClassBlock(vanillaJs, "SBoth"), /this\.set = \{/);
  assert.match(vanillaClassBlock(vanillaJs, "SBoth"), /this\.onSlot = \{/);
  assert.match(vanillaClassBlock(vanillaJs, "SSetOnly"), /this\.set = \{/);
  assert.doesNotMatch(vanillaClassBlock(vanillaJs, "SSetOnly"), /this\.onSlot = \{/);
  assert.match(vanillaClassBlock(vanillaJs, "SSlotOnly"), /this\.onSlot = \{/);
  assert.doesNotMatch(vanillaClassBlock(vanillaJs, "SSlotOnly"), /this\.set = \{/);
  assert.doesNotMatch(vanillaClassBlock(vanillaJs, "SNeither"), /this\.set = \{/);
  assert.doesNotMatch(vanillaClassBlock(vanillaJs, "SNeither"), /this\.onSlot = \{/);

  assert.doesNotMatch(vanillaDts, /interface SNeitherSet\b/);
  assert.doesNotMatch(vanillaDts, /interface SNeitherOnSlot\b/);
  assert.doesNotMatch(vanillaDts, /interface SSetOnlyOnSlot\b/);
  assert.doesNotMatch(vanillaDts, /interface SSlotOnlySet\b/);
});

test("installQtIntegrationCMake emits a pure wrapper over the generated widget tree", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-emit-integration-"));
  installQtIntegrationCMake(tempRoot, "DemoWidget");

  const cmakePath = path.join(tempRoot, "AnQst", "generated", "backend", "cpp", "cmake", "CMakeLists.txt");
  const cmake = fs.readFileSync(cmakePath, "utf8");

  assert.match(cmake, /set\(ANQST_REQUIRED_GENERATED_FILES[\s\S]*webapp\/index\.html"[\s\S]*\)/);
  assert.match(cmake, /Missing file: \$\{required_file\}\.[\s\S]*Run 'npx anqst build' in '\$\{ANQST_PROJECT_ROOT\}' first\./);
  assert.match(cmake, /add_subdirectory\("\$\{ANQST_GENERATED_WIDGET_DIR\}" "\$\{ANQST_GENERATED_WIDGET_BINARY_DIR\}"\)/);
  assert.doesNotMatch(cmake, /ANQST_USE_PREGENERATED/);
  assert.doesNotMatch(cmake, /find_program\(ANQST_NPM_EXECUTABLE npm REQUIRED\)/);
  assert.doesNotMatch(cmake, /find_program\(ANQST_NPX_EXECUTABLE npx REQUIRED\)/);
  assert.doesNotMatch(cmake, /add_custom_command\(/);
  assert.doesNotMatch(cmake, /add_custom_target\(DemoWidgetWidget_anqst_codegen/);
  assert.doesNotMatch(cmake, /add_library\(DemoWidgetWidget/);
});

test("installQtDesignerPluginCMake emits category override and favicon icon assets", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-emit-plugin-"));
  fs.mkdirSync(path.join(tempRoot, "dist", "app", "browser"), { recursive: true });
  const png = createSolidPng(12, 34, 56);
  fs.writeFileSync(path.join(tempRoot, "dist", "app", "browser", "favicon.ico"), createIcoFromPng(png));
  installQtDesignerPluginCMake(tempRoot, "DemoWidget", { widgetCategory: "Demo Group" });

  const pluginDir = path.join(tempRoot, "AnQst", "generated", "backend", "cpp", "qt", "DemoWidget_widget", "designerPlugin");
  const cpp = fs.readFileSync(path.join(pluginDir, "DemoWidgetDesignerPlugin.cpp"), "utf8");
  const cmake = fs.readFileSync(path.join(pluginDir, "CMakeLists.txt"), "utf8");
  const qrc = fs.readFileSync(path.join(pluginDir, "designerplugin.qrc"), "utf8");
  const icon = fs.readFileSync(path.join(pluginDir, "plugin-icon.png"));

  assert.match(cpp, /QString group\(\) const override \{ return QStringLiteral\("Demo Group"\); \}/);
  assert.match(cpp, /QIcon\(QStringLiteral\(":\/anqstdesignerplugin\/plugin-icon\.png"\)\)/);
  assert.match(cpp, /#include "DemoWidget\.h"/);
  assert.match(cpp, /QString includeFile\(\) const override \{ return QStringLiteral\("DemoWidget\.h"\); \}/);
  assert.doesNotMatch(cpp, /include\/DemoWidget\.h/);
  assert.match(cpp, /widget->setMinimumHeight\(128\);/);
  assert.match(cpp, /"        <height>128<\/height>\\n"/);
  assert.match(cmake, /designerplugin\.qrc/);
  assert.match(qrc, /plugin-icon\.png/);
  assert.deepEqual(icon, png);
});
