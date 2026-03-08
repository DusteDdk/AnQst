import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseSpecFile } from "../src/parser";
import { PNG } from "pngjs";
import { generateOutputs, installQtDesignerPluginCMake } from "../src/emit";

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
  assert.ok(outputs["frontend/CdWidget_Angular/index.ts"]);
  assert.ok(outputs["frontend/CdWidget_Angular/services.ts"]);
  assert.ok(outputs["frontend/CdWidget_Angular/types.ts"]);
  assert.ok(outputs["frontend/CdWidget_Angular/index.js"]);
  assert.ok(outputs["frontend/CdWidget_Angular/services.js"]);
  assert.ok(outputs["frontend/CdWidget_Angular/types.js"]);
  assert.ok(outputs["frontend/CdWidget_Angular/types/index.d.ts"]);
  assert.ok(outputs["frontend/CdWidget_Angular/types/services.d.ts"]);
  assert.ok(outputs["frontend/CdWidget_Angular/types/types.d.ts"]);
  assert.ok(outputs["backend/cpp/qt/CdWidget_widget/CMakeLists.txt"]);
  assert.ok(outputs["backend/cpp/qt/CdWidget_widget/CdWidget.qrc"]);
  assert.ok(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidget.h"]);
  assert.ok(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidgetTypes.h"]);
  assert.ok(outputs["backend/cpp/qt/CdWidget_widget/CdWidget.cpp"]);

  assert.match(outputs["frontend/CdWidget_Angular/index.ts"], /export type Services = typeof import\("\.\/services"\);/);
  assert.match(outputs["frontend/CdWidget_Angular/index.ts"], /export type Types = typeof import\("\.\/types"\);/);
  assert.match(outputs["frontend/CdWidget_Angular/types/services.d.ts"], /export interface CdServiceSet/);
  assert.match(outputs["frontend/CdWidget_Angular/types/services.d.ts"], /validate\(draft: CdDraft\): Promise<boolean>;/);
  assert.match(outputs["frontend/CdWidget_Angular/services.ts"], /QtWebChannelAdapter/);
  assert.match(outputs["frontend/CdWidget_Angular/services.ts"], /WebSocketBridgeAdapter/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/include/CdWidget.h"], /class CdWidget : public AnQstWebHostBase/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/CMakeLists.txt"], /add_library\(CdWidgetWidget/);
  assert.match(outputs["backend/cpp/qt/CdWidget_widget/CdWidget.qrc"], /<qresource prefix="\/cdwidget">/);
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

  assert.match(tsServices, /import type \{ User \} from "\.\.\/\.\.\/\.\.\/types\/domain";/);
  assert.doesNotMatch(tsServices, /\bTeam\b/);

  assert.match(tsTypes, /import type \{ User \} from "\.\.\/\.\.\/\.\.\/types\/domain";/);
  assert.doesNotMatch(tsTypes, /\bTeam\b/);

  assert.match(dtsServices, /import type \{ User \} from "\.\.\/\.\.\/\.\.\/\.\.\/types\/domain";/);
  assert.doesNotMatch(dtsServices, /\bTeam\b/);

  assert.match(dtsTypes, /import type \{ User \} from "\.\.\/\.\.\/\.\.\/\.\.\/types\/domain";/);
  assert.doesNotMatch(dtsTypes, /\bTeam\b/);
});

test("generateOutputs can filter QWidget, AngularService, and node_express_ws outputs independently", () => {
  const specPath = path.join(fixtures, "ValidCdSpec.AnQst.d.ts");
  const parsed = parseSpecFile(specPath);

  const angularOnly = generateOutputs(parsed, { emitAngularService: true, emitQWidget: false, emitNodeExpressWs: false });
  assert.ok(angularOnly["frontend/CdWidget_Angular/index.ts"]);
  assert.equal(angularOnly["backend/cpp/qt/CdWidget_widget/CdWidget.cpp"], undefined);
  assert.equal(angularOnly["backend/node/express/CdWidget_anQst/index.ts"], undefined);

  const qwidgetOnly = generateOutputs(parsed, { emitAngularService: false, emitQWidget: true, emitNodeExpressWs: false });
  assert.ok(qwidgetOnly["backend/cpp/qt/CdWidget_widget/CdWidget.cpp"]);
  assert.equal(qwidgetOnly["frontend/CdWidget_Angular/index.ts"], undefined);
  assert.equal(qwidgetOnly["backend/node/express/CdWidget_anQst/index.ts"], undefined);

  const nodeOnly = generateOutputs(parsed, { emitAngularService: false, emitQWidget: false, emitNodeExpressWs: true });
  assert.ok(nodeOnly["backend/node/express/CdWidget_anQst/package.json"]);
  assert.ok(nodeOnly["backend/node/express/CdWidget_anQst/index.ts"]);
  assert.ok(nodeOnly["backend/node/express/CdWidget_anQst/types/index.d.ts"]);
  assert.equal(nodeOnly["frontend/CdWidget_Angular/index.ts"], undefined);
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
  assert.match(cppFile, /qRegisterMetaType<CdEntryEditor::CdDraft>\("CdEntryEditor::CdDraft"\);/);
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
  assert.match(cmake, /designerplugin\.qrc/);
  assert.match(qrc, /plugin-icon\.png/);
  assert.deepEqual(icon, png);
});
