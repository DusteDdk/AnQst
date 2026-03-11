import ts from "typescript";
import { VerifyError } from "./errors";
import type { ParsedSpecModel, ServiceMemberModel, SpecWarning, TypeDeclModel, VerificationStats } from "./model";
import { getProgramDiagnostics } from "./program";

export interface VerificationResult {
  stats: VerificationStats;
  message: string;
  warnings: SpecWarning[];
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
  if (!stmt) throw new VerifyError(`Unable to parse type: ${typeText}`);
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

function checkForbiddenTypeNodes(typeNode: ts.TypeNode): string | null {
  let forbidden: string | null = null;
  const visit = (node: ts.Node): void => {
    if (forbidden) return;
    if (node.kind === ts.SyntaxKind.AnyKeyword) forbidden = "any";
    else if (node.kind === ts.SyntaxKind.UnknownKeyword) forbidden = "unknown";
    else if (node.kind === ts.SyntaxKind.NeverKeyword) forbidden = "never";
    else if (node.kind === ts.SyntaxKind.SymbolKeyword) forbidden = "symbol";
    else if (ts.isFunctionTypeNode(node)) forbidden = "function type";
    else if (ts.isTypeReferenceNode(node) && qNameText(node.typeName) === "Promise") forbidden = "Promise";
    ts.forEachChild(node, visit);
  };
  visit(typeNode);
  return forbidden;
}

function checkServiceMember(member: ServiceMemberModel): void {
  if (member.payloadTypeText && member.kind === "Call") {
    const payload = parseTypeNodeFromText(member.payloadTypeText);
    const refs = typeRefs(payload);
    if (refs.includes("Promise")) {
      throw new VerifyError(`Promise is not allowed inside ${member.kind}<T> payload for '${member.name}'.`, member.loc);
    }
  }
  if (member.payloadTypeText) {
    const node = parseTypeNodeFromText(member.payloadTypeText);
    const forbidden = checkForbiddenTypeNodes(node);
    if (forbidden) {
      throw new VerifyError(`Forbidden type '${forbidden}' in payload of '${member.name}'.`, member.loc);
    }
  }
  for (const parameter of member.parameters) {
    const node = parseTypeNodeFromText(parameter.typeText);
    const forbidden = checkForbiddenTypeNodes(node);
    if (forbidden) {
      throw new VerifyError(`Forbidden type '${forbidden}' in parameter '${parameter.name}' of '${member.name}'.`, member.loc);
    }
  }
}

function checkServiceDuplicates(spec: ParsedSpecModel): void {
  const globalMemberToService = new Map<string, string>();
  for (const service of spec.services) {
    const byName = new Map<string, ServiceMemberModel[]>();
    for (const member of service.members) {
      const list = byName.get(member.name) ?? [];
      list.push(member);
      byName.set(member.name, list);
      const ownerService = globalMemberToService.get(member.name);
      if (ownerService && ownerService !== service.name) {
        throw new VerifyError(
          `Duplicate member name '${member.name}' across services ('${ownerService}' and '${service.name}') is invalid.`,
          member.loc
        );
      }
      if (!ownerService) {
        globalMemberToService.set(member.name, service.name);
      }
    }
    for (const [name, list] of byName) {
      if (list.length > 1) {
        throw new VerifyError(`Duplicate method signature '${name}' is invalid.`, list[1].loc);
      }
    }
  }
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
    "Record",
    "Partial",
    "Readonly",
    "Date"
  ].includes(ref);
}

function resolveRefsOrThrow(spec: ParsedSpecModel, refs: string[], ctxLoc: TypeDeclModel["loc"], context: string): void {
  const local = new Set(spec.namespaceTypeDecls.map((d) => d.name));
  const imported = spec.importedTypeDecls;
  for (const ref of refs) {
    if (isBuiltinOrLiteral(ref)) continue;
    if (ref.startsWith("AnQst.")) continue;
    if (local.has(ref)) continue;
    if (imported.has(ref)) continue;
    const namespacePrefix = ref.split(".")[0];
    if (spec.importedTypeSymbols.has(namespacePrefix)) continue;
    throw new VerifyError(`Unresolved type reference '${ref}' in ${context}.`, ctxLoc);
  }
}

function collectReachableTypeNames(spec: ParsedSpecModel): Set<string> {
  const allDecls = new Map<string, TypeDeclModel>();
  for (const d of spec.namespaceTypeDecls) allDecls.set(d.name, d);
  for (const [name, d] of spec.importedTypeDecls) allDecls.set(name, d);

  const queue: string[] = [];
  const seen = new Set<string>();
  for (const d of spec.namespaceTypeDecls) queue.push(d.name);
  for (const service of spec.services) {
    for (const member of service.members) {
      const texts = [...member.parameters.map((p) => p.typeText)];
      if (member.payloadTypeText) texts.push(member.payloadTypeText);
      for (const typeText of texts) {
        const refs = typeRefs(parseTypeNodeFromText(typeText));
        for (const ref of refs) {
          if (!isBuiltinOrLiteral(ref) && !ref.startsWith("AnQst.")) queue.push(ref);
        }
      }
    }
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const decl = allDecls.get(cur);
    if (!decl) continue;
    for (const ref of decl.referencedTypeNames) {
      if (!isBuiltinOrLiteral(ref) && !ref.startsWith("AnQst.") && !seen.has(ref)) {
        queue.push(ref);
      }
    }
  }
  return seen;
}

function verifySpecSemantics(spec: ParsedSpecModel): VerificationResult {
  checkServiceDuplicates(spec);

  for (const service of spec.services) {
    for (const member of service.members) {
      checkServiceMember(member);
      const texts = [...member.parameters.map((p) => p.typeText)];
      if (member.payloadTypeText) texts.push(member.payloadTypeText);
      for (const typeText of texts) {
        const refs = typeRefs(parseTypeNodeFromText(typeText));
        resolveRefsOrThrow(spec, refs, member.loc, `service member '${member.name}'`);
      }
    }
  }

  for (const decl of spec.namespaceTypeDecls) {
    resolveRefsOrThrow(spec, decl.referencedTypeNames, decl.loc, `type declaration '${decl.name}'`);
  }

  const reachable = collectReachableTypeNames(spec);
  const stats: VerificationStats = {
    namespaceDeclaredTypes: spec.namespaceTypeDecls.length,
    reachableGeneratedTypes: reachable.size,
    serviceCount: spec.services.length
  };
  const warnings = [...spec.warnings];
  const warningSummary = warnings.length === 0
    ? ""
    : `\nWarnings:\n${warnings.map((w) => `    [warn] ${w.loc.file}:${w.loc.line}:${w.loc.column} ${w.memberPath} - ${w.message}`).join("\n")}`;
  return {
    stats,
    message: `AnQst spec valid:\n    ${stats.namespaceDeclaredTypes} types.\n    ${stats.serviceCount} services.${warningSummary}`,
    warnings
  };
}

export function verifySpec(spec: ParsedSpecModel): VerificationResult {
  const diagnostics = getProgramDiagnostics(spec.filePath);
  if (diagnostics.length > 0) {
    throw new VerifyError(`TypeScript diagnostics in spec:\n    ${diagnostics.join("\n    ")}`);
  }
  return verifySpecSemantics(spec);
}
