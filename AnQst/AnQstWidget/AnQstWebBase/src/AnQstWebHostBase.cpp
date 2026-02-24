#include "AnQstWebHostBase.h"

#include "AnQstBridgeProxy.h"
#include "AnQstHostBridgeFacade.h"
#include "AngularHttpBaseServer.h"

#include <QContextMenuEvent>
#include <QDir>
#include <QEvent>
#include <QFile>
#include <QFileInfo>
#include <QKeySequence>
#include <QLabel>
#include <QShortcut>
#include <QVBoxLayout>
#include <QWebChannel>
#include <QWebEnginePage>
#include <QWebEngineScript>
#include <QWebEngineScriptCollection>
#include <QWebEngineView>

namespace {
static QString normalizeQrcRoot(const QString& root) {
    QString normalized = root.trimmed();
    if (normalized.startsWith(QStringLiteral(":/"))) {
        normalized = QStringLiteral("qrc") + normalized;
    }
    if (!normalized.startsWith(QStringLiteral("qrc:/"))) {
        return QString();
    }
    if (normalized.endsWith('/')) {
        normalized.chop(1);
    }
    return normalized;
}

class LocalOnlyWebPage final : public QWebEnginePage {
public:
    explicit LocalOnlyWebPage(QObject* parent = nullptr)
        : QWebEnginePage(parent) {}

protected:
    bool acceptNavigationRequest(const QUrl& url, NavigationType type, bool isMainFrame) override {
        Q_UNUSED(type);
        Q_UNUSED(isMainFrame);
        const QString scheme = url.scheme().toLower();
        if (scheme == QStringLiteral("http") || scheme == QStringLiteral("https") ||
            scheme == QStringLiteral("ws") || scheme == QStringLiteral("wss")) {
            if (parent() != nullptr) {
                QMetaObject::invokeMethod(parent(), "handleNavigationPolicyError", Q_ARG(QUrl, url));
            }
            return false;
        }
        return QWebEnginePage::acceptNavigationRequest(url, type, isMainFrame);
    }
};

} // namespace

class LocalWebView final : public QWebEngineView {
public:
    explicit LocalWebView(QWidget* parent = nullptr)
        : QWebEngineView(parent) {}

    void setContextMenuEnabled(bool enabled) { m_contextMenuEnabled = enabled; }

protected:
    void contextMenuEvent(QContextMenuEvent* event) override {
        if (m_contextMenuEnabled) {
            QWebEngineView::contextMenuEvent(event);
        } else {
            event->accept();
        }
    }

private:
    bool m_contextMenuEnabled = true;
};

AnQstWebHostBase::AnQstWebHostBase(QWidget* parent)
    : QWidget(parent)
    , m_view(new LocalWebView(this))
    , m_devPlaceholder(new QLabel(this))
    , m_webChannel(new QWebChannel(this))
    , m_bridgeFacade(new AnQstHostBridgeFacade(this))
    , m_bridgeProxy(new AnQstBridgeProxy(m_bridgeFacade, this))
    , m_devServer(new AngularHttpBaseServer(this))
    , m_contentRootMode(ContentRootMode::Unset)
    , m_bridgeObject(nullptr)
    , m_bridgeAttached(false)
    , m_contentRootSet(false)
    , m_entryPointLoaded(false)
    , m_bridgeBootstrapInstalled(false)
    , m_developmentModeEnabled(false)
    , m_developmentModeAllowLan(false)
    , m_textSelectionEnabled(true) {
    auto* layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->addWidget(m_view);
    layout->addWidget(m_devPlaceholder);
    setLayout(layout);

    m_devPlaceholder->setVisible(false);
    m_devPlaceholder->setStyleSheet(QStringLiteral("background-color: #2e7d32; color: #ffffff; font-weight: 600; padding: 12px;"));
    m_devPlaceholder->setObjectName(QStringLiteral("AnQstDevModePlaceholder"));
    m_devPlaceholder->setWordWrap(true);
    m_devPlaceholder->setAlignment(Qt::AlignCenter);

    m_view->setPage(new LocalOnlyWebPage(this));
    m_view->page()->setWebChannel(m_webChannel);
    installBridgeBootstrapScript();

    connect(m_view, &QWebEngineView::loadFinished, this, &AnQstWebHostBase::handleLoadFinished);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeOutputUpdated, this, &AnQstWebHostBase::anQstBridge_outputUpdated);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeSlotInvocationRequested, this, &AnQstWebHostBase::anQstBridge_slotInvocationRequested);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeOutputUpdated, m_bridgeProxy, &AnQstBridgeProxy::anQstBridge_outputUpdated);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeSlotInvocationRequested, m_bridgeProxy, &AnQstBridgeProxy::anQstBridge_slotInvocationRequested);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeHostError, this, &AnQstWebHostBase::onHostError);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::slotInvocationResolved, this, &AnQstWebHostBase::slotInvocationResolved);

    auto* debugShortcut = new QShortcut(QKeySequence(Qt::SHIFT | Qt::Key_F12), this);
    debugShortcut->setContext(Qt::WidgetWithChildrenShortcut);
    connect(debugShortcut, &QShortcut::activated, this, &AnQstWebHostBase::enableDebug);

    m_devServer->setFacade(m_bridgeFacade);
    connect(m_devServer, &AngularHttpBaseServer::serverError, this, [this](const QVariantMap& payload) {
        emitHostError(
            payload.value(QStringLiteral("code")).toString(),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            true,
            payload.value(QStringLiteral("message")).toString(),
            payload.value(QStringLiteral("context")).toMap());
    });
    connect(m_devServer, &AngularHttpBaseServer::clientAttached, this, [this](const QString& peer) {
        emitHostError(
            QStringLiteral("HOST_DEV_CLIENT_ATTACHED"),
            QStringLiteral("bridge"),
            QStringLiteral("info"),
            true,
            QStringLiteral("Development browser client attached."),
            {
                {QStringLiteral("peer"), peer},
            });
    });
    connect(m_devServer, &AngularHttpBaseServer::clientDetached, this, [this]() {
        emitHostError(
            QStringLiteral("HOST_DEV_CLIENT_DETACHED"),
            QStringLiteral("bridge"),
            QStringLiteral("info"),
            true,
            QStringLiteral("Development browser client detached."));
    });
}

bool AnQstWebHostBase::installBridgeBootstrapScript(const QString& scriptSource, bool forceReinstall) {
    if (m_bridgeBootstrapInstalled && !forceReinstall) {
        return true;
    }

    QString source = scriptSource;
    if (source.isNull()) {
        source = loadDefaultBridgeBootstrapScript();
    }
    if (source.trimmed().isEmpty()) {
        emitHostError(
            QStringLiteral("HOST_BRIDGE_BOOTSTRAP_UNAVAILABLE"),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            false,
            QStringLiteral("Failed to load qwebchannel bootstrap script."));
        return false;
    }

    QWebEngineScript bootstrapScript;
    bootstrapScript.setName(QStringLiteral("AnQstBridgeBootstrap"));
    bootstrapScript.setInjectionPoint(QWebEngineScript::DocumentCreation);
    bootstrapScript.setWorldId(QWebEngineScript::MainWorld);
    bootstrapScript.setRunsOnSubFrames(false);
    bootstrapScript.setSourceCode(source);
    m_view->page()->scripts().insert(bootstrapScript);
    m_bridgeBootstrapInstalled = true;
    return true;
}

bool AnQstWebHostBase::setContentRoot(const QString& rootPath) {
    if (m_contentRootSet) {
        qWarning("AnQstWebHostBase: setContentRoot() can only be called once. Ignoring recall.");
        emitHostError(
            QStringLiteral("HOST_CONTENT_ROOT_RECALL_IGNORED"),
            QStringLiteral("lifecycle"),
            QStringLiteral("warn"),
            true,
            QStringLiteral("setContentRoot() recall ignored."),
            { { QStringLiteral("providedRoot"), rootPath } });
        return false;
    }

    if (rootPath.trimmed().isEmpty()) {
        emitHostError(
            QStringLiteral("HOST_CONTENT_ROOT_INVALID"),
            QStringLiteral("load"),
            QStringLiteral("error"),
            false,
            QStringLiteral("Content root cannot be empty."));
        return false;
    }

    const QString normalizedQrcRoot = normalizeQrcRoot(rootPath);
    if (!normalizedQrcRoot.isEmpty()) {
        m_contentRootMode = ContentRootMode::Qrc;
        m_contentRoot = normalizedQrcRoot;
    } else {
        const QFileInfo rootInfo(rootPath);
        if (!rootInfo.exists() || !rootInfo.isDir()) {
            emitHostError(
                QStringLiteral("HOST_CONTENT_ROOT_NOT_FOUND"),
                QStringLiteral("load"),
                QStringLiteral("error"),
                false,
                QStringLiteral("Filesystem content root is missing or not a directory."),
                { { QStringLiteral("contentRoot"), rootPath } });
            return false;
        }
        m_contentRootMode = ContentRootMode::Filesystem;
        m_contentRoot = rootInfo.absoluteFilePath();
    }

    m_contentRootSet = true;
    return true;
}

bool AnQstWebHostBase::loadEntryPoint(const QString& entryPoint) {
    if (!m_contentRootSet) {
        emitHostError(
            QStringLiteral("HOST_CONTENT_ROOT_UNSET"),
            QStringLiteral("lifecycle"),
            QStringLiteral("error"),
            false,
            QStringLiteral("loadEntryPoint() requires setContentRoot() first."));
        return false;
    }

    const QUrl targetUrl = resolveAssetPath(entryPoint);
    if (!targetUrl.isValid()) {
        return false;
    }

    if ((m_contentRootMode == ContentRootMode::Filesystem && !QFileInfo::exists(targetUrl.toLocalFile())) ||
        (m_contentRootMode == ContentRootMode::Qrc && !QFileInfo::exists(QStringLiteral(":") + targetUrl.path()))) {
        emitHostError(
            QStringLiteral("HOST_LOAD_ENTRY_NOT_FOUND"),
            QStringLiteral("load"),
            QStringLiteral("error"),
            false,
            QStringLiteral("Entry point was not found."),
            { { QStringLiteral("entryPoint"), entryPoint }, { QStringLiteral("resolvedUrl"), targetUrl.toString() } });
        return false;
    }

    m_entryPoint = entryPoint;
    m_entryPointLoaded = false;
    if (!m_developmentModeEnabled) {
        m_view->setUrl(targetUrl);
    } else {
        m_entryPointLoaded = true;
    }
    return true;
}

bool AnQstWebHostBase::setBridgeObject(QObject* bridgeObject, const QString& objectName) {
    if (m_bridgeAttached) {
        qWarning("AnQstWebHostBase: setBridgeObject() can only be called once. Ignoring recall.");
        emitHostError(
            QStringLiteral("HOST_BRIDGE_RECALL_IGNORED"),
            QStringLiteral("lifecycle"),
            QStringLiteral("warn"),
            true,
            QStringLiteral("setBridgeObject() recall ignored."),
            { { QStringLiteral("objectName"), objectName } });
        return false;
    }

    if (bridgeObject == nullptr || objectName.trimmed().isEmpty()) {
        emitHostError(
            QStringLiteral("HOST_BRIDGE_SETUP_FAILED"),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            false,
            QStringLiteral("Bridge object and object name must be valid."));
        return false;
    }

    m_bridgeObject = bridgeObject;
    m_bridgeObjectName = objectName;
    m_webChannel->registerObject(m_bridgeObjectName, m_bridgeProxy);
    m_devServer->setBridgeObjectName(m_bridgeObjectName);
    m_bridgeAttached = true;

    if (shouldEmitReady()) {
        emit onHostReady();
        emitOutputSnapshotIfReady();
    }

    return true;
}

QUrl AnQstWebHostBase::resolveAssetPath(const QString& relativePath) const {
    if (!m_contentRootSet) {
        const_cast<AnQstWebHostBase*>(this)->emitHostError(
            QStringLiteral("HOST_CONTENT_ROOT_UNSET"),
            QStringLiteral("lifecycle"),
            QStringLiteral("error"),
            false,
            QStringLiteral("resolveAssetPath() requires setContentRoot() first."));
        return QUrl();
    }

    const QUrl provided(relativePath);
    if (provided.isValid() && !provided.scheme().isEmpty()) {
        if (isBlockedScheme(provided)) {
            const_cast<AnQstWebHostBase*>(this)->emitHostError(
                QStringLiteral("HOST_POLICY_SCHEME_BLOCKED"),
                QStringLiteral("policy"),
                QStringLiteral("error"),
                true,
                QStringLiteral("Blocked disallowed URL scheme."),
                { { QStringLiteral("url"), provided.toString() } });
            return QUrl();
        }
        if (provided.isLocalFile() || provided.scheme() == QStringLiteral("qrc")) {
            return provided;
        }
    }

    if (m_contentRootMode == ContentRootMode::Filesystem) {
        QDir rootDir(m_contentRoot);
        const QString cleanedPath = QDir::cleanPath(rootDir.absoluteFilePath(relativePath));
        return QUrl::fromLocalFile(cleanedPath);
    }

    const QString joined = QDir::cleanPath(m_contentRoot + QStringLiteral("/") + relativePath);
    return QUrl(joined);
}

void AnQstWebHostBase::setCallHandler(const CallHandler& handler) {
    m_bridgeFacade->setCallHandler(handler);
}

void AnQstWebHostBase::setCallSyncHandler(const CallHandler& handler) {
    m_bridgeFacade->setCallSyncHandler(handler);
}

void AnQstWebHostBase::setEmitterHandler(const EmitterHandler& handler) {
    m_bridgeFacade->setEmitterHandler(handler);
}

void AnQstWebHostBase::setInputHandler(const InputHandler& handler) {
    m_bridgeFacade->setInputHandler(handler);
}

void AnQstWebHostBase::setOutputValue(const QString& service, const QString& member, const QVariant& value) {
    m_bridgeFacade->setOutputValue(service, member, value);
}

bool AnQstWebHostBase::invokeSlot(const QString& service, const QString& member, const QVariantList& args, QVariant* result, QString* error) {
    return m_bridgeFacade->invokeSlot(service, member, args, result, error);
}

void AnQstWebHostBase::setSlotInvocationTimeoutMs(int timeoutMs) {
    m_bridgeFacade->setSlotInvocationTimeoutMs(timeoutMs);
}

int AnQstWebHostBase::slotInvocationTimeoutMs() const {
    return m_bridgeFacade->slotInvocationTimeoutMs();
}

QString AnQstWebHostBase::contentRoot() const {
    return m_contentRoot;
}

AnQstWebHostBase::ContentRootMode AnQstWebHostBase::contentRootMode() const {
    return m_contentRootMode;
}

bool AnQstWebHostBase::isBridgeSet() const {
    return m_bridgeAttached;
}

void AnQstWebHostBase::anQstBridge_registerSlot(const QString& service, const QString& member) {
    m_bridgeFacade->registerSlot(service, member);
}

QVariant AnQstWebHostBase::anQstBridge_call(const QString& service, const QString& member, const QVariantList& args) {
    return m_bridgeFacade->call(service, member, args);
}

QVariant AnQstWebHostBase::anQstBridge_callSync(const QString& service, const QString& member, const QVariantList& args) {
    return m_bridgeFacade->callSync(service, member, args);
}

void AnQstWebHostBase::anQstBridge_emit(const QString& service, const QString& member, const QVariantList& args) {
    m_bridgeFacade->emitMessage(service, member, args);
}

void AnQstWebHostBase::anQstBridge_setInput(const QString& service, const QString& member, const QVariant& value) {
    m_bridgeFacade->setInput(service, member, value);
}

void AnQstWebHostBase::anQstBridge_resolveSlot(const QString& requestId, bool ok, const QVariant& payload, const QString& error) {
    m_bridgeFacade->resolveSlot(requestId, ok, payload, error);
}

void AnQstWebHostBase::handleLoadFinished(bool ok) {
    if (!ok) {
        emitHostError(
            QStringLiteral("HOST_LOAD_FAILED"),
            QStringLiteral("load"),
            QStringLiteral("error"),
            false,
            QStringLiteral("Host failed to load entry point."),
            { { QStringLiteral("entryPoint"), m_entryPoint } });
        return;
    }

    m_entryPointLoaded = true;

    if (shouldEmitReady()) {
        emit onHostReady();
        emitOutputSnapshotIfReady();
    }
}

void AnQstWebHostBase::handleNavigationPolicyError(const QUrl& blockedUrl) {
    emitHostError(
        QStringLiteral("HOST_POLICY_SCHEME_BLOCKED"),
        QStringLiteral("policy"),
        QStringLiteral("error"),
        true,
        QStringLiteral("Navigation blocked by local-content policy."),
        { { QStringLiteral("url"), blockedUrl.toString() } });
}

void AnQstWebHostBase::handleNetworkPolicyError(const QUrl& blockedUrl) {
    emitHostError(
        QStringLiteral("HOST_POLICY_SCHEME_BLOCKED"),
        QStringLiteral("policy"),
        QStringLiteral("error"),
        true,
        QStringLiteral("Network resource blocked by local-content policy."),
        { { QStringLiteral("url"), blockedUrl.toString() } });
}

void AnQstWebHostBase::emitHostError(
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
    emit onHostError(payload);
}

bool AnQstWebHostBase::isBlockedScheme(const QUrl& url) const {
    const QString scheme = url.scheme().toLower();
    return scheme == QStringLiteral("http") ||
           scheme == QStringLiteral("https") ||
           scheme == QStringLiteral("ws") ||
           scheme == QStringLiteral("wss");
}

bool AnQstWebHostBase::isContentRootSet() const {
    return m_contentRootSet;
}

bool AnQstWebHostBase::isEntryPointLoaded() const {
    return m_entryPointLoaded;
}

bool AnQstWebHostBase::shouldEmitReady() const {
    return isContentRootSet() && isEntryPointLoaded() && m_bridgeAttached;
}

void AnQstWebHostBase::emitOutputSnapshotIfReady() {
    m_bridgeFacade->setDispatchEnabled(shouldEmitReady());
}

QString AnQstWebHostBase::loadDefaultBridgeBootstrapScript() const {
    QFile scriptFile(QStringLiteral(":/qtwebchannel/qwebchannel.js"));
    if (!scriptFile.open(QIODevice::ReadOnly | QIODevice::Text)) {
        return QString();
    }
    return QString::fromUtf8(scriptFile.readAll());
}

void AnQstWebHostBase::setContextMenuEnabled(bool enabled) {
    m_view->setContextMenuEnabled(enabled);
}

void AnQstWebHostBase::setTextSelectionEnabled(bool enabled) {
    if (m_textSelectionEnabled == enabled) {
        return;
    }
    m_textSelectionEnabled = enabled;

    static const QString kScriptName = QStringLiteral("AnQstDisableTextSelection");
    static const QString kDisableJs = QStringLiteral(
        "(function(){"
        "if(!document.getElementById('anqst-no-select')){"
        "var s=document.createElement('style');"
        "s.id='anqst-no-select';"
        "s.textContent='*{user-select:none!important;-webkit-user-select:none!important}';"
        "document.head.appendChild(s);"
        "}"
        "})();"
    );
    static const QString kEnableJs = QStringLiteral(
        "(function(){var el=document.getElementById('anqst-no-select');if(el)el.parentNode.removeChild(el);})();"
    );

    auto& scripts = m_view->page()->scripts();
    const QWebEngineScript existing = scripts.findScript(kScriptName);
    if (!existing.isNull()) {
        scripts.remove(existing);
    }

    if (!enabled) {
        QWebEngineScript script;
        script.setName(kScriptName);
        script.setInjectionPoint(QWebEngineScript::DocumentReady);
        script.setWorldId(QWebEngineScript::MainWorld);
        script.setRunsOnSubFrames(false);
        script.setSourceCode(kDisableJs);
        scripts.insert(script);
        m_view->page()->runJavaScript(kDisableJs);
    } else {
        m_view->page()->runJavaScript(kEnableJs);
    }
}

bool AnQstWebHostBase::enableDebug() {
    if (m_developmentModeEnabled) {
        return true;
    }
    if (!m_contentRootSet || m_entryPoint.trimmed().isEmpty()) {
        emitHostError(
            QStringLiteral("HOST_DEV_MODE_PRECONDITION_FAILED"),
            QStringLiteral("lifecycle"),
            QStringLiteral("error"),
            true,
            QStringLiteral("enableDebug() requires configured content root and entry point."));
        return false;
    }

    AngularHttpBaseServer::ContentRootMode serverMode = AngularHttpBaseServer::ContentRootMode::Unset;
    if (m_contentRootMode == ContentRootMode::Filesystem) {
        serverMode = AngularHttpBaseServer::ContentRootMode::Filesystem;
    } else if (m_contentRootMode == ContentRootMode::Qrc) {
        serverMode = AngularHttpBaseServer::ContentRootMode::Qrc;
    }

    if (!m_devServer->configureContent(serverMode, m_contentRoot, m_entryPoint)) {
        return false;
    }
    if (!m_devServer->start(m_developmentModeAllowLan)) {
        emitHostError(
            QStringLiteral("HOST_DEV_MODE_SERVER_START_FAILED"),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Failed to start development mode HTTP/WebSocket server."));
        return false;
    }

    m_developmentModeEnabled = true;
    m_developmentModeUrl = m_devServer->url();
    m_entryPointLoaded = true;

    m_view->setUrl(QUrl(QStringLiteral("about:blank")));
    m_view->setVisible(false);
    m_devPlaceholder->setVisible(true);
    m_devPlaceholder->setText(QStringLiteral("Development Mode Enabled: Connect to %1 to continue").arg(m_developmentModeUrl));

    emit developmentModeEnabled(m_developmentModeUrl);
    emitHostError(
        QStringLiteral("HOST_DEV_MODE_ENABLED"),
        QStringLiteral("lifecycle"),
        QStringLiteral("info"),
        true,
        QStringLiteral("Development mode enabled."),
        {
            {QStringLiteral("url"), m_developmentModeUrl},
            {QStringLiteral("httpPort"), static_cast<int>(m_devServer->httpPort())},
            {QStringLiteral("wsPort"), static_cast<int>(m_devServer->wsPort())},
        });
    emitOutputSnapshotIfReady();
    return true;
}

bool AnQstWebHostBase::isDevelopmentModeEnabled() const {
    return m_developmentModeEnabled;
}

QString AnQstWebHostBase::developmentModeUrl() const {
    return m_developmentModeUrl;
}

void AnQstWebHostBase::setDevelopmentModeAllowLan(bool allowLan) {
    m_developmentModeAllowLan = allowLan;
}

bool AnQstWebHostBase::developmentModeAllowLan() const {
    return m_developmentModeAllowLan;
}

