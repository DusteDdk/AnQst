import ts from "typescript";
import type { ParsedSpecModel, TypeDeclModel } from "./model";
import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "./base93";

function stripAnQstType(typeText: string): string {
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

function mapTsTypeToCpp(typeText: string): string {
  const raw = typeText.trim();
  if (/\bAnQst\.Type\.qint64\b/.test(raw)) return "qint64";
  if (/\bAnQst\.Type\.quint64\b/.test(raw)) return "quint64";
  if (/\bAnQst\.Type\.qint32\b/.test(raw)) return "qint32";
  if (/\bAnQst\.Type\.quint32\b/.test(raw)) return "quint32";
  if (/\bAnQst\.Type\.qint16\b/.test(raw)) return "qint16";
  if (/\bAnQst\.Type\.quint16\b/.test(raw)) return "quint16";
  if (/\bAnQst\.Type\.qint8\b/.test(raw)) return "qint8";
  if (/\bAnQst\.Type\.quint8\b/.test(raw)) return "quint8";
  if (/\bAnQst\.Type\.stringArray\b/.test(raw)) return "QStringList";
  if (/\bAnQst\.Type\.string\b/.test(raw)) return "QString";
  if (/\bAnQst\.Type\.json\b/.test(raw) || /\bAnQst\.Type\.object\b/.test(raw)) return "QVariantMap";
  if (
    /\bAnQst\.Type\.(?:buffer|blob|typedArray|uint8Array|int8Array|uint16Array|int16Array|uint32Array|int32Array|float32Array|float64Array)\b/.test(raw)
  ) {
    return "QByteArray";
  }
  if (/\bAnQst\.Type\.(u?int(8|16|32))\b/.test(raw)) {
    const narrowed = raw.match(/\bAnQst\.Type\.(u?int(?:8|16|32))\b/)?.[1];
    if (narrowed === "int8") return "int8_t";
    if (narrowed === "uint8") return "uint8_t";
    if (narrowed === "int16") return "int16_t";
    if (narrowed === "uint16") return "uint16_t";
    if (narrowed === "int32") return "int32_t";
    if (narrowed === "uint32") return "uint32_t";
  }

  const t = stripAnQstType(raw);
  if (t === "string") return "QString";
  if (t === "number") return "double";
  if (t === "boolean") return "bool";
  if (t === "bigint") return "qint64";
  if (t === "void") return "void";
  if (t === "object") return "QVariantMap";
  if (t === "ArrayBuffer") return "QByteArray";
  if (
    [
      "Uint8Array",
      "Int8Array",
      "Uint16Array",
      "Int16Array",
      "Uint32Array",
      "Int32Array",
      "Float32Array",
      "Float64Array"
    ].includes(t)
  ) {
    return "QByteArray";
  }
  if (t.endsWith("[]")) {
    return `QList<${mapTsTypeToCpp(t.slice(0, -2))}>`;
  }
  if (t.includes("|")) return "QString";
  return t;
}

function parseTypeNodeFromText(typeText: string): ts.TypeNode {
  const source = ts.createSourceFile(
    "__inline__.ts",
    `type __X = ${typeText};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const stmt = source.statements.find(ts.isTypeAliasDeclaration);
  if (!stmt) throw new Error(`Unable to parse type text: ${typeText}`);
  return stmt.type;
}

function parseTypeDeclNode(nodeText: string): ts.InterfaceDeclaration | ts.TypeAliasDeclaration | null {
  const sf = ts.createSourceFile("__decl.ts", nodeText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const stmt of sf.statements) {
    if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) return stmt;
  }
  return null;
}

function qNameText(name: ts.EntityName): string {
  if (ts.isIdentifier(name)) return name.text;
  return `${qNameText(name.left)}.${name.right.text}`;
}

function sanitizeIdentifier(value: string): string {
  const trimmed = value.replace(/[^A-Za-z0-9_]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  const withFallback = trimmed.length > 0 ? trimmed : "Codec";
  return /^[0-9]/.test(withFallback) ? `T_${withFallback}` : withFallback;
}

type ScalarLeafKind =
  | "string"
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

type BinaryLeafKind =
  | "ArrayBuffer"
  | "Uint8Array"
  | "Int8Array"
  | "Uint16Array"
  | "Int16Array"
  | "Uint32Array"
  | "Int32Array"
  | "Float32Array"
  | "Float64Array";

interface ShapeBase {
  typeText: string;
  pathHintParts: string[];
}

interface ScalarShape extends ShapeBase {
  kind: "scalar";
  leaf: ScalarLeafKind;
}

interface DynamicShape extends ShapeBase {
  kind: "dynamic";
}

interface BinaryShape extends ShapeBase {
  kind: "binary";
  binary: BinaryLeafKind;
}

interface ArrayShape extends ShapeBase {
  kind: "array";
  elementTypeText: string;
  element: TypeShape;
}

interface StructFieldShape {
  name: string;
  optional: boolean;
  typeText: string;
  pathHintParts: string[];
  shape: TypeShape;
}

interface StructShape extends ShapeBase {
  kind: "struct";
  fields: StructFieldShape[];
}

interface NamedShape extends ShapeBase {
  kind: "named";
  name: string;
  target: TypeShape;
}

type TypeShape = ScalarShape | DynamicShape | BinaryShape | ArrayShape | StructShape | NamedShape;

interface CodecAnalysis {
  hasBlob: boolean;
  hasStrings: boolean;
  hasBinaries: boolean;
  hasDynamics: boolean;
}

export interface StructuredCodecSite {
  siteKey: string;
  kind: "payload" | "parameter";
  serviceName: string;
  memberName: string;
  parameterName: string | null;
  typeText: string;
  codecId: string;
}

interface StructuredCodecDefinition {
  codecId: string;
  typeText: string;
  tsTypeText: string;
  shape: TypeShape;
  analysis: CodecAnalysis;
}

export interface StructuredCodecCatalog {
  codecs: StructuredCodecDefinition[];
  payloadSites: Map<string, StructuredCodecSite>;
  parameterSites: Map<string, StructuredCodecSite>;
}

function scalarShape(typeText: string, pathHintParts: string[], leaf: ScalarLeafKind): ScalarShape {
  return { kind: "scalar", typeText, pathHintParts, leaf };
}

function binaryShape(typeText: string, pathHintParts: string[], binary: BinaryLeafKind): BinaryShape {
  return { kind: "binary", typeText, pathHintParts, binary };
}

function isStringLikeUnion(node: ts.UnionTypeNode): boolean {
  return node.types.every((part) => {
    if (ts.isLiteralTypeNode(part) && ts.isStringLiteral(part.literal)) return true;
    if (part.kind === ts.SyntaxKind.StringKeyword) return true;
    return false;
  });
}

function isBooleanLikeUnion(node: ts.UnionTypeNode): boolean {
  return node.types.every((part) => {
    if (ts.isLiteralTypeNode(part) && (part.literal.kind === ts.SyntaxKind.TrueKeyword || part.literal.kind === ts.SyntaxKind.FalseKeyword)) return true;
    if (part.kind === ts.SyntaxKind.BooleanKeyword) return true;
    return false;
  });
}

function isNumberLikeUnion(node: ts.UnionTypeNode): boolean {
  return node.types.every((part) => {
    if (ts.isLiteralTypeNode(part) && ts.isNumericLiteral(part.literal)) return true;
    if (part.kind === ts.SyntaxKind.NumberKeyword || part.kind === ts.SyntaxKind.BigIntKeyword) return true;
    return false;
  });
}

function filterNullishUnionParts(types: readonly ts.TypeNode[]): ts.TypeNode[] {
  return types.filter((part) => part.kind !== ts.SyntaxKind.NullKeyword && part.kind !== ts.SyntaxKind.UndefinedKeyword);
}

class ShapeResolver {
  private readonly declNodes = new Map<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration>();
  private readonly namedShapes = new Map<string, NamedShape>();

  constructor(private readonly spec: ParsedSpecModel) {
    for (const decl of this.collectDecls()) {
      const node = parseTypeDeclNode(decl.nodeText);
      if (node) this.declNodes.set(decl.name, node);
    }
  }

  resolveTypeText(typeText: string, pathHintParts: string[]): TypeShape {
    return this.resolveTypeNode(parseTypeNodeFromText(typeText), typeText, pathHintParts, []);
  }

  private collectDecls(): TypeDeclModel[] {
    const out = new Map<string, TypeDeclModel>();
    for (const decl of this.spec.namespaceTypeDecls) out.set(decl.name, decl);
    for (const decl of this.spec.importedTypeDecls.values()) out.set(decl.name, decl);
    return [...out.values()];
  }

  private createStructShape(
    typeText: string,
    pathHintParts: string[],
    members: readonly ts.TypeElement[],
    stack: string[]
  ): StructShape {
    return {
      kind: "struct",
      typeText,
      pathHintParts,
      fields: members
        .filter((member): member is ts.PropertySignature & { name: ts.Identifier; type: ts.TypeNode } => {
          return ts.isPropertySignature(member) && !!member.type && ts.isIdentifier(member.name);
        })
        .map((member) => ({
          name: member.name.text,
          optional: !!member.questionToken,
          typeText: member.type.getText(),
          pathHintParts: [...pathHintParts, member.name.text],
          shape: this.resolveTypeNode(member.type, member.type.getText(), [...pathHintParts, member.name.text], stack)
        }))
    };
  }

  private resolveNamedReference(
    name: string,
    decl: ts.InterfaceDeclaration | ts.TypeAliasDeclaration
  ): NamedShape {
    const existing = this.namedShapes.get(name);
    if (existing) return existing;
    const placeholder = {
      kind: "named",
      name,
      typeText: name,
      pathHintParts: [name],
      target: scalarShape(name, [name], "string") as TypeShape
    } satisfies NamedShape;
    this.namedShapes.set(name, placeholder);
    placeholder.target = ts.isInterfaceDeclaration(decl)
      ? this.createStructShape(name, [name], decl.members, [name])
      : this.resolveTypeNode(decl.type, name, [name], [name]);
    return placeholder;
  }

  private resolveTypeNode(node: ts.TypeNode, typeText: string, pathHintParts: string[], stack: string[]): TypeShape {
    if (ts.isParenthesizedTypeNode(node)) {
      return this.resolveTypeNode(node.type, node.type.getText(), pathHintParts, stack);
    }
    if (ts.isTypeLiteralNode(node)) {
      return this.createStructShape(typeText, pathHintParts, node.members, stack);
    }
    if (ts.isArrayTypeNode(node)) {
      return {
        kind: "array",
        typeText,
        pathHintParts,
        elementTypeText: node.elementType.getText(),
        element: this.resolveTypeNode(node.elementType, node.elementType.getText(), [...pathHintParts, "Item"], stack)
      };
    }
    if (ts.isLiteralTypeNode(node)) {
      if (ts.isStringLiteral(node.literal)) return scalarShape(typeText, pathHintParts, "string");
      if (ts.isNumericLiteral(node.literal)) return scalarShape(typeText, pathHintParts, "number");
      if (node.literal.kind === ts.SyntaxKind.TrueKeyword || node.literal.kind === ts.SyntaxKind.FalseKeyword) {
        return scalarShape(typeText, pathHintParts, "boolean");
      }
    }
    if (ts.isUnionTypeNode(node)) {
      const filtered = filterNullishUnionParts(node.types);
      if (filtered.length === 1) {
        return this.resolveTypeNode(filtered[0], filtered[0].getText(), pathHintParts, stack);
      }
      if (isStringLikeUnion(node)) return scalarShape(typeText, pathHintParts, "string");
      if (isBooleanLikeUnion(node)) return scalarShape(typeText, pathHintParts, "boolean");
      if (isNumberLikeUnion(node)) return scalarShape(typeText, pathHintParts, "number");
      return scalarShape(typeText, pathHintParts, "string");
    }
    if (ts.isTypeReferenceNode(node)) {
      const name = qNameText(node.typeName);
      const rawText = node.getText();
      if (name === "Array" || name === "ReadonlyArray") {
        const arg = node.typeArguments?.[0];
        if (!arg) throw new Error(`Missing array type argument for ${rawText}`);
        return {
          kind: "array",
          typeText,
          pathHintParts,
          elementTypeText: arg.getText(),
          element: this.resolveTypeNode(arg, arg.getText(), [...pathHintParts, "Item"], stack)
        };
      }
      if (name === "Record") {
        return { kind: "dynamic", typeText, pathHintParts };
      }
      if (name === "Partial" && node.typeArguments?.[0]) {
        return this.resolveTypeNode(node.typeArguments[0], node.typeArguments[0].getText(), pathHintParts, stack);
      }
      if (name === "Promise" && node.typeArguments?.[0]) {
        return this.resolveTypeNode(node.typeArguments[0], node.typeArguments[0].getText(), pathHintParts, stack);
      }
      const leaf = this.resolveLeafReference(rawText, name, pathHintParts);
      if (leaf) return leaf;
      const decl = this.declNodes.get(name);
      if (decl) {
        return this.resolveNamedReference(name, decl);
      }
    }

    switch (node.kind) {
      case ts.SyntaxKind.StringKeyword:
        return scalarShape(typeText, pathHintParts, "string");
      case ts.SyntaxKind.BooleanKeyword:
        return scalarShape(typeText, pathHintParts, "boolean");
      case ts.SyntaxKind.NumberKeyword:
        return scalarShape(typeText, pathHintParts, "number");
      case ts.SyntaxKind.BigIntKeyword:
        return scalarShape(typeText, pathHintParts, "qint64");
      case ts.SyntaxKind.ObjectKeyword:
        return { kind: "dynamic", typeText, pathHintParts };
      default: {
        const text = node.getText();
        const leaf = this.resolveLeafReference(text, text, pathHintParts);
        if (leaf) return leaf;
        return scalarShape(typeText, pathHintParts, "string");
      }
    }
  }

  private resolveLeafReference(rawText: string, name: string, pathHintParts: string[]): TypeShape | null {
    const normalized = rawText.trim();
    if (normalized === "string" || normalized === "AnQst.Type.string") return scalarShape(rawText, pathHintParts, "string");
    if (normalized === "boolean") return scalarShape(rawText, pathHintParts, "boolean");
    if (normalized === "number" || normalized === "AnQst.Type.number") return scalarShape(rawText, pathHintParts, "number");
    if (normalized === "bigint" || normalized === "AnQst.Type.qint64") return scalarShape(rawText, pathHintParts, "qint64");
    if (normalized === "AnQst.Type.quint64") return scalarShape(rawText, pathHintParts, "quint64");
    if (normalized === "AnQst.Type.qint32") return scalarShape(rawText, pathHintParts, "qint32");
    if (normalized === "AnQst.Type.quint32") return scalarShape(rawText, pathHintParts, "quint32");
    if (normalized === "AnQst.Type.qint16") return scalarShape(rawText, pathHintParts, "qint16");
    if (normalized === "AnQst.Type.quint16") return scalarShape(rawText, pathHintParts, "quint16");
    if (normalized === "AnQst.Type.qint8") return scalarShape(rawText, pathHintParts, "qint8");
    if (normalized === "AnQst.Type.quint8") return scalarShape(rawText, pathHintParts, "quint8");
    if (normalized === "AnQst.Type.int32") return scalarShape(rawText, pathHintParts, "int32");
    if (normalized === "AnQst.Type.uint32") return scalarShape(rawText, pathHintParts, "uint32");
    if (normalized === "AnQst.Type.int16") return scalarShape(rawText, pathHintParts, "int16");
    if (normalized === "AnQst.Type.uint16") return scalarShape(rawText, pathHintParts, "uint16");
    if (normalized === "AnQst.Type.int8") return scalarShape(rawText, pathHintParts, "int8");
    if (normalized === "AnQst.Type.uint8") return scalarShape(rawText, pathHintParts, "uint8");
    if (normalized === "AnQst.Type.object" || normalized === "AnQst.Type.json" || normalized === "object") {
      return { kind: "dynamic", typeText: rawText, pathHintParts };
    }
    if (normalized === "AnQst.Type.buffer" || normalized === "AnQst.Type.blob" || normalized === "ArrayBuffer") {
      return binaryShape(rawText, pathHintParts, "ArrayBuffer");
    }
    if (normalized === "AnQst.Type.typedArray" || normalized === "Uint8Array") {
      return binaryShape(rawText, pathHintParts, "Uint8Array");
    }
    if (normalized === "AnQst.Type.uint8Array") return binaryShape(rawText, pathHintParts, "Uint8Array");
    if (normalized === "AnQst.Type.int8Array") return binaryShape(rawText, pathHintParts, "Int8Array");
    if (normalized === "AnQst.Type.uint16Array") return binaryShape(rawText, pathHintParts, "Uint16Array");
    if (normalized === "AnQst.Type.int16Array") return binaryShape(rawText, pathHintParts, "Int16Array");
    if (normalized === "AnQst.Type.uint32Array") return binaryShape(rawText, pathHintParts, "Uint32Array");
    if (normalized === "AnQst.Type.int32Array") return binaryShape(rawText, pathHintParts, "Int32Array");
    if (normalized === "AnQst.Type.float32Array" || normalized === "Float32Array") {
      return binaryShape(rawText, pathHintParts, "Float32Array");
    }
    if (normalized === "AnQst.Type.float64Array" || normalized === "Float64Array") {
      return binaryShape(rawText, pathHintParts, "Float64Array");
    }
    if (normalized === "AnQst.Type.stringArray") {
      return {
        kind: "array",
        typeText: rawText,
        pathHintParts,
        elementTypeText: "string",
        element: scalarShape("string", [...pathHintParts, "Item"], "string")
      };
    }
    if (name === "Int8Array") return binaryShape(rawText, pathHintParts, "Int8Array");
    if (name === "Uint16Array") return binaryShape(rawText, pathHintParts, "Uint16Array");
    if (name === "Int16Array") return binaryShape(rawText, pathHintParts, "Int16Array");
    if (name === "Uint32Array") return binaryShape(rawText, pathHintParts, "Uint32Array");
    if (name === "Int32Array") return binaryShape(rawText, pathHintParts, "Int32Array");
    return null;
  }
}

function analyzeShape(
  shape: TypeShape,
  namedCache = new Map<string, CodecAnalysis>(),
  visiting = new Set<string>()
): CodecAnalysis {
  switch (shape.kind) {
    case "scalar":
      return {
        hasBlob: shape.leaf !== "string" && shape.leaf !== "boolean",
        hasStrings: shape.leaf === "string" || shape.leaf === "boolean",
        hasBinaries: false,
        hasDynamics: false
      };
    case "named": {
      const cached = namedCache.get(shape.name);
      if (cached) return cached;
      if (visiting.has(shape.name)) {
        return { hasBlob: false, hasStrings: false, hasBinaries: false, hasDynamics: false };
      }
      visiting.add(shape.name);
      const analysis = analyzeShape(shape.target, namedCache, visiting);
      visiting.delete(shape.name);
      namedCache.set(shape.name, analysis);
      return analysis;
    }
    case "dynamic":
      return { hasBlob: false, hasStrings: false, hasBinaries: false, hasDynamics: true };
    case "binary":
      return { hasBlob: false, hasStrings: false, hasBinaries: true, hasDynamics: false };
    case "array": {
      const inner = analyzeShape(shape.element, namedCache, visiting);
      return {
        hasBlob: true || inner.hasBlob,
        hasStrings: inner.hasStrings,
        hasBinaries: inner.hasBinaries,
        hasDynamics: inner.hasDynamics
      };
    }
    case "struct": {
      return shape.fields.reduce<CodecAnalysis>(
        (acc, field) => {
          const next = analyzeShape(field.shape, namedCache, visiting);
          return {
            hasBlob: acc.hasBlob || next.hasBlob || field.optional,
            hasStrings: acc.hasStrings || next.hasStrings,
            hasBinaries: acc.hasBinaries || next.hasBinaries,
            hasDynamics: acc.hasDynamics || next.hasDynamics
          };
        },
        { hasBlob: false, hasStrings: false, hasBinaries: false, hasDynamics: false }
      );
    }
  }
}

function codecSiteKey(kind: "payload" | "parameter", serviceName: string, memberName: string, parameterName: string | null): string {
  return kind === "payload"
    ? `${serviceName}::${memberName}::payload`
    : `${serviceName}::${memberName}::param::${parameterName ?? ""}`;
}

export function buildStructuredCodecCatalog(spec: ParsedSpecModel): StructuredCodecCatalog {
  const resolver = new ShapeResolver(spec);
  const codecs: StructuredCodecDefinition[] = [];
  const codecIdByTypeText = new Map<string, string>();
  const payloadSites = new Map<string, StructuredCodecSite>();
  const parameterSites = new Map<string, StructuredCodecSite>();
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
    const shape = resolver.resolveTypeText(typeText, pathHintParts);
    codecs.push({
      codecId,
      typeText,
      tsTypeText: stripAnQstType(typeText),
      shape,
      analysis: analyzeShape(shape)
    });
    return codecId;
  };

  for (const service of spec.services) {
    for (const member of service.members) {
      if (member.payloadTypeText && member.payloadTypeText.trim() !== "void") {
        const site: StructuredCodecSite = {
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
      for (const param of member.parameters) {
        const site: StructuredCodecSite = {
          siteKey: codecSiteKey("parameter", service.name, member.name, param.name),
          kind: "parameter",
          serviceName: service.name,
          memberName: member.name,
          parameterName: param.name,
          typeText: param.typeText,
          codecId: ensureCodec(param.typeText, [service.name, member.name, param.name])
        };
        parameterSites.set(site.siteKey, site);
      }
    }
  }

  return { codecs, payloadSites, parameterSites };
}

export function getStructuredPayloadSite(
  catalog: StructuredCodecCatalog,
  serviceName: string,
  memberName: string
): StructuredCodecSite | undefined {
  return catalog.payloadSites.get(codecSiteKey("payload", serviceName, memberName, null));
}

export function getStructuredParameterSite(
  catalog: StructuredCodecCatalog,
  serviceName: string,
  memberName: string,
  parameterName: string
): StructuredCodecSite | undefined {
  return catalog.parameterSites.get(codecSiteKey("parameter", serviceName, memberName, parameterName));
}

function indent(level: number): string {
  return "  ".repeat(level);
}

class TsEmitterContext {
  private nextId = 0;
  next(prefix: string): string {
    this.nextId += 1;
    return `__${prefix}${this.nextId}`;
  }
}

function tsNamedHelperStem(shape: NamedShape, scope = ""): string {
  const scopePrefix = scope ? `${sanitizeIdentifier(scope)}_` : "";
  return `__anqstNamed_${scopePrefix}${sanitizeIdentifier(shape.name)}`;
}

function tsNamedEncodeHelperName(shape: NamedShape, scope = ""): string {
  return `${tsNamedHelperStem(shape, scope)}_encode`;
}

function tsNamedCountHelperName(shape: NamedShape, scope = ""): string {
  return `${tsNamedHelperStem(shape, scope)}_count`;
}

function tsNamedDecodeHelperName(shape: NamedShape, scope = ""): string {
  return `${tsNamedHelperStem(shape, scope)}_decode`;
}

function collectNamedShapes(shape: TypeShape, out = new Map<string, NamedShape>()): Map<string, NamedShape> {
  switch (shape.kind) {
    case "named":
      if (out.has(shape.name)) return out;
      out.set(shape.name, shape);
      collectNamedShapes(shape.target, out);
      return out;
    case "array":
      collectNamedShapes(shape.element, out);
      return out;
    case "struct":
      for (const field of shape.fields) collectNamedShapes(field.shape, out);
      return out;
    default:
      return out;
  }
}

function tsScalarWriteHelper(leaf: ScalarLeafKind): string {
  switch (leaf) {
    case "boolean": return "__anqstPushBool";
    case "number": return "__anqstPushFloat64";
    case "qint64": return "__anqstPushBigInt64";
    case "quint64": return "__anqstPushBigUint64";
    case "qint32": return "__anqstPushInt32";
    case "quint32": return "__anqstPushUint32";
    case "qint16": return "__anqstPushInt16";
    case "quint16": return "__anqstPushUint16";
    case "qint8": return "__anqstPushInt8";
    case "quint8": return "__anqstPushUint8";
    case "int32": return "__anqstPushInt32";
    case "uint32": return "__anqstPushUint32";
    case "int16": return "__anqstPushInt16";
    case "uint16": return "__anqstPushUint16";
    case "int8": return "__anqstPushInt8";
    case "uint8": return "__anqstPushUint8";
    default: return "";
  }
}

function tsScalarReadHelper(leaf: ScalarLeafKind): string {
  switch (leaf) {
    case "boolean": return "__anqstReadBool";
    case "number": return "__anqstReadFloat64";
    case "qint64": return "__anqstReadBigInt64";
    case "quint64": return "__anqstReadBigUint64";
    case "qint32": return "__anqstReadInt32";
    case "quint32": return "__anqstReadUint32";
    case "qint16": return "__anqstReadInt16";
    case "quint16": return "__anqstReadUint16";
    case "qint8": return "__anqstReadInt8";
    case "quint8": return "__anqstReadUint8";
    case "int32": return "__anqstReadInt32";
    case "uint32": return "__anqstReadUint32";
    case "int16": return "__anqstReadInt16";
    case "uint16": return "__anqstReadUint16";
    case "int8": return "__anqstReadInt8";
    case "uint8": return "__anqstReadUint8";
    default: return "";
  }
}

function binaryEncodeHelperName(binary: BinaryLeafKind): string {
  return `__anqstEncodeBinary_${binary}`;
}

function binaryDecodeHelperName(binary: BinaryLeafKind): string {
  return `__anqstDecodeBinary_${binary}`;
}

function emitTsEncodeShape(shape: TypeShape, valueExpr: string, lines: string[], ctx: TsEmitterContext, level: number, scope = ""): void {
  const pad = indent(level);
  switch (shape.kind) {
    case "scalar":
      if (shape.leaf === "string") {
        lines.push(`${pad}__strings.push(${valueExpr});`);
      } else if (shape.leaf === "boolean") {
        lines.push(`${pad}__strings.push(${valueExpr} ? "1" : "0");`);
      } else {
        lines.push(`${pad}${tsScalarWriteHelper(shape.leaf)}(__bytes, ${valueExpr});`);
      }
      return;
    case "named":
      lines.push(`${pad}${tsNamedEncodeHelperName(shape, scope)}(${valueExpr}, __bytes, __strings, __binaries, __dynamics);`);
      return;
    case "dynamic":
      lines.push(`${pad}__dynamics.push(${valueExpr});`);
      return;
    case "binary":
      lines.push(`${pad}__binaries.push(${binaryEncodeHelperName(shape.binary)}(${valueExpr}));`);
      return;
    case "array": {
      lines.push(`${pad}__anqstPushUint32(__bytes, ${valueExpr}.length >>> 0);`);
      const itemName = ctx.next("item");
      lines.push(`${pad}for (const ${itemName} of ${valueExpr}) {`);
      emitTsEncodeShape(shape.element, itemName, lines, ctx, level + 1, scope);
      lines.push(`${pad}}`);
      return;
    }
    case "struct":
      for (const field of shape.fields) {
        const fieldExpr = `${valueExpr}.${field.name}`;
        if (field.optional) {
          const present = ctx.next("present");
          lines.push(`${pad}const ${present} = ${fieldExpr} !== undefined;`);
          lines.push(`${pad}__anqstPushUint8(__bytes, ${present} ? 1 : 0);`);
          lines.push(`${pad}if (${present}) {`);
          emitTsEncodeShape(field.shape, `${fieldExpr}!`, lines, ctx, level + 1, scope);
          lines.push(`${pad}}`);
        } else {
          emitTsEncodeShape(field.shape, fieldExpr, lines, ctx, level, scope);
        }
      }
  }
}

function emitTsCountPass(shape: TypeShape, lines: string[], ctx: TsEmitterContext, level: number, scope = ""): void {
  const pad = indent(level);
  switch (shape.kind) {
    case "scalar":
      if (shape.leaf === "string" || shape.leaf === "boolean") {
        lines.push(`${pad}__counts.stringCount += 1;`);
      } else {
        const widths: Record<Exclude<ScalarLeafKind, "string">, number> = {
          boolean: 0,
          number: 8,
          qint64: 8,
          quint64: 8,
          qint32: 4,
          quint32: 4,
          qint16: 2,
          quint16: 2,
          qint8: 1,
          quint8: 1,
          int32: 4,
          uint32: 4,
          int16: 2,
          uint16: 2,
          int8: 1,
          uint8: 1
        };
        if (widths[shape.leaf] > 0) {
          lines.push(`${pad}__countCursor.offset += ${widths[shape.leaf]};`);
        }
      }
      return;
    case "named":
      lines.push(`${pad}${tsNamedCountHelperName(shape, scope)}(__blob, __countCursor, __counts);`);
      return;
    case "dynamic":
      lines.push(`${pad}__counts.dynamicCount += 1;`);
      return;
    case "binary":
      lines.push(`${pad}__counts.binaryCount += 1;`);
      return;
    case "array": {
      const countVar = ctx.next("count");
      const indexVar = ctx.next("index");
      lines.push(`${pad}const ${countVar} = __anqstReadUint32(__blob, __countCursor);`);
      lines.push(`${pad}for (let ${indexVar} = 0; ${indexVar} < ${countVar}; ${indexVar} += 1) {`);
      emitTsCountPass(shape.element, lines, ctx, level + 1, scope);
      lines.push(`${pad}}`);
      return;
    }
    case "struct":
      for (const field of shape.fields) {
        if (field.optional) {
          const present = ctx.next("present");
          lines.push(`${pad}const ${present} = __anqstReadUint8(__blob, __countCursor) !== 0;`);
          lines.push(`${pad}if (${present}) {`);
          emitTsCountPass(field.shape, lines, ctx, level + 1, scope);
          lines.push(`${pad}}`);
        } else {
          emitTsCountPass(field.shape, lines, ctx, level, scope);
        }
      }
  }
}

function emitTsDecodeValue(shape: TypeShape, lines: string[], ctx: TsEmitterContext, level: number, scope = ""): string {
  const pad = indent(level);
  switch (shape.kind) {
    case "scalar":
      if (shape.leaf === "string") return `String(__items[__stringCursor.value++] ?? "")`;
      if (shape.leaf === "boolean") return `String(__items[__stringCursor.value++] ?? "") === "1"`;
      return `${tsScalarReadHelper(shape.leaf)}(__blob, __dataCursor)`;
    case "named":
      return `${tsNamedDecodeHelperName(shape, scope)}(__items, __blob, __stringCursor, __binaryCursor, __dynamicCursor, __dataCursor)`;
    case "dynamic":
      return `__items[__dynamicCursor.value++]`;
    case "binary":
      return `${binaryDecodeHelperName(shape.binary)}(String(__items[__binaryCursor.value++] ?? ""))`;
    case "array": {
      const arrayVar = ctx.next("array");
      const countVar = ctx.next("count");
      const indexVar = ctx.next("index");
      lines.push(`${pad}const ${arrayVar}: ${stripAnQstType(shape.typeText)} = [];`);
      lines.push(`${pad}const ${countVar} = __anqstReadUint32(__blob, __dataCursor);`);
      lines.push(`${pad}for (let ${indexVar} = 0; ${indexVar} < ${countVar}; ${indexVar} += 1) {`);
      const elementExpr = emitTsDecodeValue(shape.element, lines, ctx, level + 1, scope);
      lines.push(`${indent(level + 1)}${arrayVar}.push(${elementExpr});`);
      lines.push(`${pad}}`);
      return arrayVar;
    }
    case "struct": {
      const valueVar = ctx.next("value");
      lines.push(`${pad}const ${valueVar} = {} as ${stripAnQstType(shape.typeText)};`);
      for (const field of shape.fields) {
        if (field.optional) {
          const present = ctx.next("present");
          lines.push(`${pad}const ${present} = (__anqstReadUint8(__blob, __dataCursor)) !== 0;`);
          lines.push(`${pad}if (${present}) {`);
          const fieldExpr = emitTsDecodeValue(field.shape, lines, ctx, level + 1, scope);
          lines.push(`${indent(level + 1)}${valueVar}.${field.name} = ${fieldExpr};`);
          lines.push(`${pad}}`);
        } else {
          const fieldExpr = emitTsDecodeValue(field.shape, lines, ctx, level, scope);
          lines.push(`${pad}${valueVar}.${field.name} = ${fieldExpr};`);
        }
      }
      return valueVar;
    }
  }
}

function emitTsCodec(def: StructuredCodecDefinition): string {
  const namedShapes = [...collectNamedShapes(def.shape).values()];
  const ctx = new TsEmitterContext();
  const encodeLines: string[] = [];
  emitTsEncodeShape(def.shape, "value", encodeLines, ctx, 1, def.codecId);

  const countLines: string[] = [];
  emitTsCountPass(def.shape, countLines, ctx, 1, def.codecId);

  const decodeLines: string[] = [];
  const decodeExpr = emitTsDecodeValue(def.shape, decodeLines, ctx, 1, def.codecId);
  const encoderName = `encode${def.codecId}`;
  const decoderName = `decode${def.codecId}`;
  const namedHelpers = namedShapes.map((shape) => {
    const helperCtx = new TsEmitterContext();
    const helperEncodeLines: string[] = [];
    emitTsEncodeShape(shape.target, "value", helperEncodeLines, helperCtx, 1, def.codecId);
    const helperCountLines: string[] = [];
    emitTsCountPass(shape.target, helperCountLines, helperCtx, 1, def.codecId);
    const helperDecodeLines: string[] = [];
    const helperDecodeExpr = emitTsDecodeValue(shape.target, helperDecodeLines, helperCtx, 1, def.codecId);
    const tsType = stripAnQstType(shape.typeText);
    return `function ${tsNamedEncodeHelperName(shape, def.codecId)}(value: ${tsType}, __bytes: number[], __strings: string[], __binaries: string[], __dynamics: unknown[]): void {
${helperEncodeLines.join("\n")}
}

function ${tsNamedCountHelperName(shape, def.codecId)}(
  __blob: Uint8Array,
  __countCursor: { offset: number },
  __counts: { stringCount: number; binaryCount: number; dynamicCount: number }
): void {
${helperCountLines.join("\n")}
}

function ${tsNamedDecodeHelperName(shape, def.codecId)}(
  __items: unknown[],
  __blob: Uint8Array,
  __stringCursor: { value: number },
  __binaryCursor: { value: number },
  __dynamicCursor: { value: number },
  __dataCursor: { offset: number }
): ${tsType} {
${helperDecodeLines.join("\n")}
  return (${helperDecodeExpr}) as ${tsType};
}`;
  }).join("\n\n");
  return `${namedHelpers ? `${namedHelpers}\n\n` : ""}function ${encoderName}(value: ${def.tsTypeText}): unknown {
  const __bytes: number[] = [];
  const __strings: string[] = [];
  const __binaries: string[] = [];
  const __dynamics: unknown[] = [];
${encodeLines.join("\n")}
  return __anqstFinalizeWire(__bytes, __strings, __binaries, __dynamics);
}

function ${decoderName}(wire: unknown): ${def.tsTypeText} {
  const __items = Array.isArray(wire) ? wire : [wire];
  const __blob = ${def.analysis.hasBlob ? `__anqstBase93Decode(String(__items[0] ?? ""))` : "new Uint8Array()"};
  const __counts = { stringCount: 0, binaryCount: 0, dynamicCount: 0 };
  const __countCursor = { offset: 0 };
${countLines.join("\n")}
  const __stringCursor = { value: ${def.analysis.hasBlob ? 1 : 0} };
  const __binaryCursor = { value: ${def.analysis.hasBlob ? 1 : 0} + __counts.stringCount };
  const __dynamicCursor = { value: ${def.analysis.hasBlob ? 1 : 0} + __counts.stringCount + __counts.binaryCount };
  const __dataCursor = { offset: 0 };
${decodeLines.join("\n")}
  return (${decodeExpr}) as ${def.tsTypeText};
}`;
}

function renderTsBinaryHelpers(): string {
  const typedArrayCtorByKind: Record<Exclude<BinaryLeafKind, "ArrayBuffer">, string> = {
    Uint8Array: "Uint8Array",
    Int8Array: "Int8Array",
    Uint16Array: "Uint16Array",
    Int16Array: "Int16Array",
    Uint32Array: "Uint32Array",
    Int32Array: "Int32Array",
    Float32Array: "Float32Array",
    Float64Array: "Float64Array"
  };
  const lines = [
    `const __anqstBase93Encode: (d: Uint8Array) => string = ${emitBase93Encoder()};`,
    `const __anqstBase93Decode: (s: string) => Uint8Array = ${emitBase93Decoder()};`,
    "",
    "function __anqstFinalizeWire(bytes: number[], strings: string[], binaries: string[], dynamics: unknown[]): unknown {",
    "  const items: unknown[] = [];",
    "  if (bytes.length > 0) items.push(__anqstBase93Encode(Uint8Array.from(bytes)));",
    "  for (const value of strings) items.push(value);",
    "  for (const value of binaries) items.push(value);",
    "  for (const value of dynamics) items.push(value);",
    "  return items.length === 1 ? items[0] : items;",
    "}",
    "",
    "function __anqstPushUint8(out: number[], value: number): void { out.push(value & 0xff); }",
    "function __anqstPushInt8(out: number[], value: number): void { const buf = new Int8Array(1); buf[0] = value; out.push(new Uint8Array(buf.buffer)[0]); }",
    "function __anqstPushBool(out: number[], value: boolean): void { out.push(value ? 1 : 0); }",
    "function __anqstPushInt16(out: number[], value: number): void { const buf = new ArrayBuffer(2); const view = new DataView(buf); view.setInt16(0, value, true); out.push(...new Uint8Array(buf)); }",
    "function __anqstPushUint16(out: number[], value: number): void { const buf = new ArrayBuffer(2); const view = new DataView(buf); view.setUint16(0, value, true); out.push(...new Uint8Array(buf)); }",
    "function __anqstPushInt32(out: number[], value: number): void { const buf = new ArrayBuffer(4); const view = new DataView(buf); view.setInt32(0, value, true); out.push(...new Uint8Array(buf)); }",
    "function __anqstPushUint32(out: number[], value: number): void { const buf = new ArrayBuffer(4); const view = new DataView(buf); view.setUint32(0, value >>> 0, true); out.push(...new Uint8Array(buf)); }",
    "function __anqstPushFloat64(out: number[], value: number): void { const buf = new ArrayBuffer(8); const view = new DataView(buf); view.setFloat64(0, value, true); out.push(...new Uint8Array(buf)); }",
    "function __anqstPushBigInt64(out: number[], value: bigint): void { const buf = new ArrayBuffer(8); const view = new DataView(buf); view.setBigInt64(0, value, true); out.push(...new Uint8Array(buf)); }",
    "function __anqstPushBigUint64(out: number[], value: bigint): void { const buf = new ArrayBuffer(8); const view = new DataView(buf); view.setBigUint64(0, value, true); out.push(...new Uint8Array(buf)); }",
    "",
    "function __anqstReadUint8(bytes: Uint8Array, cursor: { offset: number }): number { return bytes[cursor.offset++] ?? 0; }",
    "function __anqstReadInt8(bytes: Uint8Array, cursor: { offset: number }): number { const buf = new Uint8Array([bytes[cursor.offset++] ?? 0]); return new Int8Array(buf.buffer)[0] ?? 0; }",
    "function __anqstReadBool(bytes: Uint8Array, cursor: { offset: number }): boolean { return (__anqstReadUint8(bytes, cursor) & 1) === 1; }",
    "function __anqstReadInt16(bytes: Uint8Array, cursor: { offset: number }): number { const view = new DataView(bytes.buffer, bytes.byteOffset + cursor.offset, 2); const value = view.getInt16(0, true); cursor.offset += 2; return value; }",
    "function __anqstReadUint16(bytes: Uint8Array, cursor: { offset: number }): number { const view = new DataView(bytes.buffer, bytes.byteOffset + cursor.offset, 2); const value = view.getUint16(0, true); cursor.offset += 2; return value; }",
    "function __anqstReadInt32(bytes: Uint8Array, cursor: { offset: number }): number { const view = new DataView(bytes.buffer, bytes.byteOffset + cursor.offset, 4); const value = view.getInt32(0, true); cursor.offset += 4; return value; }",
    "function __anqstReadUint32(bytes: Uint8Array, cursor: { offset: number }): number { const view = new DataView(bytes.buffer, bytes.byteOffset + cursor.offset, 4); const value = view.getUint32(0, true); cursor.offset += 4; return value; }",
    "function __anqstReadFloat64(bytes: Uint8Array, cursor: { offset: number }): number { const view = new DataView(bytes.buffer, bytes.byteOffset + cursor.offset, 8); const value = view.getFloat64(0, true); cursor.offset += 8; return value; }",
    "function __anqstReadBigInt64(bytes: Uint8Array, cursor: { offset: number }): bigint { const view = new DataView(bytes.buffer, bytes.byteOffset + cursor.offset, 8); const value = view.getBigInt64(0, true); cursor.offset += 8; return value; }",
    "function __anqstReadBigUint64(bytes: Uint8Array, cursor: { offset: number }): bigint { const view = new DataView(bytes.buffer, bytes.byteOffset + cursor.offset, 8); const value = view.getBigUint64(0, true); cursor.offset += 8; return value; }",
    "",
    "function __anqstEncodeBinary_ArrayBuffer(value: ArrayBuffer): string { return __anqstBase93Encode(new Uint8Array(value)); }",
    "function __anqstDecodeBinary_ArrayBuffer(encoded: string): ArrayBuffer { const bytes = __anqstBase93Decode(encoded); const copy = new Uint8Array(bytes.byteLength); copy.set(bytes); return copy.buffer as ArrayBuffer; }"
  ];
  for (const [kind, ctor] of Object.entries(typedArrayCtorByKind)) {
    lines.push(`function ${binaryEncodeHelperName(kind as Exclude<BinaryLeafKind, "ArrayBuffer">)}(value: ${ctor}): string { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }`);
    lines.push(`function ${binaryDecodeHelperName(kind as Exclude<BinaryLeafKind, "ArrayBuffer">)}(encoded: string): ${ctor} { const bytes = __anqstBase93Decode(encoded); const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); return new ${ctor}(buffer); }`);
  }
  return lines.join("\n");
}

export function renderTsStructuredCodecHelpers(catalog: StructuredCodecCatalog): string {
  if (catalog.codecs.length === 0) return "";
  const codecFns = catalog.codecs.map((codec) => emitTsCodec(codec)).join("\n\n");
  return `${renderTsBinaryHelpers()}\n\n${codecFns}\n`;
}

function cppScalarWriteHelper(leaf: ScalarLeafKind): string {
  switch (leaf) {
    case "boolean": return "anqstPushBool";
    case "number": return "anqstPushFloat64";
    case "qint64": return "anqstPushQint64";
    case "quint64": return "anqstPushQuint64";
    case "qint32": return "anqstPushQint32";
    case "quint32": return "anqstPushQuint32";
    case "qint16": return "anqstPushQint16";
    case "quint16": return "anqstPushQuint16";
    case "qint8": return "anqstPushQint8";
    case "quint8": return "anqstPushQuint8";
    case "int32": return "anqstPushInt32";
    case "uint32": return "anqstPushUint32";
    case "int16": return "anqstPushInt16";
    case "uint16": return "anqstPushUint16";
    case "int8": return "anqstPushInt8";
    case "uint8": return "anqstPushUint8";
    default: return "";
  }
}

function cppScalarReadHelper(leaf: ScalarLeafKind): string {
  switch (leaf) {
    case "boolean": return "anqstReadBool";
    case "number": return "anqstReadFloat64";
    case "qint64": return "anqstReadQint64";
    case "quint64": return "anqstReadQuint64";
    case "qint32": return "anqstReadQint32";
    case "quint32": return "anqstReadQuint32";
    case "qint16": return "anqstReadQint16";
    case "quint16": return "anqstReadQuint16";
    case "qint8": return "anqstReadQint8";
    case "quint8": return "anqstReadQuint8";
    case "int32": return "anqstReadInt32";
    case "uint32": return "anqstReadUint32";
    case "int16": return "anqstReadInt16";
    case "uint16": return "anqstReadUint16";
    case "int8": return "anqstReadInt8";
    case "uint8": return "anqstReadUint8";
    default: return "";
  }
}

class CppEmitterContext {
  private nextId = 0;
  next(prefix: string): string {
    this.nextId += 1;
    return `${prefix}${this.nextId}`;
  }
}

function cppNamedHelperStem(shape: NamedShape, scope = ""): string {
  const scopePrefix = scope ? `${sanitizeIdentifier(scope)}_` : "";
  return `anqstNamed_${scopePrefix}${sanitizeIdentifier(shape.name)}`;
}

function cppNamedEncodeHelperName(shape: NamedShape, scope = ""): string {
  return `${cppNamedHelperStem(shape, scope)}_encode`;
}

function cppNamedCountHelperName(shape: NamedShape, scope = ""): string {
  return `${cppNamedHelperStem(shape, scope)}_count`;
}

function cppNamedDecodeHelperName(shape: NamedShape, scope = ""): string {
  return `${cppNamedHelperStem(shape, scope)}_decode`;
}

function emitCppEncodeShape(shape: TypeShape, valueExpr: string, lines: string[], ctx: CppEmitterContext, level: number, scope = ""): void {
  const pad = "    ".repeat(level);
  switch (shape.kind) {
    case "scalar":
      if (shape.leaf === "string") {
        lines.push(`${pad}strings.push_back(${valueExpr});`);
      } else if (shape.leaf === "boolean") {
        lines.push(`${pad}strings.push_back(${valueExpr} ? QStringLiteral("1") : QStringLiteral("0"));`);
      } else {
        lines.push(`${pad}${cppScalarWriteHelper(shape.leaf)}(bytes, ${valueExpr});`);
      }
      return;
    case "named":
      lines.push(`${pad}${cppNamedEncodeHelperName(shape, scope)}(${valueExpr}, bytes, strings, binaries, dynamics);`);
      return;
    case "dynamic":
      lines.push(`${pad}dynamics.push_back(QVariant::fromValue(${valueExpr}));`);
      return;
    case "binary":
      lines.push(`${pad}binaries.push_back(anqstEncodeBinary(${valueExpr}));`);
      return;
    case "array": {
      const itemName = ctx.next("item");
      lines.push(`${pad}anqstPushUint32(bytes, static_cast<std::uint32_t>(${valueExpr}.size()));`);
      lines.push(`${pad}for (const auto& ${itemName} : ${valueExpr}) {`);
      emitCppEncodeShape(shape.element, itemName, lines, ctx, level + 1, scope);
      lines.push(`${pad}}`);
      return;
    }
    case "struct":
      for (const field of shape.fields) {
        const fieldExpr = `${valueExpr}.${field.name}`;
        if (field.optional) {
          const present = ctx.next("present");
          lines.push(`${pad}const bool ${present} = ${fieldExpr}.has_value();`);
          lines.push(`${pad}anqstPushUint8(bytes, ${present} ? 1u : 0u);`);
          lines.push(`${pad}if (${present}) {`);
          emitCppEncodeShape(field.shape, `${fieldExpr}.value()`, lines, ctx, level + 1, scope);
          lines.push(`${pad}}`);
        } else {
          emitCppEncodeShape(field.shape, fieldExpr, lines, ctx, level, scope);
        }
      }
  }
}

function emitCppCountPass(shape: TypeShape, lines: string[], ctx: CppEmitterContext, level: number, scope = ""): void {
  const pad = "    ".repeat(level);
  switch (shape.kind) {
    case "scalar": {
      if (shape.leaf === "string" || shape.leaf === "boolean") {
        lines.push(`${pad}stringCount += 1;`);
      } else {
        const widths: Record<Exclude<ScalarLeafKind, "string">, number> = {
          boolean: 0,
          number: 8,
          qint64: 8,
          quint64: 8,
          qint32: 4,
          quint32: 4,
          qint16: 2,
          quint16: 2,
          qint8: 1,
          quint8: 1,
          int32: 4,
          uint32: 4,
          int16: 2,
          uint16: 2,
          int8: 1,
          uint8: 1
        };
        if (widths[shape.leaf] > 0) {
          lines.push(`${pad}countOffset += ${widths[shape.leaf]};`);
        }
      }
      return;
    }
    case "named":
      lines.push(`${pad}${cppNamedCountHelperName(shape, scope)}(blob, countOffset, stringCount, binaryCount, dynamicCount);`);
      return;
    case "dynamic":
      lines.push(`${pad}dynamicCount += 1;`);
      return;
    case "binary":
      lines.push(`${pad}binaryCount += 1;`);
      return;
    case "array": {
      const countVar = ctx.next("count");
      lines.push(`${pad}const auto ${countVar} = anqstReadUint32(blob, countOffset);`);
      lines.push(`${pad}for (std::uint32_t i = 0; i < ${countVar}; ++i) {`);
      emitCppCountPass(shape.element, lines, ctx, level + 1, scope);
      lines.push(`${pad}}`);
      return;
    }
    case "struct":
      for (const field of shape.fields) {
        if (field.optional) {
          const present = ctx.next("present");
          lines.push(`${pad}const bool ${present} = anqstReadUint8(blob, countOffset) != 0;`);
          lines.push(`${pad}if (${present}) {`);
          emitCppCountPass(field.shape, lines, ctx, level + 1, scope);
          lines.push(`${pad}}`);
        } else {
          emitCppCountPass(field.shape, lines, ctx, level, scope);
        }
      }
  }
}

function emitCppDecodeValue(
  shape: TypeShape,
  lines: string[],
  ctx: CppEmitterContext,
  level: number,
  mapCppType: (typeText: string, pathHintParts: string[]) => string,
  scope = ""
): string {
  const pad = "    ".repeat(level);
  switch (shape.kind) {
    case "scalar":
      if (shape.leaf === "string") return `items.value(static_cast<int>(stringIndex++)).toString()`;
      if (shape.leaf === "boolean") return `items.value(static_cast<int>(stringIndex++)).toString() == QStringLiteral("1")`;
      return `${cppScalarReadHelper(shape.leaf)}(blob, dataOffset)`;
    case "named":
      return `${cppNamedDecodeHelperName(shape, scope)}(items, blob, stringIndex, binaryIndex, dynamicIndex, dataOffset)`;
    case "dynamic":
      return `items.value(static_cast<int>(dynamicIndex++)).toMap()`;
    case "binary":
      return `anqstDecodeBinary(items.value(static_cast<int>(binaryIndex++)).toString())`;
    case "array": {
      const arrayType = mapCppType(shape.typeText, shape.pathHintParts);
      const arrayVar = ctx.next("array");
      const countVar = ctx.next("count");
      lines.push(`${pad}${arrayType} ${arrayVar};`);
      lines.push(`${pad}const auto ${countVar} = anqstReadUint32(blob, dataOffset);`);
      lines.push(`${pad}for (std::uint32_t i = 0; i < ${countVar}; ++i) {`);
      const itemExpr = emitCppDecodeValue(shape.element, lines, ctx, level + 1, mapCppType, scope);
      lines.push(`${"    ".repeat(level + 1)}${arrayVar}.push_back(${itemExpr});`);
      lines.push(`${pad}}`);
      return arrayVar;
    }
    case "struct": {
      const valueType = mapCppType(shape.typeText, shape.pathHintParts);
      const valueVar = ctx.next("value");
      lines.push(`${pad}${valueType} ${valueVar}{};`);
      for (const field of shape.fields) {
        if (field.optional) {
          const present = ctx.next("present");
          lines.push(`${pad}if (anqstReadUint8(blob, dataOffset) != 0) {`);
          const fieldExpr = emitCppDecodeValue(field.shape, lines, ctx, level + 1, mapCppType, scope);
          lines.push(`${"    ".repeat(level + 1)}${valueVar}.${field.name} = ${fieldExpr};`);
          lines.push(`${pad}} else {`);
          lines.push(`${"    ".repeat(level + 1)}${valueVar}.${field.name} = std::nullopt;`);
          lines.push(`${pad}}`);
        } else {
          const fieldExpr = emitCppDecodeValue(field.shape, lines, ctx, level, mapCppType, scope);
          lines.push(`${pad}${valueVar}.${field.name} = ${fieldExpr};`);
        }
      }
      return valueVar;
    }
  }
}

function emitCppCodec(
  def: StructuredCodecDefinition,
  mapCppType: (typeText: string, pathHintParts: string[]) => string
): string {
  const namedShapes = [...collectNamedShapes(def.shape).values()];
  const ctx = new CppEmitterContext();
  const cppType = mapCppType(def.typeText, def.shape.pathHintParts);
  const encoderName = `encode${def.codecId}`;
  const decoderName = `decode${def.codecId}`;
  const encodeLines: string[] = [];
  emitCppEncodeShape(def.shape, "value", encodeLines, ctx, 1, def.codecId);
  const countLines: string[] = [];
  if (def.analysis.hasBlob) {
    emitCppCountPass(def.shape, countLines, ctx, 1, def.codecId);
  }
  const decodeLines: string[] = [];
  const decodeExpr = emitCppDecodeValue(def.shape, decodeLines, ctx, 1, mapCppType, def.codecId);
  const namedDeclarations = namedShapes.map((shape) => {
    const helperType = mapCppType(shape.typeText, shape.pathHintParts);
    return `inline void ${cppNamedEncodeHelperName(shape, def.codecId)}(
    const ${helperType}& value,
    std::vector<std::uint8_t>& bytes,
    QStringList& strings,
    QStringList& binaries,
    QVariantList& dynamics
);
inline void ${cppNamedCountHelperName(shape, def.codecId)}(
    const std::vector<std::uint8_t>& blob,
    std::size_t& countOffset,
    std::size_t& stringCount,
    std::size_t& binaryCount,
    std::size_t& dynamicCount
);
inline ${helperType} ${cppNamedDecodeHelperName(shape, def.codecId)}(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& stringIndex,
    std::size_t& binaryIndex,
    std::size_t& dynamicIndex,
    std::size_t& dataOffset
);`;
  }).join("\n");
  const namedHelpers = namedShapes.map((shape) => {
    const helperCtx = new CppEmitterContext();
    const helperType = mapCppType(shape.typeText, shape.pathHintParts);
    const helperEncodeLines: string[] = [];
    emitCppEncodeShape(shape.target, "value", helperEncodeLines, helperCtx, 1, def.codecId);
    const helperCountLines: string[] = [];
    emitCppCountPass(shape.target, helperCountLines, helperCtx, 1, def.codecId);
    const helperDecodeLines: string[] = [];
    const helperDecodeExpr = emitCppDecodeValue(shape.target, helperDecodeLines, helperCtx, 1, mapCppType, def.codecId);
    return `inline void ${cppNamedEncodeHelperName(shape, def.codecId)}(
    const ${helperType}& value,
    std::vector<std::uint8_t>& bytes,
    QStringList& strings,
    QStringList& binaries,
    QVariantList& dynamics
) {
${helperEncodeLines.join("\n")}
}

inline void ${cppNamedCountHelperName(shape, def.codecId)}(
    const std::vector<std::uint8_t>& blob,
    std::size_t& countOffset,
    std::size_t& stringCount,
    std::size_t& binaryCount,
    std::size_t& dynamicCount
) {
${helperCountLines.join("\n")}
}

inline ${helperType} ${cppNamedDecodeHelperName(shape, def.codecId)}(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& stringIndex,
    std::size_t& binaryIndex,
    std::size_t& dynamicIndex,
    std::size_t& dataOffset
) {
${helperDecodeLines.join("\n")}
    return ${helperDecodeExpr};
}`;
  }).join("\n\n");
  return `${namedDeclarations ? `${namedDeclarations}\n\n` : ""}${namedHelpers ? `${namedHelpers}\n\n` : ""}inline QVariant ${encoderName}(const ${cppType}& value) {
    std::vector<std::uint8_t> bytes;
    QStringList strings;
    QStringList binaries;
    QVariantList dynamics;
${encodeLines.join("\n")}
    return anqstFinalizeWire(bytes, strings, binaries, dynamics);
}

inline ${cppType} ${decoderName}(const QVariant& wire) {
    const QVariantList items = anqstNormalizeWireItems(wire);
    const std::vector<std::uint8_t> blob = ${def.analysis.hasBlob ? `(items.isEmpty() ? std::vector<std::uint8_t>{} : base93Decode(items.value(0).toString().toStdString()))` : "std::vector<std::uint8_t>{}"};
    std::size_t stringCount = 0;
    std::size_t binaryCount = 0;
    std::size_t dynamicCount = 0;
    std::size_t countOffset = 0;
${countLines.join("\n")}
    std::size_t stringIndex = ${def.analysis.hasBlob ? 1 : 0};
    std::size_t binaryIndex = ${def.analysis.hasBlob ? 1 : 0} + stringCount;
    std::size_t dynamicIndex = ${def.analysis.hasBlob ? 1 : 0} + stringCount + binaryCount;
    std::size_t dataOffset = 0;
${decodeLines.join("\n")}
    return ${decodeExpr};
}`;
}

export function renderCppStructuredCodecHelpers(
  catalog: StructuredCodecCatalog,
  mapCppType: (typeText: string, pathHintParts: string[]) => string
): string {
  if (catalog.codecs.length === 0) return "";
  const helpers = [
    emitBase93CppFunctions(),
    "",
    "inline QVariantList anqstNormalizeWireItems(const QVariant& wire) {",
    "    return wire.type() == QVariant::List ? wire.toList() : QVariantList{wire};",
    "}",
    "",
    "inline QVariant anqstFinalizeWire(const std::vector<std::uint8_t>& bytes, const QStringList& strings, const QStringList& binaries, const QVariantList& dynamics) {",
    "    QVariantList items;",
    "    if (!bytes.empty()) items.push_back(QString::fromStdString(base93Encode(bytes)));",
    "    for (const auto& value : strings) items.push_back(value);",
    "    for (const auto& value : binaries) items.push_back(value);",
    "    for (const auto& value : dynamics) items.push_back(value);",
    "    if (items.size() == 1) return items.front();",
    "    return items;",
    "}",
    "",
    "inline void anqstPushUint8(std::vector<std::uint8_t>& out, std::uint8_t value) { out.push_back(value); }",
    "inline void anqstPushInt8(std::vector<std::uint8_t>& out, std::int8_t value) { out.push_back(static_cast<std::uint8_t>(value)); }",
    "inline void anqstPushBool(std::vector<std::uint8_t>& out, bool value) { out.push_back(value ? 1u : 0u); }",
    "inline void anqstPushUint16(std::vector<std::uint8_t>& out, std::uint16_t value) { out.push_back(static_cast<std::uint8_t>(value & 0xffu)); out.push_back(static_cast<std::uint8_t>((value >> 8) & 0xffu)); }",
    "inline void anqstPushInt16(std::vector<std::uint8_t>& out, std::int16_t value) { anqstPushUint16(out, static_cast<std::uint16_t>(value)); }",
    "inline void anqstPushQuint16(std::vector<std::uint8_t>& out, quint16 value) { anqstPushUint16(out, static_cast<std::uint16_t>(value)); }",
    "inline void anqstPushQint16(std::vector<std::uint8_t>& out, qint16 value) { anqstPushInt16(out, static_cast<std::int16_t>(value)); }",
    "inline void anqstPushUint32(std::vector<std::uint8_t>& out, std::uint32_t value) { out.push_back(static_cast<std::uint8_t>(value & 0xffu)); out.push_back(static_cast<std::uint8_t>((value >> 8) & 0xffu)); out.push_back(static_cast<std::uint8_t>((value >> 16) & 0xffu)); out.push_back(static_cast<std::uint8_t>((value >> 24) & 0xffu)); }",
    "inline void anqstPushInt32(std::vector<std::uint8_t>& out, std::int32_t value) { anqstPushUint32(out, static_cast<std::uint32_t>(value)); }",
    "inline void anqstPushQuint32(std::vector<std::uint8_t>& out, quint32 value) { anqstPushUint32(out, static_cast<std::uint32_t>(value)); }",
    "inline void anqstPushQint32(std::vector<std::uint8_t>& out, qint32 value) { anqstPushInt32(out, static_cast<std::int32_t>(value)); }",
    "inline void anqstPushQuint64(std::vector<std::uint8_t>& out, quint64 value) { for (int shift = 0; shift < 64; shift += 8) out.push_back(static_cast<std::uint8_t>((static_cast<std::uint64_t>(value) >> shift) & 0xffu)); }",
    "inline void anqstPushQint64(std::vector<std::uint8_t>& out, qint64 value) { anqstPushQuint64(out, static_cast<quint64>(value)); }",
    "inline void anqstPushFloat64(std::vector<std::uint8_t>& out, double value) { std::uint64_t bits = 0; std::memcpy(&bits, &value, sizeof(bits)); anqstPushQuint64(out, bits); }",
    "",
    "inline std::uint8_t anqstReadUint8(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return offset < bytes.size() ? bytes[offset++] : 0u; }",
    "inline std::int8_t anqstReadInt8(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<std::int8_t>(anqstReadUint8(bytes, offset)); }",
    "inline bool anqstReadBool(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return anqstReadUint8(bytes, offset) != 0u; }",
    "inline std::uint16_t anqstReadUint16(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { const std::uint16_t b0 = anqstReadUint8(bytes, offset); const std::uint16_t b1 = anqstReadUint8(bytes, offset); return static_cast<std::uint16_t>(b0 | (b1 << 8)); }",
    "inline std::int16_t anqstReadInt16(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<std::int16_t>(anqstReadUint16(bytes, offset)); }",
    "inline quint16 anqstReadQuint16(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<quint16>(anqstReadUint16(bytes, offset)); }",
    "inline qint16 anqstReadQint16(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<qint16>(anqstReadInt16(bytes, offset)); }",
    "inline std::uint32_t anqstReadUint32(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { const std::uint32_t b0 = anqstReadUint8(bytes, offset); const std::uint32_t b1 = anqstReadUint8(bytes, offset); const std::uint32_t b2 = anqstReadUint8(bytes, offset); const std::uint32_t b3 = anqstReadUint8(bytes, offset); return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24); }",
    "inline std::int32_t anqstReadInt32(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<std::int32_t>(anqstReadUint32(bytes, offset)); }",
    "inline quint32 anqstReadQuint32(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<quint32>(anqstReadUint32(bytes, offset)); }",
    "inline qint32 anqstReadQint32(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<qint32>(anqstReadInt32(bytes, offset)); }",
    "inline std::uint64_t anqstReadQuint64(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { std::uint64_t value = 0; for (int shift = 0; shift < 64; shift += 8) value |= (static_cast<std::uint64_t>(anqstReadUint8(bytes, offset)) << shift); return value; }",
    "inline std::int64_t anqstReadQint64(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<std::int64_t>(anqstReadQuint64(bytes, offset)); }",
    "inline double anqstReadFloat64(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { const std::uint64_t bits = anqstReadQuint64(bytes, offset); double value = 0; std::memcpy(&value, &bits, sizeof(value)); return value; }",
    "",
    "inline QString anqstEncodeBinary(const QByteArray& value) {",
    "    return QString::fromStdString(base93Encode(std::vector<std::uint8_t>(value.begin(), value.end())));",
    "}",
    "",
    "inline QByteArray anqstDecodeBinary(const QString& encoded) {",
    "    const auto bytes = base93Decode(encoded.toStdString());",
    "    return QByteArray(reinterpret_cast<const char*>(bytes.data()), static_cast<int>(bytes.size()));",
    "}"
  ];
  const codecs = catalog.codecs.map((codec) => emitCppCodec(codec, mapCppType));
  return `${helpers.join("\n")}\n\n${codecs.join("\n\n")}\n`;
}

