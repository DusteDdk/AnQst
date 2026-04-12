#include "AnQstWidgetDebugDialog.h"

#include "ui_AnQstWidgetDebugDialog.h"

#include <QAbstractButton>
#include <QCheckBox>
#include <QComboBox>
#include <QDialogButtonBox>
#include <QDir>
#include <QEvent>
#include <QFileDialog>
#include <QFileInfo>
#include <QKeyEvent>
#include <QLayout>
#include <QLineEdit>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QPlainTextEdit>
#include <QPushButton>
#include <QScrollBar>
#include <QTabWidget>
#include <QTimer>

namespace {

constexpr int kUrlProbeDebounceMs = 400;
constexpr int kStatusPayloadPreviewLength = 64;
constexpr int kMaxJsConsoleMessages = 20000;

} // namespace

AnQstWidgetDebugDialog::AnQstWidgetDebugDialog(const InitialState& initialState, QWidget* parent)
    : QDialog(parent)
    , m_ui(new Ui::AnQstWidgetBaseClassDialog())
    , m_networkManager(new QNetworkAccessManager(this))
    , m_urlProbeDebounceTimer(new QTimer(this))
    , m_activeProbeReply(nullptr)
    , m_probeGeneration(0)
    , m_isUrlProbeOk(false)
    , m_jsConsoleCommandHistoryIndex(0) {
    m_ui->setupUi(this);

    const QString widgetName = initialState.widgetName.trimmed().isEmpty()
        ? QStringLiteral("Unknown")
        : initialState.widgetName.trimmed();
    setWindowTitle(QStringLiteral("Debug Widget %1").arg(widgetName));

    m_ui->cbAnQstAngularAppHost->setCurrentIndex(static_cast<int>(initialState.hostMode));
    m_ui->cbWidgetResource->setCurrentIndex(static_cast<int>(initialState.resourceProvider));
    m_ui->leURL->setText(initialState.resourceUrl);
    m_ui->leDirectory->setText(initialState.resourceDirectory);
    m_jsConsoleHistory = initialState.jsConsoleHistory;
    if (m_jsConsoleHistory.size() > kMaxJsConsoleMessages) {
        m_jsConsoleHistory = m_jsConsoleHistory.mid(m_jsConsoleHistory.size() - kMaxJsConsoleMessages);
    }
    m_jsConsoleCommandHistory = initialState.jsConsoleCommandHistory;
    if (m_jsConsoleCommandHistory.size() > kMaxJsConsoleMessages) {
        m_jsConsoleCommandHistory =
            m_jsConsoleCommandHistory.mid(m_jsConsoleCommandHistory.size() - kMaxJsConsoleMessages);
    }
    m_jsConsoleCommandHistoryIndex = m_jsConsoleCommandHistory.size();
    m_ui->txtEditJSLog->setPlainText(m_jsConsoleHistory.join(QLatin1Char('\n')));
    m_ui->txtEditJSLog->verticalScrollBar()->setValue(m_ui->txtEditJSLog->verticalScrollBar()->maximum());
    m_ui->lineEditJSConsoleInput->setFocusPolicy(Qt::StrongFocus);
    m_ui->lineEditJSConsoleInput->installEventFilter(this);

    m_urlProbeDebounceTimer->setSingleShot(true);
    m_urlProbeDebounceTimer->setInterval(kUrlProbeDebounceMs);

    connect(m_ui->cbWidgetResource, qOverload<int>(&QComboBox::currentIndexChanged), this, [this](int) {
        onResourceProviderChanged();
    });
    connect(m_ui->cbAnQstAngularAppHost, qOverload<int>(&QComboBox::currentIndexChanged), this, [this](int) {
        onHostModeChanged();
    });
    connect(m_ui->leURL, &QLineEdit::textChanged, this, &AnQstWidgetDebugDialog::onUrlInputChanged);
    connect(m_ui->leDirectory, &QLineEdit::textChanged, this, &AnQstWidgetDebugDialog::onDirectoryInputChanged);
    connect(m_urlProbeDebounceTimer, &QTimer::timeout, this, &AnQstWidgetDebugDialog::onUrlProbeTimeout);
    connect(m_ui->btnBrowseDirectory, &QAbstractButton::clicked, this, &AnQstWidgetDebugDialog::onBrowseDirectoryRequested);
    connect(m_ui->tabWidget, &QTabWidget::currentChanged, this, &AnQstWidgetDebugDialog::onTabChanged);

    updateDynamicVisibility();
    onUrlInputChanged();
    onDirectoryInputChanged();
    focusJsConsoleInput();
}

AnQstWidgetDebugDialog::~AnQstWidgetDebugDialog() {
    stopPendingProbe();
    delete m_ui;
}

AnQstWidgetDebugDialog::ResultState AnQstWidgetDebugDialog::resultState() const {
    ResultState result;
    result.accepted = (this->result() == QDialog::Accepted);
    result.hostMode = static_cast<HostMode>(m_ui->cbAnQstAngularAppHost->currentIndex());
    result.resourceProvider = static_cast<ResourceProvider>(m_ui->cbWidgetResource->currentIndex());
    result.resourceUrl = m_ui->leURL->text().trimmed();
    result.resourceDirectory = normalizedDirectoryRoot(m_ui->leDirectory->text());
    result.openBrowserChecked =
        (result.hostMode == HostMode::Browser) && m_ui->rbOpenBrowser->isChecked();
    return result;
}

void AnQstWidgetDebugDialog::appendJsConsoleLine(const QString& line) {
    m_jsConsoleHistory.append(line);
    bool rebuilt = false;
    if (m_jsConsoleHistory.size() > kMaxJsConsoleMessages) {
        m_jsConsoleHistory.removeFirst();
        rebuilt = true;
    }

    if (rebuilt) {
        m_ui->txtEditJSLog->setPlainText(m_jsConsoleHistory.join(QLatin1Char('\n')));
    } else {
        m_ui->txtEditJSLog->appendPlainText(line);
    }
    m_ui->txtEditJSLog->verticalScrollBar()->setValue(m_ui->txtEditJSLog->verticalScrollBar()->maximum());
}

void AnQstWidgetDebugDialog::onResourceProviderChanged() {
    updateDynamicVisibility();
    onUrlInputChanged();
    onDirectoryInputChanged();
    updateValidationState();
}

void AnQstWidgetDebugDialog::onHostModeChanged() {
    updateDynamicVisibility();
}

void AnQstWidgetDebugDialog::onUrlInputChanged() {
    if (!isHttpProviderSelected()) {
        stopPendingProbe();
        m_isUrlProbeOk = true;
        setUrlStatusMessage(QString());
        updateValidationState();
        return;
    }

    QUrl normalized;
    if (!parseAndNormalizeHttpUrl(m_ui->leURL->text().trimmed(), &normalized)) {
        stopPendingProbe();
        completeProbeAsInvalid(QStringLiteral("Error: Invalid HTTP URL"));
        return;
    }

    m_isUrlProbeOk = false;
    setUrlStatusMessage(QStringLiteral("Checking..."));
    m_urlProbeDebounceTimer->start();
    updateValidationState();
}

void AnQstWidgetDebugDialog::onUrlProbeTimeout() {
    if (!isHttpProviderSelected()) {
        return;
    }
    QUrl normalized;
    if (!parseAndNormalizeHttpUrl(m_ui->leURL->text().trimmed(), &normalized)) {
        completeProbeAsInvalid(QStringLiteral("Error: Invalid HTTP URL"));
        return;
    }
    startUrlProbe(normalized);
}

void AnQstWidgetDebugDialog::onBrowseDirectoryRequested() {
    const QString selected = QFileDialog::getExistingDirectory(
        this,
        QStringLiteral("Select Directory"),
        normalizedDirectoryRoot(m_ui->leDirectory->text()));
    if (selected.trimmed().isEmpty()) {
        return;
    }
    m_ui->leDirectory->setText(QDir::cleanPath(QFileInfo(selected).absoluteFilePath()));
}

void AnQstWidgetDebugDialog::onDirectoryInputChanged() {
    updateValidationState();
}

void AnQstWidgetDebugDialog::onTabChanged(int index) {
    if (m_ui->tabWidget->widget(index) == m_ui->tabJSConsole) {
        focusJsConsoleInput();
    }
}

void AnQstWidgetDebugDialog::onJsConsoleInputSubmitted() {
    const QString source = m_ui->lineEditJSConsoleInput->text();
    if (source.isEmpty()) {
        focusJsConsoleInput();
        return;
    }

    appendJsConsoleCommandHistoryEntry(source);
    emit jsConsoleCommandSubmitted(source);
    m_ui->lineEditJSConsoleInput->clear();
    m_jsConsoleCommandHistoryIndex = m_jsConsoleCommandHistory.size();
    focusJsConsoleInput();
}

void AnQstWidgetDebugDialog::setLayoutVisible(QLayout* layout, bool visible) {
    if (layout == nullptr) {
        return;
    }
    for (int i = 0; i < layout->count(); ++i) {
        QLayoutItem* item = layout->itemAt(i);
        if (item == nullptr) {
            continue;
        }
        if (item->widget() != nullptr) {
            item->widget()->setVisible(visible);
            continue;
        }
        if (item->layout() != nullptr) {
            setLayoutVisible(item->layout(), visible);
            continue;
        }
        if (item->spacerItem() != nullptr) {
            item->spacerItem()->changeSize(
                visible ? item->spacerItem()->sizeHint().width() : 0,
                visible ? item->spacerItem()->sizeHint().height() : 0);
        }
    }
}

bool AnQstWidgetDebugDialog::eventFilter(QObject* watched, QEvent* event) {
    if (watched == m_ui->lineEditJSConsoleInput && event != nullptr && event->type() == QEvent::KeyPress) {
        auto* keyEvent = static_cast<QKeyEvent*>(event);
        if (keyEvent->key() == Qt::Key_Return || keyEvent->key() == Qt::Key_Enter) {
            onJsConsoleInputSubmitted();
            return true;
        }
        if (keyEvent->key() == Qt::Key_Up) {
            showPreviousJsConsoleCommand();
            return true;
        }
        if (keyEvent->key() == Qt::Key_Down) {
            showNextJsConsoleCommand();
            return true;
        }
    }
    return QDialog::eventFilter(watched, event);
}

void AnQstWidgetDebugDialog::updateDynamicVisibility() {
    const bool showUrl = isHttpProviderSelected();
    const bool showDirectory = isDirProviderSelected();
    const bool showOpenBrowser = (m_ui->cbAnQstAngularAppHost->currentIndex() == static_cast<int>(HostMode::Browser));

    setLayoutVisible(m_ui->vlayoutURL, showUrl);
    setLayoutVisible(m_ui->vlayoutDIR, showDirectory);
    m_ui->rbOpenBrowser->setVisible(showOpenBrowser);
}

void AnQstWidgetDebugDialog::updateValidationState() {
    bool okEnabled = true;
    if (isHttpProviderSelected()) {
        okEnabled = okEnabled && m_isUrlProbeOk;
    }
    if (isDirProviderSelected()) {
        okEnabled = okEnabled && isDirectoryInputValid();
    }

    QPushButton* okButton = m_ui->buttonBox->button(QDialogButtonBox::Ok);
    if (okButton != nullptr) {
        okButton->setEnabled(okEnabled);
    }
}

void AnQstWidgetDebugDialog::setUrlStatusMessage(const QString& message) {
    m_ui->lblURLStatusMsg->setText(message);
}

void AnQstWidgetDebugDialog::focusJsConsoleInput() {
    if (m_ui->tabWidget->currentWidget() != m_ui->tabJSConsole) {
        return;
    }
    m_ui->lineEditJSConsoleInput->setFocus(Qt::OtherFocusReason);
}

void AnQstWidgetDebugDialog::appendJsConsoleCommandHistoryEntry(const QString& source) {
    if (source.isEmpty()) {
        return;
    }
    m_jsConsoleCommandHistory.append(source);
    if (m_jsConsoleCommandHistory.size() > kMaxJsConsoleMessages) {
        m_jsConsoleCommandHistory.removeFirst();
    }
}

void AnQstWidgetDebugDialog::showPreviousJsConsoleCommand() {
    if (m_jsConsoleCommandHistory.isEmpty()) {
        return;
    }
    if (m_jsConsoleCommandHistoryIndex > 0) {
        --m_jsConsoleCommandHistoryIndex;
    }
    m_ui->lineEditJSConsoleInput->setText(m_jsConsoleCommandHistory.at(m_jsConsoleCommandHistoryIndex));
}

void AnQstWidgetDebugDialog::showNextJsConsoleCommand() {
    if (m_jsConsoleCommandHistory.isEmpty()) {
        return;
    }
    if (m_jsConsoleCommandHistoryIndex < m_jsConsoleCommandHistory.size() - 1) {
        ++m_jsConsoleCommandHistoryIndex;
        m_ui->lineEditJSConsoleInput->setText(m_jsConsoleCommandHistory.at(m_jsConsoleCommandHistoryIndex));
        return;
    }
    m_jsConsoleCommandHistoryIndex = m_jsConsoleCommandHistory.size();
    m_ui->lineEditJSConsoleInput->clear();
}

bool AnQstWidgetDebugDialog::isHttpProviderSelected() const {
    return m_ui->cbWidgetResource->currentIndex() == static_cast<int>(ResourceProvider::Http);
}

bool AnQstWidgetDebugDialog::isDirProviderSelected() const {
    return m_ui->cbWidgetResource->currentIndex() == static_cast<int>(ResourceProvider::Dir);
}

QString AnQstWidgetDebugDialog::normalizedDirectoryRoot(const QString& input) const {
    const QString trimmed = input.trimmed();
    if (trimmed.isEmpty()) {
        return QString();
    }
    const QFileInfo info(trimmed);
    if (info.isAbsolute()) {
        return QDir::cleanPath(info.absoluteFilePath());
    }
    return QDir::cleanPath(QDir::current().absoluteFilePath(trimmed));
}

bool AnQstWidgetDebugDialog::isDirectoryInputValid() const {
    const QString normalized = normalizedDirectoryRoot(m_ui->leDirectory->text());
    if (normalized.isEmpty()) {
        return false;
    }
    const QFileInfo info(normalized);
    return info.exists() && info.isDir();
}

bool AnQstWidgetDebugDialog::parseAndNormalizeHttpUrl(const QString& input, QUrl* normalized) const {
    if (normalized != nullptr) {
        normalized->clear();
    }
    if (input.trimmed().isEmpty()) {
        return false;
    }
    QUrl url(input.trimmed());
    if (!url.isValid() || url.scheme().trimmed().isEmpty() || url.host().trimmed().isEmpty()) {
        return false;
    }
    if (url.scheme().toLower() != QStringLiteral("http")) {
        return false;
    }
    url.setPath(QStringLiteral("/"));
    url.setQuery(QString());
    url.setFragment(QString());
    if (normalized != nullptr) {
        *normalized = url;
    }
    return true;
}

void AnQstWidgetDebugDialog::startUrlProbe(const QUrl& urlToProbe) {
    stopPendingProbe();
    ++m_probeGeneration;
    const quint64 generation = m_probeGeneration;

    QNetworkRequest request(urlToProbe);
    request.setAttribute(QNetworkRequest::RedirectPolicyAttribute, QNetworkRequest::NoLessSafeRedirectPolicy);
    m_activeProbeReply = m_networkManager->get(request);
    connect(m_activeProbeReply, &QNetworkReply::finished, this, [this, generation]() {
        if (generation != m_probeGeneration || m_activeProbeReply == nullptr) {
            return;
        }
        QNetworkReply* reply = m_activeProbeReply;
        m_activeProbeReply = nullptr;

        const int statusCode = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
        const QNetworkReply::NetworkError networkError = reply->error();
        const QString errorText = reply->errorString();
        const QString payload = QString::fromUtf8(reply->readAll()).trimmed();
        reply->deleteLater();

        if (networkError != QNetworkReply::NoError) {
            completeProbeAsInvalid(QStringLiteral("Error: %1").arg(errorText));
            return;
        }
        if (statusCode >= 400) {
            QString compactPayload = payload.left(kStatusPayloadPreviewLength);
            compactPayload.replace('\n', ' ');
            compactPayload.replace('\r', ' ');
            setUrlStatusMessage(QStringLiteral("HTTP Error: %1 %2").arg(statusCode).arg(compactPayload));
            m_isUrlProbeOk = false;
            updateValidationState();
            return;
        }
        setUrlStatusMessage(QStringLiteral("OK %1").arg(statusCode));
        m_isUrlProbeOk = true;
        updateValidationState();
    });
}

void AnQstWidgetDebugDialog::stopPendingProbe() {
    m_urlProbeDebounceTimer->stop();
    ++m_probeGeneration;
    if (m_activeProbeReply != nullptr) {
        m_activeProbeReply->abort();
        m_activeProbeReply->deleteLater();
        m_activeProbeReply = nullptr;
    }
}

void AnQstWidgetDebugDialog::completeProbeAsInvalid(const QString& message) {
    m_isUrlProbeOk = false;
    setUrlStatusMessage(message);
    updateValidationState();
}
