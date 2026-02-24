import fs from "node:fs";
import path from "node:path";
import { VerifyError } from "./errors";

interface PackageJsonLike {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  AnQst?: {
    spec?: string;
  };
  [key: string]: unknown;
}

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

function loadDslSource(): string {
  const candidates = [
    path.resolve(__dirname, "../../spec/AnQst-Spec-DSL.d.ts"),
    path.resolve(__dirname, "../../../spec/AnQst-Spec-DSL.d.ts")
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf8");
  }
  return `export namespace AnQst {
  interface Service {}
  interface Call<T> { dummy: T }
  interface CallSync<T> { dummy: T }
  interface Slot<T> { dummy: T }
  interface Emitter {}
  interface Output<T> {}
  interface Input<T> {}
  enum Type {
    string = "string",
    number = "number",
    qint64 = "qint64",
    qint32 = "qint32"
  }
}`;
}

export function installDslShim(cwd: string): void {
  const dslDir = path.join(cwd, "anqst-dsl");
  fs.mkdirSync(dslDir, { recursive: true });
  fs.writeFileSync(path.join(dslDir, "AnQst-Spec-DSL.d.ts"), loadDslSource(), "utf8");
}

export function buildSpecScaffold(widgetName: string): string {
  return `import { AnQst } from "./anqst-dsl/AnQst-Spec-DSL";

declare namespace ${widgetName} {

}
`;
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

  const next: PackageJsonLike = {
    ...packageJson,
    scripts: {
      ...packageJson.scripts,
      build: prependScript(packageJson.scripts?.build, "npx anqst build"),
      test: prependScript(packageJson.scripts?.test, "npx anqst test")
    },
    AnQst: {
      spec: `${cleanName}.AnQst.d.ts`
    }
  };

  fs.writeFileSync(packagePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  const specPath = path.join(cwd, `${cleanName}.AnQst.d.ts`);
  if (!fs.existsSync(specPath)) {
    fs.writeFileSync(specPath, buildSpecScaffold(cleanName), "utf8");
  }
  installDslShim(cwd);
  return `Instill completed: configured package.json and scaffolded ${cleanName}.AnQst.d.ts`;
}
