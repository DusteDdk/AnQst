/**
 * Base codec emitter (encode): `AnQst.Type.uint16` -> TypeScript `number`, C++ `uint16_t`.
 *
 * This codec is wire-identical to `AnQst.Type.quint16`: a fixed-width unsigned
 * 16-bit scalar written through `Uint16Array`, preserving the platform-native
 * 2-byte layout before base93-encoding it to a 3-character standalone string.
 * The distinction is preserved only in descriptor metadata and emitted C++
 * mapping (`uint16_t` instead of `quint16`).
 */

import { emitStrategyComment } from "../shared/comments";
import type {
  BaseCodecDescriptor,
  BaseCodecEncoderEmitter,
  FixedWidthScalarDescriptor
} from "../shared/contracts";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const fixedWidth: FixedWidthScalarDescriptor = {
  byteWidth: 2,
  tsViewCtor: "Uint16Array",
  cppType: "uint16_t"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "AnQst.Type.uint16",
  specPath: "RefinedSpecs/Codecs/Integer_uint16_Codec.md",
  tsType: "number",
  cppType: "uint16_t",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "Wire-identical to quint16: 2-byte unsigned scalar via Uint16Array / memcpy into uint16_t, base93-encoded as a 3-character standalone string.",
  fixedWidth
};

const strategyComment = emitStrategyComment("Base codec emitter (encode): AnQst.Type.uint16 / uint16_t", [
  "Uses Uint16Array so TypeScript follows the uint16/quint16 prose for unsigned 16-bit host-endian bytes.",
  "Emits exactly 3 base93 characters because the standalone payload is always 2 bytes wide.",
  "C++ encoder memcpy-copies uint16_t into the same 2-byte payload, keeping the wire identical to quint16."
]);

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return `${strategyComment}\n\n${emitTsFixedWidthStandaloneEncoder("encodeUint16Standalone", fixedWidth)}`;
  },
  emitCppEncoder(): string {
    return `${strategyComment}\n\n${emitCppFixedWidthStandaloneEncoder("encodeUint16Standalone", fixedWidth)}`;
  }
};
