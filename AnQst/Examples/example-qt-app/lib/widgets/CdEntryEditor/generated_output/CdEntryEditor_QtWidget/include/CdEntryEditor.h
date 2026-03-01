#pragma once
#include <QHash>
#include <QVariant>
#include <QVariantList>
#include <functional>
#include "AnQstWebHostBase.h"
#include "CdEntryEditorTypes.h"

namespace CdEntryEditor {

class CdEntryEditor : public AnQstWebHostBase {
    Q_OBJECT
    Q_PROPERTY(bool readOnlyMode READ readOnlyMode WRITE setReadOnlyMode NOTIFY readOnlyModeChanged)
    Q_PROPERTY(QString currentCollectionName READ currentCollectionName WRITE setCurrentCollectionName NOTIFY currentCollectionNameChanged)
    Q_PROPERTY(bool saveInProgress READ saveInProgress WRITE setSaveInProgress NOTIFY saveInProgressChanged)
    Q_PROPERTY(CdDraft draft READ draft WRITE setDraft NOTIFY draftChanged)
    Q_PROPERTY(double selectedTrackIndex READ selectedTrackIndex WRITE setSelectedTrackIndex NOTIFY selectedTrackIndexChanged)

public:
    explicit CdEntryEditor(QWidget* parent = nullptr);
    ~CdEntryEditor() override;
    bool enableDebug();
    static constexpr const char* kBootstrapEntryPoint = "index.html";
    static constexpr const char* kBootstrapContentRoot = "qrc:/cdentryeditor";
    static constexpr const char* kBootstrapBridgeObject = "CdEntryEditorBridge";

    using SuggestCatalogNumberHandler = std::function<QString(QString artist, QString albumTitle)>;
    using SuggestGenresHandler = std::function<QList<Genre>(QString artist, QString albumTitle)>;
    using ValidateDraftHandler = std::function<ValidationResult(CdDraft draft)>;
    using NormalizeBarcodeHandler = std::function<QString(QString rawValue)>;
    using DirtyChangedHandler = std::function<void(bool isDirty)>;
    using FieldTouchedHandler = std::function<void(QString fieldName)>;
    using DraftHandler = std::function<void(const CdDraft& value)>;
    using SelectedTrackIndexHandler = std::function<void(const double& value)>;
    void setSuggestCatalogNumberHandler(const SuggestCatalogNumberHandler& handler);
    void setSuggestGenresHandler(const SuggestGenresHandler& handler);
    void setValidateDraftHandler(const ValidateDraftHandler& handler);
    void setNormalizeBarcodeHandler(const NormalizeBarcodeHandler& handler);
    void focusField(QString fieldName, bool* ok = nullptr, QString* error = nullptr);
    void replaceTracks(QList<Track> tracks, bool* ok = nullptr, QString* error = nullptr);
    void setDirtyChangedHandler(const DirtyChangedHandler& handler);
    void setFieldTouchedHandler(const FieldTouchedHandler& handler);
    bool readOnlyMode() const;
    void setReadOnlyMode(const bool& value);
    QString currentCollectionName() const;
    void setCurrentCollectionName(const QString& value);
    bool saveInProgress() const;
    void setSaveInProgress(const bool& value);
    CdDraft draft() const;
    void setDraft(const CdDraft& value);
    void setDraftHandler(const DraftHandler& handler);
    double selectedTrackIndex() const;
    void setSelectedTrackIndex(const double& value);
    void setSelectedTrackIndexHandler(const SelectedTrackIndexHandler& handler);
    void publishReadOnlyMode(const bool& value);
    void publishCurrentCollectionName(const QString& value);
    void publishSaveInProgress(const bool& value);

signals:
    void readOnlyModeChanged(const bool& value);
    void currentCollectionNameChanged(const QString& value);
    void saveInProgressChanged(const bool& value);
    void draftChanged(const CdDraft& value);
    void selectedTrackIndexChanged(const double& value);
    void diagnosticsForwarded(const QVariantMap& payload);

private:
    struct BridgeBindingRow {
        const char* service;
        const char* member;
        const char* kind;
    };
    static const BridgeBindingRow kBridgeBindings[];
    static constexpr int kBridgeBindingsCount = 13;
    static QString makeBindingKey(const QString& service, const QString& member);
    void installBridgeBindings();
    QVariant handleGeneratedCall(const QString& service, const QString& member, const QVariantList& args);
    void handleGeneratedEmitter(const QString& service, const QString& member, const QVariantList& args);
    void handleGeneratedInput(const QString& service, const QString& member, const QVariant& value);

    SuggestCatalogNumberHandler m_suggestCatalogNumberHandler;
    SuggestGenresHandler m_suggestGenresHandler;
    ValidateDraftHandler m_validateDraftHandler;
    NormalizeBarcodeHandler m_normalizeBarcodeHandler;
    DirtyChangedHandler m_dirtyChangedHandler;
    FieldTouchedHandler m_fieldTouchedHandler;
    bool m_readOnlyMode{};
    QString m_currentCollectionName{};
    bool m_saveInProgress{};
    CdDraft m_draft{};
    DraftHandler m_draftHandler;
    double m_selectedTrackIndex{};
    SelectedTrackIndexHandler m_selectedTrackIndexHandler;
};

} // namespace CdEntryEditor
