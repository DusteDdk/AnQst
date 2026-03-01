import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runClean, runCommand, runGenerate, runVerify } from "../src/app";

const fixtures = path.resolve(__dirname, "../../test/fixtures");
const defaultGenerateTargets = ["QWidget", "AngularService", "//DOM", "//node_express_ws"];

test("verify success message format", () => {
  const specPath = path.join(fixtures, "ValidCdSpec.AnQst.d.ts");
  const result = runVerify(specPath);
  assert.match(result.message, /^AnQst spec valid:\n {4}\d+ types\.\n {4}\d+ services\.$/);
});

test("unknown command exits with status 1", () => {
  const originalError = console.error;
  const lines: string[] = [];
  console.error = (...args: unknown[]) => {
    lines.push(args.map((arg) => String(arg)).join(" "));
  };
  const code = runCommand("unknown", "foo.AnQst.d.ts");
  console.error = originalError;
  const captured = lines.join("\n");
  assert.equal(code, 1);
  assert.match(captured, /unknown command 'unknown'/);
  assert.match(captured, /Usage:/);
  assert.match(captured, /clean <path>/);
});

test("help option exits with status 0 and prints command list", () => {
  const originalLog = console.log;
  let captured = "";
  console.log = (...args: unknown[]) => {
    captured = args.map((arg) => String(arg)).join(" ");
  };
  const code = runCommand("--help", undefined);
  console.log = originalLog;
  assert.equal(code, 0);
  assert.match(captured, /Usage:/);
  assert.match(captured, /Commands:/);
  assert.match(captured, /instill <WidgetName>/);
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
      AnQst?: { spec?: string; generate?: string[] };
      scripts?: Record<string, string>;
    };
    assert.equal(pkg.AnQst?.spec, "BurgerConstructor.AnQst.d.ts");
    assert.deepEqual(pkg.AnQst?.generate, defaultGenerateTargets);
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
            spec: "CdWidget.AnQst.d.ts",
            generate: defaultGenerateTargets
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
            spec: "LocalDslWidget.AnQst.d.ts",
            generate: defaultGenerateTargets
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
            spec: "CdWidget.AnQst.d.ts",
            generate: defaultGenerateTargets
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
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget/CdWidget.qrc")));
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget/CdWidget.cpp")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/index.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/types/index.d.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "anqst-cmake/CMakeLists.txt")));
  });
});

test("generate command verifies and returns build summary message", () => {
  withTempProject((projectDir) => {
    fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(projectDir, "CdWidget.AnQst.d.ts"), readFixture("ValidCdSpec.AnQst.d.ts"), "utf8");

    const result = runGenerate("CdWidget.AnQst.d.ts");
    assert.match(result.verificationMessage ?? "", /^AnQst spec valid:\n {4}\d+ types\.\n {4}\d+ services\.$/);
    assert.equal(
      result.message,
      "\nAnQst spec CdWidget.AnQst.d.ts built.\n    Services CdService are available for import from src/anqst-generated.\n    Widget library available in generated_output/CdWidget_QtWidget.\n"
    );
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/index.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/index.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget/CdWidget.cpp")));
  });
});

test("clean command requires path argument", () => {
  const code = runCommand("clean", undefined);
  assert.equal(code, 1);
});

test("clean without --force fails when package.json is missing", () => {
  withTempProject((projectDir) => {
    assert.throws(
      () => runClean(projectDir, false),
      (err: unknown) =>
        err instanceof Error &&
        err.message.includes("Use 'anqst clean") &&
        err.message.includes("--force")
    );
  });
});

test("clean without --force fails when package.json lacks AnQst key", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ name: "tmp-widget", version: "1.0.0" }, null, 2),
      "utf8"
    );
    assert.throws(
      () => runClean(projectDir, false),
      (err: unknown) =>
        err instanceof Error &&
        err.message.includes("Use 'anqst clean") &&
        err.message.includes("--force")
    );
  });
});

test("clean without --force removes only widget-scoped directories", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "CdWidget.AnQst.d.ts",
            generate: defaultGenerateTargets
          }
        },
        null,
        2
      ),
      "utf8"
    );
    fs.writeFileSync(path.join(projectDir, "CdWidget.AnQst.d.ts"), readFixture("ValidCdSpec.AnQst.d.ts"), "utf8");
    fs.mkdirSync(path.join(projectDir, "generated_output/CdWidget_QtWidget"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "generated_output/OtherWidget_QtWidget"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "src/anqst-generated"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "anqst-cmake"), { recursive: true });

    const code = runCommand("clean", ".");
    assert.equal(code, 0);
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "anqst-cmake")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/OtherWidget_QtWidget")), true);
  });
});

test("clean with --force performs broad cleanup even with AnQst key", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "CdWidget.AnQst.d.ts",
            generate: defaultGenerateTargets
          }
        },
        null,
        2
      ),
      "utf8"
    );
    fs.writeFileSync(path.join(projectDir, "CdWidget.AnQst.d.ts"), readFixture("ValidCdSpec.AnQst.d.ts"), "utf8");
    fs.mkdirSync(path.join(projectDir, "generated_output/OtherWidget_QtWidget"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "src/anqst-generated"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "anqst-cmake"), { recursive: true });

    const code = runCommand("clean", ".", ["--force"]);
    assert.equal(code, 0);
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "anqst-cmake")), false);
  });
});

test("clean summary includes deleted, not found, and failed buckets", () => {
  withTempProject((projectDir) => {
    fs.mkdirSync(path.join(projectDir, "generated_output"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "src/anqst-generated"), { recursive: true });
    fs.writeFileSync(path.join(projectDir, "anqst-cmake"), "not a directory", "utf8");

    const result = runClean(projectDir, true);
    assert.equal(result.hadFailures, true);
    assert.match(result.message, /Deleted \(2\)/);
    assert.doesNotMatch(result.message, /Not found \(0\)/);
    assert.match(result.message, /Failed \(1\)/);
    assert.match(result.message, /anqst-cmake: Path exists but is not a directory\./);
  });
});

test("build with only AngularService skips QWidget artifacts", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "CdWidget.AnQst.d.ts",
            generate: ["AngularService"]
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
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/index.ts")));
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "anqst-cmake/CMakeLists.txt")), false);
  });
});

test("build with only QWidget skips TypeScript generation", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "CdWidget.AnQst.d.ts",
            generate: ["QWidget"]
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
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget/CdWidget.cpp")));
    assert.ok(fs.existsSync(path.join(projectDir, "anqst-cmake/CMakeLists.txt")));
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/index.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated/index.ts")), false);
  });
});

test("build with empty generate list emits nothing", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "CdWidget.AnQst.d.ts",
            generate: []
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
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/index.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget/CdWidget.cpp")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated/index.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "anqst-cmake/CMakeLists.txt")), false);
  });
});

test("generate command honors package AnQst.generate", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "CdWidget.AnQst.d.ts",
            generate: ["QWidget"]
          }
        },
        null,
        2
      ),
      "utf8"
    );
    fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(projectDir, "CdWidget.AnQst.d.ts"), readFixture("ValidCdSpec.AnQst.d.ts"), "utf8");

    const result = runGenerate("CdWidget.AnQst.d.ts");
    assert.match(result.verificationMessage ?? "", /^AnQst spec valid:\n {4}\d+ types\.\n {4}\d+ services\.$/);
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget/CdWidget.cpp")));
    assert.ok(fs.existsSync(path.join(projectDir, "anqst-cmake/CMakeLists.txt")));
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/index.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated/index.ts")), false);
  });
});
