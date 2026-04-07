export type BaseCodecWireCategory =
  | "fixed-width-scalar"
  | "string"
  | "string-array"
  | "binary"
  | "dynamic";

export type TsTypedArrayCtor =
  | "Uint8Array"
  | "Int8Array"
  | "Uint16Array"
  | "Int16Array"
  | "Uint32Array"
  | "Int32Array"
  | "Float32Array"
  | "Float64Array"
  | "BigInt64Array"
  | "BigUint64Array";

export interface FixedWidthScalarDescriptor {
  byteWidth: 1 | 2 | 4 | 8;
  tsViewCtor: TsTypedArrayCtor;
  cppType: string;
}

export interface BaseCodecDescriptor {
  codecId: string;
  specPath: string;
  tsType: string;
  cppType: string;
  wireCategory: BaseCodecWireCategory;
  strategySummary: string;
  fixedWidth?: FixedWidthScalarDescriptor;
}

export interface BaseCodecEncoderEmitter {
  descriptor: BaseCodecDescriptor;
  emitTsEncoder(): string;
  emitCppEncoder(): string;
}

export interface BaseCodecDecoderEmitter {
  descriptor: BaseCodecDescriptor;
  emitTsDecoder(): string;
  emitCppDecoder(): string;
}
