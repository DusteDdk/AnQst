/**
 * Base codec emitter: `AnQst.Type.typedArray` encoder.
 * Emits the active TypedArray view window as standalone base93 raw bytes.
 * The wire bytes match `buffer`; only the TypeScript domain type is a typed-array view.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter } from "../shared/contracts";
import { emitCppRawByteStandaloneEncoder, emitTsRawByteStandaloneEncoder } from "../shared/rawbytes";

export const descriptor: BaseCodecDescriptor = {
  codecId: "binary-typedArray",
  specPath: "RefinedSpecs/Codecs/Binary_typedArray_Codec.md",
  tsType: "TypedArray",
  cppType: "QByteArray",
  wireCategory: "binary",
  strategySummary:
    "Encode the raw bytes of the active TypedArray view as standalone base93, preserving byteOffset/byteLength; decode requires a concrete typed-array constructor."
};

const TS_FN = "encodeBinaryTypedArrayStandalone";
const CPP_FN = "encodeBinaryTypedArrayStandalone";

const strategyComment = emitStrategyComment("Base codec emitter (encode): AnQst.Type.typedArray / QByteArray", [
  "Wraps the incoming TypedArray view as Uint8Array(value.buffer, value.byteOffset, value.byteLength) so only the visible bytes are emitted.",
  "Wire format is identical to the buffer codec: one standalone base93 string carrying raw bytes.",
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
