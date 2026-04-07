/**
 * Base codec emitter: `AnQst.Type.int32Array` decoder.
 * Decodes one raw-byte base93 string back into a concrete `Int32Array`, preserving
 * the exact transmitted byte sequence and rejecting byte counts that cannot form 32-bit elements.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { descriptor } from "./encoder";

const TS_FN = "decodeBinaryInt32ArrayStandalone";
const CPP_FN = "decodeBinaryInt32ArrayStandalone";

export { descriptor };

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return [
      emitStrategyComment("AnQst Int32Array decoder (raw-byte base93)", [
        "Base93-decodes the standalone wire payload back to raw bytes and reconstructs a concrete Int32Array.",
        "Decoded byte counts must be divisible by 4 because each Int32Array element occupies exactly 4 bytes.",
        "Slices the decoded byte window before constructing Int32Array so reconstruction is robust even if the decoded Uint8Array is not offset-zero."
      ]),
      `function ${TS_FN}(encoded) {`,
      "  const bytes = base93Decode(encoded);",
      "  if ((bytes.byteLength & 3) !== 0) {",
      "    throw new RangeError(\"Decoded Int32Array byte length must be divisible by 4.\");",
      "  }",
      "  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);",
      "  return new Int32Array(buffer);",
      "}"
    ].join("\n");
  },
  emitCppDecoder(): string {
    return [
      emitStrategyComment("AnQst Int32Array decoder (QByteArray raw bytes)", [
        "C++ receives the same raw 32-bit element storage bytes as QByteArray; typed interpretation remains outside this byte-transport helper.",
        "Portable interop tests can use a lightweight QByteArray shim with a (const char*, int) constructor.",
        "No sign conversion or byte swapping occurs during wire decode; the original raw bytes are restored exactly."
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

export const decoder = decoderEmitter;
