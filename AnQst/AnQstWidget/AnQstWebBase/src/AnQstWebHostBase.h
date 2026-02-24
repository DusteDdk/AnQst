#pragma once

#include <QDateTime>
#include <QObject>
#include <QString>
#include <QUrl>
#include <QVariantMap>
#include <QVariantList>
#include <QWidget>
#include <functional>

class AnQstBridgeProxy;
class AnQstHostBridgeFacade;
class AngularHttpBaseServer;
class LocalWebView;
class QLabel;
class QWebChannel;

class AnQstWebHostBase : public QWidget {
    Q_OBJECT

public:
    enum class ContentRootMode {
        Unset,
        Qrc,
        Filesystem
    };
    Q_ENUM(ContentRootMode)

    explicit AnQstWebHostBase(QWidget* parent = nullptr);

    static constexpr int kMaxQueuedSlotInvocations = 10000000;

    using CallHandler = std::function<QVariant(const QString& service, const QString& member, const QVariantList& args)>;
    using EmitterHandler = std::function<void(const QString& service, const QString& member, const QVariantList& args)>;
    using InputHandler = std::function<void(const QString& service, const QString& member, const QVariant&)>;

    bool setContentRoot(const QString& rootPath);
    bool loadEntryPoint(const QString& entryPoint);
    bool setBridgeObject(QObject* bridgeObject = nullptr, const QString& objectName = QStringLiteral("anqstBridge"));
    QUrl resolveAssetPath(const QString& relativePath) const;
    bool installBridgeBootstrapScript(const QString& scriptSource = QString(), bool forceReinstall = false);
    bool enableDebug();
    bool isDevelopmentModeEnabled() const;
    QString developmentModeUrl() const;
    void setDevelopmentModeAllowLan(bool allowLan);
    bool developmentModeAllowLan() const;

    void setContextMenuEnabled(bool enabled);
    void setTextSelectionEnabled(bool enabled);

    void setCallHandler(const CallHandler& handler);
    void setCallSyncHandler(const CallHandler& handler);
    void setEmitterHandler(const EmitterHandler& handler);
    void setInputHandler(const InputHandler& handler);
    void setOutputValue(const QString& service, const QString& member, const QVariant& value);
    bool invokeSlot(const QString& service, const QString& member, const QVariantList& args, QVariant* result = nullptr, QString* error = nullptr);
    void setSlotInvocationTimeoutMs(int timeoutMs);
    int slotInvocationTimeoutMs() const;

    QString contentRoot() const;
    ContentRootMode contentRootMode() const;
    bool isBridgeSet() const;

    // Web->Qt behavior channels exposed to QWebChannel.
    Q_INVOKABLE void anQstBridge_registerSlot(const QString& service, const QString& member);
    Q_INVOKABLE QVariant anQstBridge_call(const QString& service, const QString& member, const QVariantList& args);
    Q_INVOKABLE QVariant anQstBridge_callSync(const QString& service, const QString& member, const QVariantList& args);
    Q_INVOKABLE void anQstBridge_emit(const QString& service, const QString& member, const QVariantList& args);
    Q_INVOKABLE void anQstBridge_setInput(const QString& service, const QString& member, const QVariant& value);
    Q_INVOKABLE void anQstBridge_resolveSlot(const QString& requestId, bool ok, const QVariant& payload, const QString& error);

signals:
    void onHostReady();
    void onHostError(const QVariantMap& errorPayload);
    void anQstBridge_outputUpdated(const QString& service, const QString& member, const QVariant& value);
    void anQstBridge_slotInvocationRequested(const QString& requestId, const QString& service, const QString& member, const QVariantList& args);
    void slotInvocationResolved(const QString& requestId);
    void developmentModeEnabled(const QString& url);

private slots:
    void handleLoadFinished(bool ok);
    void handleNavigationPolicyError(const QUrl& blockedUrl);
    void handleNetworkPolicyError(const QUrl& blockedUrl);

private:
    void emitHostError(
        const QString& code,
        const QString& category,
        const QString& severity,
        bool recoverable,
        const QString& message,
        const QVariantMap& context = QVariantMap());
    bool isBlockedScheme(const QUrl& url) const;
    bool isContentRootSet() const;
    bool isEntryPointLoaded() const;
    bool shouldEmitReady() const;
    void emitOutputSnapshotIfReady();
    QString loadDefaultBridgeBootstrapScript() const;

    LocalWebView* m_view;
    QLabel* m_devPlaceholder;
    QWebChannel* m_webChannel;
    AnQstHostBridgeFacade* m_bridgeFacade;
    AnQstBridgeProxy* m_bridgeProxy;
    AngularHttpBaseServer* m_devServer;
    QString m_contentRoot;
    ContentRootMode m_contentRootMode;
    QString m_entryPoint;
    QObject* m_bridgeObject;
    QString m_bridgeObjectName;
    bool m_bridgeAttached;
    bool m_contentRootSet;
    bool m_entryPointLoaded;
    bool m_bridgeBootstrapInstalled;
    bool m_developmentModeEnabled;
    bool m_developmentModeAllowLan;
    bool m_textSelectionEnabled;
    QString m_developmentModeUrl;
};

