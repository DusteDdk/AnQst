import ts from "typescript";
import { VerifyError } from "./errors";
import type { ParsedSpecModel, TypeDeclModel } from "./model";
import {
  parseTypeDeclNode,
  parseTypeNodeFromText,
  qNameText,
  sanitizeIdentifier,
  stripAnQstType,
  type BoundaryFiniteDomain,
  type BoundaryLeafCapabilityKey,
  type BoundaryTransportAnalysis,
  type BoundaryTransportAnalysisSummary,
  type TransportAnalysisNode,
  type TransportArrayAnalysis,
  type TransportFieldAnalysis,
  type TransportFiniteDomainAnalysis,
  type TransportLeafAnalysis,
  type TransportNamedAnalysis,
  type TransportStructAnalysis
} from "./boundary-codec-model";
import { resolveLeafCapability } from "./boundary-codec-leaves";

const BUILTIN_TYPE_REFS = new Set(["Array", "ReadonlyArray", "Record", "Map", "Partial", "Promise"]);

function isStringLikeUnion(node: ts.UnionTypeNode): boolean {
  return node.types.every((part) => {
    if (ts.isLiteralTypeNode(part) && ts.isStringLiteral(part.literal)) return true;
    return part.kind === ts.SyntaxKind.StringKeyword;
  });
}

function isBooleanLikeUnion(node: ts.UnionTypeNode): boolean {
  return node.types.every((part) => {
    if (ts.isLiteralTypeNode(part)) {
      return part.literal.kind === ts.SyntaxKind.TrueKeyword || part.literal.kind === ts.SyntaxKind.FalseKeyword;
    }
    return part.kind === ts.SyntaxKind.BooleanKeyword;
  });
}

function isNumberLikeUnion(node: ts.UnionTypeNode): boolean {
  return node.types.every((part) => {
    if (ts.isLiteralTypeNode(part) && ts.isNumericLiteral(part.literal)) return true;
    return part.kind === ts.SyntaxKind.NumberKeyword || part.kind === ts.SyntaxKind.BigIntKeyword;
  });
}

function filterNullishUnionParts(types: readonly ts.TypeNode[]): ts.TypeNode[] {
  return types.filter((part) => part.kind !== ts.SyntaxKind.NullKeyword && part.kind !== ts.SyntaxKind.UndefinedKeyword);
}

function collectFiniteStringLiterals(node: ts.UnionTypeNode): string[] | null {
  const values: string[] = [];
  for (const part of node.types) {
    if (!ts.isLiteralTypeNode(part) || !ts.isStringLiteral(part.literal)) return null;
    values.push(part.literal.text);
  }
  return values;
}

function collectFiniteBooleanLiterals(node: ts.UnionTypeNode): boolean[] | null {
  const values: boolean[] = [];
  for (const part of node.types) {
    if (!ts.isLiteralTypeNode(part)) return null;
    if (part.literal.kind === ts.SyntaxKind.TrueKeyword) {
      values.push(true);
      continue;
    }
    if (part.literal.kind === ts.SyntaxKind.FalseKeyword) {
      values.push(false);
      continue;
    }
    return null;
  }
  return values;
}

function collectFiniteNumberLiterals(node: ts.UnionTypeNode): number[] | null {
  const values: number[] = [];
  for (const part of node.types) {
    if (!ts.isLiteralTypeNode(part) || !ts.isNumericLiteral(part.literal)) return null;
    values.push(Number(part.literal.text));
  }
  return values;
}

function finiteDomainSymbolForValue(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") {
    const text = Number.isInteger(value) ? `${value}` : `${value}`.replace(/\./g, "_");
    return sanitizeIdentifier(`Value_${text.replace(/-/g, "neg_")}`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return "Empty";
  const direct = sanitizeIdentifier(trimmed);
  return direct.length > 0 ? direct : "Value";
}

function buildFiniteDomain(
  primitive: BoundaryFiniteDomain["primitive"],
  values: readonly (string | number | boolean)[]
): BoundaryFiniteDomain {
  const seen = new Set<string>();
  const variants: BoundaryFiniteDomain["variants"] = [];
  for (const value of values) {
    const key = `${typeof value}:${String(value)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    variants.push({
      code: variants.length,
      symbolicName: finiteDomainSymbolForValue(value),
      tsLiteralText: typeof value === "string" ? JSON.stringify(value) : `${value}`,
      value
    });
  }
  return { primitive, variants };
}

function unsupported(path: string[], typeText: string, reason: string): never {
  throw new VerifyError(`Boundary codec planning failed for '${path.join(".") || typeText}': ${reason} (${typeText}).`);
}

export class BoundaryTransportAnalyzer {
  private readonly declNodes = new Map<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration>();
  private readonly namedNodes = new Map<string, TransportNamedAnalysis>();

  constructor(private readonly spec: ParsedSpecModel) {
    for (const decl of this.collectDecls()) {
      const node = parseTypeDeclNode(decl.nodeText);
      if (node) {
        this.declNodes.set(decl.name, node);
      }
    }
  }

  analyzeTypeText(typeText: string, path: string[]): BoundaryTransportAnalysis {
    const rootNode = parseTypeNodeFromText(typeText);
    const root = this.resolveTypeNode(rootNode, typeText, path, [], this.defaultIdentityParts(rootNode, typeText, path));
    return {
      typeText,
      tsTypeText: stripAnQstType(typeText),
      root,
      summary: summarizeAnalysis(root)
    };
  }

  private collectDecls(): TypeDeclModel[] {
    const out = new Map<string, TypeDeclModel>();
    for (const decl of this.spec.namespaceTypeDecls) out.set(decl.name, decl);
    for (const decl of this.spec.importedTypeDecls.values()) out.set(decl.name, decl);
    return [...out.values()];
  }

  private nodeMeta(typeText: string, path: string[], identityParts: string[]) {
    const normalizedParts = identityParts.filter((part) => part.trim().length > 0);
    return {
      typeText,
      path,
      typeIdentityKey: normalizedParts.join("::") || stripAnQstType(typeText).trim(),
      cppNameHintParts: normalizedParts.length > 0 ? normalizedParts : (path.length > 0 ? path : [stripAnQstType(typeText).trim() || "AnonymousType"])
    };
  }

  private defaultIdentityParts(node: ts.TypeNode, typeText: string, path: string[]): string[] {
    if (ts.isTypeReferenceNode(node)) {
      const name = qNameText(node.typeName);
      if (!name.startsWith("AnQst.Type.") && !BUILTIN_TYPE_REFS.has(name)) {
        return [name];
      }
    }
    return path.length > 0 ? [...path] : [stripAnQstType(typeText).trim() || "AnonymousType"];
  }

  private createFiniteDomainAnalysis(
    typeText: string,
    path: string[],
    identityParts: string[],
    domain: BoundaryFiniteDomain
  ): TransportFiniteDomainAnalysis {
    return {
      nodeKind: "finite-domain",
      ...this.nodeMeta(typeText, path, identityParts),
      domain
    };
  }

  private createStructAnalysis(
    typeText: string,
    path: string[],
    members: readonly ts.TypeElement[],
    stack: string[],
    identityParts: string[]
  ): TransportStructAnalysis {
    const fields: TransportFieldAnalysis[] = members
      .filter((member): member is ts.PropertySignature & { name: ts.Identifier; type: ts.TypeNode } => {
        return ts.isPropertySignature(member) && !!member.type && ts.isIdentifier(member.name);
      })
      .map((member) => {
        const fieldPath = [...path, member.name.text];
        const fieldIdentityParts = [...identityParts, member.name.text];
        const child = this.resolveTypeNode(member.type, member.type.getText(), fieldPath, stack, fieldIdentityParts);
        return {
          name: member.name.text,
          optional: !!member.questionToken,
          typeText: member.type.getText(),
          path: fieldPath,
          typeIdentityKey: child.typeIdentityKey,
          cppNameHintParts: child.cppNameHintParts,
          reconstructionKey: member.name.text,
          node: child
        };
      });
    return {
      nodeKind: "struct",
      ...this.nodeMeta(typeText, path, identityParts),
      fields,
      reconstruction: "object"
    };
  }

  private resolveNamedReference(name: string, decl: ts.InterfaceDeclaration | ts.TypeAliasDeclaration): TransportNamedAnalysis {
    const existing = this.namedNodes.get(name);
    if (existing) {
      return existing;
    }

    const placeholder: TransportNamedAnalysis = {
      nodeKind: "named",
      ...this.nodeMeta(name, [name], [name]),
      name,
      target: null as unknown as TransportAnalysisNode
    };
    this.namedNodes.set(name, placeholder);
    placeholder.target = ts.isInterfaceDeclaration(decl)
      ? this.createStructAnalysis(name, [name], decl.members, [name], [name])
      : this.resolveTypeNode(decl.type, name, [name], [name], [name]);
    return placeholder;
  }

  private resolveTypeNode(
    node: ts.TypeNode,
    typeText: string,
    path: string[],
    stack: string[],
    identityParts: string[]
  ): TransportAnalysisNode {
    if (ts.isParenthesizedTypeNode(node)) {
      return this.resolveTypeNode(node.type, typeText, path, stack, identityParts);
    }
    if (ts.isTypeLiteralNode(node)) {
      return this.createStructAnalysis(typeText, path, node.members, stack, identityParts);
    }
    if (ts.isArrayTypeNode(node)) {
      return {
        nodeKind: "array",
        ...this.nodeMeta(typeText, path, identityParts),
        elementTypeText: node.elementType.getText(),
        element: this.resolveTypeNode(node.elementType, node.elementType.getText(), [...path, "Item"], stack, [...identityParts, "Item"]),
        requiresCountMetadata: true,
        reconstruction: "array"
      } satisfies TransportArrayAnalysis;
    }
    if (ts.isTupleTypeNode(node)) {
      unsupported(path, typeText, "tuple transport is not supported by the whole-boundary planner");
    }
    if (ts.isLiteralTypeNode(node)) {
      if (ts.isStringLiteral(node.literal)) {
        return this.createFiniteDomainAnalysis(typeText, path, identityParts, buildFiniteDomain("string", [node.literal.text]));
      }
      if (ts.isNumericLiteral(node.literal)) {
        return this.createFiniteDomainAnalysis(typeText, path, identityParts, buildFiniteDomain("number", [Number(node.literal.text)]));
      }
      if (node.literal.kind === ts.SyntaxKind.TrueKeyword || node.literal.kind === ts.SyntaxKind.FalseKeyword) {
        return this.createFiniteDomainAnalysis(
          typeText,
          path,
          identityParts,
          buildFiniteDomain("boolean", [node.literal.kind === ts.SyntaxKind.TrueKeyword])
        );
      }
    }
    if (ts.isUnionTypeNode(node)) {
      const filtered = filterNullishUnionParts(node.types);
      if (filtered.length !== node.types.length) {
        unsupported(path, typeText, "nullish unions are not supported; use explicit optional members instead");
      }
      const finiteStringVariants = collectFiniteStringLiterals(node);
      if (finiteStringVariants) {
        return this.createFiniteDomainAnalysis(typeText, path, identityParts, buildFiniteDomain("string", finiteStringVariants));
      }
      const finiteBooleanVariants = collectFiniteBooleanLiterals(node);
      if (finiteBooleanVariants) {
        return this.createFiniteDomainAnalysis(typeText, path, identityParts, buildFiniteDomain("boolean", finiteBooleanVariants));
      }
      const finiteNumberVariants = collectFiniteNumberLiterals(node);
      if (finiteNumberVariants) {
        return this.createFiniteDomainAnalysis(typeText, path, identityParts, buildFiniteDomain("number", finiteNumberVariants));
      }
      if (isStringLikeUnion(node)) {
        return {
          nodeKind: "leaf",
          ...this.nodeMeta(typeText, path, identityParts),
          leaf: resolveLeafCapability("string", "string")!,
          fixedWidth: false
        } satisfies TransportLeafAnalysis;
      }
      if (isBooleanLikeUnion(node)) {
        return {
          nodeKind: "leaf",
          ...this.nodeMeta(typeText, path, identityParts),
          leaf: resolveLeafCapability("boolean", "boolean")!,
          fixedWidth: true
        } satisfies TransportLeafAnalysis;
      }
      if (isNumberLikeUnion(node)) {
        return {
          nodeKind: "leaf",
          ...this.nodeMeta(typeText, path, identityParts),
          leaf: resolveLeafCapability("number", "number")!,
          fixedWidth: true
        } satisfies TransportLeafAnalysis;
      }
      unsupported(path, typeText, "union transport is only supported for string, boolean, or number-like unions");
    }
    if (ts.isTypeReferenceNode(node)) {
      const name = qNameText(node.typeName);
      const rawText = node.getText();
      if (name === "Array" || name === "ReadonlyArray") {
        const arg = node.typeArguments?.[0];
        if (!arg) {
          unsupported(path, rawText, "array type is missing its element type");
        }
        return {
          nodeKind: "array",
          ...this.nodeMeta(typeText, path, identityParts),
          elementTypeText: arg.getText(),
          element: this.resolveTypeNode(arg, arg.getText(), [...path, "Item"], stack, [...identityParts, "Item"]),
          requiresCountMetadata: true,
          reconstruction: "array"
        } satisfies TransportArrayAnalysis;
      }
      if (name === "Record" || name === "Map") {
        const leaf = resolveLeafCapability("object", "object");
        return {
          nodeKind: "leaf",
          ...this.nodeMeta(typeText, path, identityParts),
          leaf: leaf!,
          fixedWidth: false
        } satisfies TransportLeafAnalysis;
      }
      if (name === "Partial") {
        unsupported(path, rawText, "generic Partial<T> transport is not supported");
      }
      if (name === "Promise") {
        unsupported(path, rawText, "Promise transport is not supported");
      }
      if (rawText.trim() === "AnQst.Type.stringArray") {
        const leaf = resolveLeafCapability("string", "string");
        return {
          nodeKind: "array",
          ...this.nodeMeta(typeText, path, identityParts),
          elementTypeText: "string",
          element: {
            nodeKind: "leaf",
            ...this.nodeMeta("string", [...path, "Item"], [...identityParts, "Item"]),
            leaf: leaf!,
            fixedWidth: false
          },
          requiresCountMetadata: true,
          reconstruction: "array"
        } satisfies TransportArrayAnalysis;
      }
      const leaf = resolveLeafCapability(rawText, name);
      if (leaf) {
        return {
          nodeKind: "leaf",
          ...this.nodeMeta(typeText, path, identityParts),
          leaf,
          fixedWidth: leaf.fixedByteWidth !== null
        } satisfies TransportLeafAnalysis;
      }
      const decl = this.declNodes.get(name);
      if (decl) {
        return this.resolveNamedReference(name, decl);
      }
    }

    switch (node.kind) {
      case ts.SyntaxKind.StringKeyword:
        return {
          nodeKind: "leaf",
          ...this.nodeMeta(typeText, path, identityParts),
          leaf: resolveLeafCapability("string", "string")!,
          fixedWidth: false
        } satisfies TransportLeafAnalysis;
      case ts.SyntaxKind.BooleanKeyword:
        return {
          nodeKind: "leaf",
          ...this.nodeMeta(typeText, path, identityParts),
          leaf: resolveLeafCapability("boolean", "boolean")!,
          fixedWidth: true
        } satisfies TransportLeafAnalysis;
      case ts.SyntaxKind.NumberKeyword:
        return {
          nodeKind: "leaf",
          ...this.nodeMeta(typeText, path, identityParts),
          leaf: resolveLeafCapability("number", "number")!,
          fixedWidth: true
        } satisfies TransportLeafAnalysis;
      case ts.SyntaxKind.BigIntKeyword:
        return {
          nodeKind: "leaf",
          ...this.nodeMeta(typeText, path, identityParts),
          leaf: resolveLeafCapability("bigint", "bigint")!,
          fixedWidth: true
        } satisfies TransportLeafAnalysis;
      case ts.SyntaxKind.ObjectKeyword:
        return {
          nodeKind: "leaf",
          ...this.nodeMeta(typeText, path, identityParts),
          leaf: resolveLeafCapability("object", "object")!,
          fixedWidth: false
        } satisfies TransportLeafAnalysis;
      default:
        unsupported(path, typeText, "no transport analysis rule exists for this type");
    }
  }
}

function summarizeAnalysis(node: TransportAnalysisNode): BoundaryTransportAnalysisSummary {
  const used = new Set<BoundaryLeafCapabilityKey>();
  const visitedNamed = new Set<string>();
  const visit = (current: TransportAnalysisNode): BoundaryTransportAnalysisSummary => {
    switch (current.nodeKind) {
      case "leaf":
        used.add(current.leaf.key);
        return {
          hasBlobLeaves: current.leaf.region === "blob",
          hasStringLeaves: current.leaf.region === "string",
          hasBinaryLeaves: current.leaf.region === "binary",
          hasDynamicLeaves: current.leaf.region === "dynamic",
          hasRepeatedStructures: false,
          hasOptionalPresence: false,
          hasFiniteDomains: false,
          usedLeafCapabilities: []
        };
      case "named":
        if (visitedNamed.has(current.name)) {
          return {
            hasBlobLeaves: false,
            hasStringLeaves: false,
            hasBinaryLeaves: false,
            hasDynamicLeaves: false,
            hasRepeatedStructures: false,
            hasOptionalPresence: false,
            hasFiniteDomains: false,
            usedLeafCapabilities: []
          };
        }
        visitedNamed.add(current.name);
        return visit(current.target);
      case "finite-domain":
        return {
          hasBlobLeaves: false,
          hasStringLeaves: false,
          hasBinaryLeaves: false,
          hasDynamicLeaves: false,
          hasRepeatedStructures: false,
          hasOptionalPresence: false,
          hasFiniteDomains: true,
          usedLeafCapabilities: []
        };
      case "array": {
        const inner = visit(current.element);
        return {
          hasBlobLeaves: inner.hasBlobLeaves,
          hasStringLeaves: inner.hasStringLeaves,
          hasBinaryLeaves: inner.hasBinaryLeaves,
          hasDynamicLeaves: inner.hasDynamicLeaves,
          hasRepeatedStructures: true,
          hasOptionalPresence: inner.hasOptionalPresence,
          hasFiniteDomains: inner.hasFiniteDomains,
          usedLeafCapabilities: []
        };
      }
      case "struct":
        return current.fields.reduce<BoundaryTransportAnalysisSummary>(
          (acc, field) => {
            const next = visit(field.node);
            return {
              hasBlobLeaves: acc.hasBlobLeaves || next.hasBlobLeaves,
              hasStringLeaves: acc.hasStringLeaves || next.hasStringLeaves,
              hasBinaryLeaves: acc.hasBinaryLeaves || next.hasBinaryLeaves,
              hasDynamicLeaves: acc.hasDynamicLeaves || next.hasDynamicLeaves,
              hasRepeatedStructures: acc.hasRepeatedStructures || next.hasRepeatedStructures,
              hasOptionalPresence: acc.hasOptionalPresence || field.optional || next.hasOptionalPresence,
              hasFiniteDomains: acc.hasFiniteDomains || next.hasFiniteDomains,
              usedLeafCapabilities: []
            };
          },
          {
            hasBlobLeaves: false,
            hasStringLeaves: false,
            hasBinaryLeaves: false,
            hasDynamicLeaves: false,
            hasRepeatedStructures: false,
            hasOptionalPresence: false,
            hasFiniteDomains: false,
            usedLeafCapabilities: []
          }
        );
    }
  };
  const summary = visit(node);
  return {
    ...summary,
    usedLeafCapabilities: [...used]
  };
}
