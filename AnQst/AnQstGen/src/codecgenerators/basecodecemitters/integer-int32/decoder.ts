/**
 * Base codec emitter: `AnQst.Type.int32` standalone decoder.
 *
 * Decodes the same 5-character base93 wire used by `AnQst.Type.qint32`, then
 * reconstructs the signed 32-bit two's complement value through `Int32Array`.
 * Descriptor identity remains distinct so generated C++ uses `int32_t`, not
 * Qt's `qint32`, even though the wire bytes are identical.
 */

import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";
import { descriptor } from "./encoder";

const FIXED_WIDTH = descriptor.fixedWidth!;

const TS_FN = "decodeInt32Standalone";
const CPP_FN = "decodeInt32Standalone";

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
