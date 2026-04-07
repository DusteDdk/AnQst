/**
 * Base codec emitter: AnQst.Type.qint64 — TypeScript encoder (bigint → standalone base93 string).
 *
 * - 8-byte signed two's complement via BigInt64Array; platform-native byte order.
 * - Standalone wire: one base93 string (10 characters for 8 bytes).
 * - C++ side mirrors layout with memcpy into qint64 (see emitCppEncoder).
 */

import type { BaseCodecDescriptor, BaseCodecEncoderEmitter, FixedWidthScalarDescriptor } from "../shared/contracts";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const FIXED_WIDTH: FixedWidthScalarDescriptor = {
  byteWidth: 8,
  tsViewCtor: "BigInt64Array",
  cppType: "qint64"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "bigint-qint64",
  specPath: "RefinedSpecs/Codecs/BigInt_qint64_Codec.md",
  tsType: "bigint",
  cppType: "qint64",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "Serialize qint64 as 8-byte signed two's complement (BigInt64Array / C++ memcpy), then base93-encode to a standalone JSON string.",
  fixedWidth: FIXED_WIDTH
};

const TS_FN = "encodeQint64Standalone";
const CPP_FN = "encodeQint64Standalone";

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return emitTsFixedWidthStandaloneEncoder(TS_FN, FIXED_WIDTH);
  },
  emitCppEncoder(): string {
    return emitCppFixedWidthStandaloneEncoder(CPP_FN, FIXED_WIDTH);
  }
};
