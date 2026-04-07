/**
 * Base codec emitter: `AnQst.Type.int16` standalone encoder.
 *
 * This codec is wire-identical to `AnQst.Type.qint16`: it writes the signed
 * 16-bit two's complement value through `Int16Array`, then base93-encodes the
 * resulting 2 native-order bytes as a 3-character standalone string. The
 * descriptor stays distinct so generated C++ uses standard `int16_t`.
 */

import type {
  BaseCodecDescriptor,
  BaseCodecEncoderEmitter,
  FixedWidthScalarDescriptor
} from "../shared/contracts";
import { emitStrategyComment } from "../shared/comments";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const FIXED_WIDTH: FixedWidthScalarDescriptor = {
  byteWidth: 2,
  tsViewCtor: "Int16Array",
  cppType: "int16_t"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "integer-int16",
  specPath: "RefinedSpecs/Codecs/Integer_int16_Codec.md",
  tsType: "number",
  cppType: "int16_t",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "Wire-identical to qint16: serialize signed 16-bit two's complement via Int16Array / int16_t, then base93-encode the 2-byte standalone payload to 3 characters.",
  fixedWidth: FIXED_WIDTH
};

const TS_FN = "encodeInt16Standalone";
const CPP_FN = "encodeInt16Standalone";

const STRATEGY_COMMENT = emitStrategyComment("Base codec emitter (encode): AnQst.Type.int16 / int16_t", [
  "Wire-identical to qint16: TypeScript writes the signed 16-bit payload through Int16Array.",
  "Standalone payload width is fixed at 2 bytes, which base93 encodes to exactly 3 characters.",
  "C++ mirrors the same native-order bytes with memcpy into int16_t rather than Qt's qint16 typedef."
]);

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return `${STRATEGY_COMMENT}\n\n${emitTsFixedWidthStandaloneEncoder(TS_FN, FIXED_WIDTH)}`;
  },
  emitCppEncoder(): string {
    return `${STRATEGY_COMMENT}\n\n${emitCppFixedWidthStandaloneEncoder(CPP_FN, FIXED_WIDTH)}`;
  }
};
