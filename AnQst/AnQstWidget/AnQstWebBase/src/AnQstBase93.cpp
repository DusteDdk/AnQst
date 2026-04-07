#include "AnQstBase93.h"

#include <QChar>

#include <cstddef>

namespace {
constexpr char kBase93Alphabet[] =
    " !#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~";

inline int base93AlphabetIndex(QChar c) {
    const unsigned int uc = c.unicode();
    return static_cast<int>(uc) - 32 - static_cast<int>(uc > 34u) - static_cast<int>(uc > 92u);
}
} // namespace

QString anqstBase93Encode(const std::vector<std::uint8_t>& bytes) {
    const std::size_t inputSize = bytes.size();
    const std::size_t fullBlocks = inputSize >> 2;
    const std::size_t remainder = inputSize & 3u;
    QString output(static_cast<qsizetype>(fullBlocks * 5 + (remainder ? remainder + 1 : 0)), QChar(u'\0'));
    QChar* out = output.data();
    std::size_t writeOffset = 0;
    for (std::size_t i = 0; i < fullBlocks; ++i) {
        const std::size_t byteOffset = i << 2;
        std::uint32_t value =
            (static_cast<std::uint32_t>(bytes[byteOffset]) << 24) |
            (static_cast<std::uint32_t>(bytes[byteOffset + 1]) << 16) |
            (static_cast<std::uint32_t>(bytes[byteOffset + 2]) << 8) |
            static_cast<std::uint32_t>(bytes[byteOffset + 3]);
        out[static_cast<qsizetype>(writeOffset + 4)] = QChar::fromLatin1(kBase93Alphabet[value % 93u]);
        value /= 93u;
        out[static_cast<qsizetype>(writeOffset + 3)] = QChar::fromLatin1(kBase93Alphabet[value % 93u]);
        value /= 93u;
        out[static_cast<qsizetype>(writeOffset + 2)] = QChar::fromLatin1(kBase93Alphabet[value % 93u]);
        value /= 93u;
        out[static_cast<qsizetype>(writeOffset + 1)] = QChar::fromLatin1(kBase93Alphabet[value % 93u]);
        out[static_cast<qsizetype>(writeOffset)] = QChar::fromLatin1(kBase93Alphabet[value / 93u]);
        writeOffset += 5;
    }
    if (remainder != 0u) {
        const std::size_t byteOffset = fullBlocks << 2;
        std::uint32_t value = 0;
        for (std::size_t j = 0; j < remainder; ++j) {
            value = (value << 8) | bytes[byteOffset + j];
        }
        for (std::size_t j = remainder + 1; j-- > 0;) {
            out[static_cast<qsizetype>(writeOffset + j)] = QChar::fromLatin1(kBase93Alphabet[value % 93u]);
            value /= 93u;
        }
    }
    return output;
}

std::vector<std::uint8_t> anqstBase93Decode(const QString& encoded) {
    const std::size_t inputSize = static_cast<std::size_t>(encoded.size());
    const std::size_t fullBlocks = inputSize / 5;
    const std::size_t remainder = inputSize - fullBlocks * 5;
    std::vector<std::uint8_t> output(fullBlocks * 4 + (remainder ? remainder - 1 : 0));
    const QChar* in = encoded.constData();
    std::size_t writeOffset = 0;
    for (std::size_t i = 0; i < fullBlocks; ++i) {
        const std::size_t charOffset = i * 5;
        std::uint32_t value = static_cast<std::uint32_t>(base93AlphabetIndex(in[static_cast<qsizetype>(charOffset)]));
        value = value * 93u + static_cast<std::uint32_t>(base93AlphabetIndex(in[static_cast<qsizetype>(charOffset + 1)]));
        value = value * 93u + static_cast<std::uint32_t>(base93AlphabetIndex(in[static_cast<qsizetype>(charOffset + 2)]));
        value = value * 93u + static_cast<std::uint32_t>(base93AlphabetIndex(in[static_cast<qsizetype>(charOffset + 3)]));
        value = value * 93u + static_cast<std::uint32_t>(base93AlphabetIndex(in[static_cast<qsizetype>(charOffset + 4)]));
        output[writeOffset] = static_cast<std::uint8_t>(value >> 24);
        output[writeOffset + 1] = static_cast<std::uint8_t>((value >> 16) & 255u);
        output[writeOffset + 2] = static_cast<std::uint8_t>((value >> 8) & 255u);
        output[writeOffset + 3] = static_cast<std::uint8_t>(value & 255u);
        writeOffset += 4;
    }
    if (remainder != 0u) {
        std::uint32_t value = 0;
        for (std::size_t i = 0; i < remainder; ++i) {
            value = value * 93u + static_cast<std::uint32_t>(
                                      base93AlphabetIndex(in[static_cast<qsizetype>(fullBlocks * 5 + i)]));
        }
        for (std::size_t i = remainder - 1; i-- > 0;) {
            output[writeOffset + i] = static_cast<std::uint8_t>(value & 255u);
            value /= 256u;
        }
    }
    return output;
}
