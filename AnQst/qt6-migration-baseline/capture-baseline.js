#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const baselineRoot = __dirname;
const generatorRoot = path.resolve(baselineRoot, "../AnQstGen");
const repositoryAnQstRoot = path.resolve(generatorRoot, "..");
const { parseSpecFile } = require(path.join(generatorRoot, "dist/src/parser.js"));
const { generateOutputs } = require(path.join(generatorRoot, "dist/src/emit.js"));

const cases = [
  {
    name: "minimal",
    spec: path.join(generatorRoot, "test-anqst-dsl/torture/steps/01-minimal.AnQst.d.ts"),
    sourceLabel: "test-anqst-dsl/torture/steps/01-minimal.AnQst.d.ts",
    widget: "TortureWidget"
  },
  {
    name: "comprehensive",
    spec: path.join(repositoryAnQstRoot, "Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/CdEntryEditor.AnQst.d.ts"),
    sourceLabel: "../Examples/example-qt-app/lib/widgets/CdEntryEditor/AnQst/CdEntryEditor.AnQst.d.ts",
    supportingFiles: [
      path.join(repositoryAnQstRoot, "Examples/example-qt-app/lib/widgets/CdEntryEditor/types/User.ts")
    ],
    widget: "CdEntryEditor"
  },
  {
    name: "codec-leaves",
    spec: path.join(baselineRoot, "fixtures/CodecLeafWidget.AnQst.d.ts"),
    sourceLabel: "../qt6-migration-baseline/fixtures/CodecLeafWidget.AnQst.d.ts",
    widget: "CodecLeafWidget"
  }
];

function resetDirectory(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function copyPublicContract(outputs, widget, destination) {
  const publicPaths = Object.keys(outputs).filter((relativePath) =>
    relativePath.endsWith(".d.ts") ||
    relativePath === `backend/cpp/qt/${widget}_widget/include/${widget}.h` ||
    relativePath === `backend/cpp/qt/${widget}_widget/include/${widget}Types.h` ||
    relativePath === `backend/cpp/qt/${widget}_widget/include/${widget}Widget.h`
  );
  for (const relativePath of publicPaths.sort()) {
    writeFile(path.join(destination, relativePath), outputs[relativePath]);
  }
  return publicPaths.sort();
}

const rawRoot = path.join(baselineRoot, "raw-generated");
const publicRoot = path.join(baselineRoot, "public-contract");
resetDirectory(rawRoot);
fs.mkdirSync(publicRoot, { recursive: true });
for (const baselineCase of cases) {
  resetDirectory(path.join(publicRoot, baselineCase.name));
}
resetDirectory(path.join(publicRoot, "runtime"));

const dslSource = path.join(generatorRoot, "spec/AnQst-Spec-DSL.d.ts");
const dslContent = fs.readFileSync(dslSource);
writeFile(path.join(publicRoot, "AnQst-Spec-DSL.d.ts"), dslContent);

const manifest = {
  formatVersion: 1,
  generatorPackage: require(path.join(generatorRoot, "package.json")).version,
  captureCommand: "npm run build:test && node ../qt6-migration-baseline/capture-baseline.js",
  normalization: "None. Files are raw generateOutputs() strings without build stamps.",
  dslSha256: sha256(dslContent),
  cases: []
};

for (const baselineCase of cases) {
  const specPath = baselineCase.spec;
  const inputRoot = path.join(publicRoot, baselineCase.name, "inputs");
  writeFile(path.join(inputRoot, path.basename(specPath)), fs.readFileSync(specPath));
  for (const supportingPath of baselineCase.supportingFiles ?? []) {
    writeFile(path.join(inputRoot, path.basename(supportingPath)), fs.readFileSync(supportingPath));
  }
  const parsed = parseSpecFile(specPath);
  const outputs = generateOutputs(parsed, {
    emitQWidget: true,
    emitAngularService: true,
    emitVanillaTS: true,
    emitVanillaJS: true,
    emitNodeExpressWs: true,
    useSharedBaseWidget: true,
    useWebEngine: true
  });
  const rawCaseRoot = path.join(rawRoot, baselineCase.name);
  for (const relativePath of Object.keys(outputs).sort()) {
    writeFile(path.join(rawCaseRoot, relativePath), outputs[relativePath]);
  }
  const publicPaths = copyPublicContract(outputs, baselineCase.widget, path.join(publicRoot, baselineCase.name));
  manifest.cases.push({
    name: baselineCase.name,
    sourceSpec: baselineCase.sourceLabel,
    widget: baselineCase.widget,
    rawFiles: Object.keys(outputs).sort().map((relativePath) => ({
      path: relativePath,
      sha256: sha256(outputs[relativePath])
    })),
    publicFiles: publicPaths.map((relativePath) => ({
      path: relativePath,
      sha256: sha256(outputs[relativePath])
    }))
  });
}

const runtimeSources = [
  "AnQstWidget/AnQstWebBase/src/AnQstBridgeProxy.h",
  "AnQstWidget/AnQstWebBase/src/AnQstHostBridgeFacade.h",
  "AnQstWidget/AnQstWebBase/src/AnQstWebHostBase.h"
];
manifest.runtimePublicHeaders = runtimeSources.map((relativePath) => {
  const content = fs.readFileSync(path.join(repositoryAnQstRoot, relativePath));
  writeFile(path.join(publicRoot, "runtime", relativePath), content);
  return { path: relativePath, sha256: sha256(content) };
});

writeFile(path.join(baselineRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
