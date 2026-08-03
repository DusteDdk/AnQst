#include "include/CdEntryEditorWidget.h"
#include "AnQstBase93.h"
#include <QDebug>
#include <QElapsedTimer>
#include <QEventLoop>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QMetaType>
#include <QTimer>
#include <cstring>
#include <cstdint>
#include <string>
#include <vector>
#include <stdexcept>

using namespace CdEntryEditor;

extern int qInitResources_CdEntryEditor();

namespace {
void registerGeneratedMetaTypes() {
    static const bool registered = []() {
        qRegisterMetaType<CdEntryEditor::Genre>("CdEntryEditor::Genre");
        qRegisterMetaType<QList<CdEntryEditor::Genre>>("QList<CdEntryEditor::Genre>");
        qRegisterMetaType<CdEntryEditor::Track>("CdEntryEditor::Track");
        qRegisterMetaType<QList<CdEntryEditor::Track>>("QList<CdEntryEditor::Track>");
        qRegisterMetaType<CdEntryEditor::User_meta>("CdEntryEditor::User_meta");
        qRegisterMetaType<QList<CdEntryEditor::User_meta>>("QList<CdEntryEditor::User_meta>");
        qRegisterMetaType<CdEntryEditor::User>("CdEntryEditor::User");
        qRegisterMetaType<QList<CdEntryEditor::User>>("QList<CdEntryEditor::User>");
        qRegisterMetaType<CdEntryEditor::CdDraft>("CdEntryEditor::CdDraft");
        qRegisterMetaType<QList<CdEntryEditor::CdDraft>>("QList<CdEntryEditor::CdDraft>");
        qRegisterMetaType<CdEntryEditor::ValidationResult>("CdEntryEditor::ValidationResult");
        qRegisterMetaType<QList<CdEntryEditor::ValidationResult>>("QList<CdEntryEditor::ValidationResult>");
        qRegisterMetaType<CdEntryEditor::SaveResult>("CdEntryEditor::SaveResult");
        qRegisterMetaType<QList<CdEntryEditor::SaveResult>>("QList<CdEntryEditor::SaveResult>");
        return true;
    }();
    Q_UNUSED(registered);
}

inline QVariantList anqstNormalizeWireItems(const QVariant& wire) {
    return wire.type() == QVariant::List ? wire.toList() : QVariantList{wire};
}

inline QVariant anqstFinalizeWire(const std::vector<std::uint8_t>& bytes, const QVariantList& items) {
    if (bytes.empty()) {
        if (items.size() == 1) return items.front();
        return items;
    }
    QVariantList out;
    out.reserve(static_cast<qsizetype>(items.size() + 1));
    out.push_back(anqstwebbase_1_7_7::anqstBase93Encode(bytes));
    for (const auto& item : items) out.push_back(item);
    return out;
}


inline QVariant encodeAnQstStructured_string(const QString& value) {
    return QVariant::fromValue(value);
}

inline QString decodeAnQstStructured_string(const QVariant& wire) {
    return wire.toString();
}

inline void anqstNamed_AnQstStructured_Genre_Genre_encode(
    const Genre& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
);
inline Genre anqstNamed_AnQstStructured_Genre_Genre_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
);

inline void anqstNamed_AnQstStructured_Genre_Genre_encode(
    const Genre& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
) {
    std::uint32_t code1 = 0;
    switch (value) {
    case Genre::Rock: code1 = 0; break;
    case Genre::Pop: code1 = 1; break;
    case Genre::Jazz: code1 = 2; break;
    case Genre::Classical: code1 = 3; break;
    case Genre::Electronic: code1 = 4; break;
    case Genre::Other: code1 = 5; break;
    default: throw std::runtime_error("AnQst finite-domain encode received an unsupported value.");
    }
    bytes.push_back(static_cast<std::uint8_t>(static_cast<std::uint8_t>(code1)));
}

inline Genre anqstNamed_AnQstStructured_Genre_Genre_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
) {
    Genre value1{};
    const auto code2 = static_cast<std::uint8_t>((blob[dataOffset++]));
    value1 = Genre::Rock;
    switch (code2) {
    case 0: value1 = Genre::Rock; break;
    case 1: value1 = Genre::Pop; break;
    case 2: value1 = Genre::Jazz; break;
    case 3: value1 = Genre::Classical; break;
    case 4: value1 = Genre::Electronic; break;
    case 5: value1 = Genre::Other; break;
    }
    return value1;
}

inline QVariant encodeAnQstStructured_Genre(const QList<Genre>& value) {
    std::vector<std::uint8_t> bytes;
    QVariantList items;
    for (const auto& item1 : value) {
        anqstNamed_AnQstStructured_Genre_Genre_encode(item1, bytes, items);
    }
    return anqstFinalizeWire(bytes, items);
}

inline QList<Genre> decodeAnQstStructured_Genre(const QVariant& wire) {
    const QVariantList items = anqstNormalizeWireItems(wire);
    const std::vector<std::uint8_t> blob = (items.isEmpty() ? std::vector<std::uint8_t>{} : anqstwebbase_1_7_7::anqstBase93Decode(items.value(0).toString()));
    std::size_t itemIndex = 1;
    std::size_t dataOffset = 0;
    QList<Genre> array1;
    const std::size_t remaining3 = blob.size() - dataOffset;
    const std::uint32_t count2 = static_cast<std::uint32_t>(remaining3 / 1);
    array1.reserve(static_cast<qsizetype>(count2));
    for (std::uint32_t i = 0; i < count2; ++i) {
        array1.push_back(anqstNamed_AnQstStructured_Genre_Genre_decode(items, blob, itemIndex, dataOffset));
    }
    const QList<Genre> result = array1;


    return result;
}

inline void anqstNamed_AnQstStructured_ValidationResult_ValidationResult_encode(
    const ValidationResult& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
);
inline ValidationResult anqstNamed_AnQstStructured_ValidationResult_ValidationResult_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
);

inline void anqstNamed_AnQstStructured_ValidationResult_ValidationResult_encode(
    const ValidationResult& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
) {
    bytes.push_back(value.valid ? 1u : 0u);
    items.push_back(value.message);
    const bool present1 = value.field.has_value();
    bytes.push_back(static_cast<std::uint8_t>(present1 ? 1u : 0u));
    if (present1) {
        items.push_back(value.field.value());
    }
}

inline ValidationResult anqstNamed_AnQstStructured_ValidationResult_ValidationResult_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
) {
    ValidationResult value1{};
    value1.valid = (((blob[dataOffset++]) & 1u) != 0u);
    value1.message = items[static_cast<int>(itemIndex++)].toString();
    const bool present2 = static_cast<std::uint8_t>((blob[dataOffset++])) != 0u;
    if (present2) {
        value1.field = items[static_cast<int>(itemIndex++)].toString();
    }
    return value1;
}

inline QVariant encodeAnQstStructured_ValidationResult(const ValidationResult& value) {
    std::vector<std::uint8_t> bytes;
    QVariantList items;
    anqstNamed_AnQstStructured_ValidationResult_ValidationResult_encode(value, bytes, items);
    return anqstFinalizeWire(bytes, items);
}

inline ValidationResult decodeAnQstStructured_ValidationResult(const QVariant& wire) {
    const QVariantList items = anqstNormalizeWireItems(wire);
    const std::vector<std::uint8_t> blob = (items.isEmpty() ? std::vector<std::uint8_t>{} : anqstwebbase_1_7_7::anqstBase93Decode(items.value(0).toString()));
    std::size_t itemIndex = 1;
    std::size_t dataOffset = 0;

    const ValidationResult result = anqstNamed_AnQstStructured_ValidationResult_ValidationResult_decode(items, blob, itemIndex, dataOffset);


    return result;
}

inline void anqstNamed_AnQstStructured_CdDraft_CdDraft_encode(
    const CdDraft& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
);
inline CdDraft anqstNamed_AnQstStructured_CdDraft_CdDraft_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
);
inline void anqstNamed_AnQstStructured_CdDraft_Genre_encode(
    const Genre& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
);
inline Genre anqstNamed_AnQstStructured_CdDraft_Genre_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
);
inline void anqstNamed_AnQstStructured_CdDraft_Track_encode(
    const Track& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
);
inline Track anqstNamed_AnQstStructured_CdDraft_Track_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
);
inline void anqstNamed_AnQstStructured_CdDraft_User_encode(
    const User& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
);
inline User anqstNamed_AnQstStructured_CdDraft_User_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
);

inline void anqstNamed_AnQstStructured_CdDraft_CdDraft_encode(
    const CdDraft& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
) {
    const std::uint64_t u641 = static_cast<std::uint64_t>(value.cdId);
    for (int shift = 0; shift < 64; shift += 8) bytes.push_back(static_cast<std::uint8_t>((u641 >> shift) & 0xffu));
    items.push_back(value.artist);
    items.push_back(value.albumTitle);
    const std::uint32_t u322 = static_cast<std::uint32_t>(value.releaseYear);
    bytes.push_back(static_cast<std::uint8_t>(u322 & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u322 >> 8) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u322 >> 16) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u322 >> 24) & 0xffu));
    anqstNamed_AnQstStructured_CdDraft_Genre_encode(value.genre, bytes, items);
    items.push_back(value.catalogNumber);
    items.push_back(value.barcode);
    const std::uint32_t u323 = static_cast<std::uint32_t>(static_cast<std::uint32_t>(value.tracks.size()));
    bytes.push_back(static_cast<std::uint8_t>(u323 & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u323 >> 8) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u323 >> 16) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u323 >> 24) & 0xffu));
    for (const auto& item4 : value.tracks) {
        anqstNamed_AnQstStructured_CdDraft_Track_encode(item4, bytes, items);
    }
    items.push_back(value.notes);
    anqstNamed_AnQstStructured_CdDraft_User_encode(value.createdBy, bytes, items);
}

inline CdDraft anqstNamed_AnQstStructured_CdDraft_CdDraft_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
) {
    CdDraft value1{};
    std::uint64_t u642 = 0;
    for (int shift = 0; shift < 64; shift += 8) {
        u642 |= (static_cast<std::uint64_t>(blob[dataOffset++]) << shift);
    }
    value1.cdId = static_cast<qint64>(static_cast<std::int64_t>(u642));
    value1.artist = items[static_cast<int>(itemIndex++)].toString();
    value1.albumTitle = items[static_cast<int>(itemIndex++)].toString();
    const std::uint32_t u323 =
        static_cast<std::uint32_t>(blob[dataOffset])
        | (static_cast<std::uint32_t>(blob[dataOffset + 1]) << 8)
        | (static_cast<std::uint32_t>(blob[dataOffset + 2]) << 16)
        | (static_cast<std::uint32_t>(blob[dataOffset + 3]) << 24);
    dataOffset += 4;
    value1.releaseYear = static_cast<qint32>(static_cast<std::int32_t>(u323));
    value1.genre = anqstNamed_AnQstStructured_CdDraft_Genre_decode(items, blob, itemIndex, dataOffset);
    value1.catalogNumber = items[static_cast<int>(itemIndex++)].toString();
    value1.barcode = items[static_cast<int>(itemIndex++)].toString();
    QList<Track> array4;
    const std::uint32_t u326 =
        static_cast<std::uint32_t>(blob[dataOffset])
        | (static_cast<std::uint32_t>(blob[dataOffset + 1]) << 8)
        | (static_cast<std::uint32_t>(blob[dataOffset + 2]) << 16)
        | (static_cast<std::uint32_t>(blob[dataOffset + 3]) << 24);
    dataOffset += 4;
    const std::uint32_t count5 = u326;
    array4.reserve(static_cast<qsizetype>(count5));
    for (std::uint32_t i = 0; i < count5; ++i) {
        array4.push_back(anqstNamed_AnQstStructured_CdDraft_Track_decode(items, blob, itemIndex, dataOffset));
    }
    value1.tracks = array4;
    value1.notes = items[static_cast<int>(itemIndex++)].toString();
    value1.createdBy = anqstNamed_AnQstStructured_CdDraft_User_decode(items, blob, itemIndex, dataOffset);
    return value1;
}

inline void anqstNamed_AnQstStructured_CdDraft_Genre_encode(
    const Genre& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
) {
    std::uint32_t code1 = 0;
    switch (value) {
    case Genre::Rock: code1 = 0; break;
    case Genre::Pop: code1 = 1; break;
    case Genre::Jazz: code1 = 2; break;
    case Genre::Classical: code1 = 3; break;
    case Genre::Electronic: code1 = 4; break;
    case Genre::Other: code1 = 5; break;
    default: throw std::runtime_error("AnQst finite-domain encode received an unsupported value.");
    }
    bytes.push_back(static_cast<std::uint8_t>(static_cast<std::uint8_t>(code1)));
}

inline Genre anqstNamed_AnQstStructured_CdDraft_Genre_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
) {
    Genre value1{};
    const auto code2 = static_cast<std::uint8_t>((blob[dataOffset++]));
    value1 = Genre::Rock;
    switch (code2) {
    case 0: value1 = Genre::Rock; break;
    case 1: value1 = Genre::Pop; break;
    case 2: value1 = Genre::Jazz; break;
    case 3: value1 = Genre::Classical; break;
    case 4: value1 = Genre::Electronic; break;
    case 5: value1 = Genre::Other; break;
    }
    return value1;
}

inline void anqstNamed_AnQstStructured_CdDraft_Track_encode(
    const Track& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
) {
    items.push_back(value.title);
    const double float2 = static_cast<double>(value.durationSeconds);
    std::uint64_t bits1 = 0;
    std::memcpy(&bits1, &float2, sizeof(bits1));
    for (int shift = 0; shift < 64; shift += 8) bytes.push_back(static_cast<std::uint8_t>((bits1 >> shift) & 0xffu));
}

inline Track anqstNamed_AnQstStructured_CdDraft_Track_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
) {
    Track value1{};
    value1.title = items[static_cast<int>(itemIndex++)].toString();
    std::uint64_t u642 = 0;
    for (int shift = 0; shift < 64; shift += 8) {
        u642 |= (static_cast<std::uint64_t>(blob[dataOffset++]) << shift);
    }
    double float3 = 0.0;
    std::memcpy(&float3, &u642, sizeof(float3));
    value1.durationSeconds = float3;
    return value1;
}

inline void anqstNamed_AnQstStructured_CdDraft_User_encode(
    const User& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
) {
    items.push_back(value.name);
    const std::uint32_t u321 = static_cast<std::uint32_t>(static_cast<std::uint32_t>(value.meta.friends.size()));
    bytes.push_back(static_cast<std::uint8_t>(u321 & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u321 >> 8) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u321 >> 16) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u321 >> 24) & 0xffu));
    for (const auto& item2 : value.meta.friends) {
        const double float4 = static_cast<double>(item2);
        std::uint64_t bits3 = 0;
        std::memcpy(&bits3, &float4, sizeof(bits3));
        for (int shift = 0; shift < 64; shift += 8) bytes.push_back(static_cast<std::uint8_t>((bits3 >> shift) & 0xffu));
    }
}

inline User anqstNamed_AnQstStructured_CdDraft_User_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
) {
    User value1{};
    value1.name = items[static_cast<int>(itemIndex++)].toString();
    User_meta value2{};
    QList<double> array3;
    const std::uint32_t u325 =
        static_cast<std::uint32_t>(blob[dataOffset])
        | (static_cast<std::uint32_t>(blob[dataOffset + 1]) << 8)
        | (static_cast<std::uint32_t>(blob[dataOffset + 2]) << 16)
        | (static_cast<std::uint32_t>(blob[dataOffset + 3]) << 24);
    dataOffset += 4;
    const std::uint32_t count4 = u325;
    array3.reserve(static_cast<qsizetype>(count4));
    for (std::uint32_t i = 0; i < count4; ++i) {
        std::uint64_t u646 = 0;
        for (int shift = 0; shift < 64; shift += 8) {
            u646 |= (static_cast<std::uint64_t>(blob[dataOffset++]) << shift);
        }
        double float7 = 0.0;
        std::memcpy(&float7, &u646, sizeof(float7));
        array3.push_back(float7);
    }
    value2.friends = array3;
    value1.meta = value2;
    return value1;
}

inline QVariant encodeAnQstStructured_CdDraft(const CdDraft& value) {
    std::vector<std::uint8_t> bytes;
    QVariantList items;
    anqstNamed_AnQstStructured_CdDraft_CdDraft_encode(value, bytes, items);
    return anqstFinalizeWire(bytes, items);
}

inline CdDraft decodeAnQstStructured_CdDraft(const QVariant& wire) {
    const QVariantList items = anqstNormalizeWireItems(wire);
    const std::vector<std::uint8_t> blob = (items.isEmpty() ? std::vector<std::uint8_t>{} : anqstwebbase_1_7_7::anqstBase93Decode(items.value(0).toString()));
    std::size_t itemIndex = 1;
    std::size_t dataOffset = 0;

    const CdDraft result = anqstNamed_AnQstStructured_CdDraft_CdDraft_decode(items, blob, itemIndex, dataOffset);


    return result;
}

inline QVariant encodeAnQstStructured_number(const double& value) {
    std::vector<std::uint8_t> bytes;
    const double float2 = static_cast<double>(value);
    std::uint64_t bits1 = 0;
    std::memcpy(&bits1, &float2, sizeof(bits1));
    for (int shift = 0; shift < 64; shift += 8) bytes.push_back(static_cast<std::uint8_t>((bits1 >> shift) & 0xffu));
    return anqstwebbase_1_7_7::anqstBase93Encode(bytes);
}

inline double decodeAnQstStructured_number(const QVariant& wire) {
    const std::vector<std::uint8_t> blob = anqstwebbase_1_7_7::anqstBase93Decode(wire.toString());
    std::size_t dataOffset = 0;
    std::uint64_t u641 = 0;
    for (int shift = 0; shift < 64; shift += 8) {
        u641 |= (static_cast<std::uint64_t>(blob[dataOffset++]) << shift);
    }
    double float2 = 0.0;
    std::memcpy(&float2, &u641, sizeof(float2));
    const double result = float2;

    return result;
}

inline void anqstNamed_AnQstStructured_Track_Track_encode(
    const Track& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
);
inline Track anqstNamed_AnQstStructured_Track_Track_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
);

inline void anqstNamed_AnQstStructured_Track_Track_encode(
    const Track& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
) {
    items.push_back(value.title);
    const double float2 = static_cast<double>(value.durationSeconds);
    std::uint64_t bits1 = 0;
    std::memcpy(&bits1, &float2, sizeof(bits1));
    for (int shift = 0; shift < 64; shift += 8) bytes.push_back(static_cast<std::uint8_t>((bits1 >> shift) & 0xffu));
}

inline Track anqstNamed_AnQstStructured_Track_Track_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
) {
    Track value1{};
    value1.title = items[static_cast<int>(itemIndex++)].toString();
    std::uint64_t u642 = 0;
    for (int shift = 0; shift < 64; shift += 8) {
        u642 |= (static_cast<std::uint64_t>(blob[dataOffset++]) << shift);
    }
    double float3 = 0.0;
    std::memcpy(&float3, &u642, sizeof(float3));
    value1.durationSeconds = float3;
    return value1;
}

inline QVariant encodeAnQstStructured_Track(const QList<Track>& value) {
    std::vector<std::uint8_t> bytes;
    QVariantList items;
    for (const auto& item1 : value) {
        anqstNamed_AnQstStructured_Track_Track_encode(item1, bytes, items);
    }
    return anqstFinalizeWire(bytes, items);
}

inline QList<Track> decodeAnQstStructured_Track(const QVariant& wire) {
    const QVariantList items = anqstNormalizeWireItems(wire);
    const std::vector<std::uint8_t> blob = (items.isEmpty() ? std::vector<std::uint8_t>{} : anqstwebbase_1_7_7::anqstBase93Decode(items.value(0).toString()));
    std::size_t itemIndex = 1;
    std::size_t dataOffset = 0;
    QList<Track> array1;
    const std::size_t remaining3 = blob.size() - dataOffset;
    const std::uint32_t count2 = static_cast<std::uint32_t>(remaining3 / 8);
    array1.reserve(static_cast<qsizetype>(count2));
    for (std::uint32_t i = 0; i < count2; ++i) {
        array1.push_back(anqstNamed_AnQstStructured_Track_Track_decode(items, blob, itemIndex, dataOffset));
    }
    const QList<Track> result = array1;


    return result;
}

inline void anqstNamed_AnQstStructured_SaveResult_SaveResult_encode(
    const SaveResult& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
);
inline SaveResult anqstNamed_AnQstStructured_SaveResult_SaveResult_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
);

inline void anqstNamed_AnQstStructured_SaveResult_SaveResult_encode(
    const SaveResult& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
) {
    bytes.push_back(value.saved ? 1u : 0u);
    const std::uint64_t u641 = static_cast<std::uint64_t>(value.cdId);
    for (int shift = 0; shift < 64; shift += 8) bytes.push_back(static_cast<std::uint8_t>((u641 >> shift) & 0xffu));
    items.push_back(value.message);
}

inline SaveResult anqstNamed_AnQstStructured_SaveResult_SaveResult_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
) {
    SaveResult value1{};
    value1.saved = (((blob[dataOffset++]) & 1u) != 0u);
    std::uint64_t u642 = 0;
    for (int shift = 0; shift < 64; shift += 8) {
        u642 |= (static_cast<std::uint64_t>(blob[dataOffset++]) << shift);
    }
    value1.cdId = static_cast<qint64>(static_cast<std::int64_t>(u642));
    value1.message = items[static_cast<int>(itemIndex++)].toString();
    return value1;
}

inline QVariant encodeAnQstStructured_SaveResult(const SaveResult& value) {
    std::vector<std::uint8_t> bytes;
    QVariantList items;
    anqstNamed_AnQstStructured_SaveResult_SaveResult_encode(value, bytes, items);
    return anqstFinalizeWire(bytes, items);
}

inline SaveResult decodeAnQstStructured_SaveResult(const QVariant& wire) {
    const QVariantList items = anqstNormalizeWireItems(wire);
    const std::vector<std::uint8_t> blob = (items.isEmpty() ? std::vector<std::uint8_t>{} : anqstwebbase_1_7_7::anqstBase93Decode(items.value(0).toString()));
    std::size_t itemIndex = 1;
    std::size_t dataOffset = 0;

    const SaveResult result = anqstNamed_AnQstStructured_SaveResult_SaveResult_decode(items, blob, itemIndex, dataOffset);


    return result;
}

inline QVariant encodeAnQstStructured_boolean(const bool& value) {
    std::vector<std::uint8_t> bytes;
    bytes.push_back(value ? 1u : 0u);
    return anqstwebbase_1_7_7::anqstBase93Encode(bytes);
}

inline bool decodeAnQstStructured_boolean(const QVariant& wire) {
    const std::vector<std::uint8_t> blob = anqstwebbase_1_7_7::anqstBase93Decode(wire.toString());
    std::size_t dataOffset = 0;

    const bool result = (((blob[dataOffset++]) & 1u) != 0u);

    return result;
}
}

QByteArray CdEntryEditorWidget::encodeDragDropPayload_CdDraft(const CdDraft& payload) {
    const QVariant wire = encodeAnQstStructured_CdDraft(payload);
    if (wire.type() == QVariant::List) {
        QByteArray out;
        out.append('A');
        out.append(QJsonDocument(QJsonArray::fromVariantList(wire.toList())).toJson(QJsonDocument::Compact));
        return out;
    }
    throw std::runtime_error("AnQst drag/drop payload codec emitted an unsupported top-level carrier.");
}

std::optional<CdDraft> CdEntryEditorWidget::decodeDragDropPayload_CdDraft(const QByteArray& rawPayload) {
    if (rawPayload.isEmpty()) {
        return std::nullopt;
    }
    const char transportTag = rawPayload.at(0);
    const QByteArray payloadBytes = rawPayload.mid(1);
    if (transportTag == 'A') {
        QJsonParseError parseError;
        const QJsonDocument document = QJsonDocument::fromJson(payloadBytes, &parseError);
        if (parseError.error != QJsonParseError::NoError || !document.isArray()) {
            return std::nullopt;
        }
        try {
            return decodeAnQstStructured_CdDraft(QVariant(document.array().toVariantList()));
        } catch (...) {
            return std::nullopt;
        }
    }
    return std::nullopt;
}

void CdEntryEditorWidget::handle::suggestCatalogNumber(const SuggestCatalogNumberHandler& handler) const {
    if (m_owner == nullptr) return;
    m_owner->setSuggestCatalogNumberCallHandler(handler);
}

void CdEntryEditorWidget::setSuggestCatalogNumberCallHandler(const SuggestCatalogNumberHandler& handler) {
    m_suggestCatalogNumberHandler = handler;
}

void CdEntryEditorWidget::handle::suggestGenres(const SuggestGenresHandler& handler) const {
    if (m_owner == nullptr) return;
    m_owner->setSuggestGenresCallHandler(handler);
}

void CdEntryEditorWidget::setSuggestGenresCallHandler(const SuggestGenresHandler& handler) {
    m_suggestGenresHandler = handler;
}

void CdEntryEditorWidget::handle::validateDraft(const ValidateDraftHandler& handler) const {
    if (m_owner == nullptr) return;
    m_owner->setValidateDraftCallHandler(handler);
}

void CdEntryEditorWidget::setValidateDraftCallHandler(const ValidateDraftHandler& handler) {
    m_validateDraftHandler = handler;
}

void CdEntryEditorWidget::handle::normalizeBarcode(const NormalizeBarcodeHandler& handler) const {
    if (m_owner == nullptr) return;
    m_owner->setNormalizeBarcodeCallHandler(handler);
}

void CdEntryEditorWidget::setNormalizeBarcodeCallHandler(const NormalizeBarcodeHandler& handler) {
    m_normalizeBarcodeHandler = handler;
}

void CdEntryEditorWidget::handle::saveRequested(const SaveRequestedHandler& handler) const {
    if (m_owner == nullptr) return;
    m_owner->setSaveRequestedCallHandler(handler);
}

void CdEntryEditorWidget::setSaveRequestedCallHandler(const SaveRequestedHandler& handler) {
    m_saveRequestedHandler = handler;
}

CdEntryEditorWidget::CdEntryEditorWidget(QWidget* parent) : anqstwebbase_1_7_7::AnQstWebHostBase(parent), handle(this) {
    static const bool kResourcesInitialized = []() {
        ::qInitResources_CdEntryEditor();
        return true;
    }();
    Q_UNUSED(kResourcesInitialized);
    registerGeneratedMetaTypes();
    installBridgeBindings();
    registerDropTarget(QStringLiteral("CdEntryService"), QStringLiteral("cdDropped"), QString::fromUtf8(CdEntryEditor::kDragDropMime_CdDraft));
    registerHoverTarget(QStringLiteral("CdEntryService"), QStringLiteral("cdHovering"), QString::fromUtf8(CdEntryEditor::kDragDropMime_CdDraft), 33);
    QObject::connect(this, &anqstwebbase_1_7_7::AnQstWebHostBase::anQstBridge_dropReceived, this, [this](const QString& service, const QString& member, const QVariant& payload, double x, double y) {
        if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("cdDropped")) {
            if (payload.type() != QVariant::String) {
                emitHostError(
                    QStringLiteral("DeserializationError"),
                    QStringLiteral("bridge"),
                    QStringLiteral("error"),
                    true,
                    QStringLiteral("Failed to deserialize DropTarget CdEntryService.cdDropped."),
                    {
                        {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                        {QStringLiteral("member"), QStringLiteral("cdDropped")},
                        {QStringLiteral("detail"), QStringLiteral("Host did not provide tagged drag/drop payload text.")},
                    });
                return;
            }
            const auto decodedPayload = decodeDragDropPayload_CdDraft(payload.toString().toUtf8());
            if (!decodedPayload.has_value()) {
                emitHostError(
                    QStringLiteral("DeserializationError"),
                    QStringLiteral("bridge"),
                    QStringLiteral("error"),
                    true,
                    QStringLiteral("Failed to deserialize DropTarget CdEntryService.cdDropped."),
                    {
                        {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                        {QStringLiteral("member"), QStringLiteral("cdDropped")},
                        {QStringLiteral("detail"), QStringLiteral("Tagged drag/drop payload did not match the planned boundary carrier.")},
                    });
                return;
            }
            emit cdDropped(*decodedPayload, x, y);
        }
    });
    QObject::connect(this, &anqstwebbase_1_7_7::AnQstWebHostBase::anQstBridge_hoverUpdated, this, [this](const QString& service, const QString& member, const QVariant& payload, double x, double y) {
        if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("cdHovering")) {
            if (payload.type() != QVariant::String) {
                emitHostError(
                    QStringLiteral("DeserializationError"),
                    QStringLiteral("bridge"),
                    QStringLiteral("error"),
                    true,
                    QStringLiteral("Failed to deserialize HoverTarget CdEntryService.cdHovering."),
                    {
                        {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                        {QStringLiteral("member"), QStringLiteral("cdHovering")},
                        {QStringLiteral("detail"), QStringLiteral("Host did not provide tagged drag/drop payload text.")},
                    });
                return;
            }
            const auto decodedPayload = decodeDragDropPayload_CdDraft(payload.toString().toUtf8());
            if (!decodedPayload.has_value()) {
                emitHostError(
                    QStringLiteral("DeserializationError"),
                    QStringLiteral("bridge"),
                    QStringLiteral("error"),
                    true,
                    QStringLiteral("Failed to deserialize HoverTarget CdEntryService.cdHovering."),
                    {
                        {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                        {QStringLiteral("member"), QStringLiteral("cdHovering")},
                        {QStringLiteral("detail"), QStringLiteral("Tagged drag/drop payload did not match the planned boundary carrier.")},
                    });
                return;
            }
            emit cdHovering(*decodedPayload, x, y);
        }
    });
    QObject::connect(this, &anqstwebbase_1_7_7::AnQstWebHostBase::anQstBridge_hoverLeft, this, [this](const QString& service, const QString& member) {
        if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("cdHovering")) {
            emit cdHoveringLeft();
        }
    });
    QObject::connect(this, &anqstwebbase_1_7_7::AnQstWebHostBase::onHostError, this, &CdEntryEditorWidget::diagnosticsForwarded);
    const bool rootOk = setContentRoot(QString::fromUtf8(kBootstrapContentRoot));
    const bool bridgeOk = setBridgeObject(this, QString::fromUtf8(kBootstrapBridgeObject));
    const bool loadOk = rootOk && bridgeOk && loadEntryPoint(QString::fromUtf8(kBootstrapEntryPoint));
    if (!loadOk) {
        qWarning() << "CdEntryEditor bootstrap failed.";
    }
}

CdEntryEditorWidget::~CdEntryEditorWidget() = default;

bool CdEntryEditorWidget::enableDebug() {
    return anqstwebbase_1_7_7::AnQstWebHostBase::enableDebug();
}

QString CdEntryEditorWidget::makeBindingKey(const QString& service, const QString& member) {
    return service + QStringLiteral("::") + member;
}

void CdEntryEditorWidget::removeQueuedCallById(const QString& queueKey, const QString& requestId) {
    if (!m_queuedCalls.contains(queueKey)) return;
    auto& queue = m_queuedCalls[queueKey];
    for (int i = 0; i < queue.size(); ++i) {
        if (queue[i].requestId == requestId) {
            queue.removeAt(i);
            break;
        }
    }
}

QVariant CdEntryEditorWidget::waitForCallHandlerAndInvoke(
    const QString& service,
    const QString& member,
    const QString& requestId,
    int timeoutMs,
    const std::function<QVariant()>& invokeNow) {
    const QString queueKey = makeBindingKey(service, member);
    QElapsedTimer timer;
    timer.start();
    QEventLoop loop;
    QTimer tick;
    tick.setSingleShot(true);
    QObject::connect(&tick, &QTimer::timeout, &loop, &QEventLoop::quit);
    while (true) {
        if (m_queuedCalls.contains(queueKey) && !m_queuedCalls[queueKey].isEmpty() && m_queuedCalls[queueKey].head().requestId == requestId) {
            m_queuedCalls[queueKey].dequeue();
            return invokeNow();
        }
        if (timeoutMs > 0 && timer.elapsed() >= timeoutMs) {
            removeQueuedCallById(queueKey, requestId);
            return QVariantMap{
                {QStringLiteral("code"), QStringLiteral("BridgeTimeoutError")},
                {QStringLiteral("message"), QStringLiteral("Call timed out while waiting for callback registration.")},
                {QStringLiteral("service"), service},
                {QStringLiteral("member"), member},
                {QStringLiteral("requestId"), requestId}
            };
        }
        tick.start(10);
        loop.exec();
    }
}

bool CdEntryEditorWidget::hasEmitterListeners(const QString& service, const QString& member) const {
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("dirtyChanged")) {
        return isSignalConnected(QMetaMethod::fromSignal(&CdEntryEditorWidget::dirtyChanged));
    }
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("fieldTouched")) {
        return isSignalConnected(QMetaMethod::fromSignal(&CdEntryEditorWidget::fieldTouched));
    }
    return false;
}

void CdEntryEditorWidget::installBridgeBindings() {
    setCallHandler([this](const QString& service, const QString& member, const QVariantList& args) -> QVariant {
        return handleGeneratedCall(service, member, args);
    });
    setEmitterHandler([this](const QString& service, const QString& member, const QVariantList& args) {
        handleGeneratedEmitter(service, member, args);
    });
    setInputHandler([this](const QString& service, const QString& member, const QVariant& value) {
        handleGeneratedInput(service, member, value);
    });
}

QVariant CdEntryEditorWidget::handleGeneratedCall(const QString& service, const QString& member, const QVariantList& args) {
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("suggestCatalogNumber")) {
        const QString artist = decodeAnQstStructured_string(args.value(0));
        const QString albumTitle = decodeAnQstStructured_string(args.value(1));
        const QString requestId = QStringLiteral("call-%1").arg(++m_callRequestCounter);
        const QString queueKey = makeBindingKey(QStringLiteral("CdEntryService"), QStringLiteral("suggestCatalogNumber"));
        auto invokeNow = [this, requestId, artist, albumTitle]() -> QVariant {
            if (!m_suggestCatalogNumberHandler) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("HandlerNotRegisteredError")},
                    {QStringLiteral("message"), QStringLiteral("No callback registered for Call endpoint.")},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("suggestCatalogNumber")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
            try {
                const QString result = m_suggestCatalogNumberHandler(artist, albumTitle);
                return encodeAnQstStructured_string(result);
            } catch (const std::exception& ex) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QString::fromUtf8(ex.what())},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("suggestCatalogNumber")},
                    {QStringLiteral("requestId"), requestId}
                };
            } catch (...) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QStringLiteral("Call handler threw unknown exception.")},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("suggestCatalogNumber")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
        };
        if (m_suggestCatalogNumberHandler) {
            return invokeNow();
        }
        auto& queue = m_queuedCalls[queueKey];
        if (queue.size() >= kMaxQueuedCallsPerEndpoint) {
            queue.dequeue();
        }
        queue.enqueue(PendingCallInvocation{requestId, args, QDateTime::currentDateTimeUtc()});
        return waitForCallHandlerAndInvoke(QStringLiteral("CdEntryService"), QStringLiteral("suggestCatalogNumber"), requestId, 120000, invokeNow);
    }
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("suggestGenres")) {
        const QString artist = decodeAnQstStructured_string(args.value(0));
        const QString albumTitle = decodeAnQstStructured_string(args.value(1));
        const QString requestId = QStringLiteral("call-%1").arg(++m_callRequestCounter);
        const QString queueKey = makeBindingKey(QStringLiteral("CdEntryService"), QStringLiteral("suggestGenres"));
        auto invokeNow = [this, requestId, artist, albumTitle]() -> QVariant {
            if (!m_suggestGenresHandler) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("HandlerNotRegisteredError")},
                    {QStringLiteral("message"), QStringLiteral("No callback registered for Call endpoint.")},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("suggestGenres")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
            try {
                const QList<Genre> result = m_suggestGenresHandler(artist, albumTitle);
                return encodeAnQstStructured_Genre(result);
            } catch (const std::exception& ex) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QString::fromUtf8(ex.what())},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("suggestGenres")},
                    {QStringLiteral("requestId"), requestId}
                };
            } catch (...) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QStringLiteral("Call handler threw unknown exception.")},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("suggestGenres")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
        };
        if (m_suggestGenresHandler) {
            return invokeNow();
        }
        auto& queue = m_queuedCalls[queueKey];
        if (queue.size() >= kMaxQueuedCallsPerEndpoint) {
            queue.dequeue();
        }
        queue.enqueue(PendingCallInvocation{requestId, args, QDateTime::currentDateTimeUtc()});
        return waitForCallHandlerAndInvoke(QStringLiteral("CdEntryService"), QStringLiteral("suggestGenres"), requestId, 120000, invokeNow);
    }
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("validateDraft")) {
        const CdDraft draft = decodeAnQstStructured_CdDraft(args.value(0));
        const QString requestId = QStringLiteral("call-%1").arg(++m_callRequestCounter);
        const QString queueKey = makeBindingKey(QStringLiteral("CdEntryService"), QStringLiteral("validateDraft"));
        auto invokeNow = [this, requestId, draft]() -> QVariant {
            if (!m_validateDraftHandler) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("HandlerNotRegisteredError")},
                    {QStringLiteral("message"), QStringLiteral("No callback registered for Call endpoint.")},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("validateDraft")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
            try {
                const ValidationResult result = m_validateDraftHandler(draft);
                return encodeAnQstStructured_ValidationResult(result);
            } catch (const std::exception& ex) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QString::fromUtf8(ex.what())},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("validateDraft")},
                    {QStringLiteral("requestId"), requestId}
                };
            } catch (...) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QStringLiteral("Call handler threw unknown exception.")},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("validateDraft")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
        };
        if (m_validateDraftHandler) {
            return invokeNow();
        }
        auto& queue = m_queuedCalls[queueKey];
        if (queue.size() >= kMaxQueuedCallsPerEndpoint) {
            queue.dequeue();
        }
        queue.enqueue(PendingCallInvocation{requestId, args, QDateTime::currentDateTimeUtc()});
        return waitForCallHandlerAndInvoke(QStringLiteral("CdEntryService"), QStringLiteral("validateDraft"), requestId, 120000, invokeNow);
    }
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("normalizeBarcode")) {
        const QString rawValue = decodeAnQstStructured_string(args.value(0));
        const QString requestId = QStringLiteral("call-%1").arg(++m_callRequestCounter);
        const QString queueKey = makeBindingKey(QStringLiteral("CdEntryService"), QStringLiteral("normalizeBarcode"));
        auto invokeNow = [this, requestId, rawValue]() -> QVariant {
            if (!m_normalizeBarcodeHandler) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("HandlerNotRegisteredError")},
                    {QStringLiteral("message"), QStringLiteral("No callback registered for Call endpoint.")},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("normalizeBarcode")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
            try {
                const QString result = m_normalizeBarcodeHandler(rawValue);
                return encodeAnQstStructured_string(result);
            } catch (const std::exception& ex) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QString::fromUtf8(ex.what())},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("normalizeBarcode")},
                    {QStringLiteral("requestId"), requestId}
                };
            } catch (...) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QStringLiteral("Call handler threw unknown exception.")},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("normalizeBarcode")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
        };
        if (m_normalizeBarcodeHandler) {
            return invokeNow();
        }
        auto& queue = m_queuedCalls[queueKey];
        if (queue.size() >= kMaxQueuedCallsPerEndpoint) {
            queue.dequeue();
        }
        queue.enqueue(PendingCallInvocation{requestId, args, QDateTime::currentDateTimeUtc()});
        return waitForCallHandlerAndInvoke(QStringLiteral("CdEntryService"), QStringLiteral("normalizeBarcode"), requestId, 120000, invokeNow);
    }
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("saveRequested")) {
        const CdDraft draft = decodeAnQstStructured_CdDraft(args.value(0));
        const QString requestId = QStringLiteral("call-%1").arg(++m_callRequestCounter);
        const QString queueKey = makeBindingKey(QStringLiteral("CdEntryService"), QStringLiteral("saveRequested"));
        auto invokeNow = [this, requestId, draft]() -> QVariant {
            if (!m_saveRequestedHandler) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("HandlerNotRegisteredError")},
                    {QStringLiteral("message"), QStringLiteral("No callback registered for Call endpoint.")},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("saveRequested")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
            try {
                const SaveResult result = m_saveRequestedHandler(draft);
                return encodeAnQstStructured_SaveResult(result);
            } catch (const std::exception& ex) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QString::fromUtf8(ex.what())},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("saveRequested")},
                    {QStringLiteral("requestId"), requestId}
                };
            } catch (...) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QStringLiteral("Call handler threw unknown exception.")},
                    {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                    {QStringLiteral("member"), QStringLiteral("saveRequested")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
        };
        if (m_saveRequestedHandler) {
            return invokeNow();
        }
        auto& queue = m_queuedCalls[queueKey];
        if (queue.size() >= kMaxQueuedCallsPerEndpoint) {
            queue.dequeue();
        }
        queue.enqueue(PendingCallInvocation{requestId, args, QDateTime::currentDateTimeUtc()});
        return waitForCallHandlerAndInvoke(QStringLiteral("CdEntryService"), QStringLiteral("saveRequested"), requestId, 120000, invokeNow);
    }
    return QVariantMap{
        {QStringLiteral("code"), QStringLiteral("HandlerNotRegisteredError")},
        {QStringLiteral("message"), QStringLiteral("No Call mapping found.")},
        {QStringLiteral("service"), service},
        {QStringLiteral("member"), member},
        {QStringLiteral("requestId"), QString()}
    };
}

void CdEntryEditorWidget::handleGeneratedEmitter(const QString& service, const QString& member, const QVariantList& args) {
    if (!hasEmitterListeners(service, member)) {
        return;
    }
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("dirtyChanged")) {
        const bool isDirty = decodeAnQstStructured_boolean(args.value(0));
        emit dirtyChanged(isDirty);
        return;
    }
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("fieldTouched")) {
        const QString fieldName = decodeAnQstStructured_string(args.value(0));
        emit fieldTouched(fieldName);
        return;
    }
}

void CdEntryEditorWidget::handleGeneratedInput(const QString& service, const QString& member, const QVariant& value) {
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("draft")) {
        const CdDraft typedValue = decodeAnQstStructured_CdDraft(value);
        setDraft(typedValue);
        if (m_draftHandler) m_draftHandler(typedValue);
        return;
    }
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("selectedTrackIndex")) {
        const double typedValue = decodeAnQstStructured_number(value);
        setSelectedTrackIndex(typedValue);
        if (m_selectedTrackIndexHandler) m_selectedTrackIndexHandler(typedValue);
        return;
    }
}

void CdEntryEditorWidget::slot_focusField(QString fieldName) {
    QVariantList invokeArgs;
    invokeArgs.push_back(encodeAnQstStructured_string(fieldName));
    QVariant result;
    QString invokeError;
    const bool success = invokeSlot(QStringLiteral("CdEntryService"), QStringLiteral("focusField"), invokeArgs, &result, &invokeError);
    if (!success) {
        if (invokeError == QStringLiteral("slot invocation timeout")) {
            const QString timeoutMsg = QStringLiteral("[Timeout] CdEntryService.focusField: The webapp inside the widget did not anwser within %1 ms.").arg(slotInvocationTimeoutMs());
            throw std::runtime_error(timeoutMsg.toStdString());
        }
        const QString requestFailed = QStringLiteral("[RequestFailed]: %1").arg(invokeError);
        throw std::runtime_error(requestFailed.toStdString());
    }
    return;
}

void CdEntryEditorWidget::slot_showDraft(CdDraft draft, double selectedTrackIndex) {
    QVariantList invokeArgs;
    invokeArgs.push_back(encodeAnQstStructured_CdDraft(draft));
    invokeArgs.push_back(encodeAnQstStructured_number(selectedTrackIndex));
    QVariant result;
    QString invokeError;
    const bool success = invokeSlot(QStringLiteral("CdEntryService"), QStringLiteral("showDraft"), invokeArgs, &result, &invokeError);
    if (!success) {
        if (invokeError == QStringLiteral("slot invocation timeout")) {
            const QString timeoutMsg = QStringLiteral("[Timeout] CdEntryService.showDraft: The webapp inside the widget did not anwser within %1 ms.").arg(slotInvocationTimeoutMs());
            throw std::runtime_error(timeoutMsg.toStdString());
        }
        const QString requestFailed = QStringLiteral("[RequestFailed]: %1").arg(invokeError);
        throw std::runtime_error(requestFailed.toStdString());
    }
    return;
}

void CdEntryEditorWidget::slot_replaceTracks(QList<Track> tracks) {
    QVariantList invokeArgs;
    invokeArgs.push_back(encodeAnQstStructured_Track(tracks));
    QVariant result;
    QString invokeError;
    const bool success = invokeSlot(QStringLiteral("CdEntryService"), QStringLiteral("replaceTracks"), invokeArgs, &result, &invokeError);
    if (!success) {
        if (invokeError == QStringLiteral("slot invocation timeout")) {
            const QString timeoutMsg = QStringLiteral("[Timeout] CdEntryService.replaceTracks: The webapp inside the widget did not anwser within %1 ms.").arg(slotInvocationTimeoutMs());
            throw std::runtime_error(timeoutMsg.toStdString());
        }
        const QString requestFailed = QStringLiteral("[RequestFailed]: %1").arg(invokeError);
        throw std::runtime_error(requestFailed.toStdString());
    }
    return;
}

bool CdEntryEditorWidget::readOnlyMode() const {
    return m_readOnlyMode;
}

void CdEntryEditorWidget::setReadOnlyMode(const bool& value) {
    if (m_readOnlyModePublished && m_readOnlyMode == value) return;
    QVariant encodedValue;
    try {
        encodedValue = encodeAnQstStructured_boolean(value);
    } catch (const std::exception& ex) {
        emitHostError(
            QStringLiteral("SerializationError"),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Failed to serialize Output CdEntryService.readOnlyMode."),
            {
                {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                {QStringLiteral("member"), QStringLiteral("readOnlyMode")},
                {QStringLiteral("detail"), QString::fromUtf8(ex.what())},
            });
        return;
    } catch (...) {
        emitHostError(
            QStringLiteral("SerializationError"),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Failed to serialize Output CdEntryService.readOnlyMode."),
            {
                {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                {QStringLiteral("member"), QStringLiteral("readOnlyMode")},
            });
        return;
    }
    m_readOnlyMode = value;
    m_readOnlyModePublished = true;
    setOutputValue(QStringLiteral("CdEntryService"), QStringLiteral("readOnlyMode"), encodedValue);
    emit readOnlyModeChanged(value);
}

void CdEntryEditorWidget::readOnlyModeSlot(const bool& value) {
    setReadOnlyMode(value);
}

QString CdEntryEditorWidget::currentCollectionName() const {
    return m_currentCollectionName;
}

void CdEntryEditorWidget::setCurrentCollectionName(const QString& value) {
    if (m_currentCollectionNamePublished && m_currentCollectionName == value) return;
    QVariant encodedValue;
    try {
        encodedValue = encodeAnQstStructured_string(value);
    } catch (const std::exception& ex) {
        emitHostError(
            QStringLiteral("SerializationError"),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Failed to serialize Output CdEntryService.currentCollectionName."),
            {
                {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                {QStringLiteral("member"), QStringLiteral("currentCollectionName")},
                {QStringLiteral("detail"), QString::fromUtf8(ex.what())},
            });
        return;
    } catch (...) {
        emitHostError(
            QStringLiteral("SerializationError"),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Failed to serialize Output CdEntryService.currentCollectionName."),
            {
                {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                {QStringLiteral("member"), QStringLiteral("currentCollectionName")},
            });
        return;
    }
    m_currentCollectionName = value;
    m_currentCollectionNamePublished = true;
    setOutputValue(QStringLiteral("CdEntryService"), QStringLiteral("currentCollectionName"), encodedValue);
    emit currentCollectionNameChanged(value);
}

void CdEntryEditorWidget::currentCollectionNameSlot(const QString& value) {
    setCurrentCollectionName(value);
}

bool CdEntryEditorWidget::saveInProgress() const {
    return m_saveInProgress;
}

void CdEntryEditorWidget::setSaveInProgress(const bool& value) {
    if (m_saveInProgressPublished && m_saveInProgress == value) return;
    QVariant encodedValue;
    try {
        encodedValue = encodeAnQstStructured_boolean(value);
    } catch (const std::exception& ex) {
        emitHostError(
            QStringLiteral("SerializationError"),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Failed to serialize Output CdEntryService.saveInProgress."),
            {
                {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                {QStringLiteral("member"), QStringLiteral("saveInProgress")},
                {QStringLiteral("detail"), QString::fromUtf8(ex.what())},
            });
        return;
    } catch (...) {
        emitHostError(
            QStringLiteral("SerializationError"),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Failed to serialize Output CdEntryService.saveInProgress."),
            {
                {QStringLiteral("service"), QStringLiteral("CdEntryService")},
                {QStringLiteral("member"), QStringLiteral("saveInProgress")},
            });
        return;
    }
    m_saveInProgress = value;
    m_saveInProgressPublished = true;
    setOutputValue(QStringLiteral("CdEntryService"), QStringLiteral("saveInProgress"), encodedValue);
    emit saveInProgressChanged(value);
}

void CdEntryEditorWidget::saveInProgressSlot(const bool& value) {
    setSaveInProgress(value);
}

void CdEntryEditorWidget::setDraftHandler(const DraftHandler& handler) {
    m_draftHandler = handler;
}

CdDraft CdEntryEditorWidget::draft() const {
    return m_draft;
}

void CdEntryEditorWidget::setDraft(const CdDraft& value) {
    if (m_draft == value) return;
    m_draft = value;
    emit draftChanged(value);
}

void CdEntryEditorWidget::setSelectedTrackIndexHandler(const SelectedTrackIndexHandler& handler) {
    m_selectedTrackIndexHandler = handler;
}

double CdEntryEditorWidget::selectedTrackIndex() const {
    return m_selectedTrackIndex;
}

void CdEntryEditorWidget::setSelectedTrackIndex(const double& value) {
    if (m_selectedTrackIndex == value) return;
    m_selectedTrackIndex = value;
    emit selectedTrackIndexChanged(value);
}

void CdEntryEditorWidget::connectNotify(const QMetaMethod& signal) {
    anqstwebbase_1_7_7::AnQstWebHostBase::connectNotify(signal);
    Q_UNUSED(signal);
}

void CdEntryEditorWidget::disconnectNotify(const QMetaMethod& signal) {
    anqstwebbase_1_7_7::AnQstWebHostBase::disconnectNotify(signal);
    Q_UNUSED(signal);
}
