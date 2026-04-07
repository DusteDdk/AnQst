/**
 * AnQst base-type codec emitter: AnQst.Type.json (dynamic JSON object).
 *
 * Wire: identical to AnQst.Type.object — a native JSON Object, pass-through for
 * JSON.stringify / JSON.parse. Distinct only in descriptor and C++ mapping (QJsonObject
 * and direct QJsonValue interop, no QVariantMap). See Dynamic_json_Codec.md.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter } from "../shared/contracts";

export const descriptor: BaseCodecDescriptor = {
  codecId: "AnQst.Type.json",
  specPath: "RefinedSpecs/Codecs/Dynamic_json_Codec.md",
  tsType: "object",
  cppType: "QJsonObject",
  wireCategory: "dynamic",
  strategySummary:
    "Pass-through JSON Object on the wire (same as object); C++ domain is QJsonObject with direct QJsonValue interop (encode wrap, decode toObject)."
};

function emitTsEncoderSource(functionName = "encodeDynamicJson"): string {
  const comment = emitStrategyComment("AnQst.Type.json — TypeScript encode (identity on wire payload)", [
    "Same wire behavior as AnQst.Type.object; distinct type metadata selects QJsonObject in generated C++.",
    "The domain object is emitted as-is; JSON.stringify supplies JSON Object syntax.",
    "Values must be JSON-serializable; non-JSON-native values fail at stringify time."
  ]);
  return `${comment}
function ${functionName}(value) {
  return value;
}`;
}

function emitCppEncoderSource(functionName = "encodeDynamicJsonToJsonValue"): string {
  const comment = emitStrategyComment("AnQst.Type.json — C++ encode (QJsonObject → QJsonValue)", [
    "QJsonObject is JSON-native in Qt; wrap directly for placement in QJsonValue — no QVariantMap hop.",
    "Use only for explicit AnQst.Type.json; requires Qt JSON types in the translation unit."
  ]);
  return `${comment}
inline QJsonValue ${functionName}(const QJsonObject& jsonObj) {
  return QJsonValue(jsonObj);
}`;
}

export const encoder: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder: () => emitTsEncoderSource(),
  emitCppEncoder: () => emitCppEncoderSource()
};
