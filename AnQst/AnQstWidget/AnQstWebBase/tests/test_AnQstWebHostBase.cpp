#include <catch2/catch_session.hpp>
#include "AnQstWebHostBase.h"

#include <QApplication>
#include <QFile>
#include <QSignalSpy>
#include <QTemporaryDir>
#include <QTextStream>
#include <QTimer>
#include <catch2/catch_test_macros.hpp>
#include <cstdlib>

namespace {

class DummyBridge final : public QObject {
    Q_OBJECT
public:
    explicit DummyBridge(QObject* parent = nullptr)
        : QObject(parent) {}

public slots:
    QString ping() const { return QStringLiteral("pong"); }
};

QApplication& ensureApp() {
    static int argc = 1;
    static char appName[] = "anqstwebbase_tests";
    static char* argv[] = { appName, nullptr };
    static QApplication app(argc, argv);
    return app;
}

bool waitForSignal(QSignalSpy& spy, int timeoutMs = 2000) {
    if (spy.count() > 0) {
        return true;
    }
    return spy.wait(timeoutMs);
}

QVariantMap firstPayload(QSignalSpy& spy) {
    REQUIRE(spy.count() > 0);
    const auto args = spy.takeFirst();
    REQUIRE(args.count() == 1);
    REQUIRE(args.at(0).canConvert<QVariantMap>());
    return args.at(0).toMap();
}

void writeHtmlFile(const QString& filePath, const QString& html) {
    QFile file(filePath);
    REQUIRE(file.open(QIODevice::WriteOnly | QIODevice::Truncate));
    QTextStream stream(&file);
    stream << html;
    file.close();
}

} // namespace

TEST_CASE("setContentRoot is single-assignment and emits structured warning", "[host][lifecycle]") {
    ensureApp();
    AnQstWebHostBase host;
    QSignalSpy errorSpy(&host, &AnQstWebHostBase::onHostError);

    QTemporaryDir dir;
    REQUIRE(dir.isValid());

    REQUIRE(host.setContentRoot(dir.path()));
    REQUIRE_FALSE(host.setContentRoot(dir.path()));
    REQUIRE(waitForSignal(errorSpy));

    const QVariantMap payload = firstPayload(errorSpy);
    CHECK(payload.value("code").toString() == "HOST_CONTENT_ROOT_RECALL_IGNORED");
    CHECK(payload.value("category").toString() == "lifecycle");
    CHECK(payload.value("severity").toString() == "warn");
    CHECK(payload.value("recoverable").toBool());
    CHECK(payload.contains("message"));
    CHECK(payload.contains("context"));
    CHECK(payload.contains("timestamp"));
}

TEST_CASE("setBridgeObject is single-assignment and emits structured warning", "[host][bridge]") {
    ensureApp();
    AnQstWebHostBase host;
    QSignalSpy errorSpy(&host, &AnQstWebHostBase::onHostError);

    DummyBridge bridge1;
    DummyBridge bridge2;

    REQUIRE(host.setBridgeObject(&bridge1));
    REQUIRE_FALSE(host.setBridgeObject(&bridge2));
    REQUIRE(waitForSignal(errorSpy));

    const QVariantMap payload = firstPayload(errorSpy);
    CHECK(payload.value("code").toString() == "HOST_BRIDGE_RECALL_IGNORED");
    CHECK(payload.value("category").toString() == "lifecycle");
    CHECK(payload.value("severity").toString() == "warn");
    CHECK(payload.value("recoverable").toBool());
}

TEST_CASE("bridge bootstrap script can be reinstalled explicitly", "[host][bridge][bootstrap]") {
    ensureApp();
    AnQstWebHostBase host;
    QSignalSpy errorSpy(&host, &AnQstWebHostBase::onHostError);

    REQUIRE(host.installBridgeBootstrapScript(QString(), true));
    CHECK(errorSpy.count() == 0);
}

TEST_CASE("bridge bootstrap script failure emits structured error", "[host][bridge][bootstrap]") {
    ensureApp();
    AnQstWebHostBase host;
    QSignalSpy errorSpy(&host, &AnQstWebHostBase::onHostError);

    REQUIRE_FALSE(host.installBridgeBootstrapScript(QStringLiteral("   "), true));
    REQUIRE(waitForSignal(errorSpy));

    const QVariantMap payload = firstPayload(errorSpy);
    CHECK(payload.value("code").toString() == "HOST_BRIDGE_BOOTSTRAP_UNAVAILABLE");
    CHECK(payload.value("category").toString() == "bridge");
    CHECK(payload.value("severity").toString() == "error");
    CHECK(payload.value("recoverable").toBool() == false);
}

TEST_CASE("bridge Call and CallSync handlers are invoked", "[host][behavior][call]") {
    ensureApp();
    AnQstWebHostBase host;

    host.setCallHandler([](const QString& service, const QString& member, const QVariantList& args) -> QVariant {
        return QStringLiteral("%1:%2:%3").arg(service, member, args.isEmpty() ? QStringLiteral("none") : args.at(0).toString());
    });
    host.setCallSyncHandler([](const QString&, const QString&, const QVariantList& args) -> QVariant {
        return args.isEmpty() ? 0 : args.at(0).toInt() + 1;
    });

    const QVariant callResult = host.anQstBridge_call(QStringLiteral("DemoBehaviorService"), QStringLiteral("callGreeting"), {QStringLiteral("Alice")});
    CHECK(callResult.toString() == QStringLiteral("DemoBehaviorService:callGreeting:Alice"));

    const QVariant callSyncResult = host.anQstBridge_callSync(QStringLiteral("DemoBehaviorService"), QStringLiteral("callSyncNextCounter"), {41});
    CHECK(callSyncResult.toInt() == 42);
}

TEST_CASE("bridge Emitter and Input handlers are forwarded", "[host][behavior][emitter][input]") {
    ensureApp();
    AnQstWebHostBase host;

    QVariantList capturedEmitterArgs;
    QVariant capturedInputValue;
    host.setEmitterHandler([&](const QString&, const QString&, const QVariantList& args) {
        capturedEmitterArgs = args;
    });
    host.setInputHandler([&](const QString&, const QString&, const QVariant& value) {
        capturedInputValue = value;
    });

    host.anQstBridge_emit(QStringLiteral("DemoBehaviorService"), QStringLiteral("emitterTelemetry"), {QStringLiteral("tag"), 7});
    host.anQstBridge_setInput(QStringLiteral("DemoBehaviorService"), QStringLiteral("inputTypedValue"), QStringLiteral("hello"));

    REQUIRE(capturedEmitterArgs.count() == 2);
    CHECK(capturedEmitterArgs.at(0).toString() == QStringLiteral("tag"));
    CHECK(capturedEmitterArgs.at(1).toInt() == 7);
    CHECK(capturedInputValue.toString() == QStringLiteral("hello"));
}

TEST_CASE("Slot queueing dispatches when handler is registered", "[host][behavior][slot]") {
    ensureApp();
    AnQstWebHostBase host;
    host.setSlotInvocationTimeoutMs(2000);

    QObject::connect(&host, &AnQstWebHostBase::anQstBridge_slotInvocationRequested, &host, [&](const QString& requestId, const QString&, const QString&, const QVariantList& args) {
        const QString payload = args.isEmpty() ? QStringLiteral("none") : args.at(0).toString();
        host.anQstBridge_resolveSlot(requestId, true, QStringLiteral("echo:%1").arg(payload), QString());
    });

    QTimer::singleShot(50, &host, [&]() {
        host.anQstBridge_registerSlot(QStringLiteral("DemoBehaviorService"), QStringLiteral("slotPrompt"));
    });

    QVariant result;
    QString error;
    const bool ok = host.invokeSlot(QStringLiteral("DemoBehaviorService"), QStringLiteral("slotPrompt"), {QStringLiteral("abc")}, &result, &error);
    CHECK(ok);
    CHECK(error.isEmpty());
    CHECK(result.toString() == QStringLiteral("echo:abc"));
}

TEST_CASE("Output value emits through bridge signal when host is ready", "[host][behavior][output]") {
    ensureApp();
    AnQstWebHostBase host;
    DummyBridge bridge;
    QSignalSpy outputSpy(&host, &AnQstWebHostBase::anQstBridge_outputUpdated);

    QTemporaryDir dir;
    REQUIRE(dir.isValid());
    REQUIRE(host.setContentRoot(dir.path()));
    REQUIRE(host.setBridgeObject(&bridge));
    QMetaObject::invokeMethod(&host, "handleLoadFinished", Q_ARG(bool, true));

    host.setOutputValue(QStringLiteral("DemoBehaviorService"), QStringLiteral("outputParentState"), QStringLiteral("state-1"));
    REQUIRE(waitForSignal(outputSpy, 4000));

    const auto args = outputSpy.takeFirst();
    REQUIRE(args.count() == 3);
    CHECK(args.at(0).toString() == QStringLiteral("DemoBehaviorService"));
    CHECK(args.at(1).toString() == QStringLiteral("outputParentState"));
    CHECK(args.at(2).toString() == QStringLiteral("state-1"));
}

TEST_CASE("resolveAssetPath blocks non-local schemes and emits policy error", "[host][policy]") {
    ensureApp();
    AnQstWebHostBase host;
    QSignalSpy errorSpy(&host, &AnQstWebHostBase::onHostError);

    QTemporaryDir dir;
    REQUIRE(dir.isValid());
    REQUIRE(host.setContentRoot(dir.path()));

    const QUrl resolved = host.resolveAssetPath("https://example.org/index.html");
    REQUIRE_FALSE(resolved.isValid());
    REQUIRE(waitForSignal(errorSpy));

    const QVariantMap payload = firstPayload(errorSpy);
    CHECK(payload.value("code").toString() == "HOST_POLICY_SCHEME_BLOCKED");
    CHECK(payload.value("category").toString() == "policy");
    CHECK(payload.value("severity").toString() == "error");
    CHECK(payload.value("recoverable").toBool());
}

TEST_CASE("loadEntryPoint emits missing entry error for absent file", "[host][load]") {
    ensureApp();
    AnQstWebHostBase host;
    QSignalSpy errorSpy(&host, &AnQstWebHostBase::onHostError);

    QTemporaryDir dir;
    REQUIRE(dir.isValid());
    REQUIRE(host.setContentRoot(dir.path()));

    REQUIRE_FALSE(host.loadEntryPoint("does-not-exist.html"));
    REQUIRE(waitForSignal(errorSpy));

    const QVariantMap payload = firstPayload(errorSpy);
    CHECK(payload.value("code").toString() == "HOST_LOAD_ENTRY_NOT_FOUND");
    CHECK(payload.value("category").toString() == "load");
    CHECK(payload.value("severity").toString() == "error");
    CHECK(payload.value("recoverable").toBool() == false);
}

TEST_CASE("host emits ready when entry loads and bridge is attached", "[host][ready]") {
    ensureApp();
    AnQstWebHostBase host;
    DummyBridge bridge;

    QSignalSpy readySpy(&host, &AnQstWebHostBase::onHostReady);
    QSignalSpy errorSpy(&host, &AnQstWebHostBase::onHostError);

    QTemporaryDir dir;
    REQUIRE(dir.isValid());
    REQUIRE(host.setContentRoot(dir.path()));
    REQUIRE(host.setBridgeObject(&bridge));
    QMetaObject::invokeMethod(&host, "handleLoadFinished", Q_ARG(bool, true));
    REQUIRE(waitForSignal(readySpy, 4000));
    CHECK(errorSpy.count() == 0);
}

TEST_CASE("enableDebug switches host to development mode and starts server", "[host][debug]") {
    ensureApp();
    AnQstWebHostBase host;
    QSignalSpy errorSpy(&host, &AnQstWebHostBase::onHostError);
    QSignalSpy debugSpy(&host, &AnQstWebHostBase::developmentModeEnabled);

    QTemporaryDir dir;
    REQUIRE(dir.isValid());
    writeHtmlFile(dir.filePath("index.html"), "<html><body>ok</body></html>");

    REQUIRE(host.setContentRoot(dir.path()));
    REQUIRE(host.loadEntryPoint("index.html"));
    REQUIRE(host.enableDebug());
    REQUIRE(host.isDevelopmentModeEnabled());
    REQUIRE_FALSE(host.developmentModeUrl().isEmpty());
    REQUIRE(waitForSignal(debugSpy, 4000));
    CHECK(host.enableDebug());
    CHECK(errorSpy.count() >= 1);
}

int main(int argc, char* argv[]) {
    const int result = Catch::Session().run(argc, argv);
    // QWebEngine can segfault during global/static teardown in headless CI.
    std::_Exit(result);
}

#include "test_AnQstWebHostBase.moc"

