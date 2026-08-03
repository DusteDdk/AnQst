#pragma once
#include <QByteArray>
#include <QDateTime>
#include <QHash>
#include <QMetaMethod>
#include <QQueue>
#include <QVariant>
#include <QVariantList>
#include <functional>
#include <optional>
#include "AnQstWebHostBase.h"
#include "TortureWidgetTypes.h"

namespace TortureWidget {
} // namespace TortureWidget

using namespace TortureWidget;

class TortureWidgetWidget : public anqstwebbase_1_7_7::AnQstWebHostBase {
    Q_OBJECT


public:
    using PingHandler = std::function<QString(const QString& value)>;

    class handle {
    public:
        explicit handle(TortureWidgetWidget* owner) : m_owner(owner) {}
    void ping(const PingHandler& handler) const;
    private:
        TortureWidgetWidget* m_owner;
    };

    explicit TortureWidgetWidget(QWidget* parent = nullptr);
    ~TortureWidgetWidget() override;
    bool enableDebug();
    static constexpr const char* kBootstrapEntryPoint = "index.html";
    static constexpr const char* kBootstrapContentRoot = "qrc:/torturewidget";
    static constexpr const char* kBootstrapBridgeObject = "TortureWidgetBridge";
    static constexpr int kMaxQueuedCallsPerEndpoint = 1024;


    handle handle;


public slots:



signals:

    void diagnosticsForwarded(const QVariantMap& payload);

protected:
    void connectNotify(const QMetaMethod& signal) override;
    void disconnectNotify(const QMetaMethod& signal) override;

private:
    struct PendingCallInvocation {
        QString requestId;
        QVariantList args;
        QDateTime enqueuedAt;
    };
    static QString makeBindingKey(const QString& service, const QString& member);
    void installBridgeBindings();
    bool hasEmitterListeners(const QString& service, const QString& member) const;
    QVariant handleGeneratedCall(const QString& service, const QString& member, const QVariantList& args);
    void handleGeneratedEmitter(const QString& service, const QString& member, const QVariantList& args);
    void handleGeneratedInput(const QString& service, const QString& member, const QVariant& value);
    QVariant waitForCallHandlerAndInvoke(
        const QString& service,
        const QString& member,
        const QString& requestId,
        int timeoutMs,
        const std::function<QVariant()>& invokeNow);
    void removeQueuedCallById(const QString& queueKey, const QString& requestId);
    void setPingCallHandler(const PingHandler& handler);

    qulonglong m_callRequestCounter{0};
    QHash<QString, QQueue<PendingCallInvocation>> m_queuedCalls;
    PingHandler m_pingHandler;
};
