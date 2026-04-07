/**
 * Base codec emitter (encode): `AnQst.Type.blob`.
 * Wire shape is identical to `AnQst.Type.buffer`: raw ArrayBuffer bytes become one base93 string.
 * This emitter keeps distinct blob descriptor metadata while reusing the shared raw-byte scaffold.
 */

import { emitStrategyComment } from "../shared/comments";
import type { BaseCodecDescriptor, BaseCodecEncoderEmitter } from "../shared/contracts";
import { emitCppRawByteStandaloneEncoder, emitTsRawByteStandaloneEncoder } from "../shared/rawbytes";

export const descriptor: BaseCodecDescriptor = {
  codecId: "binary-blob",
  specPath: "RefinedSpecs/Codecs/Binary_blob_Codec.md",
  tsType: "ArrayBuffer",
  cppType: "QByteArray",
  wireCategory: "binary",
  strategySummary:
    "Serialize ArrayBuffer / QByteArray raw bytes as one base93 string; wire-identical to buffer, but with blob-specific descriptor metadata."
};

const TS_FN = "encodeBinaryBlobStandalone";
const CPP_FN = "encodeBinaryBlobStandalone";

const strategyComment = emitStrategyComment("Base codec emitter (encode): AnQst.Type.blob / QByteArray", [
  "Treats the payload as opaque bytes and base93-encodes them into one standalone JSON string.",
  "Wire layout is intentionally identical to AnQst.Type.buffer; only descriptor identity differs.",
  "Expects base93Encode in scope; C++ path reads QByteArray bytes without adding length/type metadata."
]);

export const encoderEmitter: BaseCodecEncoderEmitter = {
  descriptor,
  emitTsEncoder(): string {
    return `${strategyComment}\n\n${emitTsRawByteStandaloneEncoder(TS_FN, "new Uint8Array(value)")}`;
  },
  emitCppEncoder(): string {
    return `${strategyComment}\n\n${emitCppRawByteStandaloneEncoder(
      CPP_FN,
      "std::vector<std::uint8_t>(reinterpret_cast<const std::uint8_t*>(value.constData()), reinterpret_cast<const std::uint8_t*>(value.constData()) + value.size())"
    )}`;
  }
};
