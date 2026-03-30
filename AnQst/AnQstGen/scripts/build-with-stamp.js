#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const COUNTERS_PATH = path.join(ROOT, ".anqstgen-version-counters.json");
const ACTIVE_PATH = path.join(ROOT, ".anqstgen-version-active.json");

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

function main() {
  const previousActive = readActiveStamp();
  const counters = readCounters();
  const key = resolveGitBuildKey();
  const nextCount = Object.prototype.hasOwnProperty.call(counters, key) ? counters[key] + 1 : 0;
  counters[key] = nextCount;
  writeCounters(counters);
  const activeStamp = `${key}_build_${nextCount}`;
  writeActiveStamp(activeStamp);

  try {
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
