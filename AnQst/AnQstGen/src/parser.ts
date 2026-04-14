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

function textToEntityName(text: string): ts.EntityName {
  const parts = text.split(".");
  let current: ts.EntityName = ts.factory.createIdentifier(parts[0] ?? text);
  for (const part of parts.slice(1)) {
    current = ts.factory.createQualifiedName(current, ts.factory.createIdentifier(part));
  }
  return current;
}

function textToExpressionName(text: string): ts.Expression {
  const parts = text.split(".");
  let current: ts.Expression = ts.factory.createIdentifier(parts[0] ?? text);
  for (const part of parts.slice(1)) {
    current = ts.factory.createPropertyAccessExpression(current, ts.factory.createIdentifier(part));
  }
  return current;
}

function collectReferencedTypeNames(node: ts.Node): string[] {
  const refs = new Set<string>();
  const visit = (n: ts.Node): void => {
    if (ts.isTypeReferenceNode(n)) {
      refs.add(qNameToText(n.typeName));
    } else if (ts.isExpressionWithTypeArguments(n) && ts.isIdentifier(n.expression)) {
      refs.add(n.expression.text);
    } else if (ts.isTypeQueryNode(n)) {
      refs.add(qNameToText(n.exprName));
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
  if (!["Call", "Slot", "Emitter", "Output", "Input", "DropTarget", "HoverTarget"].includes(kind)) return null;

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
  if (!["Call", "Slot", "Emitter", "Output", "Input", "DropTarget", "HoverTarget"].includes(kind)) return null;
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
    configTypeNode: (kind === "Call" || kind === "HoverTarget") ? (typeArgs[1] ?? null) : null
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

const DEFAULT_HOVER_RATE_HZ = 60;
const DEFAULT_HOVER_THROTTLE_MS = Math.round(1000 / DEFAULT_HOVER_RATE_HZ);

function resolveHoverThrottleMs(
  source: ts.SourceFile,
  serviceName: string,
  memberName: string,
  kind: ServiceMemberKind,
  configTypeNode: ts.TypeNode | null,
  warnings: SpecWarning[],
  memberLoc: SourceLoc
): number {
  if (kind !== "HoverTarget") return 0;
  if (!configTypeNode) return DEFAULT_HOVER_THROTTLE_MS;
  if (!ts.isTypeLiteralNode(configTypeNode)) {
    throw new VerifyError(
      `HoverTarget config for '${memberName}' must be an inline object literal type.`,
      locFromNode(source, configTypeNode)
    );
  }
  let maxRateHz: number | null = null;
  const memberPath = `${serviceName}.${memberName}`;
  for (const prop of configTypeNode.members) {
    if (!ts.isPropertySignature(prop) || !prop.name) {
      throw new VerifyError(`HoverTarget config for '${memberName}' only supports named properties.`, locFromNode(source, prop));
    }
    if (!ts.isIdentifier(prop.name)) {
      throw new VerifyError(`HoverTarget config for '${memberName}' only supports identifier keys.`, locFromNode(source, prop.name));
    }
    const key = prop.name.text;
    if (!prop.type) {
      throw new VerifyError(`HoverTarget config key '${key}' in '${memberName}' must declare a numeric literal value.`, locFromNode(source, prop));
    }
    if (key !== "maxRateHz") {
      warnings.push({
        severity: "warn",
        message: `Unknown HoverTarget config key '${key}' ignored for '${memberPath}'.`,
        loc: locFromNode(source, prop.name),
        memberPath
      });
      continue;
    }
    const numericValue = parseNumericLiteralType(prop.type);
    if (numericValue === null || !Number.isFinite(numericValue)) {
      throw new VerifyError(
        `HoverTarget config key '${key}' in '${memberName}' must be a numeric literal >= 0.`,
        locFromNode(source, prop.type)
      );
    }
    if (numericValue < 0) {
      throw new VerifyError(
        `HoverTarget config key '${key}' in '${memberName}' must be >= 0.`,
        locFromNode(source, prop.type)
      );
    }
    maxRateHz = numericValue;
  }
  if (maxRateHz === null) return DEFAULT_HOVER_THROTTLE_MS;
  return maxRateHz === 0 ? 0 : Math.round(1000 / maxRateHz);
}

function parseServiceMember(source: ts.SourceFile, serviceName: string, member: ts.TypeElement, warnings: SpecWarning[]): ServiceMemberModel {
  if (ts.isMethodSignature(member)) {
    if (member.questionToken) throw new VerifyError("Optional service methods are not allowed.", locFromNode(source, member));
    const returnType = member.type;
    if (!returnType) throw new VerifyError("Service method must declare return type.", locFromNode(source, member));
    const parsed = parseMemberKindWithConfig(returnType);
    if (!parsed) throw new VerifyError(`Unsupported service method return type '${returnType.getText()}'.`, locFromNode(source, member));
    if (parsed.kind === "Input" || parsed.kind === "Output" || parsed.kind === "DropTarget" || parsed.kind === "HoverTarget") {
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
      hoverThrottleMs: 0,
      loc: locFromNode(source, member)
    };
  }

  if (ts.isPropertySignature(member)) {
    if (!member.type) throw new VerifyError("Service property must declare type.", locFromNode(source, member));
    if (member.questionToken) throw new VerifyError("Optional service properties are not allowed.", locFromNode(source, member));
    const parsed = parseMemberKindWithConfig(member.type);
    if (!parsed) throw new VerifyError(`Unsupported service property type '${member.type.getText()}'.`, locFromNode(source, member));
    if (parsed.kind !== "Input" && parsed.kind !== "Output" && parsed.kind !== "DropTarget" && parsed.kind !== "HoverTarget") {
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
    const hoverThrottleMs = resolveHoverThrottleMs(
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
      hoverThrottleMs,
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

function collectTopLevelTypeDecls(
  source: ts.SourceFile
): Map<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration> {
  const out = new Map<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration>();
  for (const stmt of source.statements) {
    if ((ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) && stmt.name) {
      out.set(stmt.name.text, stmt);
    }
  }
  return out;
}

function collectReachableImportedTypeNames(
  topLevelDecls: ReadonlyMap<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration>,
  rootNames: Iterable<string>
): string[] {
  const queue = [...rootNames];
  const seen = new Set<string>();
  const ordered: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    const node = topLevelDecls.get(current);
    if (!node) continue;
    ordered.push(current);
    const decl = {
      referencedTypeNames: collectReferencedTypeNames(node)
    };
    for (const ref of decl.referencedTypeNames) {
      if (topLevelDecls.has(ref) && !seen.has(ref)) {
        queue.push(ref);
      }
    }
  }
  return ordered;
}

function allocateSyntheticImportedTypeName(sourceName: string, usedNames: Set<string>): string {
  const cleaned = sourceName
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const base = `AnQstImported_${cleaned || "Type"}`;
  let candidate = base;
  let i = 2;
  while (usedNames.has(candidate)) {
    candidate = `${base}_${i}`;
    i += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

function rewriteImportedTypeDecl(
  importedSource: ts.SourceFile,
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
  finalName: string,
  nameMap: ReadonlyMap<string, string>
): TypeDeclModel {
  const renamed = ts.isInterfaceDeclaration(node)
    ? ts.factory.updateInterfaceDeclaration(
      node,
      node.modifiers,
      ts.factory.createIdentifier(finalName),
      node.typeParameters,
      node.heritageClauses,
      node.members
    )
    : ts.factory.updateTypeAliasDeclaration(
      node,
      node.modifiers,
      ts.factory.createIdentifier(finalName),
      node.typeParameters,
      node.type
    );
  const transformed = ts.transform(renamed, [(context): ts.Transformer<ts.InterfaceDeclaration | ts.TypeAliasDeclaration> => {
    const visitor: ts.Visitor = (child) => {
      if (ts.isTypeReferenceNode(child)) {
        const mapped = nameMap.get(qNameToText(child.typeName));
        if (mapped) {
          return ts.factory.updateTypeReferenceNode(child, textToEntityName(mapped), child.typeArguments);
        }
      } else if (ts.isExpressionWithTypeArguments(child)) {
      const exprText = ts.isIdentifier(child.expression) || ts.isPropertyAccessExpression(child.expression)
        ? child.expression.getText(importedSource)
        : null;
      const mapped = exprText ? nameMap.get(exprText) : null;
      if (mapped) {
        return ts.factory.updateExpressionWithTypeArguments(child, textToExpressionName(mapped), child.typeArguments);
      }
    } else if (ts.isTypeQueryNode(child)) {
      const mapped = nameMap.get(qNameToText(child.exprName));
      if (mapped) {
        return ts.factory.updateTypeQueryNode(child, textToEntityName(mapped), child.typeArguments);
      }
    }
    return ts.visitEachChild(child, visitor, context);
  };
    return (root) => ts.visitNode(root, visitor) as ts.InterfaceDeclaration | ts.TypeAliasDeclaration;
  }]);
  const rewritten = transformed.transformed[0] as ts.InterfaceDeclaration | ts.TypeAliasDeclaration;
  transformed.dispose();
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const rewrittenSource = ts.createSourceFile("__anqst_imported_decl.ts", "", ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const nodeText = printer.printNode(ts.EmitHint.Unspecified, rewritten, rewrittenSource);
  return {
    name: finalName,
    kind: ts.isInterfaceDeclaration(rewritten) ? "interface" : "type",
    nodeText,
    referencedTypeNames: collectReferencedTypeNames(rewritten),
    loc: locFromNode(importedSource, node)
  };
}

function createImportedAliasDecl(aliasName: string, targetName: string, loc: SourceLoc): TypeDeclModel {
  const nodeText = `type ${aliasName} = ${targetName};`;
  const source = ts.createSourceFile("__anqst_import_alias.ts", nodeText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const stmt = source.statements.find(ts.isTypeAliasDeclaration);
  if (!stmt) {
    throw new Error(`Unable to synthesize imported alias declaration for ${aliasName}.`);
  }
  return {
    name: aliasName,
    kind: "type",
    nodeText,
    referencedTypeNames: collectReferencedTypeNames(stmt),
    loc
  };
}

function parseImportedTypeDecls(
  specFilePath: string,
  source: ts.SourceFile,
  reservedTypeNames: ReadonlySet<string> = new Set<string>()
): {
  importedTypeDecls: Map<string, TypeDeclModel>;
  importedTypeSymbols: Set<string>;
  specImports: SpecImportModel[];
} {
  const importedTypeDecls = new Map<string, TypeDeclModel>();
  const importedTypeSymbols = new Set<string>();
  const specImports: SpecImportModel[] = [];
  const usedImportedNames = new Set<string>(reservedTypeNames);

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
    const topLevelDecls = collectTopLevelTypeDecls(importedSource);
    const directAliasesBySourceName = new Map<string, string[]>();
    for (const namedImport of importModel.namedImports) {
      if (!topLevelDecls.has(namedImport.importedName)) continue;
      const aliases = directAliasesBySourceName.get(namedImport.importedName) ?? [];
      aliases.push(namedImport.localName);
      directAliasesBySourceName.set(namedImport.importedName, aliases);
    }

    const reachableSourceNames = collectReachableImportedTypeNames(topLevelDecls, directAliasesBySourceName.keys());
    if (reachableSourceNames.length === 0) continue;

    const canonicalNameBySourceName = new Map<string, string>();
    for (const sourceName of reachableSourceNames) {
      const directAliases = directAliasesBySourceName.get(sourceName);
      if (directAliases && directAliases.length > 0) {
        canonicalNameBySourceName.set(sourceName, directAliases[0]);
        usedImportedNames.add(directAliases[0]);
      } else {
        canonicalNameBySourceName.set(sourceName, allocateSyntheticImportedTypeName(sourceName, usedImportedNames));
      }
    }

    for (const sourceName of reachableSourceNames) {
      const node = topLevelDecls.get(sourceName);
      const finalName = canonicalNameBySourceName.get(sourceName);
      if (!node || !finalName) continue;
      importedTypeDecls.set(finalName, rewriteImportedTypeDecl(importedSource, node, finalName, canonicalNameBySourceName));
      const directAliases = directAliasesBySourceName.get(sourceName) ?? [];
      for (const alias of directAliases.slice(1)) {
        importedTypeDecls.set(alias, createImportedAliasDecl(alias, finalName, locFromNode(importedSource, node)));
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

  const importInfo = parseImportedTypeDecls(specFilePath, source, new Set(namespaceTypeDecls.map((decl) => decl.name)));

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
