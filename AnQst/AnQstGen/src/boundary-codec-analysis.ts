import ts from "typescript";
import { VerifyError } from "./errors";
import type { ParsedSpecModel, TypeDeclModel } from "./model";
import {
  parseTypeDeclNode,
  parseTypeNodeFromText,
  qNameText,
  stripAnQstType,
  type BoundaryLeafCapabilityKey,
  type BoundaryTransportAnalysis,
  type BoundaryTransportAnalysisSummary,
  type TransportAnalysisNode,
  type TransportArrayAnalysis,
  type TransportFieldAnalysis,
  type TransportLeafAnalysis,
  type TransportStructAnalysis
} from "./boundary-codec-model";
import { resolveLeafCapability } from "./boundary-codec-leaves";

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

function unsupported(path: string[], typeText: string, reason: string): never {
  throw new VerifyError(`Boundary codec planning failed for '${path.join(".") || typeText}': ${reason} (${typeText}).`);
}

export class BoundaryTransportAnalyzer {
  private readonly declNodes = new Map<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration>();

  constructor(private readonly spec: ParsedSpecModel) {
    for (const decl of this.collectDecls()) {
      const node = parseTypeDeclNode(decl.nodeText);
      if (node) {
        this.declNodes.set(decl.name, node);
      }
    }
  }

  analyzeTypeText(typeText: string, path: string[]): BoundaryTransportAnalysis {
    const root = this.resolveTypeNode(parseTypeNodeFromText(typeText), typeText, path, []);
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

  private createStructAnalysis(typeText: string, path: string[], members: readonly ts.TypeElement[], stack: string[]): TransportStructAnalysis {
    const fields: TransportFieldAnalysis[] = members
      .filter((member): member is ts.PropertySignature & { name: ts.Identifier; type: ts.TypeNode } => {
        return ts.isPropertySignature(member) && !!member.type && ts.isIdentifier(member.name);
      })
      .map((member) => ({
        name: member.name.text,
        optional: !!member.questionToken,
        typeText: member.type.getText(),
        path: [...path, member.name.text],
        reconstructionKey: member.name.text,
        node: this.resolveTypeNode(member.type, member.type.getText(), [...path, member.name.text], stack)
      }));
    return {
      nodeKind: "struct",
      typeText,
      path,
      fields,
      reconstruction: "object"
    };
  }

  private resolveTypeNode(node: ts.TypeNode, typeText: string, path: string[], stack: string[]): TransportAnalysisNode {
    if (ts.isParenthesizedTypeNode(node)) {
      return this.resolveTypeNode(node.type, typeText, path, stack);
    }
    if (ts.isTypeLiteralNode(node)) {
      return this.createStructAnalysis(typeText, path, node.members, stack);
    }
    if (ts.isArrayTypeNode(node)) {
      return {
        nodeKind: "array",
        typeText,
        path,
        elementTypeText: node.elementType.getText(),
        element: this.resolveTypeNode(node.elementType, node.elementType.getText(), [...path, "Item"], stack),
        requiresCountMetadata: true,
        reconstruction: "array"
      } satisfies TransportArrayAnalysis;
    }
    if (ts.isTupleTypeNode(node)) {
      unsupported(path, typeText, "tuple transport is not supported by the whole-boundary planner");
    }
    if (ts.isLiteralTypeNode(node)) {
      if (ts.isStringLiteral(node.literal)) {
        return {
          nodeKind: "leaf",
          typeText,
          path,
          leaf: resolveLeafCapability("string", "string")!,
          fixedWidth: false
        } satisfies TransportLeafAnalysis;
      }
      if (ts.isNumericLiteral(node.literal)) {
        return {
          nodeKind: "leaf",
          typeText,
          path,
          leaf: resolveLeafCapability("number", "number")!,
          fixedWidth: true
        } satisfies TransportLeafAnalysis;
      }
      if (node.literal.kind === ts.SyntaxKind.TrueKeyword || node.literal.kind === ts.SyntaxKind.FalseKeyword) {
        return {
          nodeKind: "leaf",
          typeText,
          path,
          leaf: resolveLeafCapability("boolean", "boolean")!,
          fixedWidth: true
        } satisfies TransportLeafAnalysis;
      }
    }
    if (ts.isUnionTypeNode(node)) {
      const filtered = filterNullishUnionParts(node.types);
      if (filtered.length !== node.types.length) {
        unsupported(path, typeText, "nullish unions are not supported; use explicit optional members instead");
      }
      if (isStringLikeUnion(node)) {
        return {
          nodeKind: "leaf",
          typeText,
          path,
          leaf: resolveLeafCapability("string", "string")!,
          fixedWidth: false
        } satisfies TransportLeafAnalysis;
      }
      if (isBooleanLikeUnion(node)) {
        return {
          nodeKind: "leaf",
          typeText,
          path,
          leaf: resolveLeafCapability("boolean", "boolean")!,
          fixedWidth: true
        } satisfies TransportLeafAnalysis;
      }
      if (isNumberLikeUnion(node)) {
        return {
          nodeKind: "leaf",
          typeText,
          path,
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
          typeText,
          path,
          elementTypeText: arg.getText(),
          element: this.resolveTypeNode(arg, arg.getText(), [...path, "Item"], stack),
          requiresCountMetadata: true,
          reconstruction: "array"
        } satisfies TransportArrayAnalysis;
      }
      if (name === "Record" || name === "Map") {
        const leaf = resolveLeafCapability("object", "object");
        return {
          nodeKind: "leaf",
          typeText,
          path,
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
          typeText,
          path,
          elementTypeText: "string",
          element: {
            nodeKind: "leaf",
            typeText: "string",
            path: [...path, "Item"],
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
          typeText,
          path,
          leaf,
          fixedWidth: leaf.fixedByteWidth !== null
        } satisfies TransportLeafAnalysis;
      }
      const decl = this.declNodes.get(name);
      if (decl) {
        if (stack.includes(name)) {
          unsupported(path, rawText, `recursive type reference '${name}' is not supported`);
        }
        const nextStack = [...stack, name];
        if (ts.isInterfaceDeclaration(decl)) {
          return this.createStructAnalysis(typeText, path, decl.members, nextStack);
        }
        return this.resolveTypeNode(decl.type, typeText, path, nextStack);
      }
    }

    switch (node.kind) {
      case ts.SyntaxKind.StringKeyword:
        return {
          nodeKind: "leaf",
          typeText,
          path,
          leaf: resolveLeafCapability("string", "string")!,
          fixedWidth: false
        } satisfies TransportLeafAnalysis;
      case ts.SyntaxKind.BooleanKeyword:
        return {
          nodeKind: "leaf",
          typeText,
          path,
          leaf: resolveLeafCapability("boolean", "boolean")!,
          fixedWidth: true
        } satisfies TransportLeafAnalysis;
      case ts.SyntaxKind.NumberKeyword:
        return {
          nodeKind: "leaf",
          typeText,
          path,
          leaf: resolveLeafCapability("number", "number")!,
          fixedWidth: true
        } satisfies TransportLeafAnalysis;
      case ts.SyntaxKind.BigIntKeyword:
        return {
          nodeKind: "leaf",
          typeText,
          path,
          leaf: resolveLeafCapability("qint64", "qint64")!,
          fixedWidth: true
        } satisfies TransportLeafAnalysis;
      case ts.SyntaxKind.ObjectKeyword:
        return {
          nodeKind: "leaf",
          typeText,
          path,
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
