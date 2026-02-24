import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { parseSpecFile } from "../src/parser";
import { verifySpec } from "../src/verify";
import { VerifyError } from "../src/errors";

const fixtures = path.resolve(__dirname, "../../test/fixtures");

test("verify valid spec returns expected counts", () => {
  const specPath = path.join(fixtures, "ValidCdSpec.AnQst.d.ts");
  const parsed = parseSpecFile(specPath);
  const stats = verifySpec(parsed);
  assert.equal(parsed.widgetName, "CdWidget");
  assert.equal(stats.namespaceDeclaredTypes, 2);
  assert.equal(stats.serviceCount, 1);
  assert.equal(parsed.supportsDevelopmentModeTransport, false);
  assert.ok(stats.reachableGeneratedTypes >= 2);
});

test("parser recognizes AngularHTTPBaseServerClass capability marker", () => {
  const specPath = path.join(fixtures, "ValidDevBridgeSpec.AnQst.d.ts");
  const parsed = parseSpecFile(specPath);
  assert.equal(parsed.supportsDevelopmentModeTransport, true);
  assert.equal(parsed.services[0].baseType, "AngularHTTPBaseServerClass");
});

test("verify fails on duplicate signatures", () => {
  const specPath = path.join(fixtures, "InvalidDuplicateSpec.AnQst.d.ts");
  const parsed = parseSpecFile(specPath);
  assert.throws(
    () => verifySpec(parsed),
    (err: unknown) =>
      err instanceof VerifyError && err.message.includes("Duplicate method signature")
  );
});

test("verify fails on cross-service duplicate member names", () => {
  const specPath = path.join(fixtures, "InvalidCrossServiceDuplicateSpec.AnQst.d.ts");
  const parsed = parseSpecFile(specPath);
  assert.throws(
    () => verifySpec(parsed),
    (err: unknown) =>
      err instanceof VerifyError && err.message.includes("Duplicate member name")
  );
});
