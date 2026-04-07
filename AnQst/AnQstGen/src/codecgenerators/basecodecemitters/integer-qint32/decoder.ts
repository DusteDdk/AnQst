/**
 * Base codec emitter: AnQst.Type.qint32 — TypeScript decoder (standalone base93 string → number).
 *
 * - Decodes base93 to 4 bytes, then reads signed 32-bit two's complement via Int32Array.
 * - Returns the JavaScript number represented by that qint32 payload.
 * - C++ side performs the same 4-byte reinterpretation with memcpy into qint32.
 */

import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";
import { descriptor } from "./encoder";

const FIXED_WIDTH = descriptor.fixedWidth!;

const TS_FN = "decodeQint32Standalone";
const CPP_FN = "decodeQint32Standalone";

export { descriptor };

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return emitTsFixedWidthStandaloneDecoder(TS_FN, FIXED_WIDTH);
  },
  emitCppDecoder(): string {
    return emitCppFixedWidthStandaloneDecoder(CPP_FN, FIXED_WIDTH);
  }
};
