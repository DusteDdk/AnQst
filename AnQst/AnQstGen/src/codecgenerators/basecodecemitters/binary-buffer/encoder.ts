/**
 * Base codec emitter (encode): `AnQst.Type.buffer` / `ArrayBuffer` ↔ `QByteArray`.
 * Standalone wire shape is one base93 string over the raw bytes, including `""` for an empty buffer.
 * Composite codecs should keep the variable-length buffer payload in its own string slot and pair it with
 * byte-length metadata when sibling fields make boundaries ambiguous; that structured integration is
 * documented here but intentionally not emitted by this leaf helper.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter } from "../shared/contracts";
import { emitCppRawByteStandaloneEncoder, emitTsRawByteStandaloneEncoder } from "../shared/rawbytes";

export const descriptor: BaseCodecDescriptor = {
  codecId: "AnQst.Type.buffer",
  specPath: "RefinedSpecs/Codecs/Binary_buffer_Codec.md",
  tsType: "ArrayBuffer",
  cppType: "QByteArray",
  wireCategory: "binary",
  strategySummary:
    "ArrayBuffer/QByteArray raw bytes encoded as one standalone base93 string; composite codecs keep the payload in its own string slot and carry byte length separately when needed."
};

const TS_FN = "encodeAnqstBase_buffer";
const CPP_FN = "encodeAnqstBase_buffer";

const strategyComment = emitStrategyComment("Base codec emitter (encode): AnQst.Type.buffer / ArrayBuffer", [
  "Treats the domain value as an opaque byte sequence and base93-encodes it as one standalone string.",
  "TypeScript reads bytes through Uint8Array(value); C++ reads QByteArray through begin()/end() into std::vector<std::uint8_t>.",
  "Composite codecs should keep this variable-length payload in its own wire string position and carry byte-length metadata separately when boundary disambiguation is required; that orchestration is not emitted here."
]);

export const encoder: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return `${strategyComment}\n\n${emitTsRawByteStandaloneEncoder(TS_FN, "new Uint8Array(value)")}`;
  },
  emitCppEncoder(): string {
    return `${strategyComment}\n\n${emitCppRawByteStandaloneEncoder(
      CPP_FN,
      "std::vector<std::uint8_t>(value.begin(), value.end())"
    )}`;
  }
};
