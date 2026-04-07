/**
 * Decoder emitter for the AnQst base-type codec `AnQst.Type.quint64`.
 *
 * Reverses the standalone encoder: base93 string → 8 bytes → `BigUint64Array` → bigint (≥ 0n).
 * C++ decodes to `quint64` via `std::memcpy` from decoded bytes.
 *
 * Spec: RefinedSpecs/Codecs/BigInt_quint64_Codec.md
 */

import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";
import { descriptor } from "./encoder";

const fixedWidth = descriptor.fixedWidth!;

const TS_FN = "decodeQuint64Standalone";
const CPP_FN = "decodeQuint64Standalone";

export { descriptor };

export const decoder: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return emitTsFixedWidthStandaloneDecoder(TS_FN, fixedWidth);
  },
  emitCppDecoder(): string {
    return emitCppFixedWidthStandaloneDecoder(CPP_FN, fixedWidth);
  }
};
