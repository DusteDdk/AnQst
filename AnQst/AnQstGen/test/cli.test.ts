import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PNG } from "pngjs";
import { runClean, runCommand, runGenerate, runVerify } from "../src/app";
import { ANQST_LAYOUT_VERSION } from "../src/layout";
import { getProgramDiagnostics } from "../src/program";

const fixtures = path.resolve(__dirname, "../../test/fixtures");
const defaultGenerateTargets = ["QWidget", "AngularService", "VanillaTS", "VanillaJS", "node_express_ws"];
const anqstGenRoot = path.resolve(__dirname, "../..");
const activeStampPath = path.join(anqstGenRoot, ".anqstgen-version-active.json");

interface SettingsShape {
  layoutVersion: number;
  widgetName: string;
  spec: string;
  generate: string[];
  widgetCategory?: string;
}

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

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function settingsRelativePath(widgetName: string): string {
  return `./AnQst/${widgetName}.settings.json`;
}

function writeProjectPackage(projectDir: string, packageJson: Record<string, unknown>): void {
  fs.writeFileSync(path.join(projectDir, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

function writeProjectTsConfig(projectDir: string): void {
  fs.writeFileSync(
    path.join(projectDir, "tsconfig.json"),
    `${JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "CommonJS"
      },
      include: ["src/**/*.ts"]
    }, null, 2)}\n`,
    "utf8"
  );
}

function writeSettings(projectDir: string, settings: SettingsShape): string {
  const settingsPath = path.join(projectDir, "AnQst", `${settings.widgetName}.settings.json`);
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  return settingsPath;
}

function configureInstilledProject(
  projectDir: string,
  options: {
    widgetName?: string;
    generate?: string[];
    widgetCategory?: unknown;
    layoutVersion?: number;
    specPath?: string;
    packageAnQst?: unknown;
  } = {}
): { widgetName: string; specPath: string; settingsPath: string } {
  const widgetName = options.widgetName ?? "CdWidget";
  const specPath = options.specPath ?? `./AnQst/${widgetName}.AnQst.d.ts`;
  const generate = options.generate ?? [...defaultGenerateTargets];
  const settings: SettingsShape = {
    layoutVersion: options.layoutVersion ?? ANQST_LAYOUT_VERSION,
    widgetName,
    spec: specPath,
    generate,
    widgetCategory: typeof options.widgetCategory === "string" ? options.widgetCategory : "AnQst Widgets"
  };
  const settingsPath = writeSettings(projectDir, settings);

  fs.writeFileSync(path.join(projectDir, "AnQst", `${widgetName}.AnQst.d.ts`), readFixture("ValidCdSpec.AnQst.d.ts"), "utf8");
  writeProjectPackage(projectDir, {
    name: "tmp-widget",
    version: "1.0.0",
    AnQst: options.packageAnQst ?? settingsRelativePath(widgetName)
  });

  return { widgetName, specPath, settingsPath };
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
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = 1;
  entry[1] = 1;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);

  return Buffer.concat([header, entry, png]);
}

function withFakeCmake(configureExitCode: number, buildExitCode: number, fn: (logPath: string) => void): void {
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
    fn(logPath);
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
  assert.match(captured, /anqst version /);
  assert.match(captured, /Commands:/);
  assert.match(captured, /instill <WidgetName>/);
  assert.match(captured, /-v, --version/);
});

test("version option exits with status 0 and prints version", () => {
  const originalLog = console.log;
  let captured = "";
  console.log = (...args: unknown[]) => {
    captured = args.map((arg) => String(arg)).join(" ");
  };
  const code = runCommand("--version", undefined);
  console.log = originalLog;
  assert.equal(code, 0);
  assert.match(captured, /^anqst version /);
});

test("package root exposes AnQst type declarations", () => {
  const packageJson = readJsonFile<{ types?: string; exports?: Record<string, unknown> }>(path.join(anqstGenRoot, "package.json"));
  assert.equal(packageJson.types, "index.d.ts");
  const rootExport = packageJson.exports?.["."] as { types?: string } | undefined;
  assert.equal(rootExport?.types, "./index.d.ts");

  const indexDtsPath = path.join(anqstGenRoot, "index.d.ts");
  assert.ok(fs.existsSync(indexDtsPath));
  const indexDts = fs.readFileSync(indexDtsPath, "utf8");
  assert.match(indexDts, /export\s+\{\s*AnQst\s*\}\s+from\s+"\.\/spec\/AnQst-Spec-DSL";/);
});

test("instill creates AnQst root, settings, hooks, and tsconfig mapping", () => {
  withTempProject((projectDir) => {
    writeProjectPackage(projectDir, {
      name: "tmp-widget",
      version: "1.0.0",
      scripts: {
        build: "ng build",
        start: "ng serve"
      }
    });
    writeProjectTsConfig(projectDir);

    const code = runCommand("instill", "BurgerConstructor");
    assert.equal(code, 0);

    const pkg = readJsonFile<{ AnQst?: unknown; scripts?: Record<string, string> }>(path.join(projectDir, "package.json"));
    assert.equal(pkg.AnQst, "./AnQst/BurgerConstructor.settings.json");
    assert.equal(pkg.scripts?.build, "ng build");
    assert.equal(pkg.scripts?.start, "ng serve");
    assert.equal(pkg.scripts?.postinstall, "npx anqst build");
    assert.equal(pkg.scripts?.prebuild, "npx anqst build");
    assert.equal(pkg.scripts?.prestart, "npx anqst build");

    const settings = readJsonFile<SettingsShape>(path.join(projectDir, "AnQst", "BurgerConstructor.settings.json"));
    assert.equal(settings.layoutVersion, ANQST_LAYOUT_VERSION);
    assert.equal(settings.widgetName, "BurgerConstructor");
    assert.equal(settings.spec, "./AnQst/BurgerConstructor.AnQst.d.ts");
    assert.deepEqual(settings.generate, defaultGenerateTargets);

    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "BurgerConstructor.AnQst.d.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "README.md")));
    assert.equal(fs.readFileSync(path.join(projectDir, "AnQst", ".gitignore"), "utf8"), "/generated*\n");

    const tsConfig = readJsonFile<{
      compilerOptions?: {
        baseUrl?: string;
        paths?: Record<string, string[]>;
      };
      include?: string[];
    }>(path.join(projectDir, "tsconfig.json"));
    assert.equal(tsConfig.compilerOptions?.baseUrl, ".");
    assert.deepEqual(tsConfig.compilerOptions?.paths?.["anqst-generated/*"], [
      "AnQst/generated/frontend/BurgerConstructor_Angular/*"
    ]);
    assert.ok(tsConfig.include?.includes("AnQst/generated/frontend/BurgerConstructor_Angular/**/*.d.ts"));
  });
});

test("install alias routes to instill behavior", () => {
  withTempProject((projectDir) => {
    writeProjectPackage(projectDir, { name: "tmp-widget", version: "1.0.0" });
    const code = runCommand("install", "BurgerConstructor");
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "BurgerConstructor.AnQst.d.ts")));
  });
});

test("test command reads settings path from package.json.AnQst", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir);
    const code = runCommand("test", undefined);
    assert.equal(code, 0);
  });
});

test("build command emits outputs only under AnQst/generated", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir);
    const code = runCommand("build", undefined);
    assert.equal(code, 0);

    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_Angular", "index.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_VanillaTS", "index.js")));
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_VanillaTS", "index.d.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_VanillaJS", "index.js")));
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "cpp", "qt", "CdWidget_widget", "CdWidget.cpp")));
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "cpp", "cmake", "CMakeLists.txt")));
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "node", "express", "CdWidget_anQst", "index.ts")));

    assert.equal(fs.existsSync(path.join(projectDir, "generated_output")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "anqst-cmake")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "src", "anqst-generated")), false);
  });
});

test("build command advertises direct C++ handoff and emits wrapper integration CMake", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir, { generate: ["QWidget"] });
    const originalLog = console.log;
    let captured = "";
    console.log = (...args: unknown[]) => {
      captured = args.map((arg) => String(arg)).join(" ");
    };
    try {
      const code = runCommand("build", undefined);
      assert.equal(code, 0);
    } finally {
      console.log = originalLog;
    }

    const cmakePath = path.join(projectDir, "AnQst", "generated", "backend", "cpp", "cmake", "CMakeLists.txt");
    const cmake = fs.readFileSync(cmakePath, "utf8");
    assert.match(captured, /C\+\+ handoff: downstream CMake consumes this generated tree directly/);
    assert.match(cmake, /add_subdirectory\("\$\{ANQST_GENERATED_WIDGET_DIR\}" "\$\{ANQST_GENERATED_WIDGET_BINARY_DIR\}"\)/);
    assert.doesNotMatch(cmake, /ANQST_USE_PREGENERATED/);
  });
});

test("build command reads active stamp from generator workspace", () => {
  withActiveStamp("6af0b49_dirty_build_3", () => {
    withTempProject((projectDir) => {
      configureInstilledProject(projectDir);
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

test("generate command verifies and emits into AnQst/generated", () => {
  withTempProject((projectDir) => {
    fs.writeFileSync(path.join(projectDir, "CdWidget.AnQst.d.ts"), readFixture("ValidCdSpec.AnQst.d.ts"), "utf8");
    const result = runGenerate("CdWidget.AnQst.d.ts");
    assert.match(result.verificationMessage ?? "", /^AnQst spec valid:\n {4}\d+ types\.\n {4}\d+ services\.$/);
    assert.match(result.message, /Widget library available in AnQst\/generated\/backend\/cpp\/qt\/CdWidget_widget/);
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_Angular", "index.ts")));
  });
});

test("build target selection works for AngularService only", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir, { generate: ["AngularService"] });
    const code = runCommand("build", undefined);
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_Angular", "index.ts")));
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_VanillaTS")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_VanillaJS")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "cpp", "qt", "CdWidget_widget")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "node", "express", "CdWidget_anQst")), false);
  });
});

test("build target selection works for VanillaTS only", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir, { generate: ["VanillaTS"] });
    const code = runCommand("build", undefined);
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_VanillaTS", "index.js")));
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_VanillaTS", "index.d.ts")));
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_Angular")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_VanillaJS")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "cpp", "qt", "CdWidget_widget")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "node", "express", "CdWidget_anQst")), false);
  });
});

test("build target selection works for VanillaJS only", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir, { generate: ["VanillaJS"] });
    const code = runCommand("build", undefined);
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_VanillaJS", "index.js")));
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_VanillaJS", "index.d.ts")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_Angular")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_VanillaTS")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "cpp", "qt", "CdWidget_widget")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "node", "express", "CdWidget_anQst")), false);
  });
});

test("spec analysis ignores unrelated app sources before generated imports exist", () => {
  withTempProject((projectDir) => {
    const { specPath, widgetName } = configureInstilledProject(projectDir, { generate: ["AngularService"] });
    fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, "src", "app.ts"),
      `import { Playback } from "anqst-generated/services";

export const serviceToken = Playback;
`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(projectDir, "tsconfig.json"),
      `${JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "CommonJS",
          baseUrl: ".",
          paths: {
            "AnQst-Spec-DSL": [
              path.relative(projectDir, path.join(anqstGenRoot, "spec", "AnQst-Spec-DSL.d.ts"))
            ],
            "anqst-generated/*": [`AnQst/generated/frontend/${widgetName}_Angular/*`]
          }
        },
        include: ["src/**/*.ts"]
      }, null, 2)}\n`,
      "utf8"
    );

    const diagnostics = getProgramDiagnostics(specPath);
    assert.equal(diagnostics.some((line) => line.includes("anqst-generated/services")), false);

    const code = runCommand("build", undefined);
    assert.equal(code, 0);
  });
});

test("build target selection works for QWidget only", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir, { generate: ["QWidget"] });
    const code = runCommand("build", undefined);
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "cpp", "qt", "CdWidget_widget", "CdWidget.cpp")));
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "cpp", "cmake", "CMakeLists.txt")));
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_Angular")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "node", "express", "CdWidget_anQst")), false);
  });
});

test("build target selection works for node_express_ws only", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir, { generate: ["node_express_ws"] });
    const code = runCommand("build", undefined);
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "node", "express", "CdWidget_anQst", "index.ts")));
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_Angular")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "cpp", "qt", "CdWidget_widget")), false);
  });
});

test("build with empty generate list emits nothing", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir, { generate: [] });
    const code = runCommand("build", undefined);
    assert.equal(code, 0);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_Angular")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_VanillaTS")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_VanillaJS")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "cpp", "qt", "CdWidget_widget")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "node", "express", "CdWidget_anQst")), false);
  });
});

test("build validates settings widgetName against parsed namespace", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir, { widgetName: "OtherWidget" });
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...args: unknown[]) => {
      errors.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
      const code = runCommand("build", undefined);
      assert.equal(code, 1);
    } finally {
      console.error = originalError;
    }
    assert.ok(errors.some((line) => line.includes("does not match spec namespace")));
  });
});

test("clean command requires path argument", () => {
  const code = runCommand("clean", undefined);
  assert.equal(code, 1);
});

test("clean without --force requires package settings", () => {
  withTempProject((projectDir) => {
    assert.throws(() => runClean(projectDir, false), (err: unknown) => err instanceof Error && err.message.includes("No package.json"));
  });
});

test("clean with --force removes AnQst/generated", () => {
  withTempProject((projectDir) => {
    fs.mkdirSync(path.join(projectDir, "AnQst", "generated", "frontend", "X"), { recursive: true });
    const code = runCommand("clean", ".", ["--force"]);
    assert.equal(code, 0);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated")), false);
  });
});

test("clean without --force removes widget-scoped directories", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir, { widgetName: "CdWidget" });
    fs.mkdirSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_Angular"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "AnQst", "generated", "backend", "node", "express", "CdWidget_anQst"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "AnQst", "generated", "backend", "cpp", "qt", "CdWidget_widget"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "AnQst", "generated", "backend", "cpp", "qt", "Other_widget"), { recursive: true });

    const code = runCommand("clean", ".");
    assert.equal(code, 0);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "frontend", "CdWidget_Angular")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "node", "express", "CdWidget_anQst")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "cpp", "qt", "CdWidget_widget")), false);
    assert.equal(fs.existsSync(path.join(projectDir, "AnQst", "generated", "backend", "cpp", "qt", "Other_widget")), true);
  });
});

test("build command warns and ignores --designerplugin when QWidget target is off", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir, { generate: ["node_express_ws"] });
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

test("build command runs cmake configure/build when --designerplugin is enabled", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir, { generate: ["QWidget"], widgetCategory: "Custom Category" });
    fs.mkdirSync(path.join(projectDir, "dist", "webapp", "browser"), { recursive: true });
    const distPng = createSolidPng(255, 0, 0);
    fs.writeFileSync(path.join(projectDir, "dist", "webapp", "browser", "favicon.ico"), createIcoFromPng(distPng));

    withEnvVar("ANQST_WEBBASE_DIR", "/tmp/anqst-webbase", () => {
      withFakeCmake(0, 0, (logPath) => {
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

        const calls = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean) : [];
        assert.equal(calls.length, 2);
        assert.ok(calls[0].startsWith("configure:"));
        assert.match(calls[0], /AnQst\/generated\/backend\/cpp\/qt\/CdWidget_widget\/designerPlugin/);
        assert.match(calls[0], /designerPlugin\/build/);
        assert.ok(calls[1].startsWith("build:"));

        const pluginDir = path.join(projectDir, "AnQst", "generated", "backend", "cpp", "qt", "CdWidget_widget", "designerPlugin");
        const pluginCpp = fs.readFileSync(path.join(pluginDir, "CdWidgetDesignerPlugin.cpp"), "utf8");
        const pluginCmake = fs.readFileSync(path.join(pluginDir, "CMakeLists.txt"), "utf8");
        const pluginQrc = fs.readFileSync(path.join(pluginDir, "designerplugin.qrc"), "utf8");

        assert.match(pluginCpp, /QString group\(\) const override \{ return QStringLiteral\("Custom Category"\); \}/);
        assert.match(pluginCpp, /QIcon\(QStringLiteral\(":\/anqstdesignerplugin\/plugin-icon\.png"\)\)/);
        assert.match(pluginCmake, /set\(ANQST_WIDGET_DIR "\$\{CMAKE_CURRENT_LIST_DIR\}\/\.\."\)/);
        assert.match(pluginQrc, /plugin-icon\.png/);

        const capturedLogs = logs.join("\n");
        assert.match(capturedLogs, /Plugin binary: AnQst\/generated\/backend\/cpp\/qt\/CdWidget_widget\/designerPlugin\/build\/CdWidgetDesignerPlugin\.(so|dylib|dll)/);
      });
    });
  });
});

test("build command fails when --designerplugin is enabled without ANQST_WEBBASE_DIR", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir, { generate: ["QWidget"] });
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

test("build command fails when AnQst setting path is invalid type", () => {
  withTempProject((projectDir) => {
    writeProjectPackage(projectDir, {
      name: "tmp-widget",
      version: "1.0.0",
      AnQst: {
        spec: "legacy-object"
      }
    });
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...args: unknown[]) => {
      errors.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
      const code = runCommand("build", undefined);
      assert.equal(code, 1);
    } finally {
      console.error = originalError;
    }
    assert.ok(errors.some((line) => line.includes("Invalid package.json key 'AnQst'")));
  });
});

test("build command prints stack trace for unexpected errors", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir);
    const originalExistsSync = fs.existsSync;
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...args: unknown[]) => {
      errors.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
      fs.existsSync = ((targetPath: fs.PathLike) => {
        if (String(targetPath).endsWith("package.json")) {
          throw new Error("synthetic internal failure");
        }
        return originalExistsSync(targetPath);
      }) as typeof fs.existsSync;
      const code = runCommand("build", undefined);
      assert.equal(code, 1);
    } finally {
      fs.existsSync = originalExistsSync;
      console.error = originalError;
    }

    const captured = errors.join("\n");
    assert.match(captured, /\[AnQst\] synthetic internal failure/);
    assert.match(captured, /Stack trace:/);
    assert.match(captured, /Error: synthetic internal failure/);
    assert.match(captured, /\bat\b/);
  });
});

test("tsc pipeline resolves z.infer payloads", () => {
  withTempProject((projectDir) => {
    configureInstilledProject(projectDir, { widgetName: "ZInferWidget", generate: ["QWidget"] });
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
      path.join(projectDir, "AnQst", "ZInferWidget.AnQst.d.ts"),
      `/// <reference path="../zod-shim.d.ts" />
import type { AnQst } from "@dusted/anqst";

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

    const code = runCommand("build", undefined);
    assert.equal(code, 0);

    const headerPath = path.join(
      projectDir,
      "AnQst",
      "generated",
      "backend",
      "cpp",
      "qt",
      "ZInferWidget_widget",
      "include",
      "ZInferWidgetTypes.h"
    );
    const header = fs.readFileSync(headerPath, "utf8");
    assert.doesNotMatch(header, /z\.infer</);
    assert.doesNotMatch(header, /typeof UserSchema/);
    assert.match(header, /id/);
    assert.match(header, /displayName/);
  });
});
