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
import { resolveAnQstSpecPath, runInstill } from "./project";

export interface VerifyResult {
  success: true;
  message: string;
}

export function runVerify(specArg: string): VerifyResult {
  const specPath = path.resolve(process.cwd(), specArg);
  const parsed = parseSpecFile(specPath);
  const stats = verifySpec(parsed);
  return {
    success: true,
    message: `Verification passed: Output would be: ${stats.namespaceDeclaredTypes} types, ${stats.reachableGeneratedTypes} types across ${stats.serviceCount} services`
  };
}

export function runGenerate(specArg: string): VerifyResult {
  const specPath = path.resolve(process.cwd(), specArg);
  const parsed = parseSpecFile(specPath);
  verifySpec(parsed);
  const outputs = generateOutputs(parsed);
  writeGeneratedOutputs(process.cwd(), outputs);
  return {
    success: true,
    message: `Generation completed: ${Object.keys(outputs).length} files written to generated_output`
  };
}

export function runTest(cwd: string): VerifyResult {
  const specPath = resolveAnQstSpecPath(cwd);
  const parsed = parseSpecFile(specPath);
  const stats = verifySpec(parsed);
  return {
    success: true,
    message: `Test passed: ${stats.namespaceDeclaredTypes} types, ${stats.reachableGeneratedTypes} reachable types across ${stats.serviceCount} services`
  };
}

export function runBuild(cwd: string): VerifyResult {
  const specPath = resolveAnQstSpecPath(cwd);
  const parsed = parseSpecFile(specPath);
  verifySpec(parsed);
  const outputs = generateOutputs(parsed);
  writeGeneratedOutputs(cwd, outputs);
  installTypeScriptOutputs(cwd);
  installQtIntegrationCMake(cwd, parsed.widgetName);

  const hasAngularProject = fs.existsSync(path.join(cwd, "angular.json"));
  if (hasAngularProject) {
    const angularBuild = spawnSync("npx", ["ng", "build", "--configuration", "production"], {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32"
    });
    if (angularBuild.status !== 0) {
      throw new VerifyError("Angular build failed while preparing embedded widget assets.");
    }
  }

  const embedded = installEmbeddedWebBundle(cwd, parsed.widgetName);
  if (hasAngularProject && !embedded) {
    throw new VerifyError("Unable to embed Angular output. Ensure ng build produced a dist bundle with index.html.");
  }

  return {
    success: true,
    message: "Build completed: TypeScript installed to src/anqst-generated, Qt integration CMake emitted to anqst-cmake/, and C++ widget library refreshed with embedded web assets"
  };
}

export function runCommand(command: string | undefined, specArg: string | undefined): number {
  try {
    if (!command) {
      console.error("[AnQst] Usage: anqst <instill|test|build|generate|verify> [arg]");
      return 1;
    }
    if (command === "instill") {
      if (!specArg) {
        console.error("[AnQst] Usage: anqst instill <WidgetName>");
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
        console.error("[AnQst] Usage: anqst verify <specFile>");
        return 1;
      }
      const res = runVerify(specArg);
      console.log(res.message);
      return 0;
    }
    if (command === "generate") {
      if (!specArg) {
        console.error("[AnQst] Usage: anqst generate <specFile>");
        return 1;
      }
      const res = runGenerate(specArg);
      console.log(res.message);
      return 0;
    }
    console.error(`[AnQst] Unknown command '${command}'. Use 'instill', 'test', 'build', 'generate', or 'verify'.`);
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
