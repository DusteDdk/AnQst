#pragma once

#include <QString>

#include <cstdint>
#include <vector>

QString anqstBase93Encode(const std::vector<std::uint8_t>& bytes);
std::vector<std::uint8_t> anqstBase93Decode(const QString& encoded);
