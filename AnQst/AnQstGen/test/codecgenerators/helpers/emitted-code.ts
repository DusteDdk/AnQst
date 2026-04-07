import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { TestContext } from "node:test";
import { BASE93_ALPHABET } from "../../../src/base93";

export const VALID_BASE93_CHARS = new Set(BASE93_ALPHABET.split(""));

const CPP_COMPILER_CANDIDATES = ["c++", "g++", "clang++"] as const;

let cachedCppCompiler: string | null | undefined;

export function evalEmittedFunction<T>(source: string): T {
  return new Function(`return (${source});`)() as T;
}

function detectCppCompiler(): string | null {
  if (cachedCppCompiler !== undefined) return cachedCppCompiler;

  for (const candidate of CPP_COMPILER_CANDIDATES) {
    const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (!probe.error && probe.status === 0) {
      cachedCppCompiler = candidate;
      return candidate;
    }
  }

  cachedCppCompiler = null;
  return null;
}

function formatSpawnFailure(step: string, command: string, args: string[], result: ReturnType<typeof spawnSync>): string {
  const message = result.error?.message ?? `exit status ${result.status ?? "unknown"}`;
  const stderr = String(result.stderr ?? "").trim();
  return [
    `${step} failed: ${command} ${args.join(" ")}`,
    message,
    stderr ? `stderr:\n${stderr}` : ""
  ].filter(Boolean).join("\n");
}

export function compileCppProgram(t: TestContext, programName: string, source: string): string | null {
  const compiler = detectCppCompiler();
  if (!compiler) {
    t.skip("Skipping generated C++ interoperability test because no compiler was found.");
    return null;
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anqst-codec-cpp-"));
  t.after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const sourcePath = path.join(tempRoot, `${programName}.cpp`);
  const executablePath = path.join(tempRoot, process.platform === "win32" ? `${programName}.exe` : programName);
  fs.writeFileSync(sourcePath, source, "utf8");

  const args = ["-std=c++17", "-O2", sourcePath, "-o", executablePath];
  const compile = spawnSync(compiler, args, { encoding: "utf8" });
  assert.equal(compile.status, 0, formatSpawnFailure("C++ compilation", compiler, args, compile));

  return executablePath;
}

export function runCppProgram(executablePath: string, input = ""): string {
  const run = spawnSync(executablePath, [], { encoding: "utf8", input });
  assert.equal(run.status, 0, formatSpawnFailure("Generated C++ program", executablePath, [], run));
  return run.stdout;
}

export function assertBase93Alphabet(value: string): void {
  for (let i = 0; i < value.length; i++) {
    assert.ok(VALID_BASE93_CHARS.has(value[i]), `char '${value[i]}' at ${i} not in base93 alphabet`);
  }
}
