/**
 * Base codec emitter (decode): base93 blob -> TypeScript `number`, C++ `uint16_t`.
 *
 * This reverses the standalone `uint16` encoder by decoding 3 base93 characters
 * to 2 bytes and reading them through `Uint16Array` / `uint16_t`. The wire
 * contract is intentionally identical to `quint16`, while descriptor identity
 * remains distinct for downstream code generation and C++ type selection.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";
import { descriptor } from "./encoder";

const fixedWidth = descriptor.fixedWidth!;

const strategyComment = emitStrategyComment("Base codec emitter (decode): AnQst.Type.uint16 / uint16_t", [
  "Base93-decodes the standalone payload to 2 bytes, then reads them through Uint16Array or uint16_t.",
  "Returns the JavaScript number represented by the unsigned 16-bit host-endian byte pair.",
  "Accepts the same 3-character wires as quint16 because the byte-level wire format is deliberately identical."
]);

export { descriptor };

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return `${strategyComment}\n\n${emitTsFixedWidthStandaloneDecoder("decodeUint16Standalone", fixedWidth)}`;
  },
  emitCppDecoder(): string {
    return `${strategyComment}\n\n${emitCppFixedWidthStandaloneDecoder("decodeUint16Standalone", fixedWidth)}`;
  }
};
