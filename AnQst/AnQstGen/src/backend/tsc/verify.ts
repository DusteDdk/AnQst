import { VerifyError } from "../../errors";
import type { ParsedSpecModel } from "../../model";
import { verifySpec as verifyWithAst } from "../ast/verify";
import { getProgramDiagnostics } from "./program";

export function verifySpec(spec: ParsedSpecModel) {
  const diagnostics = getProgramDiagnostics(spec.filePath);
  if (diagnostics.length > 0) {
    throw new VerifyError(`TypeScript diagnostics in spec:\n    ${diagnostics.join("\n    ")}`);
  }
  return verifyWithAst(spec);
}
