/**
 * Base codec emitter (encode): `AnQst.Type.uint8` -> TypeScript `number`, C++ `uint8_t`.
 *
 * This codec is wire-identical to `AnQst.Type.quint8`: a single unsigned byte
 * encoded as a 2-character base93 string. The distinction is preserved only in
 * descriptor metadata and the emitted C++ type mapping (`uint8_t` vs `quint8`).
 */

import { emitStrategyComment } from "../shared/comments";
import type {
  BaseCodecDescriptor,
  BaseCodecEncoderEmitter,
  FixedWidthScalarDescriptor
} from "../shared/contracts";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const fixedWidth: FixedWidthScalarDescriptor = {
  byteWidth: 1,
  tsViewCtor: "Uint8Array",
  cppType: "uint8_t"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "AnQst.Type.uint8",
  specPath: "RefinedSpecs/Codecs/Integer_uint8_Codec.md",
  tsType: "number",
  cppType: "uint8_t",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "Single unsigned byte via Uint8Array / memcpy into uint8_t, base93 standalone string (2 chars); wire-identical to quint8 but descriptor/C++ mapping remain distinct.",
  fixedWidth
};

const strategyComment = emitStrategyComment("Base codec emitter (encode): AnQst.Type.uint8 / uint8_t", [
  "Uses Uint8Array for the 1-byte unsigned representation on the TS side.",
  "Uses std::memcpy into uint8_t on the C++ side for the same single-byte payload.",
  "Produces the same 2-character base93 wire form as quint8; only descriptor and C++ typedef mapping differ."
]);

export const encoder: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return `${strategyComment}\n\n${emitTsFixedWidthStandaloneEncoder("encodeUint8Standalone", fixedWidth)}`;
  },
  emitCppEncoder(): string {
    return `${strategyComment}\n\n${emitCppFixedWidthStandaloneEncoder("encodeUint8Standalone", fixedWidth)}`;
  }
};
