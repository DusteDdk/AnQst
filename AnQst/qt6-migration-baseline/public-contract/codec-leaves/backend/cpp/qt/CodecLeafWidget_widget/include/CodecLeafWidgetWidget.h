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
#include "CodecLeafWidgetTypes.h"

namespace CodecLeafWidget {
} // namespace CodecLeafWidget

using namespace CodecLeafWidget;

class CodecLeafWidgetWidget : public anqstwebbase_1_7_7::AnQstWebHostBase {
    Q_OBJECT


public:
    using RoundTripScalarsHandler = std::function<CodecLeafWidget::ScalarLeaves(const CodecLeafWidget::ScalarLeaves& value)>;
    using RoundTripBinaryHandler = std::function<CodecLeafWidget::BinaryLeaves(const CodecLeafWidget::BinaryLeaves& value)>;

    class handle {
    public:
        explicit handle(CodecLeafWidgetWidget* owner) : m_owner(owner) {}
    void roundTripScalars(const RoundTripScalarsHandler& handler) const;
    void roundTripBinary(const RoundTripBinaryHandler& handler) const;
    private:
        CodecLeafWidgetWidget* m_owner;
    };

    explicit CodecLeafWidgetWidget(QWidget* parent = nullptr);
    ~CodecLeafWidgetWidget() override;
    bool enableDebug();
    static constexpr const char* kBootstrapEntryPoint = "index.html";
    static constexpr const char* kBootstrapContentRoot = "qrc:/codecleafwidget";
    static constexpr const char* kBootstrapBridgeObject = "CodecLeafWidgetBridge";
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
    void setRoundTripScalarsCallHandler(const RoundTripScalarsHandler& handler);
    void setRoundTripBinaryCallHandler(const RoundTripBinaryHandler& handler);

    qulonglong m_callRequestCounter{0};
    QHash<QString, QQueue<PendingCallInvocation>> m_queuedCalls;
    RoundTripScalarsHandler m_roundTripScalarsHandler;
    RoundTripBinaryHandler m_roundTripBinaryHandler;
};
