export const BASE93_ALPHABET = Array.from({ length: 95 }, (_, i) => String.fromCharCode(0x20 + i))
  .filter(c => c !== '"' && c !== '\\')
  .join('');

export function emitBase93Encoder(): string {
  return `function(d) {
var A = "${BASE93_ALPHABET}", n = d.length, f = n >>> 2, r = n & 3,
o = new Array(f * 5 + (r ? r + 1 : 0)), p = 0, i, v, b, j;
for (i = 0; i < f; i++) {
b = i << 2;
v = ((d[b] << 24) | (d[b+1] << 16) | (d[b+2] << 8) | d[b+3]) >>> 0;
o[p+4] = A[v % 93]; v = (v / 93) | 0;
o[p+3] = A[v % 93]; v = (v / 93) | 0;
o[p+2] = A[v % 93]; v = (v / 93) | 0;
o[p+1] = A[v % 93];
o[p] = A[(v / 93) | 0];
p += 5;
}
if (r) {
b = f << 2; v = 0;
for (j = 0; j < r; j++) v = (v << 8) | d[b + j];
for (j = r; j >= 0; j--) { o[p + j] = A[v % 93]; v = (v / 93) | 0; }
}
return o.join("");
}`;
}

export function emitBase93Decoder(): string {
  return `function(s) {
var n = s.length, f = (n / 5) | 0, r = n - f * 5,
o = new Uint8Array(f * 4 + (r ? r - 1 : 0)), p = 0, i, v, c, b;
for (i = 0; i < f; i++) {
b = i * 5;
c = s.charCodeAt(b); v = c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
c = s.charCodeAt(b + 1); v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
c = s.charCodeAt(b + 2); v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
c = s.charCodeAt(b + 3); v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
c = s.charCodeAt(b + 4); v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0);
o[p] = v >>> 24; o[p+1] = (v >>> 16) & 255; o[p+2] = (v >>> 8) & 255; o[p+3] = v & 255;
p += 4;
}
if (r) {
v = 0;
for (i = 0; i < r; i++) { c = s.charCodeAt(f * 5 + i); v = v * 93 + c - 32 - ((c > 34) ? 1 : 0) - ((c > 92) ? 1 : 0); }
for (i = r - 2; i >= 0; i--) { o[p + i] = v & 255; v = (v / 256) | 0; }
}
return o;
}`;
}

export function emitBase93CppFunctions(): string {
  return `inline int base93AlphabetIndex(char c) {
  const unsigned char uc = static_cast<unsigned char>(c);
  return static_cast<int>(uc) - 32 - (uc > 34) - (uc > 92);
}

inline std::string base93Encode(const std::vector<std::uint8_t>& d) {
  static constexpr char A[] = "${BASE93_ALPHABET}";
  const std::size_t n = d.size();
  const std::size_t f = n >> 2;
  const std::size_t r = n & 3;
  std::string o(f * 5 + (r ? r + 1 : 0), '\\0');
  std::size_t p = 0;
  for (std::size_t i = 0; i < f; ++i) {
    const std::size_t b = i << 2;
    std::uint32_t v =
      (static_cast<std::uint32_t>(d[b]) << 24) |
      (static_cast<std::uint32_t>(d[b + 1]) << 16) |
      (static_cast<std::uint32_t>(d[b + 2]) << 8) |
      static_cast<std::uint32_t>(d[b + 3]);
    o[p + 4] = A[v % 93u]; v /= 93u;
    o[p + 3] = A[v % 93u]; v /= 93u;
    o[p + 2] = A[v % 93u]; v /= 93u;
    o[p + 1] = A[v % 93u];
    o[p] = A[v / 93u];
    p += 5;
  }
  if (r) {
    const std::size_t b = f << 2;
    std::uint32_t v = 0;
    for (std::size_t j = 0; j < r; ++j) v = (v << 8) | d[b + j];
    for (std::size_t j = r + 1; j-- > 0;) {
      o[p + j] = A[v % 93u];
      v /= 93u;
    }
  }
  return o;
}

inline std::vector<std::uint8_t> base93Decode(const std::string& s) {
  const std::size_t n = s.size();
  const std::size_t f = n / 5;
  const std::size_t r = n - f * 5;
  std::vector<std::uint8_t> o(f * 4 + (r ? r - 1 : 0));
  std::size_t p = 0;
  for (std::size_t i = 0; i < f; ++i) {
    const std::size_t b = i * 5;
    std::uint32_t v = static_cast<std::uint32_t>(base93AlphabetIndex(s[b]));
    v = v * 93u + static_cast<std::uint32_t>(base93AlphabetIndex(s[b + 1]));
    v = v * 93u + static_cast<std::uint32_t>(base93AlphabetIndex(s[b + 2]));
    v = v * 93u + static_cast<std::uint32_t>(base93AlphabetIndex(s[b + 3]));
    v = v * 93u + static_cast<std::uint32_t>(base93AlphabetIndex(s[b + 4]));
    o[p] = static_cast<std::uint8_t>(v >> 24);
    o[p + 1] = static_cast<std::uint8_t>((v >> 16) & 255u);
    o[p + 2] = static_cast<std::uint8_t>((v >> 8) & 255u);
    o[p + 3] = static_cast<std::uint8_t>(v & 255u);
    p += 4;
  }
  if (r) {
    std::uint32_t v = 0;
    for (std::size_t i = 0; i < r; ++i) {
      v = v * 93u + static_cast<std::uint32_t>(base93AlphabetIndex(s[f * 5 + i]));
    }
    for (std::size_t i = r - 1; i-- > 0;) {
      o[p + i] = static_cast<std::uint8_t>(v & 255u);
      v /= 256u;
    }
  }
  return o;
}`;
}
