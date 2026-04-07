/**
 * Base codec emitter (decode): base93 blob → TypeScript `Int8Array`, C++ `QByteArray`.
 * Reconstructs raw bytes with base93Decode, then reinterprets the backing buffer as Int8Array.
 * The wire format is identical to the buffer and typedArray binary codecs.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDecoderEmitter } from "../shared/contracts";
import { descriptor } from "./encoder";

const strategyComment = emitStrategyComment("Base codec emitter (decode): AnQst.Type.int8Array / QByteArray", [
  "Decodes base93 into raw bytes, then reconstructs Int8Array with new Int8Array(bytes.buffer).",
  "Preserves signed byte patterns because the underlying bytes are transported unchanged.",
  "C++ side rebuilds a QByteArray from the decoded byte vector using the same wire contract."
]);

export { descriptor };

export const binaryInt8ArrayDecoderEmitter: BaseCodecDecoderEmitter = {
  descriptor,
  emitTsDecoder(): string {
    return `${strategyComment}

function decodeAnQstBinaryInt8Array(encoded) {
  const bytes = base93Decode(encoded);
  return new Int8Array(bytes.buffer);
}`;
  },
  emitCppDecoder(): string {
    return `${strategyComment}

inline QByteArray decodeAnQstBinaryInt8Array(const std::string& encoded) {
  const std::vector<std::uint8_t> bytes = base93Decode(encoded);
  return QByteArray(
    reinterpret_cast<const char*>(bytes.data()),
    static_cast<int>(bytes.size())
  );
}`;
  }
};
