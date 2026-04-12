#include "AnQstWebHostBase.h"

#include "AnQstBridgeProxy.h"
#include "AnQstHostBridgeFacade.h"
#include "AnQstWidgetDebugDialog.h"
#include "AngularHttpBaseServer.h"

#include <QAuthenticator>
#include <QDesktopServices>
#include <QContextMenuEvent>
#include <QDir>
#include <QDragEnterEvent>
#include <QDragLeaveEvent>
#include <QDragMoveEvent>
#include <QDropEvent>
#include <QEvent>
#include <QFile>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QKeySequence>
#include <QLabel>
#include <QDebug>
#include <QMimeData>
#include <QPushButton>
#include <QProcessEnvironment>
#include <QShortcut>
#include <QStringList>
#include <QTimer>
#include <QVBoxLayout>
#include <QWebChannel>
#include <QWebEngineCertificateError>
#include <QWebEnginePage>
#include <QWebEngineScript>
#include <QWebEngineScriptCollection>
#include <QWebEngineView>

namespace {
static QString boolToString(bool value) {
    return value ? QStringLiteral("true") : QStringLiteral("false");
}

static void appendDetailValue(QStringList& lines, const QString& label, const QString& value) {
    if (!value.trimmed().isEmpty()) {
        lines.append(label + value);
    }
}

static void appendDetailBlock(QStringList& lines, const QString& label, const QString& value) {
    if (value.trimmed().isEmpty()) {
        return;
    }
    lines.append(label);
    lines.append(value);
}

static QString joinDetailLines(const QStringList& lines) {
    return lines.join(QStringLiteral("\n"));
}

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

static void disableWebEngineSandboxForTrustedHost() {
    // The hosted page is considered trusted at application level.
    qputenv("QTWEBENGINE_DISABLE_SANDBOX", QByteArrayLiteral("1"));

    QByteArray flags = qgetenv("QTWEBENGINE_CHROMIUM_FLAGS");
    if (!flags.contains("--no-sandbox")) {
        if (!flags.trimmed().isEmpty()) {
            flags.append(' ');
        }
        flags.append("--no-sandbox");
    }
    qputenv("QTWEBENGINE_CHROMIUM_FLAGS", flags);
}

static bool shouldEmitJavaScriptConsoleLevel(QWebEnginePage::JavaScriptConsoleMessageLevel level) {
    return level == QWebEnginePage::WarningMessageLevel ||
           level == QWebEnginePage::ErrorMessageLevel;
}

static QString javaScriptConsoleLevelToString(QWebEnginePage::JavaScriptConsoleMessageLevel level) {
    switch (level) {
    case QWebEnginePage::InfoMessageLevel:
        return QStringLiteral("info");
    case QWebEnginePage::WarningMessageLevel:
        return QStringLiteral("warning");
    case QWebEnginePage::ErrorMessageLevel:
        return QStringLiteral("error");
    }
    return QStringLiteral("unknown");
}

static QString renderProcessTerminationStatusToString(QWebEnginePage::RenderProcessTerminationStatus status) {
    switch (status) {
    case QWebEnginePage::NormalTerminationStatus:
        return QStringLiteral("normal");
    case QWebEnginePage::AbnormalTerminationStatus:
        return QStringLiteral("abnormal");
    case QWebEnginePage::CrashedTerminationStatus:
        return QStringLiteral("crashed");
    case QWebEnginePage::KilledTerminationStatus:
        return QStringLiteral("killed");
    }
    return QStringLiteral("unknown");
}

static QString structuredJavaScriptChannel(const QString& message) {
    if (message.startsWith(QStringLiteral("[AnQst][resource.error]"))) {
        return QStringLiteral("webengine.resource_load_error");
    }
    if (message.startsWith(QStringLiteral("[AnQst][window.error]"))) {
        return QStringLiteral("js.window.error");
    }
    if (message.startsWith(QStringLiteral("[AnQst][unhandledrejection]"))) {
        return QStringLiteral("js.unhandledrejection");
    }
    return QString();
}

static QString normalizedJavaScriptConsoleMessage(const QString& message) {
    const int newlineIndex = message.indexOf(QLatin1Char('\n'));
    if (message.startsWith(QStringLiteral("[AnQst][")) && newlineIndex >= 0) {
        return message.mid(newlineIndex + 1);
    }
    if (message.startsWith(QStringLiteral("[AnQst]["))) {
        return QString();
    }
    return message;
}

static QString javaScriptConsoleChannel(
    QWebEnginePage::JavaScriptConsoleMessageLevel level,
    const QString& message) {
    const QString structuredChannel = structuredJavaScriptChannel(message);
    if (!structuredChannel.isEmpty()) {
        return structuredChannel;
    }
    switch (level) {
    case QWebEnginePage::WarningMessageLevel:
        return QStringLiteral("js.console.warning");
    case QWebEnginePage::ErrorMessageLevel:
        return QStringLiteral("js.console.error");
    case QWebEnginePage::InfoMessageLevel:
        return QStringLiteral("js.console.info");
    }
    return QStringLiteral("js.console.unknown");
}

static QString formatJavaScriptConsoleDetail(
    QWebEnginePage::JavaScriptConsoleMessageLevel level,
    const QString& message,
    int lineNumber,
    const QString& sourceId) {
    QStringList lines;
    lines.append(QStringLiteral("JavaScript console %1.").arg(javaScriptConsoleLevelToString(level)));
    appendDetailValue(lines, QStringLiteral("Source: "), sourceId);
    if (lineNumber > 0) {
        lines.append(QStringLiteral("Line: %1").arg(lineNumber));
    }
    appendDetailBlock(lines, QStringLiteral("Message:"), normalizedJavaScriptConsoleMessage(message));
    return joinDetailLines(lines);
}

static QString formatJavaScriptConsoleLogLine(
    QWebEnginePage::JavaScriptConsoleMessageLevel level,
    const QString& message,
    int lineNumber,
    const QString& sourceId) {
    QStringList parts;
    parts.append(QStringLiteral("[%1]").arg(javaScriptConsoleLevelToString(level)));
    if (!sourceId.trimmed().isEmpty() && lineNumber > 0) {
        parts.append(QStringLiteral("%1:%2").arg(sourceId).arg(lineNumber));
    } else if (!sourceId.trimmed().isEmpty()) {
        parts.append(sourceId);
    } else if (lineNumber > 0) {
        parts.append(QStringLiteral("line: %1").arg(lineNumber));
    }
    const QString messageText = normalizedJavaScriptConsoleMessage(message).trimmed();
    if (!messageText.isEmpty()) {
        parts.append(messageText);
    }
    return parts.join(QStringLiteral(" "));
}

static QString formatCertificateErrorDetail(const QWebEngineCertificateError& certificateError) {
    QStringList lines;
    lines.append(QStringLiteral("TLS certificate error while loading a request."));
    appendDetailValue(lines, QStringLiteral("URL: "), certificateError.url().toString());
    appendDetailValue(lines, QStringLiteral("Description: "), certificateError.errorDescription());
    lines.append(QStringLiteral("Error code: %1").arg(static_cast<int>(certificateError.error())));
    lines.append(QStringLiteral("Overridable: %1").arg(boolToString(certificateError.isOverridable())));
    lines.append(QStringLiteral("Deferred: %1").arg(boolToString(certificateError.deferred())));
    return joinDetailLines(lines);
}

class LocalOnlyWebPage final : public QWebEnginePage {
public:
    explicit LocalOnlyWebPage(QObject* parent = nullptr)
        : QWebEnginePage(parent) {}

protected:
    bool acceptNavigationRequest(const QUrl& url, NavigationType type, bool isMainFrame) override {
        Q_UNUSED(type);
        Q_UNUSED(isMainFrame);
        const QObject* host = parent();
        const bool blockRemoteNavigation = host != nullptr
            ? host->property("anqstBlockRemoteNavigation").toBool()
            : true;
        const QString scheme = url.scheme().toLower();
        if (blockRemoteNavigation &&
            (scheme == QStringLiteral("http") || scheme == QStringLiteral("https") ||
             scheme == QStringLiteral("ws") || scheme == QStringLiteral("wss"))) {
            if (parent() != nullptr) {
                QMetaObject::invokeMethod(parent(), "handleNavigationPolicyError", Q_ARG(QUrl, url));
            }
            return false;
        }
        return QWebEnginePage::acceptNavigationRequest(url, type, isMainFrame);
    }

    void javaScriptConsoleMessage(
        JavaScriptConsoleMessageLevel level,
        const QString& message,
        int lineNumber,
        const QString& sourceID) override {
        if (parent() != nullptr) {
            QMetaObject::invokeMethod(
                parent(),
                "handleJavaScriptConsoleLine",
                Q_ARG(QString, formatJavaScriptConsoleLogLine(level, message, lineNumber, sourceID)));
        }
        if (shouldEmitJavaScriptConsoleLevel(level) && parent() != nullptr) {
            QMetaObject::invokeMethod(
                parent(),
                "handleWebEngineDiagnostic",
                Q_ARG(QString, javaScriptConsoleChannel(level, message)),
                Q_ARG(QString, formatJavaScriptConsoleDetail(level, message, lineNumber, sourceID)));
        }
        QWebEnginePage::javaScriptConsoleMessage(level, message, lineNumber, sourceID);
    }

    bool certificateError(const QWebEngineCertificateError& certificateError) override {
        if (parent() != nullptr) {
            QMetaObject::invokeMethod(
                parent(),
                "handleWebEngineDiagnostic",
                Q_ARG(QString, QStringLiteral("webengine.certificate_error")),
                Q_ARG(QString, formatCertificateErrorDetail(certificateError)));
        }
        return QWebEnginePage::certificateError(certificateError);
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
    , m_reattachButton(new QPushButton(QStringLiteral("Reattach"), this))
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
    , m_textSelectionEnabled(false)
    , m_scrollbarsEnabled(false)
    , m_debugState()
    , m_remoteNavigationBlocked(true)
    , m_activeDebugDialog(nullptr)
    , m_hoverThrottleTimer(new QTimer(this))
    , m_dragDropFilterInstalled(false)
{
    disableWebEngineSandboxForTrustedHost();
    setProperty("anqstBlockRemoteNavigation", true);

    auto* layout = new QVBoxLayout(this);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->addWidget(m_view);
    layout->addWidget(m_devPlaceholder);
    layout->addWidget(m_reattachButton);
    setLayout(layout);

    m_devPlaceholder->setVisible(false);
    m_devPlaceholder->setStyleSheet(QStringLiteral("background-color: #2e7d32; color: #ffffff; font-weight: 600; padding: 12px;"));
    m_devPlaceholder->setObjectName(QStringLiteral("AnQstDevModePlaceholder"));
    m_devPlaceholder->setWordWrap(true);
    m_devPlaceholder->setAlignment(Qt::AlignCenter);
    m_devPlaceholder->setTextFormat(Qt::RichText);
    m_devPlaceholder->setTextInteractionFlags(Qt::TextBrowserInteraction);
    m_devPlaceholder->setOpenExternalLinks(true);
    m_reattachButton->setVisible(false);
    m_reattachButton->setObjectName(QStringLiteral("AnQstDevModeReattachButton"));
    connect(m_reattachButton, &QPushButton::clicked, this, &AnQstWebHostBase::handleReattachRequested);

    m_view->setPage(new LocalOnlyWebPage(this));
    auto* page = m_view->page();
    page->setWebChannel(m_webChannel);
    setRemoteNavigationBlocked(true);
    installBridgeBootstrapScript();
    applyTextSelectionPolicy();
    applyScrollbarPolicy();
    m_debugState.provider = AnQstWidgetResourceProvider::Qrc;
    m_debugState.host = AnQstAngularAppHost::Application;
    m_debugState.resourceUrl = QStringLiteral("http://localhost:4200/");
    m_debugState.resourceDir = QDir::currentPath();
    applyDebugBorderHint();

    connect(m_view, &QWebEngineView::loadFinished, this, &AnQstWebHostBase::handleLoadFinished);
    connect(m_view, &QWebEngineView::renderProcessTerminated, this,
            [this, page](QWebEnginePage::RenderProcessTerminationStatus terminationStatus, int exitCode) {
                QStringList lines;
                lines.append(QStringLiteral("WebEngine render process terminated."));
                lines.append(QStringLiteral("Status: %1").arg(renderProcessTerminationStatusToString(terminationStatus)));
                lines.append(QStringLiteral("Exit code: %1").arg(exitCode));
                appendDetailValue(lines, QStringLiteral("Requested URL: "), page->requestedUrl().toString());
                appendDetailValue(lines, QStringLiteral("Current URL: "), m_view->url().toString());
                emitWebEngineError(QStringLiteral("webengine.render_process_terminated"), joinDetailLines(lines));
            });
    connect(page, &QWebEnginePage::authenticationRequired, this,
            [this](const QUrl& requestUrl, QAuthenticator* authenticator) {
                QStringList lines;
                lines.append(QStringLiteral("WebEngine request requires HTTP authentication."));
                appendDetailValue(lines, QStringLiteral("URL: "), requestUrl.toString());
                if (authenticator != nullptr) {
                    appendDetailValue(lines, QStringLiteral("Realm: "), authenticator->realm());
                }
                emitWebEngineError(QStringLiteral("webengine.authentication_required"), joinDetailLines(lines));
            });
    connect(page, &QWebEnginePage::proxyAuthenticationRequired, this,
            [this](const QUrl& requestUrl, QAuthenticator* authenticator, const QString& proxyHost) {
                QStringList lines;
                lines.append(QStringLiteral("WebEngine request requires proxy authentication."));
                appendDetailValue(lines, QStringLiteral("URL: "), requestUrl.toString());
                appendDetailValue(lines, QStringLiteral("Proxy host: "), proxyHost);
                if (authenticator != nullptr) {
                    appendDetailValue(lines, QStringLiteral("Realm: "), authenticator->realm());
                }
                emitWebEngineError(QStringLiteral("webengine.proxy_authentication_required"), joinDetailLines(lines));
            });
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeOutputUpdated, this, &AnQstWebHostBase::anQstBridge_outputUpdated);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeSlotInvocationRequested, this, &AnQstWebHostBase::anQstBridge_slotInvocationRequested);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeOutputUpdated, m_bridgeProxy, &AnQstBridgeProxy::anQstBridge_outputUpdated);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeSlotInvocationRequested, m_bridgeProxy, &AnQstBridgeProxy::anQstBridge_slotInvocationRequested);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeHostError, this, &AnQstWebHostBase::onHostError);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeHostError, m_bridgeProxy, &AnQstBridgeProxy::anQstBridge_hostDiagnostic);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::slotInvocationResolved, this, &AnQstWebHostBase::slotInvocationResolved);

    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeDropReceived, this, &AnQstWebHostBase::anQstBridge_dropReceived);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeDropReceived, m_bridgeProxy, &AnQstBridgeProxy::anQstBridge_dropReceived);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeHoverUpdated, this, &AnQstWebHostBase::anQstBridge_hoverUpdated);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeHoverUpdated, m_bridgeProxy, &AnQstBridgeProxy::anQstBridge_hoverUpdated);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeHoverLeft, this, &AnQstWebHostBase::anQstBridge_hoverLeft);
    connect(m_bridgeFacade, &AnQstHostBridgeFacade::bridgeHoverLeft, m_bridgeProxy, &AnQstBridgeProxy::anQstBridge_hoverLeft);

    m_hoverThrottleTimer->setSingleShot(true);
    connect(m_hoverThrottleTimer, &QTimer::timeout, this, &AnQstWebHostBase::dispatchHoverThrottle);

    auto* debugShortcut = new QShortcut(QKeySequence(Qt::SHIFT | Qt::Key_F12), this);
    debugShortcut->setContext(Qt::WidgetWithChildrenShortcut);
    connect(debugShortcut, &QShortcut::activated, this, &AnQstWebHostBase::handleDebugShortcut);

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
        QStringList lines;
        lines.append(QStringLiteral("Host failed to load entry point."));
        appendDetailValue(lines, QStringLiteral("Entry point: "), m_entryPoint);
        appendDetailValue(lines, QStringLiteral("Requested URL: "), m_view->page()->requestedUrl().toString());
        appendDetailValue(lines, QStringLiteral("Current URL: "), m_view->url().toString());
        emitWebEngineError(QStringLiteral("webengine.load_failed"), joinDetailLines(lines));
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
    installDragDropEventFilter();

    if (shouldEmitReady()) {
        emit onHostReady();
        emitOutputSnapshotIfReady();
    }
}

void AnQstWebHostBase::handleNavigationPolicyError(const QUrl& blockedUrl) {
    QStringList lines;
    lines.append(QStringLiteral("Navigation blocked by local-content policy."));
    appendDetailValue(lines, QStringLiteral("URL: "), blockedUrl.toString());
    emitWebEngineError(QStringLiteral("webengine.navigation_blocked"), joinDetailLines(lines));
    emitHostError(
        QStringLiteral("HOST_POLICY_SCHEME_BLOCKED"),
        QStringLiteral("policy"),
        QStringLiteral("error"),
        true,
        QStringLiteral("Navigation blocked by local-content policy."),
        { { QStringLiteral("url"), blockedUrl.toString() } });
}

void AnQstWebHostBase::handleNetworkPolicyError(const QUrl& blockedUrl) {
    QStringList lines;
    lines.append(QStringLiteral("Network resource blocked by local-content policy."));
    appendDetailValue(lines, QStringLiteral("URL: "), blockedUrl.toString());
    emitWebEngineError(QStringLiteral("webengine.resource_blocked"), joinDetailLines(lines));
    emitHostError(
        QStringLiteral("HOST_POLICY_SCHEME_BLOCKED"),
        QStringLiteral("policy"),
        QStringLiteral("error"),
        true,
        QStringLiteral("Network resource blocked by local-content policy."),
        { { QStringLiteral("url"), blockedUrl.toString() } });
}

void AnQstWebHostBase::handleWebEngineDiagnostic(const QString& channel, const QString& detail) {
    emitWebEngineError(channel, detail);
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

void AnQstWebHostBase::emitWebEngineError(const QString& channel, const QString& detail) {
    emit onWebEngineError(channel, detail);
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
    QString script = QString::fromUtf8(scriptFile.readAll());
    script.append(QStringLiteral(R"JS(
;(() => {
  const anyWindow = window;
  const describeValue = (value) => {
    if (value === undefined) {
      return "undefined";
    }
    if (value === null) {
      return "null";
    }
    if (value instanceof Error) {
      if (typeof value.message === "string" && value.message.length > 0) {
        return value.message;
      }
      return String(value);
    }
    if (typeof value === "string") {
      return value;
    }
    try {
      const encoded = JSON.stringify(value);
      if (typeof encoded === "string" && encoded.length > 0) {
        return encoded;
      }
    } catch (_jsonError) {
    }
    return String(value);
  };
  const emitStructuredConsoleError = (channel, parts) => {
    const lines = [`[AnQst][${channel}]`];
    for (const part of parts) {
      if (typeof part === "string" && part.length > 0) {
        lines.push(part);
      }
    }
    console.error(lines.join("\n"));
  };
  if (!anyWindow.__anqstRawErrorHooksInstalled) {
    anyWindow.addEventListener(
      "error",
      (event) => {
        const target = event?.target;
        const source = event?.filename || target?.currentSrc || target?.src || target?.href || "";
        const line = Number.isFinite(event?.lineno) ? String(event.lineno) : "";
        const column = Number.isFinite(event?.colno) ? String(event.colno) : "";
        const error = event?.error;
        const stack = error && typeof error.stack === "string" ? error.stack : "";
        const tagName = typeof target?.tagName === "string" ? target.tagName.toLowerCase() : "";
        const parts = [];
        if (target && target !== anyWindow && !error) {
          parts.push("Resource load failure.");
          if (tagName.length > 0) {
            parts.push(`Element: <${tagName}>`);
          }
          if (source.length > 0) {
            parts.push(`Source: ${source}`);
          }
          emitStructuredConsoleError("resource.error", parts);
          return;
        }
        parts.push("Unhandled window error.");
        if (typeof event?.message === "string" && event.message.length > 0) {
          parts.push(`Message: ${event.message}`);
        }
        if (source.length > 0) {
          parts.push(`Source: ${source}`);
        }
        if (line.length > 0) {
          parts.push(`Line: ${line}`);
        }
        if (column.length > 0) {
          parts.push(`Column: ${column}`);
        }
        if (stack.length > 0) {
          parts.push("Stack:");
          parts.push(stack);
        }
        emitStructuredConsoleError("window.error", parts);
      },
      true
    );
    anyWindow.addEventListener("unhandledrejection", (event) => {
      const reason = event?.reason;
      const stack = reason && typeof reason.stack === "string" ? reason.stack : "";
      const parts = [
        "Unhandled promise rejection.",
        `Reason: ${describeValue(reason)}`
      ];
      if (stack.length > 0) {
        parts.push("Stack:");
        parts.push(stack);
      }
      emitStructuredConsoleError("unhandledrejection", parts);
    });
    anyWindow.__anqstRawErrorHooksInstalled = true;
  }
  const transport = anyWindow?.qt?.webChannelTransport;
  if (!transport || typeof transport !== "object") {
    return;
  }
  if (transport.__anqstMessageGuardInstalled) {
    return;
  }
  let wrapped = null;
  Object.defineProperty(transport, "onmessage", {
    configurable: true,
    enumerable: true,
    get() {
      return wrapped;
    },
    set(fn) {
      if (typeof fn !== "function") {
        wrapped = fn;
        return;
      }
      wrapped = function guardedQtWebChannelMessage(message) {
        if (message === undefined || message === null || message.data === undefined) {
          return;
        }
        return fn.call(this, message);
      };
    }
  });
  transport.__anqstMessageGuardInstalled = true;
})();
)JS"));
    return script;
}

void AnQstWebHostBase::setContextMenuEnabled(bool enabled) {
    m_view->setContextMenuEnabled(enabled);
}

void AnQstWebHostBase::setTextSelectionEnabled(bool enabled) {
    if (m_textSelectionEnabled == enabled) {
        return;
    }
    m_textSelectionEnabled = enabled;
    applyTextSelectionPolicy();
}

void AnQstWebHostBase::setScrollbarsEnabled(bool enabled) {
    if (m_scrollbarsEnabled == enabled) {
        return;
    }
    m_scrollbarsEnabled = enabled;
    applyScrollbarPolicy();
}

void AnQstWebHostBase::applyTextSelectionPolicy() {
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

    if (!m_textSelectionEnabled) {
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

void AnQstWebHostBase::applyScrollbarPolicy() {
    static const QString kScriptName = QStringLiteral("AnQstDisableScrollbars");
    static const QString kDisableJs = QStringLiteral(
        "(function(){"
        "if(!document.getElementById('anqst-no-scrollbars')){"
        "var s=document.createElement('style');"
        "s.id='anqst-no-scrollbars';"
        "s.textContent='html,body{overflow:hidden!important;}::-webkit-scrollbar{width:0!important;height:0!important;}';"
        "document.head.appendChild(s);"
        "}"
        "})();"
    );
    static const QString kEnableJs = QStringLiteral(
        "(function(){var el=document.getElementById('anqst-no-scrollbars');if(el)el.parentNode.removeChild(el);})();"
    );

    auto& scripts = m_view->page()->scripts();
    const QWebEngineScript existing = scripts.findScript(kScriptName);
    if (!existing.isNull()) {
        scripts.remove(existing);
    }

    if (!m_scrollbarsEnabled) {
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

void AnQstWebHostBase::setRemoteNavigationBlocked(bool blocked) {
    m_remoteNavigationBlocked = blocked;
    setProperty("anqstBlockRemoteNavigation", blocked);
}

bool AnQstWebHostBase::remoteNavigationBlocked() const {
    return m_remoteNavigationBlocked;
}

void AnQstWebHostBase::handleJavaScriptConsoleLine(const QString& line) {
    appendJsConsoleLine(line);
}

void AnQstWebHostBase::executeDebugJavaScript(const QString& source) {
    if (source.isEmpty()) {
        return;
    }
    appendJsConsoleCommandHistoryEntry(source);
    appendJsConsoleLine(QStringLiteral("> %1").arg(source));
    m_view->page()->runJavaScript(source);
}

void AnQstWebHostBase::handleDebugShortcut() {
    openDebugDialogModeless(currentDebugState());
}

void AnQstWebHostBase::handleReattachRequested() {
    if (m_debugState.host != AnQstAngularAppHost::Browser) {
        return;
    }

    DebugDialogResult dialogResult;
    dialogResult.accepted = true;
    dialogResult.nextState = m_debugState;
    dialogResult.nextState.host = AnQstAngularAppHost::Application;
    dialogResult.openBrowser = false;
    applyDebugStateChange(m_debugState, dialogResult);
}

AnQstWebHostBase::DebugState AnQstWebHostBase::currentDebugState() const {
    return m_debugState;
}

AnQstWebHostBase::DebugDialogResult AnQstWebHostBase::runDebugDialog(const DebugState& initialState) {
    AnQstWidgetDebugDialog::InitialState dialogState;
    dialogState.widgetName = debugWidgetName();
    dialogState.hostMode = initialState.host == AnQstAngularAppHost::Application
        ? AnQstWidgetDebugDialog::HostMode::Application
        : AnQstWidgetDebugDialog::HostMode::Browser;
    switch (initialState.provider) {
    case AnQstWidgetResourceProvider::Qrc:
        dialogState.resourceProvider = AnQstWidgetDebugDialog::ResourceProvider::Qrc;
        break;
    case AnQstWidgetResourceProvider::Dir:
        dialogState.resourceProvider = AnQstWidgetDebugDialog::ResourceProvider::Dir;
        break;
    case AnQstWidgetResourceProvider::Http:
        dialogState.resourceProvider = AnQstWidgetDebugDialog::ResourceProvider::Http;
        break;
    }
    dialogState.resourceUrl = initialState.resourceUrl;
    dialogState.resourceDirectory = initialState.resourceDir;
    dialogState.jsConsoleHistory = m_jsConsoleLines;
    dialogState.jsConsoleCommandHistory = m_jsConsoleCommandHistory;

    AnQstWidgetDebugDialog dialog(dialogState, this);
    connect(this, &AnQstWebHostBase::jsConsoleLineAppended, &dialog, &AnQstWidgetDebugDialog::appendJsConsoleLine);
    connect(&dialog, &AnQstWidgetDebugDialog::jsConsoleCommandSubmitted, this, &AnQstWebHostBase::executeDebugJavaScript);
    const int dialogCode = dialog.exec();
    const AnQstWidgetDebugDialog::ResultState dialogResult = dialog.resultState();

    DebugDialogResult result;
    result.accepted = (dialogCode == QDialog::Accepted) && dialogResult.accepted;
    result.nextState.host = dialogResult.hostMode == AnQstWidgetDebugDialog::HostMode::Application
        ? AnQstAngularAppHost::Application
        : AnQstAngularAppHost::Browser;
    switch (dialogResult.resourceProvider) {
    case AnQstWidgetDebugDialog::ResourceProvider::Qrc:
        result.nextState.provider = AnQstWidgetResourceProvider::Qrc;
        break;
    case AnQstWidgetDebugDialog::ResourceProvider::Dir:
        result.nextState.provider = AnQstWidgetResourceProvider::Dir;
        break;
    case AnQstWidgetDebugDialog::ResourceProvider::Http:
        result.nextState.provider = AnQstWidgetResourceProvider::Http;
        break;
    }
    result.nextState.resourceUrl = dialogResult.resourceUrl.trimmed();
    result.nextState.resourceDir = dialogResult.resourceDirectory.trimmed();
    result.openBrowser = dialogResult.openBrowserChecked;
    return result;
}

void AnQstWebHostBase::openDebugDialogModeless(const DebugState& initialState) {
    if (m_activeDebugDialog != nullptr) {
        m_activeDebugDialog->show();
        m_activeDebugDialog->raise();
        m_activeDebugDialog->activateWindow();
        return;
    }

    AnQstWidgetDebugDialog::InitialState dialogState;
    dialogState.widgetName = debugWidgetName();
    dialogState.hostMode = initialState.host == AnQstAngularAppHost::Application
        ? AnQstWidgetDebugDialog::HostMode::Application
        : AnQstWidgetDebugDialog::HostMode::Browser;
    switch (initialState.provider) {
    case AnQstWidgetResourceProvider::Qrc:
        dialogState.resourceProvider = AnQstWidgetDebugDialog::ResourceProvider::Qrc;
        break;
    case AnQstWidgetResourceProvider::Dir:
        dialogState.resourceProvider = AnQstWidgetDebugDialog::ResourceProvider::Dir;
        break;
    case AnQstWidgetResourceProvider::Http:
        dialogState.resourceProvider = AnQstWidgetDebugDialog::ResourceProvider::Http;
        break;
    }
    dialogState.resourceUrl = initialState.resourceUrl;
    dialogState.resourceDirectory = initialState.resourceDir;
    dialogState.jsConsoleHistory = m_jsConsoleLines;
    dialogState.jsConsoleCommandHistory = m_jsConsoleCommandHistory;

    auto* dialog = new AnQstWidgetDebugDialog(dialogState, this);
    dialog->setAttribute(Qt::WA_DeleteOnClose, true);
    dialog->setModal(false);
    dialog->setWindowModality(Qt::NonModal);
    m_activeDebugDialog = dialog;

    connect(this, &AnQstWebHostBase::jsConsoleLineAppended, dialog, &AnQstWidgetDebugDialog::appendJsConsoleLine);
    connect(dialog, &AnQstWidgetDebugDialog::jsConsoleCommandSubmitted, this, &AnQstWebHostBase::executeDebugJavaScript);
    connect(dialog, &QDialog::finished, this, [this, dialog, initialState](int dialogCode) {
        if (dialogCode == QDialog::Accepted) {
            const AnQstWidgetDebugDialog::ResultState dialogResult = dialog->resultState();
            DebugDialogResult result;
            result.accepted = dialogResult.accepted;
            result.nextState.host = dialogResult.hostMode == AnQstWidgetDebugDialog::HostMode::Application
                ? AnQstAngularAppHost::Application
                : AnQstAngularAppHost::Browser;
            switch (dialogResult.resourceProvider) {
            case AnQstWidgetDebugDialog::ResourceProvider::Qrc:
                result.nextState.provider = AnQstWidgetResourceProvider::Qrc;
                break;
            case AnQstWidgetDebugDialog::ResourceProvider::Dir:
                result.nextState.provider = AnQstWidgetResourceProvider::Dir;
                break;
            case AnQstWidgetDebugDialog::ResourceProvider::Http:
                result.nextState.provider = AnQstWidgetResourceProvider::Http;
                break;
            }
            result.nextState.resourceUrl = dialogResult.resourceUrl.trimmed();
            result.nextState.resourceDir = dialogResult.resourceDirectory.trimmed();
            result.openBrowser = dialogResult.openBrowserChecked;
            applyDebugStateChange(initialState, result);
        }
        if (m_activeDebugDialog == dialog) {
            m_activeDebugDialog = nullptr;
        }
    });
    connect(dialog, &QObject::destroyed, this, [this, dialog]() {
        if (m_activeDebugDialog == dialog) {
            m_activeDebugDialog = nullptr;
        }
    });

    dialog->show();
    dialog->raise();
    dialog->activateWindow();
}

bool AnQstWebHostBase::applyDebugStateChange(const DebugState& previousState, const DebugDialogResult& dialogResult) {
    if (!dialogResult.accepted) {
        return false;
    }
    DebugState nextState = dialogResult.nextState;
    nextState.resourceDir = normalizedDirectoryRoot(nextState.resourceDir);
    if (nextState.resourceDir.isEmpty()) {
        nextState.resourceDir = normalizedDirectoryRoot(QDir::currentPath());
    }

    if (nextState.provider == AnQstWidgetResourceProvider::Dir) {
        QString normalizedDirectory;
        if (!ensureDirectoryProviderValid(nextState.resourceDir, &normalizedDirectory)) {
            emitHostError(
                QStringLiteral("HOST_WIDGET_DEBUG_DIR_INVALID"),
                QStringLiteral("debug"),
                QStringLiteral("error"),
                true,
                QStringLiteral("The selected resource directory is invalid or not found."),
                {
                    {QStringLiteral("directory"), nextState.resourceDir},
                });
            return false;
        }
        nextState.resourceDir = normalizedDirectory;
    }
    if (nextState.provider == AnQstWidgetResourceProvider::Http) {
        QUrl normalizedUrl;
        if (!ensureHttpProviderValid(nextState.resourceUrl, &normalizedUrl)) {
            emitHostError(
                QStringLiteral("HOST_WIDGET_DEBUG_URL_INVALID"),
                QStringLiteral("debug"),
                QStringLiteral("error"),
                true,
                QStringLiteral("The selected HTTP resource URL is invalid."),
                {
                    {QStringLiteral("resourceUrl"), nextState.resourceUrl},
                });
            return false;
        }
        nextState.resourceUrl = normalizedUrl.toString();
    }

    bool ok = false;
    if (nextState.host == AnQstAngularAppHost::Application) {
        ok = applyApplicationHostState(previousState, nextState);
    } else {
        ok = applyBrowserHostState(previousState, nextState, dialogResult.openBrowser);
    }
    if (!ok) {
        return false;
    }

    m_debugState = nextState;
    m_developmentModeEnabled = (nextState.host == AnQstAngularAppHost::Browser);
    if (m_developmentModeEnabled) {
        m_developmentModeUrl = browserUrl();
    } else {
        m_developmentModeUrl.clear();
    }
    emitOutputSnapshotIfReady();
    return true;
}

bool AnQstWebHostBase::applyApplicationHostState(const DebugState& previousState, const DebugState& nextState) {
    bool requiresServer = false;
    const QUrl entryUrl = resolveEntryPointForProvider(nextState, &requiresServer);
    if (requiresServer) {
        const bool mustRestartServer = !m_devServer->isRunning() ||
                                       previousState.host != AnQstAngularAppHost::Application ||
                                       previousState.provider != nextState.provider ||
                                       previousState.resourceUrl != nextState.resourceUrl;
        if (mustRestartServer) {
            if (m_devServer->isRunning()) {
                m_devServer->stop();
            }
            if (!configureServerForProvider(nextState)) {
                return false;
            }
            if (!m_devServer->start(m_developmentModeAllowLan)) {
                emitHostError(
                    QStringLiteral("HOST_WIDGET_DEBUG_SERVER_START_FAILED"),
                    QStringLiteral("bridge"),
                    QStringLiteral("error"),
                    true,
                    QStringLiteral("Failed to start local debug server for Application host."));
                return false;
            }
        }
        const QUrl proxyUrl(m_devServer->url() + QStringLiteral("/"));
        if (!proxyUrl.isValid()) {
            emitHostError(
                QStringLiteral("HOST_WIDGET_DEBUG_PROXY_URL_INVALID"),
                QStringLiteral("debug"),
                QStringLiteral("error"),
                true,
                QStringLiteral("Failed to resolve local proxy URL for Application host."));
            return false;
        }
        setRemoteNavigationBlocked(false);
        showEmbeddedView(proxyUrl);
        return true;
    }

    if (!entryUrl.isValid()) {
        return false;
    }
    if (m_devServer->isRunning()) {
        m_devServer->stop();
    }
    setRemoteNavigationBlocked(true);
    showEmbeddedView(entryUrl);
    return true;
}

bool AnQstWebHostBase::applyBrowserHostState(const DebugState& previousState, const DebugState& nextState, bool openBrowser) {
    const bool mustRestartServer = !m_devServer->isRunning() ||
                                   previousState.host != AnQstAngularAppHost::Browser ||
                                   previousState.provider != nextState.provider ||
                                   previousState.resourceDir != nextState.resourceDir ||
                                   previousState.resourceUrl != nextState.resourceUrl;
    if (mustRestartServer) {
        if (m_devServer->isRunning()) {
            m_devServer->stop();
        }
        if (!configureServerForProvider(nextState)) {
            return false;
        }
        if (!m_devServer->start(m_developmentModeAllowLan)) {
            emitHostError(
                QStringLiteral("HOST_WIDGET_DEBUG_SERVER_START_FAILED"),
                QStringLiteral("bridge"),
                QStringLiteral("error"),
                true,
                QStringLiteral("Failed to start local debug server for Browser host."));
            return false;
        }
    }
    const QString url = browserUrl();
    if (url.isEmpty()) {
        emitHostError(
            QStringLiteral("HOST_WIDGET_DEBUG_BROWSER_URL_MISSING"),
            QStringLiteral("debug"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Browser host URL is unavailable."));
        return false;
    }
    setRemoteNavigationBlocked(true);
    showBrowserPlaceholder(url);
    m_entryPointLoaded = true;
    emit developmentModeEnabled(url);
    if (openBrowser) {
        openUrlInBrowser(url);
    }
    return true;
}

bool AnQstWebHostBase::configureServerForProvider(const DebugState& nextState) {
    if (m_entryPoint.trimmed().isEmpty()) {
        emitHostError(
            QStringLiteral("HOST_WIDGET_DEBUG_ENTRYPOINT_MISSING"),
            QStringLiteral("debug"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Entry point is missing for debug server configuration."));
        return false;
    }
    switch (nextState.provider) {
    case AnQstWidgetResourceProvider::Qrc:
        if (!m_contentRootSet || m_contentRootMode != ContentRootMode::Qrc) {
            emitHostError(
                QStringLiteral("HOST_WIDGET_DEBUG_QRC_UNAVAILABLE"),
                QStringLiteral("debug"),
                QStringLiteral("error"),
                true,
                QStringLiteral("QRC resource provider is unavailable for this widget."));
            return false;
        }
        return m_devServer->configureContent(AngularHttpBaseServer::ContentRootMode::Qrc, m_contentRoot, m_entryPoint);
    case AnQstWidgetResourceProvider::Dir: {
        QString normalizedRoot;
        if (!ensureDirectoryProviderValid(nextState.resourceDir, &normalizedRoot)) {
            return false;
        }
        return m_devServer->configureContent(AngularHttpBaseServer::ContentRootMode::Filesystem, normalizedRoot, m_entryPoint);
    }
    case AnQstWidgetResourceProvider::Http: {
        QUrl normalizedUrl;
        if (!ensureHttpProviderValid(nextState.resourceUrl, &normalizedUrl)) {
            return false;
        }
        return m_devServer->configureProxyTarget(normalizedUrl, m_entryPoint);
    }
    }
    return false;
}

bool AnQstWebHostBase::ensureDirectoryProviderValid(const QString& directoryInput, QString* normalizedRoot) const {
    if (normalizedRoot != nullptr) {
        normalizedRoot->clear();
    }
    const QString normalized = normalizedDirectoryRoot(directoryInput);
    if (normalized.isEmpty()) {
        return false;
    }
    const QFileInfo info(normalized);
    if (!info.exists() || !info.isDir()) {
        return false;
    }
    if (normalizedRoot != nullptr) {
        *normalizedRoot = normalized;
    }
    return true;
}

bool AnQstWebHostBase::ensureHttpProviderValid(const QString& urlText, QUrl* normalizedUrl) const {
    if (normalizedUrl != nullptr) {
        normalizedUrl->clear();
    }
    const QString trimmed = urlText.trimmed();
    if (trimmed.isEmpty()) {
        return false;
    }
    QUrl url(trimmed);
    if (!url.isValid() || url.scheme().trimmed().isEmpty() || url.host().trimmed().isEmpty()) {
        return false;
    }
    if (url.scheme().toLower() != QStringLiteral("http")) {
        return false;
    }
    url.setPath(QStringLiteral("/"));
    url.setQuery(QString());
    url.setFragment(QString());
    if (normalizedUrl != nullptr) {
        *normalizedUrl = url;
    }
    return true;
}

QUrl AnQstWebHostBase::resolveEntryPointForProvider(const DebugState& state, bool* requiresServer) const {
    if (requiresServer != nullptr) {
        *requiresServer = false;
    }
    if (m_entryPoint.trimmed().isEmpty()) {
        const_cast<AnQstWebHostBase*>(this)->emitHostError(
            QStringLiteral("HOST_WIDGET_DEBUG_ENTRYPOINT_MISSING"),
            QStringLiteral("debug"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Entry point must be configured before applying debug state."));
        return QUrl();
    }
    if (state.provider == AnQstWidgetResourceProvider::Http) {
        if (requiresServer != nullptr) {
            *requiresServer = true;
        }
        return QUrl();
    }
    if (state.provider == AnQstWidgetResourceProvider::Qrc) {
        return resolveAssetPath(m_entryPoint);
    }

    const QString normalizedRoot = normalizedDirectoryRoot(state.resourceDir);
    const QString absoluteEntry = QDir(normalizedRoot).absoluteFilePath(m_entryPoint);
    const QFileInfo entryInfo(absoluteEntry);
    if (!entryInfo.exists()) {
        const_cast<AnQstWebHostBase*>(this)->emitHostError(
            QStringLiteral("HOST_WIDGET_DEBUG_ENTRY_NOT_FOUND"),
            QStringLiteral("debug"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Directory provider entry point was not found."),
            {
                {QStringLiteral("entryPoint"), m_entryPoint},
                {QStringLiteral("resourceDir"), normalizedRoot},
            });
        return QUrl();
    }
    return QUrl::fromLocalFile(entryInfo.absoluteFilePath());
}

void AnQstWebHostBase::showEmbeddedView(const QUrl& targetUrl) {
    m_devPlaceholder->setVisible(false);
    m_reattachButton->setVisible(false);
    m_view->setVisible(true);
    m_entryPointLoaded = false;
    m_view->setUrl(targetUrl);
}

void AnQstWebHostBase::showBrowserPlaceholder(const QString& browserUrlText) {
    m_view->setUrl(QUrl(QStringLiteral("about:blank")));
    m_view->setVisible(false);
    m_devPlaceholder->setVisible(true);
    m_reattachButton->setVisible(true);
    const QString escapedUrl = browserUrlText.toHtmlEscaped();
    m_devPlaceholder->setText(
        QStringLiteral("Debug Browser Host: continue at <a href=\"%1\">%1</a>").arg(escapedUrl));
}

bool AnQstWebHostBase::openUrlInBrowser(const QString& urlText) const {
    const QUrl url(urlText.trimmed());
    if (!url.isValid()) {
        return false;
    }
    return QDesktopServices::openUrl(url);
}

QString AnQstWebHostBase::normalizedDirectoryRoot(const QString& directoryInput) const {
    const QString trimmed = directoryInput.trimmed();
    if (trimmed.isEmpty()) {
        return QString();
    }
    const QFileInfo directoryInfo(trimmed);
    if (directoryInfo.isAbsolute()) {
        return QDir::cleanPath(directoryInfo.absoluteFilePath());
    }
    return QDir::cleanPath(QDir::current().absoluteFilePath(trimmed));
}

QString AnQstWebHostBase::browserUrl() const {
    if (!m_devServer->isRunning()) {
        return QString();
    }
    return m_devServer->url() + QStringLiteral("/");
}

QString AnQstWebHostBase::debugWidgetName() const {
    if (!objectName().trimmed().isEmpty()) {
        return objectName().trimmed();
    }
    return QString::fromUtf8(metaObject()->className());
}

void AnQstWebHostBase::appendJsConsoleLine(const QString& line) {
    if (line.isEmpty()) {
        return;
    }
    m_jsConsoleLines.append(line);
    if (m_jsConsoleLines.size() > 20000) {
        m_jsConsoleLines.removeFirst();
    }
    emit jsConsoleLineAppended(line);
}

void AnQstWebHostBase::appendJsConsoleCommandHistoryEntry(const QString& source) {
    if (source.isEmpty()) {
        return;
    }
    m_jsConsoleCommandHistory.append(source);
    if (m_jsConsoleCommandHistory.size() > 20000) {
        m_jsConsoleCommandHistory.removeFirst();
    }
}

void AnQstWebHostBase::applyDebugBorderHint() {
    const QString debugHint = QProcessEnvironment::systemEnvironment()
                                  .value(QStringLiteral("ANQST_WIDGET_DEBUG"))
                                  .trimmed()
                                  .toLower();
    if (debugHint == QStringLiteral("true")) {
        m_view->setStyleSheet(QStringLiteral("border: 1px solid #6a1b9a;"));
        return;
    }
    m_view->setStyleSheet(QString());
}

bool AnQstWebHostBase::enableDebug() {
    const DebugState previousState = currentDebugState();
    const DebugDialogResult dialogResult = runDebugDialog(previousState);
    if (!dialogResult.accepted) {
        return false;
    }
    return applyDebugStateChange(previousState, dialogResult);
}

bool AnQstWebHostBase::isDevelopmentModeEnabled() const {
    return m_debugState.host == AnQstAngularAppHost::Browser;
}

QString AnQstWebHostBase::developmentModeUrl() const {
    if (m_debugState.host != AnQstAngularAppHost::Browser) {
        return QString();
    }
    return browserUrl();
}

void AnQstWebHostBase::setDevelopmentModeAllowLan(bool allowLan) {
    m_developmentModeAllowLan = allowLan;
}

bool AnQstWebHostBase::developmentModeAllowLan() const {
    return m_developmentModeAllowLan;
}

void AnQstWebHostBase::registerDropTarget(const QString& service, const QString& member, const QString& mimeType) {
    m_dropTargets.insert(mimeType, DragTargetBinding{service, member});
    installDragDropEventFilter();
}

void AnQstWebHostBase::registerHoverTarget(const QString& service, const QString& member, const QString& mimeType, int throttleIntervalMs) {
    m_hoverTargets.insert(mimeType, DragTargetBinding{service, member, throttleIntervalMs});
    installDragDropEventFilter();
}

void AnQstWebHostBase::installDragDropEventFilter() {
    if (m_dragDropFilterInstalled) {
        return;
    }
    if (m_dropTargets.isEmpty() && m_hoverTargets.isEmpty()) {
        return;
    }
    if (auto* fp = m_view->focusProxy()) {
        fp->setAcceptDrops(true);
        fp->installEventFilter(this);
        m_dragDropFilterInstalled = true;
    }
}

bool AnQstWebHostBase::matchDropMimeType(const QMimeData* mime, QString* matchedMimeType) const {
    for (auto it = m_dropTargets.constBegin(); it != m_dropTargets.constEnd(); ++it) {
        if (mime->hasFormat(it.key())) {
            *matchedMimeType = it.key();
            return true;
        }
    }
    for (auto it = m_hoverTargets.constBegin(); it != m_hoverTargets.constEnd(); ++it) {
        if (mime->hasFormat(it.key())) {
            *matchedMimeType = it.key();
            return true;
        }
    }
    return false;
}

QVariant AnQstWebHostBase::deserializeMimePayload(const QMimeData* mime, const QString& mimeType) {
    const QByteArray rawData = mime->data(mimeType);
    if (rawData.isEmpty()) {
        emitHostError(
            QStringLiteral("HOST_DRAGDROP_PAYLOAD_INVALID"),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Drag/drop MIME payload is empty."),
            {
                {QStringLiteral("mimeType"), mimeType},
            });
        return QVariant();
    }
    const char transportTag = rawData.at(0);
    const QByteArray payloadBytes = rawData.mid(1);
    if (transportTag == 'S') {
        return QString::fromUtf8(rawData);
    }
    if (transportTag != 'A' && transportTag != 'O') {
        emitHostError(
            QStringLiteral("HOST_DRAGDROP_PAYLOAD_INVALID"),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Drag/drop MIME payload has an unknown transport tag."),
            {
                {QStringLiteral("mimeType"), mimeType},
                {QStringLiteral("transportTag"), QString::fromLatin1(QByteArray(1, transportTag))},
            });
        return QVariant();
    }
    QJsonParseError parseError;
    const QJsonDocument doc = QJsonDocument::fromJson(payloadBytes, &parseError);
    if (parseError.error != QJsonParseError::NoError) {
        emitHostError(
            QStringLiteral("HOST_DRAGDROP_PAYLOAD_INVALID"),
            QStringLiteral("bridge"),
            QStringLiteral("error"),
            true,
            QStringLiteral("Drag/drop MIME payload is not valid JSON."),
            {
                {QStringLiteral("mimeType"), mimeType},
                {QStringLiteral("detail"), parseError.errorString()},
            });
        return QVariant();
    }
    if (transportTag == 'A') {
        if (!doc.isArray()) {
            emitHostError(
                QStringLiteral("HOST_DRAGDROP_PAYLOAD_INVALID"),
                QStringLiteral("bridge"),
                QStringLiteral("error"),
                true,
                QStringLiteral("Drag/drop MIME payload declared a JSON array carrier but did not decode as an array."),
                {
                    {QStringLiteral("mimeType"), mimeType},
                });
            return QVariant();
        }
        return QString::fromUtf8(rawData);
    }
    if (transportTag == 'O') {
        if (!doc.isObject()) {
            emitHostError(
                QStringLiteral("HOST_DRAGDROP_PAYLOAD_INVALID"),
                QStringLiteral("bridge"),
                QStringLiteral("error"),
                true,
                QStringLiteral("Drag/drop MIME payload declared a JSON object carrier but did not decode as an object."),
                {
                    {QStringLiteral("mimeType"), mimeType},
                });
            return QVariant();
        }
        return QString::fromUtf8(rawData);
    }
    return QVariant();
}

void AnQstWebHostBase::dispatchHoverThrottle() {
    if (m_cachedHoverService.isEmpty()) {
        return;
    }
    m_bridgeFacade->emitHover(
        m_cachedHoverService,
        m_cachedHoverMember,
        m_cachedHoverPayload,
        static_cast<double>(m_pendingHoverPos.x()),
        static_cast<double>(m_pendingHoverPos.y()));
}

bool AnQstWebHostBase::eventFilter(QObject* obj, QEvent* event) {
    if (m_dropTargets.isEmpty() && m_hoverTargets.isEmpty()) {
        return QWidget::eventFilter(obj, event);
    }

    if (event->type() == QEvent::DragEnter) {
        auto* de = static_cast<QDragEnterEvent*>(event);
        QString matchedMime;
        if (matchDropMimeType(de->mimeData(), &matchedMime)) {
            QVariant hoverPayload;
            if (m_hoverTargets.contains(matchedMime)) {
                hoverPayload = deserializeMimePayload(de->mimeData(), matchedMime);
                if (!hoverPayload.isValid()) {
                    de->ignore();
                    return true;
                }
            }
            de->acceptProposedAction();

            if (m_hoverTargets.contains(matchedMime)) {
                const DragTargetBinding& binding = m_hoverTargets.value(matchedMime);
                m_cachedHoverPayload = hoverPayload;
                m_cachedHoverService = binding.service;
                m_cachedHoverMember = binding.member;
                m_pendingHoverPos = de->pos();
                if (binding.throttleIntervalMs > 0) {
                    m_hoverThrottleTimer->setInterval(binding.throttleIntervalMs);
                }
                m_bridgeFacade->emitHover(
                    binding.service, binding.member,
                    m_cachedHoverPayload,
                    static_cast<double>(de->pos().x()),
                    static_cast<double>(de->pos().y()));
            }
            return true;
        }
    }

    if (event->type() == QEvent::DragMove) {
        auto* de = static_cast<QDragMoveEvent*>(event);
        QString matchedMime;
        if (matchDropMimeType(de->mimeData(), &matchedMime)) {
            de->acceptProposedAction();
            if (m_hoverTargets.contains(matchedMime)) {
                m_pendingHoverPos = de->pos();
                const DragTargetBinding& binding = m_hoverTargets.value(matchedMime);
                if (binding.throttleIntervalMs <= 0) {
                    dispatchHoverThrottle();
                } else if (!m_hoverThrottleTimer->isActive()) {
                    m_hoverThrottleTimer->start();
                }
            }
            return true;
        }
    }

    if (event->type() == QEvent::DragLeave) {
        m_hoverThrottleTimer->stop();
        if (!m_cachedHoverService.isEmpty()) {
            m_bridgeFacade->emitHoverLeft(m_cachedHoverService, m_cachedHoverMember);
            m_cachedHoverService.clear();
            m_cachedHoverMember.clear();
            m_cachedHoverPayload = QVariant();
        }
        // Always forward DragLeave to the web surface. Swallowing it breaks HTML5 drag/drop
        // inside the page when this filter is installed for AnQst Qt→web targets.
        return QWidget::eventFilter(obj, event);
    }

    if (event->type() == QEvent::Drop) {
        auto* de = static_cast<QDropEvent*>(event);
        m_hoverThrottleTimer->stop();

        if (!m_cachedHoverService.isEmpty()) {
            m_bridgeFacade->emitHoverLeft(m_cachedHoverService, m_cachedHoverMember);
            m_cachedHoverService.clear();
            m_cachedHoverMember.clear();
            m_cachedHoverPayload = QVariant();
        }

        QString matchedMime;
        if (matchDropMimeType(de->mimeData(), &matchedMime) && m_dropTargets.contains(matchedMime)) {
            const DragTargetBinding& binding = m_dropTargets.value(matchedMime);
            const QVariant payload = deserializeMimePayload(de->mimeData(), matchedMime);
            if (!payload.isValid()) {
                de->ignore();
                return true;
            }
            m_bridgeFacade->emitDrop(
                binding.service, binding.member,
                payload,
                static_cast<double>(de->pos().x()),
                static_cast<double>(de->pos().y()));
            de->acceptProposedAction();
            return true;
        }
    }

    return QWidget::eventFilter(obj, event);
}
