/**
 * Boolean wire codec (decoder side)
 *
 * Strategy:
 * - Read the raw JSON-safe wire strings `"0"` / `"1"` directly.
 * - `"1"` → true; anything else → false (no JavaScript truthiness for non-boolean inputs).
 * - C++ compares the incoming string to `"1"`.
 */

import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { descriptor } from "./encoder";

const TS_DECODE_FN = "decodeBoolean";
const CPP_DECODE_FN = "decodeBoolean";

function emitTsDecoderSource(): string {
  return `function ${TS_DECODE_FN}(encoded) {
  return encoded === "1";
}`;
}

function emitCppDecoderSource(): string {
  return `inline bool ${CPP_DECODE_FN}(const std::string& encoded) {
  return encoded == "1";
}`;
}

export { descriptor };

export const decoder: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return emitTsDecoderSource();
  },
  emitCppDecoder(): string {
    return emitCppDecoderSource();
  }
};
