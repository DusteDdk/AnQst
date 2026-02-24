#pragma once

#include "AnQstHostBridgeFacade.h"

#include <QHostAddress>
#include <QObject>
#include <QString>

class QTcpServer;
class QTcpSocket;

class AngularHttpBaseServer : public QObject {
    Q_OBJECT

public:
    enum class ContentRootMode {
        Unset,
        Qrc,
        Filesystem
    };
    Q_ENUM(ContentRootMode)

    explicit AngularHttpBaseServer(QObject* parent = nullptr);
    ~AngularHttpBaseServer() override;

    void setFacade(AnQstHostBridgeFacade* facade);
    void setBridgeObjectName(const QString& name);
    bool configureContent(ContentRootMode mode, const QString& contentRoot, const QString& entryPoint);
    bool start(bool allowLan = false, quint16 startPort = 43000);
    void stop();
    bool isRunning() const;

    QString url() const;
    quint16 httpPort() const;
    quint16 wsPort() const;
    QString websocketUrl() const;

signals:
    void serverError(const QVariantMap& payload);
    void clientAttached(const QString& peer);
    void clientDetached();

private:
    void emitServerError(const QString& code, const QString& message, const QVariantMap& context = QVariantMap());
    bool startHttp(const QHostAddress& bindAddress, quint16 startPort);
    bool startWebSocket(const QHostAddress& bindAddress);
    void stopHttp();
    void stopWebSocket();

    void handleHttpNewConnection();
    void handleHttpClient(QTcpSocket* socket);
    QByteArray readHttpAsset(const QString& requestPath, QString* contentType, int* statusCode) const;
    QString resolveFilePath(const QString& requestPath) const;

    void handleWebSocketConnected();
    void wireClient(QTcpSocket* socket);
    void handleWebSocketSocketData();
    bool tryCompleteWebSocketHandshake();
    bool tryConsumeWebSocketFrame(QString* outMessage);
    void detachCurrentClient();
    void sendJsonToClient(const QVariantMap& payload);

    QTcpServer* m_httpServer;
    QTcpServer* m_wsServer;
    QTcpSocket* m_client;
    QByteArray m_wsReadBuffer;
    bool m_wsHandshakeComplete;
    AnQstHostBridgeFacade* m_facade;
    ContentRootMode m_contentRootMode;
    QString m_contentRoot;
    QString m_entryPoint;
    QString m_bridgeObjectName;
    QHostAddress m_bindAddress;
    quint16 m_httpPort;
    quint16 m_wsPort;
};
