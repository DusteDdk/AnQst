/**
 * Emitter for the AnQst base-type codec `AnQst.Type.quint64`.
 *
 * Maps TypeScript `bigint` to an 8-byte unsigned little-endian representation via
 * `BigUint64Array`, then to a standalone base93 string (10 characters). C++ uses
 * `quint64` with `std::memcpy` for the same 8-byte layout on the host platform.
 *
 * Spec: RefinedSpecs/Codecs/BigInt_quint64_Codec.md
 */

import type {
  BaseCodecDescriptor,
  BaseCodecEncoderEmitter,
  FixedWidthScalarDescriptor
} from "../shared/contracts";
import { emitCppFixedWidthStandaloneEncoder, emitTsFixedWidthStandaloneEncoder } from "../shared/fixedwidth";

const fixedWidth: FixedWidthScalarDescriptor = {
  byteWidth: 8,
  tsViewCtor: "BigUint64Array",
  cppType: "quint64"
};

export const descriptor: BaseCodecDescriptor = {
  codecId: "bigint-quint64",
  specPath: "RefinedSpecs/Codecs/BigInt_quint64_Codec.md",
  tsType: "bigint",
  cppType: "quint64",
  wireCategory: "fixed-width-scalar",
  strategySummary:
    "8-byte unsigned host-endian representation (BigUint64Array / memcpy into quint64), base93 standalone string (10 chars).",
  fixedWidth
};

const TS_FN = "encodeQuint64Standalone";
const CPP_FN = "encodeQuint64Standalone";

export const encoder: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return emitTsFixedWidthStandaloneEncoder(TS_FN, fixedWidth);
  },
  emitCppEncoder(): string {
    return emitCppFixedWidthStandaloneEncoder(CPP_FN, fixedWidth);
  }
};
