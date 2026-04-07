/**
 * AnQstGen base-type codec emitter for `AnQst.Type.string`.
 * Wire form is a native JSON string (no base93). See RefinedSpecs/Codecs/String_string_Codec.md.
 * Integration codegen maps the C++ domain type to QString / QJsonValue; standalone C++ snippets here use std::string so unit tests compile without Qt.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter } from "../shared/contracts";

export const descriptor: BaseCodecDescriptor = {
  codecId: "string",
  specPath: "RefinedSpecs/Codecs/String_string_Codec.md",
  tsType: "string",
  cppType: "QString",
  wireCategory: "string",
  strategySummary: "Native JSON string; leaf identity encode/decode; no base93."
};

const TS_FN = "encodeAnqstBase_string";
const CPP_FN = "encodeAnqstBase_string";

export const encoder: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return [
      emitStrategyComment("AnQst string encoder (identity)", [
        "Emits the domain string unchanged for placement in JSON (native string on the wire).",
        "No base93; JSON serializers handle escaping of quotes, backslashes, and controls."
      ]),
      `function ${TS_FN}(value) {`,
      "  return value;",
      "}"
    ].join("\n");
  },
  emitCppEncoder(): string {
    return [
      emitStrategyComment("AnQst string encoder (identity, portable stub)", [
        "QString / QJsonValue(value) at widget integration; std::string here for generator tests without Qt."
      ]),
      `inline std::string ${CPP_FN}(const std::string& value) {`,
      "  return value;",
      "}"
    ].join("\n");
  }
};
