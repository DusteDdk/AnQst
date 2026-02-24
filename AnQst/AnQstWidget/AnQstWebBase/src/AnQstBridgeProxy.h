#pragma once

#include <QObject>
#include <QString>
#include <QVariant>
#include <QVariantList>

class AnQstHostBridgeFacade;

// Thin QObject registered with QWebChannel as the sole bridge endpoint.
// Inherits only QObject so QWebChannel sees no QWidget/QObject properties
// lacking NOTIFY signals, producing zero "no notify signal" warnings.
class AnQstBridgeProxy : public QObject {
    Q_OBJECT

public:
    explicit AnQstBridgeProxy(AnQstHostBridgeFacade* facade, QObject* parent = nullptr);

    Q_INVOKABLE void anQstBridge_registerSlot(const QString& service, const QString& member);
    Q_INVOKABLE QVariant anQstBridge_call(const QString& service, const QString& member, const QVariantList& args);
    Q_INVOKABLE QVariant anQstBridge_callSync(const QString& service, const QString& member, const QVariantList& args);
    Q_INVOKABLE void anQstBridge_emit(const QString& service, const QString& member, const QVariantList& args);
    Q_INVOKABLE void anQstBridge_setInput(const QString& service, const QString& member, const QVariant& value);
    Q_INVOKABLE void anQstBridge_resolveSlot(const QString& requestId, bool ok, const QVariant& payload, const QString& error);

signals:
    void anQstBridge_outputUpdated(const QString& service, const QString& member, const QVariant& value);
    void anQstBridge_slotInvocationRequested(const QString& requestId, const QString& service, const QString& member, const QVariantList& args);

private:
    AnQstHostBridgeFacade* m_facade;
};
