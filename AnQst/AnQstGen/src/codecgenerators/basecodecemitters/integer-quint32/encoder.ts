/**
 * Base codec emitter (encode): AnQst.Type.quint32 ↔ TypeScript `number`, C++ `quint32`.
 * Standalone wire shape is one 5-character base93 string carrying exactly 4 bytes
 * from a Uint32Array host-native unsigned 32-bit representation.
 * See RefinedSpecs/Codecs/Integer_quint32_Codec.md.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter, FixedWidthScalarDescriptor } from "../shared/contracts";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const FIXED_WIDTH: FixedWidthScalarDescriptor = {
  byteWidth: 4,
  tsViewCtor: "Uint32Array",
  cppType: "quint32"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "integer-quint32",
  specPath: "RefinedSpecs/Codecs/Integer_quint32_Codec.md",
  tsType: "number",
  cppType: "quint32",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "Unsigned 32-bit scalar: materialize 4 host-native bytes via Uint32Array/quint32, then base93-encode them to a standalone 5-character string.",
  fixedWidth: FIXED_WIDTH
};

const strategyComment = emitStrategyComment("Base codec emitter (encode): AnQst.Type.quint32 / quint32", [
  "Uses Uint32Array[0] so TypeScript follows the quint32 prose for 4-byte unsigned materialization.",
  "Emits exactly 5 base93 characters for the standalone wire payload.",
  "C++ encoder memcpy-copies the quint32 bytes, matching the TypeScript wire byte-for-byte on the same host."
]);

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return `${strategyComment}\n\n${emitTsFixedWidthStandaloneEncoder("encodeQuint32Standalone", FIXED_WIDTH)}`;
  },
  emitCppEncoder(): string {
    return `${strategyComment}\n\n${emitCppFixedWidthStandaloneEncoder("encodeQuint32Standalone", FIXED_WIDTH)}`;
  }
};
