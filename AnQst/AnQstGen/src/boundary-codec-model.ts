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

export type BoundaryPlanItemKind = "string" | "binary" | "dynamic";
export type BoundaryLeafCapabilityKey = "string" | "dynamic" | ScalarLeafKind | BinaryLeafKind;
export type BoundaryCodecRegion = "blob" | BoundaryPlanItemKind;
export type BoundaryLeafPacking = "bit-packed" | "byte-packed" | "text-packed" | "binary-packed" | "dynamic";
export type BoundaryFiniteDomainPrimitive = "string" | "number" | "boolean";
export type BoundaryFiniteDomainScalarKind = "uint8" | "uint16" | "uint32";
export type BoundaryLoweringTarget = "ts" | "cpp";
export type BoundaryLoweringDirection = "encode" | "decode";
export type BoundaryLoweringMode = "inline" | "helper-call";
export type BoundaryLoweringReason = "trivial-op" | "dedupe" | "complex-op" | "recursion" | "code-size";

export interface BoundaryLoweringSelection {
  mode: BoundaryLoweringMode;
  reason: BoundaryLoweringReason;
  helperNameHint?: string;
}

export interface BoundaryLeafLoweringPlan {
  tsEncode: BoundaryLoweringSelection;
  tsDecode: BoundaryLoweringSelection;
  cppEncode: BoundaryLoweringSelection;
  cppDecode: BoundaryLoweringSelection;
}

export interface BoundaryFiniteDomainVariant {
  code: number;
  symbolicName: string;
  tsLiteralText: string;
  value: string | number | boolean;
}

export interface BoundaryFiniteDomain {
  primitive: BoundaryFiniteDomainPrimitive;
  variants: BoundaryFiniteDomainVariant[];
}

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
  nodeKind: "leaf" | "finite-domain" | "array" | "struct" | "named";
  typeText: string;
  path: string[];
  typeIdentityKey: string;
  cppNameHintParts: string[];
}

export interface TransportLeafAnalysis extends TransportAnalysisBase {
  nodeKind: "leaf";
  leaf: LeafCapabilityDescriptor;
  fixedWidth: boolean;
}

export interface TransportFiniteDomainAnalysis extends TransportAnalysisBase {
  nodeKind: "finite-domain";
  domain: BoundaryFiniteDomain;
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
  typeIdentityKey: string;
  cppNameHintParts: string[];
  reconstructionKey: string;
  node: TransportAnalysisNode;
}

export interface TransportStructAnalysis extends TransportAnalysisBase {
  nodeKind: "struct";
  fields: TransportFieldAnalysis[];
  reconstruction: "object";
}

export interface TransportNamedAnalysis extends TransportAnalysisBase {
  nodeKind: "named";
  name: string;
  target: TransportAnalysisNode;
}

export type TransportAnalysisNode =
  | TransportLeafAnalysis
  | TransportFiniteDomainAnalysis
  | TransportArrayAnalysis
  | TransportStructAnalysis
  | TransportNamedAnalysis;

export interface BoundaryTransportAnalysisSummary {
  hasBlobLeaves: boolean;
  hasStringLeaves: boolean;
  hasBinaryLeaves: boolean;
  hasDynamicLeaves: boolean;
  hasRepeatedStructures: boolean;
  hasOptionalPresence: boolean;
  hasFiniteDomains: boolean;
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
  role: "leaf" | "finite-domain-code" | "array-count" | "optional-presence";
  path: string[];
  widthBytes: number;
  leafKind: ScalarLeafKind;
  logicalKind: string;
}

export interface BoundaryPlanItemEntry {
  entryId: string;
  itemKind: BoundaryPlanItemKind;
  path: string[];
  logicalKind: string;
  order: number;
}

interface BoundaryPlanNodeBase {
  nodeKind: "leaf" | "finite-domain" | "array" | "struct" | "named";
  typeText: string;
  path: string[];
  typeIdentityKey: string;
  cppNameHintParts: string[];
}

export interface BoundaryPlanLeafNode extends BoundaryPlanNodeBase {
  nodeKind: "leaf";
  leaf: LeafCapabilityDescriptor;
  selectedPacking: BoundaryLeafPacking;
  lowering: BoundaryLeafLoweringPlan;
  blobEntryId?: string;
  itemEntryId?: string;
}

export interface BoundaryPlanFiniteDomainNode extends BoundaryPlanNodeBase {
  nodeKind: "finite-domain";
  domain: BoundaryFiniteDomain;
  representation:
    | { kind: "identity-text" }
    | { kind: "coded-scalar"; scalarKind: BoundaryFiniteDomainScalarKind };
  lowering: BoundaryLeafLoweringPlan;
  blobEntryId?: string;
  itemEntryId?: string;
}

export interface BoundaryPlanArrayNode extends BoundaryPlanNodeBase {
  nodeKind: "array";
  extentStrategy: "explicit-count" | "blob-tail" | "item-tail";
  countEntryId?: string;
  elementBlobWidthBytes?: number;
  elementItemCount?: number;
  element: BoundaryPlanNode;
}

export interface BoundaryPlanField {
  name: string;
  optional: boolean;
  typeText: string;
  path: string[];
  presenceStrategy?: "byte-flag";
  presenceEntryId?: string;
  node: BoundaryPlanNode;
}

export interface BoundaryPlanStructNode extends BoundaryPlanNodeBase {
  nodeKind: "struct";
  ordering: "source-order" | "tail-optimized";
  fields: BoundaryPlanField[];
}

export interface BoundaryPlanNamedNode extends BoundaryPlanNodeBase {
  nodeKind: "named";
  name: string;
  target: BoundaryPlanNode;
}

export type BoundaryPlanNode =
  | BoundaryPlanLeafNode
  | BoundaryPlanFiniteDomainNode
  | BoundaryPlanArrayNode
  | BoundaryPlanStructNode
  | BoundaryPlanNamedNode;

export type BoundaryCodecDecodePolicy = "trusted-only";

export interface BoundaryTargetHelperRequirements {
  scalarEncodeKinds: ScalarLeafKind[];
  scalarDecodeKinds: ScalarLeafKind[];
  binaryEncodeKinds: BinaryLeafKind[];
  binaryDecodeKinds: BinaryLeafKind[];
  finiteDomainEncodeHelpers: string[];
  finiteDomainDecodeHelpers: string[];
}

export interface BoundaryCodecRequirements {
  hasBlob: boolean;
  hasItems: boolean;
  itemKinds: BoundaryPlanItemKind[];
  itemCountHeaderKinds: BoundaryPlanItemKind[];
  usesArrayCounts: boolean;
  usesOptionalPresence: boolean;
  usesFiniteDomainCodes: boolean;
  usedScalarLeafKinds: ScalarLeafKind[];
  usedBinaryLeafKinds: BinaryLeafKind[];
  tsHelperRequirements: BoundaryTargetHelperRequirements;
  cppHelperRequirements: BoundaryTargetHelperRequirements;
}

export interface BoundaryCodecPlan {
  codecId: string;
  typeText: string;
  tsTypeText: string;
  decodePolicy: BoundaryCodecDecodePolicy;
  analysis: BoundaryTransportAnalysis;
  root: BoundaryPlanNode;
  blobEntries: BoundaryPlanBlobEntry[];
  itemEntries: BoundaryPlanItemEntry[];
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
