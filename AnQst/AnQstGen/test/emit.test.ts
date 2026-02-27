import test from "node:test";
import assert from "node:assert/strict";
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
  assert.ok(outputs["cpplibrary/CMakeLists.txt"]);
  assert.ok(outputs["cpplibrary/CdWidget.qrc"]);
  assert.ok(outputs["cpplibrary/include/CdWidget.h"]);
  assert.ok(outputs["cpplibrary/include/CdWidgetTypes.h"]);
  assert.ok(outputs["cpplibrary/CdWidget.cpp"]);

  assert.match(outputs["npmpackage/index.ts"], /@Injectable/);
  assert.match(outputs["npmpackage/index.ts"], /QtWebChannelAdapter/);
  assert.match(outputs["npmpackage/index.ts"], /WebSocketBridgeAdapter/);
  assert.match(outputs["npmpackage/index.ts"], /async validate\(draft: CdDraft\): Promise<boolean>/);
  assert.doesNotMatch(outputs["npmpackage/index.ts"], /createNoopHost/);
  assert.match(outputs["cpplibrary/include/CdWidget.h"], /class CdWidget : public AnQstWebHostBase/);
  assert.match(outputs["cpplibrary/include/CdWidget.h"], /bool enableDebug\(\)/);
  assert.match(outputs["cpplibrary/include/CdWidget.h"], /kBootstrapEntryPoint/);
  assert.match(outputs["cpplibrary/CdWidget.cpp"], /AnQstWebHostBase::enableDebug/);
  assert.match(outputs["cpplibrary/CdWidget.cpp"], /installBridgeBindings\(\)/);
  assert.match(outputs["cpplibrary/CMakeLists.txt"], /add_library\(CdWidgetWidget/);
  assert.match(outputs["cpplibrary/CMakeLists.txt"], /target_link_libraries\(CdWidgetWidget/);
  assert.match(outputs["cpplibrary/CMakeLists.txt"], /anqstwebhostbase/);
  assert.match(outputs["cpplibrary/CMakeLists.txt"], /set\(CMAKE_AUTORCC ON\)/);
  assert.match(outputs["cpplibrary/CMakeLists.txt"], /CdWidget\.qrc/);
  assert.match(outputs["cpplibrary/CdWidget.qrc"], /<qresource prefix="\/cdwidget">/);

  // Bridge name is widget-specific, never the old "anqstHost"
  assert.match(outputs["npmpackage/index.ts"], /channel\.objects\["CdWidgetBridge"\]/);
  assert.doesNotMatch(outputs["npmpackage/index.ts"], /channel\.objects\["anqstHost"\]/);
  assert.doesNotMatch(outputs["npmpackage/index.ts"], /anqstHost bridge object/);
});
