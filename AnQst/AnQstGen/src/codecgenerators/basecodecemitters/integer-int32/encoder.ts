/**
 * Base codec emitter: `AnQst.Type.int32` standalone encoder.
 *
 * Wire behavior is intentionally identical to `AnQst.Type.qint32`: serialize
 * one signed 32-bit two's complement word via `Int32Array`, then base93-encode
 * those 4 bytes into a 5-character standalone string. The distinction lives
 * only in descriptor identity and C++ mapping: this codec targets `int32_t`.
 */

import type {
  BaseCodecDescriptor,
  BaseCodecEncoderEmitter,
  FixedWidthScalarDescriptor
} from "../shared/contracts";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const FIXED_WIDTH: FixedWidthScalarDescriptor = {
  byteWidth: 4,
  tsViewCtor: "Int32Array",
  cppType: "int32_t"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "integer-int32",
  specPath: "RefinedSpecs/Codecs/Integer_int32_Codec.md",
  tsType: "number",
  cppType: "int32_t",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "Wire-identical to qint32: serialize int32_t as 4-byte signed two's complement (Int32Array / C++ memcpy), then base93-encode to a standalone 5-character JSON string.",
  fixedWidth: FIXED_WIDTH
};

const TS_FN = "encodeInt32Standalone";
const CPP_FN = "encodeInt32Standalone";

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return emitTsFixedWidthStandaloneEncoder(TS_FN, FIXED_WIDTH);
  },
  emitCppEncoder(): string {
    return emitCppFixedWidthStandaloneEncoder(CPP_FN, FIXED_WIDTH);
  }
};
