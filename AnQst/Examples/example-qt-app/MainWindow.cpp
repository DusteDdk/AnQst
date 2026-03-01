#include "MainWindow.h"
#include "ui_MainWindow.h"

#include "CdEntryEditor.h"
#include "CdEntryEditorTypes.h"

#include <QVBoxLayout>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent),
      ui(new Ui::MainWindow),
      editorWidget(nullptr) {
    ui->setupUi(this);

    editorWidget = new CdEntryEditor::CdEntryEditor(ui->widgetHost);
    editorWidget->setReadOnlyMode(false);
    editorWidget->setCurrentCollectionName(QStringLiteral("Qt Hosted Collection"));
    editorWidget->setSaveInProgress(false);

    editorWidget->setSuggestCatalogNumberHandler([](const QString &artist, const QString &albumTitle) {
        const QString a = artist.trimmed().left(4).toUpper();
        const QString b = albumTitle.trimmed().left(4).toUpper();
        return QStringLiteral("%1-%2").arg(a, b);
    });
    editorWidget->setSuggestGenresHandler([](const QString &, const QString &) -> QList<CdEntryEditor::Genre> {
        return QList<CdEntryEditor::Genre>{QStringLiteral("Other")};
    });
    editorWidget->setNormalizeBarcodeHandler([](const QString &rawValue) {
        QString normalized = rawValue;
        normalized.remove(' ');
        normalized.remove('-');
        return normalized;
    });
    editorWidget->setValidateDraftHandler([](const CdEntryEditor::CdDraft &) {
        CdEntryEditor::ValidationResult result;
        result.valid = true;
        result.message = QStringLiteral("Validated by Qt host.");
        return result;
    });

    auto *layout = qobject_cast<QVBoxLayout *>(ui->widgetHost->layout());
    if (layout == nullptr) {
        layout = new QVBoxLayout(ui->widgetHost);
        layout->setContentsMargins(0, 0, 0, 0);
    }
    layout->addWidget(editorWidget);
}

MainWindow::~MainWindow() {
    delete ui;
}
