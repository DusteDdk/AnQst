import type { LeafCapabilityDescriptor } from "./boundary-codec-model";

function leafCapability(descriptor: LeafCapabilityDescriptor): LeafCapabilityDescriptor {
  return descriptor;
}

const LEAF_CAPABILITIES = new Map<string, LeafCapabilityDescriptor>([
  [
    "string",
    leafCapability({
      key: "string",
      logicalKind: "string",
      region: "string",
      fixedByteWidth: null,
      mayConsumeTail: true,
      mayGroupSharedRegion: true,
      supportedPackings: ["text-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "string",
        cppTypeTextHint: "QString",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "boolean",
    leafCapability({
      key: "boolean",
      logicalKind: "boolean",
      region: "blob",
      fixedByteWidth: 1,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["bit-packed", "byte-packed", "text-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "boolean",
        cppTypeTextHint: "bool",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "number",
    leafCapability({
      key: "number",
      logicalKind: "number",
      region: "blob",
      fixedByteWidth: 8,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "number",
        cppTypeTextHint: "double",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "qint64",
    leafCapability({
      key: "qint64",
      logicalKind: "signed-64-bit-integer",
      region: "blob",
      fixedByteWidth: 8,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "bigint",
        cppTypeTextHint: "qint64",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "quint64",
    leafCapability({
      key: "quint64",
      logicalKind: "unsigned-64-bit-integer",
      region: "blob",
      fixedByteWidth: 8,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "bigint",
        cppTypeTextHint: "quint64",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "qint32",
    leafCapability({
      key: "qint32",
      logicalKind: "signed-32-bit-integer",
      region: "blob",
      fixedByteWidth: 4,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "number",
        cppTypeTextHint: "qint32",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "quint32",
    leafCapability({
      key: "quint32",
      logicalKind: "unsigned-32-bit-integer",
      region: "blob",
      fixedByteWidth: 4,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "number",
        cppTypeTextHint: "quint32",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "qint16",
    leafCapability({
      key: "qint16",
      logicalKind: "signed-16-bit-integer",
      region: "blob",
      fixedByteWidth: 2,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "number",
        cppTypeTextHint: "qint16",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "quint16",
    leafCapability({
      key: "quint16",
      logicalKind: "unsigned-16-bit-integer",
      region: "blob",
      fixedByteWidth: 2,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "number",
        cppTypeTextHint: "quint16",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "qint8",
    leafCapability({
      key: "qint8",
      logicalKind: "signed-8-bit-integer",
      region: "blob",
      fixedByteWidth: 1,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "number",
        cppTypeTextHint: "qint8",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "quint8",
    leafCapability({
      key: "quint8",
      logicalKind: "unsigned-8-bit-integer",
      region: "blob",
      fixedByteWidth: 1,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "number",
        cppTypeTextHint: "quint8",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "int32",
    leafCapability({
      key: "int32",
      logicalKind: "signed-32-bit-integer",
      region: "blob",
      fixedByteWidth: 4,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "number",
        cppTypeTextHint: "int32_t",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "uint32",
    leafCapability({
      key: "uint32",
      logicalKind: "unsigned-32-bit-integer",
      region: "blob",
      fixedByteWidth: 4,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "number",
        cppTypeTextHint: "uint32_t",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "int16",
    leafCapability({
      key: "int16",
      logicalKind: "signed-16-bit-integer",
      region: "blob",
      fixedByteWidth: 2,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "number",
        cppTypeTextHint: "int16_t",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "uint16",
    leafCapability({
      key: "uint16",
      logicalKind: "unsigned-16-bit-integer",
      region: "blob",
      fixedByteWidth: 2,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "number",
        cppTypeTextHint: "uint16_t",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "int8",
    leafCapability({
      key: "int8",
      logicalKind: "signed-8-bit-integer",
      region: "blob",
      fixedByteWidth: 1,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "number",
        cppTypeTextHint: "int8_t",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "uint8",
    leafCapability({
      key: "uint8",
      logicalKind: "unsigned-8-bit-integer",
      region: "blob",
      fixedByteWidth: 1,
      mayConsumeTail: false,
      mayGroupSharedRegion: true,
      supportedPackings: ["byte-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "number",
        cppTypeTextHint: "uint8_t",
        requiresDecodeAllocation: false,
        ownership: "value"
      }
    })
  ],
  [
    "ArrayBuffer",
    leafCapability({
      key: "ArrayBuffer",
      logicalKind: "binary-buffer",
      region: "binary",
      fixedByteWidth: null,
      mayConsumeTail: true,
      mayGroupSharedRegion: true,
      supportedPackings: ["binary-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "ArrayBuffer",
        cppTypeTextHint: "QByteArray",
        requiresDecodeAllocation: true,
        ownership: "copied-buffer"
      }
    })
  ],
  [
    "Uint8Array",
    leafCapability({
      key: "Uint8Array",
      logicalKind: "uint8-array",
      region: "binary",
      fixedByteWidth: null,
      mayConsumeTail: true,
      mayGroupSharedRegion: true,
      supportedPackings: ["binary-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "Uint8Array",
        cppTypeTextHint: "QByteArray",
        requiresDecodeAllocation: true,
        ownership: "copied-buffer"
      }
    })
  ],
  [
    "Int8Array",
    leafCapability({
      key: "Int8Array",
      logicalKind: "int8-array",
      region: "binary",
      fixedByteWidth: null,
      mayConsumeTail: true,
      mayGroupSharedRegion: true,
      supportedPackings: ["binary-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "Int8Array",
        cppTypeTextHint: "QByteArray",
        requiresDecodeAllocation: true,
        ownership: "copied-buffer"
      }
    })
  ],
  [
    "Uint16Array",
    leafCapability({
      key: "Uint16Array",
      logicalKind: "uint16-array",
      region: "binary",
      fixedByteWidth: null,
      mayConsumeTail: true,
      mayGroupSharedRegion: true,
      supportedPackings: ["binary-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "Uint16Array",
        cppTypeTextHint: "QByteArray",
        requiresDecodeAllocation: true,
        ownership: "copied-buffer"
      }
    })
  ],
  [
    "Int16Array",
    leafCapability({
      key: "Int16Array",
      logicalKind: "int16-array",
      region: "binary",
      fixedByteWidth: null,
      mayConsumeTail: true,
      mayGroupSharedRegion: true,
      supportedPackings: ["binary-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "Int16Array",
        cppTypeTextHint: "QByteArray",
        requiresDecodeAllocation: true,
        ownership: "copied-buffer"
      }
    })
  ],
  [
    "Uint32Array",
    leafCapability({
      key: "Uint32Array",
      logicalKind: "uint32-array",
      region: "binary",
      fixedByteWidth: null,
      mayConsumeTail: true,
      mayGroupSharedRegion: true,
      supportedPackings: ["binary-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "Uint32Array",
        cppTypeTextHint: "QByteArray",
        requiresDecodeAllocation: true,
        ownership: "copied-buffer"
      }
    })
  ],
  [
    "Int32Array",
    leafCapability({
      key: "Int32Array",
      logicalKind: "int32-array",
      region: "binary",
      fixedByteWidth: null,
      mayConsumeTail: true,
      mayGroupSharedRegion: true,
      supportedPackings: ["binary-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "Int32Array",
        cppTypeTextHint: "QByteArray",
        requiresDecodeAllocation: true,
        ownership: "copied-buffer"
      }
    })
  ],
  [
    "Float32Array",
    leafCapability({
      key: "Float32Array",
      logicalKind: "float32-array",
      region: "binary",
      fixedByteWidth: null,
      mayConsumeTail: true,
      mayGroupSharedRegion: true,
      supportedPackings: ["binary-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "Float32Array",
        cppTypeTextHint: "QByteArray",
        requiresDecodeAllocation: true,
        ownership: "copied-buffer"
      }
    })
  ],
  [
    "Float64Array",
    leafCapability({
      key: "Float64Array",
      logicalKind: "float64-array",
      region: "binary",
      fixedByteWidth: null,
      mayConsumeTail: true,
      mayGroupSharedRegion: true,
      supportedPackings: ["binary-packed"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "Float64Array",
        cppTypeTextHint: "QByteArray",
        requiresDecodeAllocation: true,
        ownership: "copied-buffer"
      }
    })
  ],
  [
    "dynamic",
    leafCapability({
      key: "dynamic",
      logicalKind: "dynamic-json-object",
      region: "dynamic",
      fixedByteWidth: null,
      mayConsumeTail: true,
      mayGroupSharedRegion: true,
      supportedPackings: ["dynamic"],
      requiresCountMetadata: false,
      targetMaterialization: {
        tsTypeText: "object",
        cppTypeTextHint: "QVariantMap",
        requiresDecodeAllocation: true,
        ownership: "dynamic"
      }
    })
  ]
]);

function lookupLeafCapability(key: string): LeafCapabilityDescriptor | null {
  return LEAF_CAPABILITIES.get(key) ?? null;
}

export function resolveLeafCapability(rawText: string, name: string): LeafCapabilityDescriptor | null {
  const normalized = rawText.trim();
  if (normalized === "string" || normalized === "AnQst.Type.string") return lookupLeafCapability("string");
  if (normalized === "boolean") return lookupLeafCapability("boolean");
  if (normalized === "number" || normalized === "AnQst.Type.number") return lookupLeafCapability("number");
  if (normalized === "bigint" || normalized === "AnQst.Type.qint64") return lookupLeafCapability("qint64");
  if (normalized === "AnQst.Type.quint64") return lookupLeafCapability("quint64");
  if (normalized === "AnQst.Type.qint32") return lookupLeafCapability("qint32");
  if (normalized === "AnQst.Type.quint32") return lookupLeafCapability("quint32");
  if (normalized === "AnQst.Type.qint16") return lookupLeafCapability("qint16");
  if (normalized === "AnQst.Type.quint16") return lookupLeafCapability("quint16");
  if (normalized === "AnQst.Type.qint8") return lookupLeafCapability("qint8");
  if (normalized === "AnQst.Type.quint8") return lookupLeafCapability("quint8");
  if (normalized === "AnQst.Type.int32") return lookupLeafCapability("int32");
  if (normalized === "AnQst.Type.uint32") return lookupLeafCapability("uint32");
  if (normalized === "AnQst.Type.int16") return lookupLeafCapability("int16");
  if (normalized === "AnQst.Type.uint16") return lookupLeafCapability("uint16");
  if (normalized === "AnQst.Type.int8") return lookupLeafCapability("int8");
  if (normalized === "AnQst.Type.uint8") return lookupLeafCapability("uint8");
  if (normalized === "AnQst.Type.object" || normalized === "AnQst.Type.json" || normalized === "object") {
    return lookupLeafCapability("dynamic");
  }
  if (normalized === "AnQst.Type.buffer" || normalized === "AnQst.Type.blob" || normalized === "ArrayBuffer") {
    return lookupLeafCapability("ArrayBuffer");
  }
  if (normalized === "AnQst.Type.typedArray" || normalized === "Uint8Array") return lookupLeafCapability("Uint8Array");
  if (normalized === "AnQst.Type.uint8Array") return lookupLeafCapability("Uint8Array");
  if (normalized === "AnQst.Type.int8Array") return lookupLeafCapability("Int8Array");
  if (normalized === "AnQst.Type.uint16Array") return lookupLeafCapability("Uint16Array");
  if (normalized === "AnQst.Type.int16Array") return lookupLeafCapability("Int16Array");
  if (normalized === "AnQst.Type.uint32Array") return lookupLeafCapability("Uint32Array");
  if (normalized === "AnQst.Type.int32Array") return lookupLeafCapability("Int32Array");
  if (normalized === "AnQst.Type.float32Array" || normalized === "Float32Array") return lookupLeafCapability("Float32Array");
  if (normalized === "AnQst.Type.float64Array" || normalized === "Float64Array") return lookupLeafCapability("Float64Array");
  if (name === "Uint8Array") return lookupLeafCapability("Uint8Array");
  if (name === "Int8Array") return lookupLeafCapability("Int8Array");
  if (name === "Uint16Array") return lookupLeafCapability("Uint16Array");
  if (name === "Int16Array") return lookupLeafCapability("Int16Array");
  if (name === "Uint32Array") return lookupLeafCapability("Uint32Array");
  if (name === "Int32Array") return lookupLeafCapability("Int32Array");
  if (name === "Float32Array") return lookupLeafCapability("Float32Array");
  if (name === "Float64Array") return lookupLeafCapability("Float64Array");
  return null;
}
