import fs from "node:fs";
import path from "node:path";
import { VerifyError } from "./errors";

interface PackageJsonLike {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  AnQst?: {
    spec?: string;
    generate?: string[];
    widgetCategory?: string;
  };
  [key: string]: unknown;
}

export const DEFAULT_ANQST_GENERATE_TARGETS = ["QWidget", "AngularService", "//DOM", "//node_express_ws"] as const;
const ANQST_DSL_IMPORT_LINE = 'import type { AnQst } from "@dusted/anqst";';

function readJsonFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function prependScript(existing: string | undefined, prefix: string): string {
  if (!existing || existing.trim().length === 0) return prefix;
  const trimmed = existing.trim();
  if (trimmed === prefix || trimmed.startsWith(`${prefix} &&`)) return trimmed;
  return `${prefix} && ${trimmed}`;
}

export interface ProjectPackageContext {
  packagePath: string;
  packageJson: PackageJsonLike;
}

export function readProjectPackage(cwd: string): ProjectPackageContext {
  const packagePath = path.join(cwd, "package.json");
  if (!fs.existsSync(packagePath)) {
    throw new VerifyError("No package.json: Can only instill AnQst inside an npm project.");
  }
  return {
    packagePath,
    packageJson: readJsonFile<PackageJsonLike>(packagePath)
  };
}

export function resolveAnQstSpecPath(cwd: string): string {
  const { packageJson } = readProjectPackage(cwd);
  const spec = packageJson.AnQst?.spec;
  if (!spec || spec.trim().length === 0) {
    throw new VerifyError("Missing package.json key 'AnQst.spec'. Run 'anqst instill <WidgetName>' first.");
  }
  return path.resolve(cwd, spec);
}

export function resolveAnQstGenerateTargets(cwd: string): string[] {
  const { packageJson } = readProjectPackage(cwd);
  const configured = packageJson.AnQst?.generate;
  if (configured === undefined) {
    return [...DEFAULT_ANQST_GENERATE_TARGETS];
  }
  if (!Array.isArray(configured) || configured.some((value) => typeof value !== "string")) {
    throw new VerifyError("Invalid package.json key 'AnQst.generate': expected string array.");
  }
  return [...configured];
}

export function resolveAnQstWidgetCategory(cwd: string): string | undefined {
  const { packageJson } = readProjectPackage(cwd);
  const configured = packageJson.AnQst?.widgetCategory;
  if (configured === undefined) {
    return undefined;
  }
  if (typeof configured !== "string") {
    throw new VerifyError("Invalid package.json key 'AnQst.widgetCategory': expected string.");
  }
  const trimmed = configured.trim();
  if (trimmed.length === 0) {
    throw new VerifyError("Invalid package.json key 'AnQst.widgetCategory': expected non-empty string.");
  }
  return trimmed;
}

export function buildSpecScaffold(widgetName: string): string {
  return `${ANQST_DSL_IMPORT_LINE}

declare namespace ${widgetName} {

}
`;
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

function extractDeclaredNamespace(specText: string): string | null {
  const match = specText.match(/^\s*declare\s+namespace\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\{/m);
  return match ? match[1] : null;
}

function readLineSync(): string {
  const out: number[] = [];
  const buf = Buffer.alloc(1);
  while (true) {
    const bytesRead = fs.readSync(0, buf, 0, 1, null);
    if (bytesRead <= 0) break;
    const code = buf[0];
    if (code === 10) break; // \n
    if (code === 13) continue; // \r
    out.push(code);
  }
  return Buffer.from(out).toString("utf8").trim();
}

function chooseWidgetNamePreference(
  argumentName: string,
  namespaceName: string,
  specFileName: string
): "argument" | "namespace" {
  const envChoice = process.env.ANQST_INSTILL_WIDGET_NAME_CHOICE;
  if (envChoice === "argument" || envChoice === "namespace") {
    return envChoice;
  }
  if (!process.stdin.isTTY) {
    console.warn(
      `[AnQst] Existing template ${specFileName} declares namespace '${namespaceName}', but command used '${argumentName}'. Non-interactive session; defaulting to '${argumentName}'.`
    );
    return "argument";
  }
  console.log(`[AnQst] Existing template ${specFileName} declares namespace '${namespaceName}'.`);
  console.log(`Choose widget name: [1] ${argumentName} (command argument), [2] ${namespaceName} (template namespace)`);
  while (true) {
    process.stdout.write("Selection [1/2]: ");
    const answer = readLineSync().toLowerCase();
    if (answer === "1" || answer === argumentName.toLowerCase() || answer === "argument") {
      return "argument";
    }
    if (answer === "2" || answer === namespaceName.toLowerCase() || answer === "namespace") {
      return "namespace";
    }
    console.log("Please type 1 or 2.");
  }
}

export function runInstill(cwd: string, widgetName: string): string {
  if (!widgetName || widgetName.trim().length === 0) {
    throw new VerifyError("Usage: anqst instill <WidgetName>");
  }
  const cleanName = widgetName.trim();
  const { packagePath, packageJson } = readProjectPackage(cwd);
  if (packageJson.AnQst) {
    throw new VerifyError("AnQst already instilled, did you mean to run 'npx anqst build'?");
  }

  let resolvedWidgetName = cleanName;
  const requestedSpecPath = path.join(cwd, `${cleanName}.AnQst.d.ts`);
  const requestedSpecFileName = path.basename(requestedSpecPath);
  if (fs.existsSync(requestedSpecPath)) {
    const existingText = fs.readFileSync(requestedSpecPath, "utf8");
    const normalizedImport = normalizeAnQstImport(existingText);
    if (normalizedImport.changed) {
      fs.writeFileSync(requestedSpecPath, normalizedImport.nextText, "utf8");
    }
    const declaredNamespace = extractDeclaredNamespace(normalizedImport.nextText);
    if (declaredNamespace && declaredNamespace !== cleanName) {
      const choice = chooseWidgetNamePreference(cleanName, declaredNamespace, requestedSpecFileName);
      if (choice === "namespace") {
        resolvedWidgetName = declaredNamespace;
      }
    }
  }

  const next: PackageJsonLike = {
    ...packageJson,
    scripts: {
      ...packageJson.scripts,
      build: prependScript(packageJson.scripts?.build, "npx anqst build"),
      test: prependScript(packageJson.scripts?.test, "npx anqst test")
    },
    AnQst: {
      spec: `${resolvedWidgetName}.AnQst.d.ts`,
      generate: [...DEFAULT_ANQST_GENERATE_TARGETS]
    }
  };

  fs.writeFileSync(packagePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  const resolvedSpecPath = path.join(cwd, `${resolvedWidgetName}.AnQst.d.ts`);
  let createdScaffold = false;
  if (!fs.existsSync(resolvedSpecPath)) {
    if (resolvedWidgetName !== cleanName && fs.existsSync(requestedSpecPath)) {
      fs.renameSync(requestedSpecPath, resolvedSpecPath);
      const movedText = fs.readFileSync(resolvedSpecPath, "utf8");
      const normalizedMovedImport = normalizeAnQstImport(movedText);
      if (normalizedMovedImport.changed) {
        fs.writeFileSync(resolvedSpecPath, normalizedMovedImport.nextText, "utf8");
      }
    } else {
      fs.writeFileSync(resolvedSpecPath, buildSpecScaffold(resolvedWidgetName), "utf8");
      createdScaffold = true;
    }
  }

  const mode = createdScaffold ? "scaffolded" : "using";
  return `Instill completed: configured package.json and ${mode} ${resolvedWidgetName}.AnQst.d.ts`;
}
