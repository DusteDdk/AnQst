/**
 * Boolean wire codec (encoder side)
 *
 * Strategy:
 * - Map `false`/`true` to the raw JSON-safe strings `"0"` / `"1"`.
 * - Avoid byte packing and base93 overhead for a two-state value that already fits in one character.
 * - Emitted helpers produce wire strings directly.
 */

import type { BaseCodecDescriptor, BaseCodecEncoderEmitter } from "../shared/contracts";

const TS_ENCODE_FN = "encodeBoolean";
const CPP_ENCODE_FN = "encodeBoolean";

export const descriptor: BaseCodecDescriptor = {
  codecId: "boolean",
  specPath: "RefinedSpecs/Codecs/Boolean_boolean_Codec.md",
  tsType: "boolean",
  cppType: "bool",
  wireCategory: "string",
  strategySummary:
    'Single-character wire strings "0"/"1" for false/true; not JSON boolean; no bit packing.'
};

function emitTsEncoderSource(): string {
  return `function ${TS_ENCODE_FN}(value) {
  return value ? "1" : "0";
}`;
}

function emitCppEncoderSource(): string {
  return `inline std::string ${CPP_ENCODE_FN}(bool value) {
  return value ? "1" : "0";
}`;
}

export const encoder: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return emitTsEncoderSource();
  },
  emitCppEncoder(): string {
    return emitCppEncoderSource();
  }
};
