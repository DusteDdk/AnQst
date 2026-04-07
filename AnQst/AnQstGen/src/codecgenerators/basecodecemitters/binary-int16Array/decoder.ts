/**
 * AnQstGen base-type codec emitter for `binary-int16Array`.
 * Decoder consumes one base93 string of raw bytes and reconstructs a concrete `Int16Array`.
 * Multi-byte element byte order is preserved exactly as transmitted; no byte swapping is introduced.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { descriptor } from "./encoder";

const TS_FN = "decodeBinaryInt16ArrayStandalone";
const CPP_FN = "decodeBinaryInt16ArrayStandalone";

export { descriptor };

export const decoder: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return [
      emitStrategyComment("AnQst Int16Array decoder (raw-byte base93)", [
        "Decodes base93 to bytes, then reconstructs a concrete Int16Array over the decoded buffer.",
        "Rejected odd decoded byte counts indicate corrupted wire data because Int16Array elements require 2 bytes each."
      ]),
      `function ${TS_FN}(encoded) {`,
      "  const bytes = base93Decode(encoded);",
      "  if ((bytes.byteLength & 1) !== 0) {",
      "    throw new RangeError(\"Decoded Int16Array byte length must be divisible by 2.\");",
      "  }",
      "  return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);",
      "}"
    ].join("\n");
  },
  emitCppDecoder(): string {
    return [
      emitStrategyComment("AnQst Int16Array decoder (QByteArray raw bytes)", [
        "C++ receives the raw bytes as QByteArray; signed 16-bit interpretation stays outside the byte-transport codec.",
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
