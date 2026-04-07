/**
 * Base codec emitter: `AnQst.Type.int16` standalone decoder.
 *
 * Decoding mirrors `AnQst.Type.qint16`: base93 expands to 2 bytes, then
 * `Int16Array` reconstructs the signed 16-bit two's complement value in native
 * byte order. Descriptor identity remains separate so generated C++ binds to
 * `int16_t`, not Qt's `qint16`.
 */

import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitStrategyComment } from "../shared/comments";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";
import { descriptor } from "./encoder";

const FIXED_WIDTH = descriptor.fixedWidth!;

const TS_FN = "decodeInt16Standalone";
const CPP_FN = "decodeInt16Standalone";

const STRATEGY_COMMENT = emitStrategyComment("Base codec emitter (decode): AnQst.Type.int16 / int16_t", [
  "Base93 decodes to exactly 2 bytes, then Int16Array reconstructs the signed 16-bit value in TypeScript.",
  "The standalone wire remains the same 3-character payload used by qint16.",
  "C++ decodes into int16_t with memcpy so the descriptor maps to the standard typedef, not qint16."
]);

export { descriptor };

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return `${STRATEGY_COMMENT}\n\n${emitTsFixedWidthStandaloneDecoder(TS_FN, FIXED_WIDTH)}`;
  },
  emitCppDecoder(): string {
    return `${STRATEGY_COMMENT}\n\n${emitCppFixedWidthStandaloneDecoder(CPP_FN, FIXED_WIDTH)}`;
  }
};
