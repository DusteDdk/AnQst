import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { parseSpecFile } from "./parser";
import { verifySpec } from "./verify";
import { formatVerifyError, VerifyError } from "./errors";
import {
  generateOutputs,
  installEmbeddedWebBundle,
  installQtIntegrationCMake,
  installTypeScriptOutputs,
  writeGeneratedOutputs
} from "./emit";
import { DEFAULT_ANQST_GENERATE_TARGETS, resolveAnQstGenerateTargets, resolveAnQstSpecPath, runInstill } from "./project";

export interface VerifyResult {
  success: true;
  message: string;
  verificationMessage?: string;
}

interface GenerationTargets {
  emitQWidget: boolean;
  emitAngularService: boolean;
}

interface CleanReportRow {
  relativePath: string;
  status: "deleted" | "not_found" | "failed";
  reason?: string;
}

interface CleanResult {
  success: true;
  message: string;
  hadFailures: boolean;
}

interface CleanCommandArgs {
  targetPathArg: string;
  force: boolean;
}

function renderHelp(): string {
  return [
    "Usage:",
    "  anqst <command> [arguments] [options]",
    "",
    "Commands:",
    "  instill <WidgetName>       Initialize AnQst in current npm project",
    "  test                        Verify package.json AnQst spec",
    "  build                       Generate artifacts from package.json AnQst spec",
    "  generate <specFile>         Generate artifacts from explicit spec file",
    "  verify <specFile>           Verify explicit spec file only",
    "  clean <path> [-f|--force]   Remove generated artifacts under path",
    "",
    "Options:",
    "  -h, --help                  Show this help output"
  ].join("\n");
}

function usageFor(command: string): string {
  if (command === "instill") return "Usage: anqst instill <WidgetName>";
  if (command === "verify") return "Usage: anqst verify <specFile>";
  if (command === "generate") return "Usage: anqst generate <specFile>";
  if (command === "clean") return "Usage: anqst clean <path> [-f|--force]";
  return renderHelp();
}

export function runVerify(specArg: string): VerifyResult {
  const specPath = path.resolve(process.cwd(), specArg);
  const parsed = parseSpecFile(specPath);
  const verification = verifySpec(parsed);
  return {
    success: true,
    message: verification.message
  };
}

export function runGenerate(specArg: string): VerifyResult {
  const cwd = process.cwd();
  const specPath = path.resolve(cwd, specArg);
  const parsed = parseSpecFile(specPath);
  const verification = verifySpec(parsed);
  const generationTargets = resolveGenerationTargetsFromCwd(cwd);
  const outputs = generateOutputs(parsed, generationTargets);
  writeGeneratedOutputs(cwd, outputs);
  if (generationTargets.emitAngularService) {
    installTypeScriptOutputs(cwd);
  }
  if (generationTargets.emitQWidget) {
    installQtIntegrationCMake(cwd, parsed.widgetName);
  }
  const relativeSpecFile = normalizeSlashes(path.relative(cwd, specPath));
  const relativeTypeScriptInstallPath = normalizeSlashes(path.relative(cwd, path.join(cwd, "src", "anqst-generated")));
  const relativeCppLibraryPath = normalizeSlashes(path.relative(cwd, path.join(cwd, "generated_output", `${parsed.widgetName}_QtWidget`)));
  const serviceList = parsed.services.map((s) => s.name).join(", ");
  const messageLines: string[] = [];
  messageLines.push(`AnQst spec ${relativeSpecFile} built.`);
  if (generationTargets.emitAngularService) {
    messageLines.push(`    Services ${serviceList} are available for import from ${relativeTypeScriptInstallPath}.`);
  }
  if (generationTargets.emitQWidget) {
    messageLines.push(`    Widget library available in ${relativeCppLibraryPath}.`);
  }
  if (!generationTargets.emitAngularService && !generationTargets.emitQWidget) {
    messageLines.push("    No outputs selected by AnQst.generate.");
  }
  return {
    success: true,
    verificationMessage: verification.message,
    message: `\n${messageLines.join("\n")}\n`
  };
}

export function runTest(cwd: string): VerifyResult {
  const specPath = resolveAnQstSpecPath(cwd);
  const parsed = parseSpecFile(specPath);
  const verification = verifySpec(parsed);
  return {
    success: true,
    message: verification.message
  };
}

export function runBuild(cwd: string): VerifyResult {
  const specPath = resolveAnQstSpecPath(cwd);
  const generationTargets = resolveGenerationTargetsFromCwd(cwd, true);
  const parsed = parseSpecFile(specPath);
  verifySpec(parsed);
  const outputs = generateOutputs(parsed, generationTargets);
  writeGeneratedOutputs(cwd, outputs);
  if (generationTargets.emitAngularService) {
    installTypeScriptOutputs(cwd);
  }
  if (generationTargets.emitQWidget) {
    installQtIntegrationCMake(cwd, parsed.widgetName);
  }

  const hasAngularProject = generationTargets.emitQWidget && fs.existsSync(path.join(cwd, "angular.json"));
  if (hasAngularProject && generationTargets.emitQWidget) {
    const angularBuild = spawnSync("npx", ["ng", "build", "--configuration", "production"], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32"
    });
    if (angularBuild.status !== 0) {
      throw new VerifyError("Angular build failed while preparing embedded widget assets.");
    }
  }

  if (generationTargets.emitQWidget) {
    const embedded = installEmbeddedWebBundle(cwd, parsed.widgetName);
    if (hasAngularProject && !embedded) {
      throw new VerifyError("Unable to embed Angular output. Ensure ng build produced a dist bundle with index.html.");
    }
  }

  if (!generationTargets.emitAngularService && !generationTargets.emitQWidget) {
    return {
      success: true,
      message: "Build completed: no outputs selected by AnQst.generate"
    };
  }

  const parts: string[] = [];
  if (generationTargets.emitAngularService) {
    parts.push("TypeScript installed to src/anqst-generated");
  }
  if (generationTargets.emitQWidget) {
    parts.push("Qt integration CMake emitted to anqst-cmake/");
    parts.push("C++ widget library refreshed with embedded web assets");
  }
  return {
    success: true,
    message: `Build completed: ${parts.join(", ")}`
  };
}

function parseCleanCommandArgs(specArg: string | undefined, extraArgs: string[]): CleanCommandArgs {
  const allArgs = [specArg, ...extraArgs].filter((arg): arg is string => typeof arg === "string" && arg.length > 0);
  let force = false;
  let targetPathArg: string | null = null;

  for (const arg of allArgs) {
    if (arg === "-f" || arg === "--force") {
      force = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown clean flag '${arg}'. Use -f or --force.`);
    }
    if (targetPathArg !== null) {
      throw new Error(`Unexpected extra argument '${arg}'. Usage: anqst clean <path> [-f|--force]`);
    }
    targetPathArg = arg;
  }

  if (targetPathArg === null) {
    throw new Error("Usage: anqst clean <path> [-f|--force]");
  }
  return { targetPathArg, force };
}

function runCleanup(targetRoot: string, relativeDirs: string[]): CleanReportRow[] {
  const rows: CleanReportRow[] = [];
  for (const relativePath of relativeDirs) {
    const absolutePath = path.join(targetRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      rows.push({ relativePath, status: "not_found" });
      continue;
    }
    try {
      if (!fs.statSync(absolutePath).isDirectory()) {
        rows.push({
          relativePath,
          status: "failed",
          reason: "Path exists but is not a directory."
        });
        continue;
      }
      fs.rmSync(absolutePath, { recursive: true, force: false });
      rows.push({ relativePath, status: "deleted" });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      rows.push({ relativePath, status: "failed", reason });
    }
  }
  return rows;
}

function formatCleanResult(targetRoot: string, rows: CleanReportRow[]): string {
  const deleted = rows.filter((row) => row.status === "deleted");
  const notFound = rows.filter((row) => row.status === "not_found");
  const failed = rows.filter((row) => row.status === "failed");
  const lines: string[] = [];
  lines.push(`[AnQst] Clean summary for ${normalizeSlashes(targetRoot)}`);
  if (deleted.length > 0) {
    lines.push(`  Deleted (${deleted.length})`);
    for (const row of deleted) lines.push(`    - ${row.relativePath}`);
  }
  if (notFound.length > 0) {
    lines.push(`  Not found (${notFound.length})`);
    for (const row of notFound) lines.push(`    - ${row.relativePath}`);
  }
  if (failed.length > 0) {
    lines.push(`  Failed (${failed.length})`);
    for (const row of failed) lines.push(`    - ${row.relativePath}: ${row.reason ?? "Unknown error"}`);
  }
  return lines.join("\n");
}

function resolveGenerationTargetsFromCwd(cwd: string, requirePackageAnQst = false): GenerationTargets {
  const packagePath = path.join(cwd, "package.json");
  if (!fs.existsSync(packagePath)) {
    if (requirePackageAnQst) {
      throw new VerifyError("No package.json: Can only build AnQst inside an npm project.");
    }
    return toGenerationTargets([...DEFAULT_ANQST_GENERATE_TARGETS]);
  }
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8")) as { AnQst?: unknown };
  if (packageJson.AnQst === undefined) {
    if (requirePackageAnQst) {
      throw new VerifyError("Missing package.json key 'AnQst.spec'. Run 'anqst instill <WidgetName>' first.");
    }
    return toGenerationTargets([...DEFAULT_ANQST_GENERATE_TARGETS]);
  }
  return toGenerationTargets(resolveAnQstGenerateTargets(cwd));
}

function toGenerationTargets(targets: string[]): GenerationTargets {
  return {
    emitQWidget: targets.includes("QWidget"),
    emitAngularService: targets.includes("AngularService")
  };
}

function resolveAnQstSpecFromPackage(targetRoot: string): string {
  const packagePath = path.join(targetRoot, "package.json");
  if (!fs.existsSync(packagePath)) {
    throw new Error(
      `No package.json with an AnQst key found at '${normalizeSlashes(targetRoot)}'. Use 'anqst clean ${normalizeSlashes(targetRoot)} --force' to clean anyway.`
    );
  }
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8")) as { AnQst?: { spec?: string } };
  const spec = packageJson.AnQst?.spec;
  if (!spec || spec.trim().length === 0) {
    throw new Error(
      `No package.json with an AnQst key found at '${normalizeSlashes(targetRoot)}'. Use 'anqst clean ${normalizeSlashes(targetRoot)} --force' to clean anyway.`
    );
  }
  return path.resolve(targetRoot, spec);
}

export function runClean(pathArg: string, force: boolean): CleanResult {
  const targetRoot = path.resolve(process.cwd(), pathArg);
  const broadDirs = [
    "generated_output",
    path.join("src", "anqst-generated"),
    "anqst-cmake"
  ];

  if (force) {
    const rows = runCleanup(targetRoot, broadDirs);
    return {
      success: true,
      message: formatCleanResult(targetRoot, rows),
      hadFailures: rows.some((row) => row.status === "failed")
    };
  }

  const specPath = resolveAnQstSpecFromPackage(targetRoot);
  const parsed = parseSpecFile(specPath);
  const widgetDirs = [
    path.join("generated_output", `${parsed.widgetName}_QtWidget`),
    path.join("src", "anqst-generated"),
    "anqst-cmake"
  ];
  const rows = runCleanup(targetRoot, widgetDirs);
  return {
    success: true,
    message: formatCleanResult(targetRoot, rows),
    hadFailures: rows.some((row) => row.status === "failed")
  };
}

function normalizeSlashes(inputPath: string): string {
  return inputPath.split(path.sep).join("/");
}

export function runCommand(command: string | undefined, specArg: string | undefined, extraArgs: string[] = []): number {
  try {
    if (!command) {
      console.error(renderHelp());
      return 1;
    }
    if (command === "-h" || command === "--help" || command === "help") {
      console.log(renderHelp());
      return 0;
    }
    if (command === "instill") {
      if (!specArg) {
        console.error(usageFor("instill"));
        return 1;
      }
      const msg = runInstill(process.cwd(), specArg);
      console.log(msg);
      return 0;
    }
    if (command === "test") {
      const res = runTest(process.cwd());
      console.log(res.message);
      return 0;
    }
    if (command === "build") {
      const res = runBuild(process.cwd());
      console.log(res.message);
      return 0;
    }
    if (command === "verify") {
      if (!specArg) {
        console.error(usageFor("verify"));
        return 1;
      }
      const res = runVerify(specArg);
      console.log(res.message);
      return 0;
    }
    if (command === "generate") {
      if (!specArg) {
        console.error(usageFor("generate"));
        return 1;
      }
      const res = runGenerate(specArg);
      if (res.verificationMessage) {
        console.log(res.verificationMessage);
      }
      console.log(res.message);
      return 0;
    }
    if (command === "clean") {
      const parsed = parseCleanCommandArgs(specArg, extraArgs);
      const res = runClean(parsed.targetPathArg, parsed.force);
      console.log(res.message);
      return res.hadFailures ? 1 : 0;
    }
    console.error(`anqst: unknown command '${command}'`);
    console.error("");
    console.error(renderHelp());
    return 1;
  } catch (error) {
    if (error instanceof VerifyError) {
      console.error(formatVerifyError(error));
      return 1;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[AnQst] ${message}`);
    return 1;
  }
}
