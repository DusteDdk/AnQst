import ts from "typescript";

export function stripAnQstType(typeText: string): string {
  return typeText
    .replace(/\bAnQst\.Type\.stringArray\b/g, "string[]")
    .replace(/\bAnQst\.Type\.string\b/g, "string")
    .replace(/\bAnQst\.Type\.number\b/g, "number")
    .replace(/\bAnQst\.Type\.qint64\b/g, "bigint")
    .replace(/\bAnQst\.Type\.quint64\b/g, "bigint")
    .replace(/\bAnQst\.Type\.qint32\b/g, "number")
    .replace(/\bAnQst\.Type\.quint32\b/g, "number")
    .replace(/\bAnQst\.Type\.qint16\b/g, "number")
    .replace(/\bAnQst\.Type\.quint16\b/g, "number")
    .replace(/\bAnQst\.Type\.qint8\b/g, "number")
    .replace(/\bAnQst\.Type\.quint8\b/g, "number")
    .replace(/\bAnQst\.Type\.int32\b/g, "number")
    .replace(/\bAnQst\.Type\.uint32\b/g, "number")
    .replace(/\bAnQst\.Type\.int16\b/g, "number")
    .replace(/\bAnQst\.Type\.uint16\b/g, "number")
    .replace(/\bAnQst\.Type\.int8\b/g, "number")
    .replace(/\bAnQst\.Type\.uint8\b/g, "number")
    .replace(/\bAnQst\.Type\.buffer\b/g, "ArrayBuffer")
    .replace(/\bAnQst\.Type\.blob\b/g, "ArrayBuffer")
    .replace(/\bAnQst\.Type\.typedArray\b/g, "Uint8Array")
    .replace(/\bAnQst\.Type\.uint8Array\b/g, "Uint8Array")
    .replace(/\bAnQst\.Type\.int8Array\b/g, "Int8Array")
    .replace(/\bAnQst\.Type\.uint16Array\b/g, "Uint16Array")
    .replace(/\bAnQst\.Type\.int16Array\b/g, "Int16Array")
    .replace(/\bAnQst\.Type\.uint32Array\b/g, "Uint32Array")
    .replace(/\bAnQst\.Type\.int32Array\b/g, "Int32Array")
    .replace(/\bAnQst\.Type\.float32Array\b/g, "Float32Array")
    .replace(/\bAnQst\.Type\.float64Array\b/g, "Float64Array")
    .replace(/\bAnQst\.Type\.object\b/g, "object")
    .replace(/\bAnQst\.Type\.json\b/g, "object");
}

export function parseTypeNodeFromText(typeText: string): ts.TypeNode {
  const source = ts.createSourceFile(
    "__inline__.ts",
    `type __X = ${typeText};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const stmt = source.statements.find(ts.isTypeAliasDeclaration);
  if (!stmt) {
    throw new Error(`Unable to parse type text: ${typeText}`);
  }
  return stmt.type;
}

export function parseTypeDeclNode(nodeText: string): ts.InterfaceDeclaration | ts.TypeAliasDeclaration | null {
  const source = ts.createSourceFile("__decl.ts", nodeText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const stmt of source.statements) {
    if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) {
      return stmt;
    }
  }
  return null;
}

export function qNameText(name: ts.EntityName): string {
  if (ts.isIdentifier(name)) return name.text;
  return `${qNameText(name.left)}.${name.right.text}`;
}

export function sanitizeIdentifier(value: string): string {
  const trimmed = value.replace(/[^A-Za-z0-9_]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  const withFallback = trimmed.length > 0 ? trimmed : "Codec";
  return /^[0-9]/.test(withFallback) ? `T_${withFallback}` : withFallback;
}

export function codecSiteKey(
  kind: "payload" | "parameter",
  serviceName: string,
  memberName: string,
  parameterName: string | null
): string {
  return kind === "payload"
    ? `${serviceName}::${memberName}::payload`
    : `${serviceName}::${memberName}::param::${parameterName ?? ""}`;
}

export type ScalarLeafKind =
  | "boolean"
  | "number"
  | "qint64"
  | "quint64"
  | "qint32"
  | "quint32"
  | "qint16"
  | "quint16"
  | "qint8"
  | "quint8"
  | "int32"
  | "uint32"
  | "int16"
  | "uint16"
  | "int8"
  | "uint8";

export type BinaryLeafKind =
  | "ArrayBuffer"
  | "Uint8Array"
  | "Int8Array"
  | "Uint16Array"
  | "Int16Array"
  | "Uint32Array"
  | "Int32Array"
  | "Float32Array"
  | "Float64Array";

export type BoundaryLeafCapabilityKey = "string" | "dynamic" | ScalarLeafKind | BinaryLeafKind;
export type BoundaryCodecRegion = "blob" | "string" | "binary" | "dynamic";
export type BoundaryLeafPacking = "bit-packed" | "byte-packed" | "text-packed" | "binary-packed" | "dynamic";

export interface TargetMaterializationFacts {
  tsTypeText: string;
  cppTypeTextHint: string | null;
  requiresDecodeAllocation: boolean;
  ownership: "value" | "copied-buffer" | "dynamic";
}

export interface LeafCapabilityDescriptor {
  key: BoundaryLeafCapabilityKey;
  logicalKind: string;
  region: BoundaryCodecRegion;
  fixedByteWidth: number | null;
  mayConsumeTail: boolean;
  mayGroupSharedRegion: boolean;
  supportedPackings: BoundaryLeafPacking[];
  requiresCountMetadata: boolean;
  targetMaterialization: TargetMaterializationFacts;
}

interface TransportAnalysisBase {
  nodeKind: "leaf" | "array" | "struct";
  typeText: string;
  path: string[];
}

export interface TransportLeafAnalysis extends TransportAnalysisBase {
  nodeKind: "leaf";
  leaf: LeafCapabilityDescriptor;
  fixedWidth: boolean;
}

export interface TransportArrayAnalysis extends TransportAnalysisBase {
  nodeKind: "array";
  elementTypeText: string;
  element: TransportAnalysisNode;
  requiresCountMetadata: true;
  reconstruction: "array";
}

export interface TransportFieldAnalysis {
  name: string;
  optional: boolean;
  typeText: string;
  path: string[];
  reconstructionKey: string;
  node: TransportAnalysisNode;
}

export interface TransportStructAnalysis extends TransportAnalysisBase {
  nodeKind: "struct";
  fields: TransportFieldAnalysis[];
  reconstruction: "object";
}

export type TransportAnalysisNode = TransportLeafAnalysis | TransportArrayAnalysis | TransportStructAnalysis;

export interface BoundaryTransportAnalysisSummary {
  hasBlobLeaves: boolean;
  hasStringLeaves: boolean;
  hasBinaryLeaves: boolean;
  hasDynamicLeaves: boolean;
  hasRepeatedStructures: boolean;
  hasOptionalPresence: boolean;
  usedLeafCapabilities: BoundaryLeafCapabilityKey[];
}

export interface BoundaryTransportAnalysis {
  typeText: string;
  tsTypeText: string;
  root: TransportAnalysisNode;
  summary: BoundaryTransportAnalysisSummary;
}

export interface BoundaryPlanBlobEntry {
  entryId: string;
  role: "leaf" | "array-count" | "optional-presence";
  path: string[];
  widthBytes: number;
  leafKind: ScalarLeafKind;
  logicalKind: string;
}

export interface BoundaryPlanRegionEntry {
  entryId: string;
  region: Exclude<BoundaryCodecRegion, "blob">;
  path: string[];
  logicalKind: string;
}

interface BoundaryPlanNodeBase {
  nodeKind: "leaf" | "array" | "struct";
  typeText: string;
  path: string[];
}

export interface BoundaryPlanLeafNode extends BoundaryPlanNodeBase {
  nodeKind: "leaf";
  leaf: LeafCapabilityDescriptor;
  blobEntryId?: string;
  regionEntryId?: string;
}

export interface BoundaryPlanArrayNode extends BoundaryPlanNodeBase {
  nodeKind: "array";
  countEntryId: string;
  element: BoundaryPlanNode;
}

export interface BoundaryPlanField {
  name: string;
  optional: boolean;
  typeText: string;
  path: string[];
  presenceEntryId?: string;
  node: BoundaryPlanNode;
}

export interface BoundaryPlanStructNode extends BoundaryPlanNodeBase {
  nodeKind: "struct";
  fields: BoundaryPlanField[];
}

export type BoundaryPlanNode = BoundaryPlanLeafNode | BoundaryPlanArrayNode | BoundaryPlanStructNode;

export interface BoundaryCodecRequirements {
  hasBlob: boolean;
  hasStrings: boolean;
  hasBinaries: boolean;
  hasDynamics: boolean;
  usesArrayCounts: boolean;
  usesOptionalPresence: boolean;
  requiresCountPass: boolean;
  staticStringEntries: number;
  staticBinaryEntries: number;
  staticDynamicEntries: number;
  usedScalarLeafKinds: ScalarLeafKind[];
  usedBinaryLeafKinds: BinaryLeafKind[];
}

export interface BoundaryCodecPlan {
  codecId: string;
  typeText: string;
  tsTypeText: string;
  analysis: BoundaryTransportAnalysis;
  root: BoundaryPlanNode;
  blobEntries: BoundaryPlanBlobEntry[];
  stringEntries: BoundaryPlanRegionEntry[];
  binaryEntries: BoundaryPlanRegionEntry[];
  dynamicEntries: BoundaryPlanRegionEntry[];
  requirements: BoundaryCodecRequirements;
}

export interface BoundaryCodecSite {
  siteKey: string;
  kind: "payload" | "parameter";
  serviceName: string;
  memberName: string;
  parameterName: string | null;
  typeText: string;
  codecId: string;
}

export interface BoundaryCodecCatalog {
  plans: BoundaryCodecPlan[];
  plansByCodecId: Map<string, BoundaryCodecPlan>;
  payloadSites: Map<string, BoundaryCodecSite>;
  parameterSites: Map<string, BoundaryCodecSite>;
}
