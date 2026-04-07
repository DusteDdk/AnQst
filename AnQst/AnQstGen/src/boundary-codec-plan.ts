import type {
  BinaryLeafKind,
  BoundaryCodecPlan,
  BoundaryCodecRequirements,
  BoundaryPlanBlobEntry,
  BoundaryPlanLeafNode,
  BoundaryPlanNode,
  BoundaryPlanRegionEntry,
  BoundaryPlanStructNode,
  BoundaryTransportAnalysis,
  ScalarLeafKind,
  TransportAnalysisNode,
  TransportArrayAnalysis,
  TransportLeafAnalysis,
  TransportStructAnalysis
} from "./boundary-codec-model";

class BoundaryPlanBuilder {
  private nextIdValue = 0;
  private readonly blobEntries: BoundaryPlanBlobEntry[] = [];
  private readonly stringEntries: BoundaryPlanRegionEntry[] = [];
  private readonly binaryEntries: BoundaryPlanRegionEntry[] = [];
  private readonly dynamicEntries: BoundaryPlanRegionEntry[] = [];
  private readonly usedScalarLeafKinds = new Set<ScalarLeafKind>();
  private readonly usedBinaryLeafKinds = new Set<BinaryLeafKind>();
  private usesArrayCounts = false;
  private usesOptionalPresence = false;

  constructor(
    private readonly codecId: string,
    private readonly analysis: BoundaryTransportAnalysis
  ) {}

  build(): BoundaryCodecPlan {
    const root = this.buildNode(this.analysis.root);
    const requirements = this.buildRequirements();
    return {
      codecId: this.codecId,
      typeText: this.analysis.typeText,
      tsTypeText: this.analysis.tsTypeText,
      analysis: this.analysis,
      root,
      blobEntries: this.blobEntries,
      stringEntries: this.stringEntries,
      binaryEntries: this.binaryEntries,
      dynamicEntries: this.dynamicEntries,
      requirements
    };
  }

  private buildRequirements(): BoundaryCodecRequirements {
    const hasBlob = this.blobEntries.length > 0;
    const hasStrings = this.stringEntries.length > 0;
    const hasBinaries = this.binaryEntries.length > 0;
    const hasDynamics = this.dynamicEntries.length > 0;
    return {
      hasBlob,
      hasStrings,
      hasBinaries,
      hasDynamics,
      usesArrayCounts: this.usesArrayCounts,
      usesOptionalPresence: this.usesOptionalPresence,
      requiresCountPass: hasBlob && (hasStrings || hasBinaries || hasDynamics),
      staticStringEntries: this.stringEntries.length,
      staticBinaryEntries: this.binaryEntries.length,
      staticDynamicEntries: this.dynamicEntries.length,
      usedScalarLeafKinds: [...this.usedScalarLeafKinds],
      usedBinaryLeafKinds: [...this.usedBinaryLeafKinds]
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

  private addRegionEntry(region: BoundaryPlanRegionEntry["region"], path: string[], logicalKind: string): string {
    const entryId = this.nextId(region);
    const entry: BoundaryPlanRegionEntry = { entryId, region, path, logicalKind };
    if (region === "string") this.stringEntries.push(entry);
    if (region === "binary") this.binaryEntries.push(entry);
    if (region === "dynamic") this.dynamicEntries.push(entry);
    return entryId;
  }

  private buildNode(node: TransportAnalysisNode): BoundaryPlanNode {
    switch (node.nodeKind) {
      case "leaf":
        return this.buildLeafNode(node);
      case "array":
        return this.buildArrayNode(node);
      case "struct":
        return this.buildStructNode(node);
    }
  }

  private buildLeafNode(node: TransportLeafAnalysis): BoundaryPlanLeafNode {
    if (node.leaf.region === "blob") {
      const widthBytes = node.leaf.fixedByteWidth ?? 0;
      const blobEntryId = this.addBlobEntry("leaf", node.path, widthBytes, node.leaf.key as ScalarLeafKind, node.leaf.logicalKind);
      return {
        nodeKind: "leaf",
        typeText: node.typeText,
        path: node.path,
        leaf: node.leaf,
        blobEntryId
      };
    }
    if (node.leaf.region === "binary") {
      this.usedBinaryLeafKinds.add(node.leaf.key as BinaryLeafKind);
      return {
        nodeKind: "leaf",
        typeText: node.typeText,
        path: node.path,
        leaf: node.leaf,
        regionEntryId: this.addRegionEntry("binary", node.path, node.leaf.logicalKind)
      };
    }
    return {
      nodeKind: "leaf",
      typeText: node.typeText,
      path: node.path,
      leaf: node.leaf,
      regionEntryId: this.addRegionEntry(node.leaf.region, node.path, node.leaf.logicalKind)
    };
  }

  private buildArrayNode(node: TransportArrayAnalysis): BoundaryPlanNode {
    this.usesArrayCounts = true;
    const countEntryId = this.addBlobEntry("array-count", node.path, 4, "uint32", "array-count");
    return {
      nodeKind: "array",
      typeText: node.typeText,
      path: node.path,
      countEntryId,
      element: this.buildNode(node.element)
    };
  }

  private buildStructNode(node: TransportStructAnalysis): BoundaryPlanStructNode {
    return {
      nodeKind: "struct",
      typeText: node.typeText,
      path: node.path,
      fields: node.fields.map((field) => {
        const presenceEntryId = field.optional
          ? (() => {
              this.usesOptionalPresence = true;
              return this.addBlobEntry("optional-presence", field.path, 1, "uint8", "optional-presence");
            })()
          : undefined;
        return {
          name: field.name,
          optional: field.optional,
          typeText: field.typeText,
          path: field.path,
          presenceEntryId,
          node: this.buildNode(field.node)
        };
      })
    };
  }
}

export function buildBoundaryCodecPlan(codecId: string, analysis: BoundaryTransportAnalysis): BoundaryCodecPlan {
  return new BoundaryPlanBuilder(codecId, analysis).build();
}
