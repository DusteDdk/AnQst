/**
 * Base codec emitter (encode): AnQst.Type.quint8 ↔ TypeScript `number`, C++ `quint8`.
 * Standalone wire shape is one 2-character base93 string carrying exactly 1 byte.
 * See RefinedSpecs/Codecs/Integer_quint8_Codec.md.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter, FixedWidthScalarDescriptor } from "../shared/contracts";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const FIXED_WIDTH: FixedWidthScalarDescriptor = {
  byteWidth: 1,
  tsViewCtor: "Uint8Array",
  cppType: "quint8"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "integer-quint8",
  specPath: "RefinedSpecs/Codecs/Integer_quint8_Codec.md",
  tsType: "number",
  cppType: "quint8",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "Unsigned 8-bit scalar: write the low 8 bits via Uint8Array/quint8, then base93-encode the single byte to a 2-character standalone string.",
  fixedWidth: FIXED_WIDTH
};

const strategyComment = emitStrategyComment("Base codec emitter (encode): AnQst.Type.quint8 / quint8", [
  "Uses Uint8Array[0] so TypeScript follows the quint8 prose for 1-byte unsigned truncation/wrapping.",
  "Emits exactly 2 base93 characters for the standalone wire payload.",
  "C++ encoder memcpy-copies the single quint8 byte, matching the TypeScript wire byte-for-byte."
]);

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return `${strategyComment}\n\n${emitTsFixedWidthStandaloneEncoder("encodeQuint8Standalone", FIXED_WIDTH)}`;
  },
  emitCppEncoder(): string {
    return `${strategyComment}\n\n${emitCppFixedWidthStandaloneEncoder("encodeQuint8Standalone", FIXED_WIDTH)}`;
  }
};
