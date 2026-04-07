/**
 * Base codec emitter (encode): `AnQst.Type.uint32` -> TypeScript `number`, C++ `uint32_t`.
 *
 * This codec is wire-identical to `AnQst.Type.quint32`: a fixed-width unsigned
 * 32-bit scalar written through `Uint32Array`, preserving the platform-native
 * 4-byte layout before base93-encoding it to a 5-character standalone string.
 * The distinction is preserved only in descriptor metadata and emitted C++
 * mapping (`uint32_t` instead of `quint32`).
 */

import { emitStrategyComment } from "../shared/comments";
import type {
  BaseCodecDescriptor,
  BaseCodecEncoderEmitter,
  FixedWidthScalarDescriptor
} from "../shared/contracts";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const fixedWidth: FixedWidthScalarDescriptor = {
  byteWidth: 4,
  tsViewCtor: "Uint32Array",
  cppType: "uint32_t"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "AnQst.Type.uint32",
  specPath: "RefinedSpecs/Codecs/Integer_uint32_Codec.md",
  tsType: "number",
  cppType: "uint32_t",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "Wire-identical to quint32: 4-byte unsigned scalar via Uint32Array / memcpy into uint32_t, base93-encoded as a 5-character standalone string.",
  fixedWidth
};

const strategyComment = emitStrategyComment("Base codec emitter (encode): AnQst.Type.uint32 / uint32_t", [
  "Uses Uint32Array so TypeScript follows the uint32/quint32 prose for unsigned 32-bit host-endian bytes.",
  "Emits exactly 5 base93 characters because the standalone payload is always 4 bytes wide.",
  "C++ encoder memcpy-copies uint32_t into the same 4-byte payload, keeping the wire identical to quint32."
]);

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return `${strategyComment}\n\n${emitTsFixedWidthStandaloneEncoder("encodeUint32Standalone", fixedWidth)}`;
  },
  emitCppEncoder(): string {
    return `${strategyComment}\n\n${emitCppFixedWidthStandaloneEncoder("encodeUint32Standalone", fixedWidth)}`;
  }
};

export const encoder = encoderEmitter;
