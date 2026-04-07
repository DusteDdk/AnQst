/**
 * Base codec emitter (decode): base93 blob → TypeScript `number`, C++ `double`.
 * Reconstructs IEEE 754 binary64 from eight decoded bytes (platform-native order).
 * See RefinedSpecs/Codecs/Number_number_Codec.md and AnQst-Opaque-Wire-Contract.md §6.4.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";
import { descriptor } from "./encoder";

const strategyComment = emitStrategyComment("Base codec emitter (decode): AnQst.Type.number / double", [
  "Decodes base93 to bytes, then Float64Array (TS) or std::memcpy (C++).",
  "Expects base93Decode in scope; standalone payloads are exactly 10 characters.",
  "Round-trips all IEEE special values and distinct NaN payloads when produced by the encoder."
]);

export { descriptor };

export const numberDecoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return `${strategyComment}\n\n${emitTsFixedWidthStandaloneDecoder(
      "decodeAnQstNumber",
      descriptor.fixedWidth!
    )}`;
  },
  emitCppDecoder(): string {
    return `${strategyComment}\n\n${emitCppFixedWidthStandaloneDecoder(
      "decodeAnQstNumber",
      descriptor.fixedWidth!
    )}`;
  }
};
