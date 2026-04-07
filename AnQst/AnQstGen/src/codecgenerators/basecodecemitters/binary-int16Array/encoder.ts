/**
 * AnQstGen base-type codec emitter for `binary-int16Array`.
 * Wire form is one base93 string carrying the raw bytes of an `Int16Array` view.
 * The TypeScript path must respect `byteOffset`/`byteLength`; the C++ path keeps the spec-facing `QByteArray` signature.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter } from "../shared/contracts";

export const descriptor: BaseCodecDescriptor = {
  codecId: "binary-int16Array",
  specPath: "RefinedSpecs/Codecs/Binary_int16Array_Codec.md",
  tsType: "Int16Array",
  cppType: "QByteArray",
  wireCategory: "binary",
  strategySummary:
    "Base93-encode the raw bytes of the Int16Array view (respecting byteOffset/byteLength); C++ receives the same raw bytes in QByteArray."
};

const TS_FN = "encodeBinaryInt16ArrayStandalone";
const CPP_FN = "encodeBinaryInt16ArrayStandalone";

export const encoder: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return [
      emitStrategyComment("AnQst Int16Array encoder (raw-byte base93)", [
        "Reads only the concrete view window via byteOffset/byteLength, so subviews do not leak adjacent buffer bytes.",
        "Preserves platform-native two-byte element layout by forwarding the stored raw bytes unchanged into base93."
      ]),
      `function ${TS_FN}(value) {`,
      "  const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);",
      "  return base93Encode(bytes);",
      "}"
    ].join("\n");
  },
  emitCppEncoder(): string {
    return [
      emitStrategyComment("AnQst Int16Array encoder (QByteArray raw bytes)", [
        "Host-side integration passes the raw typed-array bytes as QByteArray; portable tests can provide a minimal QByteArray shim.",
        "No byte swapping is performed; the QByteArray contents are forwarded as-is into base93."
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
