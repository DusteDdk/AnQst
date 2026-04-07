/**
 * AnQst base-type codec emitter: AnQst.Type.object (dynamic object).
 *
 * Wire: parsed JSON Object is the domain value — identity decode. Same scope rules as the
 * encoder: only for explicitly declared dynamic object types in the spec, never as a generic
 * fallback for unknown static shapes.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecDecoderEmitter } from "../shared/contracts";

export const descriptor: BaseCodecDescriptor = {
  codecId: "AnQst.Type.object",
  specPath: "RefinedSpecs/Codecs/Dynamic_object_Codec.md",
  tsType: "object",
  cppType: "QVariantMap",
  wireCategory: "dynamic",
  strategySummary:
    "Pass-through JSON Object on the wire for explicitly dynamic AnQst.Type.object only; no base93, no flattening."
};

function emitTsDecoderSource(functionName = "decodeDynamicObject"): string {
  const comment = emitStrategyComment("AnQst.Type.object — TypeScript decode (identity)", [
    "The JSON Object already parsed from the wire is the domain value; no per-field transform.",
    "Applies only where the spec names AnQst.Type.object as the field or root type."
  ]);
  return `${comment}
function ${functionName}(value) {
  return value;
}`;
}

function emitCppDecoderSource(functionName = "decodeDynamicObjectFromJsonObject"): string {
  const comment = emitStrategyComment("AnQst.Type.object — C++ decode (QJsonObject → QVariantMap)", [
    "Caller obtains QJsonObject from QJsonValue::toObject(); this helper maps to QVariantMap.",
    "Thin QVariantMap-oriented helper; Qt headers required to compile."
  ]);
  return `${comment}
inline QVariantMap ${functionName}(const QJsonObject& obj) {
  return obj.toVariantMap();
}`;
}

export const decoder: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder: () => emitTsDecoderSource(),
  emitCppDecoder: () => emitCppDecoderSource()
};
