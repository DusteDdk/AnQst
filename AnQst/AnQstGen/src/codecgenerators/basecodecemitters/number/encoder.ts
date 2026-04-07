/**
 * Base codec emitter (encode): AnQst.Type.number ↔ TypeScript `number`, C++ `double`.
 * Standalone wire shape is one base93 string of length 10 (8 IEEE 754 binary64 bytes).
 * See RefinedSpecs/Codecs/Number_number_Codec.md and AnQst-Codec-Design-Principles.md §4.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter, FixedWidthScalarDescriptor } from "../shared/contracts";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const fixedWidth: FixedWidthScalarDescriptor = {
  byteWidth: 8,
  tsViewCtor: "Float64Array",
  cppType: "double"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "AnQst.Type.number",
  specPath: "RefinedSpecs/Codecs/Number_number_Codec.md",
  tsType: "number",
  cppType: "double",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "IEEE 754 binary64: 8 platform-native bytes packed via base93 (10 characters standalone).",
  fixedWidth
};

const strategyComment = emitStrategyComment("Base codec emitter (encode): AnQst.Type.number / double", [
  "Uses Float64Array (TS) or std::memcpy (C++) for platform-native IEEE 754 bytes.",
  "Emits base93 via shared fixed-width standalone helper (expects base93Encode in scope).",
  "Preserves all bit patterns including ±0, NaN, ±Infinity, subnormals."
]);

export const numberEncoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return `${strategyComment}\n\n${emitTsFixedWidthStandaloneEncoder("encodeAnQstNumber", fixedWidth)}`;
  },
  emitCppEncoder(): string {
    return `${strategyComment}\n\n${emitCppFixedWidthStandaloneEncoder("encodeAnQstNumber", fixedWidth)}`;
  }
};
