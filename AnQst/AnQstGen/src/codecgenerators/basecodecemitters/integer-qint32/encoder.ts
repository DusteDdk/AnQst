/**
 * Base codec emitter: AnQst.Type.qint32 — TypeScript encoder (number → standalone base93 string).
 *
 * - 4-byte signed two's complement via Int32Array; platform-native byte order.
 * - Standalone wire: one base93 string (5 characters for 4 bytes).
 * - C++ side mirrors the same 4-byte layout with memcpy into qint32.
 */

import type { BaseCodecDescriptor, BaseCodecEncoderEmitter, FixedWidthScalarDescriptor } from "../shared/contracts";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const FIXED_WIDTH: FixedWidthScalarDescriptor = {
  byteWidth: 4,
  tsViewCtor: "Int32Array",
  cppType: "qint32"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "integer-qint32",
  specPath: "RefinedSpecs/Codecs/Integer_qint32_Codec.md",
  tsType: "number",
  cppType: "qint32",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "Serialize qint32 as 4-byte signed two's complement (Int32Array / C++ memcpy), then base93-encode to a standalone 5-character JSON string.",
  fixedWidth: FIXED_WIDTH
};

const TS_FN = "encodeQint32Standalone";
const CPP_FN = "encodeQint32Standalone";

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return emitTsFixedWidthStandaloneEncoder(TS_FN, FIXED_WIDTH);
  },
  emitCppEncoder(): string {
    return emitCppFixedWidthStandaloneEncoder(CPP_FN, FIXED_WIDTH);
  }
};
