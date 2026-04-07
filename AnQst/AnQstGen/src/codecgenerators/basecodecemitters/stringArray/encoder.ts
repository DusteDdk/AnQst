/**
 * Base codec emitter: AnQst.Type.stringArray — TypeScript/C++ encoder (string[] / QStringList → standalone wire).
 *
 * Standalone: positional base93 element count as the first emission item, then native JSON string elements.
 * Empty array: the count alone is emitted as a single string (best-case emission).
 * Non-empty: a flat JSON array [count, ...elements] (length N+1 ≥ 2).
 *
 * Composite (structured top-level codec): string elements merge into the shared flat string collection; the
 * element count is stored as fixed-width unsigned metadata (e.g. uint32) inside the byte blob, not as a
 * separate base93 count string. See Structured_TopLevelCodec_Strategy.md §3.2 and String_stringArray_Codec.md §5.
 */

import type { BaseCodecDescriptor, BaseCodecEncoderEmitter } from "../shared/contracts";

export const descriptor: BaseCodecDescriptor = {
  codecId: "stringArray",
  specPath: "RefinedSpecs/Codecs/String_stringArray_Codec.md",
  tsType: "string[]",
  cppType: "QStringList",
  wireCategory: "string-array",
  strategySummary:
    "Standalone: prepend positional base93 count string, then emit each element as a native JSON string; empty → single count string. Composite: count in byte blob as fixed-width uint; elements in shared string collection (orchestrated by structured layer)."
};

const TS_FN = "encodeStringArrayStandalone";
const CPP_FN = "encodeStringArrayStandalone";

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return `function ${TS_FN}(value) {
  var n = value.length;
  var countStr = encodeBase93Count(n);
  if (n === 0) {
    return countStr;
  }
  var out = new Array(n + 1);
  out[0] = countStr;
  for (var i = 0; i < n; i++) {
    out[i + 1] = value[i];
  }
  return out;
}`;
  },
  emitCppEncoder(): string {
    return `inline QJsonValue ${CPP_FN}(const QStringList& value) {
  const std::uint32_t n = static_cast<std::uint32_t>(value.size());
  const QString countStr = QString::fromStdString(encodeBase93Count(n));
  if (n == 0u) {
    return QJsonValue(countStr);
  }
  QJsonArray arr;
  arr.append(countStr);
  for (const QString& s : value) {
    arr.append(QJsonValue(s));
  }
  return QJsonValue(arr);
}`;
  }
};
