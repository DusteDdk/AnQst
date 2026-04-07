/**
 * Base codec emitter: AnQst.Type.qint64 — TypeScript decoder (standalone base93 string → bigint).
 *
 * - Decodes base93 to 8 bytes, then reads signed 64-bit two's complement via BigInt64Array.
 * - C++ decoder uses memcpy from decoded bytes into qint64 (see emitCppDecoder).
 */

import type { BaseCodecDescriptor, BaseCodecDecoderEmitter, FixedWidthScalarDescriptor } from "../shared/contracts";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";

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
    "Decode standalone base93 to 8 bytes, reinterpret as qint64 / BigInt64Array[0] as bigint.",
  fixedWidth: FIXED_WIDTH
};

const TS_FN = "decodeQint64Standalone";
const CPP_FN = "decodeQint64Standalone";

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return emitTsFixedWidthStandaloneDecoder(TS_FN, FIXED_WIDTH);
  },
  emitCppDecoder(): string {
    return emitCppFixedWidthStandaloneDecoder(CPP_FN, FIXED_WIDTH);
  }
};
