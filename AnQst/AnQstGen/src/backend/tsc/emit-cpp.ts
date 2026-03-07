import type { GenerateOutputsOptions, GeneratedFiles } from "../../emit";
import type { ParsedSpecModel } from "../../model";
import { generateOutputs as generateWithAst } from "../ast/emit";

export function emitCppQWidget(spec: ParsedSpecModel, options: GenerateOutputsOptions): GeneratedFiles {
  if (!options.emitQWidget) return {};
  return generateWithAst(spec, {
    emitQWidget: true,
    emitAngularService: false,
    emitNodeExpressWs: false
  });
}
