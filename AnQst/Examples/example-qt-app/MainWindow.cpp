#include "MainWindow.h"
#include "ui_MainWindow.h"


#include <QDate>
#include <QDateTime>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QListWidgetItem>
#include <QMessageBox>
#include <QHash>
#include <QSettings>
#include <QSignalBlocker>
#include <QSplitter>
#include <QStatusBar>
#include <QVBoxLayout>
#include <memory>

namespace {

QJsonObject trackToJson(const CdEntryEditor::Track &track) {
    QJsonObject object;
    object.insert(QStringLiteral("title"), track.title);
    object.insert(QStringLiteral("durationSeconds"), track.durationSeconds);
    return object;
}

CdEntryEditor::Track trackFromJson(const QJsonObject &object) {
    CdEntryEditor::Track track;
    track.title = object.value(QStringLiteral("title")).toString();
    track.durationSeconds = object.value(QStringLiteral("durationSeconds")).toDouble();
    return track;
}

QJsonObject userToJson(const CdEntryEditor::User &user) {
    QJsonObject object;
    object.insert(QStringLiteral("name"), user.name);
    QJsonArray friends;
    for (const double friendId : user.meta.friends) {
        friends.append(friendId);
    }
    QJsonObject meta;
    meta.insert(QStringLiteral("friends"), friends);
    object.insert(QStringLiteral("meta"), meta);
    return object;
}

CdEntryEditor::User userFromJson(const QJsonObject &object) {
    CdEntryEditor::User user;
    user.name = object.value(QStringLiteral("name")).toString();
    const QJsonArray friends = object.value(QStringLiteral("meta")).toObject().value(QStringLiteral("friends")).toArray();
    for (const QJsonValue &value : friends) {
        user.meta.friends.push_back(value.toDouble());
    }
    return user;
}

QJsonObject draftToJson(const CdEntryEditor::CdDraft &draft) {
    QJsonObject object;
    object.insert(QStringLiteral("cdId"), QString::number(draft.cdId));
    object.insert(QStringLiteral("artist"), draft.artist);
    object.insert(QStringLiteral("albumTitle"), draft.albumTitle);
    object.insert(QStringLiteral("releaseYear"), draft.releaseYear);
    object.insert(QStringLiteral("genre"), draft.genre);
    object.insert(QStringLiteral("catalogNumber"), draft.catalogNumber);
    object.insert(QStringLiteral("barcode"), draft.barcode);
    object.insert(QStringLiteral("notes"), draft.notes);
    object.insert(QStringLiteral("createdBy"), userToJson(draft.createdBy));

    QJsonArray tracks;
    for (const CdEntryEditor::Track &track : draft.tracks) {
        tracks.append(trackToJson(track));
    }
    object.insert(QStringLiteral("tracks"), tracks);
    return object;
}

CdEntryEditor::CdDraft draftFromJson(const QJsonObject &object) {
    CdEntryEditor::CdDraft draft;
    draft.cdId = object.value(QStringLiteral("cdId")).toVariant().toLongLong();
    draft.artist = object.value(QStringLiteral("artist")).toString();
    draft.albumTitle = object.value(QStringLiteral("albumTitle")).toString();
    draft.releaseYear = object.value(QStringLiteral("releaseYear")).toInt(QDate::currentDate().year());
    draft.genre = object.value(QStringLiteral("genre")).toString(QStringLiteral("Other"));
    draft.catalogNumber = object.value(QStringLiteral("catalogNumber")).toString();
    draft.barcode = object.value(QStringLiteral("barcode")).toString();
    draft.notes = object.value(QStringLiteral("notes")).toString();
    draft.createdBy = userFromJson(object.value(QStringLiteral("createdBy")).toObject());

    const QJsonArray tracks = object.value(QStringLiteral("tracks")).toArray();
    for (const QJsonValue &value : tracks) {
        draft.tracks.push_back(trackFromJson(value.toObject()));
    }
    return draft;
}

} // namespace

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent),
      ui(new Ui::MainWindow),
      editorWidget(nullptr),
      selectedEntryIndex(-1),
      isDraftDirty(false),
      applyingHostSelection(false) {
    ui->setupUi(this);
    if (!windowTitle().contains(QStringLiteral("[*]"))) {
        setWindowTitle(windowTitle() + QStringLiteral("[*]"));
    }

    editorWidget = new CdEntryEditorWidget(ui->widgetHost);
    editorWidget->setReadOnlyMode(false);
    editorWidget->setCurrentCollectionName(QStringLiteral("Qt Hosted Collection"));
    editorWidget->saveInProgressSlot(false);

    editorWidget->handle.suggestCatalogNumber([](const QString &artist, const QString &albumTitle) {
        const QString a = artist.trimmed().left(4).toUpper();
        const QString b = albumTitle.trimmed().left(4).toUpper();
        return QStringLiteral("%1-%2").arg(a, b);
    });

    editorWidget->handle.suggestGenres([](const QString &, const QString &) -> QList<CdEntryEditor::Genre> {
        return QList<CdEntryEditor::Genre>{QStringLiteral("Other")};
    });

    editorWidget->handle.normalizeBarcode([](const QString &rawValue) {
        QString normalized = rawValue;
        normalized.remove(' ');
        normalized.remove('-');
        return normalized;
    });

    editorWidget->handle.validateDraft([](const CdEntryEditor::CdDraft &draft) {
        CdEntryEditor::ValidationResult result;
        result.valid = !draft.artist.trimmed().isEmpty() && !draft.albumTitle.trimmed().isEmpty();
        result.message = result.valid
            ? QStringLiteral("Validated by Qt host.")
            : QStringLiteral("Artist and album title are required.");
        if (!result.valid) {
            result.field = QStringLiteral("artist");
        }
        return result;
    });

    editorWidget->handle.saveRequested([this](const QString &draftJson) {
        CdEntryEditor::SaveResult result;
        result.saved = false;
        result.cdId = 0;
        result.message = QStringLiteral("Save request rejected.");
        QJsonParseError parseError;
        const QJsonDocument document = QJsonDocument::fromJson(draftJson.toUtf8(), &parseError);
        if (parseError.error != QJsonParseError::NoError || !document.isObject()) {
            statusBar()->showMessage(QStringLiteral("Save failed: invalid draft payload"), 2000);
            return result;
        }
        const CdEntryEditor::CdDraft draft = draftFromJson(document.object());
        result.saved = commitDraft(draft);
        result.cdId = draft.cdId;
        result.message = result.saved ? QStringLiteral("Saved.") : QStringLiteral("Save failed.");
        return result;
    });

    connect(editorWidget, &CdEntryEditorWidget::dirtyChanged, [this](const bool isDirty) {
        if (applyingHostSelection) {
            return;
        }
        isDraftDirty = isDirty;
        setWindowModified(isDirty);
    });

    connect(editorWidget, &CdEntryEditorWidget::fieldTouched, [this](const QString &fieldName) {
        statusBar()->showMessage(QStringLiteral("Field changed: %1").arg(fieldName), 1200);
    });
    editorWidget->setDraftHandler([this](const CdEntryEditor::CdDraft &) {});

    auto *layout = qobject_cast<QVBoxLayout *>(ui->widgetHost->layout());
    if (layout == nullptr) {
        layout = new QVBoxLayout(ui->widgetHost);
        layout->setContentsMargins(0, 0, 0, 0);
    }
    layout->addWidget(editorWidget);

    wireUi();

    loadEntries();
    if (entries.isEmpty()) {
        entries.push_back(makeDefaultDraft());
        saveEntries();
    }
    refreshEntryList();
    selectEntry(0);
}

MainWindow::~MainWindow() {
    delete ui;
}

void MainWindow::wireUi() {
    ui->mainSplitter->setStretchFactor(0, 4);
    ui->mainSplitter->setStretchFactor(1, 1);
    ui->mainSplitter->setSizes({1024, 256});
    ui->listEntries->setDraftProvider([this](int row) -> CdEntryEditor::CdDraft {
        if (row >= 0 && row < entries.size()) {
            return entries[row];
        }
        return {};
    });

    connect(ui->listEntries, &QListWidget::currentRowChanged, this, [this](const int row) {
        selectEntry(row);
    });
    connect(ui->btnAddEntry, &QToolButton::clicked, this, [this]() {
        addEntry();
    });
    connect(ui->btnDeleteEntry, &QToolButton::clicked, this, [this]() {
        deleteEntry();
    });




}

void MainWindow::loadEntries() {
    QSettings settings;
    const QString serialized = settings.value(QStringLiteral("example-qt-app/cdEntries")).toString();
    if (serialized.isEmpty()) {
        return;
    }

    QJsonParseError parseError;
    const QJsonDocument document = QJsonDocument::fromJson(serialized.toUtf8(), &parseError);
    if (parseError.error != QJsonParseError::NoError || !document.isArray()) {
        return;
    }

    entries.clear();
    for (const QJsonValue &value : document.array()) {
        entries.push_back(draftFromJson(value.toObject()));
    }
}

void MainWindow::saveEntries() const {
    QSettings settings;
    QJsonArray array;
    for (const CdEntryEditor::CdDraft &draft : entries) {
        array.append(draftToJson(draft));
    }
    const QString serialized = QString::fromUtf8(QJsonDocument(array).toJson(QJsonDocument::Compact));
    settings.setValue(QStringLiteral("example-qt-app/cdEntries"), serialized);
}

bool MainWindow::commitCurrentDraft() {
    return commitDraft(editorWidget->draft());
}

bool MainWindow::commitDraft(const CdEntryEditor::CdDraft &draft) {
    if (selectedEntryIndex < 0 || selectedEntryIndex >= entries.size()) {
        return false;
    }

    editorWidget->saveInProgressSlot(true);
    editorWidget->setDraft(draft);
    entries[selectedEntryIndex] = draft;
    if (auto *item = ui->listEntries->item(selectedEntryIndex)) {
        item->setText(entryTitle(draft));
    }
    saveEntries();
    editorWidget->saveInProgressSlot(false);
    isDraftDirty = false;
    setWindowModified(false);
    statusBar()->showMessage(QStringLiteral("Saved entry."), 1000);
    return true;
}

bool MainWindow::resolveUnsavedChanges() {
    if (!isDraftDirty) {
        return true;
    }

    const QMessageBox::StandardButton button = QMessageBox::question(
        this,
        QStringLiteral("Unsaved Changes"),
        QStringLiteral("This entry has unsaved changes. Save before switching?"),
        QMessageBox::Save | QMessageBox::Discard | QMessageBox::Cancel,
        QMessageBox::Save);

    if (button == QMessageBox::Save) {
        return commitCurrentDraft();
    }
    if (button == QMessageBox::Discard) {
        isDraftDirty = false;
        setWindowModified(false);
        return true;
    }
    return false;
}

void MainWindow::refreshEntryList() {
    const QSignalBlocker blocker(ui->listEntries);
    ui->listEntries->clear();
    for (const CdEntryEditor::CdDraft &draft : entries) {
        ui->listEntries->addItem(entryTitle(draft));
    }
    ui->btnDeleteEntry->setEnabled(!entries.isEmpty());
}

void MainWindow::selectEntry(const int index) {
    if (index < 0 || index >= entries.size()) {
        return;
    }
    if (index == selectedEntryIndex) {
        return;
    }
    if (!resolveUnsavedChanges()) {
        if (selectedEntryIndex >= 0 && selectedEntryIndex < entries.size()) {
            const QSignalBlocker blocker(ui->listEntries);
            ui->listEntries->setCurrentRow(selectedEntryIndex);
        }
        return;
    }

    selectedEntryIndex = index;
    if (ui->listEntries->currentRow() != index) {
        const QSignalBlocker blocker(ui->listEntries);
        ui->listEntries->setCurrentRow(index);
    }

    applyingHostSelection = true;
    const QString draftJson = QString::fromUtf8(QJsonDocument(draftToJson(entries[index])).toJson(QJsonDocument::Compact));
    editorWidget->slot_showDraft(draftJson, 0);
    applyingHostSelection = false;
    isDraftDirty = false;
    setWindowModified(false);

    editorWidget->setCurrentCollectionName(QStringLiteral("Qt Collection (%1 entries)").arg(entries.size()));
}

void MainWindow::addEntry() {
    if (!resolveUnsavedChanges()) {
        return;
    }
    entries.push_back(makeDefaultDraft());
    refreshEntryList();
    selectEntry(entries.size() - 1);
    saveEntries();
}

void MainWindow::deleteEntry() {
    if (selectedEntryIndex < 0 || selectedEntryIndex >= entries.size()) {
        return;
    }
    if (!resolveUnsavedChanges()) {
        return;
    }

    entries.removeAt(selectedEntryIndex);
    if (entries.isEmpty()) {
        entries.push_back(makeDefaultDraft());
    }

    refreshEntryList();
    selectEntry(qMin(selectedEntryIndex, entries.size() - 1));
    saveEntries();
}

CdEntryEditor::CdDraft MainWindow::makeDefaultDraft() const {
    CdEntryEditor::CdDraft draft;
    draft.cdId = QDateTime::currentMSecsSinceEpoch();
    draft.releaseYear = QDate::currentDate().year();
    draft.genre = QStringLiteral("Other");
    draft.createdBy.name = QStringLiteral("Qt Host");
    return draft;
}

QString MainWindow::entryTitle(const CdEntryEditor::CdDraft &draft) const {
    const QString idPrefix = QStringLiteral("CD #%1").arg(draft.cdId);
    const QString artist = draft.artist.trimmed();
    const QString album = draft.albumTitle.trimmed();
    if (!artist.isEmpty() || !album.isEmpty()) {
        return QStringLiteral("%1 - %2 - %3")
            .arg(idPrefix,
                 artist.isEmpty() ? QStringLiteral("(Unknown Artist)") : artist,
                 album.isEmpty() ? QStringLiteral("(Untitled Album)") : album);
    }
    return idPrefix;
}
