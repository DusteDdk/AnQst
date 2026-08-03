#include "include/CodecLeafWidgetWidget.h"
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

using namespace CodecLeafWidget;

extern int qInitResources_CodecLeafWidget();

namespace {
void registerGeneratedMetaTypes() {
    static const bool registered = []() {
        qRegisterMetaType<CodecLeafWidget::ScalarLeaves>("CodecLeafWidget::ScalarLeaves");
        qRegisterMetaType<QList<CodecLeafWidget::ScalarLeaves>>("QList<CodecLeafWidget::ScalarLeaves>");
        qRegisterMetaType<CodecLeafWidget::BinaryLeaves>("CodecLeafWidget::BinaryLeaves");
        qRegisterMetaType<QList<CodecLeafWidget::BinaryLeaves>>("QList<CodecLeafWidget::BinaryLeaves>");
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

inline QString anqstEncodeBinary(const QByteArray& value) {
    return anqstwebbase_1_7_7::anqstBase93Encode(std::vector<std::uint8_t>(value.begin(), value.end()));
}

inline QByteArray anqstDecodeBinary(const QString& encoded) {
    const auto bytes = anqstwebbase_1_7_7::anqstBase93Decode(encoded);
    return QByteArray(reinterpret_cast<const char*>(bytes.data()), static_cast<int>(bytes.size()));
}

inline void anqstNamed_AnQstStructured_ScalarLeaves_ScalarLeaves_encode(
    const ScalarLeaves& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
);
inline ScalarLeaves anqstNamed_AnQstStructured_ScalarLeaves_ScalarLeaves_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
);

inline void anqstNamed_AnQstStructured_ScalarLeaves_ScalarLeaves_encode(
    const ScalarLeaves& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
) {
    const std::uint64_t u641 = static_cast<std::uint64_t>(value.qint64Value);
    for (int shift = 0; shift < 64; shift += 8) bytes.push_back(static_cast<std::uint8_t>((u641 >> shift) & 0xffu));
    const std::uint64_t u642 = static_cast<std::uint64_t>(value.quint64Value);
    for (int shift = 0; shift < 64; shift += 8) bytes.push_back(static_cast<std::uint8_t>((u642 >> shift) & 0xffu));
    const std::uint32_t u323 = static_cast<std::uint32_t>(value.qint32Value);
    bytes.push_back(static_cast<std::uint8_t>(u323 & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u323 >> 8) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u323 >> 16) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u323 >> 24) & 0xffu));
    const std::uint32_t u324 = static_cast<std::uint32_t>(value.quint32Value);
    bytes.push_back(static_cast<std::uint8_t>(u324 & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u324 >> 8) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u324 >> 16) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u324 >> 24) & 0xffu));
    const std::uint16_t u165 = static_cast<std::uint16_t>(value.qint16Value);
    bytes.push_back(static_cast<std::uint8_t>(u165 & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u165 >> 8) & 0xffu));
    const std::uint16_t u166 = static_cast<std::uint16_t>(value.quint16Value);
    bytes.push_back(static_cast<std::uint8_t>(u166 & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u166 >> 8) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>(static_cast<std::int8_t>(value.qint8Value)));
    bytes.push_back(static_cast<std::uint8_t>(value.quint8Value));
    const std::uint32_t u327 = static_cast<std::uint32_t>(value.int32Value);
    bytes.push_back(static_cast<std::uint8_t>(u327 & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u327 >> 8) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u327 >> 16) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u327 >> 24) & 0xffu));
    const std::uint32_t u328 = static_cast<std::uint32_t>(value.uint32Value);
    bytes.push_back(static_cast<std::uint8_t>(u328 & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u328 >> 8) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u328 >> 16) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u328 >> 24) & 0xffu));
    const std::uint16_t u169 = static_cast<std::uint16_t>(value.int16Value);
    bytes.push_back(static_cast<std::uint8_t>(u169 & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u169 >> 8) & 0xffu));
    const std::uint16_t u1610 = static_cast<std::uint16_t>(value.uint16Value);
    bytes.push_back(static_cast<std::uint8_t>(u1610 & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>((u1610 >> 8) & 0xffu));
    bytes.push_back(static_cast<std::uint8_t>(static_cast<std::int8_t>(value.int8Value)));
    bytes.push_back(static_cast<std::uint8_t>(value.uint8Value));
    const std::uint64_t u6411 = static_cast<std::uint64_t>(value.bigintValue);
    for (int shift = 0; shift < 64; shift += 8) bytes.push_back(static_cast<std::uint8_t>((u6411 >> shift) & 0xffu));
}

inline ScalarLeaves anqstNamed_AnQstStructured_ScalarLeaves_ScalarLeaves_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
) {
    ScalarLeaves value1{};
    std::uint64_t u642 = 0;
    for (int shift = 0; shift < 64; shift += 8) {
        u642 |= (static_cast<std::uint64_t>(blob[dataOffset++]) << shift);
    }
    value1.qint64Value = static_cast<qint64>(static_cast<std::int64_t>(u642));
    std::uint64_t u643 = 0;
    for (int shift = 0; shift < 64; shift += 8) {
        u643 |= (static_cast<std::uint64_t>(blob[dataOffset++]) << shift);
    }
    value1.quint64Value = static_cast<quint64>(u643);
    const std::uint32_t u324 =
        static_cast<std::uint32_t>(blob[dataOffset])
        | (static_cast<std::uint32_t>(blob[dataOffset + 1]) << 8)
        | (static_cast<std::uint32_t>(blob[dataOffset + 2]) << 16)
        | (static_cast<std::uint32_t>(blob[dataOffset + 3]) << 24);
    dataOffset += 4;
    value1.qint32Value = static_cast<qint32>(static_cast<std::int32_t>(u324));
    const std::uint32_t u325 =
        static_cast<std::uint32_t>(blob[dataOffset])
        | (static_cast<std::uint32_t>(blob[dataOffset + 1]) << 8)
        | (static_cast<std::uint32_t>(blob[dataOffset + 2]) << 16)
        | (static_cast<std::uint32_t>(blob[dataOffset + 3]) << 24);
    dataOffset += 4;
    value1.quint32Value = static_cast<quint32>(u325);
    const std::uint16_t u166 = static_cast<std::uint16_t>(blob[dataOffset]) | (static_cast<std::uint16_t>(blob[dataOffset + 1]) << 8);
    dataOffset += 2;
    value1.qint16Value = static_cast<qint16>(static_cast<std::int16_t>(u166));
    const std::uint16_t u167 = static_cast<std::uint16_t>(blob[dataOffset]) | (static_cast<std::uint16_t>(blob[dataOffset + 1]) << 8);
    dataOffset += 2;
    value1.quint16Value = static_cast<quint16>(u167);
    value1.qint8Value = static_cast<qint8>(static_cast<std::int8_t>((blob[dataOffset++])));
    value1.quint8Value = static_cast<quint8>((blob[dataOffset++]));
    const std::uint32_t u328 =
        static_cast<std::uint32_t>(blob[dataOffset])
        | (static_cast<std::uint32_t>(blob[dataOffset + 1]) << 8)
        | (static_cast<std::uint32_t>(blob[dataOffset + 2]) << 16)
        | (static_cast<std::uint32_t>(blob[dataOffset + 3]) << 24);
    dataOffset += 4;
    value1.int32Value = static_cast<std::int32_t>(u328);
    const std::uint32_t u329 =
        static_cast<std::uint32_t>(blob[dataOffset])
        | (static_cast<std::uint32_t>(blob[dataOffset + 1]) << 8)
        | (static_cast<std::uint32_t>(blob[dataOffset + 2]) << 16)
        | (static_cast<std::uint32_t>(blob[dataOffset + 3]) << 24);
    dataOffset += 4;
    value1.uint32Value = u329;
    const std::uint16_t u1610 = static_cast<std::uint16_t>(blob[dataOffset]) | (static_cast<std::uint16_t>(blob[dataOffset + 1]) << 8);
    dataOffset += 2;
    value1.int16Value = static_cast<std::int16_t>(u1610);
    const std::uint16_t u1611 = static_cast<std::uint16_t>(blob[dataOffset]) | (static_cast<std::uint16_t>(blob[dataOffset + 1]) << 8);
    dataOffset += 2;
    value1.uint16Value = u1611;
    value1.int8Value = static_cast<std::int8_t>((blob[dataOffset++]));
    value1.uint8Value = static_cast<std::uint8_t>((blob[dataOffset++]));
    std::uint64_t u6412 = 0;
    for (int shift = 0; shift < 64; shift += 8) {
        u6412 |= (static_cast<std::uint64_t>(blob[dataOffset++]) << shift);
    }
    value1.bigintValue = static_cast<qint64>(static_cast<std::int64_t>(u6412));
    return value1;
}

inline QVariant encodeAnQstStructured_ScalarLeaves(const ScalarLeaves& value) {
    std::vector<std::uint8_t> bytes;
    QVariantList items;
    anqstNamed_AnQstStructured_ScalarLeaves_ScalarLeaves_encode(value, bytes, items);
    return anqstFinalizeWire(bytes, items);
}

inline ScalarLeaves decodeAnQstStructured_ScalarLeaves(const QVariant& wire) {
    const QVariantList items = anqstNormalizeWireItems(wire);
    const std::vector<std::uint8_t> blob = (items.isEmpty() ? std::vector<std::uint8_t>{} : anqstwebbase_1_7_7::anqstBase93Decode(items.value(0).toString()));
    std::size_t itemIndex = 1;
    std::size_t dataOffset = 0;

    const ScalarLeaves result = anqstNamed_AnQstStructured_ScalarLeaves_ScalarLeaves_decode(items, blob, itemIndex, dataOffset);


    return result;
}

inline void anqstNamed_AnQstStructured_BinaryLeaves_BinaryLeaves_encode(
    const BinaryLeaves& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
);
inline BinaryLeaves anqstNamed_AnQstStructured_BinaryLeaves_BinaryLeaves_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
);

inline void anqstNamed_AnQstStructured_BinaryLeaves_BinaryLeaves_encode(
    const BinaryLeaves& value,
    std::vector<std::uint8_t>& bytes,
    QVariantList& items
) {
    items.push_back(anqstEncodeBinary(value.bufferValue));
    items.push_back(anqstEncodeBinary(value.blobValue));
    items.push_back(anqstEncodeBinary(value.typedArrayValue));
    items.push_back(anqstEncodeBinary(value.uint8ArrayValue));
    items.push_back(anqstEncodeBinary(value.int8ArrayValue));
    items.push_back(anqstEncodeBinary(value.uint16ArrayValue));
    items.push_back(anqstEncodeBinary(value.int16ArrayValue));
    items.push_back(anqstEncodeBinary(value.uint32ArrayValue));
    items.push_back(anqstEncodeBinary(value.int32ArrayValue));
    items.push_back(anqstEncodeBinary(value.float32ArrayValue));
    items.push_back(anqstEncodeBinary(value.float64ArrayValue));
}

inline BinaryLeaves anqstNamed_AnQstStructured_BinaryLeaves_BinaryLeaves_decode(
    const QVariantList& items,
    const std::vector<std::uint8_t>& blob,
    std::size_t& itemIndex,
    std::size_t& dataOffset
) {
    BinaryLeaves value1{};
    value1.bufferValue = anqstDecodeBinary(items[static_cast<int>(itemIndex++)].toString());
    value1.blobValue = anqstDecodeBinary(items[static_cast<int>(itemIndex++)].toString());
    value1.typedArrayValue = anqstDecodeBinary(items[static_cast<int>(itemIndex++)].toString());
    value1.uint8ArrayValue = anqstDecodeBinary(items[static_cast<int>(itemIndex++)].toString());
    value1.int8ArrayValue = anqstDecodeBinary(items[static_cast<int>(itemIndex++)].toString());
    value1.uint16ArrayValue = anqstDecodeBinary(items[static_cast<int>(itemIndex++)].toString());
    value1.int16ArrayValue = anqstDecodeBinary(items[static_cast<int>(itemIndex++)].toString());
    value1.uint32ArrayValue = anqstDecodeBinary(items[static_cast<int>(itemIndex++)].toString());
    value1.int32ArrayValue = anqstDecodeBinary(items[static_cast<int>(itemIndex++)].toString());
    value1.float32ArrayValue = anqstDecodeBinary(items[static_cast<int>(itemIndex++)].toString());
    value1.float64ArrayValue = anqstDecodeBinary(items[static_cast<int>(itemIndex++)].toString());
    return value1;
}

inline QVariant encodeAnQstStructured_BinaryLeaves(const BinaryLeaves& value) {
    std::vector<std::uint8_t> bytes;
    QVariantList items;
    anqstNamed_AnQstStructured_BinaryLeaves_BinaryLeaves_encode(value, bytes, items);
    return anqstFinalizeWire(bytes, items);
}

inline BinaryLeaves decodeAnQstStructured_BinaryLeaves(const QVariant& wire) {
    const QVariantList items = anqstNormalizeWireItems(wire);
    const std::vector<std::uint8_t> blob = std::vector<std::uint8_t>{};
    std::size_t itemIndex = 0;
    std::size_t dataOffset = 0;

    const BinaryLeaves result = anqstNamed_AnQstStructured_BinaryLeaves_BinaryLeaves_decode(items, blob, itemIndex, dataOffset);


    return result;
}
}

void CodecLeafWidgetWidget::handle::roundTripScalars(const RoundTripScalarsHandler& handler) const {
    if (m_owner == nullptr) return;
    m_owner->setRoundTripScalarsCallHandler(handler);
}

void CodecLeafWidgetWidget::setRoundTripScalarsCallHandler(const RoundTripScalarsHandler& handler) {
    m_roundTripScalarsHandler = handler;
}

void CodecLeafWidgetWidget::handle::roundTripBinary(const RoundTripBinaryHandler& handler) const {
    if (m_owner == nullptr) return;
    m_owner->setRoundTripBinaryCallHandler(handler);
}

void CodecLeafWidgetWidget::setRoundTripBinaryCallHandler(const RoundTripBinaryHandler& handler) {
    m_roundTripBinaryHandler = handler;
}

CodecLeafWidgetWidget::CodecLeafWidgetWidget(QWidget* parent) : anqstwebbase_1_7_7::AnQstWebHostBase(parent), handle(this) {
    static const bool kResourcesInitialized = []() {
        ::qInitResources_CodecLeafWidget();
        return true;
    }();
    Q_UNUSED(kResourcesInitialized);
    registerGeneratedMetaTypes();
    installBridgeBindings();
    QObject::connect(this, &anqstwebbase_1_7_7::AnQstWebHostBase::onHostError, this, &CodecLeafWidgetWidget::diagnosticsForwarded);
    const bool rootOk = setContentRoot(QString::fromUtf8(kBootstrapContentRoot));
    const bool bridgeOk = setBridgeObject(this, QString::fromUtf8(kBootstrapBridgeObject));
    const bool loadOk = rootOk && bridgeOk && loadEntryPoint(QString::fromUtf8(kBootstrapEntryPoint));
    if (!loadOk) {
        qWarning() << "CodecLeafWidget bootstrap failed.";
    }
}

CodecLeafWidgetWidget::~CodecLeafWidgetWidget() = default;

bool CodecLeafWidgetWidget::enableDebug() {
    return anqstwebbase_1_7_7::AnQstWebHostBase::enableDebug();
}

QString CodecLeafWidgetWidget::makeBindingKey(const QString& service, const QString& member) {
    return service + QStringLiteral("::") + member;
}

void CodecLeafWidgetWidget::removeQueuedCallById(const QString& queueKey, const QString& requestId) {
    if (!m_queuedCalls.contains(queueKey)) return;
    auto& queue = m_queuedCalls[queueKey];
    for (int i = 0; i < queue.size(); ++i) {
        if (queue[i].requestId == requestId) {
            queue.removeAt(i);
            break;
        }
    }
}

QVariant CodecLeafWidgetWidget::waitForCallHandlerAndInvoke(
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

bool CodecLeafWidgetWidget::hasEmitterListeners(const QString& service, const QString& member) const {
    return false;
}

void CodecLeafWidgetWidget::installBridgeBindings() {
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

QVariant CodecLeafWidgetWidget::handleGeneratedCall(const QString& service, const QString& member, const QVariantList& args) {
    if (service == QStringLiteral("CodecService") && member == QStringLiteral("roundTripScalars")) {
        const ScalarLeaves value = decodeAnQstStructured_ScalarLeaves(args.value(0));
        const QString requestId = QStringLiteral("call-%1").arg(++m_callRequestCounter);
        const QString queueKey = makeBindingKey(QStringLiteral("CodecService"), QStringLiteral("roundTripScalars"));
        auto invokeNow = [this, requestId, value]() -> QVariant {
            if (!m_roundTripScalarsHandler) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("HandlerNotRegisteredError")},
                    {QStringLiteral("message"), QStringLiteral("No callback registered for Call endpoint.")},
                    {QStringLiteral("service"), QStringLiteral("CodecService")},
                    {QStringLiteral("member"), QStringLiteral("roundTripScalars")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
            try {
                const ScalarLeaves result = m_roundTripScalarsHandler(value);
                return encodeAnQstStructured_ScalarLeaves(result);
            } catch (const std::exception& ex) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QString::fromUtf8(ex.what())},
                    {QStringLiteral("service"), QStringLiteral("CodecService")},
                    {QStringLiteral("member"), QStringLiteral("roundTripScalars")},
                    {QStringLiteral("requestId"), requestId}
                };
            } catch (...) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QStringLiteral("Call handler threw unknown exception.")},
                    {QStringLiteral("service"), QStringLiteral("CodecService")},
                    {QStringLiteral("member"), QStringLiteral("roundTripScalars")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
        };
        if (m_roundTripScalarsHandler) {
            return invokeNow();
        }
        auto& queue = m_queuedCalls[queueKey];
        if (queue.size() >= kMaxQueuedCallsPerEndpoint) {
            queue.dequeue();
        }
        queue.enqueue(PendingCallInvocation{requestId, args, QDateTime::currentDateTimeUtc()});
        return waitForCallHandlerAndInvoke(QStringLiteral("CodecService"), QStringLiteral("roundTripScalars"), requestId, 120000, invokeNow);
    }
    if (service == QStringLiteral("CodecService") && member == QStringLiteral("roundTripBinary")) {
        const BinaryLeaves value = decodeAnQstStructured_BinaryLeaves(args.value(0));
        const QString requestId = QStringLiteral("call-%1").arg(++m_callRequestCounter);
        const QString queueKey = makeBindingKey(QStringLiteral("CodecService"), QStringLiteral("roundTripBinary"));
        auto invokeNow = [this, requestId, value]() -> QVariant {
            if (!m_roundTripBinaryHandler) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("HandlerNotRegisteredError")},
                    {QStringLiteral("message"), QStringLiteral("No callback registered for Call endpoint.")},
                    {QStringLiteral("service"), QStringLiteral("CodecService")},
                    {QStringLiteral("member"), QStringLiteral("roundTripBinary")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
            try {
                const BinaryLeaves result = m_roundTripBinaryHandler(value);
                return encodeAnQstStructured_BinaryLeaves(result);
            } catch (const std::exception& ex) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QString::fromUtf8(ex.what())},
                    {QStringLiteral("service"), QStringLiteral("CodecService")},
                    {QStringLiteral("member"), QStringLiteral("roundTripBinary")},
                    {QStringLiteral("requestId"), requestId}
                };
            } catch (...) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QStringLiteral("Call handler threw unknown exception.")},
                    {QStringLiteral("service"), QStringLiteral("CodecService")},
                    {QStringLiteral("member"), QStringLiteral("roundTripBinary")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
        };
        if (m_roundTripBinaryHandler) {
            return invokeNow();
        }
        auto& queue = m_queuedCalls[queueKey];
        if (queue.size() >= kMaxQueuedCallsPerEndpoint) {
            queue.dequeue();
        }
        queue.enqueue(PendingCallInvocation{requestId, args, QDateTime::currentDateTimeUtc()});
        return waitForCallHandlerAndInvoke(QStringLiteral("CodecService"), QStringLiteral("roundTripBinary"), requestId, 120000, invokeNow);
    }
    return QVariantMap{
        {QStringLiteral("code"), QStringLiteral("HandlerNotRegisteredError")},
        {QStringLiteral("message"), QStringLiteral("No Call mapping found.")},
        {QStringLiteral("service"), service},
        {QStringLiteral("member"), member},
        {QStringLiteral("requestId"), QString()}
    };
}

void CodecLeafWidgetWidget::handleGeneratedEmitter(const QString& service, const QString& member, const QVariantList& args) {
    if (!hasEmitterListeners(service, member)) {
        return;
    }
}

void CodecLeafWidgetWidget::handleGeneratedInput(const QString& service, const QString& member, const QVariant& value) {
}

void CodecLeafWidgetWidget::connectNotify(const QMetaMethod& signal) {
    anqstwebbase_1_7_7::AnQstWebHostBase::connectNotify(signal);
    Q_UNUSED(signal);
}

void CodecLeafWidgetWidget::disconnectNotify(const QMetaMethod& signal) {
    anqstwebbase_1_7_7::AnQstWebHostBase::disconnectNotify(signal);
    Q_UNUSED(signal);
}
