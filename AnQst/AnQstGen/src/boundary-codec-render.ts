import { emitBase93Decoder, emitBase93Encoder } from "./base93";
import {
  sanitizeIdentifier,
  stripAnQstType,
  type BinaryLeafKind,
  type BoundaryCodecCatalog,
  type BoundaryCodecPlan,
  type BoundaryFiniteDomain,
  type BoundaryPlanFiniteDomainNode,
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

function tsNamedHelperStem(node: Extract<BoundaryPlanNode, { nodeKind: "named" }>, scope = ""): string {
  const scopePrefix = scope ? `${sanitizeIdentifier(scope)}_` : "";
  return `__anqstNamed_${scopePrefix}${sanitizeIdentifier(node.name)}`;
}

function tsNamedEncodeHelperName(node: Extract<BoundaryPlanNode, { nodeKind: "named" }>, scope = ""): string {
  return `${tsNamedHelperStem(node, scope)}_encode`;
}

function tsNamedDecodeHelperName(node: Extract<BoundaryPlanNode, { nodeKind: "named" }>, scope = ""): string {
  return `${tsNamedHelperStem(node, scope)}_decode`;
}

function cppNamedHelperStem(node: Extract<BoundaryPlanNode, { nodeKind: "named" }>, scope = ""): string {
  const scopePrefix = scope ? `${sanitizeIdentifier(scope)}_` : "";
  return `anqstNamed_${scopePrefix}${sanitizeIdentifier(node.name)}`;
}

function cppNamedEncodeHelperName(node: Extract<BoundaryPlanNode, { nodeKind: "named" }>, scope = ""): string {
  return `${cppNamedHelperStem(node, scope)}_encode`;
}

function cppNamedDecodeHelperName(node: Extract<BoundaryPlanNode, { nodeKind: "named" }>, scope = ""): string {
  return `${cppNamedHelperStem(node, scope)}_decode`;
}

function collectNamedPlanNodes(
  node: BoundaryPlanNode,
  out = new Map<string, Extract<BoundaryPlanNode, { nodeKind: "named" }>>()
): Map<string, Extract<BoundaryPlanNode, { nodeKind: "named" }>> {
  switch (node.nodeKind) {
    case "named":
      if (out.has(node.name)) {
        return out;
      }
      out.set(node.name, node);
      collectNamedPlanNodes(node.target, out);
      return out;
    case "array":
      collectNamedPlanNodes(node.element, out);
      return out;
    case "struct":
      for (const field of node.fields) {
        collectNamedPlanNodes(field.node, out);
      }
      return out;
    default:
      return out;
  }
}

function collectFiniteDomainPlanNodes(
  node: BoundaryPlanNode,
  out: BoundaryPlanFiniteDomainNode[] = [],
  visitedNamed = new Set<string>()
): BoundaryPlanFiniteDomainNode[] {
  switch (node.nodeKind) {
    case "finite-domain":
      out.push(node);
      return out;
    case "array":
      collectFiniteDomainPlanNodes(node.element, out, visitedNamed);
      return out;
    case "struct":
      for (const field of node.fields) {
        collectFiniteDomainPlanNodes(field.node, out, visitedNamed);
      }
      return out;
    case "named":
      if (visitedNamed.has(node.name)) return out;
      visitedNamed.add(node.name);
      collectFiniteDomainPlanNodes(node.target, out, visitedNamed);
      return out;
    default:
      return out;
  }
}

function tsInlineScalarNeedsScratch(kind: ScalarLeafKind): boolean {
  return kind === "number" || kind === "qint64" || kind === "quint64";
}

function planNeedsTsInlineScalarScratch(
  node: BoundaryPlanNode,
  visitedNamed = new Set<string>()
): boolean {
  switch (node.nodeKind) {
    case "leaf":
      return (
        node.blobEntryId !== null
        && node.lowering.tsEncode.mode === "inline"
        && tsInlineScalarNeedsScratch(node.leaf.key as ScalarLeafKind)
      );
    case "finite-domain":
      return (
        node.representation.kind === "coded-scalar"
        && node.lowering.tsEncode.mode === "inline"
        && tsInlineScalarNeedsScratch(node.representation.scalarKind)
      );
    case "array":
      return planNeedsTsInlineScalarScratch(node.element, visitedNamed);
    case "struct":
      return node.fields.some((field) => planNeedsTsInlineScalarScratch(field.node, visitedNamed));
    case "named":
      if (visitedNamed.has(node.name)) return false;
      visitedNamed.add(node.name);
      return planNeedsTsInlineScalarScratch(node.target, visitedNamed);
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
    case "qint8": return "anqstPushInt8";
    case "quint8": return "anqstPushUint8";
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
    case "qint8": return "anqstReadInt8";
    case "quint8": return "anqstReadUint8";
    case "int32": return "anqstReadInt32";
    case "uint32": return "anqstReadUint32";
    case "int16": return "anqstReadInt16";
    case "uint16": return "anqstReadUint16";
    case "int8": return "anqstReadInt8";
    case "uint8": return "anqstReadUint8";
  }
}

function emitCppInlineScalarWrite(
  leaf: ScalarLeafKind,
  valueExpr: string,
  lines: string[],
  ctx: CppEmitterContext,
  level: number
): void {
  const pad = indent(level).replace(/  /g, "    ");
  switch (leaf) {
    case "boolean":
      lines.push(`${pad}bytes.push_back(${valueExpr} ? 1u : 0u);`);
      return;
    case "qint8":
    case "int8":
      lines.push(`${pad}bytes.push_back(static_cast<std::uint8_t>(static_cast<std::int8_t>(${valueExpr})));`);
      return;
    case "quint8":
    case "uint8":
      lines.push(`${pad}bytes.push_back(static_cast<std::uint8_t>(${valueExpr}));`);
      return;
    case "qint16":
    case "int16":
    case "quint16":
    case "uint16": {
      const valueVar = ctx.next("u16");
      lines.push(`${pad}const std::uint16_t ${valueVar} = static_cast<std::uint16_t>(${valueExpr});`);
      lines.push(`${pad}bytes.push_back(static_cast<std::uint8_t>(${valueVar} & 0xffu));`);
      lines.push(`${pad}bytes.push_back(static_cast<std::uint8_t>((${valueVar} >> 8) & 0xffu));`);
      return;
    }
    case "qint32":
    case "int32":
    case "quint32":
    case "uint32": {
      const valueVar = ctx.next("u32");
      lines.push(`${pad}const std::uint32_t ${valueVar} = static_cast<std::uint32_t>(${valueExpr});`);
      lines.push(`${pad}bytes.push_back(static_cast<std::uint8_t>(${valueVar} & 0xffu));`);
      lines.push(`${pad}bytes.push_back(static_cast<std::uint8_t>((${valueVar} >> 8) & 0xffu));`);
      lines.push(`${pad}bytes.push_back(static_cast<std::uint8_t>((${valueVar} >> 16) & 0xffu));`);
      lines.push(`${pad}bytes.push_back(static_cast<std::uint8_t>((${valueVar} >> 24) & 0xffu));`);
      return;
    }
    case "qint64":
    case "quint64": {
      const valueVar = ctx.next("u64");
      lines.push(`${pad}const std::uint64_t ${valueVar} = static_cast<std::uint64_t>(${valueExpr});`);
      lines.push(`${pad}for (int shift = 0; shift < 64; shift += 8) bytes.push_back(static_cast<std::uint8_t>((${valueVar} >> shift) & 0xffu));`);
      return;
    }
    case "number": {
      const bitsVar = ctx.next("bits");
      const valueVar = ctx.next("float");
      lines.push(`${pad}const double ${valueVar} = static_cast<double>(${valueExpr});`);
      lines.push(`${pad}std::uint64_t ${bitsVar} = 0;`);
      lines.push(`${pad}std::memcpy(&${bitsVar}, &${valueVar}, sizeof(${bitsVar}));`);
      lines.push(`${pad}for (int shift = 0; shift < 64; shift += 8) bytes.push_back(static_cast<std::uint8_t>((${bitsVar} >> shift) & 0xffu));`);
      return;
    }
  }
}

function emitCppInlineScalarRead(
  leaf: ScalarLeafKind,
  lines: string[],
  ctx: CppEmitterContext,
  level: number
): string {
  const pad = indent(level).replace(/  /g, "    ");
  const readByte = "(blob[dataOffset++])";
  switch (leaf) {
    case "boolean":
      return `((${readByte} & 1u) != 0u)`;
    case "qint8":
      return `static_cast<qint8>(static_cast<std::int8_t>(${readByte}))`;
    case "quint8":
      return `static_cast<quint8>(${readByte})`;
    case "int8":
      return `static_cast<std::int8_t>(${readByte})`;
    case "uint8":
      return `static_cast<std::uint8_t>(${readByte})`;
    case "qint16":
    case "quint16":
    case "int16":
    case "uint16": {
      const valueVar = ctx.next("u16");
      lines.push(`${pad}const std::uint16_t ${valueVar} = static_cast<std::uint16_t>(blob[dataOffset]) | (static_cast<std::uint16_t>(blob[dataOffset + 1]) << 8);`);
      lines.push(`${pad}dataOffset += 2;`);
      if (leaf === "qint16") return `static_cast<qint16>(static_cast<std::int16_t>(${valueVar}))`;
      if (leaf === "quint16") return `static_cast<quint16>(${valueVar})`;
      if (leaf === "int16") return `static_cast<std::int16_t>(${valueVar})`;
      return valueVar;
    }
    case "qint32":
    case "quint32":
    case "int32":
    case "uint32": {
      const valueVar = ctx.next("u32");
      lines.push(`${pad}const std::uint32_t ${valueVar} =`);
      lines.push(`${pad}    static_cast<std::uint32_t>(blob[dataOffset])`);
      lines.push(`${pad}    | (static_cast<std::uint32_t>(blob[dataOffset + 1]) << 8)`);
      lines.push(`${pad}    | (static_cast<std::uint32_t>(blob[dataOffset + 2]) << 16)`);
      lines.push(`${pad}    | (static_cast<std::uint32_t>(blob[dataOffset + 3]) << 24);`);
      lines.push(`${pad}dataOffset += 4;`);
      if (leaf === "qint32") return `static_cast<qint32>(static_cast<std::int32_t>(${valueVar}))`;
      if (leaf === "quint32") return `static_cast<quint32>(${valueVar})`;
      if (leaf === "int32") return `static_cast<std::int32_t>(${valueVar})`;
      return valueVar;
    }
    case "qint64":
    case "quint64":
    case "number": {
      const valueVar = ctx.next("u64");
      lines.push(`${pad}std::uint64_t ${valueVar} = 0;`);
      lines.push(`${pad}for (int shift = 0; shift < 64; shift += 8) {`);
      lines.push(`${pad}    ${valueVar} |= (static_cast<std::uint64_t>(blob[dataOffset++]) << shift);`);
      lines.push(`${pad}}`);
      if (leaf === "qint64") return `static_cast<qint64>(static_cast<std::int64_t>(${valueVar}))`;
      if (leaf === "quint64") return `static_cast<quint64>(${valueVar})`;
      const floatVar = ctx.next("float");
      lines.push(`${pad}double ${floatVar} = 0.0;`);
      lines.push(`${pad}std::memcpy(&${floatVar}, &${valueVar}, sizeof(${floatVar}));`);
      return floatVar;
    }
  }
}

function cppInlineBinaryEncodeExpr(valueExpr: string): string {
  return `anqstBase93Encode(std::vector<std::uint8_t>(${valueExpr}.begin(), ${valueExpr}.end()))`;
}

function cppInlineBinaryDecodeExpr(encodedExpr: string): string {
  return `([&]() { const auto __bytes = anqstBase93Decode(${encodedExpr}); return QByteArray(reinterpret_cast<const char*>(__bytes.data()), static_cast<int>(__bytes.size())); })()`;
}

function binaryEncodeHelperName(binary: BinaryLeafKind): string {
  return `__anqstEncodeBinary_${binary}`;
}

function binaryDecodeHelperName(binary: BinaryLeafKind): string {
  return `__anqstDecodeBinary_${binary}`;
}

function emitTsInlineScalarWrite(
  leaf: ScalarLeafKind,
  valueExpr: string,
  lines: string[],
  level: number,
  ctx: TsEmitterContext
): void {
  const pad = indent(level);
  switch (leaf) {
    case "boolean":
      lines.push(`${pad}__bytes.push(${valueExpr} ? 1 : 0);`);
      return;
    case "qint8":
    case "quint8":
    case "int8":
    case "uint8":
      lines.push(`${pad}__bytes.push(((${valueExpr}) as number) & 0xff);`);
      return;
    case "qint16":
    case "quint16":
    case "int16":
    case "uint16": {
      const valueVar = ctx.next("u16");
      lines.push(`${pad}const ${valueVar} = ((${valueExpr}) as number) & 0xffff;`);
      lines.push(`${pad}__bytes.push(${valueVar} & 0xff, (${valueVar} >>> 8) & 0xff);`);
      return;
    }
    case "qint32":
    case "quint32":
    case "int32":
    case "uint32": {
      const valueVar = ctx.next("u32");
      lines.push(`${pad}const ${valueVar} = ((${valueExpr}) as number) >>> 0;`);
      lines.push(`${pad}__bytes.push(${valueVar} & 0xff, (${valueVar} >>> 8) & 0xff, (${valueVar} >>> 16) & 0xff, (${valueVar} >>> 24) & 0xff);`);
      return;
    }
    case "number":
      lines.push(`${pad}__anqstScalarScratchView.setFloat64(0, ${valueExpr}, true);`);
      lines.push(`${pad}__bytes.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!);`);
      return;
    case "qint64":
      lines.push(`${pad}__anqstScalarScratchView.setBigInt64(0, ${valueExpr}, true);`);
      lines.push(`${pad}__bytes.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!);`);
      return;
    case "quint64":
      lines.push(`${pad}__anqstScalarScratchView.setBigUint64(0, ${valueExpr}, true);`);
      lines.push(`${pad}__bytes.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!);`);
      return;
  }
}

function tsInlineScalarReadExpr(leaf: ScalarLeafKind): string {
  switch (leaf) {
    case "boolean":
      return `((__blob[__dataCursor.offset++]! & 1) === 1)`;
    case "qint8":
    case "int8":
      return `__blobView.getInt8(__dataCursor.offset++)`;
    case "quint8":
    case "uint8":
      return `__blob[__dataCursor.offset++]!`;
    case "qint16":
    case "int16":
      return `(__dataCursor.offset += 2, __blobView.getInt16(__dataCursor.offset - 2, true))`;
    case "quint16":
    case "uint16":
      return `(__dataCursor.offset += 2, __blobView.getUint16(__dataCursor.offset - 2, true))`;
    case "qint32":
    case "int32":
      return `(__dataCursor.offset += 4, __blobView.getInt32(__dataCursor.offset - 4, true))`;
    case "quint32":
    case "uint32":
      return `(__dataCursor.offset += 4, __blobView.getUint32(__dataCursor.offset - 4, true))`;
    case "number":
      return `(__dataCursor.offset += 8, __blobView.getFloat64(__dataCursor.offset - 8, true))`;
    case "qint64":
      return `(__dataCursor.offset += 8, __blobView.getBigInt64(__dataCursor.offset - 8, true))`;
    case "quint64":
      return `(__dataCursor.offset += 8, __blobView.getBigUint64(__dataCursor.offset - 8, true))`;
  }
}

function tsInlineBinaryEncodeExpr(binary: BinaryLeafKind, valueExpr: string): string {
  switch (binary) {
    case "ArrayBuffer":
      return `__anqstBase93Encode(new Uint8Array(${valueExpr}))`;
    case "Uint8Array":
    case "Int8Array":
    case "Uint16Array":
    case "Int16Array":
    case "Uint32Array":
    case "Int32Array":
    case "Float32Array":
    case "Float64Array":
      return `__anqstBase93Encode(new Uint8Array(${valueExpr}.buffer, ${valueExpr}.byteOffset, ${valueExpr}.byteLength))`;
  }
}

function tsInlineBinaryDecodeExpr(binary: BinaryLeafKind, encodedExpr: string): string {
  if (binary === "ArrayBuffer") {
    return `(() => { const __bytes = __anqstBase93Decode(${encodedExpr}); if (__bytes.byteOffset === 0 && __bytes.byteLength === __bytes.buffer.byteLength) return __bytes.buffer as ArrayBuffer; return __bytes.buffer.slice(__bytes.byteOffset, __bytes.byteOffset + __bytes.byteLength); })()`;
  }
  const typedArrayInfo: Record<Exclude<BinaryLeafKind, "ArrayBuffer">, { ctor: string; bytesPerElement: number }> = {
    Uint8Array: { ctor: "Uint8Array", bytesPerElement: 1 },
    Int8Array: { ctor: "Int8Array", bytesPerElement: 1 },
    Uint16Array: { ctor: "Uint16Array", bytesPerElement: 2 },
    Int16Array: { ctor: "Int16Array", bytesPerElement: 2 },
    Uint32Array: { ctor: "Uint32Array", bytesPerElement: 4 },
    Int32Array: { ctor: "Int32Array", bytesPerElement: 4 },
    Float32Array: { ctor: "Float32Array", bytesPerElement: 4 },
    Float64Array: { ctor: "Float64Array", bytesPerElement: 8 }
  };
  const info = typedArrayInfo[binary];
  return `(() => { const __bytes = __anqstBase93Decode(${encodedExpr}); if ((__bytes.byteOffset % ${info.bytesPerElement}) === 0) return new ${info.ctor}(__bytes.buffer, __bytes.byteOffset, __bytes.byteLength / ${info.bytesPerElement}); const __copy = __bytes.slice(); return new ${info.ctor}(__copy.buffer, 0, __copy.byteLength / ${info.bytesPerElement}); })()`;
}

function emitTsEncodeScratchDeclarations(_ctx: TsEmitterContext, _level: number): string[] {
  return [];
}

function tsCast(expression: string, typeText: string): string {
  return `(${expression}) as ${stripAnQstType(typeText)}`;
}

function tsFiniteDomainTextValueExpr(domain: BoundaryFiniteDomain, valueExpr: string): string {
  switch (domain.primitive) {
    case "string":
      return valueExpr;
    case "number":
      return `String(${valueExpr})`;
    case "boolean":
      return `${valueExpr} ? "1" : "0"`;
  }
}

function emitTsFiniteDomainCodeAssignment(
  domain: BoundaryFiniteDomain,
  valueExpr: string,
  targetVar: string,
  lines: string[],
  level: number
): void {
  const pad = indent(level);
  lines.push(`${pad}switch (${valueExpr}) {`);
  for (const variant of domain.variants) {
    lines.push(`${pad}  case ${variant.tsLiteralText}: ${targetVar} = ${variant.code}; break;`);
  }
  lines.push(`${pad}  default: throw new Error("AnQst finite-domain encode received an unsupported value.");`);
  lines.push(`${pad}}`);
}

function emitTsFiniteDomainDecodeFromCode(
  node: BoundaryPlanFiniteDomainNode,
  readExpr: string,
  lines: string[],
  ctx: TsEmitterContext,
  level: number
): string {
  const pad = indent(level);
  const valueVar = ctx.next("value");
  const firstVariant = node.domain.variants[0];
  lines.push(`${pad}let ${valueVar}: ${stripAnQstType(node.typeText)} = ${tsCast(firstVariant.tsLiteralText, node.typeText)};`);
  lines.push(`${pad}switch (${readExpr}) {`);
  for (const variant of node.domain.variants) {
    lines.push(`${pad}  case ${variant.code}: ${valueVar} = ${tsCast(variant.tsLiteralText, node.typeText)}; break;`);
  }
  lines.push(`${pad}}`);
  return valueVar;
}

function emitTsFiniteDomainDecodeFromText(
  node: BoundaryPlanFiniteDomainNode,
  textExpr: string,
  lines: string[],
  ctx: TsEmitterContext,
  level: number
): string {
  const pad = indent(level);
  const valueVar = ctx.next("value");
  const firstVariant = node.domain.variants[0];
  lines.push(`${pad}let ${valueVar}: ${stripAnQstType(node.typeText)} = ${tsCast(firstVariant.tsLiteralText, node.typeText)};`);
  lines.push(`${pad}switch (${textExpr}) {`);
  for (const variant of node.domain.variants) {
    const encodedText = node.domain.primitive === "boolean" ? (variant.value ? '"1"' : '"0"') : JSON.stringify(String(variant.value));
    lines.push(`${pad}  case ${encodedText}: ${valueVar} = ${tsCast(variant.tsLiteralText, node.typeText)}; break;`);
  }
  lines.push(`${pad}}`);
  return valueVar;
}

function emitTsEncodeLeaf(node: BoundaryPlanLeafNode, valueExpr: string, lines: string[], ctx: TsEmitterContext, level: number): void {
  const pad = indent(level);
  if (node.blobEntryId) {
    const leafKind = node.leaf.key as ScalarLeafKind;
    if (node.lowering.tsEncode.mode === "helper-call") {
      lines.push(`${pad}${tsScalarWriteHelper(leafKind)}(__bytes, ${valueExpr});`);
    } else {
      emitTsInlineScalarWrite(leafKind, valueExpr, lines, level, ctx);
    }
    return;
  }
  if (node.leaf.region === "string") {
    if (node.selectedPacking === "text-packed" && node.leaf.key === "boolean") {
      lines.push(`${pad}__items.push(${valueExpr} ? "1" : "0");`);
      return;
    }
    lines.push(`${pad}__items.push(${valueExpr});`);
    return;
  }
  if (node.leaf.region === "binary") {
    const binaryKind = node.leaf.key as BinaryLeafKind;
    if (node.lowering.tsEncode.mode === "helper-call") {
      lines.push(`${pad}__items.push(${binaryEncodeHelperName(binaryKind)}(${valueExpr}));`);
    } else {
      lines.push(`${pad}__items.push(${tsInlineBinaryEncodeExpr(binaryKind, valueExpr)});`);
    }
    return;
  }
  lines.push(`${pad}__items.push(${valueExpr});`);
}

function emitTsEncodeNode(
  node: BoundaryPlanNode,
  valueExpr: string,
  lines: string[],
  ctx: TsEmitterContext,
  level: number,
  scope = ""
): void {
  const pad = indent(level);
  switch (node.nodeKind) {
    case "leaf":
      emitTsEncodeLeaf(node, valueExpr, lines, ctx, level);
      return;
    case "named":
      lines.push(`${pad}${tsNamedEncodeHelperName(node, scope)}(${valueExpr}, __bytes, __items);`);
      return;
    case "finite-domain":
      if (node.representation.kind === "coded-scalar") {
        const codeVar = ctx.next("code");
        if (node.lowering.tsEncode.mode === "helper-call") {
          if (node.lowering.tsEncode.helperNameHint) {
            lines.push(`${pad}const ${codeVar} = __anqstFiniteDomainEncodeCode_${sanitizeIdentifier(node.lowering.tsEncode.helperNameHint)}(${valueExpr});`);
          } else {
            lines.push(`${pad}let ${codeVar} = 0;`);
            emitTsFiniteDomainCodeAssignment(node.domain, valueExpr, codeVar, lines, level);
          }
          lines.push(`${pad}${tsScalarWriteHelper(node.representation.scalarKind)}(__bytes, ${codeVar});`);
        } else {
          lines.push(`${pad}let ${codeVar} = 0;`);
          emitTsFiniteDomainCodeAssignment(node.domain, valueExpr, codeVar, lines, level);
          emitTsInlineScalarWrite(node.representation.scalarKind, codeVar, lines, level, ctx);
        }
      } else {
        if (node.lowering.tsEncode.mode === "helper-call" && node.lowering.tsEncode.helperNameHint) {
          lines.push(`${pad}__items.push(__anqstFiniteDomainEncodeText_${sanitizeIdentifier(node.lowering.tsEncode.helperNameHint)}(${valueExpr}));`);
        } else {
          lines.push(`${pad}__items.push(${tsFiniteDomainTextValueExpr(node.domain, valueExpr)});`);
        }
      }
      return;
    case "array": {
      if (node.extentStrategy === "explicit-count") {
        emitTsInlineScalarWrite("uint32", `${valueExpr}.length >>> 0`, lines, level, ctx);
      }
      const itemVar = ctx.next("item");
      lines.push(`${pad}for (const ${itemVar} of ${valueExpr}) {`);
      emitTsEncodeNode(node.element, itemVar, lines, ctx, level + 1, scope);
      lines.push(`${pad}}`);
      return;
    }
    case "struct":
      for (const field of node.fields) {
        const fieldExpr = `${valueExpr}.${field.name}`;
        if (field.optional) {
          const presentVar = ctx.next("present");
          lines.push(`${pad}const ${presentVar} = ${fieldExpr} !== undefined;`);
          emitTsInlineScalarWrite("uint8", `${presentVar} ? 1 : 0`, lines, level, ctx);
          lines.push(`${pad}if (${presentVar}) {`);
          emitTsEncodeNode(field.node, `${fieldExpr}!`, lines, ctx, level + 1, scope);
          lines.push(`${pad}}`);
        } else {
          emitTsEncodeNode(field.node, fieldExpr, lines, ctx, level, scope);
        }
      }
  }
}

function emitTsDecodeLeaf(node: BoundaryPlanLeafNode): string {
  if (node.blobEntryId) {
    const leafKind = node.leaf.key as ScalarLeafKind;
    if (node.lowering.tsDecode.mode === "helper-call") {
      return tsCast(`${tsScalarReadHelper(leafKind)}(__blob, __blobView, __dataCursor)`, node.typeText);
    }
    return tsCast(tsInlineScalarReadExpr(leafKind), node.typeText);
  }
  if (node.leaf.region === "string") {
    if (node.selectedPacking === "text-packed" && node.leaf.key === "boolean") {
      return tsCast(`String(__items[__itemIndex.value++]!) === "1"`, node.typeText);
    }
    return tsCast(`String(__items[__itemIndex.value++]!)`, node.typeText);
  }
  if (node.leaf.region === "binary") {
    const binaryKind = node.leaf.key as BinaryLeafKind;
    if (node.lowering.tsDecode.mode === "helper-call") {
      return tsCast(`${binaryDecodeHelperName(binaryKind)}(String(__items[__itemIndex.value++]!))`, node.typeText);
    }
    return tsCast(tsInlineBinaryDecodeExpr(binaryKind, "String(__items[__itemIndex.value++]!)"), node.typeText);
  }
  return tsCast(`__items[__itemIndex.value++]!`, node.typeText);
}

function emitTsDecodeNode(node: BoundaryPlanNode, lines: string[], ctx: TsEmitterContext, level: number, scope = ""): string {
  const pad = indent(level);
  switch (node.nodeKind) {
    case "leaf":
      return emitTsDecodeLeaf(node);
    case "named":
      return `${tsNamedDecodeHelperName(node, scope)}(__blob, __blobView, __dataCursor, __items, __itemIndex)`;
    case "finite-domain":
      if (node.representation.kind === "coded-scalar") {
        const codeVar = ctx.next("code");
        if (node.lowering.tsDecode.mode === "helper-call") {
          lines.push(`${pad}const ${codeVar} = ${tsScalarReadHelper(node.representation.scalarKind)}(__blob, __blobView, __dataCursor);`);
          if (node.lowering.tsDecode.helperNameHint) {
            return `__anqstFiniteDomainDecodeCode_${sanitizeIdentifier(node.lowering.tsDecode.helperNameHint)}(${codeVar})`;
          }
        } else {
          lines.push(`${pad}const ${codeVar} = ${tsInlineScalarReadExpr(node.representation.scalarKind)};`);
        }
        return emitTsFiniteDomainDecodeFromCode(node, codeVar, lines, ctx, level);
      }
      const textVar = ctx.next("text");
      lines.push(`${pad}const ${textVar} = String(__items[__itemIndex.value++]!);`);
      if (node.lowering.tsDecode.mode === "helper-call" && node.lowering.tsDecode.helperNameHint) {
        return `__anqstFiniteDomainDecodeText_${sanitizeIdentifier(node.lowering.tsDecode.helperNameHint)}(${textVar})`;
      }
      return emitTsFiniteDomainDecodeFromText(node, textVar, lines, ctx, level);
    case "array": {
      const arrayVar = ctx.next("array");
      const countVar = ctx.next("count");
      const indexVar = ctx.next("index");
      if (node.extentStrategy === "blob-tail") {
        const elementWidth = node.elementBlobWidthBytes ?? 1;
        const remainingVar = ctx.next("remainingBytes");
        lines.push(`${pad}const ${remainingVar} = __blob.length - __dataCursor.offset;`);
        lines.push(`${pad}const ${countVar} = ${remainingVar} / ${elementWidth};`);
      } else if (node.extentStrategy === "item-tail") {
        const elementItemCount = node.elementItemCount ?? 1;
        const remainingItemsVar = ctx.next("remainingItems");
        lines.push(`${pad}const ${remainingItemsVar} = __items.length - __itemIndex.value;`);
        lines.push(`${pad}const ${countVar} = ${remainingItemsVar} / ${elementItemCount};`);
      } else {
        lines.push(`${pad}const ${countVar} = ${tsInlineScalarReadExpr("uint32")};`);
      }
      lines.push(`${pad}const ${arrayVar} = new Array(${countVar}) as ${stripAnQstType(node.typeText)};`);
      lines.push(`${pad}for (let ${indexVar} = 0; ${indexVar} < ${countVar}; ${indexVar} += 1) {`);
      const elementExpr = emitTsDecodeNode(node.element, lines, ctx, level + 1, scope);
      lines.push(`${indent(level + 1)}${arrayVar}[${indexVar}] = ${elementExpr};`);
      lines.push(`${pad}}`);
      return arrayVar;
    }
    case "struct": {
      const valueVar = ctx.next("value");
      lines.push(`${pad}const ${valueVar} = {} as ${stripAnQstType(node.typeText)};`);
      for (const field of node.fields) {
        if (field.optional) {
          const presentVar = ctx.next("present");
          lines.push(`${pad}const ${presentVar} = ${tsInlineScalarReadExpr("uint8")} !== 0;`);
          lines.push(`${pad}if (${presentVar}) {`);
          const fieldExpr = emitTsDecodeNode(field.node, lines, ctx, level + 1, scope);
          lines.push(`${indent(level + 1)}${valueVar}.${field.name} = ${fieldExpr};`);
          lines.push(`${pad}}`);
        } else {
          const fieldExpr = emitTsDecodeNode(field.node, lines, ctx, level, scope);
          lines.push(`${pad}${valueVar}.${field.name} = ${fieldExpr};`);
        }
      }
      return valueVar;
    }
  }
}

function renderTsFastPathCodec(plan: BoundaryCodecPlan): string | null {
  const encoderName = `encode${plan.codecId}`;
  const decoderName = `decode${plan.codecId}`;
  const trustedOnlyDecode = plan.decodePolicy === "trusted-only";
  if (plan.root.nodeKind === "leaf") {
    if (plan.root.blobEntryId) {
      const encodeCtx = new TsEmitterContext();
      const encodeLines: string[] = [];
      emitTsEncodeLeaf(plan.root, "value", encodeLines, encodeCtx, 1);
      const encodeScratchLines = emitTsEncodeScratchDeclarations(encodeCtx, 1);
      return `function ${encoderName}(value: ${plan.tsTypeText}): unknown {
  const __bytes: number[] = [];
${encodeScratchLines.length > 0 ? `${encodeScratchLines.join("\n")}\n` : ""}${encodeLines.join("\n")}
  return __anqstBase93Encode(Uint8Array.from(__bytes));
}

function ${decoderName}(wire: unknown): ${plan.tsTypeText} {
  const __blob = __anqstBase93Decode(String(wire ?? ""));
  const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
  const __dataCursor = { offset: 0 };
  const __result = ${emitTsDecodeLeaf(plan.root)};
${trustedOnlyDecode ? "" : '  if (__dataCursor.offset !== __blob.length) throw new Error("AnQst wire contained trailing blob bytes.");'}
  return __result;
}`;
    }
    const directEncode =
      plan.root.leaf.region === "string" && plan.root.selectedPacking === "text-packed" && plan.root.leaf.key === "boolean"
        ? `value ? "1" : "0"`
        : plan.root.leaf.region === "binary"
          ? plan.root.lowering.tsEncode.mode === "helper-call"
            ? `${binaryEncodeHelperName(plan.root.leaf.key as BinaryLeafKind)}(value)`
            : tsInlineBinaryEncodeExpr(plan.root.leaf.key as BinaryLeafKind, "value")
          : "value";
    const directDecode =
      plan.root.leaf.region === "string" && plan.root.selectedPacking === "text-packed" && plan.root.leaf.key === "boolean"
        ? tsCast(`String(wire ?? "") === "1"`, plan.root.typeText)
        : plan.root.leaf.region === "string"
          ? tsCast(`String(wire ?? "")`, plan.root.typeText)
          : plan.root.leaf.region === "binary"
            ? tsCast(
                plan.root.lowering.tsDecode.mode === "helper-call"
                  ? `${binaryDecodeHelperName(plan.root.leaf.key as BinaryLeafKind)}(String(wire ?? ""))`
                  : tsInlineBinaryDecodeExpr(plan.root.leaf.key as BinaryLeafKind, "String(wire ?? \"\")"),
                plan.root.typeText
              )
            : tsCast("wire", plan.root.typeText);
    return `function ${encoderName}(value: ${plan.tsTypeText}): unknown {
  return ${directEncode};
}

function ${decoderName}(wire: unknown): ${plan.tsTypeText} {
  return ${directDecode};
}`;
  }
  if (plan.root.nodeKind === "finite-domain") {
    if (plan.root.representation.kind === "coded-scalar") {
      const encodeCtx = new TsEmitterContext();
      const encodeLines: string[] = [];
      if (plan.root.lowering.tsEncode.mode === "helper-call" && plan.root.lowering.tsEncode.helperNameHint) {
        encodeLines.push(`  const __code = __anqstFiniteDomainEncodeCode_${sanitizeIdentifier(plan.root.lowering.tsEncode.helperNameHint)}(value);`);
      } else {
        encodeLines.push(`  let __code = 0;`);
        emitTsFiniteDomainCodeAssignment(plan.root.domain, "value", "__code", encodeLines, 1);
      }
      encodeLines.push(`  const __bytes: number[] = [];`);
      if (plan.root.lowering.tsEncode.mode === "helper-call") {
        encodeLines.push(`  ${tsScalarWriteHelper(plan.root.representation.scalarKind)}(__bytes, __code);`);
      } else {
        emitTsInlineScalarWrite(plan.root.representation.scalarKind, "__code", encodeLines, 1, encodeCtx);
      }
      const encodeScratch = emitTsEncodeScratchDeclarations(encodeCtx, 1);
      if (encodeScratch.length > 0) {
        encodeLines.splice(encodeLines.indexOf("  const __bytes: number[] = [];"), 0, ...encodeScratch);
      }
      encodeLines.push(`  return __anqstBase93Encode(Uint8Array.from(__bytes));`);
      const decodeLines: string[] = [
        "  const __blob = __anqstBase93Decode(String(wire ?? \"\"));",
        "  const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);",
        "  const __dataCursor = { offset: 0 };",
        "  const __code = " + `${
          plan.root.lowering.tsDecode.mode === "helper-call"
            ? `${tsScalarReadHelper(plan.root.representation.scalarKind)}(__blob, __blobView, __dataCursor)`
            : tsInlineScalarReadExpr(plan.root.representation.scalarKind)
        };`
      ];
      const decodeBody: string[] = [];
      const valueExpr =
        plan.root.lowering.tsDecode.mode === "helper-call" && plan.root.lowering.tsDecode.helperNameHint
          ? `__anqstFiniteDomainDecodeCode_${sanitizeIdentifier(plan.root.lowering.tsDecode.helperNameHint)}(__code)`
          : emitTsFiniteDomainDecodeFromCode(plan.root, "__code", decodeBody, new TsEmitterContext(), 1);
      return `function ${encoderName}(value: ${plan.tsTypeText}): unknown {
${encodeLines.join("\n")}
}

function ${decoderName}(wire: unknown): ${plan.tsTypeText} {
${decodeLines.join("\n")}
${decodeBody.join("\n")}
  const __result = ${valueExpr};
${trustedOnlyDecode ? "" : '  if (__dataCursor.offset !== __blob.length) throw new Error("AnQst wire contained trailing blob bytes.");'}
  return __result;
}`;
    }
    const decodeBody: string[] = [];
    const valueExpr =
      plan.root.lowering.tsDecode.mode === "helper-call" && plan.root.lowering.tsDecode.helperNameHint
        ? `__anqstFiniteDomainDecodeText_${sanitizeIdentifier(plan.root.lowering.tsDecode.helperNameHint)}(__text)`
        : emitTsFiniteDomainDecodeFromText(plan.root, "__text", decodeBody, new TsEmitterContext(), 1);
    return `function ${encoderName}(value: ${plan.tsTypeText}): unknown {
  return ${
    plan.root.lowering.tsEncode.mode === "helper-call" && plan.root.lowering.tsEncode.helperNameHint
      ? `__anqstFiniteDomainEncodeText_${sanitizeIdentifier(plan.root.lowering.tsEncode.helperNameHint)}(value)`
      : tsFiniteDomainTextValueExpr(plan.root.domain, "value")
  };
}

function ${decoderName}(wire: unknown): ${plan.tsTypeText} {
  const __text = String(wire ?? "");
${decodeBody.join("\n")}
  const __result = ${valueExpr};
  return __result;
}`;
  }
  return null;
}

function renderTsPlanCodec(plan: BoundaryCodecPlan): string {
  const fastPath = renderTsFastPathCodec(plan);
  if (fastPath) return fastPath;
  const trustedOnlyDecode = plan.decodePolicy === "trusted-only";
  const namedNodes = [...collectNamedPlanNodes(plan.root).values()];
  const encodeCtx = new TsEmitterContext();
  const encodeLines: string[] = [];
  emitTsEncodeNode(plan.root, "value", encodeLines, encodeCtx, 1, plan.codecId);
  const encodeScratchLines = emitTsEncodeScratchDeclarations(encodeCtx, 1);
  const decodeCtx = new TsEmitterContext();
  const decodeLines: string[] = [];
  const decodeExpr = emitTsDecodeNode(plan.root, decodeLines, decodeCtx, 1, plan.codecId);
  const encoderName = `encode${plan.codecId}`;
  const decoderName = `decode${plan.codecId}`;
  const namedHelpers = namedNodes.map((node) => {
    const helperEncodeCtx = new TsEmitterContext();
    const helperEncodeLines: string[] = [];
    emitTsEncodeNode(node.target, "value", helperEncodeLines, helperEncodeCtx, 1, plan.codecId);
    const helperEncodeScratch = emitTsEncodeScratchDeclarations(helperEncodeCtx, 1);
    const helperDecodeLines: string[] = [];
    const helperDecodeExpr = emitTsDecodeNode(node.target, helperDecodeLines, new TsEmitterContext(), 1, plan.codecId);
    const tsType = stripAnQstType(node.typeText);
    return `function ${tsNamedEncodeHelperName(node, plan.codecId)}(value: ${tsType}, __bytes: number[], __items: unknown[]): void {
${helperEncodeScratch.length > 0 ? `${helperEncodeScratch.join("\n")}\n` : ""}${helperEncodeLines.join("\n")}
}

function ${tsNamedDecodeHelperName(node, plan.codecId)}(
  __blob: Uint8Array,
  __blobView: DataView,
  __dataCursor: { offset: number },
  __items: unknown[],
  __itemIndex: { value: number }
): ${tsType} {
${helperDecodeLines.join("\n")}
  return ${helperDecodeExpr};
}`;
  }).join("\n\n");

  return `${namedHelpers ? `${namedHelpers}\n\n` : ""}function ${encoderName}(value: ${plan.tsTypeText}): unknown {
  const __bytes: number[] = [];
  const __items: unknown[] = [];
${encodeScratchLines.length > 0 ? `${encodeScratchLines.join("\n")}\n` : ""}${encodeLines.join("\n")}
  return __anqstEncodeWire(__bytes, __items);
}

function ${decoderName}(wire: unknown): ${plan.tsTypeText} {
  const __items = Array.isArray(wire) ? wire : [wire];
  const __blob = ${plan.requirements.hasBlob ? `__anqstBase93Decode(String(__items[0] ?? ""))` : "new Uint8Array()"};
  const __blobView = new DataView(__blob.buffer, __blob.byteOffset, __blob.byteLength);
  const __itemIndex = { value: ${plan.requirements.hasBlob ? 1 : 0} };
  const __dataCursor = { offset: 0 };
${decodeLines.join("\n")}
  const __result = ${decodeExpr};
${trustedOnlyDecode ? "" : (plan.requirements.hasBlob ? `  if (__dataCursor.offset !== __blob.length) throw new Error("AnQst wire contained trailing blob bytes.");` : "")}
${trustedOnlyDecode ? "" : "  if (__itemIndex.value !== __items.length) throw new Error(\"AnQst wire contained trailing item payloads.\");"}
  return __result;
}`;
}

function collectTsSupport(catalog: BoundaryCodecCatalog): {
  needsBase93: boolean;
  needsInlineScalarScratch: boolean;
  scalarEncodeKinds: ScalarLeafKind[];
  scalarDecodeKinds: ScalarLeafKind[];
  binaryHelperKinds: BinaryLeafKind[];
  finiteDomainEncodeHelpers: Array<{ helperName: string; node: BoundaryPlanFiniteDomainNode }>;
  finiteDomainDecodeHelpers: Array<{ helperName: string; node: BoundaryPlanFiniteDomainNode }>;
} {
  const scalarEncodeKinds = new Set<ScalarLeafKind>();
  const scalarDecodeKinds = new Set<ScalarLeafKind>();
  const binaryHelperKinds = new Set<BinaryLeafKind>();
  const finiteDomainEncodeHelpers = new Map<string, BoundaryPlanFiniteDomainNode>();
  const finiteDomainDecodeHelpers = new Map<string, BoundaryPlanFiniteDomainNode>();
  let needsBase93 = false;
  let needsInlineScalarScratch = false;
  for (const plan of catalog.plans) {
    if (plan.requirements.hasBlob || plan.requirements.usedBinaryLeafKinds.length > 0) {
      needsBase93 = true;
    }
    if (planNeedsTsInlineScalarScratch(plan.root)) {
      needsInlineScalarScratch = true;
    }
    for (const kind of plan.requirements.tsHelperRequirements.scalarEncodeKinds) scalarEncodeKinds.add(kind);
    for (const kind of plan.requirements.tsHelperRequirements.scalarDecodeKinds) scalarDecodeKinds.add(kind);
    for (const kind of plan.requirements.tsHelperRequirements.binaryEncodeKinds) binaryHelperKinds.add(kind);
    for (const kind of plan.requirements.tsHelperRequirements.binaryDecodeKinds) binaryHelperKinds.add(kind);
    for (const node of collectFiniteDomainPlanNodes(plan.root)) {
      if (node.lowering.tsEncode.mode === "helper-call" && node.lowering.tsEncode.helperNameHint) {
        finiteDomainEncodeHelpers.set(node.lowering.tsEncode.helperNameHint, node);
      }
      if (node.lowering.tsDecode.mode === "helper-call" && node.lowering.tsDecode.helperNameHint) {
        finiteDomainDecodeHelpers.set(node.lowering.tsDecode.helperNameHint, node);
      }
    }
  }
  const sortByName = (items: Iterable<string>): string[] => [...items].sort();
  return {
    needsBase93,
    needsInlineScalarScratch,
    scalarEncodeKinds: sortByName(scalarEncodeKinds) as ScalarLeafKind[],
    scalarDecodeKinds: sortByName(scalarDecodeKinds) as ScalarLeafKind[],
    binaryHelperKinds: sortByName(binaryHelperKinds) as BinaryLeafKind[],
    finiteDomainEncodeHelpers: [...finiteDomainEncodeHelpers.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([helperName, node]) => ({ helperName, node })),
    finiteDomainDecodeHelpers: [...finiteDomainDecodeHelpers.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([helperName, node]) => ({ helperName, node }))
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
  lines.push("function __anqstEncodeWire(bytes: number[], items: unknown[]): unknown {");
  lines.push("  if (bytes.length === 0) {");
  lines.push("    if (items.length === 1) return items[0];");
  lines.push("    return items;");
  lines.push("  }");
  lines.push("  const out = new Array<unknown>(items.length + 1);");
  if (support.needsBase93) {
    lines.push("  out[0] = __anqstBase93Encode(Uint8Array.from(bytes));");
  } else {
    lines.push('  throw new Error("AnQst boundary planner emitted unexpected blob bytes.");');
  }
  lines.push("  for (let i = 0; i < items.length; i += 1) out[i + 1] = items[i];");
  lines.push("  if (out.length === 1) return out[0];");
  lines.push("  return out;");
  lines.push("}");
  lines.push("");

  const scalarEncodeKinds = new Set<ScalarLeafKind>(support.scalarEncodeKinds);
  const scalarDecodeKinds = new Set<ScalarLeafKind>(support.scalarDecodeKinds);
  const needsHelperScratch = scalarEncodeKinds.has("number") || scalarEncodeKinds.has("qint64") || scalarEncodeKinds.has("quint64");
  if (needsHelperScratch || support.needsInlineScalarScratch) {
    lines.push("const __anqstScalarScratchBuffer = new ArrayBuffer(8);");
    lines.push("const __anqstScalarScratchView = new DataView(__anqstScalarScratchBuffer);");
    lines.push("const __anqstScalarScratchBytes = new Uint8Array(__anqstScalarScratchBuffer);");
    lines.push("");
  }
  if (scalarEncodeKinds.has("uint8")) lines.push("function __anqstPushUint8(out: number[], value: number): void { out.push(value & 0xff); }");
  if (scalarEncodeKinds.has("int8")) lines.push("function __anqstPushInt8(out: number[], value: number): void { out.push((value as number) & 0xff); }");
  if (scalarEncodeKinds.has("boolean")) lines.push("function __anqstPushBool(out: number[], value: boolean): void { out.push(value ? 1 : 0); }");
  if (scalarEncodeKinds.has("uint16") || scalarEncodeKinds.has("quint16")) lines.push("function __anqstPushUint16(out: number[], value: number): void { const v = value & 0xffff; out.push(v & 0xff, (v >>> 8) & 0xff); }");
  if (scalarEncodeKinds.has("int16") || scalarEncodeKinds.has("qint16")) lines.push("function __anqstPushInt16(out: number[], value: number): void { const v = value & 0xffff; out.push(v & 0xff, (v >>> 8) & 0xff); }");
  if (scalarEncodeKinds.has("uint32") || scalarEncodeKinds.has("quint32")) lines.push("function __anqstPushUint32(out: number[], value: number): void { const v = value >>> 0; out.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff); }");
  if (scalarEncodeKinds.has("int32") || scalarEncodeKinds.has("qint32")) lines.push("function __anqstPushInt32(out: number[], value: number): void { const v = value >>> 0; out.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff); }");
  if (scalarEncodeKinds.has("number")) lines.push("function __anqstPushFloat64(out: number[], value: number): void { __anqstScalarScratchView.setFloat64(0, value, true); out.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!); }");
  if (scalarEncodeKinds.has("qint64")) lines.push("function __anqstPushBigInt64(out: number[], value: bigint): void { __anqstScalarScratchView.setBigInt64(0, value, true); out.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!); }");
  if (scalarEncodeKinds.has("quint64")) lines.push("function __anqstPushBigUint64(out: number[], value: bigint): void { __anqstScalarScratchView.setBigUint64(0, value, true); out.push(__anqstScalarScratchBytes[0]!, __anqstScalarScratchBytes[1]!, __anqstScalarScratchBytes[2]!, __anqstScalarScratchBytes[3]!, __anqstScalarScratchBytes[4]!, __anqstScalarScratchBytes[5]!, __anqstScalarScratchBytes[6]!, __anqstScalarScratchBytes[7]!); }");
  if (scalarEncodeKinds.size > 0) lines.push("");

  if (scalarDecodeKinds.has("uint8")) lines.push("function __anqstReadUint8(bytes: Uint8Array, _view: DataView, cursor: { offset: number }): number { return bytes[cursor.offset++]!; }");
  if (scalarDecodeKinds.has("int8")) lines.push("function __anqstReadInt8(_bytes: Uint8Array, view: DataView, cursor: { offset: number }): number { return view.getInt8(cursor.offset++); }");
  if (scalarDecodeKinds.has("boolean")) lines.push("function __anqstReadBool(bytes: Uint8Array, _view: DataView, cursor: { offset: number }): boolean { return (bytes[cursor.offset++]! & 1) === 1; }");
  if (scalarDecodeKinds.has("uint16") || scalarDecodeKinds.has("quint16")) lines.push("function __anqstReadUint16(_bytes: Uint8Array, view: DataView, cursor: { offset: number }): number { const value = view.getUint16(cursor.offset, true); cursor.offset += 2; return value; }");
  if (scalarDecodeKinds.has("int16") || scalarDecodeKinds.has("qint16")) lines.push("function __anqstReadInt16(_bytes: Uint8Array, view: DataView, cursor: { offset: number }): number { const value = view.getInt16(cursor.offset, true); cursor.offset += 2; return value; }");
  if (scalarDecodeKinds.has("uint32") || scalarDecodeKinds.has("quint32")) lines.push("function __anqstReadUint32(_bytes: Uint8Array, view: DataView, cursor: { offset: number }): number { const value = view.getUint32(cursor.offset, true); cursor.offset += 4; return value; }");
  if (scalarDecodeKinds.has("int32") || scalarDecodeKinds.has("qint32")) lines.push("function __anqstReadInt32(_bytes: Uint8Array, view: DataView, cursor: { offset: number }): number { const value = view.getInt32(cursor.offset, true); cursor.offset += 4; return value; }");
  if (scalarDecodeKinds.has("number")) lines.push("function __anqstReadFloat64(_bytes: Uint8Array, view: DataView, cursor: { offset: number }): number { const value = view.getFloat64(cursor.offset, true); cursor.offset += 8; return value; }");
  if (scalarDecodeKinds.has("qint64")) lines.push("function __anqstReadBigInt64(_bytes: Uint8Array, view: DataView, cursor: { offset: number }): bigint { const value = view.getBigInt64(cursor.offset, true); cursor.offset += 8; return value; }");
  if (scalarDecodeKinds.has("quint64")) lines.push("function __anqstReadBigUint64(_bytes: Uint8Array, view: DataView, cursor: { offset: number }): bigint { const value = view.getBigUint64(cursor.offset, true); cursor.offset += 8; return value; }");
  if (scalarDecodeKinds.size > 0) lines.push("");

  for (const { helperName, node } of support.finiteDomainEncodeHelpers) {
    const safeName = sanitizeIdentifier(helperName);
    if (node.representation.kind === "coded-scalar") {
      lines.push(`function __anqstFiniteDomainEncodeCode_${safeName}(value: ${stripAnQstType(node.typeText)}): number {`);
      lines.push("  let __code = 0;");
      emitTsFiniteDomainCodeAssignment(node.domain, "value", "__code", lines, 1);
      lines.push("  return __code;");
      lines.push("}");
      lines.push("");
    } else {
      lines.push(`function __anqstFiniteDomainEncodeText_${safeName}(value: ${stripAnQstType(node.typeText)}): string {`);
      lines.push(`  return ${tsFiniteDomainTextValueExpr(node.domain, "value")};`);
      lines.push("}");
      lines.push("");
    }
  }
  for (const { helperName, node } of support.finiteDomainDecodeHelpers) {
    const safeName = sanitizeIdentifier(helperName);
    if (node.representation.kind === "coded-scalar") {
      lines.push(`function __anqstFiniteDomainDecodeCode_${safeName}(code: number): ${stripAnQstType(node.typeText)} {`);
      const decodeBody: string[] = [];
      const valueExpr = emitTsFiniteDomainDecodeFromCode(node, "code", decodeBody, new TsEmitterContext(), 1);
      lines.push(...decodeBody);
      lines.push(`  return ${valueExpr};`);
      lines.push("}");
      lines.push("");
    } else {
      lines.push(`function __anqstFiniteDomainDecodeText_${safeName}(text: string): ${stripAnQstType(node.typeText)} {`);
      const decodeBody: string[] = [];
      const valueExpr = emitTsFiniteDomainDecodeFromText(node, "text", decodeBody, new TsEmitterContext(), 1);
      lines.push(...decodeBody);
      lines.push(`  return ${valueExpr};`);
      lines.push("}");
      lines.push("");
    }
  }

  const typedArrayInfoByKind: Record<Exclude<BinaryLeafKind, "ArrayBuffer">, { ctor: string; bytesPerElement: number }> = {
    Uint8Array: { ctor: "Uint8Array", bytesPerElement: 1 },
    Int8Array: { ctor: "Int8Array", bytesPerElement: 1 },
    Uint16Array: { ctor: "Uint16Array", bytesPerElement: 2 },
    Int16Array: { ctor: "Int16Array", bytesPerElement: 2 },
    Uint32Array: { ctor: "Uint32Array", bytesPerElement: 4 },
    Int32Array: { ctor: "Int32Array", bytesPerElement: 4 },
    Float32Array: { ctor: "Float32Array", bytesPerElement: 4 },
    Float64Array: { ctor: "Float64Array", bytesPerElement: 8 }
  };
  if (support.binaryHelperKinds.includes("ArrayBuffer")) {
    lines.push("function __anqstEncodeBinary_ArrayBuffer(value: ArrayBuffer): string { return __anqstBase93Encode(new Uint8Array(value)); }");
    lines.push("function __anqstDecodeBinary_ArrayBuffer(encoded: string): ArrayBuffer { const bytes = __anqstBase93Decode(encoded); if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) return bytes.buffer as ArrayBuffer; return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); }");
  }
  for (const kind of support.binaryHelperKinds.filter((binary): binary is Exclude<BinaryLeafKind, "ArrayBuffer"> => binary !== "ArrayBuffer")) {
    const info = typedArrayInfoByKind[kind];
    const ctor = info.ctor;
    const bytesPerElement = info.bytesPerElement;
    lines.push(`function ${binaryEncodeHelperName(kind)}(value: ${ctor}): string { return __anqstBase93Encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }`);
    lines.push(`function ${binaryDecodeHelperName(kind)}(encoded: string): ${ctor} { const bytes = __anqstBase93Decode(encoded); if ((bytes.byteOffset % ${bytesPerElement}) === 0) return new ${ctor}(bytes.buffer, bytes.byteOffset, bytes.byteLength / ${bytesPerElement}); const copy = bytes.slice(); return new ${ctor}(copy.buffer, 0, copy.byteLength / ${bytesPerElement}); }`);
  }

  return lines.join("\n");
}

export function renderTsBoundaryCodecHelpers(catalog: BoundaryCodecCatalog): string {
  if (catalog.plans.length === 0) return "";
  const runtime = renderTsRuntimeSupport(catalog);
  const codecs = catalog.plans.map((plan) => renderTsPlanCodec(plan)).join("\n\n");
  return `${runtime}\n\n${codecs}\n`;
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
    "std::int32_t",
    "std::uint32_t",
    "std::int16_t",
    "std::uint16_t",
    "std::int8_t",
    "std::uint8_t"
  ].includes(cppType);
}

function cppFiniteDomainVariantExpr(cppType: string, variant: BoundaryFiniteDomain["variants"][number]): string {
  if (cppType === "QString") return `QStringLiteral(${JSON.stringify(String(variant.value))})`;
  if (cppType === "bool") return variant.value ? "true" : "false";
  if (isNumericCppType(cppType)) return `static_cast<${cppType}>(${variant.value})`;
  return `${cppType}::${variant.symbolicName}`;
}

function cppFiniteDomainTextExpr(domain: BoundaryFiniteDomain, cppType: string, valueExpr: string, lines: string[], level: number, ctx: CppEmitterContext): string {
  const pad = indent(level).replace(/  /g, "    ");
  const textVar = ctx.next("text");
  lines.push(`${pad}QString ${textVar};`);
  if (domain.primitive === "boolean" && cppType === "bool") {
    lines.push(`${pad}${textVar} = ${valueExpr} ? QStringLiteral("1") : QStringLiteral("0");`);
    return textVar;
  }
  if (domain.primitive === "string" && cppType === "QString") {
    lines.push(`${pad}${textVar} = ${valueExpr};`);
    return textVar;
  }
  if (domain.primitive === "number" && isNumericCppType(cppType)) {
    lines.push(`${pad}${textVar} = QString::number(${valueExpr});`);
    return textVar;
  }
  lines.push(`${pad}switch (${valueExpr}) {`);
  for (const variant of domain.variants) {
    const encodedText = domain.primitive === "boolean" ? (variant.value ? '"1"' : '"0"') : JSON.stringify(String(variant.value));
    lines.push(`${pad}case ${cppFiniteDomainVariantExpr(cppType, variant)}: ${textVar} = QStringLiteral(${encodedText}); break;`);
  }
  lines.push(`${pad}default: throw std::runtime_error("AnQst finite-domain encode received an unsupported value.");`);
  lines.push(`${pad}}`);
  return textVar;
}

function cppVariantToValueExpr(cppType: string, expr: string): string {
  if (cppType === "QString") return `${expr}.toString()`;
  if (cppType === "bool") return `${expr}.toBool()`;
  if (cppType === "QVariantMap") return `${expr}.toMap()`;
  if (isNumericCppType(cppType)) return `static_cast<${cppType}>(${expr}.toDouble())`;
  return `${expr}.value<${cppType}>()`;
}

function emitCppFiniteDomainCodeAssignment(
  domain: BoundaryFiniteDomain,
  cppType: string,
  valueExpr: string,
  targetVar: string,
  lines: string[],
  level: number
): void {
  const pad = indent(level).replace(/  /g, "    ");
  const enumLike = cppType !== "QString" && cppType !== "bool" && !isNumericCppType(cppType);
  if (enumLike) {
    lines.push(`${pad}switch (${valueExpr}) {`);
    for (const variant of domain.variants) {
      lines.push(`${pad}case ${cppFiniteDomainVariantExpr(cppType, variant)}: ${targetVar} = ${variant.code}; break;`);
    }
    lines.push(`${pad}default: throw std::runtime_error("AnQst finite-domain encode received an unsupported value.");`);
    lines.push(`${pad}}`);
    return;
  }
  let started = false;
  for (const variant of domain.variants) {
    const keyword = started ? "else if" : "if";
    lines.push(`${pad}${keyword} (${valueExpr} == ${cppFiniteDomainVariantExpr(cppType, variant)}) {`);
    lines.push(`${pad}    ${targetVar} = ${variant.code};`);
    lines.push(`${pad}}`);
    started = true;
  }
  lines.push(`${pad}else {`);
  lines.push(`${pad}    throw std::runtime_error("AnQst finite-domain encode received an unsupported value.");`);
  lines.push(`${pad}}`);
}

function emitCppEncodeNode(
  node: BoundaryPlanNode,
  valueExpr: string,
  lines: string[],
  ctx: CppEmitterContext,
  level: number,
  mapCppType: (typeText: string, pathHintParts: string[]) => string,
  scope = ""
): void {
  const pad = indent(level).replace(/  /g, "    ");
  switch (node.nodeKind) {
    case "leaf":
      if (node.blobEntryId) {
        const leafKind = node.leaf.key as ScalarLeafKind;
        if (node.lowering.cppEncode.mode === "helper-call") {
          lines.push(`${pad}${cppScalarWriteHelper(leafKind)}(bytes, ${valueExpr});`);
        } else {
          emitCppInlineScalarWrite(leafKind, valueExpr, lines, ctx, level);
        }
        return;
      }
      if (node.leaf.region === "string") {
        if (node.selectedPacking === "text-packed" && node.leaf.key === "boolean") {
          lines.push(`${pad}items.push_back(${valueExpr} ? QStringLiteral("1") : QStringLiteral("0"));`);
        } else {
          lines.push(`${pad}items.push_back(${valueExpr});`);
        }
        return;
      }
      if (node.leaf.region === "binary") {
        if (node.lowering.cppEncode.mode === "helper-call") {
          lines.push(`${pad}items.push_back(anqstEncodeBinary(${valueExpr}));`);
        } else {
          lines.push(`${pad}items.push_back(${cppInlineBinaryEncodeExpr(valueExpr)});`);
        }
        return;
      }
      lines.push(`${pad}items.push_back(QVariant::fromValue(${valueExpr}));`);
      return;
    case "named":
      lines.push(`${pad}${cppNamedEncodeHelperName(node, scope)}(${valueExpr}, bytes, items);`);
      return;
    case "finite-domain": {
      const cppType = mapCppType(node.typeText, node.cppNameHintParts);
      if (node.representation.kind === "coded-scalar") {
        const codeVar = ctx.next("code");
        if (node.lowering.cppEncode.mode === "helper-call" && node.lowering.cppEncode.helperNameHint) {
          lines.push(`${pad}const std::uint32_t ${codeVar} = anqstFiniteDomainEncodeCode_${sanitizeIdentifier(node.lowering.cppEncode.helperNameHint)}(${valueExpr});`);
          lines.push(`${pad}${cppScalarWriteHelper(node.representation.scalarKind)}(bytes, static_cast<std::${node.representation.scalarKind}_t>(${codeVar}));`);
        } else if (node.lowering.cppEncode.mode === "helper-call") {
          lines.push(`${pad}std::uint32_t ${codeVar} = 0;`);
          emitCppFiniteDomainCodeAssignment(node.domain, cppType, valueExpr, codeVar, lines, level);
          lines.push(`${pad}${cppScalarWriteHelper(node.representation.scalarKind)}(bytes, static_cast<std::${node.representation.scalarKind}_t>(${codeVar}));`);
        } else {
          lines.push(`${pad}std::uint32_t ${codeVar} = 0;`);
          emitCppFiniteDomainCodeAssignment(node.domain, cppType, valueExpr, codeVar, lines, level);
          emitCppInlineScalarWrite(node.representation.scalarKind, `static_cast<std::${node.representation.scalarKind}_t>(${codeVar})`, lines, ctx, level);
        }
      } else {
        if (node.lowering.cppEncode.mode === "helper-call" && node.lowering.cppEncode.helperNameHint) {
          lines.push(`${pad}items.push_back(anqstFiniteDomainEncodeText_${sanitizeIdentifier(node.lowering.cppEncode.helperNameHint)}(${valueExpr}));`);
        } else {
          const textExpr = cppFiniteDomainTextExpr(node.domain, cppType, valueExpr, lines, level, ctx);
          lines.push(`${pad}items.push_back(${textExpr});`);
        }
      }
      return;
    }
    case "array": {
      if (node.extentStrategy === "explicit-count") {
        emitCppInlineScalarWrite("uint32", `static_cast<std::uint32_t>(${valueExpr}.size())`, lines, ctx, level);
      }
      const itemVar = ctx.next("item");
      lines.push(`${pad}for (const auto& ${itemVar} : ${valueExpr}) {`);
      emitCppEncodeNode(node.element, itemVar, lines, ctx, level + 1, mapCppType, scope);
      lines.push(`${pad}}`);
      return;
    }
    case "struct":
      for (const field of node.fields) {
        const fieldExpr = `${valueExpr}.${field.name}`;
        if (field.optional) {
          const presentVar = ctx.next("present");
          lines.push(`${pad}const bool ${presentVar} = ${fieldExpr}.has_value();`);
          emitCppInlineScalarWrite("uint8", `${presentVar} ? 1u : 0u`, lines, ctx, level);
          lines.push(`${pad}if (${presentVar}) {`);
          emitCppEncodeNode(field.node, `${fieldExpr}.value()`, lines, ctx, level + 1, mapCppType, scope);
          lines.push(`${pad}}`);
        } else {
          emitCppEncodeNode(field.node, fieldExpr, lines, ctx, level, mapCppType, scope);
        }
      }
  }
}

function emitCppDecodeNode(
  node: BoundaryPlanNode,
  lines: string[],
  ctx: CppEmitterContext,
  level: number,
  mapCppType: (typeText: string, pathHintParts: string[]) => string,
  scope = ""
): string {
  const pad = indent(level).replace(/  /g, "    ");
  switch (node.nodeKind) {
    case "leaf":
      if (node.blobEntryId) {
        const leafKind = node.leaf.key as ScalarLeafKind;
        if (node.lowering.cppDecode.mode === "helper-call") {
          return `${cppScalarReadHelper(leafKind)}(blob, dataOffset)`;
        }
        return emitCppInlineScalarRead(leafKind, lines, ctx, level);
      }
      if (node.leaf.region === "string") {
        if (node.selectedPacking === "text-packed" && node.leaf.key === "boolean") {
          return `items[static_cast<int>(itemIndex++)].toString() == QStringLiteral("1")`;
        }
        return `items[static_cast<int>(itemIndex++)].toString()`;
      }
      if (node.leaf.region === "binary") {
        if (node.lowering.cppDecode.mode === "helper-call") {
          return `anqstDecodeBinary(items[static_cast<int>(itemIndex++)].toString())`;
        }
        return cppInlineBinaryDecodeExpr("items[static_cast<int>(itemIndex++)].toString()");
      }
      return cppVariantToValueExpr(mapCppType(node.typeText, node.cppNameHintParts), "items[static_cast<int>(itemIndex++)]");
    case "named":
      return `${cppNamedDecodeHelperName(node, scope)}(items, blob, itemIndex, dataOffset)`;
    case "finite-domain": {
      const cppType = mapCppType(node.typeText, node.cppNameHintParts);
      const valueVar = ctx.next("value");
      lines.push(`${pad}${cppType} ${valueVar}{};`);
      if (node.representation.kind === "coded-scalar") {
        const codeVar = ctx.next("code");
        if (node.lowering.cppDecode.mode === "helper-call" && node.lowering.cppDecode.helperNameHint) {
          lines.push(`${pad}const auto ${codeVar} = ${cppScalarReadHelper(node.representation.scalarKind)}(blob, dataOffset);`);
          lines.push(`${pad}${valueVar} = anqstFiniteDomainDecodeCode_${sanitizeIdentifier(node.lowering.cppDecode.helperNameHint)}(${codeVar});`);
          return valueVar;
        }
        if (node.lowering.cppDecode.mode === "helper-call") {
          lines.push(`${pad}const auto ${codeVar} = ${cppScalarReadHelper(node.representation.scalarKind)}(blob, dataOffset);`);
        } else {
          lines.push(`${pad}const auto ${codeVar} = ${emitCppInlineScalarRead(node.representation.scalarKind, lines, ctx, level)};`);
        }
        const firstVariant = node.domain.variants[0];
        lines.push(`${pad}${valueVar} = ${cppFiniteDomainVariantExpr(cppType, firstVariant)};`);
        lines.push(`${pad}switch (${codeVar}) {`);
        for (const variant of node.domain.variants) {
          lines.push(`${pad}case ${variant.code}: ${valueVar} = ${cppFiniteDomainVariantExpr(cppType, variant)}; break;`);
        }
        lines.push(`${pad}}`);
      } else {
        const textVar = ctx.next("text");
        lines.push(`${pad}const QString ${textVar} = items[static_cast<int>(itemIndex++)].toString();`);
        if (node.lowering.cppDecode.mode === "helper-call" && node.lowering.cppDecode.helperNameHint) {
          lines.push(`${pad}${valueVar} = anqstFiniteDomainDecodeText_${sanitizeIdentifier(node.lowering.cppDecode.helperNameHint)}(${textVar});`);
          return valueVar;
        }
        const firstVariant = node.domain.variants[0];
        lines.push(`${pad}${valueVar} = ${cppFiniteDomainVariantExpr(cppType, firstVariant)};`);
        let started = false;
        for (const variant of node.domain.variants) {
          const keyword = started ? "else if" : "if";
          const encodedText = node.domain.primitive === "boolean" ? (variant.value ? '"1"' : '"0"') : JSON.stringify(String(variant.value));
          lines.push(`${pad}${keyword} (${textVar} == QStringLiteral(${encodedText})) {`);
          lines.push(`${pad}    ${valueVar} = ${cppFiniteDomainVariantExpr(cppType, variant)};`);
          lines.push(`${pad}}`);
          started = true;
        }
      }
      return valueVar;
    }
    case "array": {
      const arrayType = mapCppType(node.typeText, node.cppNameHintParts);
      const arrayVar = ctx.next("array");
      const countVar = ctx.next("count");
      lines.push(`${pad}${arrayType} ${arrayVar};`);
      if (node.extentStrategy === "blob-tail") {
        const elementWidth = node.elementBlobWidthBytes ?? 1;
        const remainingVar = ctx.next("remaining");
        lines.push(`${pad}const std::size_t ${remainingVar} = blob.size() - dataOffset;`);
        lines.push(`${pad}const std::uint32_t ${countVar} = static_cast<std::uint32_t>(${remainingVar} / ${elementWidth});`);
      } else if (node.extentStrategy === "item-tail") {
        const elementItemCount = node.elementItemCount ?? 1;
        const remainingVar = ctx.next("remainingItems");
        lines.push(`${pad}const std::size_t ${remainingVar} = static_cast<std::size_t>(items.size()) - itemIndex;`);
        lines.push(`${pad}const std::uint32_t ${countVar} = static_cast<std::uint32_t>(${remainingVar} / ${elementItemCount});`);
      } else {
        lines.push(`${pad}const std::uint32_t ${countVar} = ${emitCppInlineScalarRead("uint32", lines, ctx, level)};`);
      }
      lines.push(`${pad}${arrayVar}.reserve(static_cast<qsizetype>(${countVar}));`);
      lines.push(`${pad}for (std::uint32_t i = 0; i < ${countVar}; ++i) {`);
      const elementExpr = emitCppDecodeNode(node.element, lines, ctx, level + 1, mapCppType, scope);
      lines.push(`${indent(level + 1).replace(/  /g, "    ")}${arrayVar}.push_back(${elementExpr});`);
      lines.push(`${pad}}`);
      return arrayVar;
    }
    case "struct": {
      const valueType = mapCppType(node.typeText, node.cppNameHintParts);
      const valueVar = ctx.next("value");
      lines.push(`${pad}${valueType} ${valueVar}{};`);
      for (const field of node.fields) {
        if (field.optional) {
          const presentVar = ctx.next("present");
          lines.push(`${pad}const bool ${presentVar} = ${emitCppInlineScalarRead("uint8", lines, ctx, level)} != 0u;`);
          lines.push(`${pad}if (${presentVar}) {`);
          const fieldExpr = emitCppDecodeNode(field.node, lines, ctx, level + 1, mapCppType, scope);
          lines.push(`${indent(level + 1).replace(/  /g, "    ")}${valueVar}.${field.name} = ${fieldExpr};`);
          lines.push(`${pad}}`);
        } else {
          const fieldExpr = emitCppDecodeNode(field.node, lines, ctx, level, mapCppType, scope);
          lines.push(`${pad}${valueVar}.${field.name} = ${fieldExpr};`);
        }
      }
      return valueVar;
    }
  }
}

function renderCppFastPathCodec(
  plan: BoundaryCodecPlan,
  mapCppType: (typeText: string, pathHintParts: string[]) => string
): string | null {
  const encoderName = `encode${plan.codecId}`;
  const decoderName = `decode${plan.codecId}`;
  const cppType = mapCppType(plan.typeText, plan.root.cppNameHintParts);
  const trustedOnlyDecode = plan.decodePolicy === "trusted-only";
  if (plan.root.nodeKind === "leaf") {
    if (plan.root.blobEntryId) {
      const encodeCtx = new CppEmitterContext();
      const encodeLines: string[] = [];
      if (plan.root.lowering.cppEncode.mode === "helper-call") {
        encodeLines.push(`    ${cppScalarWriteHelper(plan.root.leaf.key as ScalarLeafKind)}(bytes, value);`);
      } else {
        emitCppInlineScalarWrite(plan.root.leaf.key as ScalarLeafKind, "value", encodeLines, encodeCtx, 1);
      }
      const decodeBody: string[] = [];
      const decodeExpr =
        plan.root.lowering.cppDecode.mode === "helper-call"
          ? `${cppScalarReadHelper(plan.root.leaf.key as ScalarLeafKind)}(blob, dataOffset)`
          : emitCppInlineScalarRead(plan.root.leaf.key as ScalarLeafKind, decodeBody, new CppEmitterContext(), 1);
      return `inline QVariant ${encoderName}(const ${cppType}& value) {
    std::vector<std::uint8_t> bytes;
${encodeLines.join("\n")}
    return anqstBase93Encode(bytes);
}

inline ${cppType} ${decoderName}(const QVariant& wire) {
    const std::vector<std::uint8_t> blob = anqstBase93Decode(wire.toString());
    std::size_t dataOffset = 0;
${decodeBody.join("\n")}
    const ${cppType} result = ${decodeExpr};
${trustedOnlyDecode ? "" : '    if (dataOffset != blob.size()) throw std::runtime_error("AnQst wire contained trailing blob bytes.");'}
    return result;
}`;
    }
    const directEncode =
      plan.root.leaf.region === "string" && plan.root.selectedPacking === "text-packed" && plan.root.leaf.key === "boolean"
        ? `(value ? QStringLiteral("1") : QStringLiteral("0"))`
        : plan.root.leaf.region === "binary"
          ? plan.root.lowering.cppEncode.mode === "helper-call"
            ? `anqstEncodeBinary(value)`
            : cppInlineBinaryEncodeExpr("value")
          : plan.root.leaf.region === "dynamic"
            ? `QVariant::fromValue(value)`
            : "QVariant::fromValue(value)";
    const directDecode =
      plan.root.leaf.region === "string" && plan.root.selectedPacking === "text-packed" && plan.root.leaf.key === "boolean"
        ? `(wire.toString() == QStringLiteral("1"))`
        : plan.root.leaf.region === "string"
          ? "wire.toString()"
          : plan.root.leaf.region === "binary"
            ? plan.root.lowering.cppDecode.mode === "helper-call"
              ? "anqstDecodeBinary(wire.toString())"
              : cppInlineBinaryDecodeExpr("wire.toString()")
            : cppVariantToValueExpr(cppType, "wire");
    return `inline QVariant ${encoderName}(const ${cppType}& value) {
    return ${directEncode};
}

inline ${cppType} ${decoderName}(const QVariant& wire) {
    return ${directDecode};
}`;
  }
  if (plan.root.nodeKind === "finite-domain") {
    if (plan.root.representation.kind === "coded-scalar") {
      const encodeLines: string[] = [];
      const encodeCtx = new CppEmitterContext();
      if (plan.root.lowering.cppEncode.mode === "helper-call" && plan.root.lowering.cppEncode.helperNameHint) {
        encodeLines.push(`    const std::uint32_t code = anqstFiniteDomainEncodeCode_${sanitizeIdentifier(plan.root.lowering.cppEncode.helperNameHint)}(value);`);
      } else {
        encodeLines.push("    std::uint32_t code = 0;");
        emitCppFiniteDomainCodeAssignment(plan.root.domain, cppType, "value", "code", encodeLines, 1);
      }
      encodeLines.push(`    std::vector<std::uint8_t> bytes;`);
      if (plan.root.lowering.cppEncode.mode === "helper-call") {
        encodeLines.push(`    ${cppScalarWriteHelper(plan.root.representation.scalarKind)}(bytes, static_cast<std::${plan.root.representation.scalarKind}_t>(code));`);
      } else {
        emitCppInlineScalarWrite(plan.root.representation.scalarKind, `static_cast<std::${plan.root.representation.scalarKind}_t>(code)`, encodeLines, encodeCtx, 1);
      }
      encodeLines.push(`    return anqstBase93Encode(bytes);`);
      const decodeLines: string[] = ["    const std::vector<std::uint8_t> blob = anqstBase93Decode(wire.toString());", "    std::size_t dataOffset = 0;"];
      const decodeBody: string[] = [];
      const expr = emitCppDecodeNode(plan.root, decodeBody, new CppEmitterContext(), 1, mapCppType);
      return `inline QVariant ${encoderName}(const ${cppType}& value) {
${encodeLines.join("\n")}
}

inline ${cppType} ${decoderName}(const QVariant& wire) {
${decodeLines.join("\n")}
${decodeBody.join("\n")}
    const ${cppType} result = ${expr};
${trustedOnlyDecode ? "" : '    if (dataOffset != blob.size()) throw std::runtime_error("AnQst wire contained trailing blob bytes.");'}
    return result;
}`;
    }
    const encodeLines: string[] = [];
    const textExpr = plan.root.lowering.cppEncode.mode === "helper-call" && plan.root.lowering.cppEncode.helperNameHint
      ? `anqstFiniteDomainEncodeText_${sanitizeIdentifier(plan.root.lowering.cppEncode.helperNameHint)}(value)`
      : cppFiniteDomainTextExpr(plan.root.domain, cppType, "value", encodeLines, 1, new CppEmitterContext());
    const decodeBody: string[] = [];
    const expr = emitCppDecodeNode(plan.root, decodeBody, new CppEmitterContext(), 1, mapCppType);
    return `inline QVariant ${encoderName}(const ${cppType}& value) {
${encodeLines.join("\n")}
    return ${textExpr};
}

inline ${cppType} ${decoderName}(const QVariant& wire) {
    const QVariantList items{wire};
    std::size_t itemIndex = 0;
    std::vector<std::uint8_t> blob;
    std::size_t dataOffset = 0;
${decodeBody.join("\n")}
    const ${cppType} result = ${expr};
${trustedOnlyDecode ? "" : '    if (dataOffset != blob.size()) throw std::runtime_error("AnQst wire contained trailing blob bytes.");'}
${trustedOnlyDecode ? "" : '    if (itemIndex != static_cast<std::size_t>(items.size())) throw std::runtime_error("AnQst wire contained trailing item payloads.");'}
    return result;
}`;
  }
  return null;
}

function renderCppPlanCodec(
  plan: BoundaryCodecPlan,
  mapCppType: (typeText: string, pathHintParts: string[]) => string
): string {
  const fastPath = renderCppFastPathCodec(plan, mapCppType);
  if (fastPath) return fastPath;
  const trustedOnlyDecode = plan.decodePolicy === "trusted-only";
  const cppType = mapCppType(plan.typeText, plan.root.cppNameHintParts);
  const namedNodes = [...collectNamedPlanNodes(plan.root).values()];
  const encodeLines: string[] = [];
  emitCppEncodeNode(plan.root, "value", encodeLines, new CppEmitterContext(), 1, mapCppType, plan.codecId);
  const decodeCtx = new CppEmitterContext();
  const decodeLines: string[] = [];
  const decodeExpr = emitCppDecodeNode(plan.root, decodeLines, decodeCtx, 1, mapCppType, plan.codecId);
  const encoderName = `encode${plan.codecId}`;
  const decoderName = `decode${plan.codecId}`;
  const namedDeclarations = namedNodes.map((node) => {
    const helperType = mapCppType(node.typeText, node.cppNameHintParts);
    return `inline void ${cppNamedEncodeHelperName(node, plan.codecId)}(
    const ${helperType}& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
);
inline ${helperType} ${cppNamedDecodeHelperName(node, plan.codecId)}(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
);`;
  }).join("\n");
  const namedHelpers = namedNodes.map((node) => {
    const helperType = mapCppType(node.typeText, node.cppNameHintParts);
    const helperEncodeLines: string[] = [];
    emitCppEncodeNode(node.target, "value", helperEncodeLines, new CppEmitterContext(), 1, mapCppType, plan.codecId);
    const helperDecodeLines: string[] = [];
    const helperDecodeExpr = emitCppDecodeNode(node.target, helperDecodeLines, new CppEmitterContext(), 1, mapCppType, plan.codecId);
    return `inline void ${cppNamedEncodeHelperName(node, plan.codecId)}(
    const ${helperType}& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
) {
${helperEncodeLines.join("\n")}
}

inline ${helperType} ${cppNamedDecodeHelperName(node, plan.codecId)}(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
) {
${helperDecodeLines.join("\n")}
    return ${helperDecodeExpr};
}`;
  }).join("\n\n");

  return `${namedDeclarations ? `${namedDeclarations}\n\n` : ""}${namedHelpers ? `${namedHelpers}\n\n` : ""}inline QVariant ${encoderName}(const ${cppType}& value) {
    std::vector<std::uint8_t> bytes;
    QVariantList items;
${encodeLines.join("\n")}
    return anqstFinalizeWire(bytes, items);
}

inline ${cppType} ${decoderName}(const QVariant& wire) {
    const QVariantList items = anqstNormalizeWireItems(wire);
    const std::vector<std::uint8_t> blob = ${plan.requirements.hasBlob ? `(items.isEmpty() ? std::vector<std::uint8_t>{} : anqstBase93Decode(items.value(0).toString()))` : "std::vector<std::uint8_t>{}"};
    std::size_t itemIndex = ${plan.requirements.hasBlob ? 1 : 0};
    std::size_t dataOffset = 0;
${decodeLines.join("\n")}
    const ${cppType} result = ${decodeExpr};
${trustedOnlyDecode ? "" : (plan.requirements.hasBlob ? "    if (dataOffset != blob.size()) throw std::runtime_error(\"AnQst wire contained trailing blob bytes.\");" : "")}
${trustedOnlyDecode ? "" : '    if (itemIndex != static_cast<std::size_t>(items.size())) throw std::runtime_error("AnQst wire contained trailing item payloads.");'}
    return result;
}`;
}

function collectCppSupport(catalog: BoundaryCodecCatalog): {
  needsBase93: boolean;
  scalarEncodeKinds: ScalarLeafKind[];
  scalarDecodeKinds: ScalarLeafKind[];
  needsBinaryHelpers: boolean;
  finiteDomainEncodeHelpers: Array<{ helperName: string; node: BoundaryPlanFiniteDomainNode }>;
  finiteDomainDecodeHelpers: Array<{ helperName: string; node: BoundaryPlanFiniteDomainNode }>;
} {
  const scalarEncodeKinds = new Set<ScalarLeafKind>();
  const scalarDecodeKinds = new Set<ScalarLeafKind>();
  let needsBase93 = false;
  let needsBinaryHelpers = false;
  const finiteDomainEncodeHelpers = new Map<string, BoundaryPlanFiniteDomainNode>();
  const finiteDomainDecodeHelpers = new Map<string, BoundaryPlanFiniteDomainNode>();
  for (const plan of catalog.plans) {
    if (plan.requirements.hasBlob || plan.requirements.usedBinaryLeafKinds.length > 0) {
      needsBase93 = true;
    }
    if (
      plan.requirements.cppHelperRequirements.binaryEncodeKinds.length > 0
      || plan.requirements.cppHelperRequirements.binaryDecodeKinds.length > 0
    ) {
      needsBinaryHelpers = true;
    }
    for (const kind of plan.requirements.cppHelperRequirements.scalarEncodeKinds) scalarEncodeKinds.add(kind);
    for (const kind of plan.requirements.cppHelperRequirements.scalarDecodeKinds) scalarDecodeKinds.add(kind);
    for (const node of collectFiniteDomainPlanNodes(plan.root)) {
      if (node.lowering.cppEncode.mode === "helper-call" && node.lowering.cppEncode.helperNameHint) {
        finiteDomainEncodeHelpers.set(node.lowering.cppEncode.helperNameHint, node);
      }
      if (node.lowering.cppDecode.mode === "helper-call" && node.lowering.cppDecode.helperNameHint) {
        finiteDomainDecodeHelpers.set(node.lowering.cppDecode.helperNameHint, node);
      }
    }
  }
  const sortByName = (values: Iterable<string>): string[] => [...values].sort();
  return {
    needsBase93,
    scalarEncodeKinds: sortByName(scalarEncodeKinds) as ScalarLeafKind[],
    scalarDecodeKinds: sortByName(scalarDecodeKinds) as ScalarLeafKind[],
    needsBinaryHelpers,
    finiteDomainEncodeHelpers: [...finiteDomainEncodeHelpers.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([helperName, node]) => ({ helperName, node })),
    finiteDomainDecodeHelpers: [...finiteDomainDecodeHelpers.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([helperName, node]) => ({ helperName, node }))
  };
}

function renderCppRuntimeSupport(
  catalog: BoundaryCodecCatalog,
  mapCppType: (typeText: string, pathHintParts: string[]) => string
): string {
  const support = collectCppSupport(catalog);
  const lines: string[] = [];
  lines.push("inline QVariantList anqstNormalizeWireItems(const QVariant& wire) {");
  lines.push("    return wire.type() == QVariant::List ? wire.toList() : QVariantList{wire};");
  lines.push("}");
  lines.push("");
  lines.push("inline QVariant anqstFinalizeWire(const std::vector<std::uint8_t>& bytes, const QVariantList& items) {");
  lines.push("    if (bytes.empty()) {");
  lines.push("        if (items.size() == 1) return items.front();");
  lines.push("        return items;");
  lines.push("    }");
  if (!support.needsBase93) {
    lines.push('    throw std::runtime_error("AnQst boundary planner emitted unexpected blob bytes.");');
    lines.push("}");
    lines.push("");
  } else {
    lines.push("    QVariantList out;");
    lines.push("    out.reserve(static_cast<qsizetype>(items.size() + 1));");
    lines.push("    out.push_back(anqstBase93Encode(bytes));");
    lines.push("    for (const auto& item : items) out.push_back(item);");
    lines.push("    return out;");
    lines.push("}");
    lines.push("");
  }
  const scalarEncodeKinds = new Set<ScalarLeafKind>(support.scalarEncodeKinds);
  const scalarDecodeKinds = new Set<ScalarLeafKind>(support.scalarDecodeKinds);
  if (scalarEncodeKinds.has("uint8")) lines.push("inline void anqstPushUint8(std::vector<std::uint8_t>& out, std::uint8_t value) { out.push_back(value); }");
  if (scalarEncodeKinds.has("int8")) lines.push("inline void anqstPushInt8(std::vector<std::uint8_t>& out, std::int8_t value) { out.push_back(static_cast<std::uint8_t>(value)); }");
  if (scalarEncodeKinds.has("boolean")) lines.push("inline void anqstPushBool(std::vector<std::uint8_t>& out, bool value) { out.push_back(value ? 1u : 0u); }");
  if (scalarEncodeKinds.has("uint16") || scalarEncodeKinds.has("quint16")) lines.push("inline void anqstPushUint16(std::vector<std::uint8_t>& out, std::uint16_t value) { out.push_back(static_cast<std::uint8_t>(value & 0xffu)); out.push_back(static_cast<std::uint8_t>((value >> 8) & 0xffu)); }");
  if (scalarEncodeKinds.has("int16")) lines.push("inline void anqstPushInt16(std::vector<std::uint8_t>& out, std::int16_t value) { anqstPushUint16(out, static_cast<std::uint16_t>(value)); }");
  if (scalarEncodeKinds.has("quint16")) lines.push("inline void anqstPushQuint16(std::vector<std::uint8_t>& out, quint16 value) { anqstPushUint16(out, static_cast<std::uint16_t>(value)); }");
  if (scalarEncodeKinds.has("qint16")) lines.push("inline void anqstPushQint16(std::vector<std::uint8_t>& out, qint16 value) { anqstPushInt16(out, static_cast<std::int16_t>(value)); }");
  if (scalarEncodeKinds.has("uint32") || scalarEncodeKinds.has("quint32")) lines.push("inline void anqstPushUint32(std::vector<std::uint8_t>& out, std::uint32_t value) { out.push_back(static_cast<std::uint8_t>(value & 0xffu)); out.push_back(static_cast<std::uint8_t>((value >> 8) & 0xffu)); out.push_back(static_cast<std::uint8_t>((value >> 16) & 0xffu)); out.push_back(static_cast<std::uint8_t>((value >> 24) & 0xffu)); }");
  if (scalarEncodeKinds.has("int32")) lines.push("inline void anqstPushInt32(std::vector<std::uint8_t>& out, std::int32_t value) { anqstPushUint32(out, static_cast<std::uint32_t>(value)); }");
  if (scalarEncodeKinds.has("quint32")) lines.push("inline void anqstPushQuint32(std::vector<std::uint8_t>& out, quint32 value) { anqstPushUint32(out, static_cast<std::uint32_t>(value)); }");
  if (scalarEncodeKinds.has("qint32")) lines.push("inline void anqstPushQint32(std::vector<std::uint8_t>& out, qint32 value) { anqstPushInt32(out, static_cast<std::int32_t>(value)); }");
  if (scalarEncodeKinds.has("quint64")) lines.push("inline void anqstPushQuint64(std::vector<std::uint8_t>& out, quint64 value) { for (int shift = 0; shift < 64; shift += 8) out.push_back(static_cast<std::uint8_t>((static_cast<std::uint64_t>(value) >> shift) & 0xffu)); }");
  if (scalarEncodeKinds.has("qint64")) lines.push("inline void anqstPushQint64(std::vector<std::uint8_t>& out, qint64 value) { anqstPushQuint64(out, static_cast<quint64>(value)); }");
  if (scalarEncodeKinds.has("number")) lines.push("inline void anqstPushFloat64(std::vector<std::uint8_t>& out, double value) { std::uint64_t bits = 0; std::memcpy(&bits, &value, sizeof(bits)); anqstPushQuint64(out, bits); }");
  if (scalarEncodeKinds.size > 0) lines.push("");

  if (scalarDecodeKinds.has("uint8")) lines.push("inline std::uint8_t anqstReadUint8(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return bytes[offset++]; }");
  if (scalarDecodeKinds.has("int8")) lines.push("inline std::int8_t anqstReadInt8(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<std::int8_t>(bytes[offset++]); }");
  if (scalarDecodeKinds.has("boolean")) lines.push("inline bool anqstReadBool(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return (bytes[offset++] & 1u) != 0u; }");
  if (scalarDecodeKinds.has("uint16") || scalarDecodeKinds.has("quint16")) lines.push("inline std::uint16_t anqstReadUint16(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { const std::uint16_t b0 = bytes[offset]; const std::uint16_t b1 = bytes[offset + 1]; offset += 2; return static_cast<std::uint16_t>(b0 | (b1 << 8)); }");
  if (scalarDecodeKinds.has("int16")) lines.push("inline std::int16_t anqstReadInt16(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<std::int16_t>(anqstReadUint16(bytes, offset)); }");
  if (scalarDecodeKinds.has("quint16")) lines.push("inline quint16 anqstReadQuint16(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<quint16>(anqstReadUint16(bytes, offset)); }");
  if (scalarDecodeKinds.has("qint16")) lines.push("inline qint16 anqstReadQint16(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<qint16>(anqstReadInt16(bytes, offset)); }");
  if (scalarDecodeKinds.has("uint32") || scalarDecodeKinds.has("quint32")) lines.push("inline std::uint32_t anqstReadUint32(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { const std::uint32_t b0 = bytes[offset]; const std::uint32_t b1 = bytes[offset + 1]; const std::uint32_t b2 = bytes[offset + 2]; const std::uint32_t b3 = bytes[offset + 3]; offset += 4; return b0 | (b1 << 8) | (b2 << 16) | (b3 << 24); }");
  if (scalarDecodeKinds.has("int32")) lines.push("inline std::int32_t anqstReadInt32(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<std::int32_t>(anqstReadUint32(bytes, offset)); }");
  if (scalarDecodeKinds.has("quint32")) lines.push("inline quint32 anqstReadQuint32(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<quint32>(anqstReadUint32(bytes, offset)); }");
  if (scalarDecodeKinds.has("qint32")) lines.push("inline qint32 anqstReadQint32(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<qint32>(anqstReadInt32(bytes, offset)); }");
  if (scalarDecodeKinds.has("quint64")) lines.push("inline std::uint64_t anqstReadQuint64(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { std::uint64_t value = 0; for (int shift = 0; shift < 64; shift += 8) value |= (static_cast<std::uint64_t>(bytes[offset++]) << shift); return value; }");
  if (scalarDecodeKinds.has("qint64")) lines.push("inline std::int64_t anqstReadQint64(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { return static_cast<std::int64_t>(anqstReadQuint64(bytes, offset)); }");
  if (scalarDecodeKinds.has("number")) lines.push("inline double anqstReadFloat64(const std::vector<std::uint8_t>& bytes, std::size_t& offset) { const std::uint64_t bits = anqstReadQuint64(bytes, offset); double value = 0; std::memcpy(&value, &bits, sizeof(value)); return value; }");
  if (scalarDecodeKinds.size > 0) lines.push("");

  for (const { helperName, node } of support.finiteDomainEncodeHelpers) {
    const safeName = sanitizeIdentifier(helperName);
    const cppType = mapCppType(node.typeText, node.cppNameHintParts);
    if (node.representation.kind === "coded-scalar") {
      lines.push(`inline std::uint32_t anqstFiniteDomainEncodeCode_${safeName}(const ${cppType}& value) {`);
      lines.push("    std::uint32_t code = 0;");
      emitCppFiniteDomainCodeAssignment(node.domain, cppType, "value", "code", lines, 1);
      lines.push("    return code;");
      lines.push("}");
      lines.push("");
    } else {
      const encodeBody: string[] = [];
      const textExpr = cppFiniteDomainTextExpr(node.domain, cppType, "value", encodeBody, 1, new CppEmitterContext());
      lines.push(`inline QString anqstFiniteDomainEncodeText_${safeName}(const ${cppType}& value) {`);
      lines.push(...encodeBody);
      lines.push(`    return ${textExpr};`);
      lines.push("}");
      lines.push("");
    }
  }
  for (const { helperName, node } of support.finiteDomainDecodeHelpers) {
    const safeName = sanitizeIdentifier(helperName);
    const cppType = mapCppType(node.typeText, node.cppNameHintParts);
    if (node.representation.kind === "coded-scalar") {
      lines.push(`inline ${cppType} anqstFiniteDomainDecodeCode_${safeName}(std::uint32_t code) {`);
      const firstVariant = node.domain.variants[0];
      lines.push(`    ${cppType} value = ${cppFiniteDomainVariantExpr(cppType, firstVariant)};`);
      lines.push("    switch (code) {");
      for (const variant of node.domain.variants) {
        lines.push(`    case ${variant.code}: value = ${cppFiniteDomainVariantExpr(cppType, variant)}; break;`);
      }
      lines.push("    }");
      lines.push("    return value;");
      lines.push("}");
      lines.push("");
    } else {
      lines.push(`inline ${cppType} anqstFiniteDomainDecodeText_${safeName}(const QString& text) {`);
      const firstVariant = node.domain.variants[0];
      lines.push(`    ${cppType} value = ${cppFiniteDomainVariantExpr(cppType, firstVariant)};`);
      let started = false;
      for (const variant of node.domain.variants) {
        const keyword = started ? "else if" : "if";
        const encodedText = node.domain.primitive === "boolean" ? (variant.value ? '"1"' : '"0"') : JSON.stringify(String(variant.value));
        lines.push(`    ${keyword} (text == QStringLiteral(${encodedText})) { value = ${cppFiniteDomainVariantExpr(cppType, variant)}; }`);
        started = true;
      }
      lines.push("    return value;");
      lines.push("}");
      lines.push("");
    }
  }

  if (support.needsBinaryHelpers) {
    lines.push("inline QString anqstEncodeBinary(const QByteArray& value) {");
    lines.push("    return anqstBase93Encode(std::vector<std::uint8_t>(value.begin(), value.end()));");
    lines.push("}");
    lines.push("");
    lines.push("inline QByteArray anqstDecodeBinary(const QString& encoded) {");
    lines.push("    const auto bytes = anqstBase93Decode(encoded);");
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
  const runtime = renderCppRuntimeSupport(catalog, mapCppType);
  const codecs = catalog.plans.map((plan) => renderCppPlanCodec(plan, mapCppType)).join("\n\n");
  return `${runtime}\n\n${codecs}\n`;
}
