import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseSpecFile } from "../src/parser";
import { buildBoundaryCodecCatalog } from "../src/boundary-codecs";
import { generateOutputs } from "../src/emit";
import type { BoundaryPlanNode, BoundaryPlanStructNode } from "../src/boundary-codec-model";

function decoderFunctionSource(source: string, functionName: string): string {
  const start = source.indexOf(`function ${functionName}`);
  assert.notEqual(start, -1, `missing function ${functionName}`);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

function assertNoDuplicateTsTempDeclarations(source: string, functionName: string): void {
  const functionSource = decoderFunctionSource(source, functionName);
  const declarations = [...functionSource.matchAll(/\b(?:const|let)\s+(__(?:array|count|index|present|value)\d+)\b/g)].map(
    (match) => match[1]
  );
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of declarations) {
    if (seen.has(name)) duplicates.add(name);
    seen.add(name);
  }
  assert.deepEqual([...duplicates], [], `duplicate synthetic locals in ${functionName}: ${[...duplicates].join(", ")}`);
}

function requireStructPlanNode(node: BoundaryPlanNode): BoundaryPlanStructNode {
  const current = node.nodeKind === "named" ? node.target : node;
  assert.equal(current.nodeKind, "struct");
  return current;
}

test("boundary codec planner exposes whole-boundary plans before emission and emits direct plan code", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-boundary-plan-"));
  const specPath = path.join(tempRoot, "PlannerWidget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace PlannerWidget {
  interface Track {
    title: string;
    durationSeconds: number;
  }

  interface Draft {
    album: string;
    year: AnQst.Type.qint32;
    tracks: Track[];
  }

  interface Result {
    ok: boolean;
    message: string;
    field?: string;
  }

  interface PlannerService extends AnQst.Service {
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
  const catalog = buildBoundaryCodecCatalog(parsed);

  assert.equal(catalog.plans.length, 2);

  const draftPlan = catalog.plans.find((plan) => plan.typeText === "Draft");
  const resultPlan = catalog.plans.find((plan) => plan.typeText === "Result");
  assert.ok(draftPlan);
  assert.ok(resultPlan);

  const draftRoot = requireStructPlanNode(draftPlan!.root);
  const resultRoot = requireStructPlanNode(resultPlan!.root);

  assert.equal(draftPlan!.requirements.hasBlob, true);
  assert.equal(draftPlan!.requirements.itemKinds.includes("string"), true);
  assert.equal(draftPlan!.requirements.usesArrayCounts, true);
  assert.equal(draftPlan!.decodePolicy, "trusted-only");
  assert.ok(draftPlan!.blobEntries.some((entry) => entry.role === "array-count"));

  assert.equal(resultPlan!.requirements.usesOptionalPresence, true);
  assert.ok(resultPlan!.blobEntries.some((entry) => entry.role === "optional-presence"));

  const yearField = draftRoot.fields.find((field) => field.name === "year");
  assert.ok(yearField);
  const yearNode = yearField!.node.nodeKind === "named" ? yearField!.node.target : yearField!.node;
  assert.equal(yearNode.nodeKind, "leaf");
  assert.equal(yearNode.lowering.tsEncode.mode, "inline");
  assert.equal(yearNode.lowering.cppDecode.mode, "inline");

  const outputs = generateOutputs(parsed, { emitAngularService: true, emitQWidget: false, emitNodeExpressWs: true });
  const tsServices = outputs["frontend/PlannerWidget_Angular/services.ts"];
  const nodeIndex = outputs["backend/node/express/PlannerWidget_anQst/index.ts"];

  assert.match(tsServices, /Boundary codec plan helpers/);
  assert.match(tsServices, /__items\.push\(value\.album\);/);
  assert.match(tsServices, /for \(const __item\d+ of value\.tracks\) \{/);
  assert.match(tsServices, /const __value\d+ = \{\} as Result;/);
  assert.doesNotMatch(tsServices, /__countCursor|stringCount|binaryCount|dynamicCount/);
  assert.doesNotMatch(tsServices, /__anqstPushBigInt64/);
  assert.doesNotMatch(tsServices, /__anqstDecodeBinary_/);

  assert.match(nodeIndex, /Boundary codec plan helpers/);
  assert.match(nodeIndex, /decodeAnQstStructured_Draft\(args\[0\]\)/);
  assert.doesNotMatch(nodeIndex, /stringCount|binaryCount|dynamicCount|countOffset/);
});

test("boundary codec planner rejects unsupported unions instead of degrading to a generic fallback", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-boundary-plan-union-"));
  const specPath = path.join(tempRoot, "UnsupportedUnionWidget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace UnsupportedUnionWidget {
  interface UnsupportedService extends AnQst.Service {
    validate(value: string | number): AnQst.Call<boolean>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  assert.throws(
    () => buildBoundaryCodecCatalog(parsed),
    /union transport is only supported for string, boolean, or number-like unions/
  );
});

test("boundary codec planner preserves finite domains as planner-visible nodes and chooses explicit coded representations", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-boundary-plan-finite-domain-"));
  const specPath = path.join(tempRoot, "FiniteDomainWidget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace FiniteDomainWidget {
  type Genre = "Rock" | "Jazz" | "Pop";

  interface Draft {
    genre: Genre;
    featured: true | false;
  }

  interface FiniteDomainService extends AnQst.Service {
    save(draft: Draft): AnQst.Slot<void>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  const catalog = buildBoundaryCodecCatalog(parsed);
  const draftPlan = catalog.plans.find((plan) => plan.typeText === "Draft");
  assert.ok(draftPlan);
  const draftRoot = requireStructPlanNode(draftPlan!.root);
  assert.equal(draftPlan!.requirements.usesFiniteDomainCodes, true);

  const genreField = draftRoot.fields.find((field) => field.name === "genre");
  const featuredField = draftRoot.fields.find((field) => field.name === "featured");
  assert.ok(genreField);
  assert.ok(featuredField);
  const genreNode = genreField!.node.nodeKind === "named" ? genreField!.node.target : genreField!.node;
  const featuredNode = featuredField!.node.nodeKind === "named" ? featuredField!.node.target : featuredField!.node;
  assert.equal(genreNode.nodeKind, "finite-domain");
  assert.equal(featuredNode.nodeKind, "finite-domain");
  assert.equal(genreNode.representation.kind, "coded-scalar");
  assert.equal(featuredNode.representation.kind, "coded-scalar");
  assert.deepEqual(genreNode.domain.variants.map((variant) => variant.value), ["Rock", "Jazz", "Pop"]);
  assert.deepEqual(featuredNode.domain.variants.map((variant) => variant.value), [true, false]);
});

test("boundary codec planner maps bigint payloads to qint64 transport leaves", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-boundary-plan-bigint-"));
  const specPath = path.join(tempRoot, "BigIntWidget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace BigIntWidget {
  interface PlaybackInfo {
    time: bigint;
    state: string;
  }

  interface Playback extends AnQst.Service {
    info: AnQst.Output<PlaybackInfo>;
    time: AnQst.Input<bigint>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  const catalog = buildBoundaryCodecCatalog(parsed);
  const infoPlan = catalog.plans.find((plan) => plan.typeText === "PlaybackInfo");
  const timePlan = catalog.plans.find((plan) => plan.typeText === "bigint");

  assert.ok(infoPlan);
  assert.ok(timePlan);
  assert.equal(timePlan!.root.nodeKind, "leaf");
  assert.equal(timePlan!.root.leaf.key, "qint64");
  assert.ok(infoPlan!.analysis.summary.usedLeafCapabilities.includes("qint64"));

  const outputs = generateOutputs(parsed, { emitAngularService: true, emitQWidget: false, emitNodeExpressWs: false });
  const tsServices = outputs["frontend/BigIntWidget_Angular/services.ts"];
  assert.match(tsServices, /setBigInt64\(0, value, true\)/);
  assert.match(tsServices, /getBigInt64\(__dataCursor\.offset - 8, true\)/);
});

test("boundary codec planner supports recursive named transport shapes", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-boundary-plan-recursive-"));
  const specPath = path.join(tempRoot, "RecursiveWidget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace RecursiveWidget {
  type RecordingNodeType = "IQFile" | "AudioFile" | "Directory";

  interface RecordingNode {
    type: RecordingNodeType;
    uuid: string;
    name: string;
    content: RecordingNode[];
    length: number;
  }

  interface Deployment extends AnQst.Service {
    getCommunicationRecordings(): AnQst.Call<RecordingNode[]>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  const catalog = buildBoundaryCodecCatalog(parsed);
  const recordingPlan = catalog.plans.find((plan) => plan.typeText === "RecordingNode[]");

  assert.ok(recordingPlan);
  assert.equal(recordingPlan!.root.nodeKind, "array");
  assert.equal(recordingPlan!.root.element.nodeKind, "named");
  assert.equal(recordingPlan!.root.element.name, "RecordingNode");

  const outputs = generateOutputs(parsed, { emitAngularService: true, emitQWidget: true, emitNodeExpressWs: false });
  const tsServices = outputs["frontend/RecursiveWidget_Angular/services.ts"];
  const emittedSources = Object.values(outputs).join("\n");

  assert.match(tsServices, /__anqstNamed_AnQstStructured_RecordingNode_RecordingNode_encode/);
  assert.match(tsServices, /__anqstNamed_AnQstStructured_RecordingNode_RecordingNode_decode/);
  assert.match(emittedSources, /anqstNamed_AnQstStructured_RecordingNode_RecordingNode_encode/);
  assert.match(emittedSources, /anqstNamed_AnQstStructured_RecordingNode_RecordingNode_decode/);
});

test("boundary codec planner uses item-tail extent for root fixed-item arrays", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-boundary-plan-item-tail-"));
  const specPath = path.join(tempRoot, "ItemTailWidget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace ItemTailWidget {
  interface ItemTailService extends AnQst.Service {
    suggestTags(seed: string): AnQst.Call<string[]>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  const catalog = buildBoundaryCodecCatalog(parsed);
  const tagsPlan = catalog.plans.find((plan) => plan.typeText === "string[]");
  assert.ok(tagsPlan);
  assert.equal(tagsPlan!.root.nodeKind, "array");
  assert.equal(tagsPlan!.root.extentStrategy, "item-tail");
  assert.equal(tagsPlan!.requirements.usesArrayCounts, false);
  assert.ok(tagsPlan!.blobEntries.every((entry) => entry.role !== "array-count"));

  const outputs = generateOutputs(parsed, { emitAngularService: true, emitQWidget: false, emitNodeExpressWs: false });
  const tsServices = outputs["frontend/ItemTailWidget_Angular/services.ts"];
  assert.doesNotMatch(tsServices, /item-tail array decode encountered non-divisible remaining item payloads/);
});

test("boundary codec helpers do not redeclare synthetic locals across count and decode passes", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-boundary-plan-collisions-"));
  const specPath = path.join(tempRoot, "CollisionWidget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace CollisionWidget {
  interface Track {
    title: string;
    durationSeconds: number;
  }

  interface Draft {
    artist: string;
    tracks: Track[];
    createdBy: {
      name: string;
      meta: {
        friends: number[];
      };
    };
  }

  interface CollisionService extends AnQst.Service {
    draft: AnQst.Input<Draft>;
  }
}
`,
    "utf8"
  );

  const parsed = parseSpecFile(specPath);
  const outputs = generateOutputs(parsed, { emitAngularService: true, emitQWidget: true, emitNodeExpressWs: true });
  const tsServices = outputs["frontend/CollisionWidget_Angular/services.ts"];
  const nodeIndex = outputs["backend/node/express/CollisionWidget_anQst/index.ts"];

  assertNoDuplicateTsTempDeclarations(tsServices, "decodeAnQstStructured_Draft");
  assertNoDuplicateTsTempDeclarations(nodeIndex, "decodeAnQstStructured_Draft");
});
