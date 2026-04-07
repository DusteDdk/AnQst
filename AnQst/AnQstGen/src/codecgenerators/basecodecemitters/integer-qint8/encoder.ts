/**
 * Base codec emitter: AnQst.Type.qint8 — TypeScript encoder (number → standalone base93 string).
 *
 * - 1-byte signed two's complement via Int8Array; no runtime range/type validation.
 * - Standalone wire: one base93 string (2 characters for 1 byte).
 * - C++ side mirrors the same single-byte layout, so interoperability is portable.
 */

import type { BaseCodecDescriptor, BaseCodecEncoderEmitter, FixedWidthScalarDescriptor } from "../shared/contracts";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const FIXED_WIDTH: FixedWidthScalarDescriptor = {
  byteWidth: 1,
  tsViewCtor: "Int8Array",
  cppType: "qint8"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "integer-qint8",
  specPath: "RefinedSpecs/Codecs/Integer_qint8_Codec.md",
  tsType: "number",
  cppType: "qint8",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "Serialize qint8 as 1-byte signed two's complement (Int8Array / single C++ byte), then base93-encode to a standalone JSON string.",
  fixedWidth: FIXED_WIDTH
};

const TS_FN = "encodeQint8Standalone";
const CPP_FN = "encodeQint8Standalone";

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return emitTsFixedWidthStandaloneEncoder(TS_FN, FIXED_WIDTH);
  },
  emitCppEncoder(): string {
    return emitCppFixedWidthStandaloneEncoder(CPP_FN, FIXED_WIDTH);
  }
};
