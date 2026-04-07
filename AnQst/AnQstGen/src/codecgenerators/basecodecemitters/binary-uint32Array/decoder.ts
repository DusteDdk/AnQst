/**
 * AnQstGen base-type codec emitter for `binary-uint32Array`.
 * Decoder consumes one base93 string of raw bytes and reconstructs a concrete `Uint32Array`.
 * Multi-byte element byte order is preserved exactly as transmitted; no byte swapping is introduced.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { descriptor } from "./encoder";

const TS_FN = "decodeBinaryUint32ArrayStandalone";
const CPP_FN = "decodeBinaryUint32ArrayStandalone";

export { descriptor };

export const decoder: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return [
      emitStrategyComment("AnQst Uint32Array decoder (raw-byte base93)", [
        "Decodes base93 to bytes, then constructs a concrete Uint32Array over the decoded buffer.",
        "Rejected non-multiple-of-4 decoded byte counts indicate corrupted wire data because Uint32Array elements require 4 bytes each."
      ]),
      `function ${TS_FN}(encoded) {`,
      "  const bytes = base93Decode(encoded);",
      "  if ((bytes.byteLength & 3) !== 0) {",
      '    throw new RangeError("Decoded Uint32Array byte length must be divisible by 4.");',
      "  }",
      "  return new Uint32Array(bytes.buffer);",
      "}"
    ].join("\n");
  },
  emitCppDecoder(): string {
    return [
      emitStrategyComment("AnQst Uint32Array decoder (QByteArray raw bytes)", [
        "C++ receives the raw bytes as QByteArray; element interpretation stays outside the byte-transport codec.",
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
