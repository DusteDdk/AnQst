/**
 * Base codec emitter (encode): AnQst.Type.quint16 ↔ TypeScript `number`, C++ `quint16`.
 * Standalone wire shape is one 3-character base93 string carrying exactly 2 raw bytes.
 * See RefinedSpecs/Codecs/Integer_quint16_Codec.md.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter, FixedWidthScalarDescriptor } from "../shared/contracts";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const FIXED_WIDTH: FixedWidthScalarDescriptor = {
  byteWidth: 2,
  tsViewCtor: "Uint16Array",
  cppType: "quint16"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "integer-quint16",
  specPath: "RefinedSpecs/Codecs/Integer_quint16_Codec.md",
  tsType: "number",
  cppType: "quint16",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "Unsigned 16-bit scalar: write the platform-native 2-byte Uint16Array/quint16 representation, then base93-encode it to a 3-character standalone string.",
  fixedWidth: FIXED_WIDTH
};

const strategyComment = emitStrategyComment("Base codec emitter (encode): AnQst.Type.quint16 / quint16", [
  "Uses Uint16Array[0] so TypeScript follows the quint16 prose for the host-native 2-byte unsigned representation.",
  "Emits exactly 3 base93 characters for the standalone wire payload because 2 raw bytes are encoded directly.",
  "C++ encoder memcpy-copies the same 2 bytes from quint16, preserving portable interop at the byte level."
]);

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return `${strategyComment}\n\n${emitTsFixedWidthStandaloneEncoder("encodeQuint16Standalone", FIXED_WIDTH)}`;
  },
  emitCppEncoder(): string {
    return `${strategyComment}\n\n${emitCppFixedWidthStandaloneEncoder("encodeQuint16Standalone", FIXED_WIDTH)}`;
  }
};
