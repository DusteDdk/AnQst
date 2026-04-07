/**
 * Base codec emitter (decode): `AnQst.Type.blob`.
 * Decoding mirrors `AnQst.Type.buffer`: base93 text reconstructs the original raw bytes as ArrayBuffer/QByteArray.
 * This file preserves blob-specific descriptor identity while reusing the shared raw-byte scaffold.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { emitCppRawByteStandaloneDecoder, emitTsRawByteStandaloneDecoder } from "../shared/rawbytes";
import { descriptor } from "./encoder";

const TS_FN = "decodeBinaryBlobStandalone";
const CPP_FN = "decodeBinaryBlobStandalone";

const strategyComment = emitStrategyComment("Base codec emitter (decode): AnQst.Type.blob / QByteArray", [
  "Base93-decodes the standalone wire string back into the original opaque byte sequence.",
  "Wire layout is intentionally identical to AnQst.Type.buffer; the distinction is semantic descriptor metadata.",
  "Expects base93Decode in scope; C++ reconstructs QByteArray directly from decoded bytes."
]);

export { descriptor };

export const decoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return `${strategyComment}\n\n${emitTsRawByteStandaloneDecoder(
      TS_FN,
      "bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)"
    )}`;
  },
  emitCppDecoder(): string {
    return `${strategyComment}\n\n${emitCppRawByteStandaloneDecoder(
      CPP_FN,
      "QByteArray(reinterpret_cast<const char*>(bytes.data()), static_cast<int>(bytes.size()))"
    )}`;
  }
};
