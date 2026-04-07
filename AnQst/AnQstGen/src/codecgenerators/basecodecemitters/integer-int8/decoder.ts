/**
 * Base codec emitter: `AnQst.Type.int8` standalone decoder.
 *
 * Decodes the same 2-character base93 wire used by `AnQst.Type.qint8`, then
 * reconstructs the signed 8-bit two's complement value through `Int8Array`.
 * Descriptor identity remains distinct so generated C++ uses `int8_t`, not Qt's
 * `qint8`, even though the wire bytes are identical.
 */

import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";
import { descriptor } from "./encoder";

const fixedWidth = descriptor.fixedWidth!;

const TS_FN = "decodeInt8Standalone";
const CPP_FN = "decodeInt8Standalone";

export { descriptor };

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return emitTsFixedWidthStandaloneDecoder(TS_FN, fixedWidth);
  },
  emitCppDecoder(): string {
    return emitCppFixedWidthStandaloneDecoder(CPP_FN, fixedWidth);
  }
};
