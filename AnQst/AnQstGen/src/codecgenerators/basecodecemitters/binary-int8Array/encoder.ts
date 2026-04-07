/**
 * Base codec emitter (encode): AnQst.Type.int8Array ↔ TypeScript `Int8Array`, C++ `QByteArray`.
 * Serializes the raw bytes of the Int8Array view with base93, preserving byteOffset/byteLength.
 * Wire format matches the buffer and typedArray binary codecs; only the TS view type differs.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter } from "../shared/contracts";

export const descriptor: BaseCodecDescriptor = {
  codecId: "AnQst.Type.int8Array",
  specPath: "RefinedSpecs/Codecs/Binary_int8Array_Codec.md",
  tsType: "Int8Array",
  cppType: "QByteArray",
  wireCategory: "binary",
  strategySummary:
    "Serialize the raw bytes of the Int8Array view as base93, respecting byteOffset/byteLength and preserving signed byte bit patterns."
};

const strategyComment = emitStrategyComment("Base codec emitter (encode): AnQst.Type.int8Array / QByteArray", [
  "Views Int8Array as Uint8Array over the same buffer slice so only the active view bytes are emitted.",
  "Uses the shared base93 binary transport contract; signed byte interpretation is irrelevant on the wire.",
  "C++ side mirrors this as raw QByteArray bytes encoded with the same base93 algorithm."
]);

export const binaryInt8ArrayEncoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return `${strategyComment}

function encodeAnQstBinaryInt8Array(value) {
  const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return base93Encode(bytes);
}`;
  },
  emitCppEncoder(): string {
    return `${strategyComment}

inline std::string encodeAnQstBinaryInt8Array(const QByteArray& value) {
  const auto* begin = reinterpret_cast<const std::uint8_t*>(value.constData());
  return base93Encode(std::vector<std::uint8_t>(
    begin,
    begin + static_cast<std::size_t>(value.size())
  ));
}`;
  }
};
