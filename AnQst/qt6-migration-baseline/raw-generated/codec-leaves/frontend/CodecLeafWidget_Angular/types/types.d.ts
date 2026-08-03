export interface ScalarLeaves {
    qint64Value: bigint;
    quint64Value: bigint;
    qint32Value: number;
    quint32Value: number;
    qint16Value: number;
    quint16Value: number;
    qint8Value: number;
    quint8Value: number;
    int32Value: number;
    uint32Value: number;
    int16Value: number;
    uint16Value: number;
    int8Value: number;
    uint8Value: number;
    bigintValue: bigint;
  }

export interface BinaryLeaves {
    bufferValue: ArrayBuffer;
    blobValue: ArrayBuffer;
    typedArrayValue: Uint8Array;
    uint8ArrayValue: Uint8Array;
    int8ArrayValue: Int8Array;
    uint16ArrayValue: Uint16Array;
    int16ArrayValue: Int16Array;
    uint32ArrayValue: Uint32Array;
    int32ArrayValue: Int32Array;
    float32ArrayValue: Float32Array;
    float64ArrayValue: Float64Array;
  }
