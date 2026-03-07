import ts from "typescript";
import type { ParameterModel, ParsedSpecModel, ServiceMemberModel, ServiceModel } from "../../model";
import { writeDebugFile } from "./debug-dump";
import { getTscProgramContext } from "./program";

interface MemberTypes {
  payloadTypeText: string | null;
  parameters: ParameterModel[];
}

type ServiceTypeMap = Map<string, MemberTypes>;

function qNameText(name: ts.EntityName): string {
  if (ts.isIdentifier(name)) return name.text;
  return `${qNameText(name.left)}.${name.right.text}`;
}

function serviceBaseType(iface: ts.InterfaceDeclaration): "Service" | "AngularHTTPBaseServerClass" | null {
  if (!iface.heritageClauses) return null;
  for (const clause of iface.heritageClauses) {
    if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
    for (const t of clause.types) {
      const text = t.expression.getText();
      if (text === "AnQst.Service") return "Service";
      if (text === "AnQst.AngularHTTPBaseServerClass") return "AngularHTTPBaseServerClass";
    }
  }
  return null;
}

function parseMemberKind(typeNode: ts.TypeNode): { kind: string; payloadNode: ts.TypeNode | null } | null {
  if (!ts.isTypeReferenceNode(typeNode)) return null;
  const name = qNameText(typeNode.typeName);
  if (!name.startsWith("AnQst.")) return null;
  const kind = name.slice("AnQst.".length);
  if (!["Call", "Slot", "Emitter", "Output", "Input"].includes(kind)) return null;
  if (kind === "Emitter") return { kind, payloadNode: null };
  return { kind, payloadNode: typeNode.typeArguments?.[0] ?? null };
}

function typeToString(checker: ts.TypeChecker, node: ts.TypeNode): string {
  const type = checker.getTypeFromTypeNode(node);
  const flags = ts.TypeFormatFlags.NoTruncation;

  if (ts.isTypeReferenceNode(node) && qNameText(node.typeName).endsWith(".infer") && node.typeArguments?.[0]) {
    const schemaType = checker.getTypeFromTypeNode(node.typeArguments[0]);
    const outputSymbol = schemaType.getProperty("_output") ?? schemaType.getProperty("_type");
    if (outputSymbol) {
      const outputType = checker.getTypeOfSymbolAtLocation(outputSymbol, node);
      const outputText = checker.typeToString(outputType, node, flags);
      if (outputText.trim().length > 0 && outputText !== "any" && outputText !== "unknown") {
        return outputText;
      }
    }
  }

  const direct = checker.typeToString(type, node, flags);
  if (!/(?:\bz\.infer<|typeof\s+)/.test(direct)) {
    return direct;
  }

  const apparent = checker.getApparentType(type);
  const apparentText = checker.typeToString(apparent, node, flags);
  if (!/(?:\bz\.infer<|typeof\s+)/.test(apparentText)) {
    return apparentText;
  }

  const structuralNode = checker.typeToTypeNode(
    apparent,
    node,
    ts.NodeBuilderFlags.NoTruncation |
      ts.NodeBuilderFlags.UseStructuralFallback |
      ts.NodeBuilderFlags.IgnoreErrors
  );
  if (structuralNode) {
    const structuralText = structuralNode.getText();
    if (structuralText.trim().length > 0) {
      return structuralText;
    }
  }

  return direct;
}

function collectServiceTypes(specPath: string): Map<string, ServiceTypeMap> {
  const { checker, sourceFile } = getTscProgramContext(specPath);
  const services = new Map<string, ServiceTypeMap>();
  for (const stmt of sourceFile.statements) {
    if (!ts.isModuleDeclaration(stmt) || !stmt.body || !ts.isModuleBlock(stmt.body)) continue;
    for (const member of stmt.body.statements) {
      if (!ts.isInterfaceDeclaration(member)) continue;
      if (serviceBaseType(member) === null) continue;
      const memberMap: ServiceTypeMap = new Map();
      for (const typeMember of member.members) {
        if (ts.isMethodSignature(typeMember) && typeMember.name && ts.isIdentifier(typeMember.name) && typeMember.type) {
          const parsed = parseMemberKind(typeMember.type);
          if (!parsed) continue;
          const payloadTypeText = parsed.payloadNode ? typeToString(checker, parsed.payloadNode) : null;
          const parameters = typeMember.parameters
            .filter((p): p is ts.ParameterDeclaration & { name: ts.Identifier; type: ts.TypeNode } => !!p.type && ts.isIdentifier(p.name))
            .map((p) => ({
              name: p.name.text,
              typeText: typeToString(checker, p.type)
            }));
          memberMap.set(typeMember.name.text, {
            payloadTypeText,
            parameters
          });
          continue;
        }
        if (ts.isPropertySignature(typeMember) && typeMember.name && ts.isIdentifier(typeMember.name) && typeMember.type) {
          const parsed = parseMemberKind(typeMember.type);
          if (!parsed) continue;
          const payloadTypeText = parsed.payloadNode ? typeToString(checker, parsed.payloadNode) : null;
          memberMap.set(typeMember.name.text, {
            payloadTypeText,
            parameters: []
          });
        }
      }
      services.set(member.name.text, memberMap);
    }
  }
  return services;
}

function renderServiceTypeMap(services: Map<string, ServiceTypeMap>): string {
  const lines: string[] = [];
  for (const [serviceName, memberMap] of services.entries()) {
    lines.push(`service ${serviceName}`);
    for (const [memberName, memberTypes] of memberMap.entries()) {
      lines.push(`  member ${memberName}`);
      lines.push(`    payloadTypeText: ${memberTypes.payloadTypeText ?? "(none)"}`);
      if (memberTypes.parameters.length === 0) {
        lines.push("    parameters: (none)");
      } else {
        lines.push("    parameters:");
        for (const parameter of memberTypes.parameters) {
          lines.push(`      - ${parameter.name}: ${parameter.typeText}`);
        }
      }
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function applyServiceMemberTypes(member: ServiceMemberModel, memberTypes: MemberTypes | undefined): ServiceMemberModel {
  if (!memberTypes) return member;
  return {
    ...member,
    payloadTypeText: memberTypes.payloadTypeText,
    parameters: member.parameters.map((param) => {
      const next = memberTypes.parameters.find((p) => p.name === param.name);
      return next ? { ...param, typeText: next.typeText } : param;
    })
  };
}

function applyServiceTypes(service: ServiceModel, memberMap: ServiceTypeMap | undefined): ServiceModel {
  if (!memberMap) return service;
  return {
    ...service,
    members: service.members.map((m) => applyServiceMemberTypes(m, memberMap.get(m.name)))
  };
}

export function applyResolvedTypeGraph(spec: ParsedSpecModel): ParsedSpecModel {
  const serviceTypes = collectServiceTypes(spec.filePath);
  writeDebugFile(process.cwd(), "anqstmodel/typegraph-service-map.txt", renderServiceTypeMap(serviceTypes));
  return {
    ...spec,
    services: spec.services.map((service) => applyServiceTypes(service, serviceTypes.get(service.name)))
  };
}
