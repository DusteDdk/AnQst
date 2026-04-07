/**
 * Base codec emitter (decode): base93 blob -> TypeScript `number`, C++ `uint8_t`.
 *
 * This reverses the standalone `uint8` encoder by decoding 2 base93 characters
 * to one byte and reading that byte through `Uint8Array` / `uint8_t`. The wire
 * contract is identical to `quint8`, while the descriptor keeps the `uint8_t`
 * identity for downstream code generation.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";
import { descriptor } from "./encoder";

const fixedWidth = descriptor.fixedWidth!;

const strategyComment = emitStrategyComment("Base codec emitter (decode): AnQst.Type.uint8 / uint8_t", [
  "Base93-decodes the standalone payload to one byte, then reads it through Uint8Array or uint8_t.",
  "Returns a JS number in the unsigned 0-255 domain described by the uint8 spec.",
  "Accepts the same 2-character wire strings as quint8 because the wire format is intentionally identical."
]);

export { descriptor };

export const decoder: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return `${strategyComment}\n\n${emitTsFixedWidthStandaloneDecoder("decodeUint8Standalone", fixedWidth)}`;
  },
  emitCppDecoder(): string {
    return `${strategyComment}\n\n${emitCppFixedWidthStandaloneDecoder("decodeUint8Standalone", fixedWidth)}`;
  }
};
