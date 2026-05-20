#pragma once

#include "AnQstWebBaseAbi.h"

#include <QString>

#include <cstdint>
#include <vector>

namespace ANQST_WEBBASE_NAMESPACE {

QString anqstBase93Encode(const std::vector<std::uint8_t>& bytes);
std::vector<std::uint8_t> anqstBase93Decode(const QString& encoded);

} // namespace ANQST_WEBBASE_NAMESPACE
