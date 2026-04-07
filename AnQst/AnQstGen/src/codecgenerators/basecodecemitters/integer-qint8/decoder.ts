/**
 * Base codec emitter: AnQst.Type.qint8 — TypeScript decoder (standalone base93 string → number).
 *
 * - Decodes base93 to 1 byte, then reads signed 8-bit two's complement via Int8Array.
 * - Returns the JavaScript number represented by that single signed byte.
 * - C++ side performs the same single-byte reinterpretation, which is portable for qint8.
 */

import type { BaseCodecDescriptor, BaseCodecDecoderEmitter, FixedWidthScalarDescriptor } from "../shared/contracts";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";

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
    "Decode standalone base93 to 1 byte, reinterpret it as qint8 / Int8Array[0] and return the resulting number.",
  fixedWidth: FIXED_WIDTH
};

const TS_FN = "decodeQint8Standalone";
const CPP_FN = "decodeQint8Standalone";

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return emitTsFixedWidthStandaloneDecoder(TS_FN, FIXED_WIDTH);
  },
  emitCppDecoder(): string {
    return emitCppFixedWidthStandaloneDecoder(CPP_FN, FIXED_WIDTH);
  }
};
