/**
 * AnQstGen base-type codec emitter for `AnQst.Type.string`.
 * Decoder is leaf identity: the JSON string value is the domain string. See RefinedSpecs/Codecs/String_string_Codec.md.
 * C++ integration uses QVariant::toString() / QJsonValue::toString(); portable stubs below use std::string for tests without Qt.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecDecoderEmitter } from "../shared/contracts";

export const descriptor: BaseCodecDescriptor = {
  codecId: "string",
  specPath: "RefinedSpecs/Codecs/String_string_Codec.md",
  tsType: "string",
  cppType: "QString",
  wireCategory: "string",
  strategySummary: "Native JSON string; leaf identity encode/decode; no base93."
};

const TS_FN = "decodeAnqstBase_string";
const CPP_FN = "decodeAnqstBase_string";

export const decoder: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return [
      emitStrategyComment("AnQst string decoder (identity)", [
        "Interprets the wire JSON string as the domain value; no transform.",
        "No base93 decode path for string positions."
      ]),
      `function ${TS_FN}(wire) {`,
      "  return wire;",
      "}"
    ].join("\n");
  },
  emitCppDecoder(): string {
    return [
      emitStrategyComment("AnQst string decoder (identity, portable stub)", [
        "QString via QJsonValue::toString() at integration; std::string passthrough here for generator tests without Qt."
      ]),
      `inline std::string ${CPP_FN}(const std::string& wire) {`,
      "  return wire;",
      "}"
    ].join("\n");
  }
};
