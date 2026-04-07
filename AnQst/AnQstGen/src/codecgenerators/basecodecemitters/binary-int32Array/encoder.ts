/**
 * Base codec emitter: `AnQst.Type.int32Array` encoder.
 * Emits the visible `Int32Array` view window as standalone raw-byte base93 while
 * preserving signed bit patterns and portable `QByteArray` interop on the C++ side.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter } from "../shared/contracts";

export const descriptor: BaseCodecDescriptor = {
  codecId: "binary-int32Array",
  specPath: "RefinedSpecs/Codecs/Binary_int32Array_Codec.md",
  tsType: "Int32Array",
  cppType: "QByteArray",
  wireCategory: "binary",
  strategySummary:
    "Base93-encode the raw bytes of the visible Int32Array view; decode reconstructs a concrete Int32Array, while C++ interoperates through the same QByteArray raw-byte payload."
};

const TS_FN = "encodeBinaryInt32ArrayStandalone";
const CPP_FN = "encodeBinaryInt32ArrayStandalone";

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return [
      emitStrategyComment("AnQst Int32Array encoder (raw-byte base93)", [
        "Encodes only the active Int32Array view window via byteOffset/byteLength so subviews do not leak adjacent backing-buffer bytes.",
        "Signed values are transported as their raw stored bytes with no reinterpretation, normalization, or byte swapping.",
        "Wire bytes remain portable because the C++ side consumes and emits the same QByteArray byte sequence."
      ]),
      `function ${TS_FN}(value) {`,
      "  const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);",
      "  return base93Encode(bytes);",
      "}"
    ].join("\n");
  },
  emitCppEncoder(): string {
    return [
      emitStrategyComment("AnQst Int32Array encoder (QByteArray raw bytes)", [
        "Host-side integration passes Int32Array storage as QByteArray so the byte transport stays identical across TypeScript and C++.",
        "No sign conversion or endianness adjustment is applied; the stored bytes are forwarded unchanged into base93.",
        "Uses an explicit copy so portable test shims only need QByteArray::constData() and QByteArray::size()."
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

export const encoder = encoderEmitter;
