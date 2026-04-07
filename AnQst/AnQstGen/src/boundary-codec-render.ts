import { emitBase93CppFunctions, emitBase93Decoder, emitBase93Encoder } from "./base93";
import {
  stripAnQstType,
  type BinaryLeafKind,
  type BoundaryCodecCatalog,
  type BoundaryCodecPlan,
  type BoundaryPlanLeafNode,
  type BoundaryPlanNode,
  type ScalarLeafKind
} from "./boundary-codec-model";

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

class CppEmitterContext {
  private nextId = 0;
  next(prefix: string): string {
    this.nextId += 1;
    return `${prefix}${this.nextId}`;
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
  }
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
  }
}

function binaryEncodeHelperName(binary: BinaryLeafKind): string {
  return `__anqstEncodeBinary_${binary}`;
}

function binaryDecodeHelperName(binary: BinaryLeafKind): string {
  return `__anqstDecodeBinary_${binary}`;
}

function tsCast(expression: string, typeText: string): string {
  return `(${expression}) as ${stripAnQstType(typeText)}`;
}

function emitTsEncodeNode(node: BoundaryPlanNode, valueExpr: string, lines: string[], ctx: TsEmitterContext, level: number): void {
  const pad = indent(level);
  switch (node.nodeKind) {
    case "leaf":
      if (node.leaf.region === "blob") {
        lines.push(`${pad}${tsScalarWriteHelper(node.leaf.key as ScalarLeafKind)}(__bytes, ${valueExpr});`);
      } else if (node.leaf.region === "string") {
        lines.push(`${pad}__strings.push(${valueExpr});`);
      } else if (node.leaf.region === "binary") {
        lines.push(`${pad}__binaries.push(${binaryEncodeHelperName(node.leaf.key as BinaryLeafKind)}(${valueExpr}));`);
      } else {
        lines.push(`${pad}__dynamics.push(${valueExpr});`);
      }
      return;
    case "array": {
      lines.push(`${pad}__anqstPushUint32(__bytes, ${valueExpr}.length >>> 0);`);
      const itemVar = ctx.next("item");
      lines.push(`${pad}for (const ${itemVar} of ${valueExpr}) {`);
      emitTsEncodeNode(node.element, itemVar, lines, ctx, level + 1);
      lines.push(`${pad}}`);
      return;
    }
    case "struct":
      for (const field of node.fields) {
        const fieldExpr = `${valueExpr}.${field.name}`;
        if (field.optional) {
          const presentVar = ctx.next("present");
          lines.push(`${pad}const ${presentVar} = ${fieldExpr} !== undefined;`);
          lines.push(`${pad}__anqstPushUint8(__bytes, ${presentVar} ? 1 : 0);`);
          lines.push(`${pad}if (${presentVar}) {`);
          emitTsEncodeNode(field.node, `${fieldExpr}!`, lines, ctx, level + 1);
          lines.push(`${pad}}`);
        } else {
          emitTsEncodeNode(field.node, fieldExpr, lines, ctx, level);
        }
      }
  }
}

function emitTsCountNode(node: BoundaryPlanNode, lines: string[], ctx: TsEmitterContext, level: number): void {
  const pad = indent(level);
  switch (node.nodeKind) {
    case "leaf":
      if (node.leaf.region === "blob") {
        lines.push(`${pad}__countCursor.offset += ${node.leaf.fixedByteWidth ?? 0};`);
      } else if (node.leaf.region === "string") {
        lines.push(`${pad}__counts.stringCount += 1;`);
      } else if (node.leaf.region === "binary") {
        lines.push(`${pad}__counts.binaryCount += 1;`);
      } else {
        lines.push(`${pad}__counts.dynamicCount += 1;`);
      }
      return;
    case "array": {
      const countVar = ctx.next("count");
      const indexVar = ctx.next("index");
      lines.push(`${pad}const ${countVar} = __anqstReadUint32(__blob, __countCursor);`);
      lines.push(`${pad}for (let ${indexVar} = 0; ${indexVar} < ${countVar}; ${indexVar} += 1) {`);
      emitTsCountNode(node.element, lines, ctx, level + 1);
      lines.push(`${pad}}`);
      return;
    }
    case "struct":
      for (const field of node.fields) {
        if (field.optional) {
          const presentVar = ctx.next("present");
          lines.push(`${pad}const ${presentVar} = __anqstReadUint8(__blob, __countCursor) !== 0;`);
          lines.push(`${pad}if (${presentVar}) {`);
          emitTsCountNode(field.node, lines, ctx, level + 1);
          lines.push(`${pad}}`);
        } else {
          emitTsCountNode(field.node, lines, ctx, level);
        }
      }
  }
}

function emitTsDecodeLeaf(node: BoundaryPlanLeafNode): string {
  switch (node.leaf.region) {
    case "blob":
      return tsCast(`${tsScalarReadHelper(node.leaf.key as ScalarLeafKind)}(__blob, __dataCursor)`, node.typeText);
    case "string":
      return tsCast(`String(__items[__stringCursor.value++] ?? "")`, node.typeText);
    case "binary":
      return tsCast(`${binaryDecodeHelperName(node.leaf.key as BinaryLeafKind)}(String(__items[__binaryCursor.value++] ?? ""))`, node.typeText);
    case "dynamic":
      return tsCast(`__items[__dynamicCursor.value++]`, node.typeText);
  }
}

function emitTsDecodeNode(node: BoundaryPlanNode, lines: string[], ctx: TsEmitterContext, level: number): string {
  const pad = indent(level);
  switch (node.nodeKind) {
    case "leaf":
      return emitTsDecodeLeaf(node);
    case "array": {
      const arrayVar = ctx.next("array");
      const countVar = ctx.next("count");
      const indexVar = ctx.next("index");
      lines.push(`${pad}const ${arrayVar}: ${stripAnQstType(node.typeText)} = [];`);
      lines.push(`${pad}const ${countVar} = __anqstReadUint32(__blob, __dataCursor);`);
      lines.push(`${pad}for (let ${indexVar} = 0; ${indexVar} < ${countVar}; ${indexVar} += 1) {`);
      const elementExpr = emitTsDecodeNode(node.element, lines, ctx, level + 1);
      lines.push(`${indent(level + 1)}${arrayVar}.push(${elementExpr});`);
      lines.push(`${pad}}`);
      return arrayVar;
    }
    case "struct": {
      const valueVar = ctx.next("value");
      lines.push(`${pad}const ${valueVar} = {} as ${stripAnQstType(node.typeText)};`);
      for (const field of node.fields) {
        if (field.optional) {
          const presentVar = ctx.next("present");
          lines.push(`${pad}const ${presentVar} = __anqstReadUint8(__blob, __dataCursor) !== 0;`);
          lines.push(`${pad}if (${presentVar}) {`);
          const fieldExpr = emitTsDecodeNode(field.node, lines, ctx, level + 1);
          lines.push(`${indent(level + 1)}${valueVar}.${field.name} = ${fieldExpr};`);
          lines.push(`${pad}}`);
        } else {
          const fieldExpr = emitTsDecodeNode(field.node, lines, ctx, level);
          lines.push(`${pad}${valueVar}.${field.name} = ${fieldExpr};`);
        }
      }
      return valueVar;
    }
  }
}

function renderTsPlanCodec(plan: BoundaryCodecPlan): string {
  const encodeLines: string[] = [];
  emitTsEncodeNode(plan.root, "value", encodeLines, new TsEmitterContext(), 1);

  const countLines: string[] = [];
  const decodeCtx = new TsEmitterContext();
  if (plan.requirements.requiresCountPass) {
    emitTsCountNode(plan.root, countLines, decodeCtx, 1);
  }

  const decodeLines: string[] = [];
  const decodeExpr = emitTsDecodeNode(plan.root, decodeLines, decodeCtx, 1);
  const encoderName = `encode${plan.codecId}`;
  const decoderName = `decode${plan.codecId}`;
  const staticStringCount = plan.requirements.staticStringEntries;
  const staticBinaryCount = plan.requirements.staticBinaryEntries;
  const staticDynamicCount = plan.requirements.staticDynamicEntries;

  return `function ${encoderName}(value: ${plan.tsTypeText}): unknown {
  const __bytes: number[] = [];
  const __strings: string[] = [];
  const __binaries: string[] = [];
  const __dynamics: unknown[] = [];
${encodeLines.join("\n")}
  return __anqstFinalizeWire(__bytes, __strings, __binaries, __dynamics);
}

function ${decoderName}(wire: unknown): ${plan.tsTypeText} {
  const __items = Array.isArray(wire) ? wire : [wire];
  const __blob = ${plan.requirements.hasBlob ? `__anqstBase93Decode(String(__items[0] ?? ""))` : "new Uint8Array()"};
  const __counts = { stringCount: ${staticStringCount}, binaryCount: ${staticBinaryCount}, dynamicCount: ${staticDynamicCount} };
  const __countCursor = { offset: 0 };
${countLines.join("\n")}
  const __stringCursor = { value: ${plan.requirements.hasBlob ? 1 : 0} };
  const __binaryCursor = { value: ${plan.requirements.hasBlob ? 1 : 0} + __counts.stringCount };
  const __dynamicCursor = { value: ${plan.requirements.hasBlob ? 1 : 0} + __counts.stringCount + __counts.binaryCount };
  const __dataCursor = { offset: 0 };
${decodeLines.join("\n")}
  return (${decodeExpr}) as ${plan.tsTypeText};
}`;
}

function collectTsSupport(catalog: BoundaryCodecCatalog): {
  needsBase93: boolean;
  scalarLeafKinds: ScalarLeafKind[];
  binaryLeafKinds: BinaryLeafKind[];
} {
  const scalarLeafKinds = new Set<ScalarLeafKind>();
  const binaryLeafKinds = new Set<BinaryLeafKind>();
  let needsBase93 = false;
  for (const plan of catalog.plans) {
    if (plan.requirements.hasBlob || plan.requirements.hasBinaries) {
      needsBase93 = true;
    }
    for (const kind of plan.requirements.usedScalarLeafKinds) scalarLeafKinds.add(kind);
    for (const kind of plan.requirements.usedBinaryLeafKinds) binaryLeafKinds.add(kind);
  }
  return {
    needsBase93,
    scalarLeafKinds: [...scalarLeafKinds],
    binaryLeafKinds: [...binaryLeafKinds]
  };
}

function renderTsRuntimeSupport(catalog: BoundaryCodecCatalog): string {
  const support = collectTsSupport(catalog);
  const lines: string[] = [];
  if (support.needsBase93) {
    lines.push(`const __anqstBase93Encode: (d: Uint8Array) => string = ${emitBase93Encoder()};`);
    lines.push(`const __anqstBase93Decode: (s: string) => Uint8Array = ${emitBase93Decoder()};`);
    lines.push("");
  }
  lines.push("function __anqstFinalizeWire(bytes: number[], strings: string[], binaries: string[], dynamics: unknown[]): unknown {");
  lines.push("  const items: unknown[] = [];");
  if (support.needsBase93) {
    lines.push("  if (bytes.length > 0) items.push(__anqstBase93Encode(Uint8Array.from(bytes)));");
  } else {
    lines.push('  if (bytes.length > 0) throw new Error("AnQst boundary planner emitted unexpected blob bytes.");');
  }
  lines.push("  for (const value of strings) items.push(value);");
  lines.push("  for (const value of binaries) items.push(value);");
  lines.push("  for (const value of dynamics) items.push(value);");
  lines.push("  return items.length === 1 ? items[0] : items;");
  lines.push("}");
  lines.push("");

  const scalarKinds = new Set(support.scalarLeafKinds);
  if (scalarKinds.has("boolean")) scalarKinds.add("uint8");
  if (scalarKinds.has("uint8")) lines.push("function __anqstPushUint8(out: number[], value: number): void { out.push(value & 0xff); }");
  if (scalarKinds.has("int8")) lines.push("function __anqstPushInt8(out: number[], value: number): void { const buf = new Int8Array(1); buf[0] = value; out.push(new Uint8Array(buf.buffer)[0]); }");
  if (scalarKinds.has("boolean")) lines.push("function __anqstPushBool(out: number[], value: boolean): void { out.push(value ? 1 : 0); }");
  if (scalarKinds.has("uint16") || scalarKinds.has("quint16")) lines.push("function __anqstPushUint16(out: number[], value: number): void { const buf = new ArrayBuffer(2); const view = new DataView(buf); view.setUint16(0, value >>> 0, true); out.push(...new Uint8Array(buf)); }");
  if (scalarKinds.has("int16") || scalarKinds.has("qint16")) lines.push("function __anqstPushInt16(out: number[], value: number): void { const buf = new ArrayBuffer(2); const view = new DataView(buf); view.setInt16(0, value, true); out.push(...new Uint8Array(buf)); }");
  if (scalarKinds.has("uint32") || scalarKinds.has("quint32")) lines.push("function __anqstPushUint32(out: number[], value: number): void { const buf = new ArrayBuffer(4); const view = new DataView(buf); view.setUint32(0, value >>> 0, true); out.push(...new Uint8Array(buf)); }");
  if (scalarKinds.has("int32") || scalarKinds.has("qint32")) lines.push("function __anqstPushInt32(out: number[], value: number): void { const buf = new ArrayBuffer(4); const view = new DataView(buf); view.setInt32(0, value, true); out.push(...new Uint8Array(buf)); }");
  if (scalarKinds.has("number")) lines.push("function __anqstPushFloat64(out: number[], value: number): void { const buf = new ArrayBuffer(8); const view = new DataView(buf); view.setFloat64(0, value, true); out.push(...new Uint8Array(buf)); }");
  if (scalarKinds.has("qint64")) lines.push("function __anqstPushBigInt64(out: number[], value: bigint): void { const buf = new ArrayBuffer(8); const view = new DataView(buf); view.setBigInt64(0, value, true); out.push(...new Uint8Array(buf)); }");
  if (scalarKinds.has("quint64")) lines.push("function __anqstPushBigUint64(out: number[], value: bigint): void { const buf = new ArrayBuffer(8); const view = new DataView(buf); view.setBigUint64(0, value, true); out.push(...new Uint8Array(buf)); }");
  if (scalarKinds.size > 0) lines.push("");

  if (scalarKinds.has("uint8")) lines.push("function __anqstReadUint8(bytes: Uint8Array, cursor: { offset: number }): number { return bytes[cursor.offset++] ?? 0; }");
  if (scalarKinds.has("int8")) lines.push("function __anqstReadInt8(bytes: Uint8Array, cursor: { offset: number }): number { const buf = new Uint8Array([bytes[cursor.offset++] ?? 0]); return new Int8Array(buf.buffer)[0] ?? 0; }");
  if (scalarKinds.has("boolean")) lines.push("function __anqstReadBool(bytes: Uint8Array, cursor: { offset: number }): boolean { return (__anqstReadUint8(bytes, cursor) & 1) === 1; }");
  if (scalarKinds.has("uint16") || scalarKinds.has("quint16")) lines.push("function __anqstReadUint16(bytes: Uint8Array, cursor: { offset: number }): number { const view = new DataView(bytes.buffer, bytes.byteOffset + cursor.offset, 2); const value = view.getUint16(0, true); cursor.offset += 2; return value; }");
  if (scalarKinds.has("int16") || scalarKinds.has("qint16")) lines.push("function __anqstReadInt16(bytes: Uint8Array, cursor: { offset: number }): number { const view = new DataView(bytes.buffer, bytes.byteOffset + cursor.offset, 2); const value = view.getInt16(0, true); cursor.offset += 2; return value; }");
  if (scalarKinds.has("uint32") || scalarKinds.has("quint32")) lines.push("function __anqstReadUint32(bytes: Uint8Array, cursor: { offset: number }): number { const view = new DataView(bytes.buffer, bytes.byteOffset + cursor.offset, 4); const value = view.getUint32(0, true); cursor.offset += 4; return value; }");
  if (scalarKinds.has("int32") || scalarKinds.has("qint32")) lines.push("function __anqstReadInt32(bytes: Uint8Array, cursor: { offset: number }): number { const view = new DataView(bytes.buffer, bytes.byteOffset + cursor.offset, 4); const value = view.getInt32(0, true); cursor.offset += 4; return value; }");
  if (scalarKinds.has("number")) lines.push("function __anqstReadFloat64(bytes: Uint8Array, cursor: { offset: number }): number { const view = new DataView(bytes.buffer, bytes.byteOffset + cursor.offset, 8); const value = view.getFloat64(0, true); cursor.offset += 8; return value; }");
  if (scalarKinds.has("qint64")) lines.push("function __anqstReadBigInt64(bytes: Uint8Array, cursor: { offset: number }): bigint { const view = new DataView(bytes.buffer, bytes.byteOffset + cursor.offset, 8); const value = view.getBigInt64(0, true); cursor.offset += 8; return value; }");
  if (scalarKinds.has("quint64")) lines.push("function __anqstReadBigUint64(bytes: Uint8Array, cursor: { offset: number }): bigint { const view = new DataView(bytes.buffer, bytes.byteOffset + cursor.offset, 8); const value = view.getBigUint64(0, true); cursor.offset += 8; return value; }");
  if (scalarKinds.size > 0) lines.push("");

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
  if (support.binaryLeafKinds.includes("ArrayBuffer")) {
    lines.push("function __anqstEncodeBinary_ArrayBuffer(value: ArrayBuffer): string { return __anqstBase93Encode(new Uint8Array(value)); }");
    lines.push("function __anqstDecodeBinary_ArrayBuffer(encoded: string): ArrayBuffer { const bytes = __anqstBase93Decode(encoded); const copy = new Uint8Array(bytes.byteLength); copy.set(bytes); return copy.buffer as ArrayBuffer; }");
  }
  for (const kind of support.binaryLeafKinds.filter((binary): binary is Exclude<BinaryLeafKind, "ArrayBuffer"> => binary !== "ArrayBuffer")) {
    const ctor = typedArrayCtorByKind[kind];
    lines.push(`function ${binaryEncodeHelperName(kind)}(value: ${ctor}): string { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }`);
    lines.push(`function ${binaryDecodeHelperName(kind)}(encoded: string): ${ctor} { const bytes = __anqstBase93Decode(encoded); const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); return new ${ctor}(buffer); }`);
  }

  return lines.join("\n");
}

export function renderTsBoundaryCodecHelpers(catalog: BoundaryCodecCatalog): string {
  if (catalog.plans.length === 0) return "";
  const runtime = renderTsRuntimeSupport(catalog);
  const codecs = catalog.plans.map((plan) => renderTsPlanCodec(plan)).join("\n\n");
  return `${runtime}\n\n${codecs}\n`;
}

function renderCppTypeCast(typeText: string, path: string[], mapCppType: (typeText: string, pathHintParts: string[]) => string): string {
  return mapCppType(typeText, path);
}

function emitCppEncodeNode(
  node: BoundaryPlanNode,
  valueExpr: string,
  lines: string[],
  ctx: CppEmitterContext,
  level: number
): void {
  const pad = indent(level).replace(/  /g, "    ");
  switch (node.nodeKind) {
    case "leaf":
      if (node.leaf.region === "blob") {
        lines.push(`${pad}${cppScalarWriteHelper(node.leaf.key as ScalarLeafKind)}(bytes, ${valueExpr});`);
      } else if (node.leaf.region === "string") {
        lines.push(`${pad}strings.push_back(${valueExpr});`);
      } else if (node.leaf.region === "binary") {
        lines.push(`${pad}binaries.push_back(anqstEncodeBinary(${valueExpr}));`);
      } else {
        lines.push(`${pad}dynamics.push_back(QVariant::fromValue(${valueExpr}));`);
      }
      return;
    case "array": {
      lines.push(`${pad}anqstPushUint32(bytes, static_cast<std::uint32_t>(${valueExpr}.size()));`);
      const itemVar = ctx.next("item");
      lines.push(`${pad}for (const auto& ${itemVar} : ${valueExpr}) {`);
      emitCppEncodeNode(node.element, itemVar, lines, ctx, level + 1);
      lines.push(`${pad}}`);
      return;
    }
    case "struct":
      for (const field of node.fields) {
        const fieldExpr = `${valueExpr}.${field.name}`;
        if (field.optional) {
          const presentVar = ctx.next("present");
          lines.push(`${pad}const bool ${presentVar} = ${fieldExpr}.has_value();`);
          lines.push(`${pad}anqstPushUint8(bytes, ${presentVar} ? 1u : 0u);`);
          lines.push(`${pad}if (${presentVar}) {`);
          emitCppEncodeNode(field.node, `${fieldExpr}.value()`, lines, ctx, level + 1);
          lines.push(`${pad}}`);
        } else {
          emitCppEncodeNode(field.node, fieldExpr, lines, ctx, level);
        }
      }
  }
}

function emitCppCountNode(node: BoundaryPlanNode, lines: string[], ctx: CppEmitterContext, level: number): void {
  const pad = indent(level).replace(/  /g, "    ");
  switch (node.nodeKind) {
    case "leaf":
      if (node.leaf.region === "blob") {
        lines.push(`${pad}countOffset += ${node.leaf.fixedByteWidth ?? 0};`);
      } else if (node.leaf.region === "string") {
        lines.push(`${pad}stringCount += 1;`);
      } else if (node.leaf.region === "binary") {
        lines.push(`${pad}binaryCount += 1;`);
      } else {
        lines.push(`${pad}dynamicCount += 1;`);
      }
      return;
    case "array": {
      const countVar = ctx.next("count");
      lines.push(`${pad}const std::uint32_t ${countVar} = anqstReadUint32(blob, countOffset);`);
      lines.push(`${pad}for (std::uint32_t i = 0; i < ${countVar}; ++i) {`);
      emitCppCountNode(node.element, lines, ctx, level + 1);
      lines.push(`${pad}}`);
      return;
    }
    case "struct":
      for (const field of node.fields) {
        if (field.optional) {
          const presentVar = ctx.next("present");
          lines.push(`${pad}const bool ${presentVar} = anqstReadUint8(blob, countOffset) != 0u;`);
          lines.push(`${pad}if (${presentVar}) {`);
          emitCppCountNode(field.node, lines, ctx, level + 1);
          lines.push(`${pad}}`);
        } else {
          emitCppCountNode(field.node, lines, ctx, level);
        }
      }
  }
}

function emitCppDecodeNode(
  node: BoundaryPlanNode,
  lines: string[],
  ctx: CppEmitterContext,
  level: number,
  mapCppType: (typeText: string, pathHintParts: string[]) => string
): string {
  const pad = indent(level).replace(/  /g, "    ");
  switch (node.nodeKind) {
    case "leaf":
      if (node.leaf.region === "blob") {
        return `${cppScalarReadHelper(node.leaf.key as ScalarLeafKind)}(blob, dataOffset)`;
      }
      if (node.leaf.region === "string") {
        return `items.value(static_cast<int>(stringIndex++)).toString()`;
      }
      if (node.leaf.region === "binary") {
        return `anqstDecodeBinary(items.value(static_cast<int>(binaryIndex++)).toString())`;
      }
      return `items.value(static_cast<int>(dynamicIndex++)).toMap()`;
    case "array": {
      const arrayType = renderCppTypeCast(node.typeText, node.path, mapCppType);
      const arrayVar = ctx.next("array");
      const countVar = ctx.next("count");
      lines.push(`${pad}${arrayType} ${arrayVar};`);
      lines.push(`${pad}const std::uint32_t ${countVar} = anqstReadUint32(blob, dataOffset);`);
      lines.push(`${pad}for (std::uint32_t i = 0; i < ${countVar}; ++i) {`);
      const elementExpr = emitCppDecodeNode(node.element, lines, ctx, level + 1, mapCppType);
      lines.push(`${indent(level + 1).replace(/  /g, "    ")}${arrayVar}.push_back(${elementExpr});`);
      lines.push(`${pad}}`);
      return arrayVar;
    }
    case "struct": {
      const valueType = renderCppTypeCast(node.typeText, node.path, mapCppType);
      const valueVar = ctx.next("value");
      lines.push(`${pad}${valueType} ${valueVar}{};`);
      for (const field of node.fields) {
        if (field.optional) {
          const presentVar = ctx.next("present");
          lines.push(`${pad}const bool ${presentVar} = anqstReadUint8(blob, dataOffset) != 0u;`);
          lines.push(`${pad}if (${presentVar}) {`);
          const fieldExpr = emitCppDecodeNode(field.node, lines, ctx, level + 1, mapCppType);
          lines.push(`${indent(level + 1).replace(/  /g, "    ")}${valueVar}.${field.name} = ${fieldExpr};`);
          lines.push(`${pad}}`);
        } else {
          const fieldExpr = emitCppDecodeNode(field.node, lines, ctx, level, mapCppType);
          lines.push(`${pad}${valueVar}.${field.name} = ${fieldExpr};`);
        }
      }
      return valueVar;
    }
  }
}

function renderCppPlanCodec(
  plan: BoundaryCodecPlan,
  mapCppType: (typeText: string, pathHintParts: string[]) => string
): string {
  const cppType = mapCppType(plan.typeText, plan.root.path);
  const encodeLines: string[] = [];
  emitCppEncodeNode(plan.root, "value", encodeLines, new CppEmitterContext(), 1);

  const countLines: string[] = [];
  const decodeCtx = new CppEmitterContext();
  if (plan.requirements.requiresCountPass) {
    emitCppCountNode(plan.root, countLines, decodeCtx, 1);
  }

  const decodeLines: string[] = [];
  const decodeExpr = emitCppDecodeNode(plan.root, decodeLines, decodeCtx, 1, mapCppType);
  const encoderName = `encode${plan.codecId}`;
  const decoderName = `decode${plan.codecId}`;

  return `inline QVariant ${encoderName}(const ${cppType}& value) {
    std::vector<std::uint8_t> bytes;
    QStringList strings;
    QStringList binaries;
    QVariantList dynamics;
${encodeLines.join("\n")}
    return anqstFinalizeWire(bytes, strings, binaries, dynamics);
}

inline ${cppType} ${decoderName}(const QVariant& wire) {
    const QVariantList items = anqstNormalizeWireItems(wire);
    const std::vector<std::uint8_t> blob = ${plan.requirements.hasBlob ? `(items.isEmpty() ? std::vector<std::uint8_t>{} : base93Decode(items.value(0).toString().toStdString()))` : "std::vector<std::uint8_t>{}"};
    std::size_t stringCount = ${plan.requirements.staticStringEntries};
    std::size_t binaryCount = ${plan.requirements.staticBinaryEntries};
    std::size_t dynamicCount = ${plan.requirements.staticDynamicEntries};
    std::size_t countOffset = 0;
${countLines.join("\n")}
    std::size_t stringIndex = ${plan.requirements.hasBlob ? 1 : 0};
    std::size_t binaryIndex = ${plan.requirements.hasBlob ? 1 : 0} + stringCount;
    std::size_t dynamicIndex = ${plan.requirements.hasBlob ? 1 : 0} + stringCount + binaryCount;
    std::size_t dataOffset = 0;
${decodeLines.join("\n")}
    return ${decodeExpr};
}`;
}

function collectCppSupport(catalog: BoundaryCodecCatalog): {
  needsBase93: boolean;
  needsBinaryHelpers: boolean;
  scalarLeafKinds: ScalarLeafKind[];
} {
  const scalarLeafKinds = new Set<ScalarLeafKind>();
  let needsBase93 = false;
  let needsBinaryHelpers = false;
  for (const plan of catalog.plans) {
    if (plan.requirements.hasBlob || plan.requirements.hasBinaries) {
      needsBase93 = true;
    }
    if (plan.requirements.hasBinaries) {
      needsBinaryHelpers = true;
    }
    for (const kind of plan.requirements.usedScalarLeafKinds) scalarLeafKinds.add(kind);
  }
  return {
    needsBase93,
    needsBinaryHelpers,
    scalarLeafKinds: [...scalarLeafKinds]
  };
}

function renderCppRuntimeSupport(catalog: BoundaryCodecCatalog): string {
  const support = collectCppSupport(catalog);
  const lines: string[] = [];
  if (support.needsBase93) {
    lines.push(emitBase93CppFunctions());
    lines.push("");
  }
  lines.push("inline QVariantList anqstNormalizeWireItems(const QVariant& wire) {");
  lines.push("    return wire.type() == QVariant::List ? wire.toList() : QVariantList{wire};");
  lines.push("}");
  lines.push("");
  lines.push("inline QVariant anqstFinalizeWire(const std::vector<std::uint8_t>& bytes, const QStringList& strings, const QStringList& binaries, const QVariantList& dynamics) {");
  lines.push("    QVariantList items;");
  if (support.needsBase93) {
    lines.push("    if (!bytes.empty()) items.push_back(QString::fromStdString(base93Encode(bytes)));");
  } else {
    lines.push('    if (!bytes.empty()) throw std::runtime_error("AnQst boundary planner emitted unexpected blob bytes.");');
  }
  lines.push("    for (const auto& value : strings) items.push_back(value);");
  lines.push("    for (const auto& value : binaries) items.push_back(value);");
  lines.push("    for (const auto& value : dynamics) items.push_back(value);");
  lines.push("    if (items.size() == 1) return items.front();");
  lines.push("    return items;");
  lines.push("}");
  lines.push("");

  const scalarKinds = new Set(support.scalarLeafKinds);
  if (scalarKinds.has("boolean")) scalarKinds.add("uint8");
  if (scalarKinds.has("int16") || scalarKinds.has("quint16") || scalarKinds.has("qint16")) scalarKinds.add("uint16");
  if (scalarKinds.has("qint16")) scalarKinds.add("int16");
  if (scalarKinds.has("int32") || scalarKinds.has("quint32") || scalarKinds.has("qint32")) scalarKinds.add("uint32");
  if (scalarKinds.has("qint32")) scalarKinds.add("int32");
  if (scalarKinds.has("qint64") || scalarKinds.has("number")) scalarKinds.add("quint64");
  if (scalarKinds.has("uint8")) lines.push("inline void anqstPushUint8(std::vector<std::uint8_t>& out, std::uint8_t value) { out.push_back(value); }");
  if (scalarKinds.has("int8")) lines.push("inline void anqstPushInt8(std::vector<std::uint8_t>& out, std::int8_t value) { out.push_back(static_cast<std::uint8_t>(value)); }");
  if (scalarKinds.has("boolean")) lines.push("inline void anqstPushBool(std::vector<std::uint8_t>& out, bool value) { out.push_back(value ? 1u : 0u); }");
  if (scalarKinds.has("uint16") || scalarKinds.has("quint16")) lines.push("inline void anqstPushUint16(std::vector<std::uint8_t>& out, std::uint16_t value) { out.push_back(static_cast<std::uint8_t>(value & 0xffu)); out.push_back(static_cast<std::uint8_t>((value >> 8) & 0xffu)); }");
  if (scalarKinds.has("int16")) lines.push("inline void anqstPushInt16(std::vector<std::uint8_t>& out, std::int16_t value) { anqstPushUint16(out, static_cast<std::uint16_t>(value)); }");
  if (scalarKinds.has("quint16")) lines.push("inline void anqstPushQuint16(std::vector<std::uint8_t>& out, quint16 value) { anqstPushUint16(out, static_cast<std::uint16_t>(value)); }");
  if (scalarKinds.has("qint16")) lines.push("inline void anqstPushQint16(std::vector<std::uint8_t>& out, qint16 value) { anqstPushInt16(out, static_cast<std::int16_t>(value)); }");
  if (scalarKinds.has("uint32") || scalarKinds.has("quint32")) lines.push("inline void anqstPushUint32(std::vector<std::uint8_t>& out, std::uint32_t value) { out.push_back(static_cast<std::uint8_t>(value & 0xffu)); out.push_back(static_cast<std::uint8_t>((value >> 8) & 0xffu)); out.push_back(static_cast<std::uint8_t>((value >> 16) & 0xffu)); out.push_back(static_cast<std::uint8_t>((value >> 24) & 0xffu)); }");
  if (scalarKinds.has("int32")) lines.push("inline void anqstPushInt32(std::vector<std::uint8_t>& out, std::int32_t value) { anqstPushUint32(out, static_cast<std::uint32_t>(value)); }");
  if (scalarKinds.has("quint32")) lines.push("inline void anqstPushQuint32(std::vector<std::uint8_t>& out, quint32 value) { anqstPushUint32(out, static_cast<std::uint32_t>(value)); }");
  if (scalarKinds.has("qint32")) lines.push("inline void anqstPushQint32(std::vector<std::uint8_t>& out, qint32 value) { anqstPushInt32(out, static_cast<std::int32_t>(value)); }");
  if (scalarKinds.has("quint64")) lines.push("inline void anqstPushQuint64(std::vector<std::uint8_t>& out, quint64 value) { for (int shift = 0; shift < 64; shift += 8) out.push_back(static_cast<std::uint8_t>((static_cast<std::uint64_t>(value) >> shift) & 0xffu)); }");
  if (scalarKinds.has("qint64")) lines.push("inline void anqstPushQint64(std::vector<std::uint8_t>& out, qint64 value) { anqstPushQuint64(out, static_cast<quint64>(value)); }");
  if (scalarKinds.has("number")) lines.push("inline void anqstPushFloat64(std::vector<std::uint8_t>& out, double value) { std::uint64_t bits = 0; std::memcpy(&bits, &value, sizeof(bits)); anqstPushQuint64(out, bits); }");
  if (scalarKinds.size > 0) lines.push("");

  if (scalarKinds.has("uint8")) lines.push("inline std::uint8_t anqstReadUint8(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return offset < bytes.size() ? bytes[offset++] : 0u; }");
  if (scalarKinds.has("int8")) lines.push("inline std::int8_t anqstReadInt8(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<std::int8_t>(anqstReadUint8(bytes, offset)); }");
  if (scalarKinds.has("boolean")) lines.push("inline bool anqstReadBool(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return anqstReadUint8(bytes, offset) != 0u; }");
  if (scalarKinds.has("uint16") || scalarKinds.has("quint16")) lines.push("inline std::uint16_t anqstReadUint16(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { const std::uint16_t b0 = anqstReadUint8(bytes, offset); const std::uint16_t b1 = anqstReadUint8(bytes, offset); return static_cast<std::uint16_t>(b0 | (b1 << 8)); }");
  if (scalarKinds.has("int16")) lines.push("inline std::int16_t anqstReadInt16(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<std::int16_t>(anqstReadUint16(bytes, offset)); }");
  if (scalarKinds.has("quint16")) lines.push("inline quint16 anqstReadQuint16(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<quint16>(anqstReadUint16(bytes, offset)); }");
  if (scalarKinds.has("qint16")) lines.push("inline qint16 anqstReadQint16(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<qint16>(anqstReadInt16(bytes, offset)); }");
  if (scalarKinds.has("uint32") || scalarKinds.has("quint32")) lines.push("inline std::uint32_t anqstReadUint32(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { const std::uint32_t b0 = anqstReadUint8(bytes, offset); const std::uint32_t b1 = anqstReadUint8(bytes, offset); const std::uint32_t b2 = anqstReadUint8(bytes, offset); const std::uint32_t b3 = anqstReadUint8(bytes, offset); return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24); }");
  if (scalarKinds.has("int32")) lines.push("inline std::int32_t anqstReadInt32(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<std::int32_t>(anqstReadUint32(bytes, offset)); }");
  if (scalarKinds.has("quint32")) lines.push("inline quint32 anqstReadQuint32(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<quint32>(anqstReadUint32(bytes, offset)); }");
  if (scalarKinds.has("qint32")) lines.push("inline qint32 anqstReadQint32(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<qint32>(anqstReadInt32(bytes, offset)); }");
  if (scalarKinds.has("quint64")) lines.push("inline std::uint64_t anqstReadQuint64(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { std::uint64_t value = 0; for (int shift = 0; shift < 64; shift += 8) value |= (static_cast<std::uint64_t>(anqstReadUint8(bytes, offset)) << shift); return value; }");
  if (scalarKinds.has("qint64")) lines.push("inline std::int64_t anqstReadQint64(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<std::int64_t>(anqstReadQuint64(bytes, offset)); }");
  if (scalarKinds.has("number")) lines.push("inline double anqstReadFloat64(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { const std::uint64_t bits = anqstReadQuint64(bytes, offset); double value = 0; std::memcpy(&value, &bits, sizeof(value)); return value; }");
  if (scalarKinds.size > 0) lines.push("");

  if (support.needsBinaryHelpers) {
    lines.push("inline QString anqstEncodeBinary(const QByteArray& value) {");
    lines.push("    return QString::fromStdString(base93Encode(std::vector<std::uint8_t>(value.begin(), value.end())));");
    lines.push("}");
    lines.push("");
    lines.push("inline QByteArray anqstDecodeBinary(const QString& encoded) {");
    lines.push("    const auto bytes = base93Decode(encoded.toStdString());");
    lines.push("    return QByteArray(reinterpret_cast<const char*>(bytes.data()), static_cast<int>(bytes.size()));");
    lines.push("}");
  }

  return lines.join("\n");
}

export function renderCppBoundaryCodecHelpers(
  catalog: BoundaryCodecCatalog,
  mapCppType: (typeText: string, pathHintParts: string[]) => string
): string {
  if (catalog.plans.length === 0) return "";
  const runtime = renderCppRuntimeSupport(catalog);
  const codecs = catalog.plans.map((plan) => renderCppPlanCodec(plan, mapCppType)).join("\n\n");
  return `${runtime}\n\n${codecs}\n`;
}
