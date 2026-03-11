import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseSpecFile } from "../src/parser";
import { verifySpec } from "../src/verify";
import { formatVerifyError, VerifyError } from "../src/errors";

const fixtures = path.resolve(__dirname, "../../test/fixtures");

test("verify valid spec returns expected counts", () => {
  const specPath = path.join(fixtures, "ValidCdSpec.AnQst.d.ts");
  const parsed = parseSpecFile(specPath);
  const verification = verifySpec(parsed);
  const stats = verification.stats;
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

test("verify error formatting includes invalid header and indentation", () => {
  const specPath = path.join(fixtures, "InvalidDuplicateSpec.AnQst.d.ts");
  const parsed = parseSpecFile(specPath);
  try {
    verifySpec(parsed);
    assert.fail("Expected verifySpec to throw.");
  } catch (err: unknown) {
    assert.ok(err instanceof VerifyError);
    const formatted = formatVerifyError(err);
    const normalizedPath = specPath.split(path.sep).join("/");
    assert.match(formatted, new RegExp(`^\\nAnQst spec invalid: ${normalizedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n`));
    assert.match(formatted, /^(\nAnQst spec invalid: .+\n) {4}.+\n$/);
  }
});

test("parser rejects namespace import syntax in AnQst spec files", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-parser-imports-"));
  const specPath = path.join(tempRoot, "Widget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";
import * as Domain from "./types/domain";

declare namespace Widget {
  interface Payload {
    user: Domain.User;
  }
}
`,
    "utf8"
  );

  assert.throws(
    () => parseSpecFile(specPath),
    (err: unknown) => err instanceof VerifyError && err.message.includes("Namespace imports")
  );
});

test("parser rejects unresolved local import paths in AnQst spec files", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-parser-missing-import-"));
  const specPath = path.join(tempRoot, "Widget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";
import { User } from "./types/User";

declare namespace Widget {
  interface Payload {
    createdBy: User;
  }

  interface WidgetService extends AnQst.Service {
    validate(payload: Payload): AnQst.Call<boolean>;
  }
}
`,
    "utf8"
  );

  assert.throws(
    () => parseSpecFile(specPath),
    (err: unknown) =>
      err instanceof VerifyError &&
      err.message.includes("Unable to resolve import './types/User'")
  );
});

test("parser resolves call timeout config values", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-parser-timeout-config-"));
  const specPath = path.join(tempRoot, "Widget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace Widget {
  interface UserService extends AnQst.Service {
    getUserById(userId: string): AnQst.Call<string, { timeoutSeconds: 240 }>;
    badWord(word: string): AnQst.Emitter;
  }
}
`,
    "utf8"
  );
  const parsed = parseSpecFile(specPath);
  const callMember = parsed.services[0].members.find((m) => m.name === "getUserById");
  const emitterMember = parsed.services[0].members.find((m) => m.name === "badWord");
  assert.ok(callMember);
  assert.ok(emitterMember);
  assert.equal(callMember!.timeoutMs, 240000);
  assert.equal(emitterMember!.timeoutMs, 120000);
});

test("parser rejects emitter config parameters", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-parser-emitter-config-"));
  const specPath = path.join(tempRoot, "Widget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace Widget {
  interface UserService extends AnQst.Service {
    badWord(word: string): AnQst.Emitter<{ timeoutMilliseconds: 7500 }>;
  }
}
`,
    "utf8"
  );
  assert.throws(
    () => parseSpecFile(specPath),
    (err: unknown) => err instanceof VerifyError && err.message.includes("does not support config parameters")
  );
});

test("verify surfaces warning lines for unknown call config keys", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-parser-timeout-warning-"));
  const specPath = path.join(tempRoot, "Widget.AnQst.d.ts");
  fs.writeFileSync(
    specPath,
    `import { AnQst } from "AnQst-Spec-DSL";

declare namespace Widget {
  interface UserService extends AnQst.Service {
    getUserById(userId: string): AnQst.Call<string, { timeoutSeconds: 120; foo: 1; bar: 2 }>;
  }
}
`,
    "utf8"
  );
  const parsed = parseSpecFile(specPath);
  const verification = verifySpec(parsed);
  assert.equal(verification.warnings.length, 2);
  assert.match(verification.message, /\[warn\].+foo/);
  assert.match(verification.message, /\[warn\].+bar/);
});
