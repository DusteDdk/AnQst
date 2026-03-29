#pragma once

#include <QDateTime>
#include <QHash>
#include <QMap>
#include <QObject>
#include <QQueue>
#include <QString>
#include <QVariant>
#include <QVariantList>
#include <QVariantMap>
#include <functional>

class AnQstHostBridgeFacade : public QObject {
    Q_OBJECT

public:
    static constexpr int kMaxQueuedSlotInvocations = 1024;

    using CallHandler = std::function<QVariant(const QString& service, const QString& member, const QVariantList& args)>;
    using EmitterHandler = std::function<void(const QString& service, const QString& member, const QVariantList& args)>;
    using InputHandler = std::function<void(const QString& service, const QString& member, const QVariant&)>;

    explicit AnQstHostBridgeFacade(QObject* parent = nullptr);

    void setCallHandler(const CallHandler& handler);
    void setEmitterHandler(const EmitterHandler& handler);
    void setInputHandler(const InputHandler& handler);
    void setOutputValue(const QString& service, const QString& member, const QVariant& value);
    bool invokeSlot(const QString& service, const QString& member, const QVariantList& args, QVariant* result = nullptr, QString* error = nullptr);
    void setSlotInvocationTimeoutMs(int timeoutMs);
    int slotInvocationTimeoutMs() const;

    void setDispatchEnabled(bool enabled);
    bool dispatchEnabled() const;

    void emitDrop(const QString& service, const QString& member, const QVariant& payload, double x, double y);
    void emitHover(const QString& service, const QString& member, const QVariant& payload, double x, double y);
    void emitHoverLeft(const QString& service, const QString& member);

    void registerSlot(const QString& service, const QString& member);
    QVariant call(const QString& service, const QString& member, const QVariantList& args);
    void emitMessage(const QString& service, const QString& member, const QVariantList& args);
    void setInput(const QString& service, const QString& member, const QVariant& value);
    void resolveSlot(const QString& requestId, bool ok, const QVariant& payload, const QString& error);

signals:
    void bridgeOutputUpdated(const QString& service, const QString& member, const QVariant& value);
    void bridgeSlotInvocationRequested(const QString& requestId, const QString& service, const QString& member, const QVariantList& args);
    void bridgeHostError(const QVariantMap& errorPayload);
    void slotInvocationResolved(const QString& requestId);
    void bridgeDropReceived(const QString& service, const QString& member, const QVariant& payload, double x, double y);
    void bridgeHoverUpdated(const QString& service, const QString& member, const QVariant& payload, double x, double y);
    void bridgeHoverLeft(const QString& service, const QString& member);

private:
    struct PendingSlotInvocation {
        QString requestId;
        QString service;
        QString member;
        QVariantList args;
    };

    struct SlotInvocationResponse {
        bool done{false};
        bool ok{false};
        QVariant payload;
        QString error;
    };

    void emitHostError(
        const QString& code,
        const QString& category,
        const QString& severity,
        bool recoverable,
        const QString& message,
        const QVariantMap& context = QVariantMap());
    QString makeSlotKey(const QString& service, const QString& member) const;
    void dispatchQueuedSlotInvocations(const QString& slotKey);
    void emitQueuedSlotOverflowError(const QString& slotKey);
    void emitOutputSnapshot();

    bool m_dispatchEnabled;
    quint64 m_slotRequestCounter;
    CallHandler m_callHandler;
    EmitterHandler m_emitterHandler;
    InputHandler m_inputHandler;
    QHash<QString, bool> m_registeredSlots;
    QHash<QString, QQueue<PendingSlotInvocation>> m_queuedSlotInvocations;
    QHash<QString, SlotInvocationResponse> m_slotInvocationResponses;
    QHash<QString, QVariant> m_outputValues;
    int m_slotInvocationTimeoutMs;
};
