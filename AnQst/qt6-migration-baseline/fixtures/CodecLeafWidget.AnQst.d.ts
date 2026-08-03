import type { AnQst } from "AnQst-Spec-DSL";

declare namespace CodecLeafWidget {
  interface ScalarLeaves {
    qint64Value: AnQst.Type.qint64;
    quint64Value: AnQst.Type.quint64;
    qint32Value: AnQst.Type.qint32;
    quint32Value: AnQst.Type.quint32;
    qint16Value: AnQst.Type.qint16;
    quint16Value: AnQst.Type.quint16;
    qint8Value: AnQst.Type.qint8;
    quint8Value: AnQst.Type.quint8;
    int32Value: AnQst.Type.int32;
    uint32Value: AnQst.Type.uint32;
    int16Value: AnQst.Type.int16;
    uint16Value: AnQst.Type.uint16;
    int8Value: AnQst.Type.int8;
    uint8Value: AnQst.Type.uint8;
    bigintValue: bigint;
  }

  interface BinaryLeaves {
    bufferValue: AnQst.Type.buffer;
    blobValue: AnQst.Type.blob;
    typedArrayValue: AnQst.Type.typedArray;
    uint8ArrayValue: AnQst.Type.uint8Array;
    int8ArrayValue: AnQst.Type.int8Array;
    uint16ArrayValue: AnQst.Type.uint16Array;
    int16ArrayValue: AnQst.Type.int16Array;
    uint32ArrayValue: AnQst.Type.uint32Array;
    int32ArrayValue: AnQst.Type.int32Array;
    float32ArrayValue: AnQst.Type.float32Array;
    float64ArrayValue: AnQst.Type.float64Array;
  }

  interface CodecService extends AnQst.Service {
    roundTripScalars(value: ScalarLeaves): AnQst.Call<ScalarLeaves>;
    roundTripBinary(value: BinaryLeaves): AnQst.Call<BinaryLeaves>;
  }
}
