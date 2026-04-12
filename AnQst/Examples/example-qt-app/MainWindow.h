#pragma once

#include <QMainWindow>
#include <QVariantMap>
#include <QVector>

#include "CdEntryEditor.h"

namespace VanillaJsWidget {
struct Magic;
}

QT_BEGIN_NAMESPACE
namespace Ui {
class MainWindow;
}
QT_END_NAMESPACE

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow() override;

private:
    void configureEditorWidget();
    void wireUi();
    void initializeEntries();
    void forwardResetToJsWidget();
    void forwardMagicToTsWidget(const VanillaJsWidget::Magic &magic);
    void handleWidgetDiagnostic(const QVariantMap &payload);
    void showStatusMessage(const QString &message, int timeoutMs = 4000);
    void loadEntries();
    void saveEntries() const;
    bool commitDraft(const CdEntryEditor::CdDraft &draft);
    bool commitCurrentDraft();
    bool resolveUnsavedChanges();
    void refreshEntryList();
    bool presentEntryInEditor(int index);
    void selectEntry(int index);
    void addEntry();
    void deleteEntry();
    CdEntryEditor::CdDraft makeDefaultDraft() const;
    QString entryTitle(const CdEntryEditor::CdDraft &draft) const;

    Ui::MainWindow *ui;
    QVector<CdEntryEditor::CdDraft> entries;
    int selectedEntryIndex;
    bool isDraftDirty;
    bool applyingHostSelection;
};
