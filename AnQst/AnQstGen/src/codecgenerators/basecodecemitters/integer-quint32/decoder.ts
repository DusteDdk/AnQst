/**
 * Base codec emitter (decode): base93 blob → TypeScript `number`, C++ `quint32`.
 * Reconstructs the 4-byte unsigned payload from a 5-character base93 string and
 * reads it back through Uint32Array / quint32 in host-native byte order.
 * See RefinedSpecs/Codecs/Integer_quint32_Codec.md.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppFixedWidthStandaloneDecoder, emitTsFixedWidthStandaloneDecoder } from "../shared/fixedwidth";
import { descriptor } from "./encoder";

const strategyComment = emitStrategyComment("Base codec emitter (decode): AnQst.Type.quint32 / quint32", [
  "Decodes base93 to 4 bytes, then reads Uint32Array[0] in TypeScript or quint32 in C++.",
  "Standalone payloads are fixed-width and therefore always 5 base93 characters for valid quint32 values.",
  "Portable interoperability is direct because both sides reinterpret the same 4 decoded bytes."
]);

export { descriptor };

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return `${strategyComment}\n\n${emitTsFixedWidthStandaloneDecoder("decodeQuint32Standalone", descriptor.fixedWidth!)}`;
  },
  emitCppDecoder(): string {
    return `${strategyComment}\n\n${emitCppFixedWidthStandaloneDecoder("decodeQuint32Standalone", descriptor.fixedWidth!)}`;
  }
};
