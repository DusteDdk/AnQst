/**
 * Base codec emitter (decode): base93 blob → TypeScript `number`, C++ `quint8`.
 * Reconstructs the single unsigned byte from a 2-character base93 payload.
 * See RefinedSpecs/Codecs/Integer_quint8_Codec.md.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";
import { descriptor } from "./encoder";

const strategyComment = emitStrategyComment("Base codec emitter (decode): AnQst.Type.quint8 / quint8", [
  "Decodes base93 to one byte, then reads Uint8Array[0] in TypeScript or quint8 in C++.",
  "Standalone payloads are fixed-width and therefore always 2 base93 characters for valid quint8 values.",
  "Portable interoperability is direct because the byte itself is already the decoded unsigned 8-bit value."
]);

export { descriptor };

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return `${strategyComment}\n\n${emitTsFixedWidthStandaloneDecoder("decodeQuint8Standalone", descriptor.fixedWidth!)}`;
  },
  emitCppDecoder(): string {
    return `${strategyComment}\n\n${emitCppFixedWidthStandaloneDecoder("decodeQuint8Standalone", descriptor.fixedWidth!)}`;
  }
};
