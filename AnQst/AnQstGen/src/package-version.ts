import fs from "node:fs";
import path from "node:path";

export function readAnQstPackageVersion(): string {
  const packageJsonPath = path.resolve(__dirname, "..", "..", "package.json");
  const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
  if (typeof parsed.version !== "string" || parsed.version.trim().length === 0) {
    throw new Error("AnQstGen package.json must contain a non-empty version string.");
  }
  return parsed.version.trim();
}
