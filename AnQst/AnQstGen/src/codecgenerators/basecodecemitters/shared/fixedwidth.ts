import type { FixedWidthScalarDescriptor } from "./contracts";

function tsScalarBufferInit(descriptor: FixedWidthScalarDescriptor, valueExpr: string): string[] {
  return [
    `const buf = new ArrayBuffer(${descriptor.byteWidth});`,
    `new ${descriptor.tsViewCtor}(buf)[0] = ${valueExpr};`,
    "const bytes = new Uint8Array(buf);"
  ];
}

function tsScalarBufferRead(descriptor: FixedWidthScalarDescriptor, bytesExpr: string): string[] {
  return [
    `const buf = new ArrayBuffer(${descriptor.byteWidth});`,
    `new Uint8Array(buf).set(${bytesExpr});`,
    `return new ${descriptor.tsViewCtor}(buf)[0];`
  ];
}

export function emitTsFixedWidthStandaloneEncoder(
  functionName: string,
  descriptor: FixedWidthScalarDescriptor,
  valueExpr = "value"
): string {
  const lines = [
    `function ${functionName}(value) {`,
    ...tsScalarBufferInit(descriptor, valueExpr).map((line) => `  ${line}`),
    "  return base93Encode(bytes);",
    "}"
  ];
  return lines.join("\n");
}

export function emitTsFixedWidthStandaloneDecoder(
  functionName: string,
  descriptor: FixedWidthScalarDescriptor
): string {
  const lines = [
    `function ${functionName}(encoded) {`,
    "  const bytes = base93Decode(encoded);",
    ...tsScalarBufferRead(descriptor, "bytes").map((line) => `  ${line}`),
    "}"
  ];
  return lines.join("\n");
}

export function emitCppFixedWidthStandaloneEncoder(
  functionName: string,
  descriptor: FixedWidthScalarDescriptor
): string {
  return `inline std::string ${functionName}(const ${descriptor.cppType}& value) {
  std::array<std::uint8_t, ${descriptor.byteWidth}> bytes{};
  std::memcpy(bytes.data(), &value, ${descriptor.byteWidth});
  return base93Encode(std::vector<std::uint8_t>(bytes.begin(), bytes.end()));
}`;
}

export function emitCppFixedWidthStandaloneDecoder(
  functionName: string,
  descriptor: FixedWidthScalarDescriptor
): string {
  return `inline ${descriptor.cppType} ${functionName}(const std::string& encoded) {
  const std::vector<std::uint8_t> bytes = base93Decode(encoded);
  ${descriptor.cppType} value{};
  std::memcpy(&value, bytes.data(), ${descriptor.byteWidth});
  return value;
}`;
}
