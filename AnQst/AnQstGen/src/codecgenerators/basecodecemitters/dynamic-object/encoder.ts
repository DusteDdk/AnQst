/**
 * AnQst base-type codec emitter: AnQst.Type.object (dynamic object).
 *
 * Wire: the value is a native JSON object with no transformation — pass-through for
 * JSON.stringify / JSON.parse. This path applies only where the spec explicitly declares
 * AnQst.Type.object (or AnQst.Type.json for the sibling codec); it is never a fallback for
 * statically typed fields. Contents must be JSON-native (see Dynamic_object_Codec.md).
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter } from "../shared/contracts";

export const descriptor: BaseCodecDescriptor = {
  codecId: "AnQst.Type.object",
  specPath: "RefinedSpecs/Codecs/Dynamic_object_Codec.md",
  tsType: "object",
  cppType: "QVariantMap",
  wireCategory: "dynamic",
  strategySummary:
    "Pass-through JSON Object on the wire for explicitly dynamic AnQst.Type.object only; no base93, no flattening."
};

function emitTsEncoderSource(functionName = "encodeDynamicObject"): string {
  const comment = emitStrategyComment("AnQst.Type.object — TypeScript encode (identity on wire payload)", [
    "The domain object is emitted as-is; the surrounding codec / JSON.stringify supplies JSON Object syntax.",
    "Reserved for spec-declared dynamic object fields or standalone dynamic payloads — not for static struct shapes.",
    "Values must be JSON-serializable; non-JSON-native values fail at stringify time."
  ]);
  return `${comment}
function ${functionName}(value) {
  return value;
}`;
}

function emitCppEncoderSource(functionName = "encodeDynamicObjectToJsonObject"): string {
  const comment = emitStrategyComment("AnQst.Type.object — C++ encode (QVariantMap → QJsonObject)", [
    "Qt maps the domain QVariantMap to QJsonObject for JSON emission via QJsonObject::fromVariantMap.",
    "Use only for explicit AnQst.Type.object; requires Qt JSON types in the translation unit."
  ]);
  return `${comment}
inline QJsonObject ${functionName}(const QVariantMap& map) {
  return QJsonObject::fromVariantMap(map);
}`;
}

export const encoder: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder: () => emitTsEncoderSource(),
  emitCppEncoder: () => emitCppEncoderSource()
};
