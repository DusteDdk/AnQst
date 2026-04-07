import {
  sanitizeIdentifier,
  type BoundaryLeafLoweringPlan,
  type BoundaryLoweringSelection,
  BinaryLeafKind,
  type BoundaryCodecDecodePolicy,
  BoundaryCodecPlan,
  BoundaryCodecRequirements,
  BoundaryPlanBlobEntry,
  BoundaryPlanField,
  BoundaryPlanFiniteDomainNode,
  BoundaryPlanItemEntry,
  BoundaryPlanLeafNode,
  BoundaryPlanNamedNode,
  BoundaryPlanNode,
  type BoundaryTargetHelperRequirements,
  BoundaryPlanStructNode,
  BoundaryTransportAnalysis,
  BoundaryTransportAnalysisSummary,
  ScalarLeafKind,
  TransportAnalysisNode,
  TransportArrayAnalysis,
  TransportFiniteDomainAnalysis,
  TransportLeafAnalysis,
  TransportNamedAnalysis,
  TransportStructAnalysis
} from "./boundary-codec-model";

interface NodeShape {
  fixedBlobWidthBytes: number | null;
  fixedItemCount: number | null;
  hasItems: boolean;
  itemKinds: Set<BoundaryPlanItemEntry["itemKind"]>;
  hasVariableExtent: boolean;
}

interface PlanBuildResult {
  node: BoundaryPlanNode;
  shape: NodeShape;
}

class BoundaryPlanBuilder {
  private nextIdValue = 0;
  private readonly blobEntries: BoundaryPlanBlobEntry[] = [];
  private readonly itemEntries: BoundaryPlanItemEntry[] = [];
  private readonly usedScalarLeafKinds = new Set<ScalarLeafKind>();
  private readonly usedBinaryLeafKinds = new Set<BinaryLeafKind>();
  private readonly namedNodes = new Map<string, BoundaryPlanNamedNode>();
  private readonly namedShapes = new Map<string, NodeShape>();
  private readonly tsScalarEncodeHelpers = new Set<ScalarLeafKind>();
  private readonly tsScalarDecodeHelpers = new Set<ScalarLeafKind>();
  private readonly tsBinaryEncodeHelpers = new Set<BinaryLeafKind>();
  private readonly tsBinaryDecodeHelpers = new Set<BinaryLeafKind>();
  private readonly tsFiniteDomainEncodeHelpers = new Set<string>();
  private readonly tsFiniteDomainDecodeHelpers = new Set<string>();
  private readonly cppScalarEncodeHelpers = new Set<ScalarLeafKind>();
  private readonly cppScalarDecodeHelpers = new Set<ScalarLeafKind>();
  private readonly cppBinaryEncodeHelpers = new Set<BinaryLeafKind>();
  private readonly cppBinaryDecodeHelpers = new Set<BinaryLeafKind>();
  private readonly cppFiniteDomainEncodeHelpers = new Set<string>();
  private readonly cppFiniteDomainDecodeHelpers = new Set<string>();
  private usesArrayCounts = false;
  private usesOptionalPresence = false;
  private usesFiniteDomainCodes = false;
  private nextItemOrder = 0;

  constructor(
    private readonly codecId: string,
    private readonly analysis: BoundaryTransportAnalysis
  ) {}

  build(): BoundaryCodecPlan {
    const root = this.buildNode(this.analysis.root, { isRoot: true }).node;
    const requirements = this.buildRequirements();
    return {
      codecId: this.codecId,
      typeText: this.analysis.typeText,
      tsTypeText: this.analysis.tsTypeText,
      decodePolicy: "trusted-only",
      analysis: this.analysis,
      root,
      blobEntries: this.blobEntries,
      itemEntries: this.itemEntries,
      requirements
    };
  }

  private buildRequirements(): BoundaryCodecRequirements {
    const hasBlob = this.blobEntries.length > 0;
    const itemKinds = [...new Set(this.itemEntries.map((entry) => entry.itemKind))];
    const sortedScalarKinds = (values: Set<ScalarLeafKind>): ScalarLeafKind[] => [...values].sort();
    const sortedBinaryKinds = (values: Set<BinaryLeafKind>): BinaryLeafKind[] => [...values].sort();
    const sortedStrings = (values: Set<string>): string[] => [...values].sort();
    const helperRequirements = (
      scalarEncodeKinds: Set<ScalarLeafKind>,
      scalarDecodeKinds: Set<ScalarLeafKind>,
      binaryEncodeKinds: Set<BinaryLeafKind>,
      binaryDecodeKinds: Set<BinaryLeafKind>,
      finiteDomainEncodeHelpers: Set<string>,
      finiteDomainDecodeHelpers: Set<string>
    ): BoundaryTargetHelperRequirements => ({
      scalarEncodeKinds: sortedScalarKinds(scalarEncodeKinds),
      scalarDecodeKinds: sortedScalarKinds(scalarDecodeKinds),
      binaryEncodeKinds: sortedBinaryKinds(binaryEncodeKinds),
      binaryDecodeKinds: sortedBinaryKinds(binaryDecodeKinds),
      finiteDomainEncodeHelpers: sortedStrings(finiteDomainEncodeHelpers),
      finiteDomainDecodeHelpers: sortedStrings(finiteDomainDecodeHelpers)
    });

    return {
      hasBlob,
      hasItems: this.itemEntries.length > 0,
      itemKinds,
      itemCountHeaderKinds: [],
      usesArrayCounts: this.usesArrayCounts,
      usesOptionalPresence: this.usesOptionalPresence,
      usesFiniteDomainCodes: this.usesFiniteDomainCodes,
      usedScalarLeafKinds: [...this.usedScalarLeafKinds].sort(),
      usedBinaryLeafKinds: [...this.usedBinaryLeafKinds].sort(),
      tsHelperRequirements: helperRequirements(
        this.tsScalarEncodeHelpers,
        this.tsScalarDecodeHelpers,
        this.tsBinaryEncodeHelpers,
        this.tsBinaryDecodeHelpers,
        this.tsFiniteDomainEncodeHelpers,
        this.tsFiniteDomainDecodeHelpers
      ),
      cppHelperRequirements: helperRequirements(
        this.cppScalarEncodeHelpers,
        this.cppScalarDecodeHelpers,
        this.cppBinaryEncodeHelpers,
        this.cppBinaryDecodeHelpers,
        this.cppFiniteDomainEncodeHelpers,
        this.cppFiniteDomainDecodeHelpers
      )
    };
  }

  private nextId(prefix: string): string {
    this.nextIdValue += 1;
    return `${this.codecId}_${prefix}_${this.nextIdValue}`;
  }

  private addBlobEntry(
    role: BoundaryPlanBlobEntry["role"],
    path: string[],
    widthBytes: number,
    leafKind: ScalarLeafKind,
    logicalKind: string
  ): string {
    const entryId = this.nextId(role === "leaf" ? "blob" : role.replace(/-/g, "_"));
    this.blobEntries.push({
      entryId,
      role,
      path,
      widthBytes,
      leafKind,
      logicalKind
    });
    this.usedScalarLeafKinds.add(leafKind);
    return entryId;
  }

  private addItemEntry(itemKind: BoundaryPlanItemEntry["itemKind"], path: string[], logicalKind: string): string {
    const entryId = this.nextId(itemKind);
    this.nextItemOrder += 1;
    const entry: BoundaryPlanItemEntry = { entryId, itemKind, path, logicalKind, order: this.nextItemOrder };
    this.itemEntries.push(entry);
    return entryId;
  }

  private static emptyShape(): NodeShape {
    return {
      fixedBlobWidthBytes: 0,
      fixedItemCount: 0,
      hasItems: false,
      itemKinds: new Set(),
      hasVariableExtent: false
    };
  }

  private static recursiveNamedShape(): NodeShape {
    return {
      fixedBlobWidthBytes: null,
      fixedItemCount: null,
      hasItems: false,
      itemKinds: new Set(),
      hasVariableExtent: true
    };
  }

  private mergeShapes(left: NodeShape, right: NodeShape): NodeShape {
    const fixedBlobWidthBytes =
      left.fixedBlobWidthBytes !== null &&
      right.fixedBlobWidthBytes !== null &&
      !left.hasVariableExtent &&
      !right.hasVariableExtent
        ? left.fixedBlobWidthBytes + right.fixedBlobWidthBytes
        : null;
    const fixedItemCount =
      left.fixedItemCount !== null &&
      right.fixedItemCount !== null &&
      !left.hasVariableExtent &&
      !right.hasVariableExtent
        ? left.fixedItemCount + right.fixedItemCount
        : null;
    return {
      fixedBlobWidthBytes,
      fixedItemCount,
      hasItems: left.hasItems || right.hasItems,
      itemKinds: new Set([...left.itemKinds, ...right.itemKinds]),
      hasVariableExtent: left.hasVariableExtent || right.hasVariableExtent
    };
  }

  private chooseLeafPacking(node: TransportLeafAnalysis, isRoot: boolean): BoundaryPlanLeafNode["selectedPacking"] {
    void isRoot;
    if (node.leaf.region === "blob") return "byte-packed";
    if (node.leaf.region === "binary") return "binary-packed";
    if (node.leaf.region === "dynamic") return "dynamic";
    return "text-packed";
  }

  private loweringSelection(
    mode: BoundaryLoweringSelection["mode"],
    reason: BoundaryLoweringSelection["reason"],
    helperNameHint?: string
  ): BoundaryLoweringSelection {
    return { mode, reason, helperNameHint };
  }

  private defaultInlineLeafLowering(): BoundaryLeafLoweringPlan {
    return {
      tsEncode: this.loweringSelection("inline", "trivial-op"),
      tsDecode: this.loweringSelection("inline", "trivial-op"),
      cppEncode: this.loweringSelection("inline", "trivial-op"),
      cppDecode: this.loweringSelection("inline", "trivial-op")
    };
  }

  private finiteDomainHelperHint(node: TransportFiniteDomainAnalysis): string {
    const joined = node.path.join("_");
    return sanitizeIdentifier(`finite_domain_${joined.length > 0 ? joined : node.typeIdentityKey}`);
  }

  private chooseLeafLowering(
    node: TransportLeafAnalysis,
    selectedPacking: BoundaryPlanLeafNode["selectedPacking"],
    _context: { isRoot: boolean }
  ): BoundaryLeafLoweringPlan {
    if (node.leaf.region === "binary" && selectedPacking === "binary-packed") {
      const helperNameHint = sanitizeIdentifier(`binary_${String(node.leaf.key)}`);
      return {
        tsEncode: this.loweringSelection("helper-call", "complex-op", helperNameHint),
        tsDecode: this.loweringSelection("helper-call", "complex-op", helperNameHint),
        cppEncode: this.loweringSelection("helper-call", "complex-op", helperNameHint),
        cppDecode: this.loweringSelection("helper-call", "complex-op", helperNameHint)
      };
    }
    return this.defaultInlineLeafLowering();
  }

  private chooseFiniteDomainLowering(
    node: TransportFiniteDomainAnalysis,
    representation: BoundaryPlanFiniteDomainNode["representation"],
    _context: { isRoot: boolean }
  ): BoundaryLeafLoweringPlan {
    if (representation.kind === "coded-scalar" && node.domain.variants.length > 64) {
      const helperNameHint = this.finiteDomainHelperHint(node);
      return {
        tsEncode: this.loweringSelection("helper-call", "code-size", helperNameHint),
        tsDecode: this.loweringSelection("helper-call", "code-size", helperNameHint),
        cppEncode: this.loweringSelection("helper-call", "code-size", helperNameHint),
        cppDecode: this.loweringSelection("helper-call", "code-size", helperNameHint)
      };
    }
    return this.defaultInlineLeafLowering();
  }

  private registerLeafLoweringRequirements(node: TransportLeafAnalysis, lowering: BoundaryLeafLoweringPlan): void {
    const scalarLeaf = node.leaf.key as ScalarLeafKind;
    const binaryLeaf = node.leaf.key as BinaryLeafKind;

    if (node.leaf.region === "blob") {
      if (lowering.tsEncode.mode === "helper-call") this.tsScalarEncodeHelpers.add(scalarLeaf);
      if (lowering.tsDecode.mode === "helper-call") this.tsScalarDecodeHelpers.add(scalarLeaf);
      if (lowering.cppEncode.mode === "helper-call") this.cppScalarEncodeHelpers.add(scalarLeaf);
      if (lowering.cppDecode.mode === "helper-call") this.cppScalarDecodeHelpers.add(scalarLeaf);
      return;
    }
    if (node.leaf.region === "binary") {
      if (lowering.tsEncode.mode === "helper-call") this.tsBinaryEncodeHelpers.add(binaryLeaf);
      if (lowering.tsDecode.mode === "helper-call") this.tsBinaryDecodeHelpers.add(binaryLeaf);
      if (lowering.cppEncode.mode === "helper-call") this.cppBinaryEncodeHelpers.add(binaryLeaf);
      if (lowering.cppDecode.mode === "helper-call") this.cppBinaryDecodeHelpers.add(binaryLeaf);
    }
  }

  private registerFiniteDomainLoweringRequirements(
    representation: BoundaryPlanFiniteDomainNode["representation"],
    lowering: BoundaryLeafLoweringPlan
  ): void {
    if (representation.kind === "coded-scalar") {
      if (lowering.tsEncode.mode === "helper-call") this.tsScalarEncodeHelpers.add(representation.scalarKind);
      if (lowering.tsDecode.mode === "helper-call") this.tsScalarDecodeHelpers.add(representation.scalarKind);
      if (lowering.cppEncode.mode === "helper-call") this.cppScalarEncodeHelpers.add(representation.scalarKind);
      if (lowering.cppDecode.mode === "helper-call") this.cppScalarDecodeHelpers.add(representation.scalarKind);
    }
    if (lowering.tsEncode.mode === "helper-call" && lowering.tsEncode.helperNameHint) {
      this.tsFiniteDomainEncodeHelpers.add(lowering.tsEncode.helperNameHint);
    }
    if (lowering.tsDecode.mode === "helper-call" && lowering.tsDecode.helperNameHint) {
      this.tsFiniteDomainDecodeHelpers.add(lowering.tsDecode.helperNameHint);
    }
    if (lowering.cppEncode.mode === "helper-call" && lowering.cppEncode.helperNameHint) {
      this.cppFiniteDomainEncodeHelpers.add(lowering.cppEncode.helperNameHint);
    }
    if (lowering.cppDecode.mode === "helper-call" && lowering.cppDecode.helperNameHint) {
      this.cppFiniteDomainDecodeHelpers.add(lowering.cppDecode.helperNameHint);
    }
  }

  private chooseFiniteDomainScalar(variantCount: number): "uint8" | "uint16" | "uint32" {
    if (variantCount <= 0xff) return "uint8";
    if (variantCount <= 0xffff) return "uint16";
    return "uint32";
  }

  private chooseRootArrayExtentStrategy(nodeShape: NodeShape, isRoot: boolean): "blob-tail" | "item-tail" | "explicit-count" {
    if (!isRoot || nodeShape.hasVariableExtent) return "explicit-count";
    if (nodeShape.fixedBlobWidthBytes !== null && nodeShape.fixedBlobWidthBytes > 0) return "blob-tail";
    if (nodeShape.fixedItemCount !== null && nodeShape.fixedItemCount > 0) return "item-tail";
    return "explicit-count";
  }

  private buildNode(node: TransportAnalysisNode, context: { isRoot: boolean }): PlanBuildResult {
    switch (node.nodeKind) {
      case "leaf":
        return this.buildLeafNode(node, context);
      case "finite-domain":
        return this.buildFiniteDomainNode(node, context);
      case "array":
        return this.buildArrayNode(node, context);
      case "struct":
        return this.buildStructNode(node, context);
      case "named":
        return this.buildNamedNode(node);
    }
  }

  private buildNamedNode(node: TransportNamedAnalysis): PlanBuildResult {
    const existing = this.namedNodes.get(node.name);
    if (existing) {
      return {
        node: existing,
        shape: this.namedShapes.get(node.name) ?? BoundaryPlanBuilder.recursiveNamedShape()
      };
    }

    const placeholder = {
      nodeKind: "named",
      typeText: node.typeText,
      path: node.path,
      typeIdentityKey: node.typeIdentityKey,
      cppNameHintParts: node.cppNameHintParts,
      name: node.name,
      target: null as unknown as BoundaryPlanNode
    } satisfies BoundaryPlanNamedNode;
    this.namedNodes.set(node.name, placeholder);

    const targetResult = this.buildNode(node.target, { isRoot: false });
    placeholder.target = targetResult.node;
    this.namedShapes.set(node.name, targetResult.shape);

    return {
      node: placeholder,
      shape: targetResult.shape
    };
  }

  private buildLeafNode(node: TransportLeafAnalysis, context: { isRoot: boolean }): PlanBuildResult {
    const selectedPacking = this.chooseLeafPacking(node, context.isRoot);
    const lowering = this.chooseLeafLowering(node, selectedPacking, context);
    this.registerLeafLoweringRequirements(node, lowering);
    if (node.leaf.region === "blob" && selectedPacking === "byte-packed") {
      const widthBytes = node.leaf.fixedByteWidth ?? 0;
      const blobEntryId = this.addBlobEntry("leaf", node.path, widthBytes, node.leaf.key as ScalarLeafKind, node.leaf.logicalKind);
      return {
        node: {
          nodeKind: "leaf",
          typeText: node.typeText,
          path: node.path,
          typeIdentityKey: node.typeIdentityKey,
          cppNameHintParts: node.cppNameHintParts,
          leaf: node.leaf,
          selectedPacking,
          lowering,
          blobEntryId
        },
        shape: {
          fixedBlobWidthBytes: widthBytes,
          fixedItemCount: 0,
          hasItems: false,
          itemKinds: new Set(),
          hasVariableExtent: false
        }
      };
    }
    if (node.leaf.region === "binary") {
      this.usedBinaryLeafKinds.add(node.leaf.key as BinaryLeafKind);
      return {
        node: {
          nodeKind: "leaf",
          typeText: node.typeText,
          path: node.path,
          typeIdentityKey: node.typeIdentityKey,
          cppNameHintParts: node.cppNameHintParts,
          leaf: node.leaf,
          selectedPacking,
          lowering,
          itemEntryId: this.addItemEntry("binary", node.path, node.leaf.logicalKind)
        },
        shape: {
          fixedBlobWidthBytes: 0,
          fixedItemCount: 1,
          hasItems: true,
          itemKinds: new Set(["binary"]),
          hasVariableExtent: false
        }
      };
    }
    const itemKind = node.leaf.region === "dynamic" ? "dynamic" : "string";
    return {
      node: {
        nodeKind: "leaf",
        typeText: node.typeText,
        path: node.path,
        typeIdentityKey: node.typeIdentityKey,
        cppNameHintParts: node.cppNameHintParts,
        leaf: node.leaf,
        selectedPacking,
        lowering,
        itemEntryId: this.addItemEntry(itemKind, node.path, node.leaf.logicalKind)
      },
      shape: {
        fixedBlobWidthBytes: 0,
        fixedItemCount: 1,
        hasItems: true,
        itemKinds: new Set([itemKind]),
        hasVariableExtent: false
      }
    };
  }

  private buildFiniteDomainNode(node: TransportFiniteDomainAnalysis, context: { isRoot: boolean }): PlanBuildResult {
    if (context.isRoot && node.domain.primitive === "boolean") {
      const representation = { kind: "identity-text" } satisfies BoundaryPlanFiniteDomainNode["representation"];
      const lowering = this.chooseFiniteDomainLowering(node, representation, context);
      this.registerFiniteDomainLoweringRequirements(representation, lowering);
      return {
        node: {
          nodeKind: "finite-domain",
          typeText: node.typeText,
          path: node.path,
          typeIdentityKey: node.typeIdentityKey,
          cppNameHintParts: node.cppNameHintParts,
          domain: node.domain,
          representation,
          lowering,
          itemEntryId: this.addItemEntry("string", node.path, `finite-domain-${node.domain.primitive}`)
        },
        shape: {
          fixedBlobWidthBytes: 0,
          fixedItemCount: 1,
          hasItems: true,
          itemKinds: new Set(["string"]),
          hasVariableExtent: false
        }
      };
    }
    const scalarKind = this.chooseFiniteDomainScalar(node.domain.variants.length);
    this.usesFiniteDomainCodes = true;
    const widthBytes = scalarKind === "uint8" ? 1 : scalarKind === "uint16" ? 2 : 4;
    const representation = { kind: "coded-scalar", scalarKind } satisfies BoundaryPlanFiniteDomainNode["representation"];
    const lowering = this.chooseFiniteDomainLowering(node, representation, context);
    this.registerFiniteDomainLoweringRequirements(representation, lowering);
    const blobEntryId = this.addBlobEntry("finite-domain-code", node.path, widthBytes, scalarKind, `finite-domain-${node.domain.primitive}`);
    return {
      node: {
        nodeKind: "finite-domain",
        typeText: node.typeText,
        path: node.path,
        typeIdentityKey: node.typeIdentityKey,
        cppNameHintParts: node.cppNameHintParts,
        domain: node.domain,
        representation,
        lowering,
        blobEntryId
      },
      shape: {
        fixedBlobWidthBytes: widthBytes,
        fixedItemCount: 0,
        hasItems: false,
        itemKinds: new Set(),
        hasVariableExtent: false
      }
    };
  }

  private buildArrayNode(node: TransportArrayAnalysis, context: { isRoot: boolean }): PlanBuildResult {
    const elementResult = this.buildNode(node.element, { isRoot: false });
    const extentStrategy = this.chooseRootArrayExtentStrategy(elementResult.shape, context.isRoot);
    const countEntryId =
      extentStrategy === "explicit-count"
        ? (() => {
            this.usesArrayCounts = true;
            return this.addBlobEntry("array-count", node.path, 4, "uint32", "array-count");
          })()
        : undefined;
    return {
      node: {
        nodeKind: "array",
        typeText: node.typeText,
        path: node.path,
        typeIdentityKey: node.typeIdentityKey,
        cppNameHintParts: node.cppNameHintParts,
        extentStrategy,
        countEntryId,
        elementBlobWidthBytes: elementResult.shape.fixedBlobWidthBytes ?? undefined,
        elementItemCount: elementResult.shape.fixedItemCount ?? undefined,
        element: elementResult.node
      },
      shape: {
        fixedBlobWidthBytes: null,
        fixedItemCount: null,
        hasItems: elementResult.shape.hasItems,
        itemKinds: new Set(elementResult.shape.itemKinds),
        hasVariableExtent: true
      }
    };
  }

  private shouldTailOptimizeStruct(node: TransportStructAnalysis): boolean {
    if (node.fields.length < 2) return false;
    if (this.analysis.root !== node) return false;
    let candidates = 0;
    for (const field of node.fields) {
      if (field.optional || field.node.nodeKind !== "array") continue;
      const elementNode = field.node.element;
      if (elementNode.nodeKind !== "leaf" && elementNode.nodeKind !== "finite-domain") continue;
      candidates += 1;
    }
    return candidates === 1;
  }

  private buildStructNode(node: TransportStructAnalysis, context: { isRoot: boolean }): PlanBuildResult {
    const ordering = this.shouldTailOptimizeStruct(node) ? "tail-optimized" : "source-order";
    const orderedFields = ordering === "tail-optimized"
      ? [...node.fields].sort((left, right) => {
          const leftIsArray = left.node.nodeKind === "array" ? 1 : 0;
          const rightIsArray = right.node.nodeKind === "array" ? 1 : 0;
          return leftIsArray - rightIsArray;
        })
      : node.fields;

    const builtFields: BoundaryPlanField[] = [];
    let shape = BoundaryPlanBuilder.emptyShape();
    for (const field of orderedFields) {
      const presenceEntryId = field.optional
        ? (() => {
            this.usesOptionalPresence = true;
            return this.addBlobEntry("optional-presence", field.path, 1, "uint8", "optional-presence");
          })()
        : undefined;
      const fieldResult = this.buildNode(field.node, { isRoot: false });
      builtFields.push({
        name: field.name,
        optional: field.optional,
        typeText: field.typeText,
        path: field.path,
        presenceStrategy: field.optional ? "byte-flag" : undefined,
        presenceEntryId,
        node: fieldResult.node
      });
      const fieldShape = field.optional
        ? {
            fixedBlobWidthBytes: null,
            fixedItemCount: null,
            hasItems: fieldResult.shape.hasItems,
            itemKinds: new Set(fieldResult.shape.itemKinds),
            hasVariableExtent: true
          }
        : fieldResult.shape;
      shape = this.mergeShapes(shape, fieldShape);
    }

    return {
      node: {
        nodeKind: "struct",
        typeText: node.typeText,
        path: node.path,
        typeIdentityKey: node.typeIdentityKey,
        cppNameHintParts: node.cppNameHintParts,
        ordering,
        fields: builtFields
      },
      shape
    };
  }
}

export function buildBoundaryCodecPlan(codecId: string, analysis: BoundaryTransportAnalysis): BoundaryCodecPlan {
  return new BoundaryPlanBuilder(codecId, analysis).build();
}
