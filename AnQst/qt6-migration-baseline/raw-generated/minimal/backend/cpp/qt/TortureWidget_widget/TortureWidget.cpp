#include "include/TortureWidgetWidget.h"
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

using namespace TortureWidget;

extern int qInitResources_TortureWidget();

namespace {
void registerGeneratedMetaTypes() {
    static const bool registered = []() {
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
    throw std::runtime_error("AnQst boundary planner emitted unexpected blob bytes.");
}


inline QVariant encodeAnQstStructured_string(const QString& value) {
    return QVariant::fromValue(value);
}

inline QString decodeAnQstStructured_string(const QVariant& wire) {
    return wire.toString();
}
}

void TortureWidgetWidget::handle::ping(const PingHandler& handler) const {
    if (m_owner == nullptr) return;
    m_owner->setPingCallHandler(handler);
}

void TortureWidgetWidget::setPingCallHandler(const PingHandler& handler) {
    m_pingHandler = handler;
}

TortureWidgetWidget::TortureWidgetWidget(QWidget* parent) : anqstwebbase_1_7_7::AnQstWebHostBase(parent), handle(this) {
    static const bool kResourcesInitialized = []() {
        ::qInitResources_TortureWidget();
        return true;
    }();
    Q_UNUSED(kResourcesInitialized);
    registerGeneratedMetaTypes();
    installBridgeBindings();
    QObject::connect(this, &anqstwebbase_1_7_7::AnQstWebHostBase::onHostError, this, &TortureWidgetWidget::diagnosticsForwarded);
    const bool rootOk = setContentRoot(QString::fromUtf8(kBootstrapContentRoot));
    const bool bridgeOk = setBridgeObject(this, QString::fromUtf8(kBootstrapBridgeObject));
    const bool loadOk = rootOk && bridgeOk && loadEntryPoint(QString::fromUtf8(kBootstrapEntryPoint));
    if (!loadOk) {
        qWarning() << "TortureWidget bootstrap failed.";
    }
}

TortureWidgetWidget::~TortureWidgetWidget() = default;

bool TortureWidgetWidget::enableDebug() {
    return anqstwebbase_1_7_7::AnQstWebHostBase::enableDebug();
}

QString TortureWidgetWidget::makeBindingKey(const QString& service, const QString& member) {
    return service + QStringLiteral("::") + member;
}

void TortureWidgetWidget::removeQueuedCallById(const QString& queueKey, const QString& requestId) {
    if (!m_queuedCalls.contains(queueKey)) return;
    auto& queue = m_queuedCalls[queueKey];
    for (int i = 0; i < queue.size(); ++i) {
        if (queue[i].requestId == requestId) {
            queue.removeAt(i);
            break;
        }
    }
}

QVariant TortureWidgetWidget::waitForCallHandlerAndInvoke(
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

bool TortureWidgetWidget::hasEmitterListeners(const QString& service, const QString& member) const {
    return false;
}

void TortureWidgetWidget::installBridgeBindings() {
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

QVariant TortureWidgetWidget::handleGeneratedCall(const QString& service, const QString& member, const QVariantList& args) {
    if (service == QStringLiteral("PingService") && member == QStringLiteral("ping")) {
        const QString value = decodeAnQstStructured_string(args.value(0));
        const QString requestId = QStringLiteral("call-%1").arg(++m_callRequestCounter);
        const QString queueKey = makeBindingKey(QStringLiteral("PingService"), QStringLiteral("ping"));
        auto invokeNow = [this, requestId, value]() -> QVariant {
            if (!m_pingHandler) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("HandlerNotRegisteredError")},
                    {QStringLiteral("message"), QStringLiteral("No callback registered for Call endpoint.")},
                    {QStringLiteral("service"), QStringLiteral("PingService")},
                    {QStringLiteral("member"), QStringLiteral("ping")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
            try {
                const QString result = m_pingHandler(value);
                return encodeAnQstStructured_string(result);
            } catch (const std::exception& ex) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QString::fromUtf8(ex.what())},
                    {QStringLiteral("service"), QStringLiteral("PingService")},
                    {QStringLiteral("member"), QStringLiteral("ping")},
                    {QStringLiteral("requestId"), requestId}
                };
            } catch (...) {
                return QVariantMap{
                    {QStringLiteral("code"), QStringLiteral("CallHandlerError")},
                    {QStringLiteral("message"), QStringLiteral("Call handler threw unknown exception.")},
                    {QStringLiteral("service"), QStringLiteral("PingService")},
                    {QStringLiteral("member"), QStringLiteral("ping")},
                    {QStringLiteral("requestId"), requestId}
                };
            }
        };
        if (m_pingHandler) {
            return invokeNow();
        }
        auto& queue = m_queuedCalls[queueKey];
        if (queue.size() >= kMaxQueuedCallsPerEndpoint) {
            queue.dequeue();
        }
        queue.enqueue(PendingCallInvocation{requestId, args, QDateTime::currentDateTimeUtc()});
        return waitForCallHandlerAndInvoke(QStringLiteral("PingService"), QStringLiteral("ping"), requestId, 120000, invokeNow);
    }
    return QVariantMap{
        {QStringLiteral("code"), QStringLiteral("HandlerNotRegisteredError")},
        {QStringLiteral("message"), QStringLiteral("No Call mapping found.")},
        {QStringLiteral("service"), service},
        {QStringLiteral("member"), member},
        {QStringLiteral("requestId"), QString()}
    };
}

void TortureWidgetWidget::handleGeneratedEmitter(const QString& service, const QString& member, const QVariantList& args) {
    if (!hasEmitterListeners(service, member)) {
        return;
    }
}

void TortureWidgetWidget::handleGeneratedInput(const QString& service, const QString& member, const QVariant& value) {
}

void TortureWidgetWidget::connectNotify(const QMetaMethod& signal) {
    anqstwebbase_1_7_7::AnQstWebHostBase::connectNotify(signal);
    Q_UNUSED(signal);
}

void TortureWidgetWidget::disconnectNotify(const QMetaMethod& signal) {
    anqstwebbase_1_7_7::AnQstWebHostBase::disconnectNotify(signal);
    Q_UNUSED(signal);
}
