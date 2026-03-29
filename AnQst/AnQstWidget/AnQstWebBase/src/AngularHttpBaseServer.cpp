#include "AngularHttpBaseServer.h"

#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QCryptographicHash>
#include <QEventLoop>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QTcpServer>
#include <QTcpSocket>
#include <QTimer>
#include <QUrl>

namespace {
QByteArray statusReason(int statusCode) {
    switch (statusCode) {
    case 101:
        return "Switching Protocols";
    case 200:
        return "OK";
    case 301:
        return "Moved Permanently";
    case 302:
        return "Found";
    case 304:
        return "Not Modified";
    case 400:
        return "Bad Request";
    case 401:
        return "Unauthorized";
    case 403:
        return "Forbidden";
    case 405:
        return "Method Not Allowed";
    case 404:
        return "Not Found";
    case 500:
        return "Internal Server Error";
    case 502:
        return "Bad Gateway";
    case 504:
        return "Gateway Timeout";
    default:
        return "Internal Server Error";
    }
}

QString guessContentType(const QString& path) {
    if (path.endsWith(".html")) return QStringLiteral("text/html; charset=utf-8");
    if (path.endsWith(".js")) return QStringLiteral("application/javascript; charset=utf-8");
    if (path.endsWith(".css")) return QStringLiteral("text/css; charset=utf-8");
    if (path.endsWith(".json")) return QStringLiteral("application/json; charset=utf-8");
    if (path.endsWith(".svg")) return QStringLiteral("image/svg+xml");
    if (path.endsWith(".png")) return QStringLiteral("image/png");
    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return QStringLiteral("image/jpeg");
    return QStringLiteral("application/octet-stream");
}

QVariantMap parseJsonPayload(const QString& message) {
    const QJsonDocument doc = QJsonDocument::fromJson(message.toUtf8());
    if (!doc.isObject()) {
        return QVariantMap();
    }
    return doc.object().toVariantMap();
}
} // namespace

AngularHttpBaseServer::AngularHttpBaseServer(QObject* parent)
    : QObject(parent)
    , m_httpServer(new QTcpServer(this))
    , m_wsServer(new QTcpServer(this))
    , m_client(nullptr)
    , m_wsHandshakeComplete(false)
    , m_facade(nullptr)
    , m_contentRootMode(ContentRootMode::Unset)
    , m_bridgeObjectName(QString())
    , m_httpPort(0)
    , m_wsPort(0)
    , m_serveMode(ServeMode::LocalContent) {
    connect(m_httpServer, &QTcpServer::newConnection, this, &AngularHttpBaseServer::handleHttpNewConnection);
    connect(m_wsServer, &QTcpServer::newConnection, this, &AngularHttpBaseServer::handleWebSocketConnected);
}

AngularHttpBaseServer::~AngularHttpBaseServer() {
    stop();
}

void AngularHttpBaseServer::setBridgeObjectName(const QString& name) {
    m_bridgeObjectName = name;
}

void AngularHttpBaseServer::setFacade(AnQstHostBridgeFacade* facade) {
    if (m_facade == facade) {
        return;
    }
    if (m_facade != nullptr) {
        disconnect(m_facade, nullptr, this, nullptr);
    }
    m_facade = facade;
    if (m_facade == nullptr) {
        return;
    }
    connect(m_facade, &AnQstHostBridgeFacade::bridgeOutputUpdated, this, [this](const QString& service, const QString& member, const QVariant& value) {
        sendJsonToClient({
            {QStringLiteral("type"), QStringLiteral("outputUpdated")},
            {QStringLiteral("service"), service},
            {QStringLiteral("member"), member},
            {QStringLiteral("value"), value},
        });
    });
    connect(m_facade, &AnQstHostBridgeFacade::bridgeSlotInvocationRequested, this, [this](const QString& requestId, const QString& service, const QString& member, const QVariantList& args) {
        sendJsonToClient({
            {QStringLiteral("type"), QStringLiteral("slotInvocationRequested")},
            {QStringLiteral("requestId"), requestId},
            {QStringLiteral("service"), service},
            {QStringLiteral("member"), member},
            {QStringLiteral("args"), QVariant::fromValue(args)},
        });
    });
    connect(m_facade, &AnQstHostBridgeFacade::bridgeHostError, this, [this](const QVariantMap& payload) {
        sendJsonToClient({
            {QStringLiteral("type"), QStringLiteral("hostError")},
            {QStringLiteral("payload"), payload},
        });
    });
    connect(m_facade, &AnQstHostBridgeFacade::bridgeDropReceived, this, [this](const QString& service, const QString& member, const QVariant& payload, double x, double y) {
        sendJsonToClient({
            {QStringLiteral("type"), QStringLiteral("dropReceived")},
            {QStringLiteral("service"), service},
            {QStringLiteral("member"), member},
            {QStringLiteral("payload"), payload},
            {QStringLiteral("x"), x},
            {QStringLiteral("y"), y},
        });
    });
    connect(m_facade, &AnQstHostBridgeFacade::bridgeHoverUpdated, this, [this](const QString& service, const QString& member, const QVariant& payload, double x, double y) {
        sendJsonToClient({
            {QStringLiteral("type"), QStringLiteral("hoverUpdated")},
            {QStringLiteral("service"), service},
            {QStringLiteral("member"), member},
            {QStringLiteral("payload"), payload},
            {QStringLiteral("x"), x},
            {QStringLiteral("y"), y},
        });
    });
    connect(m_facade, &AnQstHostBridgeFacade::bridgeHoverLeft, this, [this](const QString& service, const QString& member) {
        sendJsonToClient({
            {QStringLiteral("type"), QStringLiteral("hoverLeft")},
            {QStringLiteral("service"), service},
            {QStringLiteral("member"), member},
        });
    });
}

bool AngularHttpBaseServer::configureContent(ContentRootMode mode, const QString& contentRoot, const QString& entryPoint) {
    if (mode == ContentRootMode::Unset || contentRoot.trimmed().isEmpty() || entryPoint.trimmed().isEmpty()) {
        emitServerError(QStringLiteral("DEV_SERVER_CONFIG_INVALID"), QStringLiteral("Invalid development mode content configuration."));
        return false;
    }
    m_contentRootMode = mode;
    m_contentRoot = contentRoot;
    m_entryPoint = entryPoint;
    m_serveMode = ServeMode::LocalContent;
    m_proxyBaseUrl = QUrl();
    return true;
}

bool AngularHttpBaseServer::configureProxyTarget(const QUrl& targetBaseUrl, const QString& entryPoint) {
    if (!targetBaseUrl.isValid() || targetBaseUrl.scheme().isEmpty() || targetBaseUrl.host().isEmpty()) {
        emitServerError(QStringLiteral("DEV_SERVER_PROXY_TARGET_INVALID"), QStringLiteral("Invalid proxy target URL."), {
            {QStringLiteral("targetUrl"), targetBaseUrl.toString()},
        });
        return false;
    }
    const QString scheme = targetBaseUrl.scheme().toLower();
    if (scheme != QStringLiteral("http")) {
        emitServerError(QStringLiteral("DEV_SERVER_PROXY_TARGET_SCHEME_UNSUPPORTED"), QStringLiteral("Proxy target URL must use http."), {
            {QStringLiteral("targetUrl"), targetBaseUrl.toString()},
            {QStringLiteral("scheme"), scheme},
        });
        return false;
    }
    m_serveMode = ServeMode::ProxyTarget;
    m_proxyBaseUrl = targetBaseUrl;
    m_entryPoint = entryPoint.trimmed().isEmpty() ? QStringLiteral("index.html") : entryPoint.trimmed();
    m_contentRootMode = ContentRootMode::Unset;
    m_contentRoot.clear();
    return true;
}

bool AngularHttpBaseServer::start(bool allowLan, quint16 startPort) {
    if (m_serveMode == ServeMode::LocalContent && m_contentRootMode == ContentRootMode::Unset) {
        emitServerError(QStringLiteral("DEV_SERVER_CONFIG_MISSING"), QStringLiteral("Content root must be configured before starting development server."));
        return false;
    }
    if (m_serveMode == ServeMode::ProxyTarget && !m_proxyBaseUrl.isValid()) {
        emitServerError(QStringLiteral("DEV_SERVER_PROXY_TARGET_MISSING"), QStringLiteral("Proxy target must be configured before starting development server."));
        return false;
    }
    m_bindAddress = allowLan ? QHostAddress::Any : QHostAddress::LocalHost;
    if (!startHttp(m_bindAddress, startPort)) {
        return false;
    }
    if (!startWebSocket(m_bindAddress)) {
        stopHttp();
        return false;
    }
    return true;
}

void AngularHttpBaseServer::stop() {
    const auto peers = m_proxyPeers.keys();
    for (QTcpSocket* socket : peers) {
        closeProxyPeer(socket);
    }
    detachCurrentClient();
    stopWebSocket();
    stopHttp();
}

void AngularHttpBaseServer::notifyWidgetReattached() {
    sendJsonToClient({
        {QStringLiteral("type"), QStringLiteral("widgetReattached")},
        {QStringLiteral("message"), QStringLiteral("Widget Reattached")},
    });
}

bool AngularHttpBaseServer::isRunning() const {
    return m_httpServer->isListening() && m_wsServer->isListening();
}

QString AngularHttpBaseServer::url() const {
    if (!m_httpServer->isListening()) {
        return QString();
    }
    const QString host = m_bindAddress == QHostAddress::Any ? QStringLiteral("0.0.0.0") : QStringLiteral("localhost");
    return QStringLiteral("http://%1:%2").arg(host).arg(m_httpPort);
}

quint16 AngularHttpBaseServer::httpPort() const {
    return m_httpPort;
}

quint16 AngularHttpBaseServer::wsPort() const {
    return m_wsPort;
}

QString AngularHttpBaseServer::websocketUrl() const {
    if (!m_wsServer->isListening()) {
        return QString();
    }
    const QString host = m_bindAddress == QHostAddress::Any ? QStringLiteral("0.0.0.0") : QStringLiteral("localhost");
    return QStringLiteral("ws://%1:%2/anqst-bridge").arg(host).arg(m_wsPort);
}

void AngularHttpBaseServer::emitServerError(const QString& code, const QString& message, const QVariantMap& context) {
    QVariantMap payload;
    payload.insert(QStringLiteral("code"), code);
    payload.insert(QStringLiteral("message"), message);
    payload.insert(QStringLiteral("context"), context);
    emit serverError(payload);
}

bool AngularHttpBaseServer::startHttp(const QHostAddress& bindAddress, quint16 startPort) {
    for (quint16 port = startPort; port < static_cast<quint16>(startPort + 200); ++port) {
        if (m_httpServer->listen(bindAddress, port)) {
            m_httpPort = port;
            return true;
        }
    }
    emitServerError(QStringLiteral("DEV_SERVER_HTTP_BIND_FAILED"), QStringLiteral("Failed to bind HTTP development server."), {
        {QStringLiteral("startPort"), startPort},
    });
    return false;
}

bool AngularHttpBaseServer::startWebSocket(const QHostAddress& bindAddress) {
    quint16 candidate = static_cast<quint16>(m_httpPort + 1);
    for (quint16 attempts = 0; attempts < 200; ++attempts, ++candidate) {
        if (m_wsServer->listen(bindAddress, candidate)) {
            m_wsPort = candidate;
            return true;
        }
    }
    emitServerError(QStringLiteral("DEV_SERVER_WS_BIND_FAILED"), QStringLiteral("Failed to bind WebSocket development bridge."), {
        {QStringLiteral("httpPort"), m_httpPort},
    });
    return false;
}

void AngularHttpBaseServer::stopHttp() {
    if (m_httpServer->isListening()) {
        m_httpServer->close();
    }
    m_httpPort = 0;
}

void AngularHttpBaseServer::stopWebSocket() {
    if (m_wsServer->isListening()) {
        m_wsServer->close();
    }
    m_wsPort = 0;
}

void AngularHttpBaseServer::handleHttpNewConnection() {
    while (m_httpServer->hasPendingConnections()) {
        QTcpSocket* socket = m_httpServer->nextPendingConnection();
        handleHttpClient(socket);
    }
}

void AngularHttpBaseServer::handleHttpClient(QTcpSocket* socket) {
    connect(socket, &QTcpSocket::readyRead, this, [this, socket]() {
        const QByteArray raw = socket->readAll();
        const QList<QByteArray> lines = raw.split('\n');
        if (lines.isEmpty()) {
            socket->disconnectFromHost();
            return;
        }

        const QList<QByteArray> requestLine = lines.first().trimmed().split(' ');
        if (requestLine.size() < 2) {
            socket->disconnectFromHost();
            return;
        }

        const QString method = QString::fromUtf8(requestLine.at(0));
        const QString target = QString::fromUtf8(requestLine.at(1));
        if (m_serveMode == ServeMode::ProxyTarget) {
            if (target == QStringLiteral("/anqst-dev-config.json")) {
                QString contentType;
                int statusCode = 200;
                const QByteArray body = readHttpProxy(method, target, QByteArray(), &contentType, &statusCode);
                QByteArray response;
                response += "HTTP/1.1 " + QByteArray::number(statusCode) + " " + statusReason(statusCode) + "\r\n";
                response += "Content-Type: " + contentType.toUtf8() + "\r\n";
                response += "Content-Length: " + QByteArray::number(body.size()) + "\r\n";
                response += "Cache-Control: no-cache\r\n";
                response += "Connection: close\r\n";
                response += "\r\n";
                if (method != QStringLiteral("HEAD")) {
                    response += body;
                }
                socket->write(response);
                socket->disconnectFromHost();
                return;
            }

            disconnect(socket, nullptr, this, nullptr);
            if (isWebSocketUpgradeRequest(lines)) {
                handleProxyWebSocketUpgrade(socket, raw, target);
            } else {
                handleProxyHttpRequest(socket, raw, target);
            }
            return;
        }

        if (method != QStringLiteral("GET") && method != QStringLiteral("HEAD")) {
            socket->write("HTTP/1.1 405 Method Not Allowed\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
            socket->disconnectFromHost();
            return;
        }

        QString contentType;
        int statusCode = 200;
        const QByteArray body = readHttpAsset(target, &contentType, &statusCode);

        QByteArray response;
        response += "HTTP/1.1 " + QByteArray::number(statusCode) + " " + statusReason(statusCode) + "\r\n";
        response += "Content-Type: " + contentType.toUtf8() + "\r\n";
        response += "Content-Length: " + QByteArray::number(body.size()) + "\r\n";
        response += "Cache-Control: no-cache\r\n";
        response += "Connection: close\r\n";
        response += "\r\n";
        if (method != QStringLiteral("HEAD")) {
            response += body;
        }
        socket->write(response);
        socket->disconnectFromHost();
    });
}

void AngularHttpBaseServer::handleProxyHttpRequest(QTcpSocket* clientSocket, const QByteArray& rawRequest, const QString& requestTarget) {
    if (!m_proxyBaseUrl.isValid()) {
        clientSocket->write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
        clientSocket->disconnectFromHost();
        return;
    }
    if (m_proxyBaseUrl.scheme().toLower() == QStringLiteral("https")) {
        clientSocket->write("HTTP/1.1 501 Not Implemented\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
        clientSocket->disconnectFromHost();
        return;
    }

    QString target = requestTarget;
    if (target.trimmed().isEmpty() || target == QStringLiteral("/")) {
        target = QStringLiteral("/") + m_entryPoint;
    }
    const QUrl upstreamUrl = m_proxyBaseUrl.resolved(QUrl(target));
    const QString host = upstreamUrl.host();
    const quint16 port = upstreamUrl.port(80);
    if (host.isEmpty()) {
        clientSocket->write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
        clientSocket->disconnectFromHost();
        return;
    }

    QTcpSocket* upstreamSocket = new QTcpSocket(this);
    m_proxyPeers.insert(clientSocket, upstreamSocket);
    m_proxyPeers.insert(upstreamSocket, clientSocket);

    connect(clientSocket, &QTcpSocket::readyRead, this, [this, clientSocket]() {
        QTcpSocket* peer = m_proxyPeers.value(clientSocket, nullptr);
        if (peer != nullptr) {
            peer->write(clientSocket->readAll());
        }
    });
    connect(upstreamSocket, &QTcpSocket::readyRead, this, [this, upstreamSocket]() {
        QTcpSocket* peer = m_proxyPeers.value(upstreamSocket, nullptr);
        if (peer != nullptr) {
            peer->write(upstreamSocket->readAll());
        }
    });
    connect(clientSocket, &QTcpSocket::disconnected, this, [this, clientSocket]() { closeProxyPeer(clientSocket); });
    connect(upstreamSocket, &QTcpSocket::disconnected, this, [this, upstreamSocket]() { closeProxyPeer(upstreamSocket); });
    connect(upstreamSocket, &QTcpSocket::connected, this, [this, upstreamSocket, rawRequest, upstreamUrl]() {
        const int headerEnd = rawRequest.indexOf("\r\n\r\n");
        const QByteArray header = headerEnd >= 0 ? rawRequest.left(headerEnd + 4) : rawRequest;
        const QByteArray body = headerEnd >= 0 ? rawRequest.mid(headerEnd + 4) : QByteArray();
        const QList<QByteArray> lines = header.split('\n');
        if (lines.isEmpty()) {
            return;
        }

        const QList<QByteArray> requestLine = lines.first().trimmed().split(' ');
        if (requestLine.size() < 3) {
            return;
        }

        QByteArray rewritten;
        rewritten += requestLine.at(0) + " " + upstreamUrl.path(QUrl::FullyEncoded).toUtf8();
        if (!upstreamUrl.query().isEmpty()) {
            rewritten += "?" + upstreamUrl.query(QUrl::FullyEncoded).toUtf8();
        }
        rewritten += " " + requestLine.at(2) + "\r\n";

        for (int i = 1; i < lines.size(); ++i) {
            const QByteArray line = lines.at(i).trimmed();
            if (line.isEmpty()) {
                break;
            }
            const QByteArray lower = line.toLower();
            if (lower.startsWith("host:") || lower.startsWith("proxy-connection:")) {
                continue;
            }
            rewritten += line + "\r\n";
        }

        QByteArray hostHeader = "Host: " + upstreamUrl.host().toUtf8();
        const int upstreamPort = upstreamUrl.port(80);
        if (upstreamPort != 80) {
            hostHeader += ":" + QByteArray::number(upstreamPort);
        }
        rewritten += hostHeader + "\r\n";
        rewritten += "\r\n";
        rewritten += body;
        upstreamSocket->write(rewritten);
    });
    connect(upstreamSocket, &QTcpSocket::errorOccurred, this, [clientSocket](QAbstractSocket::SocketError) {
        if (clientSocket != nullptr && clientSocket->isOpen()) {
            clientSocket->write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
            clientSocket->disconnectFromHost();
        }
    });

    upstreamSocket->connectToHost(host, port);
}

bool AngularHttpBaseServer::isWebSocketUpgradeRequest(const QList<QByteArray>& lines) const {
    bool hasUpgradeHeader = false;
    bool hasConnectionUpgrade = false;
    for (const QByteArray& rawLine : lines) {
        const QByteArray line = rawLine.trimmed().toLower();
        if (line.startsWith("upgrade:") && line.contains("websocket")) {
            hasUpgradeHeader = true;
        }
        if (line.startsWith("connection:") && line.contains("upgrade")) {
            hasConnectionUpgrade = true;
        }
    }
    return hasUpgradeHeader && hasConnectionUpgrade;
}

void AngularHttpBaseServer::handleProxyWebSocketUpgrade(QTcpSocket* clientSocket, const QByteArray& rawRequest, const QString& requestTarget) {
    if (!m_proxyBaseUrl.isValid()) {
        clientSocket->write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
        clientSocket->disconnectFromHost();
        return;
    }

    const QString upstreamScheme = m_proxyBaseUrl.scheme().toLower() == QStringLiteral("https")
        ? QStringLiteral("wss")
        : QStringLiteral("ws");
    if (upstreamScheme == QStringLiteral("wss")) {
        clientSocket->write("HTTP/1.1 501 Not Implemented\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
        clientSocket->disconnectFromHost();
        return;
    }

    QString target = requestTarget;
    if (target.trimmed().isEmpty() || target == QStringLiteral("/")) {
        target = QStringLiteral("/") + m_entryPoint;
    }
    const QUrl upstreamUrl = m_proxyBaseUrl.resolved(QUrl(target));
    const QString host = upstreamUrl.host();
    const quint16 port = upstreamUrl.port(80);
    if (host.isEmpty()) {
        clientSocket->write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
        clientSocket->disconnectFromHost();
        return;
    }

    QTcpSocket* upstreamSocket = new QTcpSocket(this);
    m_proxyPeers.insert(clientSocket, upstreamSocket);
    m_proxyPeers.insert(upstreamSocket, clientSocket);

    connect(clientSocket, &QTcpSocket::readyRead, this, [this, clientSocket]() {
        QTcpSocket* peer = m_proxyPeers.value(clientSocket, nullptr);
        if (peer != nullptr) {
            peer->write(clientSocket->readAll());
        }
    });
    connect(upstreamSocket, &QTcpSocket::readyRead, this, [this, upstreamSocket]() {
        QTcpSocket* peer = m_proxyPeers.value(upstreamSocket, nullptr);
        if (peer != nullptr) {
            peer->write(upstreamSocket->readAll());
        }
    });
    connect(clientSocket, &QTcpSocket::disconnected, this, [this, clientSocket]() { closeProxyPeer(clientSocket); });
    connect(upstreamSocket, &QTcpSocket::disconnected, this, [this, upstreamSocket]() { closeProxyPeer(upstreamSocket); });
    connect(upstreamSocket, &QTcpSocket::connected, this, [this, upstreamSocket, rawRequest, upstreamUrl]() {
        const QList<QByteArray> lines = rawRequest.split('\n');
        QByteArray rewritten;
        rewritten += "GET " + upstreamUrl.path(QUrl::FullyEncoded).toUtf8();
        if (!upstreamUrl.query().isEmpty()) {
            rewritten += "?" + upstreamUrl.query(QUrl::FullyEncoded).toUtf8();
        }
        rewritten += " HTTP/1.1\r\n";
        for (int i = 1; i < lines.size(); ++i) {
            const QByteArray line = lines.at(i).trimmed();
            if (line.isEmpty()) {
                break;
            }
            const QByteArray lower = line.toLower();
            if (lower.startsWith("host:") || lower.startsWith("connection:") || lower.startsWith("upgrade:")) {
                continue;
            }
            rewritten += line + "\r\n";
        }
        QByteArray hostHeader = "Host: " + upstreamUrl.host().toUtf8();
        const int upstreamPort = upstreamUrl.port(80);
        if (upstreamPort != 80) {
            hostHeader += ":" + QByteArray::number(upstreamPort);
        }
        rewritten += hostHeader + "\r\n";
        rewritten += "Connection: Upgrade\r\n";
        rewritten += "Upgrade: websocket\r\n";
        rewritten += "\r\n";
        upstreamSocket->write(rewritten);
    });
    connect(upstreamSocket, &QTcpSocket::errorOccurred, this, [clientSocket](QAbstractSocket::SocketError) {
        if (clientSocket != nullptr && clientSocket->isOpen()) {
            clientSocket->write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
            clientSocket->disconnectFromHost();
        }
    });

    upstreamSocket->connectToHost(host, port);
}

void AngularHttpBaseServer::closeProxyPeer(QTcpSocket* socket) {
    if (socket == nullptr) {
        return;
    }
    QTcpSocket* peer = m_proxyPeers.take(socket);
    if (peer != nullptr) {
        m_proxyPeers.remove(peer);
        disconnect(peer, nullptr, this, nullptr);
        if (peer->isOpen()) {
            peer->close();
        }
        peer->deleteLater();
    }
    disconnect(socket, nullptr, this, nullptr);
    if (socket->isOpen()) {
        socket->close();
    }
    socket->deleteLater();
}

QByteArray AngularHttpBaseServer::readHttpAsset(const QString& requestPath, QString* contentType, int* statusCode) const {
    if (requestPath == QStringLiteral("/anqst-dev-config.json")) {
        QVariantMap config;
        config.insert(QStringLiteral("wsUrl"), websocketUrl());
        config.insert(QStringLiteral("bridgeObject"), m_bridgeObjectName);
        const QJsonDocument doc = QJsonDocument::fromVariant(config);
        *contentType = QStringLiteral("application/json; charset=utf-8");
        *statusCode = 200;
        return doc.toJson(QJsonDocument::Compact);
    }

    const QString filePath = resolveFilePath(requestPath);
    if (filePath.isEmpty()) {
        *statusCode = 404;
        *contentType = QStringLiteral("text/plain; charset=utf-8");
        return QByteArray("Not Found");
    }

    QFile file(filePath);
    if (!file.open(QIODevice::ReadOnly)) {
        *statusCode = 404;
        *contentType = QStringLiteral("text/plain; charset=utf-8");
        return QByteArray("Not Found");
    }

    *statusCode = 200;
    *contentType = guessContentType(filePath);
    return file.readAll();
}

QByteArray AngularHttpBaseServer::readHttpProxy(
    const QString& method,
    const QString& requestPath,
    const QByteArray& body,
    QString* contentType,
    int* statusCode) const {
    Q_UNUSED(body);
    if (requestPath == QStringLiteral("/anqst-dev-config.json")) {
        QVariantMap config;
        config.insert(QStringLiteral("wsUrl"), websocketUrl());
        config.insert(QStringLiteral("bridgeObject"), m_bridgeObjectName);
        const QJsonDocument doc = QJsonDocument::fromVariant(config);
        *contentType = QStringLiteral("application/json; charset=utf-8");
        *statusCode = 200;
        return doc.toJson(QJsonDocument::Compact);
    }

    QString targetPath = requestPath;
    if (targetPath.isEmpty() || targetPath == QStringLiteral("/")) {
        targetPath = QStringLiteral("/") + m_entryPoint;
    }
    const QUrl upstreamUrl = m_proxyBaseUrl.resolved(QUrl(targetPath));
    if (!upstreamUrl.isValid()) {
        *statusCode = 502;
        *contentType = QStringLiteral("text/plain; charset=utf-8");
        return QByteArray("Bad Gateway");
    }

    QNetworkRequest request(upstreamUrl);
    request.setAttribute(QNetworkRequest::RedirectPolicyAttribute, QNetworkRequest::NoLessSafeRedirectPolicy);

    QNetworkAccessManager manager;
    QNetworkReply* reply = nullptr;
    if (method == QStringLiteral("HEAD")) {
        reply = manager.head(request);
    } else {
        reply = manager.get(request);
    }

    QEventLoop loop;
    QTimer timeout;
    bool timedOut = false;
    timeout.setSingleShot(true);
    connect(reply, &QNetworkReply::finished, &loop, &QEventLoop::quit);
    connect(&timeout, &QTimer::timeout, &loop, [&]() {
        timedOut = true;
        reply->abort();
        loop.quit();
    });
    timeout.start(10000);
    loop.exec();
    timeout.stop();

    if (timedOut) {
        reply->deleteLater();
        *statusCode = 504;
        *contentType = QStringLiteral("text/plain; charset=utf-8");
        return QByteArray("Gateway Timeout");
    }

    const int responseStatus = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
    const QVariant contentTypeHeader = reply->header(QNetworkRequest::ContentTypeHeader);
    const QByteArray payload = reply->readAll();
    const QNetworkReply::NetworkError networkError = reply->error();
    reply->deleteLater();

    if (networkError != QNetworkReply::NoError && responseStatus == 0) {
        *statusCode = 502;
        *contentType = QStringLiteral("text/plain; charset=utf-8");
        return QByteArray("Bad Gateway");
    }

    *statusCode = responseStatus > 0 ? responseStatus : 200;
    *contentType = contentTypeHeader.toString().isEmpty()
        ? QStringLiteral("application/octet-stream")
        : contentTypeHeader.toString();
    return payload;
}

QString AngularHttpBaseServer::resolveFilePath(const QString& requestPath) const {
    const QString pathOnly = QUrl(requestPath).path();
    QString requested = pathOnly;
    if (requested.isEmpty() || requested == QStringLiteral("/")) {
        requested = QStringLiteral("/") + m_entryPoint;
    }

    if (m_contentRootMode == ContentRootMode::Filesystem) {
        QDir rootDir(m_contentRoot);
        const QString rel = requested.startsWith('/') ? requested.mid(1) : requested;
        const QString resolved = QDir::cleanPath(rootDir.absoluteFilePath(rel));
        if (!resolved.startsWith(rootDir.absolutePath())) {
            return QString();
        }
        return resolved;
    }

    if (m_contentRootMode == ContentRootMode::Qrc) {
        QString qrcRoot = m_contentRoot;
        if (qrcRoot.startsWith(QStringLiteral("qrc:/"))) {
            qrcRoot = QStringLiteral(":") + qrcRoot.mid(QStringLiteral("qrc:").size());
        } else if (!qrcRoot.startsWith(':')) {
            qrcRoot.prepend(':');
        }
        if (qrcRoot.endsWith('/')) {
            qrcRoot.chop(1);
        }
        return QDir::cleanPath(qrcRoot + requested);
    }

    return QString();
}

void AngularHttpBaseServer::handleWebSocketConnected() {
    QTcpSocket* socket = m_wsServer->nextPendingConnection();
    if (socket == nullptr) {
        return;
    }
    detachCurrentClient();
    wireClient(socket);
    emit clientAttached(socket->peerAddress().toString());
}

void AngularHttpBaseServer::wireClient(QTcpSocket* socket) {
    m_client = socket;
    m_wsHandshakeComplete = false;
    m_wsReadBuffer.clear();
    connect(m_client, &QTcpSocket::readyRead, this, &AngularHttpBaseServer::handleWebSocketSocketData);
    connect(m_client, &QTcpSocket::disconnected, this, [this]() {
        if (m_client != nullptr) {
            m_client->deleteLater();
            m_client = nullptr;
            m_wsReadBuffer.clear();
            m_wsHandshakeComplete = false;
        }
        emit clientDetached();
    });
}

void AngularHttpBaseServer::handleWebSocketSocketData() {
    if (m_client == nullptr) {
        return;
    }
    m_wsReadBuffer.append(m_client->readAll());
    if (!m_wsHandshakeComplete) {
        if (!tryCompleteWebSocketHandshake()) {
            return;
        }
        m_wsHandshakeComplete = true;
        sendJsonToClient({
            {QStringLiteral("type"), QStringLiteral("hostReady")},
        });
    }

    QString message;
    while (tryConsumeWebSocketFrame(&message)) {
        const QVariantMap payload = parseJsonPayload(message);
        const QString type = payload.value(QStringLiteral("type")).toString();
        if (m_facade == nullptr || m_client == nullptr) {
            return;
        }
        if (type == QStringLiteral("registerSlot")) {
            m_facade->registerSlot(payload.value(QStringLiteral("service")).toString(), payload.value(QStringLiteral("member")).toString());
            continue;
        }
        if (type == QStringLiteral("call")) {
            const QVariantList args = payload.value(QStringLiteral("args")).toList();
            const QVariant result = m_facade->call(payload.value(QStringLiteral("service")).toString(), payload.value(QStringLiteral("member")).toString(), args);
            sendJsonToClient({
                {QStringLiteral("type"), QStringLiteral("callResult")},
                {QStringLiteral("requestId"), payload.value(QStringLiteral("requestId")).toString()},
                {QStringLiteral("result"), result},
            });
            continue;
        }
        if (type == QStringLiteral("emit")) {
            m_facade->emitMessage(payload.value(QStringLiteral("service")).toString(), payload.value(QStringLiteral("member")).toString(), payload.value(QStringLiteral("args")).toList());
            continue;
        }
        if (type == QStringLiteral("setInput")) {
            m_facade->setInput(payload.value(QStringLiteral("service")).toString(), payload.value(QStringLiteral("member")).toString(), payload.value(QStringLiteral("value")));
            continue;
        }
        if (type == QStringLiteral("resolveSlot")) {
            m_facade->resolveSlot(
                payload.value(QStringLiteral("requestId")).toString(),
                payload.value(QStringLiteral("ok")).toBool(),
                payload.value(QStringLiteral("payload")),
                payload.value(QStringLiteral("error")).toString());
        }
    }
}

bool AngularHttpBaseServer::tryCompleteWebSocketHandshake() {
    const int headerEnd = m_wsReadBuffer.indexOf("\r\n\r\n");
    if (headerEnd < 0) {
        return false;
    }
    const QByteArray header = m_wsReadBuffer.left(headerEnd + 4);
    m_wsReadBuffer.remove(0, headerEnd + 4);
    const QList<QByteArray> lines = header.split('\n');
    QByteArray key;
    for (const QByteArray& rawLine : lines) {
        const QByteArray line = rawLine.trimmed();
        if (line.toLower().startsWith("sec-websocket-key:")) {
            key = line.mid(sizeof("sec-websocket-key:") - 1).trimmed();
            break;
        }
    }
    if (key.isEmpty() || m_client == nullptr) {
        return false;
    }

    static const QByteArray kMagic("258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
    const QByteArray acceptRaw = QCryptographicHash::hash(key + kMagic, QCryptographicHash::Sha1).toBase64();
    QByteArray response;
    response += "HTTP/1.1 101 Switching Protocols\r\n";
    response += "Upgrade: websocket\r\n";
    response += "Connection: Upgrade\r\n";
    response += "Sec-WebSocket-Accept: " + acceptRaw + "\r\n";
    response += "\r\n";
    m_client->write(response);
    return true;
}

bool AngularHttpBaseServer::tryConsumeWebSocketFrame(QString* outMessage) {
    if (m_wsReadBuffer.size() < 2) {
        return false;
    }
    const quint8 b0 = static_cast<quint8>(m_wsReadBuffer.at(0));
    const quint8 b1 = static_cast<quint8>(m_wsReadBuffer.at(1));
    const bool masked = (b1 & 0x80) != 0;
    quint64 payloadLen = static_cast<quint8>(b1 & 0x7F);
    int offset = 2;
    if (payloadLen == 126) {
        if (m_wsReadBuffer.size() < 4) return false;
        payloadLen = (static_cast<quint8>(m_wsReadBuffer.at(2)) << 8) |
                     static_cast<quint8>(m_wsReadBuffer.at(3));
        offset = 4;
    } else if (payloadLen == 127) {
        if (m_wsReadBuffer.size() < 10) return false;
        payloadLen = 0;
        for (int i = 0; i < 8; ++i) {
            payloadLen = (payloadLen << 8) | static_cast<quint8>(m_wsReadBuffer.at(2 + i));
        }
        offset = 10;
    }

    const int maskBytes = masked ? 4 : 0;
    if (m_wsReadBuffer.size() < offset + maskBytes + static_cast<int>(payloadLen)) {
        return false;
    }

    QByteArray mask;
    if (masked) {
        mask = m_wsReadBuffer.mid(offset, 4);
    }
    QByteArray payload = m_wsReadBuffer.mid(offset + maskBytes, static_cast<int>(payloadLen));
    if (masked) {
        for (int i = 0; i < payload.size(); ++i) {
            payload[i] = payload.at(i) ^ mask.at(i % 4);
        }
    }
    m_wsReadBuffer.remove(0, offset + maskBytes + static_cast<int>(payloadLen));

    const quint8 opcode = b0 & 0x0F;
    if (opcode == 0x8) {
        detachCurrentClient();
        return false;
    }
    if (opcode != 0x1) {
        return false;
    }
    *outMessage = QString::fromUtf8(payload);
    return true;
}

void AngularHttpBaseServer::detachCurrentClient() {
    if (m_client == nullptr) {
        return;
    }
    disconnect(m_client, nullptr, this, nullptr);
    m_client->close();
    m_client->deleteLater();
    m_client = nullptr;
    m_wsReadBuffer.clear();
    m_wsHandshakeComplete = false;
    emit clientDetached();
}

void AngularHttpBaseServer::sendJsonToClient(const QVariantMap& payload) {
    if (m_client == nullptr || !m_wsHandshakeComplete) {
        return;
    }
    const QJsonObject obj = QJsonObject::fromVariantMap(payload);
    const QJsonDocument doc(obj);
    const QByteArray body = doc.toJson(QJsonDocument::Compact);
    QByteArray frame;
    frame.append(static_cast<char>(0x81));
    if (body.size() < 126) {
        frame.append(static_cast<char>(body.size()));
    } else if (body.size() <= 0xFFFF) {
        frame.append(static_cast<char>(126));
        frame.append(static_cast<char>((body.size() >> 8) & 0xFF));
        frame.append(static_cast<char>(body.size() & 0xFF));
    } else {
        frame.append(static_cast<char>(127));
        const quint64 len = static_cast<quint64>(body.size());
        for (int i = 7; i >= 0; --i) {
            frame.append(static_cast<char>((len >> (i * 8)) & 0xFF));
        }
    }
    frame.append(body);
    m_client->write(frame);
}
