import { parseSpecFile as parseWithAst } from "../ast/parser";
import type { ParsedSpecModel } from "../../model";
import { inspectText, isDebugEnabled, writeDebugFile } from "./debug-dump";
import { createTscProgramContext } from "./program";
import { applyResolvedTypeGraph } from "./typegraph";

export function parseSpecFile(specPath: string): ParsedSpecModel {
  createTscProgramContext(specPath);
  const parsed = parseWithAst(specPath);
  if (isDebugEnabled()) {
    writeDebugFile(
      process.cwd(),
      "anqstmodel/parsed-before-typegraph.txt",
      `${inspectText(parsed)}\n`
    );
  }
  const normalized = applyResolvedTypeGraph(parsed);
  if (isDebugEnabled()) {
    writeDebugFile(
      process.cwd(),
      "anqstmodel/parsed-after-typegraph.txt",
      `${inspectText(normalized)}\n`
    );
  }
  return normalized;
}
