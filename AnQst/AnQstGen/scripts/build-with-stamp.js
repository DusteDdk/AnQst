#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const WEBBASE_DIR_NAME = "AnQstWebBase";
const WEBBASE_TARGET = path.join(ROOT, WEBBASE_DIR_NAME);
const COUNTERS_PATH = path.join(ROOT, ".anqstgen-version-counters.json");
const ACTIVE_PATH = path.join(ROOT, ".anqstgen-version-active.json");
const ABI_STAMP_TS_PATH = path.join(ROOT, "src", "abi-hash-stamp.ts");
const SKIP_DIR_NAMES = new Set([
  ".git",
  ".vs",
  "dist",
  "build",
  "CMakeFiles",
  "node_modules",
  WEBBASE_DIR_NAME
]);
const SKIP_FILE_NAMES = new Set([
  ".anqstgen-version-active.json",
  ".anqstgen-version-counters.json",
  "abi-hash-stamp.ts",
  "AnQstWebBaseAbi.cmake",
  "AnQstWebBaseAbi.h"
]);

function readCounters() {
  if (!fs.existsSync(COUNTERS_PATH)) {
    return {};
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(COUNTERS_PATH, "utf8"));
    const out = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        out[key] = Math.floor(value);
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeCounters(counters) {
  const entries = Object.entries(counters).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) {
    if (fs.existsSync(COUNTERS_PATH)) {
      fs.rmSync(COUNTERS_PATH, { force: true });
    }
    return;
  }
  fs.writeFileSync(COUNTERS_PATH, `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`, "utf8");
}

function readActiveStamp() {
  if (!fs.existsSync(ACTIVE_PATH)) {
    return null;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(ACTIVE_PATH, "utf8"));
    if (typeof parsed.active === "string" && parsed.active.trim().length > 0) {
      return parsed.active.trim();
    }
  } catch {
    return null;
  }
  return null;
}

function writeActiveStamp(active) {
  if (!active || active.trim().length === 0) {
    if (fs.existsSync(ACTIVE_PATH)) {
      fs.rmSync(ACTIVE_PATH, { force: true });
    }
    return;
  }
  fs.writeFileSync(ACTIVE_PATH, `${JSON.stringify({ active }, null, 2)}\n`, "utf8");
}

function resolveGitBuildKey() {
  const shaResult = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32"
  });
  const shortSha = shaResult.status === 0 && shaResult.stdout.trim().length > 0
    ? shaResult.stdout.trim()
    : "nogit";

  const statusResult = spawnSync("git", ["status", "--porcelain"], {
    cwd: ROOT,
    encoding: "utf8",
    shell: process.platform === "win32"
  });
  const dirty = statusResult.status !== 0 || statusResult.stdout.trim().length > 0;
  return `${shortSha}_${dirty ? "dirty" : "clean"}`;
}

function runStep(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  }
}

function isWebBaseSourceDir(dir) {
  return fs.existsSync(path.join(dir, "CMakeLists.txt"))
    && fs.existsSync(path.join(dir, "src", "AnQstWebHostBase.h"));
}

function resolveWebBaseSourceDir() {
  const siblingSource = path.resolve(ROOT, "..", "AnQstWidget", WEBBASE_DIR_NAME);
  if (isWebBaseSourceDir(siblingSource)) {
    return siblingSource;
  }
  if (isWebBaseSourceDir(WEBBASE_TARGET)) {
    return WEBBASE_TARGET;
  }
  throw new Error(`Unable to locate ${WEBBASE_DIR_NAME} sources next to AnQstGen.`);
}

function shouldSkipWebBaseEntry(relativePath) {
  const parts = relativePath.split(path.sep);
  return parts.some((part) => SKIP_DIR_NAMES.has(part));
}

function shouldSkipHashEntry(relativePath) {
  const parts = relativePath.split(path.sep);
  return parts.some((part) => part.startsWith(".") || SKIP_DIR_NAMES.has(part))
    || SKIP_FILE_NAMES.has(parts[parts.length - 1]);
}

function collectHashFiles(rootDir) {
  const files = [];
  const queue = [""];
  while (queue.length > 0) {
    const relativeDir = queue.shift();
    const currentDir = path.join(rootDir, relativeDir);
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const relativePath = path.join(relativeDir, entry.name);
      if (shouldSkipHashEntry(relativePath)) {
        continue;
      }
      const absolutePath = path.join(rootDir, relativePath);
      if (entry.isDirectory()) {
        queue.push(relativePath);
      } else if (entry.isFile()) {
        files.push({ rootDir, relativePath, absolutePath });
      }
    }
  }
  return files;
}

function computeAbiHashStamp(webBaseSourceDir) {
  const hash = crypto.createHash("sha256");
  const roots = [
    { label: "AnQstGen", dir: ROOT },
    { label: "AnQstWebBase", dir: webBaseSourceDir }
  ];
  const files = roots
    .flatMap(({ label, dir }) => collectHashFiles(dir).map((file) => ({ label, ...file })))
    .sort((a, b) => `${a.label}/${a.relativePath}`.localeCompare(`${b.label}/${b.relativePath}`));

  for (const file of files) {
    const normalizedPath = `${file.label}/${file.relativePath.split(path.sep).join("/")}`;
    hash.update(normalizedPath);
    hash.update("\0");
    hash.update(fs.readFileSync(file.absolutePath));
    hash.update("\0");
  }

  return `_${hash.digest("hex")}`;
}

function writeAbiStampTypeScript(stamp) {
  fs.writeFileSync(
    ABI_STAMP_TS_PATH,
    [
      "// Generated by scripts/build-with-stamp.js. Do not edit by hand.",
      `export const ANQST_WEBBASE_ABI_HASH_STAMP = "${stamp}";`,
      ""
    ].join("\n"),
    "utf8"
  );
}

function writeWebBaseAbiStamp(targetDir, stamp) {
  fs.writeFileSync(
    path.join(targetDir, "AnQstWebBaseAbi.cmake"),
    `set(ANQST_WEBBASE_ABI_HASH_STAMP "${stamp}")\n`,
    "utf8"
  );
  fs.writeFileSync(
    path.join(targetDir, "src", "AnQstWebBaseAbi.h"),
    [
      "#pragma once",
      "",
      `#define ANQST_WEBBASE_ABI_HASH_STAMP "${stamp}"`,
      `#define ANQST_WEBBASE_NAMESPACE anqstwebbase${stamp}`,
      ""
    ].join("\n"),
    "utf8"
  );
}

function copyDirectoryTree(sourceDir, targetDir) {
  if (path.resolve(sourceDir) === path.resolve(targetDir)) {
    return;
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  const queue = [""];
  while (queue.length > 0) {
    const relativeDir = queue.shift();
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
        fs.copyFileSync(sourcePath, targetPath);
      }
    }
  }
}

function stageWebBase(stamp) {
  copyDirectoryTree(resolveWebBaseSourceDir(), WEBBASE_TARGET);
  writeWebBaseAbiStamp(WEBBASE_TARGET, stamp);
}

function main() {
  const previousActive = readActiveStamp();
  const counters = readCounters();
  const key = resolveGitBuildKey();
  const nextCount = Object.prototype.hasOwnProperty.call(counters, key) ? counters[key] + 1 : 0;
  counters[key] = nextCount;
  writeCounters(counters);
  const activeStamp = `${key}_build_${nextCount}`;
  writeActiveStamp(activeStamp);
  const abiHashStamp = computeAbiHashStamp(resolveWebBaseSourceDir());
  writeAbiStampTypeScript(abiHashStamp);

  try {
    stageWebBase(abiHashStamp);
    runStep("npm", ["run", "clean"]);
    runStep("tsc", ["-p", "tsconfig.build.json"]);
    runStep("npm", ["run", "chmod:bin"]);
  } catch (error) {
    const rollbackCounters = readCounters();
    const current = rollbackCounters[key];
    if (current !== undefined) {
      if (current > 0) {
        rollbackCounters[key] = current - 1;
      } else {
        delete rollbackCounters[key];
      }
      writeCounters(rollbackCounters);
    }
    writeActiveStamp(previousActive);
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[AnQst] ${message}`);
    process.exit(1);
  }
}

main();
