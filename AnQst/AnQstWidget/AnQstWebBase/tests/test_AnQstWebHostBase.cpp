#include "AnQstWebHostBase.h"
#include "AngularHttpBaseServer.h"
#include "AnQstWidgetDebugDialog.h"

#include <QApplication>
#include <QCheckBox>
#include <QComboBox>
#include <QCoreApplication>
#include <QDialog>
#include <QDialogButtonBox>
#include <QDir>
#include <QElapsedTimer>
#include <QFile>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QSignalSpy>
#include <QShortcut>
#include <QTcpServer>
#include <QTcpSocket>
#include <QTemporaryDir>
#include <QTextStream>
#include <QTimer>
#include <cstdlib>

#if __has_include(<catch2/catch_session.hpp>) && __has_include(<catch2/catch_test_macros.hpp>)
#include <catch2/catch_session.hpp>
#include <catch2/catch_test_macros.hpp>
#elif __has_include(<catch2/catch.hpp>)
#define CATCH_CONFIG_RUNNER
#include <catch2/catch.hpp>
#else
#error "Catch2 headers are not available."
#endif

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

bool spyHasWebEngineError(
    const QSignalSpy& spy,
    const QString& channel,
    const QStringList& detailFragments = QStringList(),
    QString* matchedDetail = nullptr) {
    for (int index = 0; index < spy.count(); ++index) {
        const auto args = spy.at(index);
        if (args.count() != 2) {
            continue;
        }
        if (args.at(0).toString() != channel) {
            continue;
        }
        const QString detail = args.at(1).toString();
        bool matches = true;
        for (const QString& fragment : detailFragments) {
            if (!detail.contains(fragment)) {
                matches = false;
                break;
            }
        }
        if (!matches) {
            continue;
        }
        if (matchedDetail != nullptr) {
            *matchedDetail = detail;
        }
        return true;
    }
    return false;
}

bool waitForWebEngineError(
    QSignalSpy& spy,
    const QString& channel,
    const QStringList& detailFragments = QStringList(),
    int timeoutMs = 4000,
    QString* matchedDetail = nullptr) {
    if (spyHasWebEngineError(spy, channel, detailFragments, matchedDetail)) {
        return true;
    }
    QElapsedTimer timer;
    timer.start();
    while (timer.elapsed() < timeoutMs) {
        const int remainingMs = timeoutMs - static_cast<int>(timer.elapsed());
        if (remainingMs <= 0) {
            break;
        }
        spy.wait(qMin(remainingMs, 100));
        if (spyHasWebEngineError(spy, channel, detailFragments, matchedDetail)) {
            return true;
        }
    }
    return spyHasWebEngineError(spy, channel, detailFragments, matchedDetail);
}

void writeHtmlFile(const QString& filePath, const QString& html) {
    QFile file(filePath);
    REQUIRE(file.open(QIODevice::WriteOnly | QIODevice::Truncate));
    QTextStream stream(&file);
    stream << html;
    file.close();
}

void scheduleDebugDialogInteraction(
    int hostIndex,
    int providerIndex,
    const QString& directoryValue,
    const QString& urlValue,
    bool openBrowserChecked,
    bool acceptDialog) {
    QTimer::singleShot(0, qApp, [=]() {
        auto* dialog = qobject_cast<QDialog*>(QApplication::activeModalWidget());
        REQUIRE(dialog != nullptr);

        auto* hostCombo = dialog->findChild<QComboBox*>(QStringLiteral("cbAnQstAngularAppHost"));
        auto* providerCombo = dialog->findChild<QComboBox*>(QStringLiteral("cbWidgetResource"));
        auto* directoryEdit = dialog->findChild<QLineEdit*>(QStringLiteral("leDirectory"));
        auto* urlEdit = dialog->findChild<QLineEdit*>(QStringLiteral("leURL"));
        auto* openBrowser = dialog->findChild<QCheckBox*>(QStringLiteral("rbOpenBrowser"));
        auto* buttonBox = dialog->findChild<QDialogButtonBox*>(QStringLiteral("buttonBox"));
        REQUIRE(hostCombo != nullptr);
        REQUIRE(providerCombo != nullptr);
        REQUIRE(directoryEdit != nullptr);
        REQUIRE(urlEdit != nullptr);
        REQUIRE(openBrowser != nullptr);
        REQUIRE(buttonBox != nullptr);

        hostCombo->setCurrentIndex(hostIndex);
        providerCombo->setCurrentIndex(providerIndex);
        directoryEdit->setText(directoryValue);
        urlEdit->setText(urlValue);
        openBrowser->setChecked(openBrowserChecked);

        if (!acceptDialog) {
            dialog->reject();
            return;
        }

        auto* okButton = buttonBox->button(QDialogButtonBox::Ok);
        REQUIRE(okButton != nullptr);
        QElapsedTimer timer;
        timer.start();
        while (!okButton->isEnabled() && timer.elapsed() < 4000) {
            QCoreApplication::processEvents(QEventLoop::AllEvents, 30);
        }
        REQUIRE(okButton->isEnabled());
        okButton->click();
    });
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

TEST_CASE("bridge Call handler is invoked", "[host][behavior][call]") {
    ensureApp();
    AnQstWebHostBase host;

    host.setCallHandler([](const QString& service, const QString& member, const QVariantList& args) -> QVariant {
        return QStringLiteral("%1:%2:%3").arg(service, member, args.isEmpty() ? QStringLiteral("none") : args.at(0).toString());
    });

    const QVariant callResult = host.anQstBridge_call(QStringLiteral("DemoBehaviorService"), QStringLiteral("callGreeting"), {QStringLiteral("Alice")});
    CHECK(callResult.toString() == QStringLiteral("DemoBehaviorService:callGreeting:Alice"));
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

TEST_CASE("load failure emits raw WebEngine error without bridge", "[host][webengine][raw]") {
    ensureApp();
    AnQstWebHostBase host;
    QSignalSpy webEngineSpy(&host, &AnQstWebHostBase::onWebEngineError);

    QMetaObject::invokeMethod(&host, "handleLoadFinished", Q_ARG(bool, false));

    REQUIRE(waitForWebEngineError(
        webEngineSpy,
        QStringLiteral("webengine.load_failed"),
        {QStringLiteral("Host failed to load entry point.")}));
}

TEST_CASE("blocked navigation emits raw WebEngine error", "[host][webengine][policy]") {
    ensureApp();
    AnQstWebHostBase host;
    QSignalSpy webEngineSpy(&host, &AnQstWebHostBase::onWebEngineError);

    QMetaObject::invokeMethod(
        &host,
        "handleNavigationPolicyError",
        Q_ARG(QUrl, QUrl(QStringLiteral("https://example.org/blocked.js"))));

    REQUIRE(waitForWebEngineError(
        webEngineSpy,
        QStringLiteral("webengine.navigation_blocked"),
        {
            QStringLiteral("Navigation blocked by local-content policy."),
            QStringLiteral("https://example.org/blocked.js"),
        }));
}

TEST_CASE("javascript runtime errors emit detailed WebEngine diagnostics without bridge", "[host][webengine][javascript]") {
    ensureApp();
    AnQstWebHostBase host;
    host.resize(320, 240);
    host.show();

    QSignalSpy webEngineSpy(&host, &AnQstWebHostBase::onWebEngineError);

    QTemporaryDir dir;
    REQUIRE(dir.isValid());
    writeHtmlFile(
        dir.filePath("index.html"),
        "<!doctype html>\n"
        "<html><body><script>\n"
        "window.addEventListener('load', function () {\n"
        "  setTimeout(function () {\n"
        "    throw new Error('planned js failure for onWebEngineError test');\n"
        "  }, 0);\n"
        "});\n"
        "</script></body></html>\n");

    REQUIRE(host.setContentRoot(dir.path()));
    REQUIRE(host.loadEntryPoint(QStringLiteral("index.html")));

    QString matchedDetail;
    REQUIRE(waitForWebEngineError(
        webEngineSpy,
        QStringLiteral("js.window.error"),
        {
            QStringLiteral("Unhandled window error."),
            QStringLiteral("planned js failure for onWebEngineError test"),
            QStringLiteral("Stack:"),
        },
        10000,
        &matchedDetail));
    CHECK(matchedDetail.contains(QStringLiteral("Message:")));
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

TEST_CASE("debug dialog resource provider order matches contract", "[host][debug][dialog]") {
    ensureApp();
    AnQstWidgetDebugDialog::InitialState initial;
    initial.widgetName = QStringLiteral("DemoWidget");
    initial.hostMode = AnQstWidgetDebugDialog::HostMode::Application;
    initial.resourceProvider = AnQstWidgetDebugDialog::ResourceProvider::Qrc;
    initial.resourceUrl = QStringLiteral("http://localhost:4200/");
    initial.resourceDirectory = QDir::currentPath();

    AnQstWidgetDebugDialog dialog(initial);
    auto* providerCombo = dialog.findChild<QComboBox*>(QStringLiteral("cbWidgetResource"));
    REQUIRE(providerCombo != nullptr);
    REQUIRE(providerCombo->count() >= 3);
    CHECK(providerCombo->itemText(0).contains(QStringLiteral("QRC")));
    CHECK(providerCombo->itemText(1).contains(QStringLiteral("directory"), Qt::CaseInsensitive));
    CHECK(providerCombo->itemText(2).contains(QStringLiteral("HTTP"), Qt::CaseInsensitive));
}

TEST_CASE("debug dialog preserves open-browser choice on accept", "[host][debug][dialog]") {
    ensureApp();
    AnQstWidgetDebugDialog::InitialState initial;
    initial.widgetName = QStringLiteral("DemoWidget");
    initial.hostMode = AnQstWidgetDebugDialog::HostMode::Application;
    initial.resourceProvider = AnQstWidgetDebugDialog::ResourceProvider::Qrc;
    initial.resourceUrl = QStringLiteral("http://localhost:4200/");
    initial.resourceDirectory = QDir::currentPath();

    AnQstWidgetDebugDialog dialog(initial);
    auto* hostCombo = dialog.findChild<QComboBox*>(QStringLiteral("cbAnQstAngularAppHost"));
    auto* openBrowser = dialog.findChild<QCheckBox*>(QStringLiteral("rbOpenBrowser"));
    REQUIRE(hostCombo != nullptr);
    REQUIRE(openBrowser != nullptr);

    hostCombo->setCurrentIndex(1);
    openBrowser->setChecked(true);
    dialog.accept();

    const auto result = dialog.resultState();
    CHECK(result.accepted);
    CHECK(result.hostMode == AnQstWidgetDebugDialog::HostMode::Browser);
    CHECK(result.openBrowserChecked);
}

TEST_CASE("debug shortcut is bound to Shift+F12", "[host][debug][shortcut]") {
    ensureApp();
    AnQstWebHostBase host;

    const QList<QShortcut*> shortcuts = host.findChildren<QShortcut*>();
    bool hasF12Shortcut = false;
    bool hasShiftF12Shortcut = false;
    for (QShortcut* shortcut : shortcuts) {
        if (shortcut == nullptr) {
            continue;
        }
        if (shortcut->key() == QKeySequence(Qt::Key_F12)) {
            hasF12Shortcut = true;
        }
        if (shortcut->key() == QKeySequence(Qt::SHIFT | Qt::Key_F12)) {
            hasShiftF12Shortcut = true;
        }
    }

    CHECK_FALSE(hasF12Shortcut);
    CHECK(hasShiftF12Shortcut);
}

TEST_CASE("enableDebug cancel keeps widget state unchanged", "[host][debug][dialog]") {
    ensureApp();
    AnQstWebHostBase host;
    QSignalSpy debugSpy(&host, &AnQstWebHostBase::developmentModeEnabled);

    QTemporaryDir dir;
    REQUIRE(dir.isValid());
    writeHtmlFile(dir.filePath("index.html"), "<html><body>ok</body></html>");
    REQUIRE(host.setContentRoot(dir.path()));
    REQUIRE(host.loadEntryPoint("index.html"));

    scheduleDebugDialogInteraction(
        1,
        1,
        dir.path(),
        QStringLiteral("http://localhost:4200/"),
        true,
        false);
    REQUIRE_FALSE(host.enableDebug());
    CHECK_FALSE(host.isDevelopmentModeEnabled());
    CHECK(host.developmentModeUrl().isEmpty());
    CHECK(debugSpy.count() == 0);
}

TEST_CASE("debug dialog applies all host/provider combinations", "[host][debug][matrix]") {
    ensureApp();
    AnQstWebHostBase host;

    QTemporaryDir dir;
    REQUIRE(dir.isValid());
    writeHtmlFile(dir.filePath("qwebchannel.js"), "console.log('ok');");
    REQUIRE(host.setContentRoot(QStringLiteral("qrc:/qtwebchannel")));
    REQUIRE(host.loadEntryPoint("qwebchannel.js"));

    QTcpServer upstream;
    REQUIRE(upstream.listen(QHostAddress::Any, 0));
    QObject::connect(&upstream, &QTcpServer::newConnection, &upstream, [&upstream]() {
        QTcpSocket* incoming = upstream.nextPendingConnection();
        REQUIRE(incoming != nullptr);
        QObject::connect(incoming, &QTcpSocket::readyRead, incoming, [incoming]() {
            incoming->readAll();
            incoming->write(
                "HTTP/1.1 200 OK\r\n"
                "Content-Type: text/plain\r\n"
                "Content-Length: 2\r\n"
                "Connection: close\r\n"
                "\r\n"
                "ok");
            incoming->disconnectFromHost();
        });
    });
    const QString upstreamUrl = QStringLiteral("http://localhost:%1/").arg(upstream.serverPort());

    const struct Scenario {
        int hostIndex;
        int providerIndex;
        bool expectBrowserHost;
    } scenarios[] = {
        {0, 0, false},
        {0, 1, false},
        {0, 2, false},
        {1, 0, true},
        {1, 1, true},
        {1, 2, true},
    };

    for (const Scenario& scenario : scenarios) {
        scheduleDebugDialogInteraction(
            scenario.hostIndex,
            scenario.providerIndex,
            dir.path(),
            upstreamUrl,
            false,
            true);
        REQUIRE(host.enableDebug());
        CHECK(host.isDevelopmentModeEnabled() == scenario.expectBrowserHost);
        if (scenario.expectBrowserHost) {
            CHECK_FALSE(host.developmentModeUrl().isEmpty());
            auto* placeholder = host.findChild<QLabel*>(QStringLiteral("AnQstDevModePlaceholder"));
            REQUIRE(placeholder != nullptr);
            CHECK_FALSE(placeholder->isHidden());
        } else {
            CHECK(host.developmentModeUrl().isEmpty());
            auto* placeholder = host.findChild<QLabel*>(QStringLiteral("AnQstDevModePlaceholder"));
            REQUIRE(placeholder != nullptr);
            CHECK(placeholder->isHidden());
        }
    }
}

TEST_CASE("reattach button restores Application host", "[host][debug][reattach]") {
    ensureApp();
    AnQstWebHostBase host;

    QTemporaryDir dir;
    REQUIRE(dir.isValid());
    writeHtmlFile(dir.filePath("index.html"), "<html><body>ok</body></html>");
    REQUIRE(host.setContentRoot(dir.path()));
    REQUIRE(host.loadEntryPoint("index.html"));

    scheduleDebugDialogInteraction(
        1,
        1,
        dir.path(),
        QStringLiteral("http://localhost:4200/"),
        false,
        true);
    REQUIRE(host.enableDebug());
    REQUIRE(host.isDevelopmentModeEnabled());

    auto* reattachButton = host.findChild<QPushButton*>(QStringLiteral("AnQstDevModeReattachButton"));
    REQUIRE(reattachButton != nullptr);
    reattachButton->click();

    CHECK_FALSE(host.isDevelopmentModeEnabled());
    CHECK(host.developmentModeUrl().isEmpty());
}

TEST_CASE("proxy mode forwards streamed HTTP responses", "[host][debug][proxy][stream]") {
    ensureApp();

    QTcpServer upstream;
    REQUIRE(upstream.listen(QHostAddress::Any, 0));
    const quint16 upstreamPort = upstream.serverPort();
    bool sawUpstreamRequest = false;

    QObject::connect(&upstream, &QTcpServer::newConnection, &upstream, [&upstream, &sawUpstreamRequest]() {
        QTcpSocket* incoming = upstream.nextPendingConnection();
        REQUIRE(incoming != nullptr);
        QObject::connect(incoming, &QTcpSocket::readyRead, incoming, [incoming, &sawUpstreamRequest]() {
            incoming->readAll();
            sawUpstreamRequest = true;
            incoming->write(
                "HTTP/1.1 200 OK\r\n"
                "Content-Type: text/plain\r\n"
                "Transfer-Encoding: chunked\r\n"
                "Connection: close\r\n"
                "\r\n");
            incoming->write("5\r\nhello\r\n");
            QTimer::singleShot(60, incoming, [incoming]() {
                if (incoming->state() == QAbstractSocket::ConnectedState) {
                    incoming->write("6\r\n world\r\n");
                    incoming->write("0\r\n\r\n");
                    incoming->flush();
                    QTimer::singleShot(60, incoming, [incoming]() {
                        if (incoming->state() == QAbstractSocket::ConnectedState) {
                            incoming->disconnectFromHost();
                        }
                    });
                }
            });
        });
    });

    AngularHttpBaseServer proxy;
    proxy.setBridgeObjectName(QStringLiteral("TestBridge"));
    REQUIRE(proxy.configureProxyTarget(QUrl(QStringLiteral("http://localhost:%1/").arg(upstreamPort))));
    REQUIRE(proxy.start(false, 43800));

    QTcpSocket client;
    client.connectToHost(QHostAddress::LocalHost, proxy.httpPort());
    REQUIRE(client.waitForConnected(2000));
    client.write(
        "GET /stream HTTP/1.1\r\n"
        "Host: localhost\r\n"
        "Connection: close\r\n"
        "\r\n");
    client.flush();

    QByteArray response;
    QElapsedTimer timer;
    timer.start();
    while (timer.elapsed() < 5000) {
        QCoreApplication::processEvents(QEventLoop::AllEvents, 50);
        client.waitForReadyRead(100);
        response += client.readAll();
        if (client.state() == QAbstractSocket::UnconnectedState) {
            break;
        }
    }

    CHECK(sawUpstreamRequest);
    CHECK(response.contains("hello"));
    CHECK(response.contains(" world"));
    proxy.stop();
}

int main(int argc, char* argv[]) {
    const int result = Catch::Session().run(argc, argv);
    // QWebEngine can segfault during global/static teardown in headless CI.
    std::_Exit(result);
}

#include "test_AnQstWebHostBase.moc"
