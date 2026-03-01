import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseSpecFile } from "../src/parser";
import { generateOutputs } from "../src/emit";

const fixtures = path.resolve(__dirname, "../../test/fixtures");

test("generateOutputs returns required tree", () => {
  const specPath = path.join(fixtures, "ValidCdSpec.AnQst.d.ts");
  const parsed = parseSpecFile(specPath);
  const outputs = generateOutputs(parsed);

  assert.ok(outputs["npmpackage/package.json"]);
  assert.ok(outputs["npmpackage/index.ts"]);
  assert.ok(outputs["npmpackage/index.js"]);
  assert.ok(outputs["npmpackage/types/index.d.ts"]);
  assert.ok(outputs["CdWidget_QtWidget/CMakeLists.txt"]);
  assert.ok(outputs["CdWidget_QtWidget/CdWidget.qrc"]);
  assert.ok(outputs["CdWidget_QtWidget/include/CdWidget.h"]);
  assert.ok(outputs["CdWidget_QtWidget/include/CdWidgetTypes.h"]);
  assert.ok(outputs["CdWidget_QtWidget/CdWidget.cpp"]);

  assert.match(outputs["npmpackage/index.ts"], /@Injectable/);
  assert.match(outputs["npmpackage/types/index.d.ts"], /export interface CdServiceSet/);
  assert.match(outputs["npmpackage/types/index.d.ts"], /draft\(value: CdDraft\): void;/);
  assert.match(outputs["npmpackage/types/index.d.ts"], /export interface CdServiceOnSlot \{\}/);
  assert.match(outputs["npmpackage/types/index.d.ts"], /validate\(draft: CdDraft\): Promise<boolean>;/);
  assert.doesNotMatch(outputs["npmpackage/types/index.d.ts"], /Record<string/);
  assert.match(outputs["npmpackage/index.ts"], /QtWebChannelAdapter/);
  assert.match(outputs["npmpackage/index.ts"], /WebSocketBridgeAdapter/);
  assert.match(outputs["npmpackage/index.ts"], /async validate\(draft: CdDraft\): Promise<boolean>/);
  assert.doesNotMatch(outputs["npmpackage/index.ts"], /createNoopHost/);
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
  assert.match(outputs["npmpackage/index.ts"], /channel\.objects\["CdWidgetBridge"\]/);
  assert.doesNotMatch(outputs["npmpackage/index.ts"], /channel\.objects\["anqstHost"\]/);
  assert.doesNotMatch(outputs["npmpackage/index.ts"], /anqstHost bridge object/);
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
  const tsIndex = outputs["npmpackage/index.ts"];
  const dtsIndex = outputs["npmpackage/types/index.d.ts"];

  assert.match(tsIndex, /import type \{ User \} from "\.\.\/\.\.\/types\/domain";/);
  assert.doesNotMatch(tsIndex, /\bTeam\b/);
  assert.doesNotMatch(tsIndex, /export interface User/);

  assert.match(dtsIndex, /import type \{ User \} from "\.\.\/\.\.\/\.\.\/types\/domain";/);
  assert.doesNotMatch(dtsIndex, /\bTeam\b/);
  assert.doesNotMatch(dtsIndex, /export interface User/);
});

test("generateOutputs can filter QWidget and AngularService outputs independently", () => {
  const specPath = path.join(fixtures, "ValidCdSpec.AnQst.d.ts");
  const parsed = parseSpecFile(specPath);

  const angularOnly = generateOutputs(parsed, { emitAngularService: true, emitQWidget: false });
  assert.ok(angularOnly["npmpackage/index.ts"]);
  assert.equal(angularOnly["CdWidget_QtWidget/CdWidget.cpp"], undefined);

  const qwidgetOnly = generateOutputs(parsed, { emitAngularService: false, emitQWidget: true });
  assert.ok(qwidgetOnly["CdWidget_QtWidget/CdWidget.cpp"]);
  assert.equal(qwidgetOnly["npmpackage/index.ts"], undefined);

  const none = generateOutputs(parsed, { emitAngularService: false, emitQWidget: false });
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
  const outputs = generateOutputs(parsed, { emitAngularService: false, emitQWidget: true });
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
