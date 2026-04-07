/**
 * Base codec emitter: `AnQst.Type.int8` standalone encoder.
 *
 * Wire behavior is intentionally identical to `AnQst.Type.qint8`: serialize one
 * signed 8-bit two's complement byte via `Int8Array`, then base93-encode that
 * single byte into a 2-character standalone string. The distinction lives only
 * in descriptor identity and C++ mapping: this codec targets standard `int8_t`.
 */

import type {
  BaseCodecDescriptor,
  BaseCodecEncoderEmitter,
  FixedWidthScalarDescriptor
} from "../shared/contracts";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const fixedWidth: FixedWidthScalarDescriptor = {
  byteWidth: 1,
  tsViewCtor: "Int8Array",
  cppType: "int8_t"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "integer-int8",
  specPath: "RefinedSpecs/Codecs/Integer_int8_Codec.md",
  tsType: "number",
  cppType: "int8_t",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "Wire-identical to qint8: one signed two's complement byte via Int8Array / int8_t, base93-encoded as a 2-character standalone string.",
  fixedWidth
};

const TS_FN = "encodeInt8Standalone";
const CPP_FN = "encodeInt8Standalone";

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return emitTsFixedWidthStandaloneEncoder(TS_FN, fixedWidth);
  },
  emitCppEncoder(): string {
    return emitCppFixedWidthStandaloneEncoder(CPP_FN, fixedWidth);
  }
};
