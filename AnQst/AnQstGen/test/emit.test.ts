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

  assert.ok(outputs["npmpackage/package.json"]);
  assert.ok(outputs["npmpackage/index.ts"]);
  assert.ok(outputs["npmpackage/services.ts"]);
  assert.ok(outputs["npmpackage/types.ts"]);
  assert.ok(outputs["npmpackage/index.js"]);
  assert.ok(outputs["npmpackage/services.js"]);
  assert.ok(outputs["npmpackage/types.js"]);
  assert.ok(outputs["npmpackage/types/index.d.ts"]);
  assert.ok(outputs["npmpackage/types/services.d.ts"]);
  assert.ok(outputs["npmpackage/types/types.d.ts"]);
  assert.ok(outputs["CdWidget_QtWidget/CMakeLists.txt"]);
  assert.ok(outputs["CdWidget_QtWidget/CdWidget.qrc"]);
  assert.ok(outputs["CdWidget_QtWidget/include/CdWidget.h"]);
  assert.ok(outputs["CdWidget_QtWidget/include/CdWidgetTypes.h"]);
  assert.ok(outputs["CdWidget_QtWidget/CdWidget.cpp"]);

  assert.match(outputs["npmpackage/index.ts"], /export type Services = typeof import\("\.\/services"\);/);
  assert.match(outputs["npmpackage/index.ts"], /export type Types = typeof import\("\.\/types"\);/);
  assert.doesNotMatch(outputs["npmpackage/index.ts"], /@Injectable/);
  assert.match(outputs["npmpackage/types/services.d.ts"], /export interface CdServiceSet/);
  assert.match(outputs["npmpackage/types/services.d.ts"], /draft\(value: CdDraft\): void;/);
  assert.match(outputs["npmpackage/types/services.d.ts"], /export interface CdServiceOnSlot \{\}/);
  assert.match(outputs["npmpackage/types/services.d.ts"], /validate\(draft: CdDraft\): Promise<boolean>;/);
  assert.doesNotMatch(outputs["npmpackage/types/services.d.ts"], /Record<string/);
  assert.match(outputs["npmpackage/services.ts"], /QtWebChannelAdapter/);
  assert.match(outputs["npmpackage/services.ts"], /WebSocketBridgeAdapter/);
  assert.match(outputs["npmpackage/services.ts"], /async validate\(draft: CdDraft\): Promise<boolean>/);
  assert.match(outputs["npmpackage/services.ts"], /if \(type === "widgetReattached"\)/);
  assert.match(outputs["npmpackage/services.ts"], /document\.body\.textContent = "Widget Reattached";/);
  assert.match(outputs["npmpackage/services.ts"], /this\.socket\.close\(\);/);
  assert.match(outputs["npmpackage/services.ts"], /const config = \(await configResponse\.json\(\)\) as \{ wsUrl\?: string; wsPath\?: string \};/);
  assert.match(outputs["npmpackage/services.ts"], /if \(!wsUrl && config\.wsPath\)/);
  assert.match(outputs["npmpackage/services.ts"], /wsUrl\.startsWith\("http:\/\/"\)/);
  assert.doesNotMatch(outputs["npmpackage/services.ts"], /createNoopHost/);
  assert.match(outputs["CdWidget_QtWidget/include/CdWidget.h"], /class CdWidget : public AnQstWebHostBase/);
  assert.match(outputs["CdWidget_QtWidget/include/CdWidget.h"], /bool enableDebug\(\)/);
  assert.match(outputs["CdWidget_QtWidget/include/CdWidget.h"], /kBootstrapEntryPoint/);
  assert.match(outputs["CdWidget_QtWidget/CdWidget.cpp"], /AnQstWebHostBase::enableDebug/);
  assert.match(outputs["CdWidget_QtWidget/CdWidget.cpp"], /installBridgeBindings\(\)/);
  assert.match(outputs["CdWidget_QtWidget/CMakeLists.txt"], /add_library\(CdWidgetWidget/);
  assert.match(outputs["CdWidget_QtWidget/CMakeLists.txt"], /target_link_libraries\(CdWidgetWidget/);
  assert.match(outputs["CdWidget_QtWidget/CMakeLists.txt"], /anqstwebhostbase/);
  assert.match(outputs["CdWidget_QtWidget/CMakeLists.txt"], /set\(CMAKE_AUTORCC ON\)/);
  assert.match(outputs["CdWidget_QtWidget/CMakeLists.txt"], /CdWidget\.qrc/);
  assert.match(outputs["CdWidget_QtWidget/CdWidget.qrc"], /<qresource prefix="\/cdwidget">/);

  // Bridge name is widget-specific, never the old "anqstHost"
  assert.match(outputs["npmpackage/services.ts"], /channel\.objects\["CdWidgetBridge"\]/);
  assert.doesNotMatch(outputs["npmpackage/services.ts"], /channel\.objects\["anqstHost"\]/);
  assert.doesNotMatch(outputs["npmpackage/services.ts"], /anqstHost bridge object/);
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
  const tsServices = outputs["npmpackage/services.ts"];
  const tsTypes = outputs["npmpackage/types.ts"];
  const dtsServices = outputs["npmpackage/types/services.d.ts"];
  const dtsTypes = outputs["npmpackage/types/types.d.ts"];

  assert.match(tsServices, /import type \{ User \} from "\.\.\/\.\.\/types\/domain";/);
  assert.doesNotMatch(tsServices, /\bTeam\b/);
  assert.doesNotMatch(tsServices, /export interface User/);

  assert.match(tsTypes, /import type \{ User \} from "\.\.\/\.\.\/types\/domain";/);
  assert.doesNotMatch(tsTypes, /\bTeam\b/);
  assert.doesNotMatch(tsTypes, /export interface User/);

  assert.match(dtsServices, /import type \{ User \} from "\.\.\/\.\.\/\.\.\/types\/domain";/);
  assert.doesNotMatch(dtsServices, /\bTeam\b/);
  assert.doesNotMatch(dtsServices, /export interface User/);

  assert.match(dtsTypes, /import type \{ User \} from "\.\.\/\.\.\/\.\.\/types\/domain";/);
  assert.doesNotMatch(dtsTypes, /\bTeam\b/);
  assert.doesNotMatch(dtsTypes, /export interface User/);
});

test("generateOutputs can filter QWidget, AngularService, and node_express_ws outputs independently", () => {
  const specPath = path.join(fixtures, "ValidCdSpec.AnQst.d.ts");
  const parsed = parseSpecFile(specPath);

  const angularOnly = generateOutputs(parsed, { emitAngularService: true, emitQWidget: false, emitNodeExpressWs: false });
  assert.ok(angularOnly["npmpackage/index.ts"]);
  assert.ok(angularOnly["npmpackage/services.ts"]);
  assert.ok(angularOnly["npmpackage/types.ts"]);
  assert.equal(angularOnly["CdWidget_QtWidget/CdWidget.cpp"], undefined);
  assert.equal(angularOnly["CdWidget_node_express_ws/index.ts"], undefined);

  const qwidgetOnly = generateOutputs(parsed, { emitAngularService: false, emitQWidget: true, emitNodeExpressWs: false });
  assert.ok(qwidgetOnly["CdWidget_QtWidget/CdWidget.cpp"]);
  assert.equal(qwidgetOnly["npmpackage/index.ts"], undefined);
  assert.equal(qwidgetOnly["npmpackage/services.ts"], undefined);
  assert.equal(qwidgetOnly["npmpackage/types.ts"], undefined);
  assert.equal(qwidgetOnly["CdWidget_node_express_ws/index.ts"], undefined);

  const nodeOnly = generateOutputs(parsed, { emitAngularService: false, emitQWidget: false, emitNodeExpressWs: true });
  assert.ok(nodeOnly["CdWidget_node_express_ws/package.json"]);
  assert.ok(nodeOnly["CdWidget_node_express_ws/index.ts"]);
  assert.ok(nodeOnly["CdWidget_node_express_ws/types/index.d.ts"]);
  assert.equal(nodeOnly["npmpackage/index.ts"], undefined);
  assert.equal(nodeOnly["CdWidget_QtWidget/CdWidget.cpp"], undefined);
  assert.match(nodeOnly["CdWidget_node_express_ws/index.ts"], /createCdWidgetNodeExpressWsBridge/);
  assert.match(nodeOnly["CdWidget_node_express_ws/index.ts"], /subscribeDiagnostics/);

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
  const typesHeader = outputs["CdEntryEditor_QtWidget/include/CdEntryEditorTypes.h"];
  const cppFile = outputs["CdEntryEditor_QtWidget/CdEntryEditor.cpp"];

  assert.match(typesHeader, /struct User_meta \{/);
  assert.match(typesHeader, /QList<double> friends;/);
  assert.match(typesHeader, /User_meta meta;/);
  assert.doesNotMatch(typesHeader, /friends:\s*number\[\]/);

  assert.match(typesHeader, /struct User \{/);
  assert.match(typesHeader, /Q_DECLARE_METATYPE\(CdEntryEditor::User_meta\)/);
  assert.match(typesHeader, /Q_DECLARE_METATYPE\(QList<CdEntryEditor::User_meta>\)/);
  assert.match(typesHeader, /Q_DECLARE_METATYPE\(CdEntryEditor::CdDraft\)/);

  assert.match(cppFile, /qRegisterMetaType<CdEntryEditor::CdDraft>\("CdEntryEditor::CdDraft"\);/);
  assert.match(cppFile, /qRegisterMetaType<QList<CdEntryEditor::Track>>\("QList<CdEntryEditor::Track>"\);/);

  assert.match(typesHeader, /bool operator==/);
  assert.doesNotMatch(cppFile, /return void\{\};/);
  assert.doesNotMatch(cppFile, /value<void>\(\)/);
});

test("installQtDesignerPluginCMake emits category override and favicon icon assets", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-emit-plugin-"));
  fs.mkdirSync(path.join(tempRoot, "dist", "app", "browser"), { recursive: true });
  const png = createSolidPng(12, 34, 56);
  fs.writeFileSync(path.join(tempRoot, "dist", "app", "browser", "favicon.ico"), createIcoFromPng(png));
  installQtDesignerPluginCMake(tempRoot, "DemoWidget", { widgetCategory: "Demo Group" });

  const pluginDir = path.join(tempRoot, "anqst-cmake", "designerplugin");
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
