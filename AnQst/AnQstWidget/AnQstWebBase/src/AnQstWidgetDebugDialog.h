#pragma once

#include <QDialog>
#include <QStringList>
#include <QUrl>

class QDialogButtonBox;
class QLayout;
class QNetworkAccessManager;
class QNetworkReply;
class QTimer;

namespace Ui {
class AnQstWidgetBaseClassDialog;
}

class AnQstWidgetDebugDialog final : public QDialog {
    Q_OBJECT

public:
    enum class HostMode {
        Application = 0,
        Browser = 1
    };

    enum class ResourceProvider {
        Qrc = 0,
        Dir = 1,
        Http = 2
    };

    struct InitialState {
        QString widgetName;
        HostMode hostMode = HostMode::Application;
        ResourceProvider resourceProvider = ResourceProvider::Qrc;
        QString resourceUrl;
        QString resourceDirectory;
        QStringList jsConsoleHistory;
        QStringList jsConsoleCommandHistory;
    };

    struct ResultState {
        bool accepted = false;
        HostMode hostMode = HostMode::Application;
        ResourceProvider resourceProvider = ResourceProvider::Qrc;
        QString resourceUrl;
        QString resourceDirectory;
        bool openBrowserChecked = false;
    };

    explicit AnQstWidgetDebugDialog(const InitialState& initialState, QWidget* parent = nullptr);
    ~AnQstWidgetDebugDialog() override;

    ResultState resultState() const;
    void appendJsConsoleLine(const QString& line);

signals:
    void jsConsoleCommandSubmitted(const QString& source);

private slots:
    void onResourceProviderChanged();
    void onHostModeChanged();
    void onUrlInputChanged();
    void onUrlProbeTimeout();
    void onBrowseDirectoryRequested();
    void onDirectoryInputChanged();
    void onTabChanged(int index);
    void onJsConsoleInputSubmitted();

private:
    static void setLayoutVisible(QLayout* layout, bool visible);
    bool eventFilter(QObject* watched, QEvent* event) override;

    void updateDynamicVisibility();
    void updateValidationState();
    void setUrlStatusMessage(const QString& message);
    void focusJsConsoleInput();
    void appendJsConsoleCommandHistoryEntry(const QString& source);
    void showPreviousJsConsoleCommand();
    void showNextJsConsoleCommand();
    bool isHttpProviderSelected() const;
    bool isDirProviderSelected() const;
    QString normalizedDirectoryRoot(const QString& input) const;
    bool isDirectoryInputValid() const;
    bool parseAndNormalizeHttpUrl(const QString& input, QUrl* normalized) const;
    void startUrlProbe(const QUrl& urlToProbe);
    void stopPendingProbe();
    void completeProbeAsInvalid(const QString& message);

    Ui::AnQstWidgetBaseClassDialog* m_ui;
    QNetworkAccessManager* m_networkManager;
    QTimer* m_urlProbeDebounceTimer;
    QNetworkReply* m_activeProbeReply;
    quint64 m_probeGeneration;
    bool m_isUrlProbeOk;
    QStringList m_jsConsoleHistory;
    QStringList m_jsConsoleCommandHistory;
    int m_jsConsoleCommandHistoryIndex;
};
