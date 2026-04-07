/**
 * AnQst base-type codec emitter: AnQst.Type.json (dynamic JSON object).
 *
 * Wire: parsed JSON Object is the domain value — identity decode, same as AnQst.Type.object
 * on the TS side. C++ decode maps QJsonValue → QJsonObject via toObject() without QVariantMap.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecDecoderEmitter } from "../shared/contracts";

export const descriptor: BaseCodecDescriptor = {
  codecId: "AnQst.Type.json",
  specPath: "RefinedSpecs/Codecs/Dynamic_json_Codec.md",
  tsType: "object",
  cppType: "QJsonObject",
  wireCategory: "dynamic",
  strategySummary:
    "Pass-through JSON Object on the wire (same as object); C++ domain is QJsonObject with direct QJsonValue interop (encode wrap, decode toObject)."
};

function emitTsDecoderSource(functionName = "decodeDynamicJson"): string {
  const comment = emitStrategyComment("AnQst.Type.json — TypeScript decode (identity)", [
    "The JSON Object from the wire is the domain value; no per-field transform.",
    "Applies where the spec names AnQst.Type.json; wire shape matches AnQst.Type.object."
  ]);
  return `${comment}
function ${functionName}(wire) {
  return wire;
}`;
}

function emitCppDecoderSource(functionName = "decodeDynamicJsonFromJsonValue"): string {
  const comment = emitStrategyComment("AnQst.Type.json — C++ decode (QJsonValue → QJsonObject)", [
    "Direct toObject() into QJsonObject — contrast AnQst.Type.object QVariantMap decode path.",
    "Thin QJsonObject-oriented helper; Qt headers required to compile."
  ]);
  return `${comment}
inline QJsonObject ${functionName}(const QJsonValue& value) {
  return value.toObject();
}`;
}

export const decoder: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder: () => emitTsDecoderSource(),
  emitCppDecoder: () => emitCppDecoderSource()
};
