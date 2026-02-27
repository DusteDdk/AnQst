#include "DemoHostWidget.h"
#include "ui_DemoMainWindow.h"

#include <QApplication>
#include <QDateTime>
#include <QMainWindow>
#include <QVBoxLayout>

int main(int argc, char* argv[]) {
    QApplication app(argc, argv);

    QMainWindow window;
    Ui::DemoMainWindow ui;
    ui.setupUi(&window);

    auto* host = new DemoHostWidget::DemoHostWidget(ui.webHostPlaceholder);
    auto* webHostLayout = qobject_cast<QVBoxLayout*>(ui.webHostPlaceholder->layout());
    if (webHostLayout == nullptr) {
        webHostLayout = new QVBoxLayout(ui.webHostPlaceholder);
        webHostLayout->setContentsMargins(0, 0, 0, 0);
    }
    webHostLayout->addWidget(host);

    const auto now = []() {
        return QDateTime::currentDateTime().toString(QStringLiteral("hh:mm:ss.zzz"));
    };
    const auto appendLog = [&](const QString& line) {
        ui.logView->appendPlainText(QStringLiteral("[%1] %2").arg(now(), line));
    };

    ui.modeLabel->setText(QStringLiteral("Generated bootstrap: QRC (%1)")
                              .arg(QString::fromUtf8(DemoHostWidget::DemoHostWidget::kBootstrapContentRoot)));

    host->setCallGreetingHandler([&](const QString& userName) -> QString {
        appendLog(QStringLiteral("Call<T> callGreeting userName=%1").arg(userName));
        return QStringLiteral("Hello %1 from Qt").arg(userName);
    });
    host->setCallNextCounterHandler([&](double seed) -> double {
        appendLog(QStringLiteral("Call<T> callNextCounter seed=%1").arg(seed));
        return seed + 1.0;
    });
    host->setEmitterTelemetryHandler([&](const QString& tag, double value) {
        appendLog(QStringLiteral("Emitter telemetry tag=%1 value=%2").arg(tag).arg(value));
    });
    host->setInputTypedValueHandler([&](const QString& value) {
        appendLog(QStringLiteral("Input<T> inputTypedValue value=%1").arg(value));
        host->publishOutputParentState(QStringLiteral("echo:%1").arg(value));
    });

    QObject::connect(host, &AnQstWebHostBase::onHostReady, [&]() {
        appendLog(QStringLiteral("onHostReady"));
    });
    QObject::connect(host, &AnQstWebHostBase::onHostError, [&](const QVariantMap& payload) {
        appendLog(QStringLiteral("onHostError code=%1 category=%2 severity=%3 message=%4")
                      .arg(payload.value(QStringLiteral("code")).toString(),
                           payload.value(QStringLiteral("category")).toString(),
                           payload.value(QStringLiteral("severity")).toString(),
                           payload.value(QStringLiteral("message")).toString()));
    });

    QObject::connect(ui.invokeSlotBtn, &QPushButton::clicked, [&]() {
        QString slotError;
        bool ok = false;
        const QString slotResult = host->slotPrompt(ui.slotInput->text(), &ok, &slotError);
        appendLog(QStringLiteral("Slot<T> invoke result ok=%1 payload=%2 error=%3")
                      .arg(ok ? QStringLiteral("true") : QStringLiteral("false"), slotResult, slotError));
    });
    QObject::connect(ui.setOutputBtn, &QPushButton::clicked, [&]() {
        host->publishOutputParentState(ui.outputInput->text());
        appendLog(QStringLiteral("Output<T> outputParentState updated from Qt"));
    });
    QObject::connect(ui.blockedPolicyBtn, &QPushButton::clicked, [&]() {
        const QUrl result = host->resolveAssetPath(QStringLiteral("https://example.org"));
        appendLog(QStringLiteral("Blocked-policy resolve result: %1").arg(result.toString()));
    });
    QObject::connect(ui.contextMenuCheck, &QCheckBox::toggled, [&](bool checked) {
        host->setContextMenuEnabled(checked);
        appendLog(QStringLiteral("Context menu %1").arg(checked ? QStringLiteral("enabled") : QStringLiteral("disabled")));
    });
    QObject::connect(ui.textSelectionCheck, &QCheckBox::toggled, [&](bool checked) {
        host->setTextSelectionEnabled(checked);
        appendLog(QStringLiteral("Text selection %1").arg(checked ? QStringLiteral("enabled") : QStringLiteral("disabled")));
    });
    QObject::connect(ui.enableDebugBtn, &QPushButton::clicked, [&]() {
        ui.enableDebugBtn->setEnabled(false);
        if (!host->enableDebug()) {
            appendLog(QStringLiteral("enableDebug() failed — check log for details"));
            ui.enableDebugBtn->setEnabled(true);
        }
    });
    QObject::connect(host, &AnQstWebHostBase::developmentModeEnabled, [&](const QString& url) {
        ui.modeLabel->setText(QStringLiteral("Dev mode active — connect browser to %1").arg(url));
    });
    ui.mainSplitter->setStretchFactor(0, 0);
    ui.mainSplitter->setStretchFactor(1, 1);
    ui.mainSplitter->setSizes({420, 780});

    QObject::connect(host, &DemoHostWidget::DemoHostWidget::outputParentStateChanged, [&](const QString& value) {
        appendLog(QStringLiteral("Output<T> observed outputParentState=%1").arg(value));
    });

    host->setSlotInvocationTimeoutMs(120000);
    host->publishOutputParentState(QStringLiteral("initial-parent-state"));

    window.show();
    return app.exec();
}
