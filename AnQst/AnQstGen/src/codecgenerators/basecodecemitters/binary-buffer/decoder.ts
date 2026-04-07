/**
 * Base codec emitter (decode): standalone base93 string → `ArrayBuffer` / `QByteArray`.
 * The decoder reconstructs the exact raw byte sequence and returns the decoded backing buffer in TS.
 * Composite codecs must decide where buffer-length metadata lives when a variable-length buffer shares a
 * payload with sibling fields; this file only emits the standalone leaf helper and documents that strategy.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppRawByteStandaloneDecoder, emitTsRawByteStandaloneDecoder } from "../shared/rawbytes";
import { descriptor } from "./encoder";

const TS_FN = "decodeAnqstBase_buffer";
const CPP_FN = "decodeAnqstBase_buffer";

const strategyComment = emitStrategyComment("Base codec emitter (decode): AnQst.Type.buffer / ArrayBuffer", [
  "Base93-decodes the standalone wire string to raw bytes and returns the resulting opaque byte sequence.",
  "TypeScript returns the ArrayBuffer backing the decoded Uint8Array without an extra copy; C++ rebuilds QByteArray from decoded bytes.",
  "Composite codecs should read byte-length metadata from their planned numeric blob or trailing-position convention before consuming a buffer payload; that structured orchestration is intentionally not wired here."
]);

export { descriptor };

export const decoder: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return `${strategyComment}\n\n${emitTsRawByteStandaloneDecoder(TS_FN, "bytes.buffer")}`;
  },
  emitCppDecoder(): string {
    return `${strategyComment}\n\n${emitCppRawByteStandaloneDecoder(CPP_FN, "QByteArray(bytes.begin(), bytes.end())")}`;
  }
};
