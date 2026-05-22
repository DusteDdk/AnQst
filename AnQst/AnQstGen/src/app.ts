import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { formatVerifyError, VerifyError } from "./errors";
import { isDebugEnabled } from "./debug-dump";
import {
  buildVanillaJsBrowserBundle,
  generateOutputs,
  installEmbeddedWebBundle,
  installQtDesignerPluginCMake,
  installQtIntegrationCMake,
  installVendoredAnQstWebBase,
  writeGeneratedOutputs
} from "./emit";
import {
  DEFAULT_ANQST_GENERATE_TARGETS,
  resolveAnQstGenerateTargets,
  resolveAnQstSettings,
  resolveAnQstSpecPath,
  resolveAnQstUseSharedBaseWidget,
  resolveAnQstUseWebEngine,
  resolveAnQstWidgetCategory,
  resolveAnQstWidgetName,
  runInstill
} from "./project";
import {
  type FrontendTargetName,
  normalizeSlashes,
  resolveGeneratedLayoutPaths,
  toProjectRelative
} from "./layout";
import { parseSpecFile } from "./parser";
import { verifySpec } from "./verify";
import { readAnQstPackageVersion } from "./package-version";
import {
  ANQST_WEBBASE_DIR_NAME,
  copyAnQstWebBaseTree,
  resolveAnQstWebBaseSourceDir
} from "./webbase";
import { anqstWebBaseTargetName } from "./abi-stamp";

export interface VerifyResult {
  success: true;
  message: string;
  verificationMessage?: string;
}

interface GenerationTargets {
  emitQWidget: boolean;
  emitAngularService: boolean;
  emitVanillaTS: boolean;
  emitVanillaJS: boolean;
  emitNodeExpressWs: boolean;
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

class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}

interface BuildCommandArgs {
  designerPlugin: boolean;
  useSharedBaseWidgetOverride?: boolean;
}

function firstBrowserFrontendTarget(targets: readonly string[]): FrontendTargetName | null {
  for (const target of targets) {
    if (target === "AngularService" || target === "VanillaTS" || target === "VanillaJS") {
      return target;
    }
  }
  return null;
}

function renderHelp(): string {
  const version = readBuildStamp();
  return [
    `anqst version ${version}`,
    "",
    "Usage:",
    "  npx anqst <command> [arguments] [options]",
    "",
    "Commands:",
    "  instill <WidgetName>       Initialize AnQst in current npm project",
    "  man                         Show Building_Your_Widget.md in a console pager",
    "  test                        Verify AnQst spec from package settings",
    "  build [--designerplugin[=true|false]] [--noShared|--useShared]   Generate artifacts from package settings",
    "  generate <specFile>         Generate artifacts from explicit spec file",
    "  verify <specFile>           Verify explicit spec file only",
    "  clean <path> [-f|--force]   Remove generated artifacts under path",
    "",
    "Options:",
    "  --writeSharedBaseWidget   Write bundled AnQstWebBase to ./AnQstWebBase and exit",
    "  --designerplugin            Build Qt Designer plugin (build command only, QWidget target required)",
    "  --noShared                  Vendor AnQstWebBase for this build, overriding settings",
    "  --useShared                 Require shared AnQstWebBase for this build, overriding settings",
    "  -h, --help                  Show this help output",
    "  -v, --version               Print CLI version"
  ].join("\n");
}

function usageFor(command: string): string {
  if (command === "instill") return "Usage: npx anqst instill <WidgetName>";
  if (command === "build") return "Usage: npx anqst build [--designerplugin[=true|false]] [--noShared|--useShared]";
  if (command === "verify") return "Usage: npx anqst verify <specFile>";
  if (command === "generate") return "Usage: npx anqst generate <specFile>";
  if (command === "clean") return "Usage: npx anqst clean <path> [-f|--force]";
  return renderHelp();
}

function resolveManualPath(): string {
  const packageRoot = path.resolve(__dirname, "..", "..");
  return path.join(packageRoot, "Building_Your_Widget.md");
}

function pageManual(manualText: string): void {
  if (!process.stdout.isTTY) {
    console.log(manualText);
    return;
  }

  const pager = process.env.PAGER?.trim()
    || (process.platform === "win32" ? "more.com" : "less -R");
  const paged = spawnSync(pager, {
    input: manualText,
    stdio: ["pipe", "inherit", "inherit"],
    shell: true
  });
  if (paged.error || paged.status !== 0) {
    console.log(manualText);
  }
}

function runManualCommand(): number {
  const manualPath = resolveManualPath();
  if (!fs.existsSync(manualPath)) {
    console.error(`AnQst manual not found at ${normalizeSlashes(manualPath)}.`);
    return 1;
  }
  pageManual(fs.readFileSync(manualPath, "utf8"));
  return 0;
}

function resetGeneratedTargets(cwd: string, widgetName: string, targets: GenerationTargets): void {
  const layout = resolveGeneratedLayoutPaths(cwd, widgetName);
  const roots = new Set<string>();
  if (targets.emitAngularService) {
    roots.add(layout.angularFrontendRoot);
  }
  if (targets.emitVanillaTS) {
    roots.add(layout.vanillaTsFrontendRoot);
  }
  if (targets.emitVanillaJS) {
    roots.add(layout.vanillaJsFrontendRoot);
  }
  if (targets.emitNodeExpressWs) {
    roots.add(layout.nodeExpressRoot);
  }
  if (targets.emitQWidget) {
    roots.add(layout.cppQtWidgetRoot);
    roots.add(layout.cppCmakeRoot);
  }
  if (isDebugEnabled()) {
    roots.add(layout.debugIntermediateRoot);
  }
  for (const root of roots) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function buildGenerateSummary(cwd: string, specPath: string, widgetName: string, generationTargets: GenerationTargets): string {
  const layout = resolveGeneratedLayoutPaths(cwd, widgetName);
  const relativeSpecFile = normalizeSlashes(path.relative(cwd, specPath));
  const widgetRootPath = toProjectRelative(cwd, layout.cppQtWidgetRoot);
  const nodePath = toProjectRelative(cwd, layout.nodeExpressRoot);

  const messageLines: string[] = [];
  messageLines.push(`AnQst spec ${relativeSpecFile} built.`);
  if (generationTargets.emitAngularService) {
    messageLines.push(`    Angular services are available from ${toProjectRelative(cwd, path.join(layout.angularFrontendRoot, "services"))}.`);
    messageLines.push(`    Angular generated types are available from ${toProjectRelative(cwd, path.join(layout.angularFrontendRoot, "types"))}.`);
  }
  if (generationTargets.emitVanillaTS) {
    messageLines.push(`    VanillaTS browser bundle is available from ${toProjectRelative(cwd, layout.vanillaTsFrontendRoot)}.`);
  }
  if (generationTargets.emitVanillaJS) {
    messageLines.push(`    VanillaJS browser bundle is available from ${toProjectRelative(cwd, layout.vanillaJsFrontendRoot)}.`);
  }
  if (generationTargets.emitQWidget) {
    messageLines.push(`    Widget library available in ${widgetRootPath}.`);
  }
  if (generationTargets.emitNodeExpressWs) {
    messageLines.push(`    Node Express WS module available in ${nodePath}.`);
  }
  if (
    !generationTargets.emitAngularService
    && !generationTargets.emitVanillaTS
    && !generationTargets.emitVanillaJS
    && !generationTargets.emitQWidget
    && !generationTargets.emitNodeExpressWs
  ) {
    messageLines.push("    No outputs selected by AnQst.generate.");
  }
  return `\n${messageLines.join("\n")}\n`;
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

  resetGeneratedTargets(cwd, parsed.widgetName, generationTargets);
  const outputs = generateOutputs(parsed, { ...generationTargets, useSharedBaseWidget: true });
  writeGeneratedOutputs(cwd, outputs);
  if (generationTargets.emitQWidget) {
    installQtIntegrationCMake(cwd, parsed.widgetName, { useSharedBaseWidget: true });
  }

  return {
    success: true,
    verificationMessage: verification.message,
    message: buildGenerateSummary(cwd, specPath, parsed.widgetName, generationTargets)
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

function readBuildStamp(): string {
  return readAnQstPackageVersion();
}

function writeSharedBaseWidgetFromPackage(cwd: string): number {
  const targetDir = path.join(cwd, ANQST_WEBBASE_DIR_NAME);
  if (fs.existsSync(targetDir)) {
    console.error("Refusing to overwrite existing AnQstWebBase, delete it and run again.");
    return 1;
  }

  try {
    copyAnQstWebBaseTree(resolveAnQstWebBaseSourceDir(), targetDir);
  } catch (error) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Failed to write AnQstWebBase to ${cwd}: ${reason}`);
    return 1;
  }

  console.log(`AnQstWebBase written to ${normalizeSlashes(targetDir)}`);
  return 0;
}

function runDesignerPluginBuild(cwd: string, widgetName: string, useSharedBaseWidget: boolean): void {
  const layout = resolveGeneratedLayoutPaths(cwd, widgetName);
  const pluginSourceDir = layout.designerPluginRoot;
  const pluginBuildDir = layout.designerPluginBuildRoot;
  const webBaseDir = process.env.ANQST_WEBBASE_DIR?.trim()
    || (useSharedBaseWidget
      ? resolveAnQstWebBaseSourceDir()
      : path.join(layout.cppQtWidgetRoot, ANQST_WEBBASE_DIR_NAME));
  if (!fs.existsSync(path.join(webBaseDir, "CMakeLists.txt"))) {
    throw new VerifyError(`Unable to locate AnQstWebBase sources for --designerplugin build at '${normalizeSlashes(webBaseDir)}'.`);
  }

  const configureArgs = [
    "-S",
    pluginSourceDir,
    "-B",
    pluginBuildDir,
    "-DCMAKE_BUILD_TYPE=Release",
    `-DANQST_WEBBASE_DIR=${webBaseDir}`
  ];
  const qtMajorVersion = process.env.ANQST_QT_MAJOR_VERSION?.trim();
  if (qtMajorVersion) {
    configureArgs.push(`-DANQST_QT_MAJOR_VERSION=${qtMajorVersion}`);
  }
  const configure = spawnSync(
    "cmake",
    configureArgs,
    {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32"
    }
  );
  if (configure.status !== 0) {
    throw new VerifyError(
      [
        "CMake configure failed while building Qt Designer plugin.",
        "If CMake reports missing Qt UiPlugin development files, install qttools5-dev or qt6-tools-dev (Ubuntu/Debian) and re-run install_dependencies.sh."
      ].join(" ")
    );
  }

  const build = spawnSync("cmake", ["--build", pluginBuildDir, "--config", "Release"], {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  if (build.status !== 0) {
    throw new VerifyError("CMake build failed while compiling Qt Designer plugin.");
  }
}

export function runBuild(cwd: string, designerPlugin = false, useSharedBaseWidgetOverride?: boolean): VerifyResult {
  const buildVersion = readBuildStamp();
  const specPath = resolveAnQstSpecPath(cwd);
  const configuredWidgetName = resolveAnQstWidgetName(cwd);
  const configuredTargets = resolveAnQstGenerateTargets(cwd);
  const useSharedBaseWidget = useSharedBaseWidgetOverride ?? resolveAnQstUseSharedBaseWidget(cwd);
  const useWebEngine = resolveAnQstUseWebEngine(cwd);
  const generationTargets = resolveGenerationTargetsFromCwd(cwd, true);
  const preferredFrontendTarget = firstBrowserFrontendTarget(configuredTargets);
  const parsed = parseSpecFile(specPath);
  verifySpec(parsed);

  if (parsed.widgetName !== configuredWidgetName) {
    throw new VerifyError(
      `Settings widgetName '${configuredWidgetName}' does not match spec namespace '${parsed.widgetName}'.`
    );
  }

  resetGeneratedTargets(cwd, parsed.widgetName, generationTargets);

  const outputs = generateOutputs(parsed, { ...generationTargets, useSharedBaseWidget, useWebEngine });
  writeGeneratedOutputs(cwd, outputs);
  if (generationTargets.emitQWidget) {
    if (!useSharedBaseWidget) {
      installVendoredAnQstWebBase(cwd, parsed.widgetName);
    }
    installQtIntegrationCMake(cwd, parsed.widgetName, { useSharedBaseWidget, useWebEngine });
  }

  const shouldRunAngularBuild = generationTargets.emitQWidget
    && preferredFrontendTarget === "AngularService"
    && fs.existsSync(path.join(cwd, "angular.json"));
  if (shouldRunAngularBuild) {
    const angularBuild = spawnSync("npx", ["ng", "build", "--configuration", "production"], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32"
    });
    if (angularBuild.status !== 0) {
      throw new VerifyError("Angular build failed while preparing embedded widget assets.");
    }
  }

  let embeddedAssetsRefreshed = false;
  if (generationTargets.emitQWidget) {
    if (preferredFrontendTarget === "VanillaJS") {
      try {
        buildVanillaJsBrowserBundle(cwd, parsed.widgetName);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new VerifyError(`VanillaJS browser packaging failed: ${message}`);
      }
    }
    const embedded = installEmbeddedWebBundle(cwd, parsed.widgetName);
    embeddedAssetsRefreshed = embedded;
    if (preferredFrontendTarget === "VanillaJS" && !embedded) {
      throw new VerifyError("Unable to embed VanillaJS browser output. Ensure src/index.html and src/main.js produced a browser bundle.");
    }
    if (preferredFrontendTarget === "VanillaTS" && !embedded) {
      throw new VerifyError("Unable to embed VanillaTS browser output. Ensure the widget frontend build produced dist/browser with index.html.");
    }
    if (shouldRunAngularBuild && !embedded) {
      throw new VerifyError("Unable to embed browser output. Ensure the browser build produced a dist bundle with index.html.");
    }
  }

  let designerPluginBuilt = false;
  if (designerPlugin) {
    if (!generationTargets.emitQWidget) {
      console.warn("[AnQst] --designerplugin requested but QWidget target is not enabled. Skipping designer plugin build.");
    } else {
      const widgetCategory = resolveAnQstWidgetCategory(cwd);
      installQtDesignerPluginCMake(cwd, parsed.widgetName, { widgetCategory, useSharedBaseWidget, useWebEngine });
      runDesignerPluginBuild(cwd, parsed.widgetName, useSharedBaseWidget);
      designerPluginBuilt = true;
    }
  }

  if (
    !generationTargets.emitAngularService
    && !generationTargets.emitVanillaTS
    && !generationTargets.emitVanillaJS
    && !generationTargets.emitQWidget
    && !generationTargets.emitNodeExpressWs
  ) {
    return {
      success: true,
      message: [
        "Build completed.",
        `    anqst version ${buildVersion}`,
        "    No outputs selected by AnQst.generate."
      ].join("\n")
    };
  }

  const layout = resolveGeneratedLayoutPaths(cwd, parsed.widgetName);
  const detailLines: string[] = [];
  if (generationTargets.emitAngularService) {
    detailLines.push("    Target AngularService:");
    detailLines.push(`      - Services output: ${toProjectRelative(cwd, path.join(layout.angularFrontendRoot, "services"))}`);
    detailLines.push(`      - Types output: ${toProjectRelative(cwd, path.join(layout.angularFrontendRoot, "types"))}`);
  }
  if (generationTargets.emitVanillaTS) {
    detailLines.push("    Target VanillaTS:");
    detailLines.push(`      - Browser bundle root: ${toProjectRelative(cwd, layout.vanillaTsFrontendRoot)}`);
    detailLines.push(`      - Browser global: window.AnQstGenerated.${parsed.widgetName}`);
  }
  if (generationTargets.emitVanillaJS) {
    detailLines.push("    Target VanillaJS:");
    detailLines.push(`      - Browser bundle root: ${toProjectRelative(cwd, layout.vanillaJsFrontendRoot)}`);
    detailLines.push(`      - Browser global: window.AnQstGenerated.${parsed.widgetName}`);
  }
  if (generationTargets.emitQWidget) {
    const widgetClassName = `${parsed.widgetName}Widget`;
    detailLines.push("    Target QWidget:");
    detailLines.push(`      - QWidget name: ${widgetClassName}`);
    detailLines.push(
      `      - AnQstWebBase module: ${useSharedBaseWidget
        ? `External ${anqstWebBaseTargetName()}, see npx anqst --help for more info`
        : `Embedded in ${widgetClassName}`}`
    );
    detailLines.push(`      - Embedded WebEngine: ${useWebEngine ? "Enabled" : "Disabled; browser-host mode only"}`);
    detailLines.push(`      - Qt integration CMake: ${toProjectRelative(cwd, path.join(layout.cppCmakeRoot, "CMakeLists.txt"))}`);
    detailLines.push(`      - Widget output root: ${toProjectRelative(cwd, layout.cppQtWidgetRoot)}`);
    detailLines.push("      - C++ handoff: downstream CMake consumes this generated tree directly");
    if (embeddedAssetsRefreshed) {
      detailLines.push("      - Embedded web assets refreshed from detected browser dist output");
    }
  }
  if (generationTargets.emitNodeExpressWs) {
    detailLines.push("    Target node_express_ws:");
    detailLines.push(`      - Module output root: ${toProjectRelative(cwd, layout.nodeExpressRoot)}`);
  }
  if (designerPluginBuilt) {
    const pluginBinaryPath = normalizeSlashes(
      path.join(toProjectRelative(cwd, layout.designerPluginBuildRoot), designerPluginBinaryName(parsed.widgetName))
    );
    detailLines.push("    Target QtDesignerPlugin:");
    detailLines.push(`      - Build output: ${toProjectRelative(cwd, layout.designerPluginBuildRoot)}`);
    detailLines.push(`      - Plugin binary: ${pluginBinaryPath}`);
    detailLines.push("      - Install target dir: <QT_INSTALL_PLUGINS>/designer");
    detailLines.push("      - Discover QT_INSTALL_PLUGINS: qmake -query QT_INSTALL_PLUGINS or qmake6 -query QT_INSTALL_PLUGINS");
    detailLines.push(`      - Example install: cp ${pluginBinaryPath} \"$(qmake -query QT_INSTALL_PLUGINS)/designer/\"`);
    detailLines.push(
      `      - User-local install: mkdir -p \"$HOME/.local/lib/qt<major>/plugins/designer\" && cp ${pluginBinaryPath} \"$HOME/.local/lib/qt<major>/plugins/designer/\"`
    );
  }
  return {
    success: true,
    message: [
      "Build completed.",
      `    anqst version ${buildVersion}`,
      ...detailLines
    ].join("\n")
  };
}

function parseSpecCommandArg(commandName: string, specArg: string | undefined, extraArgs: string[]): string {
  const allArgs = [specArg, ...extraArgs].filter((arg): arg is string => typeof arg === "string" && arg.length > 0);
  const positional: string[] = [];

  for (const arg of allArgs) {
    if (arg.startsWith("-")) {
      throw new CliUsageError(`Unknown ${commandName} flag '${arg}'. ${usageFor(commandName)}`);
    }
    positional.push(arg);
  }

  if (positional.length !== 1) {
    throw new CliUsageError(usageFor(commandName));
  }
  return positional[0];
}

function parseBuildCommandArgs(specArg: string | undefined, extraArgs: string[]): BuildCommandArgs {
  const allArgs = [specArg, ...extraArgs].filter((arg): arg is string => typeof arg === "string" && arg.length > 0);
  let designerPlugin = false;
  let useSharedBaseWidgetOverride: boolean | undefined;
  const positional: string[] = [];

  for (let i = 0; i < allArgs.length; i += 1) {
    const arg = allArgs[i];
    if (arg === "--designerplugin") {
      const value = allArgs[i + 1];
      if (value && !value.startsWith("-")) {
        designerPlugin = value.toLowerCase() === "true";
        i += 1;
      } else {
        designerPlugin = true;
      }
      continue;
    }
    if (arg.startsWith("--designerplugin=")) {
      const value = arg.slice("--designerplugin=".length);
      designerPlugin = value.toLowerCase() === "true";
      continue;
    }
    if (arg === "--noShared") {
      useSharedBaseWidgetOverride = false;
      continue;
    }
    if (arg === "--useShared") {
      useSharedBaseWidgetOverride = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new CliUsageError(`Unknown build flag '${arg}'. ${usageFor("build")}`);
    }
    positional.push(arg);
  }

  if (positional.length > 0) {
    throw new CliUsageError(`Unexpected extra argument '${positional[0]}'. ${usageFor("build")}`);
  }
  return { designerPlugin, useSharedBaseWidgetOverride };
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
      throw new CliUsageError(`Unknown clean flag '${arg}'. Use -f or --force.`);
    }
    if (targetPathArg !== null) {
      throw new CliUsageError(`Unexpected extra argument '${arg}'. Usage: npx anqst clean <path> [-f|--force]`);
    }
    targetPathArg = arg;
  }

  if (targetPathArg === null) {
    throw new CliUsageError("Usage: npx anqst clean <path> [-f|--force]");
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
      throw new VerifyError("No package.json: AnQst commands must run inside an npm project.");
    }
    return toGenerationTargets([...DEFAULT_ANQST_GENERATE_TARGETS]);
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8")) as { AnQst?: unknown };
  if (packageJson.AnQst === undefined) {
    if (requirePackageAnQst) {
      throw new VerifyError("Missing package.json key 'AnQst'. Run 'npx anqst instill <WidgetName>' first.");
    }
    return toGenerationTargets([...DEFAULT_ANQST_GENERATE_TARGETS]);
  }

  return toGenerationTargets(resolveAnQstGenerateTargets(cwd));
}

function toGenerationTargets(targets: string[]): GenerationTargets {
  return {
    emitQWidget: targets.includes("QWidget"),
    emitAngularService: targets.includes("AngularService"),
    emitVanillaTS: targets.includes("VanillaTS"),
    emitVanillaJS: targets.includes("VanillaJS"),
    emitNodeExpressWs: targets.includes("node_express_ws")
  };
}

export function runClean(pathArg: string, force: boolean): CleanResult {
  const targetRoot = path.resolve(process.cwd(), pathArg);

  if (force) {
    const rows = runCleanup(targetRoot, [normalizeSlashes(path.join("AnQst", "generated"))]);
    return {
      success: true,
      message: formatCleanResult(targetRoot, rows),
      hadFailures: rows.some((row) => row.status === "failed")
    };
  }

  const context = resolveAnQstSettings(targetRoot);
  const layout = resolveGeneratedLayoutPaths(targetRoot, context.settings.widgetName);
  const widgetDirs = [
    normalizeSlashes(path.relative(targetRoot, layout.angularFrontendRoot)),
    normalizeSlashes(path.relative(targetRoot, layout.vanillaTsFrontendRoot)),
    normalizeSlashes(path.relative(targetRoot, layout.vanillaJsFrontendRoot)),
    normalizeSlashes(path.relative(targetRoot, layout.nodeExpressRoot)),
    normalizeSlashes(path.relative(targetRoot, layout.cppQtWidgetRoot)),
    normalizeSlashes(path.relative(targetRoot, layout.cppCmakeRoot)),
    normalizeSlashes(path.relative(targetRoot, layout.debugIntermediateRoot))
  ];
  const rows = runCleanup(targetRoot, widgetDirs);
  return {
    success: true,
    message: formatCleanResult(targetRoot, rows),
    hadFailures: rows.some((row) => row.status === "failed")
  };
}

function designerPluginBinaryName(widgetName: string): string {
  const targetName = `${widgetName}DesignerPlugin`;
  if (process.platform === "win32") {
    return `${targetName}.dll`;
  }
  if (process.platform === "darwin") {
    return `${targetName}.dylib`;
  }
  return `${targetName}.so`;
}

function renderInstallAliasMessage(): string {
  const useColor = process.stdout.isTTY;
  const text = "[AnQst] 'install' spotted. Muscle memory is undefeated - running 'instill' for you.";
  if (!useColor) return text;
  return `\x1b[38;5;214m${text}\x1b[0m`;
}

function formatUnexpectedError(error: unknown): string {
  if (!(error instanceof Error)) {
    return `[AnQst] ${String(error)}`;
  }

  const lines = [`[AnQst] ${error.message}`];
  const stack = typeof error.stack === "string" ? error.stack.trim() : "";
  if (stack.length > 0) {
    lines.push("");
    lines.push("Stack trace:");
    lines.push(stack);
  }

  return lines.join("\n");
}

export function runCommand(command: string | undefined, specArg: string | undefined, extraArgs: string[] = []): number {
  try {
    if (!command) {
      console.error(renderHelp());
      return 1;
    }
    if (command === "--writeSharedBaseWidget") {
      if (specArg || extraArgs.length > 0) {
        console.error("Usage: npx anqst --writeSharedBaseWidget");
        return 1;
      }
      return writeSharedBaseWidgetFromPackage(process.cwd());
    }
    if (command === "-h" || command === "--help" || command === "help") {
      console.log(renderHelp());
      return 0;
    }
    if (command === "man" || command === "manual") {
      if (specArg || extraArgs.length > 0) {
        console.error("Usage: npx anqst man");
        return 1;
      }
      return runManualCommand();
    }
    if (command === "-v" || command === "--version" || command === "version") {
      console.log(`anqst version ${readBuildStamp()}`);
      return 0;
    }
    const normalizedCommand = command === "install" ? "instill" : command;
    if (command === "install") {
      console.log(renderInstallAliasMessage());
    }
    if (normalizedCommand === "instill") {
      if (!specArg) {
        console.error(usageFor("instill"));
        return 1;
      }
      const msg = runInstill(process.cwd(), specArg);
      console.log(msg);
      return 0;
    }
    if (normalizedCommand === "test") {
      const res = runTest(process.cwd());
      console.log(res.message);
      return 0;
    }
    if (normalizedCommand === "build") {
      const parsedArgs = parseBuildCommandArgs(specArg, extraArgs);
      const res = runBuild(process.cwd(), parsedArgs.designerPlugin, parsedArgs.useSharedBaseWidgetOverride);
      console.log(res.message);
      return 0;
    }
    if (normalizedCommand === "verify") {
      const specArgParsed = parseSpecCommandArg("verify", specArg, extraArgs);
      const res = runVerify(specArgParsed);
      console.log(res.message);
      return 0;
    }
    if (normalizedCommand === "generate") {
      const specArgParsed = parseSpecCommandArg("generate", specArg, extraArgs);
      const res = runGenerate(specArgParsed);
      if (res.verificationMessage) {
        console.log(res.verificationMessage);
      }
      console.log(res.message);
      return 0;
    }
    if (normalizedCommand === "clean") {
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
    if (error instanceof CliUsageError) {
      console.error(error.message);
      return 1;
    }
    console.error(formatUnexpectedError(error));
    return 1;
  }
}
