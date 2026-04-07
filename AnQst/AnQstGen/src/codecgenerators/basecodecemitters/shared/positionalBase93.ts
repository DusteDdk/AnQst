import { BASE93_ALPHABET } from "../../../base93";

export function emitPositionalBase93CountEncoder(functionName = "encodeBase93Count"): string {
  return `function ${functionName}(value) {
var A = "${BASE93_ALPHABET}", v = value >>> 0, out = "";
if (v === 0) return A[0];
while (v > 0) {
  out = A[v % 93] + out;
  v = (v / 93) | 0;
}
return out;
}`;
}

export function emitPositionalBase93CountDecoder(functionName = "decodeBase93Count"): string {
  return `function ${functionName}(value) {
var n = value.length, acc = 0, i, c;
for (i = 0; i < n; i++) {
  c = value.charCodeAt(i);
  acc = acc * 93 + c - 32 - (c > 34) - (c > 92);
}
return acc >>> 0;
}`;
}

export function emitPositionalBase93CountCppFunctions(): string {
  return `inline std::string encodeBase93Count(std::uint32_t value) {
  static constexpr char A[] = "${BASE93_ALPHABET}";
  if (value == 0u) return std::string(1, A[0]);
  std::string out;
  while (value > 0u) {
    out.insert(out.begin(), A[value % 93u]);
    value /= 93u;
  }
  return out;
}

inline std::uint32_t decodeBase93Count(const std::string& value) {
  std::uint32_t acc = 0;
  for (char c : value) {
    const unsigned char uc = static_cast<unsigned char>(c);
    acc = acc * 93u + static_cast<std::uint32_t>(uc - 32 - (uc > 34) - (uc > 92));
  }
  return acc;
}`;
}
