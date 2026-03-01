#include "include/CdEntryEditor.h"
#include <QDebug>
#include <QMetaType>

extern int qInitResources_CdEntryEditor();

namespace {
void registerGeneratedMetaTypes() {
    static const bool registered = []() {
        qRegisterMetaType<CdEntryEditor::Track>("CdEntryEditor::Track");
        qRegisterMetaType<QList<CdEntryEditor::Track>>("QList<CdEntryEditor::Track>");
        qRegisterMetaType<CdEntryEditor::User_meta>("CdEntryEditor::User_meta");
        qRegisterMetaType<QList<CdEntryEditor::User_meta>>("QList<CdEntryEditor::User_meta>");
        qRegisterMetaType<CdEntryEditor::User>("CdEntryEditor::User");
        qRegisterMetaType<QList<CdEntryEditor::User>>("QList<CdEntryEditor::User>");
        qRegisterMetaType<CdEntryEditor::CdDraft>("CdEntryEditor::CdDraft");
        qRegisterMetaType<QList<CdEntryEditor::CdDraft>>("QList<CdEntryEditor::CdDraft>");
        qRegisterMetaType<CdEntryEditor::ValidationResult>("CdEntryEditor::ValidationResult");
        qRegisterMetaType<QList<CdEntryEditor::ValidationResult>>("QList<CdEntryEditor::ValidationResult>");
        qRegisterMetaType<CdEntryEditor::SaveResult>("CdEntryEditor::SaveResult");
        qRegisterMetaType<QList<CdEntryEditor::SaveResult>>("QList<CdEntryEditor::SaveResult>");
        return true;
    }();
    Q_UNUSED(registered);
}
}

namespace CdEntryEditor {

const CdEntryEditor::BridgeBindingRow CdEntryEditor::kBridgeBindings[] = {
    {"CdEntryService", "suggestCatalogNumber", "Call"},
    {"CdEntryService", "suggestGenres", "Call"},
    {"CdEntryService", "validateDraft", "Call"},
    {"CdEntryService", "normalizeBarcode", "Call"},
    {"CdEntryService", "focusField", "Slot"},
    {"CdEntryService", "replaceTracks", "Slot"},
    {"CdEntryService", "dirtyChanged", "Emitter"},
    {"CdEntryService", "fieldTouched", "Emitter"},
    {"CdEntryService", "readOnlyMode", "Output"},
    {"CdEntryService", "currentCollectionName", "Output"},
    {"CdEntryService", "saveInProgress", "Output"},
    {"CdEntryService", "draft", "Input"},
    {"CdEntryService", "selectedTrackIndex", "Input"},
};

CdEntryEditor::CdEntryEditor(QWidget* parent) : AnQstWebHostBase(parent) {
    static const bool kResourcesInitialized = []() {
        ::qInitResources_CdEntryEditor();
        return true;
    }();
    Q_UNUSED(kResourcesInitialized);
    registerGeneratedMetaTypes();
    installBridgeBindings();
    QObject::connect(this, &AnQstWebHostBase::onHostError, this, &CdEntryEditor::diagnosticsForwarded);
    const bool rootOk = setContentRoot(QString::fromUtf8(kBootstrapContentRoot));
    const bool bridgeOk = setBridgeObject(this, QString::fromUtf8(kBootstrapBridgeObject));
    const bool loadOk = rootOk && bridgeOk && loadEntryPoint(QString::fromUtf8(kBootstrapEntryPoint));
    if (!loadOk) {
        qWarning() << "CdEntryEditor bootstrap failed.";
    }
}

CdEntryEditor::~CdEntryEditor() = default;

bool CdEntryEditor::enableDebug() {
    return AnQstWebHostBase::enableDebug();
}

QString CdEntryEditor::makeBindingKey(const QString& service, const QString& member) {
    return service + QStringLiteral("::") + member;
}

void CdEntryEditor::installBridgeBindings() {
    setCallHandler([this](const QString& service, const QString& member, const QVariantList& args) -> QVariant {
        return handleGeneratedCall(service, member, args);
    });
    setEmitterHandler([this](const QString& service, const QString& member, const QVariantList& args) {
        handleGeneratedEmitter(service, member, args);
    });
    setInputHandler([this](const QString& service, const QString& member, const QVariant& value) {
        handleGeneratedInput(service, member, value);
    });
}

QVariant CdEntryEditor::handleGeneratedCall(const QString& service, const QString& member, const QVariantList& args) {
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("suggestCatalogNumber")) {
        if (!m_suggestCatalogNumberHandler) return QVariant();
        const QString artist = args.value(0).toString();
        const QString albumTitle = args.value(1).toString();
        const QString result = m_suggestCatalogNumberHandler(artist, albumTitle);
        return QVariant::fromValue(result);
    }
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("suggestGenres")) {
        if (!m_suggestGenresHandler) return QVariant();
        const QString artist = args.value(0).toString();
        const QString albumTitle = args.value(1).toString();
        const QList<Genre> result = m_suggestGenresHandler(artist, albumTitle);
        return QVariant::fromValue(result);
    }
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("validateDraft")) {
        if (!m_validateDraftHandler) return QVariant();
        const CdDraft draft = args.value(0).value<CdDraft>();
        const ValidationResult result = m_validateDraftHandler(draft);
        return QVariant::fromValue(result);
    }
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("normalizeBarcode")) {
        if (!m_normalizeBarcodeHandler) return QVariant();
        const QString rawValue = args.value(0).toString();
        const QString result = m_normalizeBarcodeHandler(rawValue);
        return QVariant::fromValue(result);
    }
    return QVariant();
}

void CdEntryEditor::handleGeneratedEmitter(const QString& service, const QString& member, const QVariantList& args) {
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("dirtyChanged")) {
        if (!m_dirtyChangedHandler) return;
        const bool isDirty = args.value(0).toBool();
        m_dirtyChangedHandler(isDirty);
        return;
    }
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("fieldTouched")) {
        if (!m_fieldTouchedHandler) return;
        const QString fieldName = args.value(0).toString();
        m_fieldTouchedHandler(fieldName);
        return;
    }
}

void CdEntryEditor::handleGeneratedInput(const QString& service, const QString& member, const QVariant& value) {
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("draft")) {
        const CdDraft typedValue = value.value<CdDraft>();
        setDraft(typedValue);
        if (m_draftHandler) m_draftHandler(typedValue);
        return;
    }
    if (service == QStringLiteral("CdEntryService") && member == QStringLiteral("selectedTrackIndex")) {
        const double typedValue = value.toDouble();
        setSelectedTrackIndex(typedValue);
        if (m_selectedTrackIndexHandler) m_selectedTrackIndexHandler(typedValue);
        return;
    }
}

void CdEntryEditor::setSuggestCatalogNumberHandler(const SuggestCatalogNumberHandler& handler) {
    m_suggestCatalogNumberHandler = handler;
}

void CdEntryEditor::setSuggestGenresHandler(const SuggestGenresHandler& handler) {
    m_suggestGenresHandler = handler;
}

void CdEntryEditor::setValidateDraftHandler(const ValidateDraftHandler& handler) {
    m_validateDraftHandler = handler;
}

void CdEntryEditor::setNormalizeBarcodeHandler(const NormalizeBarcodeHandler& handler) {
    m_normalizeBarcodeHandler = handler;
}

void CdEntryEditor::focusField(QString fieldName, bool* ok, QString* error) {
    QVariantList invokeArgs;
    invokeArgs.push_back(QVariant::fromValue(fieldName));
    QVariant result;
    QString invokeError;
    const bool success = invokeSlot(QStringLiteral("CdEntryService"), QStringLiteral("focusField"), invokeArgs, &result, &invokeError);
    if (ok != nullptr) *ok = success;
    if (error != nullptr) *error = invokeError;
    if (!success) return;
    return;
}

void CdEntryEditor::replaceTracks(QList<Track> tracks, bool* ok, QString* error) {
    QVariantList invokeArgs;
    invokeArgs.push_back(QVariant::fromValue(tracks));
    QVariant result;
    QString invokeError;
    const bool success = invokeSlot(QStringLiteral("CdEntryService"), QStringLiteral("replaceTracks"), invokeArgs, &result, &invokeError);
    if (ok != nullptr) *ok = success;
    if (error != nullptr) *error = invokeError;
    if (!success) return;
    return;
}

void CdEntryEditor::setDirtyChangedHandler(const DirtyChangedHandler& handler) {
    m_dirtyChangedHandler = handler;
}

void CdEntryEditor::setFieldTouchedHandler(const FieldTouchedHandler& handler) {
    m_fieldTouchedHandler = handler;
}

bool CdEntryEditor::readOnlyMode() const {
    return m_readOnlyMode;
}

void CdEntryEditor::setReadOnlyMode(const bool& value) {
    if (m_readOnlyMode == value) return;
    m_readOnlyMode = value;
    setOutputValue(QStringLiteral("CdEntryService"), QStringLiteral("readOnlyMode"), QVariant::fromValue(value));
    emit readOnlyModeChanged(value);
}

void CdEntryEditor::publishReadOnlyMode(const bool& value) {
    setReadOnlyMode(value);
}

QString CdEntryEditor::currentCollectionName() const {
    return m_currentCollectionName;
}

void CdEntryEditor::setCurrentCollectionName(const QString& value) {
    if (m_currentCollectionName == value) return;
    m_currentCollectionName = value;
    setOutputValue(QStringLiteral("CdEntryService"), QStringLiteral("currentCollectionName"), QVariant::fromValue(value));
    emit currentCollectionNameChanged(value);
}

void CdEntryEditor::publishCurrentCollectionName(const QString& value) {
    setCurrentCollectionName(value);
}

bool CdEntryEditor::saveInProgress() const {
    return m_saveInProgress;
}

void CdEntryEditor::setSaveInProgress(const bool& value) {
    if (m_saveInProgress == value) return;
    m_saveInProgress = value;
    setOutputValue(QStringLiteral("CdEntryService"), QStringLiteral("saveInProgress"), QVariant::fromValue(value));
    emit saveInProgressChanged(value);
}

void CdEntryEditor::publishSaveInProgress(const bool& value) {
    setSaveInProgress(value);
}

void CdEntryEditor::setDraftHandler(const DraftHandler& handler) {
    m_draftHandler = handler;
}

CdDraft CdEntryEditor::draft() const {
    return m_draft;
}

void CdEntryEditor::setDraft(const CdDraft& value) {
    if (m_draft == value) return;
    m_draft = value;
    emit draftChanged(value);
}

void CdEntryEditor::setSelectedTrackIndexHandler(const SelectedTrackIndexHandler& handler) {
    m_selectedTrackIndexHandler = handler;
}

double CdEntryEditor::selectedTrackIndex() const {
    return m_selectedTrackIndex;
}

void CdEntryEditor::setSelectedTrackIndex(const double& value) {
    if (m_selectedTrackIndex == value) return;
    m_selectedTrackIndex = value;
    emit selectedTrackIndexChanged(value);
}

} // namespace CdEntryEditor