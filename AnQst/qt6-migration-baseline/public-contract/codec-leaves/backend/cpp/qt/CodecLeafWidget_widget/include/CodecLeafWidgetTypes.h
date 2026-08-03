#pragma once
#include <QString>
#include <QStringList>
#include <QByteArray>
#include <QList>
#include <QVariantMap>
#include <QMetaType>
#include <cstdint>
#include <optional>

namespace CodecLeafWidget {

struct ScalarLeaves {
    qint64 qint64Value;
    quint64 quint64Value;
    qint32 qint32Value;
    quint32 quint32Value;
    qint16 qint16Value;
    quint16 quint16Value;
    qint8 qint8Value;
    quint8 quint8Value;
    int32_t int32Value;
    uint32_t uint32Value;
    int16_t int16Value;
    uint16_t uint16Value;
    int8_t int8Value;
    uint8_t uint8Value;
    qint64 bigintValue;
    bool operator==(const ScalarLeaves& other) const { return qint64Value == other.qint64Value && quint64Value == other.quint64Value && qint32Value == other.qint32Value && quint32Value == other.quint32Value && qint16Value == other.qint16Value && quint16Value == other.quint16Value && qint8Value == other.qint8Value && quint8Value == other.quint8Value && int32Value == other.int32Value && uint32Value == other.uint32Value && int16Value == other.int16Value && uint16Value == other.uint16Value && int8Value == other.int8Value && uint8Value == other.uint8Value && bigintValue == other.bigintValue; }
};

struct BinaryLeaves {
    QByteArray bufferValue;
    QByteArray blobValue;
    QByteArray typedArrayValue;
    QByteArray uint8ArrayValue;
    QByteArray int8ArrayValue;
    QByteArray uint16ArrayValue;
    QByteArray int16ArrayValue;
    QByteArray uint32ArrayValue;
    QByteArray int32ArrayValue;
    QByteArray float32ArrayValue;
    QByteArray float64ArrayValue;
    bool operator==(const BinaryLeaves& other) const { return bufferValue == other.bufferValue && blobValue == other.blobValue && typedArrayValue == other.typedArrayValue && uint8ArrayValue == other.uint8ArrayValue && int8ArrayValue == other.int8ArrayValue && uint16ArrayValue == other.uint16ArrayValue && int16ArrayValue == other.int16ArrayValue && uint32ArrayValue == other.uint32ArrayValue && int32ArrayValue == other.int32ArrayValue && float32ArrayValue == other.float32ArrayValue && float64ArrayValue == other.float64ArrayValue; }
};

} // namespace CodecLeafWidget

Q_DECLARE_METATYPE(CodecLeafWidget::ScalarLeaves)
Q_DECLARE_METATYPE(QList<CodecLeafWidget::ScalarLeaves>)
Q_DECLARE_METATYPE(CodecLeafWidget::BinaryLeaves)
Q_DECLARE_METATYPE(QList<CodecLeafWidget::BinaryLeaves>)
