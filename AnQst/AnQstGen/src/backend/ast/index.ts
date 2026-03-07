import { generateOutputs } from "./emit";
import { parseSpecFile } from "./parser";
import { verifySpec } from "./verify";
import type { GeneratorBackend } from "../types";

export const astBackend: GeneratorBackend = {
  id: "ast",
  parseSpecFile,
  verifySpec,
  generateOutputs,
  emitsArtifacts: true
};
