/**
 * Base codec emitter: AnQst.Type.qint16 — TypeScript decoder (standalone base93 string → number).
 *
 * - Decodes base93 to 2 bytes, then reads signed 16-bit two's complement via Int16Array.
 * - Returns the JavaScript number represented by that qint16 payload.
 * - C++ side performs the same memcpy-based reinterpretation into qint16.
 */

import type { BaseCodecDescriptor, BaseCodecDecoderEmitter, FixedWidthScalarDescriptor } from "../shared/contracts";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";

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
    "Decode standalone base93 to 2 bytes, reinterpret them as qint16 / Int16Array[0] and return the resulting number.",
  fixedWidth: FIXED_WIDTH
};

const TS_FN = "decodeQint16Standalone";
const CPP_FN = "decodeQint16Standalone";

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return emitTsFixedWidthStandaloneDecoder(TS_FN, FIXED_WIDTH);
  },
  emitCppDecoder(): string {
    return emitCppFixedWidthStandaloneDecoder(CPP_FN, FIXED_WIDTH);
  }
};
