import fs from "node:fs";
import path from "node:path";
import { VerifyError } from "./errors";
import {
  ANQST_LAYOUT_VERSION,
  anqstRootDir,
  anqstSettingsFileName,
  anqstSettingsRelativePath,
  anqstSpecFileName,
  generatedFrontendDirName,
  normalizeSlashes
} from "./layout";

interface PackageJsonLike {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  AnQst?: unknown;
  [key: string]: unknown;
}

export interface AnQstProjectSettings {
  layoutVersion: number;
  widgetName: string;
  spec: string;
  generate?: string[];
  widgetCategory?: string;
}

export interface ResolvedAnQstSettingsContext {
  settingsPath: string;
  settings: AnQstProjectSettings;
}

export const DEFAULT_ANQST_GENERATE_TARGETS = ["QWidget", "AngularService", "VanillaTS", "VanillaJS", "node_express_ws"] as const;
const ANQST_DSL_IMPORT_LINE = 'import type { AnQst } from "@dusted/anqst";';
const ANQST_BUILD_HOOK = "npx anqst build";

function readJsonFile<T>(filePath: string): T {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new VerifyError(`Unable to parse JSON file '${normalizeSlashes(filePath)}': ${message}`);
  }
}

function ensureObject(value: unknown, errorMessage: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new VerifyError(errorMessage);
  }
  return value as Record<string, unknown>;
}

function ensureBuildHook(existing: string | undefined): string {
  if (!existing || existing.trim().length === 0) {
    return ANQST_BUILD_HOOK;
  }
  const trimmed = existing.trim();
  if (trimmed === ANQST_BUILD_HOOK || trimmed.startsWith(`${ANQST_BUILD_HOOK} &&`) || trimmed.includes(ANQST_BUILD_HOOK)) {
    return trimmed;
  }
  return `${ANQST_BUILD_HOOK} && ${trimmed}`;
}

function normalizeAnQstImport(sourceText: string): { nextText: string; changed: boolean } {
  const importPattern = /^\s*import\s+(?:type\s+)?\{\s*AnQst\s*\}\s+from\s+["'][^"']+["'];\s*$/m;
  if (importPattern.test(sourceText)) {
    const nextText = sourceText.replace(importPattern, ANQST_DSL_IMPORT_LINE);
    return { nextText, changed: nextText !== sourceText };
  }
  return {
    nextText: `${ANQST_DSL_IMPORT_LINE}\n\n${sourceText}`,
    changed: true
  };
}

function isSubPath(parentPath: string, childPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  if (relative === "") {
    return true;
  }
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function readAnQstSettingsFromPath(cwd: string, settingsPath: string): AnQstProjectSettings {
  if (!fs.existsSync(settingsPath)) {
    throw new VerifyError(
      `Missing AnQst settings file '${normalizeSlashes(path.relative(cwd, settingsPath))}'. Run 'anqst instill <WidgetName>' first.`
    );
  }
  const raw = readJsonFile<unknown>(settingsPath);
  const settingsObject = ensureObject(raw, `Invalid AnQst settings file '${normalizeSlashes(path.relative(cwd, settingsPath))}': expected JSON object.`);

  const layoutVersion = settingsObject.layoutVersion;
  if (layoutVersion !== ANQST_LAYOUT_VERSION) {
    throw new VerifyError(
      `Invalid AnQst settings file '${normalizeSlashes(path.relative(cwd, settingsPath))}': expected layoutVersion ${ANQST_LAYOUT_VERSION}.`
    );
  }

  const widgetName = settingsObject.widgetName;
  if (typeof widgetName !== "string" || widgetName.trim().length === 0) {
    throw new VerifyError(
      `Invalid AnQst settings file '${normalizeSlashes(path.relative(cwd, settingsPath))}': expected non-empty string 'widgetName'.`
    );
  }

  const spec = settingsObject.spec;
  if (typeof spec !== "string" || spec.trim().length === 0) {
    throw new VerifyError(
      `Invalid AnQst settings file '${normalizeSlashes(path.relative(cwd, settingsPath))}': expected non-empty string 'spec'.`
    );
  }

  const generate = settingsObject.generate;
  if (generate !== undefined && (!Array.isArray(generate) || generate.some((entry) => typeof entry !== "string"))) {
    throw new VerifyError(
      `Invalid AnQst settings file '${normalizeSlashes(path.relative(cwd, settingsPath))}': expected string array 'generate'.`
    );
  }

  const widgetCategory = settingsObject.widgetCategory;
  if (widgetCategory !== undefined) {
    if (typeof widgetCategory !== "string" || widgetCategory.trim().length === 0) {
      throw new VerifyError(
        `Invalid AnQst settings file '${normalizeSlashes(path.relative(cwd, settingsPath))}': expected non-empty string 'widgetCategory'.`
      );
    }
  }

  const resolvedSpecPath = path.resolve(cwd, spec.trim());
  const anqstRoot = anqstRootDir(cwd);
  if (!isSubPath(anqstRoot, resolvedSpecPath)) {
    throw new VerifyError(
      `Invalid AnQst settings file '${normalizeSlashes(path.relative(cwd, settingsPath))}': 'spec' must resolve inside './AnQst'.`
    );
  }

  return {
    layoutVersion,
    widgetName: widgetName.trim(),
    spec: spec.trim(),
    generate: Array.isArray(generate) ? [...generate] : undefined,
    widgetCategory: typeof widgetCategory === "string" ? widgetCategory.trim() : undefined
  };
}

function resolveSettingsPathFromPackage(cwd: string, packageJson: PackageJsonLike): string {
  const settingsRef = packageJson.AnQst;
  if (settingsRef === undefined) {
    throw new VerifyError("Missing package.json key 'AnQst'. Run 'anqst instill <WidgetName>' first.");
  }
  if (typeof settingsRef !== "string" || settingsRef.trim().length === 0) {
    throw new VerifyError("Invalid package.json key 'AnQst': expected non-empty string path to settings JSON.");
  }
  return path.resolve(cwd, settingsRef.trim());
}

function buildAnQstDirectoryReadme(widgetName: string): string {
  return [
    "# AnQst Project Directory",
    "",
    "This directory is owned by the AnQst CLI for this project.",
    "",
    "## Files",
    "",
    `- \`${anqstSpecFileName(widgetName)}\`: AnQst widget spec source.`,
    `- \`${anqstSettingsFileName(widgetName)}\`: project-local AnQst configuration used by \`anqst build\`.`,
    "- `generated/`: deterministic build output roots managed by `anqst build`.",
    "",
    "## Regeneration",
    "",
    "- `npx anqst build` refreshes generated outputs under `generated/`.",
    "- Build hooks in package.json (`postinstall`, `prebuild`, `prestart`) call `npx anqst build`.",
    "",
    "Do not hand-edit generated files under `generated/`; they are overwritten by design.",
    ""
  ].join("\n");
}

function updateTsConfig(cwd: string, widgetName: string): void {
  const tsConfigPath = path.join(cwd, "tsconfig.json");
  if (!fs.existsSync(tsConfigPath)) {
    return;
  }

  const tsConfigRaw = readJsonFile<unknown>(tsConfigPath);
  const tsConfig = ensureObject(tsConfigRaw, "Invalid tsconfig.json: expected top-level object.");

  const compilerOptions = tsConfig.compilerOptions === undefined
    ? {}
    : ensureObject(tsConfig.compilerOptions, "Invalid tsconfig.json: expected object at 'compilerOptions'.");
  tsConfig.compilerOptions = compilerOptions;

  if (compilerOptions.baseUrl === undefined) {
    compilerOptions.baseUrl = ".";
  }

  const pathsObject = compilerOptions.paths === undefined
    ? {}
    : ensureObject(compilerOptions.paths, "Invalid tsconfig.json: expected object at 'compilerOptions.paths'.");
  compilerOptions.paths = pathsObject;

  const generatedAliasPath = `AnQst/generated/frontend/${generatedFrontendDirName(widgetName, "AngularService")}/*`;
  const existingAlias = pathsObject["anqst-generated/*"];
  const aliasList = Array.isArray(existingAlias)
    ? existingAlias.filter((entry): entry is string => typeof entry === "string")
    : [];
  if (!aliasList.includes(generatedAliasPath)) {
    aliasList.unshift(generatedAliasPath);
  }
  pathsObject["anqst-generated/*"] = [...new Set(aliasList)];

  if (Array.isArray(tsConfig.include)) {
    const includeList = tsConfig.include.filter((entry): entry is string => typeof entry === "string");
    const generatedTypesPattern = `AnQst/generated/frontend/${generatedFrontendDirName(widgetName, "AngularService")}/**/*.d.ts`;
    if (!includeList.includes(generatedTypesPattern)) {
      includeList.push(generatedTypesPattern);
    }
    tsConfig.include = includeList;
  }

  fs.writeFileSync(tsConfigPath, `${JSON.stringify(tsConfig, null, 2)}\n`, "utf8");
}

function validateWidgetName(widgetName: string): string {
  const trimmed = widgetName.trim();
  if (trimmed.length === 0) {
    throw new VerifyError("Usage: anqst instill <WidgetName>");
  }
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(trimmed)) {
    throw new VerifyError("Invalid widget name: expected a TypeScript identifier for namespace generation.");
  }
  return trimmed;
}

export interface ProjectPackageContext {
  packagePath: string;
  packageJson: PackageJsonLike;
}

export function readProjectPackage(cwd: string): ProjectPackageContext {
  const packagePath = path.join(cwd, "package.json");
  if (!fs.existsSync(packagePath)) {
    throw new VerifyError("No package.json: AnQst commands must run inside an npm project.");
  }
  return {
    packagePath,
    packageJson: readJsonFile<PackageJsonLike>(packagePath)
  };
}

export function resolveAnQstSettings(cwd: string): ResolvedAnQstSettingsContext {
  const { packageJson } = readProjectPackage(cwd);
  const settingsPath = resolveSettingsPathFromPackage(cwd, packageJson);
  return {
    settingsPath,
    settings: readAnQstSettingsFromPath(cwd, settingsPath)
  };
}

export function resolveAnQstSpecPath(cwd: string): string {
  const { settings } = resolveAnQstSettings(cwd);
  return path.resolve(cwd, settings.spec);
}

export function resolveAnQstGenerateTargets(cwd: string): string[] {
  const { settings } = resolveAnQstSettings(cwd);
  if (!settings.generate) {
    return [...DEFAULT_ANQST_GENERATE_TARGETS];
  }
  return [...settings.generate];
}

export function resolveAnQstWidgetCategory(cwd: string): string | undefined {
  const { settings } = resolveAnQstSettings(cwd);
  return settings.widgetCategory;
}

export function resolveAnQstWidgetName(cwd: string): string {
  const { settings } = resolveAnQstSettings(cwd);
  return settings.widgetName;
}

export function buildSpecScaffold(widgetName: string): string {
  return `${ANQST_DSL_IMPORT_LINE}

` +
    `declare namespace ${widgetName} {

` +
    `}
`;
}

export function runInstill(cwd: string, widgetName: string): string {
  const cleanName = validateWidgetName(widgetName);
  const { packagePath, packageJson } = readProjectPackage(cwd);
  if (packageJson.AnQst !== undefined) {
    throw new VerifyError("AnQst already instilled, did you mean to run 'npx anqst build'?");
  }

  const anqstRoot = anqstRootDir(cwd);
  fs.mkdirSync(anqstRoot, { recursive: true });
  fs.mkdirSync(path.join(anqstRoot, "generated"), { recursive: true });

  const specPath = path.join(anqstRoot, anqstSpecFileName(cleanName));
  if (fs.existsSync(specPath)) {
    const existingText = fs.readFileSync(specPath, "utf8");
    const normalizedImport = normalizeAnQstImport(existingText);
    if (normalizedImport.changed) {
      fs.writeFileSync(specPath, normalizedImport.nextText, "utf8");
    }
  } else {
    fs.writeFileSync(specPath, buildSpecScaffold(cleanName), "utf8");
  }

  const settingsPath = path.join(anqstRoot, anqstSettingsFileName(cleanName));
  const settings: AnQstProjectSettings = {
    layoutVersion: ANQST_LAYOUT_VERSION,
    widgetName: cleanName,
    spec: `./AnQst/${anqstSpecFileName(cleanName)}`,
    generate: [...DEFAULT_ANQST_GENERATE_TARGETS],
    widgetCategory: "AnQst Widgets"
  };
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

  fs.writeFileSync(path.join(anqstRoot, ".gitignore"), "/generated*\n", "utf8");
  fs.writeFileSync(path.join(anqstRoot, "README.md"), buildAnQstDirectoryReadme(cleanName), "utf8");

  const nextPackage: PackageJsonLike = {
    ...packageJson,
    scripts: {
      ...(packageJson.scripts ?? {}),
      postinstall: ensureBuildHook(packageJson.scripts?.postinstall),
      prebuild: ensureBuildHook(packageJson.scripts?.prebuild),
      prestart: ensureBuildHook(packageJson.scripts?.prestart)
    },
    AnQst: anqstSettingsRelativePath(cleanName)
  };
  fs.writeFileSync(packagePath, `${JSON.stringify(nextPackage, null, 2)}\n`, "utf8");

  updateTsConfig(cwd, cleanName);

  return `Instill completed: configured package.json and scaffolded ${normalizeSlashes(path.relative(cwd, specPath))}`;
}
