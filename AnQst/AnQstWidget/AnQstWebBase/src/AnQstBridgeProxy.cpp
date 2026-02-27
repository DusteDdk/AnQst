#include "AnQstBridgeProxy.h"
#include "AnQstHostBridgeFacade.h"

AnQstBridgeProxy::AnQstBridgeProxy(AnQstHostBridgeFacade* facade, QObject* parent)
    : QObject(parent)
    , m_facade(facade) {}

void AnQstBridgeProxy::anQstBridge_registerSlot(const QString& service, const QString& member) {
    m_facade->registerSlot(service, member);
}

QVariant AnQstBridgeProxy::anQstBridge_call(const QString& service, const QString& member, const QVariantList& args) {
    return m_facade->call(service, member, args);
}

void AnQstBridgeProxy::anQstBridge_emit(const QString& service, const QString& member, const QVariantList& args) {
    m_facade->emitMessage(service, member, args);
}

void AnQstBridgeProxy::anQstBridge_setInput(const QString& service, const QString& member, const QVariant& value) {
    m_facade->setInput(service, member, value);
}

void AnQstBridgeProxy::anQstBridge_resolveSlot(const QString& requestId, bool ok, const QVariant& payload, const QString& error) {
    m_facade->resolveSlot(requestId, ok, payload, error);
}
