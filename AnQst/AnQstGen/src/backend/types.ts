import type { GenerateOutputsOptions, GeneratedFiles } from "../emit";
import type { ParsedSpecModel, VerificationStats } from "../model";

export type BackendId = "ast" | "tsc";

export interface BackendVerificationResult {
  stats: VerificationStats;
  message: string;
}

export interface GeneratorBackend {
  id: BackendId;
  parseSpecFile(specPath: string): ParsedSpecModel;
  verifySpec(spec: ParsedSpecModel): BackendVerificationResult;
  generateOutputs(spec: ParsedSpecModel, options: GenerateOutputsOptions): GeneratedFiles;
  emitsArtifacts: boolean;
}
