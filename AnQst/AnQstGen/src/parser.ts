import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { VerifyError } from "./errors";
import type {
  ParsedSpecModel,
  SpecWarning,
  SpecImportModel,
  ParameterModel,
  ServiceMemberKind,
  ServiceMemberModel,
  ServiceModel,
  SourceLoc,
  TypeDeclModel
} from "./model";
import { createTscProgramContext } from "./program";
import { applyResolvedTypeGraph } from "./typegraph";
import { inspectText, isDebugEnabled, writeDebugFile } from "./debug-dump";

function locFromNode(source: ts.SourceFile, node: ts.Node): SourceLoc {
  const lc = source.getLineAndCharacterOfPosition(node.getStart(source));
  return {
    file: source.fileName,
    line: lc.line + 1,
    column: lc.character + 1
  };
}

function qNameToText(name: ts.EntityName): string {
  if (ts.isIdentifier(name)) return name.text;
  return `${qNameToText(name.left)}.${name.right.text}`;
}

function collectReferencedTypeNames(node: ts.Node): string[] {
  const refs = new Set<string>();
  const visit = (n: ts.Node): void => {
    if (ts.isTypeReferenceNode(n)) {
      refs.add(qNameToText(n.typeName));
    } else if (ts.isExpressionWithTypeArguments(n) && ts.isIdentifier(n.expression)) {
      refs.add(n.expression.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return [...refs];
}

function parseTypeDecl(source: ts.SourceFile, node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration): TypeDeclModel {
  const name = node.name.text;
  return {
    name,
    kind: ts.isInterfaceDeclaration(node) ? "interface" : "type",
    nodeText: node.getText(source),
    referencedTypeNames: collectReferencedTypeNames(node),
    loc: locFromNode(source, node)
  };
}

function parseMemberKindFromAnQstType(typeNode: ts.TypeNode): { kind: ServiceMemberKind; payload: string | null } | null {
  if (!ts.isTypeReferenceNode(typeNode)) return null;
  const typeName = qNameToText(typeNode.typeName);
  if (!typeName.startsWith("AnQst.")) return null;

  const kind = typeName.slice("AnQst.".length) as ServiceMemberKind;
  if (!["Call", "Slot", "Emitter", "Output", "Input"].includes(kind)) return null;

  if (kind === "Emitter") return { kind, payload: null };
  const arg = typeNode.typeArguments?.[0];
  return { kind, payload: arg ? arg.getText() : null };
}

interface ParsedMemberKind {
  kind: ServiceMemberKind;
  payload: string | null;
  configTypeNode: ts.TypeNode | null;
}

const DEFAULT_MEMBER_TIMEOUT_MS = 120000;
const MAX_MEMBER_TIMEOUT_MS = 2147483647;

function parseMemberKindWithConfig(typeNode: ts.TypeNode): ParsedMemberKind | null {
  if (!ts.isTypeReferenceNode(typeNode)) return null;
  const typeName = qNameToText(typeNode.typeName);
  if (!typeName.startsWith("AnQst.")) return null;
  const kind = typeName.slice("AnQst.".length) as ServiceMemberKind;
  if (!["Call", "Slot", "Emitter", "Output", "Input"].includes(kind)) return null;
  const typeArgs = typeNode.typeArguments ?? [];
  if (kind === "Emitter") {
    return {
      kind,
      payload: null,
      configTypeNode: typeArgs[0] ?? null
    };
  }
  return {
    kind,
    payload: typeArgs[0] ? typeArgs[0].getText() : null,
    configTypeNode: kind === "Call" ? (typeArgs[1] ?? null) : null
  };
}

function parseNumericLiteralType(node: ts.TypeNode): number | null {
  if (!ts.isLiteralTypeNode(node)) return null;
  if (ts.isNumericLiteral(node.literal)) {
    return Number(node.literal.text);
  }
  if (
    ts.isPrefixUnaryExpression(node.literal)
    && node.literal.operator === ts.SyntaxKind.MinusToken
    && ts.isNumericLiteral(node.literal.operand)
  ) {
    return -Number(node.literal.operand.text);
  }
  return null;
}

function resolveMemberTimeoutMs(
  source: ts.SourceFile,
  serviceName: string,
  memberName: string,
  kind: ServiceMemberKind,
  configTypeNode: ts.TypeNode | null,
  warnings: SpecWarning[],
  memberLoc: SourceLoc
): number {
  if (kind !== "Call") return DEFAULT_MEMBER_TIMEOUT_MS;
  if (!configTypeNode) return DEFAULT_MEMBER_TIMEOUT_MS;
  if (!ts.isTypeLiteralNode(configTypeNode)) {
    throw new VerifyError(
      `${kind} config for '${memberName}' must be an inline object literal type.`,
      locFromNode(source, configTypeNode)
    );
  }
  let timeoutSeconds: number | null = null;
  let timeoutMilliseconds: number | null = null;
  const memberPath = `${serviceName}.${memberName}`;
  for (const prop of configTypeNode.members) {
    if (!ts.isPropertySignature(prop) || !prop.name) {
      throw new VerifyError(`${kind} config for '${memberName}' only supports named properties.`, locFromNode(source, prop));
    }
    if (!ts.isIdentifier(prop.name)) {
      throw new VerifyError(`${kind} config for '${memberName}' only supports identifier keys.`, locFromNode(source, prop.name));
    }
    const key = prop.name.text;
    if (!prop.type) {
      throw new VerifyError(`${kind} config key '${key}' in '${memberName}' must declare a numeric literal value.`, locFromNode(source, prop));
    }
    if (key !== "timeoutSeconds" && key !== "timeoutMilliseconds") {
      warnings.push({
        severity: "warn",
        message: `Unknown ${kind} config key '${key}' ignored for '${memberPath}'.`,
        loc: locFromNode(source, prop.name),
        memberPath
      });
      continue;
    }
    const numericValue = parseNumericLiteralType(prop.type);
    if (numericValue === null || !Number.isInteger(numericValue)) {
      throw new VerifyError(
        `${kind} config key '${key}' in '${memberName}' must be an integer literal >= 0.`,
        locFromNode(source, prop.type)
      );
    }
    if (numericValue < 0) {
      throw new VerifyError(
        `${kind} config key '${key}' in '${memberName}' must be >= 0.`,
        locFromNode(source, prop.type)
      );
    }
    if (key === "timeoutSeconds") timeoutSeconds = numericValue;
    if (key === "timeoutMilliseconds") timeoutMilliseconds = numericValue;
  }
  if (timeoutSeconds !== null && timeoutMilliseconds !== null) {
    throw new VerifyError(
      `${kind} config for '${memberName}' must specify only one of 'timeoutSeconds' or 'timeoutMilliseconds'.`,
      memberLoc
    );
  }
  const effectiveMs = timeoutMilliseconds !== null
    ? timeoutMilliseconds
    : timeoutSeconds !== null
      ? timeoutSeconds * 1000
      : DEFAULT_MEMBER_TIMEOUT_MS;
  if (effectiveMs > MAX_MEMBER_TIMEOUT_MS) {
    throw new VerifyError(
      `${kind} timeout for '${memberName}' exceeds max supported value (${MAX_MEMBER_TIMEOUT_MS} ms).`,
      memberLoc
    );
  }
  return effectiveMs;
}

function parseServiceMember(source: ts.SourceFile, serviceName: string, member: ts.TypeElement, warnings: SpecWarning[]): ServiceMemberModel {
  if (ts.isMethodSignature(member)) {
    if (member.questionToken) throw new VerifyError("Optional service methods are not allowed.", locFromNode(source, member));
    const returnType = member.type;
    if (!returnType) throw new VerifyError("Service method must declare return type.", locFromNode(source, member));
    const parsed = parseMemberKindWithConfig(returnType);
    if (!parsed) throw new VerifyError(`Unsupported service method return type '${returnType.getText()}'.`, locFromNode(source, member));
    if (parsed.kind === "Input" || parsed.kind === "Output") {
      throw new VerifyError(`${parsed.kind} must be declared as property, not method.`, locFromNode(source, member));
    }
    if (parsed.kind === "Emitter" && parsed.configTypeNode !== null) {
      throw new VerifyError(
        `Emitter '${member.name.getText(source)}' does not support config parameters; use plain AnQst.Emitter.`,
        locFromNode(source, parsed.configTypeNode)
      );
    }
    if (!member.name || !ts.isIdentifier(member.name)) {
      throw new VerifyError("Only identifier service method names are supported.", locFromNode(source, member));
    }
    const parameters: ParameterModel[] = member.parameters.map((param) => {
      if (param.dotDotDotToken) throw new VerifyError("Rest parameters are not allowed in service methods.", locFromNode(source, param));
      if (!ts.isIdentifier(param.name)) throw new VerifyError("Only identifier parameter names are supported.", locFromNode(source, param));
      if (!param.type) throw new VerifyError("Service parameters must declare type.", locFromNode(source, param));
      return { name: param.name.text, typeText: param.type.getText() };
    });
    const timeoutMs = resolveMemberTimeoutMs(
      source,
      serviceName,
      member.name.text,
      parsed.kind,
      parsed.configTypeNode,
      warnings,
      locFromNode(source, member)
    );
    return {
      kind: parsed.kind,
      name: member.name.text,
      payloadTypeText: parsed.payload,
      parameters,
      timeoutMs,
      loc: locFromNode(source, member)
    };
  }

  if (ts.isPropertySignature(member)) {
    if (!member.type) throw new VerifyError("Service property must declare type.", locFromNode(source, member));
    if (member.questionToken) throw new VerifyError("Optional service properties are not allowed.", locFromNode(source, member));
    const parsed = parseMemberKindWithConfig(member.type);
    if (!parsed) throw new VerifyError(`Unsupported service property type '${member.type.getText()}'.`, locFromNode(source, member));
    if (parsed.kind !== "Input" && parsed.kind !== "Output") {
      throw new VerifyError(`${parsed.kind} must be declared as method, not property.`, locFromNode(source, member));
    }
    if (!member.name || !ts.isIdentifier(member.name)) {
      throw new VerifyError("Only identifier service property names are supported.", locFromNode(source, member));
    }
    const timeoutMs = resolveMemberTimeoutMs(
      source,
      serviceName,
      member.name.text,
      parsed.kind,
      parsed.configTypeNode,
      warnings,
      locFromNode(source, member)
    );
    return {
      kind: parsed.kind,
      name: member.name.text,
      payloadTypeText: parsed.payload,
      parameters: [],
      timeoutMs,
      loc: locFromNode(source, member)
    };
  }

  throw new VerifyError("Unsupported service member declaration.", locFromNode(source, member));
}

function tryResolveImportFile(specFilePath: string, moduleName: string): string | null {
  const baseDir = path.dirname(specFilePath);
  const candidates: string[] = [];
  const pushCandidates = (p: string): void => {
    candidates.push(p, `${p}.d.ts`, `${p}.ts`, path.join(p, "index.d.ts"), path.join(p, "index.ts"));
  };
  if (moduleName.startsWith(".") || moduleName.startsWith("/")) {
    pushCandidates(path.resolve(baseDir, moduleName));
  } else {
    // Support path-like bare spec imports (e.g. types/exchange) relative to spec file dir.
    pushCandidates(path.resolve(baseDir, moduleName));
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function requiresLocalImportResolution(moduleName: string): boolean {
  if (moduleName.startsWith(".") || moduleName.startsWith("/")) return true;
  if (moduleName.startsWith("@")) return false;
  return moduleName.includes("/");
}

function parseImportedTypeDecls(specFilePath: string, source: ts.SourceFile): {
  importedTypeDecls: Map<string, TypeDeclModel>;
  importedTypeSymbols: Set<string>;
  specImports: SpecImportModel[];
} {
  const importedTypeDecls = new Map<string, TypeDeclModel>();
  const importedTypeSymbols = new Set<string>();
  const specImports: SpecImportModel[] = [];

  for (const stmt of source.statements) {
    if (!ts.isImportDeclaration(stmt) || !stmt.importClause || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const moduleName = stmt.moduleSpecifier.text;
    const importModel: SpecImportModel = {
      moduleSpecifier: moduleName,
      defaultImport: null,
      namedImports: []
    };

    if (stmt.importClause.name) {
      importedTypeSymbols.add(stmt.importClause.name.text);
      importModel.defaultImport = stmt.importClause.name.text;
    }

    const bindings = stmt.importClause.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const el of bindings.elements) {
        importedTypeSymbols.add((el.propertyName ?? el.name).text);
        importedTypeSymbols.add(el.name.text);
        importModel.namedImports.push({
          importedName: (el.propertyName ?? el.name).text,
          localName: el.name.text
        });
      }
    } else if (bindings && ts.isNamespaceImport(bindings)) {
      throw new VerifyError(
        "Namespace imports ('import * as X') are not allowed in AnQst spec files.",
        locFromNode(source, bindings)
      );
    }
    specImports.push(importModel);

    const resolved = tryResolveImportFile(specFilePath, moduleName);
    if (!resolved) {
      if (requiresLocalImportResolution(moduleName)) {
        throw new VerifyError(
          `Unable to resolve import '${moduleName}' from spec file.`,
          locFromNode(source, stmt.moduleSpecifier)
        );
      }
      continue;
    }

    const text = fs.readFileSync(resolved, "utf8");
    const importedSource = ts.createSourceFile(resolved, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    for (const importedStmt of importedSource.statements) {
      if (ts.isInterfaceDeclaration(importedStmt) || ts.isTypeAliasDeclaration(importedStmt)) {
        const decl = parseTypeDecl(importedSource, importedStmt);
        importedTypeDecls.set(decl.name, decl);
      }
    }
  }

  return { importedTypeDecls, importedTypeSymbols, specImports };
}

function serviceBaseType(iface: ts.InterfaceDeclaration): "Service" | "AngularHTTPBaseServerClass" | null {
  if (!iface.heritageClauses) return null;
  for (const clause of iface.heritageClauses) {
    if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
    for (const t of clause.types) {
      if (t.expression.getText() === "AnQst.Service") return "Service";
      if (t.expression.getText() === "AnQst.AngularHTTPBaseServerClass") return "AngularHTTPBaseServerClass";
    }
  }
  return null;
}

function parseSpecFileAst(specFilePath: string): ParsedSpecModel {
  if (!fs.existsSync(specFilePath)) throw new VerifyError(`Spec file does not exist: ${specFilePath}`);
  const text = fs.readFileSync(specFilePath, "utf8");
  const source = ts.createSourceFile(specFilePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const namespaces = source.statements.filter((s): s is ts.ModuleDeclaration => ts.isModuleDeclaration(s));
  if (namespaces.length !== 1) throw new VerifyError("Spec must declare exactly one top-level namespace.");
  const ns = namespaces[0];
  if (!ts.isIdentifier(ns.name)) throw new VerifyError("Namespace name must be an identifier.", locFromNode(source, ns));
  const hasDeclare = !!ns.modifiers?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword);
  if (!hasDeclare) throw new VerifyError("Top-level namespace must be declared with 'declare namespace'.", locFromNode(source, ns));
  if (!ns.body || !ts.isModuleBlock(ns.body)) throw new VerifyError("Namespace body must be a block.", locFromNode(source, ns));

  const services: ServiceModel[] = [];
  const namespaceTypeDecls: TypeDeclModel[] = [];
  const warnings: SpecWarning[] = [];
  let supportsDevelopmentModeTransport = false;

  for (const stmt of ns.body.statements) {
    if (ts.isInterfaceDeclaration(stmt)) {
      const baseType = serviceBaseType(stmt);
      if (baseType !== null) {
        const members = stmt.members.map((member) => parseServiceMember(source, stmt.name.text, member, warnings));
        if (baseType === "AngularHTTPBaseServerClass") {
          supportsDevelopmentModeTransport = true;
        }
        services.push({ name: stmt.name.text, baseType, members, loc: locFromNode(source, stmt) });
      } else {
        namespaceTypeDecls.push(parseTypeDecl(source, stmt));
      }
      continue;
    }
    if (ts.isTypeAliasDeclaration(stmt)) {
      namespaceTypeDecls.push(parseTypeDecl(source, stmt));
    }
  }

  const importInfo = parseImportedTypeDecls(specFilePath, source);

  return {
    filePath: specFilePath,
    widgetName: ns.name.text,
    services,
    supportsDevelopmentModeTransport,
    namespaceTypeDecls,
    importedTypeDecls: importInfo.importedTypeDecls,
    importedTypeSymbols: importInfo.importedTypeSymbols,
    specImports: importInfo.specImports,
    warnings
  };
}

export function parseSpecFile(specFilePath: string): ParsedSpecModel {
  createTscProgramContext(specFilePath);
  const parsed = parseSpecFileAst(specFilePath);
  if (isDebugEnabled()) {
    writeDebugFile(
      process.cwd(),
      "anqstmodel/parsed-before-typegraph.txt",
      `${inspectText(parsed)}\n`
    );
  }
  const normalized = applyResolvedTypeGraph(parsed);
  if (isDebugEnabled()) {
    writeDebugFile(
      process.cwd(),
      "anqstmodel/parsed-after-typegraph.txt",
      `${inspectText(normalized)}\n`
    );
  }
  return normalized;
}
