import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseSpecFile } from "../src/parser";
import { buildBoundaryCodecCatalog } from "../src/boundary-codecs";
import { generateOutputs } from "../src/emit";

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

  assert.equal(draftPlan!.root.nodeKind, "struct");
  assert.equal(draftPlan!.requirements.hasBlob, true);
  assert.equal(draftPlan!.requirements.hasStrings, true);
  assert.equal(draftPlan!.requirements.usesArrayCounts, true);
  assert.ok(draftPlan!.blobEntries.some((entry) => entry.role === "array-count"));

  assert.equal(resultPlan!.requirements.usesOptionalPresence, true);
  assert.ok(resultPlan!.blobEntries.some((entry) => entry.role === "optional-presence"));

  const outputs = generateOutputs(parsed, { emitAngularService: true, emitQWidget: false, emitNodeExpressWs: true });
  const tsServices = outputs["frontend/PlannerWidget_Angular/services.ts"];
  const nodeIndex = outputs["backend/node/express/PlannerWidget_anQst/index.ts"];

  assert.match(tsServices, /Boundary codec plan helpers/);
  assert.match(tsServices, /__strings\.push\(value\.album\);/);
  assert.match(tsServices, /for \(const __item\d+ of value\.tracks\) \{/);
  assert.match(tsServices, /const __value\d+ = \{\} as Result;/);
  assert.doesNotMatch(tsServices, /__anqstNamed_/);
  assert.doesNotMatch(tsServices, /__anqstPushBigInt64/);
  assert.doesNotMatch(tsServices, /__anqstDecodeBinary_/);

  assert.match(nodeIndex, /Boundary codec plan helpers/);
  assert.match(nodeIndex, /decodeAnQstStructured_Draft\(args\[0\]\)/);
  assert.doesNotMatch(nodeIndex, /__anqstNamed_/);
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
