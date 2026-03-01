import path from "node:path";
import type { SourceLoc } from "./model";

export class VerifyError extends Error {
  public readonly loc?: SourceLoc;

  constructor(message: string, loc?: SourceLoc) {
    super(message);
    this.name = "VerifyError";
    this.loc = loc;
  }
}

export function formatVerifyError(error: VerifyError): string {
  const normalizeSlashes = (inputPath: string): string => inputPath.split(path.sep).join("/");
  const normalizedFile = normalizeSlashes(error.loc?.file ?? "<unknown>");
  if (error.loc) {
    return `\nAnQst spec invalid: ${normalizedFile}\n    ${normalizedFile}:${error.loc.line}:${error.loc.column} ${error.message}\n`;
  }
  return `\nAnQst spec invalid: ${normalizedFile}\n    ${error.message}\n`;
}
