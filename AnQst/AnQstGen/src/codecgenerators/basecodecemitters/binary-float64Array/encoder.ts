/**
 * AnQstGen base-type codec emitter for `binary-float64Array`.
 * Wire form is one base93 string carrying the raw bytes of a `Float64Array` view.
 * The TypeScript path must respect `byteOffset`/`byteLength`; the C++ path keeps the spec-facing `QByteArray` signature.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter } from "../shared/contracts";
import { emitTsRawByteStandaloneEncoder } from "../shared/rawbytes";

export const descriptor: BaseCodecDescriptor = {
  codecId: "binary-float64Array",
  specPath: "RefinedSpecs/Codecs/Binary_float64Array_Codec.md",
  tsType: "Float64Array",
  cppType: "QByteArray",
  wireCategory: "binary",
  strategySummary:
    "Base93-encode the raw bytes of the Float64Array view (respecting byteOffset/byteLength); C++ receives the same raw bytes in QByteArray."
};

const TS_FN = "encodeBinaryFloat64ArrayStandalone";
const CPP_FN = "encodeBinaryFloat64ArrayStandalone";

export const encoder: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return [
      emitStrategyComment("AnQst Float64Array encoder (raw-byte base93)", [
        "Reads only the active Float64Array view window via byteOffset/byteLength, so subviews do not leak adjacent buffer bytes.",
        "Preserves the stored IEEE 754 binary64 bytes exactly, including NaN payloads, infinities, signed zero, and subnormals."
      ]),
      emitTsRawByteStandaloneEncoder(TS_FN, "new Uint8Array(value.buffer, value.byteOffset, value.byteLength)")
    ].join("\n\n");
  },
  emitCppEncoder(): string {
    return [
      emitStrategyComment("AnQst Float64Array encoder (QByteArray raw bytes)", [
        "Host-side integration passes the Float64Array payload as QByteArray because the backend mapping is raw bytes, not a numeric container.",
        "No byte swapping or normalization is performed; the QByteArray contents are forwarded as-is into base93."
      ]),
      `inline std::string ${CPP_FN}(const QByteArray& value) {`,
      "  std::vector<std::uint8_t> bytes(static_cast<std::size_t>(value.size()));",
      "  if (!bytes.empty()) {",
      "    std::memcpy(bytes.data(), value.constData(), bytes.size());",
      "  }",
      "  return base93Encode(bytes);",
      "}"
    ].join("\n");
  }
};
