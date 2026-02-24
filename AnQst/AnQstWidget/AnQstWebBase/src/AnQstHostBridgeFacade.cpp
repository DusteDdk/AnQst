#include "AnQstHostBridgeFacade.h"

#include <QEventLoop>
#include <QTimer>

AnQstHostBridgeFacade::AnQstHostBridgeFacade(QObject* parent)
    : QObject(parent)
    , m_dispatchEnabled(false)
    , m_slotRequestCounter(0)
    , m_slotInvocationTimeoutMs(120000) {
    connect(this, &AnQstHostBridgeFacade::slotInvocationResolved, this, [this](const QString&) {
        // no-op connection so tests can wait for this signal deterministically.
    });
}

void AnQstHostBridgeFacade::setCallHandler(const CallHandler& handler) {
    m_callHandler = handler;
}

void AnQstHostBridgeFacade::setCallSyncHandler(const CallHandler& handler) {
    m_callSyncHandler = handler;
}

void AnQstHostBridgeFacade::setEmitterHandler(const EmitterHandler& handler) {
    m_emitterHandler = handler;
}

void AnQstHostBridgeFacade::setInputHandler(const InputHandler& handler) {
    m_inputHandler = handler;
}

void AnQstHostBridgeFacade::setOutputValue(const QString& service, const QString& member, const QVariant& value) {
    const QString key = makeSlotKey(service, member);
    m_outputValues.insert(key, value);
    if (m_dispatchEnabled) {
        emit bridgeOutputUpdated(service, member, value);
    }
}

bool AnQstHostBridgeFacade::invokeSlot(const QString& service, const QString& member, const QVariantList& args, QVariant* result, QString* error) {
    const QString key = makeSlotKey(service, member);
    const QString requestId = QStringLiteral("slot-%1").arg(++m_slotRequestCounter);
    m_slotInvocationResponses.insert(requestId, SlotInvocationResponse{});

    PendingSlotInvocation pending{requestId, service, member, args};
    if (m_registeredSlots.value(key, false)) {
        emit bridgeSlotInvocationRequested(requestId, service, member, args);
    } else {
        auto& queue = m_queuedSlotInvocations[key];
        if (queue.size() >= kMaxQueuedSlotInvocations) {
            emitQueuedSlotOverflowError(key);
            m_slotInvocationResponses.remove(requestId);
            if (error != nullptr) {
                *error = QStringLiteral("slot queue overflow");
            }
            return false;
        }
        queue.enqueue(pending);
    }

    SlotInvocationResponse& response = m_slotInvocationResponses[requestId];
    QEventLoop loop;
    QTimer timeout;
    timeout.setSingleShot(true);

    connect(this, &AnQstHostBridgeFacade::slotInvocationResolved, &loop, [&](const QString& resolvedRequestId) {
        if (resolvedRequestId == requestId) {
            loop.quit();
        }
    });
    connect(&timeout, &QTimer::timeout, &loop, &QEventLoop::quit);

    timeout.start(m_slotInvocationTimeoutMs);
    while (!response.done && timeout.isActive()) {
        loop.exec();
    }

    if (!response.done) {
        emitHostError(
            QStringLiteral("HOST_SYNC_SEMANTIC_VIOLATION"),
            QStringLiteral("runtime"),
            QStringLiteral("fatal"),
            false,
            QStringLiteral("Slot invocation timed out before a response was received."),
            {
                {QStringLiteral("service"), service},
                {QStringLiteral("member"), member},
                {QStringLiteral("requestId"), requestId},
            });
        m_slotInvocationResponses.remove(requestId);
        if (error != nullptr) {
            *error = QStringLiteral("slot invocation timeout");
        }
        return false;
    }

    if (result != nullptr) {
        *result = response.payload;
    }
    if (error != nullptr) {
        *error = response.error;
    }
    const bool ok = response.ok;
    m_slotInvocationResponses.remove(requestId);
    return ok;
}

void AnQstHostBridgeFacade::setSlotInvocationTimeoutMs(int timeoutMs) {
    if (timeoutMs <= 0) {
        emitHostError(
            QStringLiteral("HOST_MAPPING_PAYLOAD_INVALID"),
            QStringLiteral("mapping"),
            QStringLiteral("warn"),
            true,
            QStringLiteral("Slot invocation timeout must be positive."),
            {{QStringLiteral("providedTimeoutMs"), timeoutMs}});
        return;
    }
    m_slotInvocationTimeoutMs = timeoutMs;
}

int AnQstHostBridgeFacade::slotInvocationTimeoutMs() const {
    return m_slotInvocationTimeoutMs;
}

void AnQstHostBridgeFacade::setDispatchEnabled(bool enabled) {
    const bool changed = (m_dispatchEnabled != enabled);
    m_dispatchEnabled = enabled;
    if (m_dispatchEnabled && changed) {
        emitOutputSnapshot();
    }
}

bool AnQstHostBridgeFacade::dispatchEnabled() const {
    return m_dispatchEnabled;
}

void AnQstHostBridgeFacade::registerSlot(const QString& service, const QString& member) {
    const QString key = makeSlotKey(service, member);
    m_registeredSlots.insert(key, true);
    dispatchQueuedSlotInvocations(key);
}

QVariant AnQstHostBridgeFacade::call(const QString& service, const QString& member, const QVariantList& args) {
    if (!m_callHandler) {
        emitHostError(
            QStringLiteral("HOST_BRIDGE_SETUP_FAILED"),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            false,
            QStringLiteral("No Call handler has been configured."),
            {
                {QStringLiteral("service"), service},
                {QStringLiteral("member"), member},
            });
        return QVariant();
    }

    try {
        return m_callHandler(service, member, args);
    } catch (...) {
        emitHostError(
            QStringLiteral("HOST_MAPPING_PAYLOAD_INVALID"),
            QStringLiteral("mapping"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Call handler threw while processing payload."),
            {
                {QStringLiteral("service"), service},
                {QStringLiteral("member"), member},
            });
        return QVariant();
    }
}

QVariant AnQstHostBridgeFacade::callSync(const QString& service, const QString& member, const QVariantList& args) {
    if (!m_callSyncHandler) {
        emitHostError(
            QStringLiteral("HOST_BRIDGE_SETUP_FAILED"),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            false,
            QStringLiteral("No CallSync handler has been configured."),
            {
                {QStringLiteral("service"), service},
                {QStringLiteral("member"), member},
            });
        return QVariant();
    }

    QVariant result;
    QString handlerError;
    bool done = false;
    QEventLoop loop;

    QTimer::singleShot(0, this, [&]() {
        try {
            result = m_callSyncHandler(service, member, args);
        } catch (...) {
            handlerError = QStringLiteral("CallSync handler threw");
        }
        done = true;
        loop.quit();
    });

    while (!done) {
        loop.exec();
    }

    if (!handlerError.isEmpty()) {
        emitHostError(
            QStringLiteral("HOST_SYNC_SEMANTIC_VIOLATION"),
            QStringLiteral("runtime"),
            QStringLiteral("fatal"),
            false,
            handlerError,
            {
                {QStringLiteral("service"), service},
                {QStringLiteral("member"), member},
            });
        return QVariant();
    }
    return result;
}

void AnQstHostBridgeFacade::emitMessage(const QString& service, const QString& member, const QVariantList& args) {
    if (m_emitterHandler) {
        m_emitterHandler(service, member, args);
    }
}

void AnQstHostBridgeFacade::setInput(const QString& service, const QString& member, const QVariant& value) {
    if (m_inputHandler) {
        m_inputHandler(service, member, value);
    }
}

void AnQstHostBridgeFacade::resolveSlot(const QString& requestId, bool ok, const QVariant& payload, const QString& error) {
    if (!m_slotInvocationResponses.contains(requestId)) {
        return;
    }
    SlotInvocationResponse& response = m_slotInvocationResponses[requestId];
    response.done = true;
    response.ok = ok;
    response.payload = payload;
    response.error = error;
    emit slotInvocationResolved(requestId);
}

void AnQstHostBridgeFacade::emitHostError(
    const QString& code,
    const QString& category,
    const QString& severity,
    bool recoverable,
    const QString& message,
    const QVariantMap& context) {
    QVariantMap payload;
    payload.insert(QStringLiteral("code"), code);
    payload.insert(QStringLiteral("category"), category);
    payload.insert(QStringLiteral("severity"), severity);
    payload.insert(QStringLiteral("recoverable"), recoverable);
    payload.insert(QStringLiteral("message"), message);
    payload.insert(QStringLiteral("context"), context);
    payload.insert(QStringLiteral("timestamp"), QDateTime::currentDateTimeUtc().toString(Qt::ISODateWithMs));
    emit bridgeHostError(payload);
}

QString AnQstHostBridgeFacade::makeSlotKey(const QString& service, const QString& member) const {
    return service + QStringLiteral("::") + member;
}

void AnQstHostBridgeFacade::dispatchQueuedSlotInvocations(const QString& slotKey) {
    if (!m_queuedSlotInvocations.contains(slotKey)) {
        return;
    }

    auto& queue = m_queuedSlotInvocations[slotKey];
    while (!queue.isEmpty()) {
        const PendingSlotInvocation pending = queue.dequeue();
        emit bridgeSlotInvocationRequested(pending.requestId, pending.service, pending.member, pending.args);
    }
}

void AnQstHostBridgeFacade::emitQueuedSlotOverflowError(const QString& slotKey) {
    emitHostError(
        QStringLiteral("HOST_SLOT_QUEUE_OVERFLOW"),
        QStringLiteral("runtime"),
        QStringLiteral("error"),
        true,
        QStringLiteral("Slot queue exceeded capacity."),
        {
            {QStringLiteral("slot"), slotKey},
            {QStringLiteral("maxQueueSize"), kMaxQueuedSlotInvocations},
        });
}

void AnQstHostBridgeFacade::emitOutputSnapshot() {
    for (auto it = m_outputValues.constBegin(); it != m_outputValues.constEnd(); ++it) {
        const QString key = it.key();
        const int splitIdx = key.indexOf(QStringLiteral("::"));
        if (splitIdx <= 0) {
            continue;
        }
        const QString service = key.left(splitIdx);
        const QString member = key.mid(splitIdx + 2);
        emit bridgeOutputUpdated(service, member, it.value());
    }
}
