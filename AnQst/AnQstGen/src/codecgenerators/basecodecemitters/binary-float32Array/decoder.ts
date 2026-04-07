/**
 * AnQstGen base-type codec emitter for `binary-float32Array`.
 * Decoder consumes one base93 string of raw bytes and reconstructs a concrete `Float32Array`.
 * Multi-byte element byte order and all IEEE 754 bit patterns are preserved exactly as transmitted.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { descriptor } from "./encoder";

const TS_FN = "decodeBinaryFloat32ArrayStandalone";
const CPP_FN = "decodeBinaryFloat32ArrayStandalone";

export { descriptor };

export const decoder: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return [
      emitStrategyComment("AnQst Float32Array decoder (raw-byte base93)", [
        "Decodes base93 to bytes, then constructs a concrete Float32Array view over the decoded buffer.",
        "Rejected decoded byte counts not divisible by 4 indicate corrupted wire data because Float32Array elements require 4 bytes each."
      ]),
      `function ${TS_FN}(encoded) {`,
      "  const bytes = base93Decode(encoded);",
      "  if ((bytes.byteLength & 3) !== 0) {",
      "    throw new RangeError(\"Decoded Float32Array byte length must be divisible by 4.\");",
      "  }",
      "  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);",
      "}"
    ].join("\n");
  },
  emitCppDecoder(): string {
    return [
      emitStrategyComment("AnQst Float32Array decoder (QByteArray raw bytes)", [
        "C++ receives the raw bytes as QByteArray; float interpretation stays outside the byte-transport codec.",
        "Portable tests may supply a lightweight QByteArray shim with a (const char*, int) constructor."
      ]),
      `inline QByteArray ${CPP_FN}(const std::string& encoded) {`,
      "  const std::vector<std::uint8_t> bytes = base93Decode(encoded);",
      "  return QByteArray(",
      "    reinterpret_cast<const char*>(bytes.data()),",
      "    static_cast<int>(bytes.size())",
      "  );",
      "}"
    ].join("\n");
  }
};
