import test from "node:test";
import assert from "node:assert/strict";
import { emitBase93Decoder, emitBase93Encoder } from "../../src/base93";
import {
  emitPositionalBase93CountDecoder,
  emitPositionalBase93CountEncoder
} from "../../src/codecgenerators/basecodecemitters/shared";
import { evalEmittedFunction } from "./helpers/emitted-code";

test("shared positional base93 count helpers round-trip representative values", () => {
  const encode = evalEmittedFunction<(value: number) => string>(emitPositionalBase93CountEncoder("encodeCount"));
  const decode = evalEmittedFunction<(value: string) => number>(emitPositionalBase93CountDecoder("decodeCount"));
  const values = [0, 1, 2, 92, 93, 94, 255, 4096, 8648, 8649, 65535, 1048576];

  for (const value of values) {
    const encoded = encode(value);
    const decoded = decode(encoded);
    assert.equal(decoded, value, `count parity for ${value}`);
  }
});

test("shared positional count helpers stay distinct from byte-packing base93", () => {
  const encodeCount = evalEmittedFunction<(value: number) => string>(emitPositionalBase93CountEncoder("encodeCount"));
  const encodeBytes = evalEmittedFunction<(value: Uint8Array) => string>(emitBase93Encoder());
  const decodeBytes = evalEmittedFunction<(value: string) => Uint8Array>(emitBase93Decoder());

  const countEncoded = encodeCount(1);
  const byteEncoded = encodeBytes(new Uint8Array([1]));

  assert.notEqual(countEncoded, byteEncoded);
  assert.deepEqual(decodeBytes(byteEncoded), new Uint8Array([1]));
});
