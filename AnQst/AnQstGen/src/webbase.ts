import fs from "node:fs";
import path from "node:path";
import { anqstWebBaseAbiStamp, anqstWebBaseNamespaceName } from "./abi-stamp";
import { writeTextFileUnix } from "./newlines";

export const ANQST_WEBBASE_DIR_NAME = "AnQstWebBase";

const SKIP_DIR_NAMES = new Set([
  ".git",
  ".vs",
  "build",
  "CMakeFiles",
  "node_modules"
]);

export function resolveAnQstGenRoot(): string {
  return path.resolve(__dirname, "..", "..");
}

function isWebBaseSourceDir(dir: string): boolean {
  return fs.existsSync(path.join(dir, "CMakeLists.txt"))
    && fs.existsSync(path.join(dir, "src", "AnQstWebHostBase.h"));
}

export function resolveAnQstWebBaseSourceDir(): string {
  const root = resolveAnQstGenRoot();
  const candidates = [
    path.join(root, ANQST_WEBBASE_DIR_NAME),
    path.resolve(root, "..", "AnQstWidget", ANQST_WEBBASE_DIR_NAME)
  ];

  for (const candidate of candidates) {
    if (isWebBaseSourceDir(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to locate ${ANQST_WEBBASE_DIR_NAME} sources.`);
}

function shouldSkipWebBaseEntry(relativePath: string): boolean {
  const parts = relativePath.split(path.sep);
  return parts.some((part) => SKIP_DIR_NAMES.has(part));
}

export function copyAnQstWebBaseTree(sourceDir: string, targetDir: string): void {
  if (!isWebBaseSourceDir(sourceDir)) {
    throw new Error(`Invalid ${ANQST_WEBBASE_DIR_NAME} source directory: ${sourceDir}`);
  }
  if (path.resolve(sourceDir) === path.resolve(targetDir)) {
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });
  const queue = [""];
  while (queue.length > 0) {
    const relativeDir = queue.shift()!;
    const currentSourceDir = path.join(sourceDir, relativeDir);
    const entries = fs.readdirSync(currentSourceDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const relativePath = path.join(relativeDir, entry.name);
      if (shouldSkipWebBaseEntry(relativePath)) {
        continue;
      }

      const sourcePath = path.join(sourceDir, relativePath);
      const targetPath = path.join(targetDir, relativePath);
      if (entry.isDirectory()) {
        fs.mkdirSync(targetPath, { recursive: true });
        queue.push(relativePath);
        continue;
      }
      if (entry.isFile()) {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        if (isTextWebBaseFile(sourcePath)) {
          writeTextFileUnix(targetPath, fs.readFileSync(sourcePath, "utf8"));
        } else {
          fs.copyFileSync(sourcePath, targetPath);
        }
      }
    }
  }

  writeAnQstWebBaseAbiStamp(targetDir, anqstWebBaseAbiStamp());
}

export function installAnQstWebBaseTree(targetDir: string): void {
  fs.rmSync(targetDir, { recursive: true, force: true });
  copyAnQstWebBaseTree(resolveAnQstWebBaseSourceDir(), targetDir);
}

export function writeAnQstWebBaseAbiStamp(targetDir: string, stamp: string): void {
  writeTextFileUnix(
    path.join(targetDir, "AnQstWebBaseAbi.cmake"),
    `set(ANQST_WEBBASE_ABI_STAMP "${stamp}")\n`
  );
  writeTextFileUnix(
    path.join(targetDir, "src", "AnQstWebBaseAbi.h"),
    [
      "#pragma once",
      "",
      `#define ANQST_WEBBASE_ABI_STAMP "${stamp}"`,
      `#define ANQST_WEBBASE_NAMESPACE ${anqstWebBaseNamespaceName(stamp)}`,
      ""
    ].join("\n")
  );
}

function isTextWebBaseFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return [
    ".cmake",
    ".cpp",
    ".h",
    ".hpp",
    ".js",
    ".json",
    ".md",
    ".qrc",
    ".txt",
    ".xml"
  ].some((extension) => lower.endsWith(extension))
    || lower.endsWith("cmakelists.txt");
}
