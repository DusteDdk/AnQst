/**
 * Base codec emitter: `AnQst.Type.typedArray` decoder.
 * Decoding requires a concrete TypedArray constructor because abstract `TypedArray`
 * alone does not identify element width or the runtime view type to reconstruct.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppRawByteStandaloneDecoder } from "../shared/rawbytes";
import { descriptor } from "./encoder";

const TS_FN = "decodeBinaryTypedArrayStandalone";
const CPP_FN = "decodeBinaryTypedArrayStandalone";

const strategyComment = emitStrategyComment("Base codec emitter (decode): AnQst.Type.typedArray / QByteArray", [
  "Base93-decodes the standalone raw-byte payload back to a Uint8Array of bytes.",
  "The emitted TypeScript API requires a concrete typed-array constructor because abstract TypedArray is insufficient to reconstruct element width and view type.",
  "C++ rebuilds QByteArray directly because the backend mapping remains raw bytes."
]);

export { descriptor };

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return `${strategyComment}

function ${TS_FN}(encoded, typedArrayCtor) {
  const bytes = base93Decode(encoded);
  return new typedArrayCtor(bytes.buffer);
}`;
  },
  emitCppDecoder(): string {
    return `${strategyComment}\n\n${emitCppRawByteStandaloneDecoder(
      CPP_FN,
      "QByteArray(reinterpret_cast<const char*>(bytes.data()), static_cast<int>(bytes.size()))"
    )}`;
  }
};
