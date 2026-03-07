import type { GeneratorBackend } from "../types";
import type { GenerateOutputsOptions, GeneratedFiles } from "../../emit";
import type { ParsedSpecModel } from "../../model";
import { emitCppQWidget } from "./emit-cpp";
import { emitNodeExpressWs } from "./emit-node";
import { parseSpecFile } from "./parser";
import { verifySpec } from "./verify";

function mergeGeneratedFiles(...parts: GeneratedFiles[]): GeneratedFiles {
  const out: GeneratedFiles = {};
  for (const part of parts) {
    for (const [key, value] of Object.entries(part)) {
      out[key] = value;
    }
  }
  return out;
}

function formatTargets(options: GenerateOutputsOptions): string {
  const enabled: string[] = [];
  if (options.emitQWidget) enabled.push("QWidget");
  if (options.emitNodeExpressWs) enabled.push("node_express_ws");
  if (enabled.length === 0) return "none";
  return enabled.join(", ");
}

function logBackendInput(spec: ParsedSpecModel, options: GenerateOutputsOptions): void {
  console.log(
    `[AnQst][backend=tsc] parsed widget=${spec.widgetName}, services=${spec.services.length}, targets=${formatTargets(options)}`
  );
}

export const tscBackend: GeneratorBackend = {
  id: "tsc",
  parseSpecFile,
  verifySpec,
  generateOutputs(spec, options) {
    logBackendInput(spec, options);
    const cpp = emitCppQWidget(spec, options);
    const node = emitNodeExpressWs(spec, options);
    return mergeGeneratedFiles(cpp, node);
  },
  emitsArtifacts: true
};
