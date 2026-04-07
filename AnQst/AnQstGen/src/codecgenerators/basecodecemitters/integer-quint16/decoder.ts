/**
 * Base codec emitter (decode): base93 blob → TypeScript `number`, C++ `quint16`.
 * Reconstructs the platform-native 2-byte unsigned scalar from a 3-character base93 payload.
 * See RefinedSpecs/Codecs/Integer_quint16_Codec.md.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";
import { descriptor } from "./encoder";

const strategyComment = emitStrategyComment("Base codec emitter (decode): AnQst.Type.quint16 / quint16", [
  "Decodes base93 to exactly 2 bytes, then reads Uint16Array[0] in TypeScript or quint16 in C++.",
  "Standalone payloads are fixed-width and therefore always 3 base93 characters for valid quint16 values.",
  "Portable interoperability is byte-exact because both sides reinterpret the same 2 decoded bytes as quint16."
]);

export { descriptor };

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return `${strategyComment}\n\n${emitTsFixedWidthStandaloneDecoder("decodeQuint16Standalone", descriptor.fixedWidth!)}`;
  },
  emitCppDecoder(): string {
    return `${strategyComment}\n\n${emitCppFixedWidthStandaloneDecoder("decodeQuint16Standalone", descriptor.fixedWidth!)}`;
  }
};
