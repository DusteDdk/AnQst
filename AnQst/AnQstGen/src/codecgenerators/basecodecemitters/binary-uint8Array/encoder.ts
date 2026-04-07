/**
 * Base codec emitter: `AnQst.Type.uint8Array` encoder.
 * Emits standalone raw-byte base93 for concrete `Uint8Array` values and mirrors the
 * same wire contract as `AnQst.Type.buffer`, but keeps the TypeScript domain type concrete.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter } from "../shared/contracts";
import { emitCppRawByteStandaloneEncoder, emitTsRawByteStandaloneEncoder } from "../shared/rawbytes";

export const descriptor: BaseCodecDescriptor = {
  codecId: "binary-uint8Array",
  specPath: "RefinedSpecs/Codecs/Binary_uint8Array_Codec.md",
  tsType: "Uint8Array",
  cppType: "QByteArray",
  wireCategory: "binary",
  strategySummary:
    "Encode the concrete Uint8Array byte view as standalone base93 raw bytes; preserves offset views by encoding only the visible window."
};

const TS_FN = "encodeBinaryUint8ArrayStandalone";
const CPP_FN = "encodeBinaryUint8ArrayStandalone";

const strategyComment = emitStrategyComment("Base codec emitter (encode): AnQst.Type.uint8Array / QByteArray", [
  "Standalone wire is the standard raw-byte base93 string used for AnQst binary codecs.",
  "TypeScript re-wraps the incoming Uint8Array with its byteOffset/byteLength so subarray views encode only the visible bytes.",
  "C++ treats QByteArray as an opaque byte buffer and copies its bytes into the shared base93 encoder."
]);

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return `${strategyComment}\n\n${emitTsRawByteStandaloneEncoder(
      TS_FN,
      "new Uint8Array(value.buffer, value.byteOffset, value.byteLength)"
    )}`;
  },
  emitCppEncoder(): string {
    return `${strategyComment}\n\n${emitCppRawByteStandaloneEncoder(
      CPP_FN,
      "std::vector<std::uint8_t>(reinterpret_cast<const std::uint8_t*>(value.constData()), reinterpret_cast<const std::uint8_t*>(value.constData()) + static_cast<std::size_t>(value.size()))"
    )}`;
  }
};
