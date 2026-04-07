/**
 * Base codec emitter: AnQst.Type.stringArray — TypeScript/C++ decoder (standalone wire → string[] / QStringList).
 *
 * Standalone: if the payload is a string, it must decode to count 0 (empty array). If it is an array, the first
 * element is the positional base93 count; the next count elements are the string values.
 *
 * Composite decoding is performed by the structured top-level codec: it reads the array length from blob
 * metadata, then consumes that many consecutive strings from the flat collection (String_stringArray_Codec.md §5).
 */

import type { BaseCodecDescriptor, BaseCodecDecoderEmitter } from "../shared/contracts";

export const descriptor: BaseCodecDescriptor = {
  codecId: "stringArray",
  specPath: "RefinedSpecs/Codecs/String_stringArray_Codec.md",
  tsType: "string[]",
  cppType: "QStringList",
  wireCategory: "string-array",
  strategySummary:
    "Standalone: decode first item as positional base93 count, then read that many native strings; string-only payload implies count 0. Composite: length from byte blob; strings from shared collection (structured layer)."
};

const TS_FN = "decodeStringArrayStandalone";
const CPP_FN = "decodeStringArrayStandalone";

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return `function ${TS_FN}(payload) {
  if (typeof payload === "string") {
    var n0 = decodeBase93Count(payload);
    if (n0 !== 0) {
      throw new Error("stringArray standalone: string payload must encode count 0");
    }
    return [];
  }
  if (!Array.isArray(payload)) {
    throw new Error("stringArray standalone: expected JSON string or array");
  }
  if (payload.length < 2) {
    throw new Error("stringArray standalone: array payload too short");
  }
  var n = decodeBase93Count(String(payload[0]));
  if (payload.length !== n + 1) {
    throw new Error("stringArray standalone: count does not match array tail");
  }
  var out = new Array(n);
  for (var i = 0; i < n; i++) {
    var el = payload[i + 1];
    out[i] = el == null ? "" : String(el);
  }
  return out;
}`;
  },
  emitCppDecoder(): string {
    return `inline QStringList ${CPP_FN}(const QJsonValue& payload) {
  if (payload.isString()) {
    const std::uint32_t n = decodeBase93Count(payload.toString().toStdString());
    if (n != 0u) {
      throw std::runtime_error("stringArray standalone: string payload must encode count 0");
    }
    return QStringList();
  }
  if (!payload.isArray()) {
    throw std::runtime_error("stringArray standalone: expected JSON string or array");
  }
  const QJsonArray arr = payload.toArray();
  if (arr.size() < 2) {
    throw std::runtime_error("stringArray standalone: array payload too short");
  }
  const std::uint32_t n = decodeBase93Count(arr.at(0).toString().toStdString());
  if (arr.size() != static_cast<int>(n) + 1) {
    throw std::runtime_error("stringArray standalone: count does not match array tail");
  }
  QStringList out;
  out.reserve(static_cast<int>(n));
  for (std::uint32_t i = 0; i < n; ++i) {
    out.append(arr.at(static_cast<int>(i + 1)).toString());
  }
  return out;
}`;
  }
};
