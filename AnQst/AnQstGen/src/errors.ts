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
  if (error.loc) {
    return `[AnQst verify] ${error.loc.file}:${error.loc.line}:${error.loc.column} ${error.message}`;
  }
  return `[AnQst verify] ${error.message}`;
}
