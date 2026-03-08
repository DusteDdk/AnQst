import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PNG } from "pngjs";
import { runClean, runCommand, runGenerate, runVerify } from "../src/app";

const fixtures = path.resolve(__dirname, "../../test/fixtures");
const defaultGenerateTargets = ["QWidget", "AngularService", "//DOM", "//node_express_ws"];
const anqstGenRoot = path.resolve(__dirname, "../..");
const activeStampPath = path.join(anqstGenRoot, ".anqstgen-version-active.json");

function withActiveStamp(stamp: string | null, fn: () => void): void {
  const existed = fs.existsSync(activeStampPath);
  const previous = existed ? fs.readFileSync(activeStampPath, "utf8") : "";
  try {
    if (stamp === null) {
      fs.rmSync(activeStampPath, { force: true });
    } else {
      fs.writeFileSync(activeStampPath, `${JSON.stringify({ active: stamp }, null, 2)}\n`, "utf8");
    }
    fn();
  } finally {
    if (existed) {
      fs.writeFileSync(activeStampPath, previous, "utf8");
    } else {
      fs.rmSync(activeStampPath, { force: true });
    }
  }
}

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

test("package root exposes AnQst type declarations", () => {
  const packageJsonPath = path.join(anqstGenRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    types?: string;
    exports?: Record<string, unknown>;
  };
  assert.equal(packageJson.types, "index.d.ts");
  const rootExport = packageJson.exports?.["."] as { types?: string } | undefined;
  assert.equal(rootExport?.types, "./index.d.ts");

  const indexDtsPath = path.join(anqstGenRoot, "index.d.ts");
  assert.ok(fs.existsSync(indexDtsPath));
  const indexDts = fs.readFileSync(indexDtsPath, "utf8");
  assert.match(indexDts, /export\s+\{\s*AnQst\s*\}\s+from\s+"\.\/spec\/AnQst-Spec-DSL";/);
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

function withFakeCmake(configureExitCode: number, buildExitCode: number, fn: (calls: string[]) => void): void {
  const toolsDir = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-fake-cmake-"));
  const cmakePath = path.join(toolsDir, "cmake");
  const logPath = path.join(toolsDir, "calls.log");
  fs.writeFileSync(
    cmakePath,
    `#!/usr/bin/env bash
set -euo pipefail
mode="configure"
for arg in "$@"; do
  if [ "$arg" = "--build" ]; then
    mode="build"
    break
  fi
done
echo "$mode:$*" >> "$ANQST_FAKE_CMAKE_LOG"
if [ "$mode" = "configure" ]; then
  exit "$ANQST_FAKE_CMAKE_CONFIGURE_EXIT"
fi
exit "$ANQST_FAKE_CMAKE_BUILD_EXIT"
`,
    "utf8"
  );
  fs.chmodSync(cmakePath, 0o755);

  const previousPath = process.env.PATH ?? "";
  const previousLog = process.env.ANQST_FAKE_CMAKE_LOG;
  const previousConfigureExit = process.env.ANQST_FAKE_CMAKE_CONFIGURE_EXIT;
  const previousBuildExit = process.env.ANQST_FAKE_CMAKE_BUILD_EXIT;
  process.env.PATH = `${toolsDir}:${previousPath}`;
  process.env.ANQST_FAKE_CMAKE_LOG = logPath;
  process.env.ANQST_FAKE_CMAKE_CONFIGURE_EXIT = String(configureExitCode);
  process.env.ANQST_FAKE_CMAKE_BUILD_EXIT = String(buildExitCode);
  try {
    fn(fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean) : []);
  } finally {
    process.env.PATH = previousPath;
    if (previousLog === undefined) delete process.env.ANQST_FAKE_CMAKE_LOG;
    else process.env.ANQST_FAKE_CMAKE_LOG = previousLog;
    if (previousConfigureExit === undefined) delete process.env.ANQST_FAKE_CMAKE_CONFIGURE_EXIT;
    else process.env.ANQST_FAKE_CMAKE_CONFIGURE_EXIT = previousConfigureExit;
    if (previousBuildExit === undefined) delete process.env.ANQST_FAKE_CMAKE_BUILD_EXIT;
    else process.env.ANQST_FAKE_CMAKE_BUILD_EXIT = previousBuildExit;
    fs.rmSync(toolsDir, { recursive: true, force: true });
  }
}

function withEnvVar(name: string, value: string | undefined, fn: () => void): void {
  const previous = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
  try {
    fn();
  } finally {
    if (previous === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previous;
    }
  }
}

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
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon type
  header.writeUInt16LE(1, 4); // frame count

  const entry = Buffer.alloc(16);
  entry[0] = 1; // width
  entry[1] = 1; // height
  entry[2] = 0; // color count
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(png.length, 8); // bytes in resource
  entry.writeUInt32LE(22, 12); // offset

  return Buffer.concat([header, entry, png]);
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
    const scaffold = fs.readFileSync(path.join(projectDir, "BurgerConstructor.AnQst.d.ts"), "utf8");
    assert.match(scaffold, /import\s+type\s+\{\s*AnQst\s*\}\s+from\s+"@dusted\/anqst";/);
  });
});

test("install alias routes to instill behavior", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          scripts: {}
        },
        null,
        2
      ),
      "utf8"
    );
    const code = runCommand("install", "BurgerConstructor");
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(projectDir, "BurgerConstructor.AnQst.d.ts")));
    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf8")) as {
      AnQst?: { spec?: string };
    };
    assert.equal(pkg.AnQst?.spec, "BurgerConstructor.AnQst.d.ts");
  });
});

test("instill updates only AnQst import for existing template", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          scripts: {}
        },
        null,
        2
      ),
      "utf8"
    );
    fs.writeFileSync(
      path.join(projectDir, "BurgerConstructor.AnQst.d.ts"),
      `import { AnQst } from "anqst";
declare namespace BurgerConstructor {
  interface DemoService extends AnQst.Service {
    ping(): AnQst.Call<string>;
  }
}
`,
      "utf8"
    );
    const code = runCommand("instill", "BurgerConstructor");
    assert.equal(code, 0);
    const scaffold = fs.readFileSync(path.join(projectDir, "BurgerConstructor.AnQst.d.ts"), "utf8");
    assert.match(scaffold, /import\s+type\s+\{\s*AnQst\s*\}\s+from\s+"@dusted\/anqst";/);
    assert.match(scaffold, /declare namespace BurgerConstructor/);
  });
});

test("instill namespace mismatch can adopt existing namespace", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          scripts: {}
        },
        null,
        2
      ),
      "utf8"
    );
    fs.writeFileSync(
      path.join(projectDir, "BurgerConstructor.AnQst.d.ts"),
      `import { AnQst } from "anqst";
declare namespace ExistingWidget {
  interface DemoService extends AnQst.Service {
    ping(): AnQst.Call<string>;
  }
}
`,
      "utf8"
    );
    const previousChoice = process.env.ANQST_INSTILL_WIDGET_NAME_CHOICE;
    process.env.ANQST_INSTILL_WIDGET_NAME_CHOICE = "namespace";
    try {
      const code = runCommand("instill", "BurgerConstructor");
      assert.equal(code, 0);
    } finally {
      if (previousChoice === undefined) delete process.env.ANQST_INSTILL_WIDGET_NAME_CHOICE;
      else process.env.ANQST_INSTILL_WIDGET_NAME_CHOICE = previousChoice;
    }

    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf8")) as {
      AnQst?: { spec?: string };
    };
    assert.equal(pkg.AnQst?.spec, "ExistingWidget.AnQst.d.ts");
    assert.equal(fs.existsSync(path.join(projectDir, "BurgerConstructor.AnQst.d.ts")), false);
    assert.ok(fs.existsSync(path.join(projectDir, "ExistingWidget.AnQst.d.ts")));
    const scaffold = fs.readFileSync(path.join(projectDir, "ExistingWidget.AnQst.d.ts"), "utf8");
    assert.match(scaffold, /import\s+type\s+\{\s*AnQst\s*\}\s+from\s+"@dusted\/anqst";/);
    assert.match(scaffold, /declare namespace ExistingWidget/);
  });
});

test("instill namespace mismatch defaults to argument in non-interactive mode", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          scripts: {}
        },
        null,
        2
      ),
      "utf8"
    );
    fs.writeFileSync(
      path.join(projectDir, "BurgerConstructor.AnQst.d.ts"),
      `import { AnQst } from "anqst";
declare namespace ExistingWidget {
  interface DemoService extends AnQst.Service {
    ping(): AnQst.Call<string>;
  }
}
`,
      "utf8"
    );
    const originalWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
      const code = runCommand("instill", "BurgerConstructor");
      assert.equal(code, 0);
    } finally {
      console.warn = originalWarn;
    }
    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf8")) as {
      AnQst?: { spec?: string };
    };
    assert.equal(pkg.AnQst?.spec, "BurgerConstructor.AnQst.d.ts");
    assert.ok(warnings.some((line) => line.includes("Non-interactive session; defaulting to 'BurgerConstructor'")));
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

test("test command verifies spec with npm package AnQst import", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "PackageDslWidget.AnQst.d.ts",
            generate: defaultGenerateTargets
          }
        },
        null,
        2
      ),
      "utf8"
    );
    fs.writeFileSync(
      path.join(projectDir, "PackageDslWidget.AnQst.d.ts"),
      `import type { AnQst } from "@dusted/anqst";
declare namespace PackageDslWidget {
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
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/services.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/types.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget/CdWidget.qrc")));
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget/CdWidget.cpp")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/index.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/services.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/types.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/types/index.d.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "anqst-cmake/CMakeLists.txt")));
  });
});

test("build command reads AnQstGen-owned active stamp and does not create project-local counter file", () => {
  withActiveStamp("6af0b49_dirty_build_3", () => {
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

      const originalLog = console.log;
      let captured = "";
      console.log = (...args: unknown[]) => {
        captured = args.map((arg) => String(arg)).join(" ");
      };
      const code = runCommand("build", undefined);
      console.log = originalLog;

      assert.equal(code, 0);
      assert.match(captured, /anqst version 6af0b49_dirty_build_3/);
      assert.equal(fs.existsSync(path.join(projectDir, ".anqst-build-counts.json")), false);
    });
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
      "\nAnQst spec CdWidget.AnQst.d.ts built.\n    Services CdService are available from src/anqst-generated/services.\n    Generated types are available from src/anqst-generated/types.\n    Widget library available in generated_output/CdWidget_QtWidget.\n"
    );
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/index.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/services.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/types.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/index.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/services.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/types.ts")));
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
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/services.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/types.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/index.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/services.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated/types.ts")));
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
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/services.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/types.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated/index.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated/services.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated/types.ts")), false);
  });
});

test("build with only node_express_ws emits backend module only", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "CdWidget.AnQst.d.ts",
            generate: ["node_express_ws"]
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
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_node_express_ws/index.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_node_express_ws/types/index.d.ts")));
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/index.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated/index.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget/CdWidget.cpp")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "anqst-cmake/CMakeLists.txt")), false);
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
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/services.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/types.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget/CdWidget.cpp")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated/index.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated/services.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated/types.ts")), false);
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
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/services.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/npmpackage/types.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated/index.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated/services.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated/types.ts")), false);
  });
});

test("commands reject --backend flag", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(path.join(projectDir, "CdWidget.AnQst.d.ts"), readFixture("ValidCdSpec.AnQst.d.ts"), "utf8");
    const originalError = console.error;
    const lines: string[] = [];
    console.error = (...args: unknown[]) => {
      lines.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
      assert.equal(runCommand("verify", "CdWidget.AnQst.d.ts", ["--backend", "tsc"]), 1);
      assert.equal(runCommand("generate", "CdWidget.AnQst.d.ts", ["--backend", "tsc"]), 1);
      assert.equal(runCommand("build", "--backend", ["tsc"]), 1);
    } finally {
      console.error = originalError;
    }
    assert.ok(lines.some((line) => line.includes("--backend flag has been removed")));
  });
});

test("tsc backend resolves z.infer payloads with TypeChecker output", () => {
  withTempProject((projectDir) => {
    fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, "zod-shim.d.ts"),
      `declare namespace z {
  interface ZodType<TOut> {
    readonly _output: TOut;
  }
  type infer<T extends ZodType<any>> = T["_output"];
  type ZodObject<TShape extends Record<string, any>> = ZodType<TShape>;
}
`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(projectDir, "ZInferWidget.AnQst.d.ts"),
      `/// <reference path="./zod-shim.d.ts" />
import { AnQst } from "anqst";

declare namespace ZInferWidget {
  const UserSchema: z.ZodObject<{
    id: string;
    displayName: string;
  }>;

  interface DemoService extends AnQst.Service {
    load(payload: z.infer<typeof UserSchema>): AnQst.Call<z.infer<typeof UserSchema>>;
  }
}
`,
      "utf8"
    );

    const code = runCommand("generate", "ZInferWidget.AnQst.d.ts");
    assert.equal(code, 0);

    const headerPath = path.join(projectDir, "generated_output/ZInferWidget_QtWidget/include/ZInferWidgetTypes.h");
    assert.ok(fs.existsSync(headerPath));
    const header = fs.readFileSync(headerPath, "utf8");
    assert.doesNotMatch(header, /z\.infer</);
    assert.doesNotMatch(header, /typeof UserSchema/);
    assert.match(header, /id/);
    assert.match(header, /displayName/);
  });
});

test("generate command emits configured artifacts", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify({ name: "tmp-widget", version: "1.0.0", AnQst: { spec: "CdWidget.AnQst.d.ts", generate: ["QWidget"] } }, null, 2),
      "utf8"
    );
    fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(projectDir, "CdWidget.AnQst.d.ts"), readFixture("ValidCdSpec.AnQst.d.ts"), "utf8");
    const result = runGenerate("CdWidget.AnQst.d.ts");
    assert.match(result.message, /Widget library available in generated_output\/CdWidget_QtWidget/);
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget/CdWidget.cpp")));
    assert.equal(fs.existsSync(path.join(projectDir, "src/anqst-generated")), false);
  });
});

test("build command emits all configured artifacts including AngularService", () => {
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
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget/CdWidget.cpp")));
    assert.ok(fs.existsSync(path.join(projectDir, "src/anqst-generated")));
    assert.ok(fs.existsSync(path.join(projectDir, "anqst-cmake/CMakeLists.txt")));
  });
});

test("build command emits node_express_ws when configured", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "CdWidget.AnQst.d.ts",
            generate: ["node_express_ws"]
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
    assert.ok(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_node_express_ws/index.ts")));
    assert.equal(fs.existsSync(path.join(projectDir, "generated_output/CdWidget_QtWidget/CdWidget.cpp")), false);
  });
});

test("build command accepts --designerplugin flag forms", () => {
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

    // false forms — no cmake build attempted, exit 0
    assert.equal(runCommand("build", "--designerplugin=false"), 0);
    assert.equal(runCommand("build", "--designerplugin", ["false"]), 0);

    // --backend is now rejected with exit 1
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...args: unknown[]) => {
      errors.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
      assert.equal(runCommand("build", "--backend", ["tsc"]), 1);
    } finally {
      console.error = originalError;
    }
    assert.ok(errors.some((line) => line.includes("--backend flag has been removed")));
  });
});

test("build command warns and ignores --designerplugin when QWidget target is off", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "CdWidget.AnQst.d.ts",
            generate: ["node_express_ws"]
          }
        },
        null,
        2
      ),
      "utf8"
    );
    fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(projectDir, "CdWidget.AnQst.d.ts"), readFixture("ValidCdSpec.AnQst.d.ts"), "utf8");
    const originalWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
      const code = runCommand("build", "--designerplugin");
      assert.equal(code, 0);
    } finally {
      console.warn = originalWarn;
    }
    assert.ok(warnings.some((line) => line.includes("QWidget target is not enabled")));
  });
});

test("build command runs cmake configure/build when --designerplugin is enabled for tsc QWidget", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "CdWidget.AnQst.d.ts",
            generate: ["QWidget"],
            widgetCategory: "Custom Category"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "dist", "webapp", "browser"), { recursive: true });
    const distPng = createSolidPng(255, 0, 0);
    const srcPng = createSolidPng(0, 0, 255);
    fs.writeFileSync(path.join(projectDir, "dist", "webapp", "browser", "favicon.ico"), createIcoFromPng(distPng));
    fs.writeFileSync(path.join(projectDir, "src", "favicon.ico"), createIcoFromPng(srcPng));
    fs.writeFileSync(path.join(projectDir, "CdWidget.AnQst.d.ts"), readFixture("ValidCdSpec.AnQst.d.ts"), "utf8");
    withEnvVar("ANQST_WEBBASE_DIR", "/tmp/anqst-webbase", () => {
      withFakeCmake(0, 0, () => {
        const originalLog = console.log;
        const logs: string[] = [];
        console.log = (...args: unknown[]) => {
          logs.push(args.map((arg) => String(arg)).join(" "));
        };
        try {
          const code = runCommand("build", "--designerplugin");
          assert.equal(code, 0);
        } finally {
          console.log = originalLog;
        }
        const calls = fs.readFileSync(process.env.ANQST_FAKE_CMAKE_LOG!, "utf8").trim().split("\n").filter(Boolean);
        assert.equal(calls.length, 2);
        assert.ok(calls[0].startsWith("configure:"));
        assert.match(calls[0], /-DCMAKE_BUILD_TYPE=Release/);
        assert.match(calls[0], /-DANQST_WEBBASE_DIR=\/tmp\/anqst-webbase/);
        assert.match(calls[0], /anqst-cmake\/designerplugin/);
        assert.match(calls[0], /anqst-cmake\/build-designerplugin/);
        assert.ok(calls[1].startsWith("build:"));
        assert.match(calls[1], /--config Release/);
        const pluginCpp = fs.readFileSync(path.join(projectDir, "anqst-cmake/designerplugin/CdWidgetDesignerPlugin.cpp"), "utf8");
        assert.match(pluginCpp, /#include "CdWidgetDesignerPlugin\.moc"/);
        assert.match(pluginCpp, /QString group\(\) const override \{ return QStringLiteral\("Custom Category"\); \}/);
        assert.match(pluginCpp, /QIcon\(QStringLiteral\(":\/anqstdesignerplugin\/plugin-icon\.png"\)\)/);
        const pluginCmake = fs.readFileSync(path.join(projectDir, "anqst-cmake/designerplugin/CMakeLists.txt"), "utf8");
        assert.match(pluginCmake, /"\$\{ANQST_WIDGET_DIR\}"/);
        assert.match(pluginCmake, /"\$\{ANQST_WIDGET_DIR\}\/include"/);
        assert.match(pluginCmake, /designerplugin\.qrc/);
        assert.ok(
          pluginCmake.indexOf("find_package(Qt5 REQUIRED COMPONENTS Core Widgets UiPlugin)")
            < pluginCmake.indexOf('add_subdirectory("${ANQST_WIDGET_DIR}"'),
          "Qt5 discovery should happen before widget add_subdirectory for AUTOMOC correctness"
        );
        const pluginIcon = fs.readFileSync(path.join(projectDir, "anqst-cmake", "designerplugin", "plugin-icon.png"));
        assert.deepEqual(pluginIcon, distPng, "dist favicon should be preferred over src/favicon.ico");
        const pluginQrc = fs.readFileSync(path.join(projectDir, "anqst-cmake", "designerplugin", "designerplugin.qrc"), "utf8");
        assert.match(pluginQrc, /plugin-icon\.png/);
        const capturedLogs = logs.join("\n");
        assert.match(capturedLogs, /Plugin binary: anqst-cmake\/build-designerplugin\/CdWidgetDesignerPlugin\.(so|dylib|dll)/);
        assert.match(capturedLogs, /Install target dir: <QT_INSTALL_PLUGINS>\/designer/);
        assert.match(capturedLogs, /Discover QT_INSTALL_PLUGINS: qmake -query QT_INSTALL_PLUGINS/);
        assert.match(capturedLogs, /User-local install: mkdir -p "\$HOME\/\.local\/lib\/qt5\/plugins\/designer" && cp anqst-cmake\/build-designerplugin\/CdWidgetDesignerPlugin\.(so|dylib|dll) "\$HOME\/\.local\/lib\/qt5\/plugins\/designer\/"/);
      });
    });
  });
});

test("build command fails when AnQst.widgetCategory is not a string", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(
      path.join(projectDir, "package.json"),
      JSON.stringify(
        {
          name: "tmp-widget",
          version: "1.0.0",
          AnQst: {
            spec: "CdWidget.AnQst.d.ts",
            generate: ["QWidget"],
            widgetCategory: 42
          }
        },
        null,
        2
      ),
      "utf8"
    );
    fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(projectDir, "CdWidget.AnQst.d.ts"), readFixture("ValidCdSpec.AnQst.d.ts"), "utf8");
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...args: unknown[]) => {
      errors.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
      withEnvVar("ANQST_WEBBASE_DIR", "/tmp/anqst-webbase", () => {
        withFakeCmake(0, 0, () => {
          const code = runCommand("build", "--designerplugin");
          assert.equal(code, 1);
        });
      });
    } finally {
      console.error = originalError;
    }
    assert.ok(errors.some((line) => line.includes("Invalid package.json key 'AnQst.widgetCategory'")));
  });
});

test("build command without --designerplugin does not run cmake or generate designer plugin files", () => {
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
    withEnvVar("ANQST_WEBBASE_DIR", "/tmp/anqst-webbase", () => {
      withFakeCmake(0, 0, () => {
        const code = runCommand("build", undefined);
        assert.equal(code, 0);
        const logPath = process.env.ANQST_FAKE_CMAKE_LOG!;
        const calls = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean) : [];
        assert.equal(calls.length, 0);
        assert.equal(fs.existsSync(path.join(projectDir, "anqst-cmake/designerplugin/CMakeLists.txt")), false);
      });
    });
  });
});

test("build command fails when designer plugin cmake build fails", () => {
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
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...args: unknown[]) => {
      errors.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
      withEnvVar("ANQST_WEBBASE_DIR", "/tmp/anqst-webbase", () => {
        withFakeCmake(0, 1, () => {
          const code = runCommand("build", "--designerplugin");
          assert.equal(code, 1);
        });
      });
    } finally {
      console.error = originalError;
    }
    assert.ok(errors.some((line) => line.includes("CMake build failed while compiling Qt Designer plugin")));
  });
});

test("build command fails when --designerplugin is enabled without ANQST_WEBBASE_DIR", () => {
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
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...args: unknown[]) => {
      errors.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
      withEnvVar("ANQST_WEBBASE_DIR", undefined, () => {
        const code = runCommand("build", "--designerplugin");
        assert.equal(code, 1);
      });
    } finally {
      console.error = originalError;
    }
    assert.ok(errors.some((line) => line.includes("Missing ANQST_WEBBASE_DIR environment variable")));
  });
});

test("generate command rejects --backend flag", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(path.join(projectDir, "CdWidget.AnQst.d.ts"), readFixture("ValidCdSpec.AnQst.d.ts"), "utf8");
    const originalError = console.error;
    const lines: string[] = [];
    console.error = (...args: unknown[]) => {
      lines.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
      const code = runCommand("generate", "CdWidget.AnQst.d.ts", ["--backend", "tsc"]);
      assert.equal(code, 1);
    } finally {
      console.error = originalError;
    }
    assert.ok(lines.some((line) => line.includes("--backend flag has been removed")));
  });
});
