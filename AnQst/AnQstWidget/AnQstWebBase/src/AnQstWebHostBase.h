#pragma once

#include <QDateTime>
#include <QHash>
#include <QObject>
#include <QPoint>
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
class QMimeData;
class QPushButton;
class QTimer;
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

    enum class AnQstWidgetResourceProvider {
        Qrc,
        Dir,
        Http
    };
    Q_ENUM(AnQstWidgetResourceProvider)

    enum class AnQstAngularAppHost {
        Application,
        Browser
    };
    Q_ENUM(AnQstAngularAppHost)

    explicit AnQstWebHostBase(QWidget* parent = nullptr);

    static constexpr int kMaxQueuedSlotInvocations = 1024;

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
    void setRemoteNavigationBlocked(bool blocked);
    bool remoteNavigationBlocked() const;

    void setCallHandler(const CallHandler& handler);
    void setEmitterHandler(const EmitterHandler& handler);
    void setInputHandler(const InputHandler& handler);
    void setOutputValue(const QString& service, const QString& member, const QVariant& value);
    bool invokeSlot(const QString& service, const QString& member, const QVariantList& args, QVariant* result = nullptr, QString* error = nullptr);
    void setSlotInvocationTimeoutMs(int timeoutMs);
    int slotInvocationTimeoutMs() const;

    void registerDropTarget(const QString& service, const QString& member, const QString& mimeType);
    void registerHoverTarget(const QString& service, const QString& member, const QString& mimeType, int throttleIntervalMs);

    bool eventFilter(QObject* obj, QEvent* event) override;

    QString contentRoot() const;
    ContentRootMode contentRootMode() const;
    bool isBridgeSet() const;

    // Web->Qt behavior channels exposed to QWebChannel.
    Q_INVOKABLE void anQstBridge_registerSlot(const QString& service, const QString& member);
    Q_INVOKABLE QVariant anQstBridge_call(const QString& service, const QString& member, const QVariantList& args);
    Q_INVOKABLE void anQstBridge_emit(const QString& service, const QString& member, const QVariantList& args);
    Q_INVOKABLE void anQstBridge_setInput(const QString& service, const QString& member, const QVariant& value);
    Q_INVOKABLE void anQstBridge_resolveSlot(const QString& requestId, bool ok, const QVariant& payload, const QString& error);

signals:
    void onHostReady();
    void onHostError(const QVariantMap& errorPayload);
    void onWebEngineError(const QString& channel, const QString& detail);
    void anQstBridge_outputUpdated(const QString& service, const QString& member, const QVariant& value);
    void anQstBridge_slotInvocationRequested(const QString& requestId, const QString& service, const QString& member, const QVariantList& args);
    void slotInvocationResolved(const QString& requestId);
    void developmentModeEnabled(const QString& url);
    void anQstBridge_dropReceived(const QString& service, const QString& member, const QVariant& payload, double x, double y);
    void anQstBridge_hoverUpdated(const QString& service, const QString& member, const QVariant& payload, double x, double y);
    void anQstBridge_hoverLeft(const QString& service, const QString& member);

private slots:
    void handleLoadFinished(bool ok);
    void handleNavigationPolicyError(const QUrl& blockedUrl);
    void handleNetworkPolicyError(const QUrl& blockedUrl);
    void handleWebEngineDiagnostic(const QString& channel, const QString& detail);
    void handleDebugShortcut();
    void handleReattachRequested();

protected:
    void emitHostError(
        const QString& code,
        const QString& category,
        const QString& severity,
        bool recoverable,
        const QString& message,
        const QVariantMap& context = QVariantMap());

private:
    struct DebugState {
        AnQstWidgetResourceProvider provider = AnQstWidgetResourceProvider::Qrc;
        AnQstAngularAppHost host = AnQstAngularAppHost::Application;
        QString resourceUrl;
        QString resourceDir;
    };

    struct DebugDialogResult {
        bool accepted = false;
        DebugState nextState;
        bool openBrowser = false;
    };

    DebugState currentDebugState() const;
    DebugDialogResult runDebugDialog(const DebugState& initialState);
    bool applyDebugStateChange(const DebugState& previousState, const DebugDialogResult& dialogResult);
    bool applyApplicationHostState(const DebugState& previousState, const DebugState& nextState);
    bool applyBrowserHostState(const DebugState& previousState, const DebugState& nextState, bool openBrowser);
    bool configureServerForProvider(const DebugState& nextState);
    bool ensureDirectoryProviderValid(const QString& directoryInput, QString* normalizedRoot = nullptr) const;
    bool ensureHttpProviderValid(const QString& urlText, QUrl* normalizedUrl = nullptr) const;
    QUrl resolveEntryPointForProvider(const DebugState& state, bool* requiresServer) const;
    void showEmbeddedView(const QUrl& targetUrl);
    void showBrowserPlaceholder(const QString& browserUrl);
    bool openUrlInBrowser(const QString& urlText) const;
    QString normalizedDirectoryRoot(const QString& directoryInput) const;
    QString browserUrl() const;
    QString debugWidgetName() const;
    void applyDebugBorderHint();
    void emitWebEngineError(const QString& channel, const QString& detail);
    bool isBlockedScheme(const QUrl& url) const;
    bool isContentRootSet() const;
    bool isEntryPointLoaded() const;
    bool shouldEmitReady() const;
    void emitOutputSnapshotIfReady();
    QString loadDefaultBridgeBootstrapScript() const;

    struct DragTargetBinding {
        QString service;
        QString member;
        int throttleIntervalMs = 0;
    };

    void installDragDropEventFilter();
    bool matchDropMimeType(const QMimeData* mime, QString* matchedMimeType) const;
    QVariant deserializeMimePayload(const QMimeData* mime, const QString& mimeType);
    void dispatchHoverThrottle();

    LocalWebView* m_view;
    QLabel* m_devPlaceholder;
    QPushButton* m_reattachButton;
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
    DebugState m_debugState;
    bool m_remoteNavigationBlocked;

    QHash<QString, DragTargetBinding> m_dropTargets;
    QHash<QString, DragTargetBinding> m_hoverTargets;
    QTimer* m_hoverThrottleTimer;
    QPoint m_pendingHoverPos;
    QVariant m_cachedHoverPayload;
    QString m_cachedHoverService;
    QString m_cachedHoverMember;
    bool m_dragDropFilterInstalled;
};
