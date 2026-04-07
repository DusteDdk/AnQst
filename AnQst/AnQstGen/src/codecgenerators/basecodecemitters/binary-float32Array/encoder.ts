/**
 * AnQstGen base-type codec emitter for `binary-float32Array`.
 * Wire form is one base93 string carrying the raw bytes of a `Float32Array` view.
 * The TypeScript path must respect `byteOffset`/`byteLength`; the C++ path keeps the spec-facing `QByteArray` signature.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter } from "../shared/contracts";

export const descriptor: BaseCodecDescriptor = {
  codecId: "binary-float32Array",
  specPath: "RefinedSpecs/Codecs/Binary_float32Array_Codec.md",
  tsType: "Float32Array",
  cppType: "QByteArray",
  wireCategory: "binary",
  strategySummary:
    "Base93-encode the raw bytes of the Float32Array view (respecting byteOffset/byteLength); C++ receives the same raw bytes in QByteArray."
};

const TS_FN = "encodeBinaryFloat32ArrayStandalone";
const CPP_FN = "encodeBinaryFloat32ArrayStandalone";

export const encoder: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return [
      emitStrategyComment("AnQst Float32Array encoder (raw-byte base93)", [
        "Reads only the concrete view window via byteOffset/byteLength, so subviews do not leak adjacent buffer bytes.",
        "Preserves the stored IEEE 754 binary32 bit patterns exactly, including NaN payloads, infinities, and signed zero."
      ]),
      `function ${TS_FN}(value) {`,
      "  const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);",
      "  return base93Encode(bytes);",
      "}"
    ].join("\n");
  },
  emitCppEncoder(): string {
    return [
      emitStrategyComment("AnQst Float32Array encoder (QByteArray raw bytes)", [
        "Host-side integration passes the raw float32 bytes as QByteArray; portable tests can provide a minimal QByteArray shim.",
        "No byte swapping or float normalization is performed; the QByteArray contents are forwarded as-is into base93."
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
