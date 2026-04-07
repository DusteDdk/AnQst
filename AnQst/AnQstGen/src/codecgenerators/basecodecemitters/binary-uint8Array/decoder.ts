/**
 * Base codec emitter: `AnQst.Type.uint8Array` decoder.
 * Reconstructs the standalone raw-byte base93 payload directly as a concrete `Uint8Array`
 * and mirrors the QByteArray interop contract used by the buffer codec.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppRawByteStandaloneDecoder, emitTsRawByteStandaloneDecoder } from "../shared/rawbytes";
import { descriptor } from "./encoder";

const TS_FN = "decodeBinaryUint8ArrayStandalone";
const CPP_FN = "decodeBinaryUint8ArrayStandalone";

const strategyComment = emitStrategyComment("Base codec emitter (decode): AnQst.Type.uint8Array / QByteArray", [
  "Base93-decodes the standalone wire payload back to raw bytes with no structural wrapper.",
  "TypeScript returns the Uint8Array produced by base93Decode directly; no ArrayBuffer extraction or reinterpretation.",
  "C++ rebuilds a QByteArray from the decoded bytes for symmetry with the buffer codec's QByteArray mapping."
]);

export { descriptor };

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return `${strategyComment}\n\n${emitTsRawByteStandaloneDecoder(TS_FN, "bytes")}`;
  },
  emitCppDecoder(): string {
    return `${strategyComment}\n\n${emitCppRawByteStandaloneDecoder(
      CPP_FN,
      "QByteArray(reinterpret_cast<const char*>(bytes.data()), static_cast<int>(bytes.size()))"
    )}`;
  }
};
