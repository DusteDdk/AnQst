import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { VerifyError } from "./errors";
import { inspectText, isDebugEnabled, writeDebugFile } from "./debug-dump";

export interface TscProgramContext {
  specPath: string;
  program: ts.Program;
  checker: ts.TypeChecker;
  sourceFile: ts.SourceFile;
}

const contextBySpecPath = new Map<string, TscProgramContext>();

function diagnosticText(diagnostic: ts.Diagnostic): string {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  if (!diagnostic.file || diagnostic.start === undefined) {
    return diagnosticText(diagnostic);
  }
  const pos = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${diagnostic.file.fileName}:${pos.line + 1}:${pos.character + 1}: ${diagnosticText(diagnostic)}`;
}

function dumpSourceFileAst(sourceFile: ts.SourceFile): string {
  const lines: string[] = [];
  lines.push(`== SOURCE FILE ==`);
  lines.push(sourceFile.fileName);
  lines.push("");
  lines.push("== FULL TEXT ==");
  lines.push(sourceFile.getFullText());
  lines.push("");
  lines.push("== AST NODES ==");
  const walk = (node: ts.Node, depth: number): void => {
    const indent = "  ".repeat(depth);
    const kind = ts.SyntaxKind[node.kind];
    const start = node.getStart(sourceFile, false);
    const end = node.getEnd();
    const text = node.getText(sourceFile).replace(/\s+/g, " ").slice(0, 160);
    lines.push(`${indent}${kind} [${start}, ${end}] ${text}`);
    ts.forEachChild(node, (child) => walk(child, depth + 1));
  };
  walk(sourceFile, 0);
  return `${lines.join("\n")}\n`;
}

function dumpProgramArtifacts(
  specPath: string,
  rootNames: string[],
  options: ts.CompilerOptions,
  program: ts.Program,
  sourceFile: ts.SourceFile
): void {
  if (!isDebugEnabled()) return;
  const cwd = process.cwd();
  const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile).map(formatDiagnostic);
  const sourceFiles = program.getSourceFiles().map((sf) => sf.fileName);
  const contextLines: string[] = [
    `specPath: ${specPath}`,
    "",
    "compilerOptions:",
    inspectText(options),
    "",
    "rootNames:",
    rootNames.join("\n"),
    "",
    "diagnostics:",
    diagnostics.length > 0 ? diagnostics.join("\n") : "(none)"
  ];
  writeDebugFile(cwd, path.join("tsc", "program-context.txt"), `${contextLines.join("\n")}\n`);
  writeDebugFile(cwd, path.join("tsc", "program-files.txt"), `${sourceFiles.join("\n")}\n`);
  writeDebugFile(cwd, path.join("tsc", "sourcefile-ast.txt"), dumpSourceFileAst(sourceFile));
}

function readTsConfigFrom(specPath: string): { rootNames: string[]; options: ts.CompilerOptions } | null {
  const specDir = path.dirname(specPath);
  const configPath = ts.findConfigFile(specDir, ts.sys.fileExists, "tsconfig.json");
  if (!configPath || !fs.existsSync(configPath)) {
    return null;
  }
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) {
    throw new VerifyError(`Unable to parse tsconfig.json: ${diagnosticText(config.error)}`);
  }
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath), {}, configPath);
  return { rootNames: parsed.fileNames, options: parsed.options };
}

export function createTscProgramContext(specPath: string): TscProgramContext {
  const absoluteSpecPath = path.resolve(specPath);
  const tsConfig = readTsConfigFrom(absoluteSpecPath);
  const rootNames = tsConfig ? [...new Set([...tsConfig.rootNames, absoluteSpecPath])] : [absoluteSpecPath];
  const options: ts.CompilerOptions = tsConfig?.options ?? {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    skipLibCheck: true,
    esModuleInterop: true,
    strict: false,
    allowJs: false
  };
  const program = ts.createProgram({ rootNames, options });
  const sourceFile = program.getSourceFile(absoluteSpecPath);
  if (!sourceFile) {
    throw new VerifyError(`Unable to load spec source file into TypeScript program: ${absoluteSpecPath}`);
  }
  const context: TscProgramContext = {
    specPath: absoluteSpecPath,
    program,
    checker: program.getTypeChecker(),
    sourceFile
  };
  dumpProgramArtifacts(absoluteSpecPath, rootNames, options, program, sourceFile);
  contextBySpecPath.set(absoluteSpecPath, context);
  return context;
}

export function getTscProgramContext(specPath: string): TscProgramContext {
  const absoluteSpecPath = path.resolve(specPath);
  const existing = contextBySpecPath.get(absoluteSpecPath);
  if (existing) return existing;
  return createTscProgramContext(absoluteSpecPath);
}

export function getProgramDiagnostics(specPath: string): string[] {
  const context = getTscProgramContext(specPath);
  const diagnostics = ts.getPreEmitDiagnostics(context.program, context.sourceFile);
  return diagnostics.map(formatDiagnostic);
}
