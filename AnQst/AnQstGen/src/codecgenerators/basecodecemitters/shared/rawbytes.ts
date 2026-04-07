export function emitTsRawByteStandaloneEncoder(functionName: string, valueToBytesExpr: string): string {
  return `function ${functionName}(value) {
  const bytes = ${valueToBytesExpr};
  return base93Encode(bytes);
}`;
}

export function emitTsRawByteStandaloneDecoder(functionName: string, bytesToValueExpr: string): string {
  return `function ${functionName}(encoded) {
  const bytes = base93Decode(encoded);
  return ${bytesToValueExpr};
}`;
}

export function emitCppRawByteStandaloneEncoder(functionName: string, valueToBytesExpr: string): string {
  return `inline std::string ${functionName}(const QByteArray& value) {
  const std::vector<std::uint8_t> bytes = ${valueToBytesExpr};
  return base93Encode(bytes);
}`;
}

export function emitCppRawByteStandaloneDecoder(functionName: string, bytesToValueExpr: string): string {
  return `inline QByteArray ${functionName}(const std::string& encoded) {
  const std::vector<std::uint8_t> bytes = base93Decode(encoded);
  return ${bytesToValueExpr};
}`;
}
