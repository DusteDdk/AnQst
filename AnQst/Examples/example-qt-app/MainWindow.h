#pragma once

#include <QMainWindow>
#include <QVector>

#include "CdEntryEditor.h"
#include "DraggableCdListWidget.h"

QT_BEGIN_NAMESPACE
namespace Ui {
class MainWindow;
}
QT_END_NAMESPACE

namespace CdEntryEditor {
class CdEntryEditor;
}

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow() override;

private:
    void wireUi();
    void loadEntries();
    void saveEntries() const;
    bool commitDraft(const CdEntryEditor::CdDraft &draft);
    bool commitCurrentDraft();
    bool resolveUnsavedChanges();
    void refreshEntryList();
    void selectEntry(int index);
    void addEntry();
    void deleteEntry();
    CdEntryEditor::CdDraft makeDefaultDraft() const;
    QString entryTitle(const CdEntryEditor::CdDraft &draft) const;

    Ui::MainWindow *ui;
    CdEntryEditorWidget *editorWidget;
    QVector<CdEntryEditor::CdDraft> entries;
    int selectedEntryIndex;
    bool isDraftDirty;
    bool applyingHostSelection;
};
