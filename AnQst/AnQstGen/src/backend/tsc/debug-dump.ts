import fs from "node:fs";
import path from "node:path";
import util from "node:util";

export function isDebugEnabled(): boolean {
  return process.env.ANQST_DEBUG === "true";
}

function baseIntermediateDir(cwd: string): string {
  return path.join(cwd, "generated_output", "intermediate");
}

export function writeDebugFile(cwd: string, relativePath: string, content: string): void {
  if (!isDebugEnabled()) return;
  try {
    const targetPath = path.join(baseIntermediateDir(cwd), relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[AnQst][debug] Failed writing ${relativePath}: ${message}`);
  }
}

export function inspectText(value: unknown): string {
  return util.inspect(value, {
    depth: null,
    maxArrayLength: null,
    maxStringLength: null,
    breakLength: 120,
    compact: false
  });
}
