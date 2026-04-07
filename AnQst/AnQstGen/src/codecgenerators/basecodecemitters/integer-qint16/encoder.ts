/**
 * Base codec emitter: AnQst.Type.qint16 — TypeScript encoder (number → standalone base93 string).
 *
 * - 2-byte signed two's complement via Int16Array; platform-native byte order.
 * - Standalone wire: one base93 string (3 characters for 2 bytes).
 * - C++ side mirrors layout with memcpy into qint16, keeping TS/C++ interop portable.
 */

import type { BaseCodecDescriptor, BaseCodecEncoderEmitter, FixedWidthScalarDescriptor } from "../shared/contracts";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const FIXED_WIDTH: FixedWidthScalarDescriptor = {
  byteWidth: 2,
  tsViewCtor: "Int16Array",
  cppType: "qint16"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "integer-qint16",
  specPath: "RefinedSpecs/Codecs/Integer_qint16_Codec.md",
  tsType: "number",
  cppType: "qint16",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "Serialize qint16 as 2-byte signed two's complement (Int16Array / C++ memcpy), then base93-encode to a standalone JSON string.",
  fixedWidth: FIXED_WIDTH
};

const TS_FN = "encodeQint16Standalone";
const CPP_FN = "encodeQint16Standalone";

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return emitTsFixedWidthStandaloneEncoder(TS_FN, FIXED_WIDTH);
  },
  emitCppEncoder(): string {
    return emitCppFixedWidthStandaloneEncoder(CPP_FN, FIXED_WIDTH);
  }
};
