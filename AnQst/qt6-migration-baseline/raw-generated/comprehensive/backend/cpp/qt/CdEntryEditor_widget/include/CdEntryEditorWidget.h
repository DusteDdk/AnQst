#pragma once
#include <QByteArray>
#include <QDateTime>
#include <QHash>
#include <QMetaMethod>
#include <QQueue>
#include <QVariant>
#include <QVariantList>
#include <functional>
#include <optional>
#include "AnQstWebHostBase.h"
#include "CdEntryEditorTypes.h"

namespace CdEntryEditor {
} // namespace CdEntryEditor

using namespace CdEntryEditor;

class CdEntryEditorWidget : public anqstwebbase_1_7_7::AnQstWebHostBase {
    Q_OBJECT
    Q_PROPERTY(bool readOnlyMode READ readOnlyMode WRITE setReadOnlyMode NOTIFY readOnlyModeChanged)
    Q_PROPERTY(QString currentCollectionName READ currentCollectionName WRITE setCurrentCollectionName NOTIFY currentCollectionNameChanged)
    Q_PROPERTY(bool saveInProgress READ saveInProgress WRITE setSaveInProgress NOTIFY saveInProgressChanged)
    Q_PROPERTY(CdEntryEditor::CdDraft draft READ draft WRITE setDraft NOTIFY draftChanged)
    Q_PROPERTY(double selectedTrackIndex READ selectedTrackIndex WRITE setSelectedTrackIndex NOTIFY selectedTrackIndexChanged)

public:
    using SuggestCatalogNumberHandler = std::function<QString(const QString& artist, const QString& albumTitle)>;
    using SuggestGenresHandler = std::function<QList<CdEntryEditor::Genre>(const QString& artist, const QString& albumTitle)>;
    using ValidateDraftHandler = std::function<CdEntryEditor::ValidationResult(const CdEntryEditor::CdDraft& draft)>;
    using NormalizeBarcodeHandler = std::function<QString(const QString& rawValue)>;
    using SaveRequestedHandler = std::function<CdEntryEditor::SaveResult(const CdEntryEditor::CdDraft& draft)>;
    using DraftHandler = std::function<void(const CdEntryEditor::CdDraft& value)>;
    using SelectedTrackIndexHandler = std::function<void(const double& value)>;

    class handle {
    public:
        explicit handle(CdEntryEditorWidget* owner) : m_owner(owner) {}
    void suggestCatalogNumber(const SuggestCatalogNumberHandler& handler) const;
    void suggestGenres(const SuggestGenresHandler& handler) const;
    void validateDraft(const ValidateDraftHandler& handler) const;
    void normalizeBarcode(const NormalizeBarcodeHandler& handler) const;
    void saveRequested(const SaveRequestedHandler& handler) const;
    private:
        CdEntryEditorWidget* m_owner;
    };

    explicit CdEntryEditorWidget(QWidget* parent = nullptr);
    ~CdEntryEditorWidget() override;
    bool enableDebug();
    static constexpr const char* kBootstrapEntryPoint = "index.html";
    static constexpr const char* kBootstrapContentRoot = "qrc:/cdentryeditor";
    static constexpr const char* kBootstrapBridgeObject = "CdEntryEditorBridge";
    static constexpr int kMaxQueuedCallsPerEndpoint = 1024;
    static QByteArray encodeDragDropPayload_CdDraft(const CdEntryEditor::CdDraft& payload);
    static std::optional<CdEntryEditor::CdDraft> decodeDragDropPayload_CdDraft(const QByteArray& rawPayload);

    handle handle;
    bool readOnlyMode() const;
    void setReadOnlyMode(const bool& value);
    QString currentCollectionName() const;
    void setCurrentCollectionName(const QString& value);
    bool saveInProgress() const;
    void setSaveInProgress(const bool& value);
    CdEntryEditor::CdDraft draft() const;
    void setDraft(const CdEntryEditor::CdDraft& value);
    void setDraftHandler(const DraftHandler& handler);
    double selectedTrackIndex() const;
    void setSelectedTrackIndex(const double& value);
    void setSelectedTrackIndexHandler(const SelectedTrackIndexHandler& handler);

public slots:
    void slot_focusField(QString fieldName);
    void slot_showDraft(CdEntryEditor::CdDraft draft, double selectedTrackIndex);
    void slot_replaceTracks(QList<CdEntryEditor::Track> tracks);
    void readOnlyModeSlot(const bool& value);
    void currentCollectionNameSlot(const QString& value);
    void saveInProgressSlot(const bool& value);

signals:
    void dirtyChanged(const bool& isDirty);
    void fieldTouched(const QString& fieldName);
    void readOnlyModeChanged(const bool& value);
    void currentCollectionNameChanged(const QString& value);
    void saveInProgressChanged(const bool& value);
    void draftChanged(const CdEntryEditor::CdDraft& value);
    void selectedTrackIndexChanged(const double& value);
    void cdDropped(const CdEntryEditor::CdDraft& payload, double x, double y);
    void cdHovering(const CdEntryEditor::CdDraft& payload, double x, double y);
    void cdHoveringLeft();
    void diagnosticsForwarded(const QVariantMap& payload);

protected:
    void connectNotify(const QMetaMethod& signal) override;
    void disconnectNotify(const QMetaMethod& signal) override;

private:
    struct PendingCallInvocation {
        QString requestId;
        QVariantList args;
        QDateTime enqueuedAt;
    };
    static QString makeBindingKey(const QString& service, const QString& member);
    void installBridgeBindings();
    bool hasEmitterListeners(const QString& service, const QString& member) const;
    QVariant handleGeneratedCall(const QString& service, const QString& member, const QVariantList& args);
    void handleGeneratedEmitter(const QString& service, const QString& member, const QVariantList& args);
    void handleGeneratedInput(const QString& service, const QString& member, const QVariant& value);
    QVariant waitForCallHandlerAndInvoke(
        const QString& service,
        const QString& member,
        const QString& requestId,
        int timeoutMs,
        const std::function<QVariant()>& invokeNow);
    void removeQueuedCallById(const QString& queueKey, const QString& requestId);
    void setSuggestCatalogNumberCallHandler(const SuggestCatalogNumberHandler& handler);
    void setSuggestGenresCallHandler(const SuggestGenresHandler& handler);
    void setValidateDraftCallHandler(const ValidateDraftHandler& handler);
    void setNormalizeBarcodeCallHandler(const NormalizeBarcodeHandler& handler);
    void setSaveRequestedCallHandler(const SaveRequestedHandler& handler);

    qulonglong m_callRequestCounter{0};
    QHash<QString, QQueue<PendingCallInvocation>> m_queuedCalls;
    SuggestCatalogNumberHandler m_suggestCatalogNumberHandler;
    SuggestGenresHandler m_suggestGenresHandler;
    ValidateDraftHandler m_validateDraftHandler;
    NormalizeBarcodeHandler m_normalizeBarcodeHandler;
    SaveRequestedHandler m_saveRequestedHandler;
    bool m_readOnlyMode{};
    bool m_readOnlyModePublished{false};
    QString m_currentCollectionName{};
    bool m_currentCollectionNamePublished{false};
    bool m_saveInProgress{};
    bool m_saveInProgressPublished{false};
    CdEntryEditor::CdDraft m_draft{};
    DraftHandler m_draftHandler;
    double m_selectedTrackIndex{};
    SelectedTrackIndexHandler m_selectedTrackIndexHandler;
};
