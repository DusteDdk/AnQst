import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runCommand, runVerify } from "../src/app";

const fixtures = path.resolve(__dirname, "../../test/fixtures");

test("verify success message format", () => {
  const specPath = path.join(fixtures, "ValidCdSpec.AnQst.d.ts");
  const result = runVerify(specPath);
  assert.match(result.message, /^Verification passed: Output would be: \d+ types, \d+ types across \d+ services$/);
});

test("unknown command exits with status 1", () => {
  const code = runCommand("unknown", "foo.AnQst.d.ts");
  assert.equal(code, 1);
});

function withTempProject(fn: (projectDir: string) => void): void {
  const prev = process.cwd();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-cli-"));
  try {
    process.chdir(dir);
    fn(dir);
  } finally {
    process.chdir(prev);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixtures, name), "utf8");
}

test("instill patches package scripts and scaffolds spec", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          scripts: {
            build: "ng build",
            test: "ng test"
          }
        },
        null,
        2
      ),
      "utf8"
    );

    const code = runCommand("instill", "BurgerConstructor");
    assert.equal(code, 0);

    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf8")) as {
      AnQst?: { spec?: string };
      scripts?: Record<string, string>;
    };
    assert.equal(pkg.AnQst?.spec, "BurgerConstructor.AnQst.d.ts");
    assert.equal(pkg.scripts?.build, "npx anqst build && ng build");
    assert.equal(pkg.scripts?.test, "npx anqst test && ng test");
    assert.ok(fs.existsSync(path.join(projectDir, "BurgerConstructor.AnQst.d.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "anqst-dsl/AnQst-Spec-DSL.d.ts")));
    const scaffold = fs.readFileSync(path.join(projectDir, "BurgerConstructor.AnQst.d.ts"), "utf8");
    assert.match(scaffold, /import\s+\{\s*AnQst\s*\}\s+from\s+"\.\/anqst-dsl\/AnQst-Spec-DSL";/);
  });
});

test("test command reads package AnQst spec and verifies", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "CdWidget.AnQst.d.ts"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    fs.writeFileSync(path.join(projectDir, "CdWidget.AnQst.d.ts"), readFixture("ValidCdSpec.AnQst.d.ts"), "utf8");

    const code = runCommand("test", undefined);
    assert.equal(code, 0);
  });
});

test("test command resolves project-local DSL import", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "LocalDslWidget.AnQst.d.ts"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    fs.mkdirSync(path.join(projectDir, "anqst-dsl"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, "anqst-dsl/AnQst-Spec-DSL.d.ts"),
      `export namespace AnQst { interface Service {} interface Call<T> { dummy: T } }`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(projectDir, "LocalDslWidget.AnQst.d.ts"),
      `import { AnQst } from "./anqst-dsl/AnQst-Spec-DSL";
declare namespace LocalDslWidget {
  interface DemoService extends AnQst.Service {
    ping(): AnQst.Call<string>;
  }
}`,
      "utf8"
    );

    const code = runCommand("test", undefined);
    assert.equal(code, 0);
  });
});

test("build command generates raw output and installs TypeScript", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "CdWidget.AnQst.d.ts"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(projectDir, "CdWidget.AnQst.d.ts"), readFixture("ValidCdSpec.AnQst.d.ts"), "utf8");

    const code = runCommand("build", undefined);
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/index.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/cpplibrary/CdWidget.qrc")));
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/cpplibrary/CdWidget.cpp")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/index.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/types/index.d.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "anqst-cmake/CMakeLists.txt")));
  });
});
