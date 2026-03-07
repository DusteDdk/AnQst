import type { GenerateOutputsOptions, GeneratedFiles } from "../../emit";
import type { ParsedSpecModel } from "../../model";
import { generateOutputs as generateWithAst } from "../ast/emit";

export function emitNodeExpressWs(spec: ParsedSpecModel, options: GenerateOutputsOptions): GeneratedFiles {
  if (!options.emitNodeExpressWs) return {};
  return generateWithAst(spec, {
    emitQWidget: false,
    emitAngularService: false,
    emitNodeExpressWs: true
  });
}
