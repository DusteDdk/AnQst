/**
 * Base codec emitter (decode): base93 blob -> TypeScript `number`, C++ `uint32_t`.
 *
 * This reverses the standalone `uint32` encoder by decoding 5 base93 characters
 * to 4 bytes and reading them through `Uint32Array` / `uint32_t`. The wire
 * contract is intentionally identical to `quint32`, while descriptor identity
 * remains distinct for downstream code generation and C++ type selection.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";
import { descriptor } from "./encoder";

const fixedWidth = descriptor.fixedWidth!;

const strategyComment = emitStrategyComment("Base codec emitter (decode): AnQst.Type.uint32 / uint32_t", [
  "Base93-decodes the standalone payload to 4 bytes, then reads them through Uint32Array or uint32_t.",
  "Returns the JavaScript number represented by the unsigned 32-bit host-endian byte sequence.",
  "Accepts the same 5-character wires as quint32 because the byte-level wire format is deliberately identical."
]);

export { descriptor };

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return `${strategyComment}\n\n${emitTsFixedWidthStandaloneDecoder("decodeUint32Standalone", fixedWidth)}`;
  },
  emitCppDecoder(): string {
    return `${strategyComment}\n\n${emitCppFixedWidthStandaloneDecoder("decodeUint32Standalone", fixedWidth)}`;
  }
};

export const decoder = decoderEmitter;
