#include "MainWindow.h"
#include "ui_MainWindow.h"

#include "VanillaJsWidget.h"
#include "VanillaTsWidget.h"

#include <QApplication>
#include <QDate>
#include <QDateTime>
#include <QDebug>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QListWidgetItem>
#include <QMessageBox>
#include <QMetaObject>
#include <QSettings>
#include <QSignalBlocker>
#include <QStatusBar>

namespace {

QJsonObject trackToSettingsJson(const CdEntryEditor::Track &track) {
    QJsonObject object;
    object.insert(QStringLiteral("title"), track.title);
    object.insert(QStringLiteral("durationSeconds"), track.durationSeconds);
    return object;
}

CdEntryEditor::Track trackFromSettingsJson(const QJsonObject &object) {
    CdEntryEditor::Track track;
    track.title = object.value(QStringLiteral("title")).toString();
    track.durationSeconds = object.value(QStringLiteral("durationSeconds")).toDouble();
    return track;
}

QJsonObject userToSettingsJson(const CdEntryEditor::User &user) {
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

CdEntryEditor::User userFromSettingsJson(const QJsonObject &object) {
    CdEntryEditor::User user;
    user.name = object.value(QStringLiteral("name")).toString();
    const QJsonArray friends = object.value(QStringLiteral("meta")).toObject().value(QStringLiteral("friends")).toArray();
    for (const QJsonValue &value : friends) {
        user.meta.friends.push_back(value.toDouble());
    }
    return user;
}

QString genreToSettingsString(CdEntryEditor::Genre genre) {
    switch (genre) {
    case CdEntryEditor::Genre::Rock:
        return QStringLiteral("Rock");
    case CdEntryEditor::Genre::Pop:
        return QStringLiteral("Pop");
    case CdEntryEditor::Genre::Jazz:
        return QStringLiteral("Jazz");
    case CdEntryEditor::Genre::Classical:
        return QStringLiteral("Classical");
    case CdEntryEditor::Genre::Electronic:
        return QStringLiteral("Electronic");
    case CdEntryEditor::Genre::Other:
        return QStringLiteral("Other");
    }
    return QStringLiteral("Other");
}

CdEntryEditor::Genre genreFromSettingsString(const QString &value) {
    if (value == QStringLiteral("Rock")) {
        return CdEntryEditor::Genre::Rock;
    }
    if (value == QStringLiteral("Pop")) {
        return CdEntryEditor::Genre::Pop;
    }
    if (value == QStringLiteral("Jazz")) {
        return CdEntryEditor::Genre::Jazz;
    }
    if (value == QStringLiteral("Classical")) {
        return CdEntryEditor::Genre::Classical;
    }
    if (value == QStringLiteral("Electronic")) {
        return CdEntryEditor::Genre::Electronic;
    }
    return CdEntryEditor::Genre::Other;
}

QJsonObject draftToSettingsJson(const CdEntryEditor::CdDraft &draft) {
    QJsonObject object;
    object.insert(QStringLiteral("cdId"), QString::number(draft.cdId));
    object.insert(QStringLiteral("artist"), draft.artist);
    object.insert(QStringLiteral("albumTitle"), draft.albumTitle);
    object.insert(QStringLiteral("releaseYear"), draft.releaseYear);
    object.insert(QStringLiteral("genre"), genreToSettingsString(draft.genre));
    object.insert(QStringLiteral("catalogNumber"), draft.catalogNumber);
    object.insert(QStringLiteral("barcode"), draft.barcode);
    object.insert(QStringLiteral("notes"), draft.notes);
    object.insert(QStringLiteral("createdBy"), userToSettingsJson(draft.createdBy));

    QJsonArray tracks;
    for (const CdEntryEditor::Track &track : draft.tracks) {
        tracks.append(trackToSettingsJson(track));
    }
    object.insert(QStringLiteral("tracks"), tracks);
    return object;
}

CdEntryEditor::CdDraft draftFromSettingsJson(const QJsonObject &object) {
    CdEntryEditor::CdDraft draft;
    draft.cdId = object.value(QStringLiteral("cdId")).toVariant().toLongLong();
    draft.artist = object.value(QStringLiteral("artist")).toString();
    draft.albumTitle = object.value(QStringLiteral("albumTitle")).toString();
    draft.releaseYear = object.value(QStringLiteral("releaseYear")).toInt(QDate::currentDate().year());
    draft.genre = genreFromSettingsString(object.value(QStringLiteral("genre")).toString(QStringLiteral("Other")));
    draft.catalogNumber = object.value(QStringLiteral("catalogNumber")).toString();
    draft.barcode = object.value(QStringLiteral("barcode")).toString();
    draft.notes = object.value(QStringLiteral("notes")).toString();
    draft.createdBy = userFromSettingsJson(object.value(QStringLiteral("createdBy")).toObject());

    const QJsonArray tracks = object.value(QStringLiteral("tracks")).toArray();
    for (const QJsonValue &value : tracks) {
        draft.tracks.push_back(trackFromSettingsJson(value.toObject()));
    }
    return draft;
}

} // namespace

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent),
      ui(new Ui::MainWindow),
      selectedEntryIndex(-1),
      isDraftDirty(false),
      applyingHostSelection(false) {
    ui->setupUi(this);
    if (!windowTitle().contains(QStringLiteral("[*]"))) {
        setWindowTitle(windowTitle() + QStringLiteral("[*]"));
    }

    configureEditorWidget();
    wireUi();
    initializeEntries();
}

MainWindow::~MainWindow() {
    delete ui;
}

void MainWindow::configureEditorWidget() {
    ui->editorWidget->setReadOnlyMode(false);
    ui->editorWidget->setCurrentCollectionName(QStringLiteral("Qt Hosted Collection"));
    ui->editorWidget->saveInProgressSlot(false);

    ui->editorWidget->handle.suggestCatalogNumber([](const QString &artist, const QString &albumTitle) {
        const QString a = artist.trimmed().left(4).toUpper();
        const QString b = albumTitle.trimmed().left(4).toUpper();
        return QStringLiteral("%1-%2").arg(a, b);
    });

    ui->editorWidget->handle.suggestGenres([](const QString &, const QString &) -> QList<CdEntryEditor::Genre> {
        return QList<CdEntryEditor::Genre>{CdEntryEditor::Genre::Other};
    });

    ui->editorWidget->handle.normalizeBarcode([](const QString &rawValue) {
        QString normalized = rawValue;
        normalized.remove(' ');
        normalized.remove('-');
        return normalized;
    });

    ui->editorWidget->handle.validateDraft([](const CdEntryEditor::CdDraft &draft) {
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

    ui->editorWidget->handle.saveRequested([this](const CdEntryEditor::CdDraft &draft) {
        CdEntryEditor::SaveResult result;
        result.saved = false;
        result.cdId = 0;
        result.message = QStringLiteral("Save request rejected.");
        result.saved = commitDraft(draft);
        result.cdId = draft.cdId;
        result.message = result.saved ? QStringLiteral("Saved.") : QStringLiteral("Save failed.");
        return result;
    });

    connect(ui->editorWidget, &CdEntryEditorWidget::dirtyChanged, this, [this](const bool isDirty) {
        if (applyingHostSelection) {
            return;
        }
        isDraftDirty = isDirty;
        setWindowModified(isDirty);
    });

    connect(ui->editorWidget, &CdEntryEditorWidget::fieldTouched, this, [this](const QString &fieldName) {
        statusBar()->showMessage(QStringLiteral("Field changed: %1").arg(fieldName), 1200);
    });
    connect(ui->editorWidget, &CdEntryEditorWidget::diagnosticsForwarded, this, [this](const QVariantMap &payload) {
        handleWidgetDiagnostic(payload);
    });
    ui->editorWidget->setDraftHandler([this](const CdEntryEditor::CdDraft &) {});
}

void MainWindow::wireUi() {
    connect(ui->vanillaTsWidget, &VanillaTsWidgetWidget::requestReset, this, [this]() {
        QMetaObject::invokeMethod(this, [this]() {
            forwardResetToJsWidget();
        }, Qt::QueuedConnection);
    });

    connect(ui->vanillaJsWidget, &VanillaJsWidgetWidget::spreadMagic, this, [this](const VanillaJsWidget::Magic &m) {
        QMetaObject::invokeMethod(this, [this, m]() {
            forwardMagicToTsWidget(m);
        }, Qt::QueuedConnection);
    });
    connect(ui->vanillaJsWidget, &VanillaJsWidgetWidget::diagnosticsForwarded, this, [this](const QVariantMap &payload) {
        handleWidgetDiagnostic(payload);
    });
    connect(ui->vanillaTsWidget, &VanillaTsWidgetWidget::diagnosticsForwarded, this, [this](const QVariantMap &payload) {
        handleWidgetDiagnostic(payload);
    });

    ui->vanillaSplitter->setStretchFactor(0, 1);
    ui->vanillaSplitter->setStretchFactor(1, 1);

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
        // Mouse press is also the start of a drag gesture, so defer editor
        // switching until click release for pointer-driven selection.
        if (QApplication::mouseButtons().testFlag(Qt::LeftButton)) {
            return;
        }
        selectEntry(row);
    });
    connect(ui->listEntries, &QListWidget::itemClicked, this, [this](QListWidgetItem *item) {
        if (item == nullptr) {
            return;
        }
        selectEntry(ui->listEntries->row(item));
    });
    connect(ui->btnAddEntry, &QToolButton::clicked, this, [this]() {
        addEntry();
    });
    connect(ui->btnDeleteEntry, &QToolButton::clicked, this, [this]() {
        deleteEntry();
    });
}

void MainWindow::initializeEntries() {
    loadEntries();
    if (entries.isEmpty()) {
        entries.push_back(makeDefaultDraft());
        saveEntries();
    }
    refreshEntryList();
    selectEntry(0);
}

void MainWindow::forwardResetToJsWidget() {
    try {
        ui->vanillaJsWidget->slot_reset();
    } catch (const std::exception &ex) {
        showStatusMessage(QStringLiteral("Failed to forward reset request: %1").arg(QString::fromUtf8(ex.what())), 6000);
        qWarning().noquote() << "VanillaJsWidget slot_reset failed:" << ex.what();
    } catch (...) {
        showStatusMessage(QStringLiteral("Failed to forward reset request."), 6000);
        qWarning() << "VanillaJsWidget slot_reset failed with an unknown exception.";
    }
}

void MainWindow::forwardMagicToTsWidget(const VanillaJsWidget::Magic &magic) {
    VanillaTsWidget::Magic adapted{};
    adapted.tick = magic.tick;
    adapted.value = magic.value;

    try {
        ui->vanillaTsWidget->slot_onMagic(adapted);
    } catch (const std::exception &ex) {
        showStatusMessage(QStringLiteral("Failed to forward magic update: %1").arg(QString::fromUtf8(ex.what())), 6000);
        qWarning().noquote() << "VanillaTsWidget slot_onMagic failed:" << ex.what();
    } catch (...) {
        showStatusMessage(QStringLiteral("Failed to forward magic update."), 6000);
        qWarning() << "VanillaTsWidget slot_onMagic failed with an unknown exception.";
    }
}

void MainWindow::showStatusMessage(const QString &message, const int timeoutMs) {
    statusBar()->showMessage(message, timeoutMs);
}

void MainWindow::handleWidgetDiagnostic(const QVariantMap &payload) {
    const QString severity = payload.value(QStringLiteral("severity")).toString();
    const QString code = payload.value(QStringLiteral("code")).toString();
    const QString message = payload.value(QStringLiteral("message")).toString();
    const QString effectiveSeverity = severity.isEmpty() ? QStringLiteral("info") : severity;
    const QString effectiveCode = code.isEmpty() ? QStringLiteral("UnknownDiagnostic") : code;
    const QString effectiveMessage = message.isEmpty() ? QStringLiteral("No diagnostic message provided.") : message;
    const QString formatted = QStringLiteral("%1: %2").arg(effectiveCode, effectiveMessage);
    const int timeoutMs = effectiveSeverity == QStringLiteral("info") ? 2500 : 5000;

    if (effectiveSeverity == QStringLiteral("fatal") || effectiveSeverity == QStringLiteral("error")) {
        qWarning().noquote() << "CdEntryEditor diagnostic" << payload;
    } else {
        qInfo().noquote() << "CdEntryEditor diagnostic" << payload;
    }

    showStatusMessage(formatted, timeoutMs);
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
        entries.push_back(draftFromSettingsJson(value.toObject()));
    }
}

void MainWindow::saveEntries() const {
    QSettings settings;
    QJsonArray array;
    for (const CdEntryEditor::CdDraft &draft : entries) {
        array.append(draftToSettingsJson(draft));
    }
    const QString serialized = QString::fromUtf8(QJsonDocument(array).toJson(QJsonDocument::Compact));
    settings.setValue(QStringLiteral("example-qt-app/cdEntries"), serialized);
}

bool MainWindow::commitCurrentDraft() {
    return commitDraft(ui->editorWidget->draft());
}

bool MainWindow::commitDraft(const CdEntryEditor::CdDraft &draft) {
    if (selectedEntryIndex < 0 || selectedEntryIndex >= entries.size()) {
        return false;
    }

    ui->editorWidget->saveInProgressSlot(true);
    ui->editorWidget->setDraft(draft);
    entries[selectedEntryIndex] = draft;
    if (auto *item = ui->listEntries->item(selectedEntryIndex)) {
        item->setText(entryTitle(draft));
    }
    saveEntries();
    ui->editorWidget->saveInProgressSlot(false);
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

bool MainWindow::presentEntryInEditor(const int index) {
    try {
        applyingHostSelection = true;
        ui->editorWidget->slot_showDraft(entries[index], 0);
        applyingHostSelection = false;
        return true;
    } catch (const std::exception &ex) {
        applyingHostSelection = false;
        showStatusMessage(QStringLiteral("Failed to load editor entry: %1").arg(QString::fromUtf8(ex.what())), 6000);
        qWarning().noquote() << "CdEntryEditor slot_showDraft failed:" << ex.what();
    } catch (...) {
        applyingHostSelection = false;
        showStatusMessage(QStringLiteral("Failed to load editor entry."), 6000);
        qWarning() << "CdEntryEditor slot_showDraft failed with an unknown exception.";
    }
    return false;
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

    const int previousIndex = selectedEntryIndex;
    if (ui->listEntries->currentRow() != index) {
        const QSignalBlocker blocker(ui->listEntries);
        ui->listEntries->setCurrentRow(index);
    }

    if (!presentEntryInEditor(index)) {
        const QSignalBlocker blocker(ui->listEntries);
        ui->listEntries->setCurrentRow(previousIndex);
        return;
    }

    selectedEntryIndex = index;
    isDraftDirty = false;
    setWindowModified(false);

    ui->editorWidget->setCurrentCollectionName(QStringLiteral("Qt Collection (%1 entries)").arg(entries.size()));
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
    draft.genre = CdEntryEditor::Genre::Other;
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
