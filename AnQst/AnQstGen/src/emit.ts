import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { PNG } from "pngjs";
import type { ParsedSpecModel, ServiceMemberModel, TypeDeclModel } from "./model";
import {
  anqstGeneratedRootDir,
  generatedFrontendDirName,
  generatedNodeExpressDirName,
  generatedQtWidgetDirName,
  resolveGeneratedLayoutPaths
} from "./layout";
import {
  buildBoundaryCodecCatalog,
  getBoundaryParameterSite,
  getBoundaryPayloadSite,
  renderCppBoundaryCodecHelpers,
  renderTsBoundaryCodecHelpers,
  type BoundaryCodecCatalog
} from "./boundary-codecs";

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

function splitGeneric(typeText: string): { name: string; arg: string } | null {
  const m = typeText.match(/^([A-Za-z0-9_.]+)<(.+)>$/);
  if (!m) return null;
  return { name: m[1], arg: m[2].trim() };
}

function filterNullishUnionTypeNodes(types: readonly ts.TypeNode[]): ts.TypeNode[] {
  return types.filter((part) => part.kind !== ts.SyntaxKind.NullKeyword && part.kind !== ts.SyntaxKind.UndefinedKeyword);
}

function isStringLikeUnionTypeNode(node: ts.UnionTypeNode): boolean {
  return node.types.every((part) => {
    if (ts.isLiteralTypeNode(part) && ts.isStringLiteral(part.literal)) return true;
    if (part.kind === ts.SyntaxKind.StringKeyword) return true;
    return false;
  });
}

function isBooleanLikeUnionTypeNode(node: ts.UnionTypeNode): boolean {
  return node.types.every((part) => {
    if (ts.isLiteralTypeNode(part) && (part.literal.kind === ts.SyntaxKind.TrueKeyword || part.literal.kind === ts.SyntaxKind.FalseKeyword)) return true;
    if (part.kind === ts.SyntaxKind.BooleanKeyword) return true;
    return false;
  });
}

function isNumberLikeUnionTypeNode(node: ts.UnionTypeNode): boolean {
  return node.types.every((part) => {
    if (ts.isLiteralTypeNode(part) && ts.isNumericLiteral(part.literal)) return true;
    if (part.kind === ts.SyntaxKind.NumberKeyword || part.kind === ts.SyntaxKind.BigIntKeyword) return true;
    return false;
  });
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
  const g = splitGeneric(t);
  if (g && g.name === "Array") return `QList<${mapTsTypeToCpp(g.arg)}>`;
  if (g && g.name === "ReadonlyArray") return `QList<${mapTsTypeToCpp(g.arg)}>`;
  if (g && g.name === "Record") return "QVariantMap";
  if (g && g.name === "Partial") return mapTsTypeToCpp(g.arg);
  if (g && g.name === "Promise") return mapTsTypeToCpp(g.arg);
  if (t.includes("|")) return "QString";
  return t;
}

function toCppArgs(member: ServiceMemberModel): string {
  return member.parameters.map((p) => `${mapTsTypeToCpp(p.typeText)} ${p.name}`).join(", ");
}

function callbackName(memberName: string): string {
  return `${memberName.charAt(0).toUpperCase()}${memberName.slice(1)}Callback`;
}

function pascalCase(value: string): string {
  return value.length === 0 ? value : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function variantToCppExpression(cppType: string, expr: string): string {
  if (cppType === "QString") return `${expr}.toString()`;
  if (cppType === "QStringList") return `${expr}.toStringList()`;
  if (cppType === "QVariantMap") return `${expr}.toMap()`;
  if (cppType === "QByteArray") return `${expr}.toByteArray()`;
  if (cppType === "double") return `${expr}.toDouble()`;
  if (cppType === "bool") return `${expr}.toBool()`;
  if (cppType === "qint64") return `${expr}.toLongLong()`;
  if (cppType === "quint64") return `${expr}.toULongLong()`;
  if (cppType === "qint32" || cppType === "quint32") return `${expr}.toInt()`;
  if (cppType === "qint16" || cppType === "quint16") return `static_cast<${cppType}>(${expr}.toInt())`;
  if (cppType === "qint8" || cppType === "quint8") return `static_cast<${cppType}>(${expr}.toInt())`;
  if (cppType === "int8_t" || cppType === "uint8_t" || cppType === "int16_t" || cppType === "uint16_t" || cppType === "int32_t" || cppType === "uint32_t") {
    return `static_cast<${cppType}>(${expr}.toInt())`;
  }
  return `${expr}.value<${cppType}>()`;
}

function cppToVariantExpression(cppType: string, expr: string): string {
  if (
    cppType === "QString" ||
    cppType === "QStringList" ||
    cppType === "QVariantMap" ||
    cppType === "QByteArray" ||
    cppType === "double" ||
    cppType === "bool" ||
    cppType === "qint64" ||
    cppType === "quint64" ||
    cppType === "qint32" ||
    cppType === "quint32" ||
    cppType === "qint16" ||
    cppType === "quint16" ||
    cppType === "qint8" ||
    cppType === "quint8" ||
    cppType === "int8_t" ||
    cppType === "uint8_t" ||
    cppType === "int16_t" ||
    cppType === "uint16_t" ||
    cppType === "int32_t" ||
    cppType === "uint32_t"
  ) {
    return `QVariant::fromValue(${expr})`;
  }
  return `QVariant::fromValue(${expr})`;
}

function splitTopLevelTemplateArgs(text: string): string[] {
  const args: string[] = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "<") {
      depth++;
      continue;
    }
    if (ch === ">") {
      depth--;
      continue;
    }
    if (ch === "," && depth === 0) {
      args.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = text.slice(start).trim();
  if (tail.length > 0) {
    args.push(tail);
  }
  return args;
}

function templateTypeArgs(cppType: string, containerName: string): string[] | null {
  const trimmed = cppType.trim();
  const prefix = `${containerName}<`;
  if (!trimmed.startsWith(prefix) || !trimmed.endsWith(">")) {
    return null;
  }
  const inner = trimmed.slice(prefix.length, -1).trim();
  if (inner.length === 0) return [];
  return splitTopLevelTemplateArgs(inner);
}

function isNumericCppType(cppType: string): boolean {
  return [
    "double",
    "qint64",
    "quint64",
    "qint32",
    "quint32",
    "qint16",
    "quint16",
    "qint8",
    "quint8",
    "int8_t",
    "uint8_t",
    "int16_t",
    "uint16_t",
    "int32_t",
    "uint32_t"
  ].includes(cppType);
}

function designerPlaceholderCppExpression(cppType: string, memberName: string): string {
  const escapedMember = escapeCppStringLiteral(memberName);
  const stringLiteral = `QStringLiteral("${escapedMember} value")`;
  if (cppType === "QString") return stringLiteral;
  if (cppType === "bool") return "true";
  if (isNumericCppType(cppType)) return `static_cast<${cppType}>(1)`;
  if (cppType === "QStringList") return `QStringList{${stringLiteral}}`;
  if (cppType === "QVariantMap") {
    return `QVariantMap{{QStringLiteral("${escapedMember}"), QVariant(${stringLiteral})}}`;
  }
  const optionalArgs = templateTypeArgs(cppType, "std::optional");
  if (optionalArgs && optionalArgs.length === 1) {
    const inner = optionalArgs[0];
    return `std::optional<${inner}>{${designerPlaceholderCppExpression(inner, memberName)}}`;
  }
  const listArgs = templateTypeArgs(cppType, "QList");
  if (listArgs && listArgs.length === 1) {
    const inner = listArgs[0];
    return `QList<${inner}>{${designerPlaceholderCppExpression(inner, memberName)}}`;
  }
  return `${cppType}{}`;
}

function collectStructDecls(spec: ParsedSpecModel): TypeDeclModel[] {
  const out = new Map<string, TypeDeclModel>();
  for (const d of spec.namespaceTypeDecls) out.set(d.name, d);
  for (const d of spec.importedTypeDecls.values()) out.set(d.name, d);
  return [...out.values()];
}

function mapTypeTextToTs(typeText: string): string {
  return stripAnQstType(typeText.trim());
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
  if (!stmt) {
    throw new Error(`Unable to parse type text: ${typeText}`);
  }
  return stmt.type;
}

function qNameText(name: ts.EntityName): string {
  if (ts.isIdentifier(name)) return name.text;
  return `${qNameText(name.left)}.${name.right.text}`;
}

function typeRefs(typeNode: ts.TypeNode): string[] {
  const refs = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isTypeReferenceNode(node)) refs.add(qNameText(node.typeName));
    ts.forEachChild(node, visit);
  };
  visit(typeNode);
  return [...refs];
}

function isBuiltinOrLiteral(ref: string): boolean {
  return [
    "string",
    "number",
    "boolean",
    "void",
    "object",
    "bigint",
    "BigInt",
    "Array",
    "ReadonlyArray",
    "Record",
    "Partial",
    "Readonly",
    "Date"
  ].includes(ref);
}

function collectReachableNamespaceDecls(spec: ParsedSpecModel): TypeDeclModel[] {
  const localByName = new Map(spec.namespaceTypeDecls.map((decl) => [decl.name, decl]));
  const queue: string[] = [...spec.namespaceTypeDecls.map((decl) => decl.name)];
  const seen = new Set<string>();
  const ordered: TypeDeclModel[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    const decl = localByName.get(current);
    if (!decl) continue;
    ordered.push(decl);
    for (const ref of decl.referencedTypeNames) {
      if (localByName.has(ref) && !seen.has(ref)) {
        queue.push(ref);
      }
    }
  }
  return ordered;
}

function collectRequiredImportedSymbols(spec: ParsedSpecModel): Set<string> {
  const required = new Set<string>();
  const localTypeNames = new Set(spec.namespaceTypeDecls.map((d) => d.name));

  const collectRef = (ref: string): void => {
    if (isBuiltinOrLiteral(ref)) return;
    if (ref.startsWith("AnQst.")) return;
    if (localTypeNames.has(ref)) return;
    required.add(ref.split(".")[0]);
  };

  for (const decl of collectReachableNamespaceDecls(spec)) {
    for (const ref of decl.referencedTypeNames) collectRef(ref);
  }

  for (const service of spec.services) {
    for (const member of service.members) {
      const texts = [...member.parameters.map((p) => p.typeText)];
      if (member.payloadTypeText) texts.push(member.payloadTypeText);
      for (const typeText of texts) {
        for (const ref of typeRefs(parseTypeNodeFromText(typeText))) {
          collectRef(ref);
        }
      }
    }
  }

  return required;
}

function normalizeImportPathForGenerated(specFilePath: string, generatedFileRelPath: string, moduleSpecifier: string): string {
  if (!moduleSpecifier.startsWith(".") && !moduleSpecifier.startsWith("/")) {
    return moduleSpecifier;
  }
  const specDir = path.dirname(specFilePath);
  const generatedAbs = path.resolve(path.dirname(specFilePath), "generated", generatedFileRelPath);
  const generatedDir = path.dirname(generatedAbs);
  const resolvedModulePath = path.resolve(specDir, moduleSpecifier);
  const relative = path.relative(generatedDir, resolvedModulePath);
  const normalized = relative.split(path.sep).join("/");
  if (normalized.startsWith(".")) return normalized;
  return `./${normalized}`;
}

function renderRequiredTypeImports(spec: ParsedSpecModel, generatedFileRelPath: string): string {
  const requiredSymbols = collectRequiredImportedSymbols(spec);
  if (requiredSymbols.size === 0) return "";

  const importLines: string[] = [];
  for (const imp of spec.specImports) {
    const defaultImport = imp.defaultImport && requiredSymbols.has(imp.defaultImport) ? imp.defaultImport : null;
    const named = imp.namedImports.filter((n) => requiredSymbols.has(n.localName));
    if (!defaultImport && named.length === 0) continue;

    const moduleSpecifier = normalizeImportPathForGenerated(spec.filePath, generatedFileRelPath, imp.moduleSpecifier);
    const namedClause = named
      .map((n) => (n.importedName === n.localName ? n.localName : `${n.importedName} as ${n.localName}`))
      .join(", ");

    if (defaultImport && named.length > 0) {
      importLines.push(`import type ${defaultImport}, { ${namedClause} } from "${moduleSpecifier}";`);
    } else if (defaultImport) {
      importLines.push(`import type ${defaultImport} from "${moduleSpecifier}";`);
    } else {
      importLines.push(`import type { ${namedClause} } from "${moduleSpecifier}";`);
    }
  }
  return importLines.length > 0 ? `${importLines.join("\n")}\n\n` : "";
}

function parseTypeDeclNode(nodeText: string): ts.InterfaceDeclaration | ts.TypeAliasDeclaration | null {
  const sf = ts.createSourceFile("__decl.ts", nodeText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const stmt of sf.statements) {
    if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) return stmt;
  }
  return null;
}

interface CppFieldModel {
  name: string;
  cppType: string;
  optional: boolean;
}

interface CppDeclModel {
  name: string;
  kind: "struct" | "alias";
  fields: CppFieldModel[];
  aliasType: string | null;
  deps: Set<string>;
  isUnionAlias: boolean;
}

interface CppTypeContext {
  orderedDecls: CppDeclModel[];
  structNames: string[];
  mapTypeText(typeText: string, nameHintParts: string[]): string;
}

class CppTypeNormalizer {
  private readonly declMap = new Map<string, CppDeclModel>();
  private readonly seedOrder: string[] = [];
  private readonly allKnownNames = new Set<string>();
  private readonly usedNames = new Set<string>();
  private readonly syntheticNameByKey = new Map<string, string>();

  constructor(spec: ParsedSpecModel) {
    for (const decl of collectStructDecls(spec)) {
      this.allKnownNames.add(decl.name);
      this.usedNames.add(decl.name);
    }
  }

  addSeedDecl(decl: TypeDeclModel): void {
    const node = parseTypeDeclNode(decl.nodeText);
    if (!node) return;
    if (this.declMap.has(decl.name)) return;
    const normalized = this.normalizeNamedDecl(decl.name, node);
    this.declMap.set(decl.name, normalized);
    this.seedOrder.push(decl.name);
  }

  mapTypeText(typeText: string, nameHintParts: string[]): string {
    const node = parseTypeNodeFromText(typeText);
    return this.mapTypeNode(node, nameHintParts, new Set());
  }

  buildContext(): CppTypeContext {
    const order = this.topologicalOrder();
    const orderedDecls = order.map((name) => this.declMap.get(name)).filter((x): x is CppDeclModel => !!x);
    const structNames = orderedDecls.filter((d) => d.kind === "struct").map((d) => d.name);
    return {
      orderedDecls,
      structNames,
      mapTypeText: (typeText: string, nameHintParts: string[]) => this.mapTypeText(typeText, nameHintParts)
    };
  }

  private normalizeNamedDecl(name: string, node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration): CppDeclModel {
    if (ts.isInterfaceDeclaration(node)) {
      const deps = new Set<string>();
      const fields: CppFieldModel[] = [];
      for (const member of node.members) {
        if (!ts.isPropertySignature(member) || !member.type || !ts.isIdentifier(member.name)) continue;
        const baseType = this.mapTypeNode(member.type, [name, member.name.text], deps);
        fields.push({
          name: member.name.text,
          cppType: baseType,
          optional: !!member.questionToken
        });
      }
      return { name, kind: "struct", fields, aliasType: null, deps, isUnionAlias: false };
    }

    const deps = new Set<string>();
    const aliasType = this.mapTypeNode(node.type, [name], deps);
    return {
      name,
      kind: "alias",
      fields: [],
      aliasType,
      deps,
      isUnionAlias: node.type.getText().includes("|")
    };
  }

  private mapTypeNode(typeNode: ts.TypeNode, nameHintParts: string[], deps: Set<string>): string {
    if (ts.isParenthesizedTypeNode(typeNode)) {
      return this.mapTypeNode(typeNode.type, nameHintParts, deps);
    }
    if (ts.isUnionTypeNode(typeNode)) {
      const filtered = filterNullishUnionTypeNodes(typeNode.types);
      if (filtered.length === 1) {
        return this.mapTypeNode(filtered[0], nameHintParts, deps);
      }
      if (isStringLikeUnionTypeNode(typeNode)) return "QString";
      if (isBooleanLikeUnionTypeNode(typeNode)) return "bool";
      if (isNumberLikeUnionTypeNode(typeNode)) return "double";
      return "QString";
    }
    if (ts.isTypeLiteralNode(typeNode)) {
      return this.ensureSyntheticStruct(typeNode, nameHintParts, deps);
    }
    if (ts.isArrayTypeNode(typeNode)) {
      const itemType = this.mapTypeNode(typeNode.elementType, [...nameHintParts, "Item"], deps);
      return `QList<${itemType}>`;
    }
    if (ts.isLiteralTypeNode(typeNode)) {
      if (ts.isStringLiteral(typeNode.literal)) return "QString";
      if (ts.isNumericLiteral(typeNode.literal)) return "double";
      if (typeNode.literal.kind === ts.SyntaxKind.TrueKeyword || typeNode.literal.kind === ts.SyntaxKind.FalseKeyword) return "bool";
      return "QString";
    }
    if (ts.isTypeReferenceNode(typeNode)) {
      const name = qNameText(typeNode.typeName);
      const rawText = typeNode.getText();
      if (name.startsWith("AnQst.Type.")) {
        return mapTsTypeToCpp(rawText);
      }
      const args = typeNode.typeArguments ?? [];
      if ((name === "Array" || name === "ReadonlyArray") && args.length === 1) {
        const itemType = this.mapTypeNode(args[0], [...nameHintParts, "Item"], deps);
        return `QList<${itemType}>`;
      }
      if (name === "Record") return "QVariantMap";
      if (name === "Partial" && args.length === 1) {
        return this.mapTypeNode(args[0], nameHintParts, deps);
      }
      if (name === "Promise" && args.length === 1) {
        return this.mapTypeNode(args[0], nameHintParts, deps);
      }
      const mapped = mapTsTypeToCpp(rawText);
      this.collectKnownTypeDeps(mapped, deps);
      return mapped;
    }

    const mapped = mapTsTypeToCpp(typeNode.getText());
    this.collectKnownTypeDeps(mapped, deps);
    return mapped;
  }

  private ensureSyntheticStruct(typeNode: ts.TypeLiteralNode, nameHintParts: string[], deps: Set<string>): string {
    const baseName = this.makeSyntheticBaseName(nameHintParts);
    const syntheticKey = `${baseName}::${typeNode.getText()}`;
    const existingName = this.syntheticNameByKey.get(syntheticKey);
    if (existingName) {
      deps.add(existingName);
      return existingName;
    }
    const synthesizedName = this.allocateUniqueName(baseName);
    this.syntheticNameByKey.set(syntheticKey, synthesizedName);
    if (this.declMap.has(synthesizedName)) {
      deps.add(synthesizedName);
      return synthesizedName;
    }
    this.allKnownNames.add(synthesizedName);
    const fields: CppFieldModel[] = [];
    const localDeps = new Set<string>();
    for (const member of typeNode.members) {
      if (!ts.isPropertySignature(member) || !member.type || !ts.isIdentifier(member.name)) continue;
      const cppType = this.mapTypeNode(member.type, [...nameHintParts, member.name.text], localDeps);
      fields.push({
        name: member.name.text,
        cppType,
        optional: !!member.questionToken
      });
    }
    this.declMap.set(synthesizedName, {
      name: synthesizedName,
      kind: "struct",
      fields,
      aliasType: null,
      deps: localDeps,
      isUnionAlias: false
    });
    this.seedOrder.push(synthesizedName);
    deps.add(synthesizedName);
    return synthesizedName;
  }

  private collectKnownTypeDeps(cppType: string, deps: Set<string>): void {
    for (const match of cppType.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
      const token = match[0];
      if (this.allKnownNames.has(token)) {
        deps.add(token);
      }
    }
  }

  private makeSyntheticBaseName(parts: string[]): string {
    const cleaned = parts
      .map((p) => p.replace(/[^A-Za-z0-9_]/g, "_"))
      .map((p) => p.replace(/_+/g, "_"))
      .map((p) => p.replace(/^_+|_+$/g, ""))
      .filter((p) => p.length > 0);
    return cleaned.join("_") || "AnonymousType";
  }

  private allocateUniqueName(baseName: string): string {
    let candidate = baseName;
    let i = 2;
    while (this.usedNames.has(candidate)) {
      candidate = `${baseName}_${i}`;
      i += 1;
    }
    this.usedNames.add(candidate);
    return candidate;
  }

  private topologicalOrder(): string[] {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const ordered: string[] = [];
    const visit = (name: string): void => {
      if (visited.has(name)) return;
      if (visiting.has(name)) return;
      visiting.add(name);
      const decl = this.declMap.get(name);
      if (decl) {
        for (const dep of [...decl.deps].sort()) {
          if (dep === name) continue;
          if (this.declMap.has(dep)) visit(dep);
        }
      }
      visiting.delete(name);
      visited.add(name);
      ordered.push(name);
    };
    for (const name of this.seedOrder) {
      visit(name);
    }
    return ordered;
  }
}

function renderCppDecl(decl: CppDeclModel): string {
  if (decl.kind === "alias") {
    if (decl.isUnionAlias && decl.aliasType === "QString") {
      return `using ${decl.name} = QString; // union mapped conservatively`;
    }
    return `using ${decl.name} = ${decl.aliasType ?? "QString"};`;
  }
  const lines: string[] = [];
  lines.push(`struct ${decl.name} {`);
  for (const field of decl.fields) {
    const cppType = field.optional ? `std::optional<${field.cppType}>` : field.cppType;
    lines.push(`    ${cppType} ${field.name};`);
  }
  const comparisons = decl.fields.map((f) => `${f.name} == other.${f.name}`);
  lines.push(`    bool operator==(const ${decl.name}& other) const { return ${comparisons.length > 0 ? comparisons.join(" && ") : "true"}; }`);
  lines.push("};");
  return lines.join("\n");
}

function buildCppTypeContext(spec: ParsedSpecModel): CppTypeContext {
  const normalizer = new CppTypeNormalizer(spec);
  for (const decl of collectStructDecls(spec)) {
    normalizer.addSeedDecl(decl);
  }
  for (const service of spec.services) {
    for (const member of service.members) {
      if (member.payloadTypeText) {
        normalizer.mapTypeText(member.payloadTypeText, [service.name, member.name, "Payload"]);
      }
      for (const param of member.parameters) {
        normalizer.mapTypeText(param.typeText, [service.name, member.name, param.name]);
      }
    }
  }
  return normalizer.buildContext();
}

function collectDragDropMimeConstants(spec: ParsedSpecModel): { typeName: string; serviceName: string; mimeType: string }[] {
  const seen = new Set<string>();
  const constants: { typeName: string; serviceName: string; mimeType: string }[] = [];
  for (const service of spec.services) {
    for (const member of service.members) {
      if ((member.kind === "DropTarget" || member.kind === "HoverTarget") && member.payloadTypeText) {
        const typeName = member.payloadTypeText.replace(/\s/g, "");
        const key = `${service.name}-${typeName}`;
        if (seen.has(key)) continue;
        seen.add(key);
        constants.push({
          typeName,
          serviceName: service.name,
          mimeType: `application/anqst-dragdropevent_${service.name}-${typeName}`
        });
      }
    }
  }
  return constants;
}

function collectDragDropPayloadHelpers(
  spec: ParsedSpecModel,
  cppTypes: CppTypeContext,
  cppCodecCatalog: BoundaryCodecCatalog
): { typeName: string; cppType: string; codecId: string }[] {
  const seen = new Set<string>();
  const helpers: { typeName: string; cppType: string; codecId: string }[] = [];
  for (const service of spec.services) {
    for (const member of service.members) {
      if ((member.kind !== "DropTarget" && member.kind !== "HoverTarget") || !member.payloadTypeText) continue;
      const typeName = member.payloadTypeText.replace(/\s/g, "");
      if (seen.has(typeName)) continue;
      seen.add(typeName);
      const payloadSite = getBoundaryPayloadSite(cppCodecCatalog, service.name, member.name);
      if (!payloadSite) continue;
      helpers.push({
        typeName,
        cppType: cppTypes.mapTypeText(member.payloadTypeText, [service.name, member.name, "Payload"]),
        codecId: payloadSite.codecId
      });
    }
  }
  return helpers;
}

function renderTypesHeader(spec: ParsedSpecModel, cppTypes: CppTypeContext): string {
  const decls = cppTypes.orderedDecls.map(renderCppDecl).join("\n\n");
  const metatypes = cppTypes.structNames
    .flatMap((name) => [
      `Q_DECLARE_METATYPE(${spec.widgetName}::${name})`,
      `Q_DECLARE_METATYPE(QList<${spec.widgetName}::${name}>)`
    ])
    .join("\n");
  const mimeConstants = collectDragDropMimeConstants(spec);
  const mimeConstantLines = mimeConstants
    .map((c) => `static constexpr const char* kDragDropMime_${c.typeName} = "${c.mimeType}";`)
    .join("\n");
  const mimeBlock = mimeConstantLines.length > 0 ? `\n${mimeConstantLines}\n` : "";
  return `#pragma once
#include <QString>
#include <QStringList>
#include <QByteArray>
#include <QList>
#include <QVariantMap>
#include <QMetaType>
#include <cstdint>
#include <optional>

namespace ${spec.widgetName} {

${decls}
${mimeBlock}
} // namespace ${spec.widgetName}

${metatypes}
`;
}

function renderWidgetUmbrellaHeader(spec: ParsedSpecModel): string {
  return `#pragma once
// Built by <AnQst_version>
#include "${spec.widgetName}Widget.h"
#include "${spec.widgetName}Types.h"
`;
}

function renderWidgetHeader(spec: ParsedSpecModel, cppTypes: CppTypeContext, cppCodecCatalog: BoundaryCodecCatalog): string {
  const widgetClassName = `${spec.widgetName}Widget`;
  const dragDropPayloadHelpers = collectDragDropPayloadHelpers(spec, cppTypes, cppCodecCatalog);
  const callbackAliases: string[] = [];
  const publicMethods: string[] = [];
  const slotMethods: string[] = [];
  const handleMethods: string[] = [];
  const callSetterMethods: string[] = [];
  const signals: string[] = [];
  const properties: string[] = [];
  const fields: string[] = [];
  const publicSlots: string[] = [];
  const dragDropHelperMethods = dragDropPayloadHelpers.flatMap((helper) => [
    `static QByteArray encodeDragDropPayload_${helper.typeName}(const ${helper.cppType}& payload);`,
    `static std::optional<${helper.cppType}> decodeDragDropPayload_${helper.typeName}(const QByteArray& rawPayload);`
  ]);

  type MemberBinding = { service: string; member: string; kind: ServiceMemberModel["kind"] };
  const bindings: MemberBinding[] = [];

  for (const service of spec.services) {
    for (const member of service.members) {
      bindings.push({ service: service.name, member: member.name, kind: member.kind });
      const memberPascal = pascalCase(member.name);
      if (member.kind === "Call" && member.payloadTypeText) {
        const cppType = cppTypes.mapTypeText(member.payloadTypeText, [service.name, member.name, "Payload"]);
        const args = member.parameters.map((p) => `const ${cppTypes.mapTypeText(p.typeText, [service.name, member.name, p.name])}& ${p.name}`).join(", ");
        callbackAliases.push(`using ${memberPascal}Handler = std::function<${cppType}(${args})>;`);
        handleMethods.push(`    void ${member.name}(const ${memberPascal}Handler& handler) const;`);
        callSetterMethods.push(`void set${memberPascal}CallHandler(const ${memberPascal}Handler& handler);`);
        fields.push(`${memberPascal}Handler m_${member.name}Handler;`);
      } else if (member.kind === "Emitter") {
        const args = member.parameters.map((p) => `const ${cppTypes.mapTypeText(p.typeText, [service.name, member.name, p.name])}& ${p.name}`).join(", ");
        signals.push(`void ${member.name}(${args});`);
      } else if (member.kind === "Slot") {
        const ret = member.payloadTypeText ? cppTypes.mapTypeText(member.payloadTypeText, [service.name, member.name, "Payload"]) : "void";
        const args = member.parameters.map((p) => `${cppTypes.mapTypeText(p.typeText, [service.name, member.name, p.name])} ${p.name}`).join(", ");
        slotMethods.push(`${ret} slot_${member.name}(${args});`);
      } else if ((member.kind === "Input" || member.kind === "Output") && member.payloadTypeText) {
        const cppType = cppTypes.mapTypeText(member.payloadTypeText, [service.name, member.name, "Payload"]);
        const cap = member.name.charAt(0).toUpperCase() + member.name.slice(1);
        properties.push(`Q_PROPERTY(${cppType} ${member.name} READ ${member.name} WRITE set${cap} NOTIFY ${member.name}Changed)`);
        publicMethods.push(`${cppType} ${member.name}() const;`);
        publicMethods.push(`void set${cap}(const ${cppType}& value);`);
        signals.push(`void ${member.name}Changed(const ${cppType}& value);`);
        fields.push(`${cppType} m_${member.name}{};`);
        if (member.kind === "Input") {
          callbackAliases.push(`using ${memberPascal}Handler = std::function<void(const ${cppType}& value)>;`);
          publicMethods.push(`void set${memberPascal}Handler(const ${memberPascal}Handler& handler);`);
          fields.push(`${memberPascal}Handler m_${member.name}Handler;`);
        } else {
          publicSlots.push(`void ${member.name}Slot(const ${cppType}& value);`);
        }
      } else if (member.kind === "DropTarget" && member.payloadTypeText) {
        const cppType = cppTypes.mapTypeText(member.payloadTypeText, [service.name, member.name, "Payload"]);
        signals.push(`void ${member.name}(const ${cppType}& payload, double x, double y);`);
      } else if (member.kind === "HoverTarget" && member.payloadTypeText) {
        const cppType = cppTypes.mapTypeText(member.payloadTypeText, [service.name, member.name, "Payload"]);
        signals.push(`void ${member.name}(const ${cppType}& payload, double x, double y);`);
        signals.push(`void ${member.name}Left();`);
      }
    }
  }

  return `#pragma once
#include <QByteArray>
#include <QDateTime>
#include <QHash>
#include <QMetaMethod>
#include <QQueue>
#include <QVariant>
#include <QVariantList>
#include <functional>
#include <optional>
#include "AnQstWebHostBase.h"
#include "${spec.widgetName}Types.h"

namespace ${spec.widgetName} {
} // namespace ${spec.widgetName}

using namespace ${spec.widgetName};

class ${widgetClassName} : public AnQstWebHostBase {
    Q_OBJECT
${properties.map((p) => `    ${p}`).join("\n")}

public:
${callbackAliases.map((s) => `    ${s}`).join("\n")}

    class handle {
    public:
        explicit handle(${widgetClassName}* owner) : m_owner(owner) {}
${handleMethods.join("\n")}
    private:
        ${widgetClassName}* m_owner;
    };

    explicit ${widgetClassName}(QWidget* parent = nullptr);
    ~${widgetClassName}() override;
    bool enableDebug();
    static constexpr const char* kBootstrapEntryPoint = "index.html";
    static constexpr const char* kBootstrapContentRoot = "qrc:/${spec.widgetName.toLowerCase()}";
    static constexpr const char* kBootstrapBridgeObject = "${spec.widgetName}Bridge";
    static constexpr int kMaxQueuedCallsPerEndpoint = 1024;
${dragDropHelperMethods.map((s) => `    ${s}`).join("\n")}

    handle handle;
${publicMethods.map((s) => `    ${s}`).join("\n")}

public slots:
${slotMethods.map((s) => `    ${s}`).join("\n")}
${publicSlots.map((s) => `    ${s}`).join("\n")}

signals:
${signals.map((s) => `    ${s}`).join("\n")}
    void diagnosticsForwarded(const QVariantMap& payload);

protected:
    void connectNotify(const QMetaMethod& signal) override;
    void disconnectNotify(const QMetaMethod& signal) override;

private:
    struct PendingCallInvocation {
        QString requestId;
        QVariantList args;
        QDateTime enqueuedAt;
    };
    struct BridgeBindingRow {
        const char* service;
        const char* member;
        const char* kind;
    };
    static const BridgeBindingRow kBridgeBindings[];
    static constexpr int kBridgeBindingsCount = ${bindings.length};
    static QString makeBindingKey(const QString& service, const QString& member);
    void installBridgeBindings();
    bool hasEmitterListeners(const QString& service, const QString& member) const;
    QVariant handleGeneratedCall(const QString& service, const QString& member, const QVariantList& args);
    void handleGeneratedEmitter(const QString& service, const QString& member, const QVariantList& args);
    void handleGeneratedInput(const QString& service, const QString& member, const QVariant& value);
    QVariant waitForCallHandlerAndInvoke(
        const QString& service,
        const QString& member,
        const QString& requestId,
        int timeoutMs,
        const std::function<QVariant()>& invokeNow);
    void removeQueuedCallById(const QString& queueKey, const QString& requestId);
${callSetterMethods.map((s) => `    ${s}`).join("\n")}

    qulonglong m_callRequestCounter{0};
    QHash<QString, QQueue<PendingCallInvocation>> m_queuedCalls;
${fields.map((f) => `    ${f}`).join("\n")}
};
`;
}

function renderCppStub(spec: ParsedSpecModel, cppTypes: CppTypeContext, cppCodecCatalog: BoundaryCodecCatalog): string {
  const widgetClassName = `${spec.widgetName}Widget`;
  const dragDropPayloadHelpers = collectDragDropPayloadHelpers(spec, cppTypes, cppCodecCatalog);
  const cppCodecHelpers = renderCppBoundaryCodecHelpers(
    cppCodecCatalog,
    (typeText, pathHintParts) => cppTypes.mapTypeText(typeText, pathHintParts)
  ).trim();
  const lines: string[] = [];
  lines.push(`#include "include/${spec.widgetName}Widget.h"`);
  lines.push(`#include <QDebug>`);
  lines.push(`#include <QElapsedTimer>`);
  lines.push(`#include <QEventLoop>`);
  lines.push(`#include <QJsonArray>`);
  lines.push(`#include <QJsonDocument>`);
  lines.push(`#include <QMetaType>`);
  lines.push(`#include <QTimer>`);
  lines.push(`#include <cstring>`);
  lines.push(`#include <cstdint>`);
  lines.push(`#include <string>`);
  lines.push(`#include <vector>`);
  lines.push(`#include <stdexcept>`);
  lines.push("");
  lines.push(`using namespace ${spec.widgetName};`);
  lines.push("");
  lines.push(`extern int qInitResources_${spec.widgetName}();`);
  lines.push("");
  lines.push("namespace {");
  lines.push("void registerGeneratedMetaTypes() {");
  lines.push("    static const bool registered = []() {");
  for (const typeName of cppTypes.structNames) {
    lines.push(`        qRegisterMetaType<${spec.widgetName}::${typeName}>("${spec.widgetName}::${typeName}");`);
    lines.push(`        qRegisterMetaType<QList<${spec.widgetName}::${typeName}>>("QList<${spec.widgetName}::${typeName}>");`);
  }
  lines.push("        return true;");
  lines.push("    }();");
  lines.push("    Q_UNUSED(registered);");
  lines.push("}");
  if (cppCodecHelpers.length > 0) {
    lines.push("");
    lines.push(cppCodecHelpers);
  }
  lines.push("}");
  lines.push("");
  for (const helper of dragDropPayloadHelpers) {
    lines.push(`QByteArray ${widgetClassName}::encodeDragDropPayload_${helper.typeName}(const ${helper.cppType}& payload) {`);
    lines.push(`    return QJsonDocument::fromVariant(anqstNormalizeWireItems(encode${helper.codecId}(payload))).toJson(QJsonDocument::Compact);`);
    lines.push(`}`);
    lines.push("");
    lines.push(`std::optional<${helper.cppType}> ${widgetClassName}::decodeDragDropPayload_${helper.typeName}(const QByteArray& rawPayload) {`);
    lines.push(`    QJsonParseError parseError;`);
    lines.push(`    const QJsonDocument document = QJsonDocument::fromJson(rawPayload, &parseError);`);
    lines.push(`    if (parseError.error != QJsonParseError::NoError || !document.isArray()) {`);
    lines.push(`        return std::nullopt;`);
    lines.push(`    }`);
    lines.push(`    try {`);
    lines.push(`        return decode${helper.codecId}(document.array().toVariantList());`);
    lines.push(`    } catch (...) {`);
    lines.push(`        return std::nullopt;`);
    lines.push(`    }`);
    lines.push(`}`);
    lines.push("");
  }
  for (const service of spec.services) {
    for (const member of service.members) {
      if (member.kind !== "Call" || !member.payloadTypeText) continue;
      const pascal = pascalCase(member.name);
      lines.push(`void ${widgetClassName}::handle::${member.name}(const ${pascal}Handler& handler) const {`);
      lines.push(`    if (m_owner == nullptr) return;`);
      lines.push(`    m_owner->set${pascal}CallHandler(handler);`);
      lines.push(`}`);
      lines.push("");
      lines.push(`void ${widgetClassName}::set${pascal}CallHandler(const ${pascal}Handler& handler) {`);
      lines.push(`    m_${member.name}Handler = handler;`);
      lines.push(`}`);
      lines.push("");
    }
  }
  lines.push(`const ${widgetClassName}::BridgeBindingRow ${widgetClassName}::kBridgeBindings[] = {`);
  for (const service of spec.services) {
    for (const member of service.members) {
      lines.push(`    {"${service.name}", "${member.name}", "${member.kind}"},`);
    }
  }
  lines.push(`};`);
  lines.push("");
  lines.push(`${widgetClassName}::${widgetClassName}(QWidget* parent) : AnQstWebHostBase(parent), handle(this) {`);
  lines.push(`    static const bool kResourcesInitialized = []() {`);
  lines.push(`        ::qInitResources_${spec.widgetName}();`);
  lines.push(`        return true;`);
  lines.push(`    }();`);
  lines.push(`    Q_UNUSED(kResourcesInitialized);`);
  lines.push(`    registerGeneratedMetaTypes();`);
  lines.push(`    installBridgeBindings();`);
  for (const service of spec.services) {
    for (const member of service.members) {
      if (member.kind === "DropTarget" && member.payloadTypeText) {
        const typeName = member.payloadTypeText.replace(/\s/g, "");
        const mimeConst = `${spec.widgetName}::kDragDropMime_${typeName}`;
        lines.push(`    registerDropTarget(QStringLiteral("${service.name}"), QStringLiteral("${member.name}"), QString::fromUtf8(${mimeConst}));`);
      } else if (member.kind === "HoverTarget" && member.payloadTypeText) {
        const typeName = member.payloadTypeText.replace(/\s/g, "");
        const mimeConst = `${spec.widgetName}::kDragDropMime_${typeName}`;
        lines.push(`    registerHoverTarget(QStringLiteral("${service.name}"), QStringLiteral("${member.name}"), QString::fromUtf8(${mimeConst}), ${member.hoverThrottleMs});`);
      }
    }
  }
  for (const service of spec.services) {
    for (const member of service.members) {
      if (member.kind === "DropTarget" && member.payloadTypeText) {
        const cppType = cppTypes.mapTypeText(member.payloadTypeText, [service.name, member.name, "Payload"]);
        const payloadSite = getBoundaryPayloadSite(cppCodecCatalog, service.name, member.name);
        lines.push(`    QObject::connect(this, &AnQstWebHostBase::anQstBridge_dropReceived, this, [this](const QString& service, const QString& member, const QVariant& payload, double x, double y) {`);
        lines.push(`        if (service == QStringLiteral("${service.name}") && member == QStringLiteral("${member.name}")) {`);
        lines.push(`            emit ${member.name}(${payloadSite ? `decode${payloadSite.codecId}(payload)` : `payload.value<${cppType}>()`}, x, y);`);
        lines.push(`        }`);
        lines.push(`    });`);
      } else if (member.kind === "HoverTarget" && member.payloadTypeText) {
        const cppType = cppTypes.mapTypeText(member.payloadTypeText, [service.name, member.name, "Payload"]);
        const payloadSite = getBoundaryPayloadSite(cppCodecCatalog, service.name, member.name);
        lines.push(`    QObject::connect(this, &AnQstWebHostBase::anQstBridge_hoverUpdated, this, [this](const QString& service, const QString& member, const QVariant& payload, double x, double y) {`);
        lines.push(`        if (service == QStringLiteral("${service.name}") && member == QStringLiteral("${member.name}")) {`);
        lines.push(`            emit ${member.name}(${payloadSite ? `decode${payloadSite.codecId}(payload)` : `payload.value<${cppType}>()`}, x, y);`);
        lines.push(`        }`);
        lines.push(`    });`);
        lines.push(`    QObject::connect(this, &AnQstWebHostBase::anQstBridge_hoverLeft, this, [this](const QString& service, const QString& member) {`);
        lines.push(`        if (service == QStringLiteral("${service.name}") && member == QStringLiteral("${member.name}")) {`);
        lines.push(`            emit ${member.name}Left();`);
        lines.push(`        }`);
        lines.push(`    });`);
      }
    }
  }
  lines.push(`    QObject::connect(this, &AnQstWebHostBase::onHostError, this, &${widgetClassName}::diagnosticsForwarded);`);
  lines.push(`    const bool rootOk = setContentRoot(QString::fromUtf8(kBootstrapContentRoot));`);
  lines.push(`    const bool bridgeOk = setBridgeObject(this, QString::fromUtf8(kBootstrapBridgeObject));`);
  lines.push(`    const bool loadOk = rootOk && bridgeOk && loadEntryPoint(QString::fromUtf8(kBootstrapEntryPoint));`);
  lines.push(`    if (!loadOk) {`);
  lines.push(`        qWarning() << "${spec.widgetName} bootstrap failed.";`);
  lines.push(`    }`);
  lines.push("}");
  lines.push("");
  lines.push(`${widgetClassName}::~${widgetClassName}() = default;`);
  lines.push("");
  lines.push(`bool ${widgetClassName}::enableDebug() {`);
  lines.push(`    return AnQstWebHostBase::enableDebug();`);
  lines.push("}");
  lines.push("");
  lines.push(`QString ${widgetClassName}::makeBindingKey(const QString& service, const QString& member) {`);
  lines.push(`    return service + QStringLiteral("::") + member;`);
  lines.push(`}`);
  lines.push("");
  lines.push(`void ${widgetClassName}::removeQueuedCallById(const QString& queueKey, const QString& requestId) {`);
  lines.push(`    if (!m_queuedCalls.contains(queueKey)) return;`);
  lines.push(`    auto& queue = m_queuedCalls[queueKey];`);
  lines.push(`    for (int i = 0; i < queue.size(); ++i) {`);
  lines.push(`        if (queue[i].requestId == requestId) {`);
  lines.push(`            queue.removeAt(i);`);
  lines.push(`            break;`);
  lines.push(`        }`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push("");
  lines.push(`QVariant ${widgetClassName}::waitForCallHandlerAndInvoke(`);
  lines.push(`    const QString& service,`);
  lines.push(`    const QString& member,`);
  lines.push(`    const QString& requestId,`);
  lines.push(`    int timeoutMs,`);
  lines.push(`    const std::function<QVariant()>& invokeNow) {`);
  lines.push(`    const QString queueKey = makeBindingKey(service, member);`);
  lines.push(`    QElapsedTimer timer;`);
  lines.push(`    timer.start();`);
  lines.push(`    QEventLoop loop;`);
  lines.push(`    QTimer tick;`);
  lines.push(`    tick.setSingleShot(true);`);
  lines.push(`    QObject::connect(&tick, &QTimer::timeout, &loop, &QEventLoop::quit);`);
  lines.push(`    while (true) {`);
  lines.push(`        if (m_queuedCalls.contains(queueKey) && !m_queuedCalls[queueKey].isEmpty() && m_queuedCalls[queueKey].head().requestId == requestId) {`);
  lines.push(`            m_queuedCalls[queueKey].dequeue();`);
  lines.push(`            return invokeNow();`);
  lines.push(`        }`);
  lines.push(`        if (timeoutMs > 0 && timer.elapsed() >= timeoutMs) {`);
  lines.push(`            removeQueuedCallById(queueKey, requestId);`);
  lines.push(`            return QVariantMap{`);
  lines.push(`                {QStringLiteral("code"), QStringLiteral("BridgeTimeoutError")},`);
  lines.push(`                {QStringLiteral("message"), QStringLiteral("Call timed out while waiting for callback registration.")},`);
  lines.push(`                {QStringLiteral("service"), service},`);
  lines.push(`                {QStringLiteral("member"), member},`);
  lines.push(`                {QStringLiteral("requestId"), requestId}`);
  lines.push(`            };`);
  lines.push(`        }`);
  lines.push(`        tick.start(10);`);
  lines.push(`        loop.exec();`);
  lines.push(`    }`);
  lines.push(`}`);
  lines.push("");
  lines.push(`bool ${widgetClassName}::hasEmitterListeners(const QString& service, const QString& member) const {`);
  for (const service of spec.services) {
    for (const member of service.members) {
      if (member.kind !== "Emitter") continue;
      lines.push(`    if (service == QStringLiteral("${service.name}") && member == QStringLiteral("${member.name}")) {`);
      lines.push(`        return isSignalConnected(QMetaMethod::fromSignal(&${widgetClassName}::${member.name}));`);
      lines.push(`    }`);
    }
  }
  lines.push(`    return false;`);
  lines.push(`}`);
  lines.push("");
  lines.push(`void ${widgetClassName}::installBridgeBindings() {`);
  lines.push(`    setCallHandler([this](const QString& service, const QString& member, const QVariantList& args) -> QVariant {`);
  lines.push(`        return handleGeneratedCall(service, member, args);`);
  lines.push(`    });`);
  lines.push(`    setEmitterHandler([this](const QString& service, const QString& member, const QVariantList& args) {`);
  lines.push(`        handleGeneratedEmitter(service, member, args);`);
  lines.push(`    });`);
  lines.push(`    setInputHandler([this](const QString& service, const QString& member, const QVariant& value) {`);
  lines.push(`        handleGeneratedInput(service, member, value);`);
  lines.push(`    });`);
  lines.push(`}`);
  lines.push("");
  lines.push(`QVariant ${widgetClassName}::handleGeneratedCall(const QString& service, const QString& member, const QVariantList& args) {`);
  for (const service of spec.services) {
    for (const member of service.members) {
      if (member.kind !== "Call" || !member.payloadTypeText) continue;
      const timeoutMs = member.timeoutMs;
      const cppType = cppTypes.mapTypeText(member.payloadTypeText, [service.name, member.name, "Payload"]);
      const payloadSite = getBoundaryPayloadSite(cppCodecCatalog, service.name, member.name);
      lines.push(`    if (service == QStringLiteral("${service.name}") && member == QStringLiteral("${member.name}")) {`);
      for (let i = 0; i < member.parameters.length; i++) {
        const p = member.parameters[i];
        const pType = cppTypes.mapTypeText(p.typeText, [service.name, member.name, p.name]);
        const paramSite = getBoundaryParameterSite(cppCodecCatalog, service.name, member.name, p.name);
        lines.push(`        const ${pType} ${p.name} = ${paramSite ? `decode${paramSite.codecId}(args.value(${i}))` : variantToCppExpression(pType, `args.value(${i})`)};`);
      }
      lines.push(`        const QString requestId = QStringLiteral("call-%1").arg(++m_callRequestCounter);`);
      lines.push(`        const QString queueKey = makeBindingKey(QStringLiteral("${service.name}"), QStringLiteral("${member.name}"));`);
      lines.push(`        auto invokeNow = [this, requestId${member.parameters.length > 0 ? `, ${member.parameters.map((p) => p.name).join(", ")}` : ""}]() -> QVariant {`);
      lines.push(`            if (!m_${member.name}Handler) {`);
      lines.push(`                return QVariantMap{`);
      lines.push(`                    {QStringLiteral("code"), QStringLiteral("HandlerNotRegisteredError")},`);
      lines.push(`                    {QStringLiteral("message"), QStringLiteral("No callback registered for Call endpoint.")},`);
      lines.push(`                    {QStringLiteral("service"), QStringLiteral("${service.name}")},`);
      lines.push(`                    {QStringLiteral("member"), QStringLiteral("${member.name}")},`);
      lines.push(`                    {QStringLiteral("requestId"), requestId}`);
      lines.push(`                };`);
      lines.push(`            }`);
      lines.push(`            try {`);
      const callArgs = member.parameters.map((p) => p.name).join(", ");
      lines.push(`                const ${cppType} result = m_${member.name}Handler(${callArgs});`);
      lines.push(`                return ${payloadSite ? `encode${payloadSite.codecId}(result)` : cppToVariantExpression(cppType, "result")};`);
      lines.push(`            } catch (const std::exception& ex) {`);
      lines.push(`                return QVariantMap{`);
      lines.push(`                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},`);
      lines.push(`                    {QStringLiteral("message"), QString::fromUtf8(ex.what())},`);
      lines.push(`                    {QStringLiteral("service"), QStringLiteral("${service.name}")},`);
      lines.push(`                    {QStringLiteral("member"), QStringLiteral("${member.name}")},`);
      lines.push(`                    {QStringLiteral("requestId"), requestId}`);
      lines.push(`                };`);
      lines.push(`            } catch (...) {`);
      lines.push(`                return QVariantMap{`);
      lines.push(`                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},`);
      lines.push(`                    {QStringLiteral("message"), QStringLiteral("Call handler threw unknown exception.")},`);
      lines.push(`                    {QStringLiteral("service"), QStringLiteral("${service.name}")},`);
      lines.push(`                    {QStringLiteral("member"), QStringLiteral("${member.name}")},`);
      lines.push(`                    {QStringLiteral("requestId"), requestId}`);
      lines.push(`                };`);
      lines.push(`            }`);
      lines.push(`        };`);
      lines.push(`        if (m_${member.name}Handler) {`);
      lines.push(`            return invokeNow();`);
      lines.push(`        }`);
      lines.push(`        auto& queue = m_queuedCalls[queueKey];`);
      lines.push(`        if (queue.size() >= kMaxQueuedCallsPerEndpoint) {`);
      lines.push(`            queue.dequeue();`);
      lines.push(`        }`);
      lines.push(`        queue.enqueue(PendingCallInvocation{requestId, args, QDateTime::currentDateTimeUtc()});`);
      lines.push(`        return waitForCallHandlerAndInvoke(QStringLiteral("${service.name}"), QStringLiteral("${member.name}"), requestId, ${timeoutMs}, invokeNow);`);
      lines.push(`    }`);
    }
  }
  lines.push(`    return QVariantMap{`);
  lines.push(`        {QStringLiteral("code"), QStringLiteral("HandlerNotRegisteredError")},`);
  lines.push(`        {QStringLiteral("message"), QStringLiteral("No Call mapping found.")},`);
  lines.push(`        {QStringLiteral("service"), service},`);
  lines.push(`        {QStringLiteral("member"), member},`);
  lines.push(`        {QStringLiteral("requestId"), QString()}`);
  lines.push(`    };`);
  lines.push(`}`);
  lines.push("");
  lines.push(`void ${widgetClassName}::handleGeneratedEmitter(const QString& service, const QString& member, const QVariantList& args) {`);
  lines.push(`    if (!hasEmitterListeners(service, member)) {`);
  lines.push(`        return;`);
  lines.push(`    }`);
  for (const service of spec.services) {
    for (const member of service.members) {
      if (member.kind !== "Emitter") continue;
      lines.push(`    if (service == QStringLiteral("${service.name}") && member == QStringLiteral("${member.name}")) {`);
      for (let i = 0; i < member.parameters.length; i++) {
        const p = member.parameters[i];
        const pType = cppTypes.mapTypeText(p.typeText, [service.name, member.name, p.name]);
        const paramSite = getBoundaryParameterSite(cppCodecCatalog, service.name, member.name, p.name);
        lines.push(`        const ${pType} ${p.name} = ${paramSite ? `decode${paramSite.codecId}(args.value(${i}))` : variantToCppExpression(pType, `args.value(${i})`)};`);
      }
      const argNames = member.parameters.map((p) => p.name).join(", ");
      lines.push(`        emit ${member.name}(${argNames});`);
      lines.push(`        return;`);
      lines.push(`    }`);
    }
  }
  lines.push(`}`);
  lines.push("");
  lines.push(`void ${widgetClassName}::handleGeneratedInput(const QString& service, const QString& member, const QVariant& value) {`);
  for (const service of spec.services) {
    for (const member of service.members) {
      if (member.kind !== "Input" || !member.payloadTypeText) continue;
      const cppType = cppTypes.mapTypeText(member.payloadTypeText, [service.name, member.name, "Payload"]);
      const payloadSite = getBoundaryPayloadSite(cppCodecCatalog, service.name, member.name);
      lines.push(`    if (service == QStringLiteral("${service.name}") && member == QStringLiteral("${member.name}")) {`);
      lines.push(`        const ${cppType} typedValue = ${payloadSite ? `decode${payloadSite.codecId}(value)` : variantToCppExpression(cppType, "value")};`);
      lines.push(`        set${pascalCase(member.name)}(typedValue);`);
      lines.push(`        if (m_${member.name}Handler) m_${member.name}Handler(typedValue);`);
      lines.push(`        return;`);
      lines.push(`    }`);
    }
  }
  lines.push(`}`);
  lines.push("");

  for (const service of spec.services) {
    for (const member of service.members) {
      const memberPascal = pascalCase(member.name);
      if (member.kind === "Input" && member.payloadTypeText) {
        lines.push(`void ${widgetClassName}::set${memberPascal}Handler(const ${memberPascal}Handler& handler) {`);
        lines.push(`    m_${member.name}Handler = handler;`);
        lines.push("}");
        lines.push("");
      }

      if (member.kind === "Slot") {
        const ret = member.payloadTypeText ? cppTypes.mapTypeText(member.payloadTypeText, [service.name, member.name, "Payload"]) : "void";
        const payloadSite = member.payloadTypeText ? getBoundaryPayloadSite(cppCodecCatalog, service.name, member.name) : undefined;
        const args = member.parameters.map((p) => `${cppTypes.mapTypeText(p.typeText, [service.name, member.name, p.name])} ${p.name}`).join(", ");
        lines.push(`${ret} ${widgetClassName}::slot_${member.name}(${args}) {`);
        lines.push(`    QVariantList invokeArgs;`);
        for (const p of member.parameters) {
          const pType = mapTsTypeToCpp(p.typeText);
          const paramSite = getBoundaryParameterSite(cppCodecCatalog, service.name, member.name, p.name);
          lines.push(`    invokeArgs.push_back(${paramSite ? `encode${paramSite.codecId}(${p.name})` : cppToVariantExpression(pType, p.name)});`);
        }
        lines.push(`    QVariant result;`);
        lines.push(`    QString invokeError;`);
        lines.push(`    const bool success = invokeSlot(QStringLiteral("${service.name}"), QStringLiteral("${member.name}"), invokeArgs, &result, &invokeError);`);
        lines.push(`    if (!success) {`);
        lines.push(`        if (invokeError == QStringLiteral("slot invocation timeout")) {`);
        lines.push(`            const QString timeoutMsg = QStringLiteral("[Timeout] ${service.name}.${member.name}: The webapp inside the widget did not anwser within %1 ms.").arg(slotInvocationTimeoutMs());`);
        lines.push(`            throw std::runtime_error(timeoutMsg.toStdString());`);
        lines.push(`        }`);
        lines.push(`        const QString requestFailed = QStringLiteral("[RequestFailed]: %1").arg(invokeError);`);
        lines.push(`        throw std::runtime_error(requestFailed.toStdString());`);
        lines.push(`    }`);
        if (ret === "void") {
          lines.push(`    return;`);
        } else {
          lines.push(`    return ${payloadSite ? `decode${payloadSite.codecId}(result)` : variantToCppExpression(ret, "result")};`);
        }
        lines.push("}");
        lines.push("");
      } else if ((member.kind === "Input" || member.kind === "Output") && member.payloadTypeText) {
        const cppType = cppTypes.mapTypeText(member.payloadTypeText, [service.name, member.name, "Payload"]);
        const payloadSite = getBoundaryPayloadSite(cppCodecCatalog, service.name, member.name);
        const cap = member.name.charAt(0).toUpperCase() + member.name.slice(1);
        lines.push(`${cppType} ${widgetClassName}::${member.name}() const {`);
        lines.push(`    return m_${member.name};`);
        lines.push("}");
        lines.push("");
        lines.push(`void ${widgetClassName}::set${cap}(const ${cppType}& value) {`);
        lines.push(`    if (m_${member.name} == value) return;`);
        if (member.kind === "Output") {
          lines.push(`    QVariant encodedValue;`);
          lines.push(`    try {`);
          lines.push(`        encodedValue = ${payloadSite ? `encode${payloadSite.codecId}(value)` : cppToVariantExpression(cppType, "value")};`);
          lines.push(`    } catch (const std::exception& ex) {`);
          lines.push(`        emitHostError(`);
          lines.push(`            QStringLiteral("SerializationError"),`);
          lines.push(`            QStringLiteral("bridge"),`);
          lines.push(`            QStringLiteral("error"),`);
          lines.push(`            true,`);
          lines.push(`            QStringLiteral("Failed to serialize Output ${service.name}.${member.name}."),`);
          lines.push(`            {`);
          lines.push(`                {QStringLiteral("service"), QStringLiteral("${service.name}")},`);
          lines.push(`                {QStringLiteral("member"), QStringLiteral("${member.name}")},`);
          lines.push(`                {QStringLiteral("detail"), QString::fromUtf8(ex.what())},`);
          lines.push(`            });`);
          lines.push(`        return;`);
          lines.push(`    } catch (...) {`);
          lines.push(`        emitHostError(`);
          lines.push(`            QStringLiteral("SerializationError"),`);
          lines.push(`            QStringLiteral("bridge"),`);
          lines.push(`            QStringLiteral("error"),`);
          lines.push(`            true,`);
          lines.push(`            QStringLiteral("Failed to serialize Output ${service.name}.${member.name}."),`);
          lines.push(`            {`);
          lines.push(`                {QStringLiteral("service"), QStringLiteral("${service.name}")},`);
          lines.push(`                {QStringLiteral("member"), QStringLiteral("${member.name}")},`);
          lines.push(`            });`);
          lines.push(`        return;`);
          lines.push(`    }`);
        }
        lines.push(`    m_${member.name} = value;`);
        if (member.kind === "Output") {
          lines.push(`    setOutputValue(QStringLiteral("${service.name}"), QStringLiteral("${member.name}"), encodedValue);`);
        }
        lines.push(`    emit ${member.name}Changed(value);`);
        lines.push("}");
        lines.push("");
        if (member.kind === "Output") {
          lines.push(`void ${widgetClassName}::${member.name}Slot(const ${cppType}& value) {`);
          lines.push(`    set${cap}(value);`);
          lines.push(`}`);
          lines.push("");
        }
      }
    }
  }

  lines.push(`void ${widgetClassName}::connectNotify(const QMetaMethod& signal) {`);
  lines.push(`    AnQstWebHostBase::connectNotify(signal);`);
  lines.push(`    Q_UNUSED(signal);`);
  lines.push(`}`);
  lines.push("");
  lines.push(`void ${widgetClassName}::disconnectNotify(const QMetaMethod& signal) {`);
  lines.push(`    AnQstWebHostBase::disconnectNotify(signal);`);
  lines.push(`    Q_UNUSED(signal);`);
  lines.push(`}`);
  lines.push("");
  return lines.join("\n");
}

function renderCMake(spec: ParsedSpecModel): string {
  return `cmake_minimum_required(VERSION 3.21)
project(${spec.widgetName}Library LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

if(NOT TARGET anqstwebhostbase)
    message(FATAL_ERROR "Target 'anqstwebhostbase' is required before adding generated widget library ${spec.widgetName}Widget.")
endif()

add_library(${spec.widgetName}Widget
    ${spec.widgetName}.cpp
    ${spec.widgetName}.qrc
    include/${spec.widgetName}.h
    include/${spec.widgetName}Widget.h
    include/${spec.widgetName}Types.h
)
target_include_directories(${spec.widgetName}Widget
    PUBLIC
        \${CMAKE_CURRENT_SOURCE_DIR}/include
)
target_link_libraries(${spec.widgetName}Widget
    PUBLIC
        anqstwebhostbase
)

# Uses transitive Qt and include requirements from anqstwebhostbase.
`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeSlashes(value: string): string {
  return value.split(path.sep).join("/");
}

function resolveActiveBuildStamp(): string {
  const fromEnv = process.env.ANQST_BUILD_STAMP?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  const activePath = path.resolve(__dirname, "..", "..", ".anqstgen-version-active.json");
  if (!fs.existsSync(activePath)) {
    return "";
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(activePath, "utf8")) as { active?: unknown };
    if (typeof parsed.active === "string" && parsed.active.trim().length > 0) {
      return parsed.active.trim();
    }
  } catch {
    return "";
  }
  return "";
}

function withBuildStamp(relativePath: string, content: string): string {
  const stamp = resolveActiveBuildStamp();
  if (!stamp) {
    return content;
  }
  const marker = `Built by AnQst ${stamp}`;
  const rel = normalizeSlashes(relativePath);
  const lower = rel.toLowerCase();

  if (lower.endsWith(".json")) {
    try {
      const parsed = JSON.parse(content) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const next = { "//": marker, ...(parsed as Record<string, unknown>) };
        return `${JSON.stringify(next, null, 2)}\n`;
      }
    } catch {
      // If JSON parsing fails, fall through to plain comment prefix.
    }
  }

  if (lower.endsWith(".qrc") || lower.endsWith(".xml") || lower.endsWith(".html")) {
    return `<!-- ${marker} -->\n${content}`;
  }
  if (lower.endsWith(".cmake")) {
    return `# ${marker}\n${content}`;
  }
  if (lower.endsWith(".h") || lower.endsWith(".cpp") || lower.endsWith(".ts") || lower.endsWith(".js") || lower.endsWith(".d.ts")) {
    return `// ${marker}\n${content}`;
  }
  return `# ${marker}\n${content}`;
}

function renderEmbeddedQrc(widgetName: string, embeddedWebFiles: string[]): string {
  const files = [...embeddedWebFiles].sort();
  const lines: string[] = [];
  lines.push("<RCC>");
  lines.push(`    <qresource prefix="/${widgetName.toLowerCase()}">`);
  if (files.length === 0) {
    lines.push("        <!-- anqst build will populate embedded web assets under webapp/ -->");
  }
  for (const relPath of files) {
    lines.push(`        <file alias="${escapeXml(relPath)}">webapp/${escapeXml(relPath)}</file>`);
  }
  lines.push("    </qresource>");
  lines.push("</RCC>");
  return `${lines.join("\n")}\n`;
}

function renderNpmPackage(spec: ParsedSpecModel): string {
  return JSON.stringify(
    {
      name: `${spec.widgetName.toLowerCase()}-generated`,
      version: "0.1.0",
      private: true,
      types: "types/index.d.ts",
      main: "services.js",
      exports: {
        ".": {
          types: "./types/index.d.ts",
          default: "./index.js"
        },
        "./services": {
          types: "./types/services.d.ts",
          default: "./services.js"
        },
        "./types": {
          types: "./types/types.d.ts",
          default: "./types.js"
        }
      },
      anqst: {
        widget: spec.widgetName,
        services: spec.services.map((s) => s.name),
        supportsDevelopmentModeTransport: spec.supportsDevelopmentModeTransport
      }
    },
    null,
    2
  );
}

function renderTypeDeclarations(spec: ParsedSpecModel, exported = false): string {
  const decls = collectReachableNamespaceDecls(spec)
    .map((d) => {
      const normalized = stripAnQstType(d.nodeText);
      if (!exported) return normalized;
      return normalized.replace(/^(\s*)(interface|type)\b/m, "$1export $2");
    })
    .join("\n\n");
  if (decls.trim().length === 0) return "";
  return `${decls}\n`;
}

function renderLocalTypeImports(spec: ParsedSpecModel): string {
  const localTypeNames = collectReachableNamespaceDecls(spec).map((decl) => decl.name);
  if (localTypeNames.length === 0) return "";
  return `import type { ${localTypeNames.join(", ")} } from "./types";`;
}

function slotHandlerReturnType(tsRet: string): string {
  if (tsRet === "void") {
    return "void | Promise<void> | Error";
  }
  return `${tsRet} | Promise<${tsRet}> | Error`;
}

function renderTsService(spec: ParsedSpecModel, serviceName: string, codecCatalog: BoundaryCodecCatalog): string {
  const members = spec.services.find((s) => s.name === serviceName)?.members ?? [];

  const fieldLines: string[] = [];
  const methodLines: string[] = [];
  const setMembers: string[] = [];
  const onSlotMembers: string[] = [];
  const constructorBodyLines: string[] = [];

  for (const m of members) {
    const args = m.parameters.map((p) => `${p.name}: ${mapTypeTextToTs(p.typeText)}`).join(", ");
    const paramSites = m.parameters.map((p) => getBoundaryParameterSite(codecCatalog, serviceName, m.name, p.name));
    const encodedValueArray = paramSites.length > 0
      ? `[${m.parameters.map((p, index) => `${paramSites[index] ? `encode${paramSites[index]!.codecId}(${p.name})` : p.name}`).join(", ")}]`
      : "[]";
    const payloadSite = getBoundaryPayloadSite(codecCatalog, serviceName, m.name);
    if (m.kind === "Call") {
      const ret = mapTypeTextToTs(m.payloadTypeText ?? "void");
      if (payloadSite) {
        methodLines.push(`  async ${m.name}(${args}): Promise<${ret}> { const result = await this._bridge.call<unknown>("${serviceName}", "${m.name}", ${encodedValueArray}); return decode${payloadSite.codecId}(result); }`);
      } else {
        methodLines.push(`  async ${m.name}(${args}): Promise<${ret}> { return this._bridge.call<${ret}>("${serviceName}", "${m.name}", ${encodedValueArray}); }`);
      }
      continue;
    }
    if (m.kind === "Emitter") {
      methodLines.push(`  ${m.name}(${args}): void {`);
      methodLines.push(`    let encodedArgs: unknown[];`);
      methodLines.push(`    try {`);
      methodLines.push(`      encodedArgs = ${encodedValueArray};`);
      methodLines.push(`    } catch (error) {`);
      methodLines.push(`      this._bridge.reportFrontendDiagnostic({`);
      methodLines.push(`        code: "SerializationError",`);
      methodLines.push(`        severity: "error",`);
      methodLines.push(`        category: "bridge",`);
      methodLines.push(`        recoverable: true,`);
      methodLines.push(`        message: \`Failed to serialize Emitter ${serviceName}.${m.name}: \${errorMessage(error)}\`,`);
      methodLines.push(`        service: "${serviceName}",`);
      methodLines.push(`        member: "${m.name}",`);
      methodLines.push(`        context: { interaction: "Emitter" }`);
      methodLines.push(`      });`);
      methodLines.push(`      return;`);
      methodLines.push(`    }`);
      methodLines.push(`    this._bridge.emit("${serviceName}", "${m.name}", encodedArgs);`);
      methodLines.push(`  }`);
      continue;
    }
    if (m.kind === "Slot") {
      const ret = mapTypeTextToTs(m.payloadTypeText ?? "void");
      const decodedArgs = m.parameters.map((p, index) => `${paramSites[index] ? `decode${paramSites[index]!.codecId}(wireArgs[${index}])` : `wireArgs[${index}] as ${mapTypeTextToTs(p.typeText)}`}`).join(", ");
      onSlotMembers.push(`    ${m.name}: (handler: (${args}) => ${slotHandlerReturnType(ret)}): void => {`);
      onSlotMembers.push(`      this._bridge.registerSlot("${serviceName}", "${m.name}", (...wireArgs: unknown[]) => {`);
      onSlotMembers.push(`        const result = handler(${decodedArgs});`);
      if (payloadSite) {
        onSlotMembers.push(`        if (result instanceof Promise) return result.then((value) => value instanceof Error ? value : encode${payloadSite.codecId}(value));`);
        onSlotMembers.push(`        return result instanceof Error ? result : encode${payloadSite.codecId}(result);`);
      } else {
        onSlotMembers.push("        return result;");
      }
      onSlotMembers.push("      });");
      onSlotMembers.push("    },");
      continue;
    }
    if ((m.kind === "Input" || m.kind === "Output") && m.payloadTypeText) {
      const tsType = mapTypeTextToTs(m.payloadTypeText);
      fieldLines.push(`  private readonly _${m.name} = signal<${tsType} | undefined>(undefined);`);
      methodLines.push(`  ${m.name}(): ${tsType} | undefined { return this._${m.name}(); }`);
      if (m.kind === "Input") {
        setMembers.push(`    ${m.name}: (value: ${tsType}): void => {`);
        setMembers.push(`      let encodedValue: unknown;`);
        setMembers.push(`      try {`);
        setMembers.push(`        encodedValue = ${payloadSite ? `encode${payloadSite.codecId}(value)` : "value"};`);
        setMembers.push(`      } catch (error) {`);
        setMembers.push(`        this._bridge.reportFrontendDiagnostic({`);
        setMembers.push(`          code: "SerializationError",`);
        setMembers.push(`          severity: "error",`);
        setMembers.push(`          category: "bridge",`);
        setMembers.push(`          recoverable: true,`);
        setMembers.push(`          message: \`Failed to serialize Input ${serviceName}.${m.name}: \${errorMessage(error)}\`,`);
        setMembers.push(`          service: "${serviceName}",`);
        setMembers.push(`          member: "${m.name}",`);
        setMembers.push(`          context: { interaction: "Input" }`);
        setMembers.push(`        });`);
        setMembers.push(`        return;`);
        setMembers.push(`      }`);
        setMembers.push(`      this._${m.name}.set(value);`);
        setMembers.push(`      this._bridge.setInput("${serviceName}", "${m.name}", encodedValue);`);
        setMembers.push("    },");
      }
      if (m.kind === "Output") {
        constructorBodyLines.push(`    this._bridge.onOutput("${serviceName}", "${m.name}", (value) => {`);
        constructorBodyLines.push(`      try {`);
        constructorBodyLines.push(`        this._${m.name}.set(${payloadSite ? `decode${payloadSite.codecId}(value)` : `value as ${tsType}`});`);
        constructorBodyLines.push(`      } catch (error) {`);
        constructorBodyLines.push(`        this._bridge.reportFrontendDiagnostic({`);
        constructorBodyLines.push(`          code: "DeserializationError",`);
        constructorBodyLines.push(`          severity: "error",`);
        constructorBodyLines.push(`          category: "bridge",`);
        constructorBodyLines.push(`          recoverable: true,`);
        constructorBodyLines.push(`          message: \`Failed to deserialize Output ${serviceName}.${m.name}: \${errorMessage(error)}\`,`);
        constructorBodyLines.push(`          service: "${serviceName}",`);
        constructorBodyLines.push(`          member: "${m.name}",`);
        constructorBodyLines.push(`          context: { interaction: "Output" }`);
        constructorBodyLines.push(`        });`);
        constructorBodyLines.push(`      }`);
        constructorBodyLines.push(`    });`);
      }
    }
    if (m.kind === "DropTarget" && m.payloadTypeText) {
      const tsType = mapTypeTextToTs(m.payloadTypeText);
      fieldLines.push(`  private readonly _${m.name} = signal<{ payload: ${tsType}; x: number; y: number } | null>(null);`);
      methodLines.push(`  ${m.name}(): { payload: ${tsType}; x: number; y: number } | null { return this._${m.name}(); }`);
      constructorBodyLines.push(`    this._bridge.onDrop("${serviceName}", "${m.name}", (payload, x, y) => {`);
      constructorBodyLines.push(`      try {`);
      constructorBodyLines.push(`        this._${m.name}.set({ payload: ${payloadSite ? `decode${payloadSite.codecId}(payload)` : `payload as ${tsType}`}, x, y });`);
      constructorBodyLines.push(`      } catch (error) {`);
      constructorBodyLines.push(`        this._bridge.reportFrontendDiagnostic({`);
      constructorBodyLines.push(`          code: "DeserializationError",`);
      constructorBodyLines.push(`          severity: "error",`);
      constructorBodyLines.push(`          category: "bridge",`);
      constructorBodyLines.push(`          recoverable: true,`);
      constructorBodyLines.push(`          message: \`Failed to deserialize DropTarget ${serviceName}.${m.name}: \${errorMessage(error)}\`,`);
      constructorBodyLines.push(`          service: "${serviceName}",`);
      constructorBodyLines.push(`          member: "${m.name}",`);
      constructorBodyLines.push(`          context: { interaction: "DropTarget" }`);
      constructorBodyLines.push(`        });`);
      constructorBodyLines.push(`      }`);
      constructorBodyLines.push(`    });`);
    }
    if (m.kind === "HoverTarget" && m.payloadTypeText) {
      const tsType = mapTypeTextToTs(m.payloadTypeText);
      fieldLines.push(`  private readonly _${m.name} = signal<{ payload: ${tsType}; x: number; y: number } | null>(null);`);
      methodLines.push(`  ${m.name}(): { payload: ${tsType}; x: number; y: number } | null { return this._${m.name}(); }`);
      constructorBodyLines.push(`    this._bridge.onHover("${serviceName}", "${m.name}", (payload, x, y) => {`);
      constructorBodyLines.push(`      try {`);
      constructorBodyLines.push(`        this._${m.name}.set({ payload: ${payloadSite ? `decode${payloadSite.codecId}(payload)` : `payload as ${tsType}`}, x, y });`);
      constructorBodyLines.push(`      } catch (error) {`);
      constructorBodyLines.push(`        this._bridge.reportFrontendDiagnostic({`);
      constructorBodyLines.push(`          code: "DeserializationError",`);
      constructorBodyLines.push(`          severity: "error",`);
      constructorBodyLines.push(`          category: "bridge",`);
      constructorBodyLines.push(`          recoverable: true,`);
      constructorBodyLines.push(`          message: \`Failed to deserialize HoverTarget ${serviceName}.${m.name}: \${errorMessage(error)}\`,`);
      constructorBodyLines.push(`          service: "${serviceName}",`);
      constructorBodyLines.push(`          member: "${m.name}",`);
      constructorBodyLines.push(`          context: { interaction: "HoverTarget" }`);
      constructorBodyLines.push(`        });`);
      constructorBodyLines.push(`      }`);
      constructorBodyLines.push(`    });`);
      constructorBodyLines.push(`    this._bridge.onHoverLeft("${serviceName}", "${m.name}", () => this._${m.name}.set(null));`);
    }
  }

  const constructorLines = [
    "  constructor() {",
    ...constructorBodyLines,
    "  }",
  ];

  return `@Injectable({ providedIn: "root" })
export class ${serviceName} {
  private readonly _bridge = inject(AnQstBridgeRuntime);
${fieldLines.join("\n")}
${constructorLines.join("\n")}
  readonly set = {
${setMembers.join("\n")}
  };
  readonly onSlot = {
${onSlotMembers.join("\n")}
  };
${methodLines.join("\n")}
}
`;
}

function renderTsServiceDts(spec: ParsedSpecModel, serviceName: string): string {
  const members = spec.services.find((s) => s.name === serviceName)?.members ?? [];
  const setMembers: string[] = [];
  const onSlotMembers: string[] = [];
  const classMembers: string[] = [];
  const setInterfaceName = `${serviceName}Set`;
  const onSlotInterfaceName = `${serviceName}OnSlot`;

  for (const m of members) {
    const args = m.parameters.map((p) => `${p.name}: ${mapTypeTextToTs(p.typeText)}`).join(", ");
    if (m.kind === "Call") {
      const ret = mapTypeTextToTs(m.payloadTypeText ?? "void");
      classMembers.push(`  ${m.name}(${args}): Promise<${ret}>;`);
      continue;
    }
    if (m.kind === "Emitter") {
      classMembers.push(`  ${m.name}(${args}): void;`);
      continue;
    }
    if (m.kind === "Slot") {
      const ret = mapTypeTextToTs(m.payloadTypeText ?? "void");
      onSlotMembers.push(`  ${m.name}(handler: (${args}) => ${slotHandlerReturnType(ret)}): void;`);
      continue;
    }
    if ((m.kind === "Input" || m.kind === "Output") && m.payloadTypeText) {
      const tsType = mapTypeTextToTs(m.payloadTypeText);
      classMembers.push(`  ${m.name}(): ${tsType} | undefined;`);
      if (m.kind === "Input") {
        setMembers.push(`  ${m.name}(value: ${tsType}): void;`);
      }
    }
    if (m.kind === "DropTarget" && m.payloadTypeText) {
      const tsType = mapTypeTextToTs(m.payloadTypeText);
      classMembers.push(`  ${m.name}(): { payload: ${tsType}; x: number; y: number } | null;`);
    }
    if (m.kind === "HoverTarget" && m.payloadTypeText) {
      const tsType = mapTypeTextToTs(m.payloadTypeText);
      classMembers.push(`  ${m.name}(): { payload: ${tsType}; x: number; y: number } | null;`);
    }
  }

  const setInterfaceDecl = setMembers.length > 0
    ? `export interface ${setInterfaceName} {\n${setMembers.join("\n")}\n}`
    : `export interface ${setInterfaceName} {}`;
  const onSlotInterfaceDecl = onSlotMembers.length > 0
    ? `export interface ${onSlotInterfaceName} {\n${onSlotMembers.join("\n")}\n}`
    : `export interface ${onSlotInterfaceName} {}`;
  const classMemberBlock = classMembers.length > 0 ? `\n${classMembers.join("\n")}` : "";
  return `${setInterfaceDecl}

${onSlotInterfaceDecl}

export declare class ${serviceName} {
  readonly set: ${setInterfaceName};
  readonly onSlot: ${onSlotInterfaceName};${classMemberBlock}
}`;
}

function renderTsServices(spec: ParsedSpecModel, codecCatalog: BoundaryCodecCatalog): string {
  const serviceClasses = spec.services.map((s) => renderTsService(spec, s.name, codecCatalog)).join("\n");
  const externalTypeImports = renderRequiredTypeImports(
    spec,
    `frontend/${generatedFrontendDirName(spec.widgetName)}/services.ts`
  ).trim();
  const localTypeImports = renderLocalTypeImports(spec).trim();
  const typeImports = [externalTypeImports, localTypeImports].filter((s) => s.length > 0).join("\n");
  const typeImportsBlock = typeImports.length > 0 ? `${typeImports}\n\n` : "";
  return `import { Injectable, inject, signal } from "@angular/core";
${typeImportsBlock}

// Boundary codec plan helpers
${renderTsBoundaryCodecHelpers(codecCatalog)}

type SlotHandler = (...args: unknown[]) => unknown;
type OutputHandler = (value: unknown) => void;
type SlotInvocationListener = (requestId: string, service: string, member: string, args: unknown[]) => void;
type OutputListener = (service: string, member: string, value: unknown) => void;
type DropListener = (service: string, member: string, payload: unknown, x: number, y: number) => void;
type HoverListener = (service: string, member: string, payload: unknown, x: number, y: number) => void;
type HoverLeftListener = (service: string, member: string) => void;
type HostDiagnosticListener = (payload: unknown) => void;
type DisconnectListener = () => void;

export type AnQstBridgeSeverity = "info" | "warn" | "error" | "fatal";
export type AnQstBridgeSource = "frontend" | "host";
export type AnQstBridgeTransport = "qt-webchannel" | "dev-websocket";
export type AnQstBridgeState = "starting" | "ready" | "failed" | "disconnected";

export interface AnQstBridgeDiagnostic {
  code: string;
  severity: AnQstBridgeSeverity;
  category: string;
  recoverable: boolean;
  message: string;
  timestamp: string;
  source: AnQstBridgeSource;
  transport?: AnQstBridgeTransport;
  service?: string;
  member?: string;
  requestId?: string;
  context?: Record<string, unknown>;
}

interface HostBridgeApi {
  anQstBridge_call(service: string, member: string, args: unknown[], callback: (result: unknown) => void): void;
  anQstBridge_emit(service: string, member: string, args: unknown[]): void;
  anQstBridge_setInput(service: string, member: string, value: unknown): void;
  anQstBridge_registerSlot(service: string, member: string): void;
  anQstBridge_resolveSlot(requestId: string, ok: boolean, payload: unknown, error: string): void;
  anQstBridge_outputUpdated: { connect: (cb: (service: string, member: string, value: unknown) => void) => void };
  anQstBridge_slotInvocationRequested: {
    connect: (cb: (requestId: string, service: string, member: string, args: unknown[]) => void) => void;
  };
  anQstBridge_hostDiagnostic?: { connect: (cb: (payload: unknown) => void) => void };
  anQstBridge_dropReceived: { connect: (cb: (service: string, member: string, payload: unknown, x: number, y: number) => void) => void };
  anQstBridge_hoverUpdated: { connect: (cb: (service: string, member: string, payload: unknown, x: number, y: number) => void) => void };
  anQstBridge_hoverLeft: { connect: (cb: (service: string, member: string) => void) => void };
}

interface QWebChannelCtor {
  new (
    transport: unknown,
    initCallback: (channel: { objects: Record<string, HostBridgeApi | undefined> }) => void
  ): unknown;
}

interface BridgeAdapter {
  readonly transport: AnQstBridgeTransport;
  call<T>(service: string, member: string, args: unknown[]): Promise<T>;
  emit(service: string, member: string, args: unknown[]): void;
  setInput(service: string, member: string, value: unknown): void;
  registerSlot(service: string, member: string): void;
  resolveSlot(requestId: string, ok: boolean, payload: unknown, error: string): void;
  onOutput(handler: OutputListener): void;
  onSlotInvocation(handler: SlotInvocationListener): void;
  onHostDiagnostic(handler: HostDiagnosticListener): void;
  onDisconnected(handler: DisconnectListener): void;
  onDrop(handler: DropListener): void;
  onHover(handler: HoverListener): void;
  onHoverLeft(handler: HoverLeftListener): void;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string" && error.message.length > 0) {
    return error.message;
  }
  return String(error);
}

function normalizeSeverity(value: unknown): AnQstBridgeSeverity {
  if (value === "info" || value === "warn" || value === "error" || value === "fatal") {
    return value;
  }
  return "error";
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readBoolean(record: Record<string, unknown> | undefined, key: string): boolean | undefined {
  const value = record?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function readContext(record: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const context = asRecord(record?.["context"]);
  return context === undefined ? undefined : context;
}

function normalizeHostDiagnostic(
  payload: unknown,
  transport: AnQstBridgeTransport
): Omit<AnQstBridgeDiagnostic, "timestamp"> {
  const row = asRecord(payload);
  if (row === undefined) {
    return {
      code: "HostDiagnosticMalformed",
      severity: "error",
      category: "bridge",
      recoverable: true,
      message: "Host emitted a malformed diagnostic payload.",
      source: "host",
      transport
    };
  }

  const context = readContext(row);
  return {
    code: readString(row, "code") ?? "HostDiagnostic",
    severity: normalizeSeverity(row["severity"]),
    category: readString(row, "category") ?? "bridge",
    recoverable: readBoolean(row, "recoverable") ?? true,
    message: readString(row, "message") ?? "Host emitted a diagnostic payload.",
    source: "host",
    transport,
    service: readString(row, "service") ?? readString(context, "service"),
    member: readString(row, "member") ?? readString(context, "member"),
    requestId: readString(row, "requestId") ?? readString(context, "requestId"),
    context
  };
}

function isBridgeCallError(value: unknown): value is {
  code: unknown;
  message: unknown;
  service: unknown;
  member: unknown;
  requestId: unknown;
} {
  if (value === null || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    Object.prototype.hasOwnProperty.call(row, "code")
    && Object.prototype.hasOwnProperty.call(row, "message")
    && Object.prototype.hasOwnProperty.call(row, "service")
    && Object.prototype.hasOwnProperty.call(row, "member")
    && Object.prototype.hasOwnProperty.call(row, "requestId")
  );
}

class QtWebChannelAdapter implements BridgeAdapter {
  readonly transport = "qt-webchannel" as const;

  private constructor(private readonly host: HostBridgeApi) {}

  static async create(): Promise<QtWebChannelAdapter> {
    const anyWindow = window as unknown as {
      qt?: { webChannelTransport?: unknown };
      QWebChannel?: QWebChannelCtor;
    };
    if (typeof anyWindow.QWebChannel !== "function" || anyWindow.qt?.webChannelTransport === undefined) {
      throw new Error("Qt WebChannel transport is unavailable.");
    }
    return await new Promise<QtWebChannelAdapter>((resolve, reject) => {
      try {
        const QWebChannel = anyWindow.QWebChannel as QWebChannelCtor;
        new QWebChannel(anyWindow.qt!.webChannelTransport, (channel) => {
          try {
            const host = channel.objects["${spec.widgetName}Bridge"];
            if (host === undefined) {
              reject(new Error("${spec.widgetName}Bridge bridge object is unavailable."));
              return;
            }
            resolve(new QtWebChannelAdapter(host));
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  async call<T>(service: string, member: string, args: unknown[]): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.host.anQstBridge_call(service, member, args, (result) => {
        if (isBridgeCallError(result)) {
          reject(result);
          return;
        }
        resolve(result as T);
      });
    });
  }

  emit(service: string, member: string, args: unknown[]): void {
    this.host.anQstBridge_emit(service, member, args);
  }

  setInput(service: string, member: string, value: unknown): void {
    this.host.anQstBridge_setInput(service, member, value);
  }

  registerSlot(service: string, member: string): void {
    this.host.anQstBridge_registerSlot(service, member);
  }

  resolveSlot(requestId: string, ok: boolean, payload: unknown, error: string): void {
    this.host.anQstBridge_resolveSlot(requestId, ok, payload, error);
  }

  onOutput(handler: OutputListener): void {
    this.host.anQstBridge_outputUpdated.connect(handler);
  }

  onSlotInvocation(handler: SlotInvocationListener): void {
    this.host.anQstBridge_slotInvocationRequested.connect(handler);
  }

  onHostDiagnostic(handler: HostDiagnosticListener): void {
    this.host.anQstBridge_hostDiagnostic?.connect(handler);
  }

  onDisconnected(_handler: DisconnectListener): void {
    // QWebChannel does not expose a deterministic disconnect event here.
  }

  onDrop(handler: DropListener): void {
    this.host.anQstBridge_dropReceived.connect(handler);
  }

  onHover(handler: HoverListener): void {
    this.host.anQstBridge_hoverUpdated.connect(handler);
  }

  onHoverLeft(handler: HoverLeftListener): void {
    this.host.anQstBridge_hoverLeft.connect(handler);
  }
}

class WebSocketBridgeAdapter implements BridgeAdapter {
  readonly transport = "dev-websocket" as const;
  private readonly pending = new Map<string, {
    service: string;
    member: string;
    requestId: string;
    resolve: (result: unknown) => void;
    reject: (error: unknown) => void;
  }>();
  private readonly outputListeners: OutputListener[] = [];
  private readonly slotListeners: SlotInvocationListener[] = [];
  private readonly hostDiagnosticListeners: HostDiagnosticListener[] = [];
  private readonly disconnectListeners: DisconnectListener[] = [];
  private readonly dropListeners: DropListener[] = [];
  private readonly hoverListeners: HoverListener[] = [];
  private readonly hoverLeftListeners: HoverLeftListener[] = [];
  private requestCounter = 0;

  private constructor(private readonly socket: WebSocket) {
    this.socket.addEventListener("message", (event) => {
      const raw = typeof event.data === "string" ? event.data : String(event.data);
      const message = JSON.parse(raw) as Record<string, unknown>;
      const type = String(message["type"] ?? "");
      if (type === "callResult") {
        const requestId = String(message["requestId"] ?? "");
        const pending = this.pending.get(requestId);
        if (pending) {
          this.pending.delete(requestId);
          const result = message["result"];
          if (isBridgeCallError(result)) {
            pending.reject(result);
            return;
          }
          pending.resolve(result);
        }
        return;
      }
      if (type === "outputUpdated") {
        const service = String(message["service"] ?? "");
        const member = String(message["member"] ?? "");
        for (const listener of this.outputListeners) {
          listener(service, member, message["value"]);
        }
        return;
      }
      if (type === "slotInvocationRequested") {
        const requestId = String(message["requestId"] ?? "");
        const service = String(message["service"] ?? "");
        const member = String(message["member"] ?? "");
        const args = Array.isArray(message["args"]) ? (message["args"] as unknown[]) : [];
        for (const listener of this.slotListeners) {
          listener(requestId, service, member, args);
        }
        return;
      }
      if (type === "dropReceived") {
        const service = String(message["service"] ?? "");
        const member = String(message["member"] ?? "");
        const x = Number(message["x"] ?? 0);
        const y = Number(message["y"] ?? 0);
        for (const listener of this.dropListeners) {
          listener(service, member, message["payload"], x, y);
        }
        return;
      }
      if (type === "hoverUpdated") {
        const service = String(message["service"] ?? "");
        const member = String(message["member"] ?? "");
        const x = Number(message["x"] ?? 0);
        const y = Number(message["y"] ?? 0);
        for (const listener of this.hoverListeners) {
          listener(service, member, message["payload"], x, y);
        }
        return;
      }
      if (type === "hoverLeft") {
        const service = String(message["service"] ?? "");
        const member = String(message["member"] ?? "");
        for (const listener of this.hoverLeftListeners) {
          listener(service, member);
        }
        return;
      }
      if (type === "hostError") {
        for (const listener of this.hostDiagnosticListeners) {
          listener(message["payload"]);
        }
        return;
      }
      if (type === "widgetReattached") {
        document.body.textContent = "Widget Reattached";
        this.socket.close();
      }
    });
    this.socket.addEventListener("close", () => {
      for (const pending of this.pending.values()) {
        pending.reject({
          code: "BridgeDisconnectedError",
          message: "Bridge disconnected before call completion.",
          service: pending.service,
          member: pending.member,
          requestId: pending.requestId
        });
      }
      this.pending.clear();
      for (const listener of this.disconnectListeners) {
        listener();
      }
    });
  }

  static async create(): Promise<WebSocketBridgeAdapter> {
    const configResponse = await fetch("/anqst-dev-config.json", { cache: "no-store" });
    if (!configResponse.ok) {
      throw new Error("AnQst host bootstrap missing: unable to read /anqst-dev-config.json");
    }
    const config = (await configResponse.json()) as { wsUrl?: string; wsPath?: string };
    let wsUrl = config.wsUrl;
    if (!wsUrl && config.wsPath) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = protocol + "//" + window.location.host + config.wsPath;
    }
    if (!wsUrl) {
      throw new Error("AnQst host bootstrap missing: wsUrl/wsPath is unavailable.");
    }
    if (wsUrl.startsWith("http://")) {
      wsUrl = "ws://" + wsUrl.slice("http://".length);
    } else if (wsUrl.startsWith("https://")) {
      wsUrl = "wss://" + wsUrl.slice("https://".length);
    }
    return await new Promise<WebSocketBridgeAdapter>((resolve, reject) => {
      const socket = new WebSocket(wsUrl!);
      socket.addEventListener("open", () => resolve(new WebSocketBridgeAdapter(socket)));
      socket.addEventListener("error", () => reject(new Error("Failed to connect to AnQst WebSocket bridge.")));
    });
  }

  async call<T>(service: string, member: string, args: unknown[]): Promise<T> {
    const requestId = \`req-\${++this.requestCounter}\`;
    const payload = { type: "call", requestId, service, member, args };
    return await new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, {
        service,
        member,
        requestId,
        resolve: (value) => resolve(value as T),
        reject
      });
      this.socket.send(JSON.stringify(payload));
    });
  }

  emit(service: string, member: string, args: unknown[]): void {
    this.socket.send(JSON.stringify({ type: "emit", service, member, args }));
  }

  setInput(service: string, member: string, value: unknown): void {
    this.socket.send(JSON.stringify({ type: "setInput", service, member, value }));
  }

  registerSlot(service: string, member: string): void {
    this.socket.send(JSON.stringify({ type: "registerSlot", service, member }));
  }

  resolveSlot(requestId: string, ok: boolean, payload: unknown, error: string): void {
    this.socket.send(JSON.stringify({ type: "resolveSlot", requestId, ok, payload, error }));
  }

  onOutput(handler: OutputListener): void {
    this.outputListeners.push(handler);
  }

  onSlotInvocation(handler: SlotInvocationListener): void {
    this.slotListeners.push(handler);
  }

  onHostDiagnostic(handler: HostDiagnosticListener): void {
    this.hostDiagnosticListeners.push(handler);
  }

  onDisconnected(handler: DisconnectListener): void {
    this.disconnectListeners.push(handler);
  }

  onDrop(handler: DropListener): void {
    this.dropListeners.push(handler);
  }

  onHover(handler: HoverListener): void {
    this.hoverListeners.push(handler);
  }

  onHoverLeft(handler: HoverLeftListener): void {
    this.hoverLeftListeners.push(handler);
  }
}

@Injectable({ providedIn: "root" })
class AnQstBridgeRuntime {
  private static readonly maxDiagnostics = 50;
  private adapter: BridgeAdapter | null = null;
  private readonly slotHandlers = new Map<string, SlotHandler>();
  private readonly outputHandlers = new Map<string, OutputHandler[]>();
  private readonly dropHandlers = new Map<string, ((payload: unknown, x: number, y: number) => void)[]>();
  private readonly hoverHandlers = new Map<string, ((payload: unknown, x: number, y: number) => void)[]>();
  private readonly hoverLeftHandlers = new Map<string, (() => void)[]>();
  private readonly diagnosticListeners = new Set<(diagnostic: AnQstBridgeDiagnostic) => void>();
  private readonly _diagnostics = signal<readonly AnQstBridgeDiagnostic[]>([]);
  private readonly _state = signal<AnQstBridgeState>("starting");
  private readonly startup = this.init().catch((error) => {
    this._state.set("failed");
    this.reportFrontendDiagnostic({
      code: "BridgeBootstrapError",
      severity: "fatal",
      category: "bridge",
      recoverable: false,
      message: \`Failed to initialize bridge: \${errorMessage(error)}\`
    });
    throw error;
  });

  diagnostics(): readonly AnQstBridgeDiagnostic[] {
    return this._diagnostics();
  }

  state(): AnQstBridgeState {
    return this._state();
  }

  subscribeDiagnostics(listener: (diagnostic: AnQstBridgeDiagnostic) => void): () => void {
    this.diagnosticListeners.add(listener);
    return () => this.diagnosticListeners.delete(listener);
  }

  async ready(): Promise<void> {
    return this.startup;
  }

  reportFrontendDiagnostic(diagnostic: Omit<AnQstBridgeDiagnostic, "timestamp" | "source">): void {
    this.pushDiagnostic({
      ...diagnostic,
      source: "frontend",
      transport: diagnostic.transport ?? this.adapter?.transport,
      timestamp: new Date().toISOString()
    });
  }

  async call<T>(service: string, member: string, args: unknown[]): Promise<T> {
    const adapter = await this.requireAdapter();
    return adapter.call<T>(service, member, args);
  }

  emit(service: string, member: string, args: unknown[]): void {
    this.publishNonCall("Emitter", service, member, (adapter) => adapter.emit(service, member, args));
  }

  setInput(service: string, member: string, value: unknown): void {
    this.publishNonCall("Input", service, member, (adapter) => adapter.setInput(service, member, value));
  }

  registerSlot(service: string, member: string, handler: SlotHandler): void {
    const key = this.key(service, member);
    this.slotHandlers.set(key, handler);
    if (this.adapter !== null) {
      try {
        this.adapter.registerSlot(service, member);
      } catch (error) {
        this.reportFrontendDiagnostic({
          code: "BridgePublishError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message: \`Failed to register Slot \${service}.\${member}: \${errorMessage(error)}\`,
          service,
          member,
          context: { interaction: "Slot" }
        });
      }
      return;
    }
    this.ready()
      .then(() => {
        try {
          this.requireAdapterSync().registerSlot(service, member);
        } catch (error) {
          this.reportFrontendDiagnostic({
            code: "BridgePublishError",
            severity: "error",
            category: "bridge",
            recoverable: true,
            message: \`Failed to register Slot \${service}.\${member}: \${errorMessage(error)}\`,
            service,
            member,
            context: { interaction: "Slot" }
          });
        }
      })
      .catch((error) => {
        this.reportFrontendDiagnostic({
          code: "BridgePublishError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message: \`Failed to register Slot \${service}.\${member}: \${errorMessage(error)}\`,
          service,
          member,
          context: { interaction: "Slot" }
        });
      });
  }

  onOutput(service: string, member: string, handler: OutputHandler): void {
    const key = this.key(service, member);
    const existing = this.outputHandlers.get(key) ?? [];
    existing.push(handler);
    this.outputHandlers.set(key, existing);
  }

  onDrop(service: string, member: string, handler: (payload: unknown, x: number, y: number) => void): void {
    const key = this.key(service, member);
    const existing = this.dropHandlers.get(key) ?? [];
    existing.push(handler);
    this.dropHandlers.set(key, existing);
  }

  onHover(service: string, member: string, handler: (payload: unknown, x: number, y: number) => void): void {
    const key = this.key(service, member);
    const existing = this.hoverHandlers.get(key) ?? [];
    existing.push(handler);
    this.hoverHandlers.set(key, existing);
  }

  onHoverLeft(service: string, member: string, handler: () => void): void {
    const key = this.key(service, member);
    const existing = this.hoverLeftHandlers.get(key) ?? [];
    existing.push(handler);
    this.hoverLeftHandlers.set(key, existing);
  }

  private requireAdapterSync(): BridgeAdapter {
    if (this.adapter === null) {
      throw new Error("AnQst bridge is not ready.");
    }
    return this.adapter;
  }

  private async requireAdapter(): Promise<BridgeAdapter> {
    await this.startup;
    return this.requireAdapterSync();
  }

  private pushDiagnostic(diagnostic: AnQstBridgeDiagnostic): void {
    const previous = this._diagnostics();
    const trimmed = previous.length >= AnQstBridgeRuntime.maxDiagnostics
      ? previous.slice(previous.length - (AnQstBridgeRuntime.maxDiagnostics - 1))
      : previous;
    const next = [...trimmed, diagnostic];
    this._diagnostics.set(next);
    for (const listener of this.diagnosticListeners) {
      listener(diagnostic);
    }
  }

  private publishNonCall(
    interaction: "Emitter" | "Input",
    service: string,
    member: string,
    publish: (adapter: BridgeAdapter) => void
  ): void {
    if (this.adapter !== null) {
      try {
        publish(this.adapter);
      } catch (error) {
        this.reportFrontendDiagnostic({
          code: "BridgePublishError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message: \`Failed to publish \${interaction} \${service}.\${member}: \${errorMessage(error)}\`,
          service,
          member,
          context: { interaction }
        });
      }
      return;
    }

    this.ready()
      .then(() => {
        try {
          publish(this.requireAdapterSync());
        } catch (error) {
          this.reportFrontendDiagnostic({
            code: "BridgePublishError",
            severity: "error",
            category: "bridge",
            recoverable: true,
            message: \`Failed to publish \${interaction} \${service}.\${member}: \${errorMessage(error)}\`,
            service,
            member,
            context: { interaction }
          });
        }
      })
      .catch((error) => {
        this.reportFrontendDiagnostic({
          code: "BridgePublishError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message: \`Failed to publish \${interaction} \${service}.\${member}: \${errorMessage(error)}\`,
          service,
          member,
          context: { interaction }
        });
      });
  }

  private async init(): Promise<void> {
    const anyWindow = window as unknown as { qt?: { webChannelTransport?: unknown }; QWebChannel?: QWebChannelCtor };
    if (typeof anyWindow.QWebChannel === "function" && anyWindow.qt?.webChannelTransport !== undefined) {
      this.adapter = await QtWebChannelAdapter.create();
    } else {
      this.adapter = await WebSocketBridgeAdapter.create();
    }

    const adapter = this.adapter;
    adapter.onHostDiagnostic((payload) => {
      this.pushDiagnostic({
        ...normalizeHostDiagnostic(payload, adapter.transport),
        timestamp: new Date().toISOString()
      });
    });
    adapter.onDisconnected(() => {
      this._state.set("disconnected");
      this.reportFrontendDiagnostic({
        code: "BridgeDisconnectedError",
        severity: "error",
        category: "bridge",
        recoverable: true,
        message: "Bridge disconnected.",
        transport: adapter.transport
      });
    });

    adapter.onOutput((service, member, value) => {
      const key = this.key(service, member);
      for (const outputHandler of this.outputHandlers.get(key) ?? []) {
        outputHandler(value);
      }
    });
    adapter.onSlotInvocation(async (requestId, service, member, args) => {
      const key = this.key(service, member);
      const handler = this.slotHandlers.get(key);
      if (handler === undefined) {
        this.reportFrontendDiagnostic({
          code: "HandlerNotRegisteredError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message: \`No slot handler registered for \${service}.\${member}.\`,
          service,
          member,
          requestId,
          context: { interaction: "Slot" }
        });
        adapter.resolveSlot(requestId, false, undefined, "No slot handler registered.");
        return;
      }
      try {
        const result = await Promise.resolve(handler(...args));
        if (result instanceof Error) {
          this.reportFrontendDiagnostic({
            code: "SlotRequestFailed",
            severity: "error",
            category: "bridge",
            recoverable: true,
            message: result.message.length > 0
              ? result.message
              : \`Slot \${service}.\${member} returned an Error.\`,
            service,
            member,
            requestId,
            context: { interaction: "Slot" }
          });
          adapter.resolveSlot(requestId, false, undefined, result.message);
          return;
        }
        adapter.resolveSlot(requestId, true, result, "");
      } catch (error) {
        const message = errorMessage(error);
        this.reportFrontendDiagnostic({
          code: "SlotHandlerError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message: \`Slot handler \${service}.\${member} threw: \${message}\`,
          service,
          member,
          requestId,
          context: { interaction: "Slot" }
        });
        adapter.resolveSlot(requestId, false, undefined, message);
      }
    });
    adapter.onDrop((service, member, payload, x, y) => {
      const key = this.key(service, member);
      for (const handler of this.dropHandlers.get(key) ?? []) {
        handler(payload, x, y);
      }
    });
    adapter.onHover((service, member, payload, x, y) => {
      const key = this.key(service, member);
      for (const handler of this.hoverHandlers.get(key) ?? []) {
        handler(payload, x, y);
      }
    });
    adapter.onHoverLeft((service, member) => {
      const key = this.key(service, member);
      for (const handler of this.hoverLeftHandlers.get(key) ?? []) {
        handler();
      }
    });
    for (const key of this.slotHandlers.keys()) {
      const parts = key.split("::");
      if (parts.length === 2) {
        adapter.registerSlot(parts[0], parts[1]);
      }
    }
    this._state.set("ready");
  }

  private key(service: string, member: string): string {
    return \`\${service}::\${member}\`;
  }

}

@Injectable({ providedIn: "root" })
export class AnQstBridgeDiagnostics {
  private readonly _bridge = inject(AnQstBridgeRuntime);

  diagnostics(): readonly AnQstBridgeDiagnostic[] {
    return this._bridge.diagnostics();
  }

  state(): AnQstBridgeState {
    return this._bridge.state();
  }

  subscribe(listener: (diagnostic: AnQstBridgeDiagnostic) => void): () => void {
    return this._bridge.subscribeDiagnostics(listener);
  }
}
${serviceClasses}
`;
}

function renderTsTypes(spec: ParsedSpecModel): string {
  const typeImports = renderRequiredTypeImports(
    spec,
    `frontend/${generatedFrontendDirName(spec.widgetName)}/types.ts`
  ).trim();
  const typeDecls = renderTypeDeclarations(spec, true).trim();
  const sections = [typeImports, typeDecls].filter((s) => s.length > 0);
  return sections.length > 0 ? `${sections.join("\n\n")}\n` : "";
}

function renderTypeServicesDts(spec: ParsedSpecModel): string {
  const externalTypeImports = renderRequiredTypeImports(
    spec,
    `frontend/${generatedFrontendDirName(spec.widgetName)}/types/services.d.ts`
  ).trim();
  const localTypeImports = renderLocalTypeImports(spec).trim();
  const bridgeDiagnosticsDecl = `export type AnQstBridgeSeverity = "info" | "warn" | "error" | "fatal";

export type AnQstBridgeSource = "frontend" | "host";

export type AnQstBridgeTransport = "qt-webchannel" | "dev-websocket";

export type AnQstBridgeState = "starting" | "ready" | "failed" | "disconnected";

export interface AnQstBridgeDiagnostic {
  code: string;
  severity: AnQstBridgeSeverity;
  category: string;
  recoverable: boolean;
  message: string;
  timestamp: string;
  source: AnQstBridgeSource;
  transport?: AnQstBridgeTransport;
  service?: string;
  member?: string;
  requestId?: string;
  context?: Record<string, unknown>;
}

export declare class AnQstBridgeDiagnostics {
  diagnostics(): readonly AnQstBridgeDiagnostic[];
  state(): AnQstBridgeState;
  subscribe(listener: (diagnostic: AnQstBridgeDiagnostic) => void): () => void;
}`;
  const serviceDecls = spec.services
    .map((s) => renderTsServiceDts(spec, s.name))
    .join("\n\n");
  const sections = [externalTypeImports, localTypeImports, bridgeDiagnosticsDecl, serviceDecls.trim()].filter((s) => s.length > 0);
  return sections.length > 0 ? `${sections.join("\n\n")}\n` : "";
}

function renderTypeTypesDts(spec: ParsedSpecModel): string {
  const typeImports = renderRequiredTypeImports(
    spec,
    `frontend/${generatedFrontendDirName(spec.widgetName)}/types/types.d.ts`
  ).trim();
  const typeDecls = renderTypeDeclarations(spec, true).trim();
  const sections = [typeImports, typeDecls].filter((s) => s.length > 0);
  return sections.length > 0 ? `${sections.join("\n\n")}\n` : "";
}

function renderTsIndex(): string {
  return `export type Services = typeof import("./services");
export type Types = typeof import("./types");
`;
}

function renderTypeIndexDts(): string {
  return `export type Services = typeof import("../services");
export type Types = typeof import("../types");
`;
}

function renderJsModule(): string {
  return `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
`;
}

function renderJsIndex(): string {
  return renderJsModule();
}

function renderJsServices(): string {
  return renderJsModule();
}

function renderJsTypes(): string {
  return renderJsModule();
}

function renderNodeExpressWsPackage(spec: ParsedSpecModel): string {
  return JSON.stringify(
    {
      name: `${spec.widgetName.toLowerCase()}-node-express-ws-generated`,
      version: "0.1.0",
      private: true,
      types: "types/index.d.ts",
      main: "index.ts",
      exports: {
        ".": {
          types: "./types/index.d.ts",
          default: "./index.ts"
        }
      },
      anqst: {
        widget: spec.widgetName,
        services: spec.services.map((s) => s.name),
        target: "node_express_ws"
      }
    },
    null,
    2
  );
}

function nodeParamTuple(member: ServiceMemberModel): string {
  if (member.parameters.length === 0) return "[]";
  return `[${member.parameters.map((p) => mapTypeTextToTs(p.typeText)).join(", ")}]`;
}

function nodeParamArgs(member: ServiceMemberModel): string {
  return member.parameters.map((p) => `${p.name}: ${mapTypeTextToTs(p.typeText)}`).join(", ");
}

function nodeParamValues(member: ServiceMemberModel): string {
  if (member.parameters.length === 0) return "[]";
  return `[${member.parameters.map((p) => p.name).join(", ")}]`;
}

function nodeCap(value: string): string {
  return value.length === 0 ? value : `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function renderNodeExpressWsTypes(spec: ParsedSpecModel): string {
  const typeImports = renderRequiredTypeImports(
    spec,
    `backend/node/express/${generatedNodeExpressWsDirName(spec.widgetName)}/types/index.d.ts`
  ).trim();
  const typeDecls = renderTypeDeclarations(spec, true).trim();
  const sections = [typeImports, typeDecls].filter((s) => s.length > 0);
  return sections.length > 0 ? `${sections.join("\n\n")}\n` : "";
}

function renderNodeExpressWsIndex(spec: ParsedSpecModel, codecCatalog: BoundaryCodecCatalog): string {
  const typeImports = renderRequiredTypeImports(
    spec,
    `backend/node/express/${generatedNodeExpressWsDirName(spec.widgetName)}/index.ts`
  );
  const typeDecls = renderTypeDeclarations(spec, true);
  const handlerBridgeTypeName = `${spec.widgetName}HandlerBridge`;
  const sessionBridgeTypeName = `${spec.widgetName}SessionBridge`;

  const handlerInterfaces = spec.services
    .map((service) => {
      const lines: string[] = [];
      for (const member of service.members) {
        const args = nodeParamArgs(member);
        const prefixedArgs = args.length > 0 ? `, ${args}` : "";
        if (member.kind === "Call" && member.payloadTypeText) {
          const ret = mapTypeTextToTs(member.payloadTypeText);
          lines.push(`  ${member.name}(bridge: ${handlerBridgeTypeName}${prefixedArgs}): ${ret} | Promise<${ret}>;`);
        } else if (member.kind === "Emitter") {
          lines.push(`  ${member.name}(bridge: ${handlerBridgeTypeName}${prefixedArgs}): void | Promise<void>;`);
        } else if (member.kind === "Input" && member.payloadTypeText) {
          lines.push(`  ${member.name}(bridge: ${handlerBridgeTypeName}, value: ${mapTypeTextToTs(member.payloadTypeText)}): void | Promise<void>;`);
        }
      }
      return `export interface ${service.name}NodeHandlers {\n${lines.join("\n")}\n}`;
    })
    .join("\n\n");

  const implementationFields = spec.services.map((service) => `  ${service.name}: ${service.name}NodeHandlers;`).join("\n");

  const slotHelpers = spec.services
    .flatMap((service) =>
      service.members
        .filter((member) => member.kind === "Slot")
        .map((member) => {
          const ret = mapTypeTextToTs(member.payloadTypeText ?? "void");
          const args = nodeParamArgs(member);
          const paramSites = member.parameters.map((p) => getBoundaryParameterSite(codecCatalog, service.name, member.name, p.name));
          const payloadSite = getBoundaryPayloadSite(codecCatalog, service.name, member.name);
          const encodedArgs = member.parameters.length > 0
            ? `[${member.parameters.map((p, index) => `${paramSites[index] ? `encode${paramSites[index]!.codecId}(${p.name})` : p.name}`).join(", ")}]`
            : "[]";
          return `  ${service.name}_${member.name}(${args}${args ? ", " : ""}timeoutMs = this.defaultSlotTimeoutMs): Promise<${ret}> {
    return this.invokeSlot("${service.name}", "${member.name}", ${encodedArgs}, timeoutMs).then((value) => ${payloadSite ? `decode${payloadSite.codecId}(value)` : `value as ${ret}`});
  }`;
        })
    )
    .join("\n");

  const outputHelpers = spec.services
    .flatMap((service) =>
      service.members
        .filter((member) => member.kind === "Output" && member.payloadTypeText)
        .map((member) => {
          const typeText = mapTypeTextToTs(member.payloadTypeText!);
          const payloadSite = getBoundaryPayloadSite(codecCatalog, service.name, member.name);
          return `  set${service.name}_${nodeCap(member.name)}(value: ${typeText}): void {
    this.setOutputValue("${service.name}", "${member.name}", ${payloadSite ? `encode${payloadSite.codecId}(value)` : "value"});
  }`;
        })
    )
    .join("\n");

  const sessionServiceInterfaces = spec.services
    .map((service) => {
      const slotLines = service.members
        .filter((member) => member.kind === "Slot")
        .map((member) => {
          const ret = mapTypeTextToTs(member.payloadTypeText ?? "void");
          const args = nodeParamArgs(member);
          return `  ${member.name}(${args}${args.length > 0 ? ", " : ""}timeoutMs?: number): Promise<${ret}>;`;
        });

      const signalMembers = service.members
        .filter((member) => member.kind === "Emitter")
        .map((member) => {
          const args = nodeParamArgs(member);
          return `    ${member.name}(handler: (${args}) => void): () => void;`;
        });

      const propertyMembers = service.members
        .filter((member) => (member.kind === "Input" || member.kind === "Output") && member.payloadTypeText)
        .map((member) => {
          const typeText = mapTypeTextToTs(member.payloadTypeText!);
          if (member.kind === "Input") {
            return `    ${member.name}: {\n      get(): Promise<${typeText}>;\n      on(handler: (value: ${typeText}) => void): () => void;\n    };`;
          }
          return `    ${member.name}: {\n      set(value: ${typeText}): void;\n    };`;
        });

      return `export interface ${service.name}SessionBridgeService {\n${slotLines.join("\n")}\n  signal: {\n${signalMembers.join("\n")}\n  };\n  property: {\n${propertyMembers.join("\n")}\n  };\n}`;
    })
    .join("\n\n");

  const widgetServiceFields = spec.services.map((service) => `    ${service.name}: ${service.name}SessionBridgeService;`).join("\n");

  const sessionBridgeFactory = spec.services
    .map((service) => {
      const slotMembers = service.members
        .filter((member) => member.kind === "Slot")
        .map((member) => {
          const args = member.parameters.map((p) => p.name).join(", ");
          const typedArgs = nodeParamArgs(member);
          return `          ${member.name}: (${typedArgs}${typedArgs.length > 0 ? ", " : ""}timeoutMs = defaultSlotTimeoutMs) => session.${service.name}_${member.name}(${args}${args.length > 0 ? ", " : ""}timeoutMs),`;
        })
        .join("\n");

      const signalMembers = service.members
        .filter((member) => member.kind === "Emitter")
        .map((member) => {
          const args = nodeParamArgs(member);
          return `            ${member.name}: (handler: (${args}) => void) => session.onSignal("${service.name}", "${member.name}", handler as (...args: unknown[]) => void),`;
        })
        .join("\n");

      const propertyMembers = service.members
        .filter((member) => (member.kind === "Input" || member.kind === "Output") && member.payloadTypeText)
        .map((member) => {
          const typeText = mapTypeTextToTs(member.payloadTypeText!);
          const payloadSite = getBoundaryPayloadSite(codecCatalog, service.name, member.name);
          if (member.kind === "Input") {
            return `            ${member.name}: {\n              get: () => session.readInput("${service.name}", "${member.name}").then((value) => ${payloadSite ? `decode${payloadSite.codecId}(value)` : `value as ${typeText}`}),\n              on: (handler: (value: ${typeText}) => void) => session.onInput("${service.name}", "${member.name}", (value) => handler(${payloadSite ? `decode${payloadSite.codecId}(value)` : `value as ${typeText}`}))\n            },`;
          }
          return `            ${member.name}: {\n              set: (value: ${typeText}) => session.set${service.name}_${nodeCap(member.name)}(value)\n            },`;
        })
        .join("\n");

      return `      ${service.name}: {\n${slotMembers}\n        signal: {\n${signalMembers}\n        },\n        property: {\n${propertyMembers}\n        }\n      },`;
    })
    .join("\n");

  const callDispatch = spec.services
    .flatMap((service) =>
      service.members
        .filter((member) => member.kind === "Call" && member.payloadTypeText)
        .map((member) => {
          const paramSites = member.parameters.map((p) => getBoundaryParameterSite(codecCatalog, service.name, member.name, p.name));
          const payloadSite = getBoundaryPayloadSite(codecCatalog, service.name, member.name);
          const decodedArgs = member.parameters.length > 0
            ? member.parameters.map((p, index) => `${paramSites[index] ? `decode${paramSites[index]!.codecId}(args[${index}])` : `args[${index}] as ${mapTypeTextToTs(p.typeText)}`}`).join(", ")
            : "";
          return `    if (service === "${service.name}" && member === "${member.name}") {
      const handler = implementation.${service.name}.${member.name};
      if (typeof handler !== "function") {
        const err = new Error("Missing Call handler ${service.name}.${member.name}");
        emitDiagnostic({
          code: "HandlerNotRegisteredError",
          severity: "fatal",
          category: "bridge",
          recoverable: false,
          message: err.message,
          sessionId: session.id,
          service,
          member,
          requestId
        });
        sendJson(session.socket, {
          type: "callResult",
          requestId,
          result: { code: "HandlerNotRegisteredError", message: err.message, service, member, requestId }
        });
        throw err;
      }
      Promise.resolve(handler(buildHandlerBridge(session)${decodedArgs ? `, ${decodedArgs}` : ""}))
        .then((result) => sendJson(session.socket, { type: "callResult", requestId, result: ${payloadSite ? `encode${payloadSite.codecId}(result)` : "result"} }))
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          emitDiagnostic({
            code: "CallHandlerError",
            severity: "error",
            category: "bridge",
            recoverable: true,
            message,
            sessionId: session.id,
            service,
            member,
            requestId
          });
          sendJson(session.socket, {
            type: "callResult",
            requestId,
            result: { code: "CallHandlerError", message, service, member, requestId }
          });
        });
      return;
    }`;
        })
    )
    .join("\n");

  const emitterDispatch = spec.services
    .flatMap((service) =>
      service.members
        .filter((member) => member.kind === "Emitter")
        .map((member) => {
          const paramSites = member.parameters.map((p) => getBoundaryParameterSite(codecCatalog, service.name, member.name, p.name));
          const decodedArgs = member.parameters.length > 0
            ? member.parameters.map((p, index) => `${paramSites[index] ? `decode${paramSites[index]!.codecId}(args[${index}])` : `args[${index}] as ${mapTypeTextToTs(p.typeText)}`}`).join(", ")
            : "";
          const decodedSignalArgs = member.parameters.length > 0
            ? `[${member.parameters.map((p, index) => `${paramSites[index] ? `decode${paramSites[index]!.codecId}(args[${index}])` : `args[${index}] as ${mapTypeTextToTs(p.typeText)}`}`).join(", ")}]`
            : "[]";
          return `    if (service === "${service.name}" && member === "${member.name}") {
      const handler = implementation.${service.name}.${member.name};
      if (typeof handler !== "function") {
        const err = new Error("Missing Emitter handler ${service.name}.${member.name}");
        emitDiagnostic({
          code: "HandlerNotRegisteredError",
          severity: "fatal",
          category: "bridge",
          recoverable: false,
          message: err.message,
          sessionId: session.id,
          service,
          member
        });
        throw err;
      }
      session.emitSignal(service, member, ${decodedSignalArgs});
      void Promise.resolve(handler(buildHandlerBridge(session)${decodedArgs ? `, ${decodedArgs}` : ""})).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        emitDiagnostic({
          code: "EmitterHandlerError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message,
          sessionId: session.id,
          service,
          member
        });
      });
      return;
    }`;
        })
    )
    .join("\n");

  const inputDispatch = spec.services
    .flatMap((service) =>
      service.members
        .filter((member) => member.kind === "Input" && member.payloadTypeText)
        .map((member) => {
          const payloadSite = getBoundaryPayloadSite(codecCatalog, service.name, member.name);
          return `    if (service === "${service.name}" && member === "${member.name}") {
      const handler = implementation.${service.name}.${member.name};
      if (typeof handler !== "function") {
        const err = new Error("Missing Input handler ${service.name}.${member.name}");
        emitDiagnostic({
          code: "HandlerNotRegisteredError",
          severity: "fatal",
          category: "bridge",
          recoverable: false,
          message: err.message,
          sessionId: session.id,
          service,
          member
        });
        throw err;
      }
      const decodedValue = ${payloadSite ? `decode${payloadSite.codecId}(value)` : `value as ${mapTypeTextToTs(member.payloadTypeText!)}`};
      session.setInputState(service, member, decodedValue);
      void Promise.resolve(handler(buildHandlerBridge(session), decodedValue)).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        emitDiagnostic({
          code: "InputHandlerError",
          severity: "error",
          category: "bridge",
          recoverable: true,
          message,
          sessionId: session.id,
          service,
          member
        });
      });
      return;
    }`;
        })
    )
    .join("\n");

  return `import type { Express, Request } from "express";
import type { WebSocket, WebSocketServer } from "ws";
${typeImports}
${typeDecls}

// Boundary codec plan helpers
${renderTsBoundaryCodecHelpers(codecCatalog)}

${handlerInterfaces}

export interface ${spec.widgetName}NodeImplementation {
${implementationFields}
}

${sessionServiceInterfaces}

export interface ${sessionBridgeTypeName} {
  ${spec.widgetName}: {
${widgetServiceFields}
  };
}

export interface ${handlerBridgeTypeName} {
  own: ${sessionBridgeTypeName};
  others: Record<string, ${sessionBridgeTypeName}>;
  sessions: Record<string, ${sessionBridgeTypeName}>;
  sessionId: string;
}

export interface AnQstDiagnostic {
  code: string;
  severity: "info" | "warn" | "error" | "fatal";
  category: string;
  recoverable: boolean;
  message: string;
  timestamp: string;
  sessionId?: string;
  service?: string;
  member?: string;
  requestId?: string;
  context?: Record<string, unknown>;
}

type SlotPending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type QueuedSlotInvocation = {
  requestId: string;
  service: string;
  member: string;
  args: unknown[];
  timeoutMs: number;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

function sendJson(socket: WebSocket, payload: Record<string, unknown>): void {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(payload));
  }
}

function makeWsUrl(req: Request, wsPath: string): string {
  const forwarded = req.header("x-forwarded-proto");
  const protocol = (forwarded ?? req.protocol).toLowerCase() === "https" ? "wss" : "ws";
  return \`\${protocol}://\${req.get("host") ?? "localhost"}\${wsPath}\`;
}

function nowIso(): string {
  return new Date().toISOString();
}

class ${spec.widgetName}NodeSession {
  readonly registeredSlots = new Set<string>();
  private readonly pending = new Map<string, SlotPending>();
  private readonly queued = new Map<string, QueuedSlotInvocation[]>();
  private readonly signalListeners = new Map<string, Set<(...args: unknown[]) => void>>();
  private readonly inputListeners = new Map<string, Set<(value: unknown) => void>>();
  private readonly inputState = new Map<string, unknown>();
  private requestCounter = 0;

  constructor(
    readonly id: string,
    readonly socket: WebSocket,
    private readonly defaultSlotTimeoutMs: number,
    private readonly maxQueuedPerSlot: number,
    private readonly emitDiagnostic: (diagnostic: Omit<AnQstDiagnostic, "timestamp">) => void
  ) {}

  close(reason = "Session closed"): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error(reason));
    }
    this.pending.clear();
    for (const queue of this.queued.values()) {
      for (const item of queue) item.reject(new Error(reason));
    }
    this.queued.clear();
    this.signalListeners.clear();
    this.inputListeners.clear();
    this.inputState.clear();
  }

  registerSlot(service: string, member: string): void {
    const key = \`\${service}::\${member}\`;
    this.registeredSlots.add(key);
    const queue = this.queued.get(key);
    if (!queue || queue.length === 0) return;
    this.queued.delete(key);
    for (const item of queue) this.dispatchSlot(item);
  }

  resolveSlot(requestId: string, ok: boolean, payload: unknown, error: string): void {
    const pending = this.pending.get(requestId);
    if (!pending) return;
    clearTimeout(pending.timeout);
    this.pending.delete(requestId);
    if (ok) {
      pending.resolve(payload);
      return;
    }
    pending.reject(new Error(error || "Slot invocation failed."));
  }

  invokeSlot(service: string, member: string, args: unknown[], timeoutMs = this.defaultSlotTimeoutMs): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = \`slot-\${this.id}-\${++this.requestCounter}\`;
      const item: QueuedSlotInvocation = { requestId, service, member, args, timeoutMs, resolve, reject };
      const key = \`\${service}::\${member}\`;
      if (!this.registeredSlots.has(key)) {
        const queue = this.queued.get(key) ?? [];
        if (queue.length >= this.maxQueuedPerSlot) {
          const dropped = queue.shift();
          dropped?.reject(new Error("Slot queue overflow."));
          this.emitDiagnostic({
            code: "SlotQueueOverflowError",
            severity: "warn",
            category: "bridge",
            recoverable: true,
            message: "Slot queue exceeded capacity; oldest queued request dropped.",
            sessionId: this.id,
            service,
            member,
            context: { maxQueuedPerSlot: this.maxQueuedPerSlot }
          });
        }
        queue.push(item);
        this.queued.set(key, queue);
        return;
      }
      this.dispatchSlot(item);
    });
  }

  setOutputValue(service: string, member: string, value: unknown): void {
    sendJson(this.socket, { type: "outputUpdated", service, member, value });
  }

  onSignal(service: string, member: string, handler: (...args: unknown[]) => void): () => void {
    const key = \`\${service}::\${member}\`;
    const listeners = this.signalListeners.get(key) ?? new Set<(...args: unknown[]) => void>();
    listeners.add(handler);
    this.signalListeners.set(key, listeners);
    return () => {
      const existing = this.signalListeners.get(key);
      if (!existing) return;
      existing.delete(handler);
      if (existing.size === 0) this.signalListeners.delete(key);
    };
  }

  emitSignal(service: string, member: string, args: unknown[]): void {
    const key = \`\${service}::\${member}\`;
    for (const handler of this.signalListeners.get(key) ?? []) {
      try {
        handler(...args);
      } catch {
        // Listener errors are intentionally isolated from protocol handling.
      }
    }
  }

  onInput(service: string, member: string, handler: (value: unknown) => void): () => void {
    const key = \`\${service}::\${member}\`;
    const listeners = this.inputListeners.get(key) ?? new Set<(value: unknown) => void>();
    listeners.add(handler);
    this.inputListeners.set(key, listeners);
    if (this.inputState.has(key)) {
      handler(this.inputState.get(key));
    }
    return () => {
      const existing = this.inputListeners.get(key);
      if (!existing) return;
      existing.delete(handler);
      if (existing.size === 0) this.inputListeners.delete(key);
    };
  }

  setInputState(service: string, member: string, value: unknown): void {
    const key = \`\${service}::\${member}\`;
    this.inputState.set(key, value);
    for (const handler of this.inputListeners.get(key) ?? []) {
      try {
        handler(value);
      } catch {
        // Listener errors are intentionally isolated from protocol handling.
      }
    }
  }

  readInput(service: string, member: string): Promise<unknown> {
    const key = \`\${service}::\${member}\`;
    if (!this.inputState.has(key)) {
      return Promise.reject(new Error(\`Input value for \${service}.\${member} is unavailable\`));
    }
    return Promise.resolve(this.inputState.get(key));
  }

${slotHelpers}
${outputHelpers}

  private dispatchSlot(item: QueuedSlotInvocation): void {
    const timeout = setTimeout(() => {
      this.pending.delete(item.requestId);
      item.reject(new Error("slot invocation timeout"));
      this.emitDiagnostic({
        code: "BridgeTimeoutError",
        severity: "error",
        category: "bridge",
        recoverable: true,
        message: "Slot invocation timed out.",
        sessionId: this.id,
        service: item.service,
        member: item.member,
        requestId: item.requestId
      });
    }, item.timeoutMs);
    this.pending.set(item.requestId, { resolve: item.resolve, reject: item.reject, timeout });
    sendJson(this.socket, {
      type: "slotInvocationRequested",
      requestId: item.requestId,
      service: item.service,
      member: item.member,
      args: item.args
    });
  }
}

export interface ${spec.widgetName}NodeBridgeOptions {
  app: Express;
  wsServer: WebSocketServer;
  implementation: ${spec.widgetName}NodeImplementation;
  wsPath?: string;
  wsUrl?: string;
  devConfigPath?: string;
  defaultSlotTimeoutMs?: number;
  maxQueuedSlotInvocationsPerSlot?: number;
}

export interface ${spec.widgetName}NodeBridge {
  onSession(listener: (session: ${spec.widgetName}NodeSession) => void): () => void;
  subscribeDiagnostics(listener: (diagnostic: AnQstDiagnostic) => void): () => void;
  getSessions(): ReadonlyArray<${spec.widgetName}NodeSession>;
  getSessionInterfaces(): Record<string, ${sessionBridgeTypeName}>;
  close(): void;
}

export function create${spec.widgetName}NodeExpressWsBridge(options: ${spec.widgetName}NodeBridgeOptions): ${spec.widgetName}NodeBridge {
  const wsPath = options.wsPath ?? "/anqst-bridge";
  const devConfigPath = options.devConfigPath ?? "/anqst-dev-config.json";
  const defaultSlotTimeoutMs = options.defaultSlotTimeoutMs ?? 1000;
  const maxQueuedPerSlot = options.maxQueuedSlotInvocationsPerSlot ?? 1024;
  const sessions = new Map<WebSocket, ${spec.widgetName}NodeSession>();
  const diagnosticListeners = new Set<(diagnostic: AnQstDiagnostic) => void>();
  const sessionListeners = new Set<(session: ${spec.widgetName}NodeSession) => void>();
  let sessionCounter = 0;
  const implementation = options.implementation;

  const emitDiagnostic = (diagnostic: Omit<AnQstDiagnostic, "timestamp">): void => {
    const next: AnQstDiagnostic = { ...diagnostic, timestamp: nowIso() };
    for (const listener of diagnosticListeners) listener(next);
  };

  const getSessionInterfaces = (): Record<string, ${sessionBridgeTypeName}> => {
    const out: Record<string, ${sessionBridgeTypeName}> = {};
    for (const session of sessions.values()) {
      out[session.id] = {
        ${spec.widgetName}: {
${sessionBridgeFactory}
        }
      };
    }
    return out;
  };

  const buildHandlerBridge = (session: ${spec.widgetName}NodeSession): ${handlerBridgeTypeName} => {
    const byId = getSessionInterfaces();
    const others: Record<string, ${sessionBridgeTypeName}> = {};
    for (const [id, view] of Object.entries(byId)) {
      if (id === session.id) continue;
      others[id] = view;
    }
    return {
      own: byId[session.id],
      others,
      sessions: byId,
      sessionId: session.id
    };
  };

  options.app.get(devConfigPath, (req, res) => {
    res.json({
      wsUrl: options.wsUrl ?? makeWsUrl(req, wsPath),
      bridgeObject: "${spec.widgetName}Bridge"
    });
  });

  const handleMessage = (session: ${spec.widgetName}NodeSession, raw: string): void => {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      emitDiagnostic({
        code: "DeserializationError",
        severity: "warn",
        category: "bridge",
        recoverable: true,
        message: "Incoming WS payload is not valid JSON.",
        sessionId: session.id
      });
      return;
    }
    const type = String(message.type ?? "");
    if (type === "registerSlot") {
      session.registerSlot(String(message.service ?? ""), String(message.member ?? ""));
      return;
    }
    if (type === "resolveSlot") {
      session.resolveSlot(String(message.requestId ?? ""), Boolean(message.ok), message.payload, String(message.error ?? ""));
      return;
    }
    if (type === "call") {
      const service = String(message.service ?? "");
      const member = String(message.member ?? "");
      const requestId = String(message.requestId ?? "");
      const args = Array.isArray(message.args) ? (message.args as unknown[]) : [];
${callDispatch}
      const err = new Error(\`No Call mapping found for \${service}.\${member}\`);
      emitDiagnostic({
        code: "HandlerNotRegisteredError",
        severity: "fatal",
        category: "bridge",
        recoverable: false,
        message: err.message,
        sessionId: session.id,
        service,
        member,
        requestId
      });
      sendJson(session.socket, {
        type: "callResult",
        requestId,
        result: { code: "HandlerNotRegisteredError", message: err.message, service, member, requestId }
      });
      throw err;
    }
    if (type === "emit") {
      const service = String(message.service ?? "");
      const member = String(message.member ?? "");
      const args = Array.isArray(message.args) ? (message.args as unknown[]) : [];
${emitterDispatch}
      const err = new Error(\`No Emitter mapping found for \${service}.\${member}\`);
      emitDiagnostic({
        code: "HandlerNotRegisteredError",
        severity: "fatal",
        category: "bridge",
        recoverable: false,
        message: err.message,
        sessionId: session.id,
        service,
        member
      });
      throw err;
    }
    if (type === "setInput") {
      const service = String(message.service ?? "");
      const member = String(message.member ?? "");
      const value = message.value;
${inputDispatch}
      const err = new Error(\`No Input mapping found for \${service}.\${member}\`);
      emitDiagnostic({
        code: "HandlerNotRegisteredError",
        severity: "fatal",
        category: "bridge",
        recoverable: false,
        message: err.message,
        sessionId: session.id,
        service,
        member
      });
      throw err;
    }
    emitDiagnostic({
      code: "ProtocolMessageUnknown",
      severity: "warn",
      category: "bridge",
      recoverable: true,
      message: \`Unknown WS message type '\${type}'.\`,
      sessionId: session.id
    });
  };

  const onConnection = (socket: WebSocket): void => {
    const session = new ${spec.widgetName}NodeSession(
      \`session-\${++sessionCounter}\`,
      socket,
      defaultSlotTimeoutMs,
      maxQueuedPerSlot,
      emitDiagnostic
    );
    sessions.set(socket, session);
    for (const listener of sessionListeners) listener(session);
    sendJson(socket, { type: "hostReady" });
    socket.on("message", (data) => {
      handleMessage(session, typeof data === "string" ? data : data.toString());
    });
    socket.on("close", () => {
      session.close("Session closed");
      sessions.delete(socket);
    });
  };

  options.wsServer.on("connection", onConnection);

  return {
    onSession(listener) {
      sessionListeners.add(listener);
      for (const session of sessions.values()) listener(session);
      return () => sessionListeners.delete(listener);
    },
    subscribeDiagnostics(listener) {
      diagnosticListeners.add(listener);
      return () => diagnosticListeners.delete(listener);
    },
    getSessions() {
      return [...sessions.values()];
    },
    getSessionInterfaces() {
      return getSessionInterfaces();
    },
    close() {
      options.wsServer.off("connection", onConnection);
      for (const session of sessions.values()) session.close("Bridge closed");
      sessions.clear();
    }
  };
}
`;
}

function renderTypeRootIndexDts(spec: ParsedSpecModel): string {
  const indexDecls = renderTypeIndexDts().trim();
  const typeDecls = renderTypeTypesDts(spec).trim();
  const serviceDecls = renderTypeServicesDts(spec).trim();
  const sections = [indexDecls, typeDecls, serviceDecls].filter((s) => s.length > 0);
  return sections.length > 0 ? `${sections.join("\n\n")}\n` : "";
}

export interface GeneratedFiles {
  [relativePath: string]: string;
}

export interface GenerateOutputsOptions {
  emitQWidget: boolean;
  emitAngularService: boolean;
  emitNodeExpressWs: boolean;
}

function generatedCppLibraryDirName(widgetName: string): string {
  return generatedQtWidgetDirName(widgetName);
}

function generatedNodeExpressWsDirName(widgetName: string): string {
  return generatedNodeExpressDirName(widgetName);
}

export function generateOutputs(
  spec: ParsedSpecModel,
  options: GenerateOutputsOptions = { emitQWidget: true, emitAngularService: true, emitNodeExpressWs: false }
): GeneratedFiles {
  const frontendDir = `frontend/${generatedFrontendDirName(spec.widgetName)}`;
  const cppDir = `backend/cpp/qt/${generatedCppLibraryDirName(spec.widgetName)}`;
  const nodeDir = `backend/node/express/${generatedNodeExpressWsDirName(spec.widgetName)}`;
  const outputs: GeneratedFiles = {};
  const codecCatalog = buildBoundaryCodecCatalog(spec);
  if (options.emitAngularService) {
    outputs[`${frontendDir}/package.json`] = renderNpmPackage(spec);
    outputs[`${frontendDir}/index.ts`] = renderTsIndex();
    outputs[`${frontendDir}/services.ts`] = renderTsServices(spec, codecCatalog);
    outputs[`${frontendDir}/types.ts`] = renderTsTypes(spec);
    outputs[`${frontendDir}/index.js`] = renderJsIndex();
    outputs[`${frontendDir}/services.js`] = renderJsServices();
    outputs[`${frontendDir}/types.js`] = renderJsTypes();
    outputs[`${frontendDir}/types/index.d.ts`] = renderTypeRootIndexDts(spec);
    outputs[`${frontendDir}/types/services.d.ts`] = renderTypeServicesDts(spec);
    outputs[`${frontendDir}/types/types.d.ts`] = renderTypeTypesDts(spec);
  }
  if (options.emitQWidget) {
    const cppTypes = buildCppTypeContext(spec);
    outputs[`${cppDir}/CMakeLists.txt`] = renderCMake(spec);
    outputs[`${cppDir}/${spec.widgetName}.qrc`] = renderEmbeddedQrc(spec.widgetName, []);
    outputs[`${cppDir}/include/${spec.widgetName}.h`] = renderWidgetUmbrellaHeader(spec);
    outputs[`${cppDir}/include/${spec.widgetName}Widget.h`] = renderWidgetHeader(spec, cppTypes, codecCatalog);
    outputs[`${cppDir}/include/${spec.widgetName}Types.h`] = renderTypesHeader(spec, cppTypes);
    outputs[`${cppDir}/${spec.widgetName}.cpp`] = renderCppStub(spec, cppTypes, codecCatalog);
  }
  if (options.emitNodeExpressWs) {
    outputs[`${nodeDir}/package.json`] = renderNodeExpressWsPackage(spec);
    outputs[`${nodeDir}/index.ts`] = renderNodeExpressWsIndex(spec, codecCatalog);
    outputs[`${nodeDir}/types/index.d.ts`] = renderNodeExpressWsTypes(spec);
  }
  return outputs;
}

export function writeGeneratedOutputs(cwd: string, outputs: GeneratedFiles): void {
  const outputRoot = anqstGeneratedRootDir(cwd);
  for (const [relPath, content] of Object.entries(outputs)) {
    const filePath = path.join(outputRoot, relPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, withBuildStamp(relPath, content), "utf8");
  }
}

function listFilesRecursively(rootDir: string): string[] {
  const output: string[] = [];
  const queue: string[] = [rootDir];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(abs);
        continue;
      }
      if (entry.isFile()) {
        output.push(normalizeSlashes(path.relative(rootDir, abs)));
      }
    }
  }
  return output.sort();
}

function copyDirectoryRecursive(sourceDir: string, targetDir: string): void {
  const queue: string[] = [sourceDir];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const sourceAbs = path.join(current, entry.name);
      const rel = path.relative(sourceDir, sourceAbs);
      const targetAbs = path.join(targetDir, rel);
      if (entry.isDirectory()) {
        fs.mkdirSync(targetAbs, { recursive: true });
        queue.push(sourceAbs);
        continue;
      }
      if (entry.isFile()) {
        fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
        fs.copyFileSync(sourceAbs, targetAbs);
      }
    }
  }
}

function resolveDistWebRoot(cwd: string): string | null {
  const distDir = path.join(cwd, "dist");
  if (!fs.existsSync(distDir)) {
    return null;
  }

  const candidates: string[] = [];
  const angularJsonPath = path.join(cwd, "angular.json");
  if (fs.existsSync(angularJsonPath)) {
    try {
      const angularJson = JSON.parse(fs.readFileSync(angularJsonPath, "utf8")) as {
        defaultProject?: string;
        projects?: Record<string, { architect?: { build?: { options?: { outputPath?: string | { base?: string } } } } }>;
      };
      const projectNames = Object.keys(angularJson.projects ?? {});
      const orderedProjects: string[] = [];
      if (typeof angularJson.defaultProject === "string" && angularJson.defaultProject.length > 0) {
        orderedProjects.push(angularJson.defaultProject);
      }
      for (const projectName of projectNames) {
        if (!orderedProjects.includes(projectName)) {
          orderedProjects.push(projectName);
        }
      }

      for (const projectName of orderedProjects) {
        const outputPathValue = angularJson.projects?.[projectName]?.architect?.build?.options?.outputPath;
        if (typeof outputPathValue === "string" && outputPathValue.length > 0) {
          const absolute = path.resolve(cwd, outputPathValue);
          candidates.push(path.join(absolute, "browser"));
          candidates.push(absolute);
          continue;
        }
        if (
          outputPathValue &&
          typeof outputPathValue === "object" &&
          typeof outputPathValue.base === "string" &&
          outputPathValue.base.length > 0
        ) {
          const absolute = path.resolve(cwd, outputPathValue.base);
          candidates.push(path.join(absolute, "browser"));
          candidates.push(absolute);
          continue;
        }
        candidates.push(path.join(distDir, projectName, "browser"));
        candidates.push(path.join(distDir, projectName));
      }
    } catch {
      // Best-effort: fallback candidates below.
    }
  }

  const seen = new Set<string>();
  const dedupedCandidates = candidates.filter((candidate) => {
    if (seen.has(candidate)) return false;
    seen.add(candidate);
    return true;
  });

  for (const candidate of dedupedCandidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  const discovered: string[] = [];
  const walk = (dir: string, depth: number): void => {
    if (depth > 6) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs, depth + 1);
        continue;
      }
      if (entry.isFile() && entry.name === "index.html") {
        discovered.push(dir);
      }
    }
  };
  walk(distDir, 0);
  if (discovered.length === 0) {
    return null;
  }
  discovered.sort((a, b) => {
    const aBrowser = normalizeSlashes(a).includes("/browser") ? 0 : 1;
    const bBrowser = normalizeSlashes(b).includes("/browser") ? 0 : 1;
    if (aBrowser !== bBrowser) return aBrowser - bBrowser;
    return a.length - b.length;
  });
  return discovered[0];
}

export function installEmbeddedWebBundle(cwd: string, widgetName: string): boolean {
  const distWebRoot = resolveDistWebRoot(cwd);
  if (distWebRoot === null) {
    return false;
  }
  if (!fs.existsSync(path.join(distWebRoot, "index.html"))) {
    return false;
  }

  const cppLibraryRoot = resolveGeneratedLayoutPaths(cwd, widgetName).cppQtWidgetRoot;
  const cppLibraryWebRoot = path.join(cppLibraryRoot, "webapp");
  fs.rmSync(cppLibraryWebRoot, { recursive: true, force: true });
  fs.mkdirSync(cppLibraryWebRoot, { recursive: true });
  copyDirectoryRecursive(distWebRoot, cppLibraryWebRoot);
  normalizeEmbeddedIndexHtml(path.join(cppLibraryWebRoot, "index.html"), cppLibraryWebRoot);

  const embeddedFiles = listFilesRecursively(cppLibraryWebRoot);
  const qrcPath = path.join(cppLibraryRoot, `${widgetName}.qrc`);
  fs.writeFileSync(qrcPath, withBuildStamp(`${widgetName}.qrc`, renderEmbeddedQrc(widgetName, embeddedFiles)), "utf8");
  return true;
}

function normalizeEmbeddedIndexHtml(indexPath: string, webRoot: string): void {
  if (!fs.existsSync(indexPath)) {
    return;
  }
  let html = fs.readFileSync(indexPath, "utf8");
  if (html.includes('<base href="/">')) {
    html = html.replace('<base href="/">', '<base href="./">');
  }
  html = html.replace(
    /<link\b[^>]*href="([^"]+\.css)"[^>]*>\s*/g,
    (full: string, href: string) => {
      const absolute = path.join(webRoot, href);
      if (!fs.existsSync(absolute)) {
        return "";
      }
      if (fs.statSync(absolute).size === 0) {
        return "";
      }
      return full;
    }
  );
  fs.writeFileSync(indexPath, html, "utf8");
}

function renderQtIntegrationCMake(widgetName: string): string {
  const generatedRootVar = "ANQST_GENERATED_WIDGET_DIR";
  const generatedIncludeVar = "ANQST_GENERATED_INCLUDE_DIR";
  const projectRootVar = "ANQST_PROJECT_ROOT";
  const requiredFilesVar = "ANQST_REQUIRED_GENERATED_FILES";
  const widgetBinaryDirVar = "ANQST_GENERATED_WIDGET_BINARY_DIR";
  const widgetTarget = `${widgetName}Widget`;
  return `cmake_minimum_required(VERSION 3.21)

set(${projectRootVar} "\${CMAKE_CURRENT_LIST_DIR}/../../../../..")
set(${generatedRootVar} "\${CMAKE_CURRENT_LIST_DIR}/../qt/${generatedCppLibraryDirName(widgetName)}")
set(${generatedIncludeVar} "\${${generatedRootVar}}/include")
set(${widgetBinaryDirVar} "\${CMAKE_CURRENT_BINARY_DIR}/${generatedCppLibraryDirName(widgetName)}")

if(TARGET ${widgetTarget})
    return()
endif()

if(NOT TARGET anqstwebhostbase)
    message(FATAL_ERROR "Target 'anqstwebhostbase' must exist before including generated AnQst CMake for ${widgetName}.")
endif()

set(${requiredFilesVar}
    "\${${generatedRootVar}}/CMakeLists.txt"
    "\${${generatedRootVar}}/${widgetName}.qrc"
    "\${${generatedRootVar}}/${widgetName}.cpp"
    "\${${generatedIncludeVar}}/${widgetName}.h"
    "\${${generatedIncludeVar}}/${widgetName}Widget.h"
    "\${${generatedIncludeVar}}/${widgetName}Types.h"
    "\${${generatedRootVar}}/webapp/index.html"
)

foreach(required_file IN LISTS ${requiredFilesVar})
    if(NOT EXISTS "\${required_file}")
        message(FATAL_ERROR
            "Generated AnQst widget tree is incomplete for ${widgetName}. "
            "Missing file: \${required_file}. "
            "Run 'npx anqst build' in '\${${projectRootVar}}' first."
        )
    endif()
endforeach()

add_subdirectory("\${${generatedRootVar}}" "\${${widgetBinaryDirVar}}")
`;
}

export function installQtIntegrationCMake(cwd: string, widgetName: string): void {
  const integrationDir = resolveGeneratedLayoutPaths(cwd, widgetName).cppCmakeRoot;
  fs.mkdirSync(integrationDir, { recursive: true });
  fs.writeFileSync(
    path.join(integrationDir, "CMakeLists.txt"),
    withBuildStamp("backend/cpp/cmake/CMakeLists.txt", renderQtIntegrationCMake(widgetName)),
    "utf8"
  );
}

interface DesignerPluginAssets {
  hasIcon: boolean;
}

interface InstallQtDesignerPluginOptions {
  widgetCategory?: string;
}

function normalizeIcoSize(dim: number): number {
  return dim === 0 ? 256 : dim;
}

function escapeCppStringLiteral(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function readDistFavicon(cwd: string): Buffer | null {
  const distRoot = path.join(cwd, "dist");
  if (!fs.existsSync(distRoot) || !fs.statSync(distRoot).isDirectory()) {
    return null;
  }
  const stack = [distRoot];
  while (stack.length > 0) {
    const current = stack.shift()!;
    const entries = fs.readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase() === "favicon.ico") {
        return fs.readFileSync(fullPath);
      }
    }
  }
  return null;
}

function resolveFaviconIcoBuffer(cwd: string): Buffer | null {
  const distFavicon = readDistFavicon(cwd);
  if (distFavicon !== null) {
    return distFavicon;
  }
  const fallbackFiles = [
    path.join(cwd, "res", "favicon.ico"),
    path.join(cwd, "src", "favicon.ico"),
    path.join(cwd, "favicon.ico")
  ];
  for (const filePath of fallbackFiles) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return fs.readFileSync(filePath);
    }
  }
  return null;
}

function decodeIcoBmpToPng(imageData: Buffer): Buffer {
  if (imageData.length < 40) {
    throw new Error("ICO BMP frame too small.");
  }
  const headerSize = imageData.readUInt32LE(0);
  if (headerSize < 40 || imageData.length < headerSize) {
    throw new Error("ICO BMP frame has unsupported DIB header.");
  }
  const width = imageData.readInt32LE(4);
  const heightTotal = imageData.readInt32LE(8);
  const planes = imageData.readUInt16LE(12);
  const bitCount = imageData.readUInt16LE(14);
  const compression = imageData.readUInt32LE(16);
  if (width <= 0 || heightTotal <= 0) {
    throw new Error("ICO BMP frame has invalid dimensions.");
  }
  const height = Math.floor(heightTotal / 2);
  if (height <= 0) {
    throw new Error("ICO BMP frame has invalid mask height.");
  }
  if (planes !== 1 || bitCount !== 32 || compression !== 0) {
    throw new Error("ICO BMP frame format unsupported; expected 32-bit BI_RGB.");
  }
  const pixelOffset = headerSize;
  const rowBytes = width * 4;
  const pixelBytes = rowBytes * height;
  if (imageData.length < pixelOffset + pixelBytes) {
    throw new Error("ICO BMP frame is truncated.");
  }

  const png = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const srcY = height - 1 - y;
    const srcRow = pixelOffset + srcY * rowBytes;
    const dstRow = y * rowBytes;
    for (let x = 0; x < width; x += 1) {
      const src = srcRow + x * 4;
      const dst = dstRow + x * 4;
      const b = imageData[src];
      const g = imageData[src + 1];
      const r = imageData[src + 2];
      const a = imageData[src + 3];
      png.data[dst] = r;
      png.data[dst + 1] = g;
      png.data[dst + 2] = b;
      png.data[dst + 3] = a;
    }
  }
  return PNG.sync.write(png);
}

function convertIcoToPngBuffer(icoBytes: Buffer): Buffer {
  if (icoBytes.length < 6) {
    throw new Error("favicon.ico is too small.");
  }
  const reserved = icoBytes.readUInt16LE(0);
  const iconType = icoBytes.readUInt16LE(2);
  const count = icoBytes.readUInt16LE(4);
  if (reserved !== 0 || iconType !== 1 || count === 0) {
    throw new Error("favicon.ico has invalid ICO header.");
  }
  if (icoBytes.length < 6 + count * 16) {
    throw new Error("favicon.ico has truncated directory entries.");
  }

  type Frame = {
    width: number;
    height: number;
    bytesInRes: number;
    imageOffset: number;
  };
  const frames: Frame[] = [];
  for (let i = 0; i < count; i += 1) {
    const entryOffset = 6 + i * 16;
    const width = normalizeIcoSize(icoBytes[entryOffset]);
    const height = normalizeIcoSize(icoBytes[entryOffset + 1]);
    const bytesInRes = icoBytes.readUInt32LE(entryOffset + 8);
    const imageOffset = icoBytes.readUInt32LE(entryOffset + 12);
    if (bytesInRes === 0) continue;
    if (imageOffset + bytesInRes > icoBytes.length) continue;
    frames.push({ width, height, bytesInRes, imageOffset });
  }
  if (frames.length === 0) {
    throw new Error("favicon.ico contains no readable image frames.");
  }

  frames.sort((a, b) => {
    const areaDiff = b.width * b.height - a.width * a.height;
    if (areaDiff !== 0) return areaDiff;
    return b.bytesInRes - a.bytesInRes;
  });

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  for (const frame of frames) {
    const imageData = icoBytes.subarray(frame.imageOffset, frame.imageOffset + frame.bytesInRes);
    if (imageData.subarray(0, 8).equals(pngSignature)) {
      return Buffer.from(imageData);
    }
  }

  return decodeIcoBmpToPng(icoBytes.subarray(frames[0].imageOffset, frames[0].imageOffset + frames[0].bytesInRes));
}

function renderDesignerPluginQrc(): string {
  return `<RCC>
  <qresource prefix="/anqstdesignerplugin">
    <file>plugin-icon.png</file>
  </qresource>
</RCC>
`;
}

function installDesignerPluginIconAssets(cwd: string, pluginDir: string): DesignerPluginAssets {
  const iconTargetPath = path.join(pluginDir, "plugin-icon.png");
  const qrcTargetPath = path.join(pluginDir, "designerplugin.qrc");
  const icoBytes = resolveFaviconIcoBuffer(cwd);
  if (icoBytes === null) {
    if (fs.existsSync(iconTargetPath)) fs.rmSync(iconTargetPath, { force: true });
    if (fs.existsSync(qrcTargetPath)) fs.rmSync(qrcTargetPath, { force: true });
    return { hasIcon: false };
  }

  const pngBytes = convertIcoToPngBuffer(icoBytes);
  fs.writeFileSync(iconTargetPath, pngBytes);
  fs.writeFileSync(qrcTargetPath, renderDesignerPluginQrc(), "utf8");
  return { hasIcon: true };
}

function renderQtDesignerPluginCpp(widgetName: string, widgetCategory: string, hasIcon: boolean): string {
  const pluginClass = `${widgetName}DesignerPlugin`;
  const widgetClass = `${widgetName}Widget`;
  const groupName = escapeCppStringLiteral(widgetCategory);
  const iconExpression = hasIcon
    ? 'QIcon(QStringLiteral(":/anqstdesignerplugin/plugin-icon.png"))'
    : "QIcon()";
  return `#include <QtUiPlugin/QDesignerCustomWidgetInterface>
#include <QIcon>
#include <QObject>
#include <QString>
#include <QWidget>
#include "${widgetName}.h"

class ${pluginClass} final : public QObject, public QDesignerCustomWidgetInterface {
    Q_OBJECT
    Q_PLUGIN_METADATA(IID "org.qt-project.Qt.QDesignerCustomWidgetInterface")
    Q_INTERFACES(QDesignerCustomWidgetInterface)

public:
    explicit ${pluginClass}(QObject* parent = nullptr) : QObject(parent) {}

    QString name() const override { return QStringLiteral("${widgetClass}"); }
    QString group() const override { return QStringLiteral("${groupName}"); }
    QIcon icon() const override { return ${iconExpression}; }
    QString toolTip() const override { return QStringLiteral("${widgetName} generated by AnQst."); }
    QString whatsThis() const override { return QStringLiteral("${widgetName} generated by AnQst."); }
    bool isContainer() const override { return false; }
    QString includeFile() const override { return QStringLiteral("${widgetName}.h"); }
    QWidget* createWidget(QWidget* parent) override {
        auto* widget = new ${widgetClass}(parent);
        widget->setMinimumHeight(128);
        widget->setProperty("anqstDesignerContext", true);
        return widget;
    }
    bool isInitialized() const override { return true; }
    void initialize(QDesignerFormEditorInterface*) override {}

    QString domXml() const override {
        return QStringLiteral(
            "<ui language=\\"c++\\">\\n"
            "  <widget class=\\"${widgetClass}\\" name=\\"${widgetName.toLowerCase()}\\">\\n"
            "    <property name=\\"minimumSize\\">\\n"
            "      <size>\\n"
            "        <width>0</width>\\n"
            "        <height>128</height>\\n"
            "      </size>\\n"
            "    </property>\\n"
            "  </widget>\\n"
            "</ui>\\n");
    }
};

#include "${pluginClass}.moc"
`;
}

function renderQtDesignerPluginCMake(widgetName: string, hasIcon: boolean): string {
  const widgetTarget = `${widgetName}Widget`;
  const pluginTarget = `${widgetName}DesignerPlugin`;
  const resourceLine = hasIcon ? "    \"${CMAKE_CURRENT_LIST_DIR}/designerplugin.qrc\"\n" : "";
  return `cmake_minimum_required(VERSION 3.21)
project(${pluginTarget} LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

set(ANQST_PROJECT_ROOT "\${CMAKE_CURRENT_LIST_DIR}/../../../../../../..")
set(ANQST_WIDGET_DIR "\${CMAKE_CURRENT_LIST_DIR}/..")
set(ANQST_WEBBASE_DIR "" CACHE PATH "Path to AnQstWebBase source directory")

if(NOT EXISTS "\${ANQST_WIDGET_DIR}/CMakeLists.txt")
    message(FATAL_ERROR "Missing generated widget CMake project at \${ANQST_WIDGET_DIR}. Run 'anqst build' first.")
endif()

if(NOT ANQST_WEBBASE_DIR)
    foreach(candidate
        "\${ANQST_PROJECT_ROOT}/AnQstWidget/AnQstWebBase"
        "\${ANQST_PROJECT_ROOT}/../AnQstWidget/AnQstWebBase"
        "\${ANQST_PROJECT_ROOT}/../../AnQstWidget/AnQstWebBase"
        "\${ANQST_PROJECT_ROOT}/../../../AnQstWidget/AnQstWebBase")
        if(EXISTS "\${candidate}/CMakeLists.txt")
            set(ANQST_WEBBASE_DIR "\${candidate}")
            break()
        endif()
    endforeach()
endif()

if(NOT ANQST_WEBBASE_DIR OR NOT EXISTS "\${ANQST_WEBBASE_DIR}/CMakeLists.txt")
    message(FATAL_ERROR "Unable to locate AnQstWebBase sources. Set -DANQST_WEBBASE_DIR=<path/to/AnQstWidget/AnQstWebBase>.")
endif()

find_package(Qt5 REQUIRED COMPONENTS Core Widgets UiPlugin)

set(ANQSTWEBBASE_BUILD_TESTS OFF CACHE BOOL "Build AnQstWebBase unit tests" FORCE)
if(NOT TARGET anqstwebhostbase)
    add_subdirectory("\${ANQST_WEBBASE_DIR}" "\${CMAKE_CURRENT_BINARY_DIR}/anqstwebbase")
endif()

if(NOT TARGET ${widgetTarget})
    add_subdirectory("\${ANQST_WIDGET_DIR}" "\${CMAKE_CURRENT_BINARY_DIR}/generated-widget")
endif()

add_library(${pluginTarget} MODULE
    "\${CMAKE_CURRENT_LIST_DIR}/${pluginTarget}.cpp"
${resourceLine})
target_include_directories(${pluginTarget}
    PRIVATE
        "\${ANQST_WIDGET_DIR}"
        "\${ANQST_WIDGET_DIR}/include"
)
target_link_libraries(${pluginTarget}
    PRIVATE
        ${widgetTarget}
        Qt5::Core
        Qt5::Widgets
        Qt5::UiPlugin
)
set_target_properties(${pluginTarget} PROPERTIES
    PREFIX ""
)
`;
}

export function installQtDesignerPluginCMake(cwd: string, widgetName: string, options: InstallQtDesignerPluginOptions = {}): void {
  const pluginDir = resolveGeneratedLayoutPaths(cwd, widgetName).designerPluginRoot;
  fs.mkdirSync(pluginDir, { recursive: true });
  const assets = installDesignerPluginIconAssets(cwd, pluginDir);
  const pluginTarget = `${widgetName}DesignerPlugin`;
  const widgetCategory = options.widgetCategory ?? "AnQst Widgets";
  fs.writeFileSync(
    path.join(pluginDir, "CMakeLists.txt"),
    withBuildStamp(
      `backend/cpp/qt/${generatedCppLibraryDirName(widgetName)}/designerPlugin/CMakeLists.txt`,
      renderQtDesignerPluginCMake(widgetName, assets.hasIcon)
    ),
    "utf8"
  );
  fs.writeFileSync(
    path.join(pluginDir, `${pluginTarget}.cpp`),
    withBuildStamp(
      `backend/cpp/qt/${generatedCppLibraryDirName(widgetName)}/designerPlugin/${pluginTarget}.cpp`,
      renderQtDesignerPluginCpp(widgetName, widgetCategory, assets.hasIcon)
    ),
    "utf8"
  );
}
