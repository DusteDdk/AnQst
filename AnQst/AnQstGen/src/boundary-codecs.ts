import type { ParsedSpecModel } from "./model";
import { writeDebugFile } from "./debug-dump";
import {
  codecSiteKey,
  sanitizeIdentifier,
  stripAnQstType,
  type BoundaryCodecCatalog,
  type BoundaryCodecPlan,
  type BoundaryCodecSite
} from "./boundary-codec-model";
import { BoundaryTransportAnalyzer } from "./boundary-codec-analysis";
import { buildBoundaryCodecPlan } from "./boundary-codec-plan";
export { renderCppBoundaryCodecHelpers, renderTsBoundaryCodecHelpers } from "./boundary-codec-render";
export type { BoundaryCodecCatalog, BoundaryCodecPlan, BoundaryCodecSite } from "./boundary-codec-model";

function renderAnalysisNode(node: BoundaryCodecPlan["analysis"]["root"], level: number, lines: string[]): void {
  const pad = "  ".repeat(level);
  if (node.nodeKind === "leaf") {
    lines.push(`${pad}- leaf ${node.path.join(".")} :: ${node.leaf.logicalKind} -> ${node.leaf.region}`);
    return;
  }
  if (node.nodeKind === "array") {
    lines.push(`${pad}- array ${node.path.join(".")} :: count metadata required`);
    renderAnalysisNode(node.element, level + 1, lines);
    return;
  }
  lines.push(`${pad}- struct ${node.path.join(".")}`);
  for (const field of node.fields) {
    lines.push(`${pad}  field ${field.name}${field.optional ? "?" : ""}`);
    renderAnalysisNode(field.node, level + 2, lines);
  }
}

function renderPlanNode(node: BoundaryCodecPlan["root"], level: number, lines: string[]): void {
  const pad = "  ".repeat(level);
  if (node.nodeKind === "leaf") {
    if (node.leaf.region === "blob") {
      lines.push(`${pad}- blob leaf ${node.path.join(".")} -> ${node.blobEntryId}`);
    } else {
      lines.push(`${pad}- ${node.leaf.region} leaf ${node.path.join(".")} -> ${node.regionEntryId}`);
    }
    return;
  }
  if (node.nodeKind === "array") {
    lines.push(`${pad}- array ${node.path.join(".")} count=${node.countEntryId}`);
    renderPlanNode(node.element, level + 1, lines);
    return;
  }
  lines.push(`${pad}- struct ${node.path.join(".")}`);
  for (const field of node.fields) {
    lines.push(`${pad}  field ${field.name}${field.optional ? `? presence=${field.presenceEntryId}` : ""}`);
    renderPlanNode(field.node, level + 2, lines);
  }
}

function renderBoundaryDebugSummaries(plans: BoundaryCodecPlan[]): { analyses: string; plans: string } {
  const analysisChunks: string[] = [];
  const planChunks: string[] = [];
  for (const plan of plans) {
    analysisChunks.push(`codec ${plan.codecId} :: ${plan.typeText}`);
    analysisChunks.push(`summary ${JSON.stringify(plan.analysis.summary)}`);
    renderAnalysisNode(plan.analysis.root, 1, analysisChunks);
    analysisChunks.push("");

    planChunks.push(`codec ${plan.codecId} :: ${plan.typeText}`);
    planChunks.push(
      `regions blob=${plan.blobEntries.length} string=${plan.stringEntries.length} binary=${plan.binaryEntries.length} dynamic=${plan.dynamicEntries.length}`
    );
    renderPlanNode(plan.root, 1, planChunks);
    planChunks.push("");
  }
  return {
    analyses: `${analysisChunks.join("\n")}\n`,
    plans: `${planChunks.join("\n")}\n`
  };
}

export function buildBoundaryCodecCatalog(spec: ParsedSpecModel): BoundaryCodecCatalog {
  const analyzer = new BoundaryTransportAnalyzer(spec);
  const plans: BoundaryCodecPlan[] = [];
  const plansByCodecId = new Map<string, BoundaryCodecPlan>();
  const codecIdByTypeText = new Map<string, string>();
  const payloadSites = new Map<string, BoundaryCodecSite>();
  const parameterSites = new Map<string, BoundaryCodecSite>();
  const usedCodecIds = new Set<string>();

  const ensureCodec = (typeText: string, pathHintParts: string[]): string => {
    const existing = codecIdByTypeText.get(typeText);
    if (existing) return existing;
    const proposed = `AnQstStructured_${sanitizeIdentifier(stripAnQstType(typeText).replace(/\s+/g, "_"))}`;
    let codecId = proposed;
    let suffix = 2;
    while (usedCodecIds.has(codecId)) {
      codecId = `${proposed}_${suffix++}`;
    }
    usedCodecIds.add(codecId);
    codecIdByTypeText.set(typeText, codecId);
    const analysis = analyzer.analyzeTypeText(typeText, pathHintParts);
    const plan = buildBoundaryCodecPlan(codecId, analysis);
    plans.push(plan);
    plansByCodecId.set(codecId, plan);
    return codecId;
  };

  for (const service of spec.services) {
    for (const member of service.members) {
      if (member.payloadTypeText && member.payloadTypeText.trim() !== "void") {
        const site: BoundaryCodecSite = {
          siteKey: codecSiteKey("payload", service.name, member.name, null),
          kind: "payload",
          serviceName: service.name,
          memberName: member.name,
          parameterName: null,
          typeText: member.payloadTypeText,
          codecId: ensureCodec(member.payloadTypeText, [service.name, member.name, "Payload"])
        };
        payloadSites.set(site.siteKey, site);
      }
      for (const parameter of member.parameters) {
        const site: BoundaryCodecSite = {
          siteKey: codecSiteKey("parameter", service.name, member.name, parameter.name),
          kind: "parameter",
          serviceName: service.name,
          memberName: member.name,
          parameterName: parameter.name,
          typeText: parameter.typeText,
          codecId: ensureCodec(parameter.typeText, [service.name, member.name, parameter.name])
        };
        parameterSites.set(site.siteKey, site);
      }
    }
  }

  const debug = renderBoundaryDebugSummaries(plans);
  writeDebugFile(process.cwd(), "codecs/boundary-transport-analysis.txt", debug.analyses);
  writeDebugFile(process.cwd(), "codecs/boundary-plans.txt", debug.plans);

  return {
    plans,
    plansByCodecId,
    payloadSites,
    parameterSites
  };
}

export function getBoundaryPayloadSite(
  catalog: BoundaryCodecCatalog,
  serviceName: string,
  memberName: string
): BoundaryCodecSite | undefined {
  return catalog.payloadSites.get(codecSiteKey("payload", serviceName, memberName, null));
}

export function getBoundaryParameterSite(
  catalog: BoundaryCodecCatalog,
  serviceName: string,
  memberName: string,
  parameterName: string
): BoundaryCodecSite | undefined {
  return catalog.parameterSites.get(codecSiteKey("parameter", serviceName, memberName, parameterName));
}
