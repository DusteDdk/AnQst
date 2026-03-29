#pragma once

#include <QListWidget>
#include <QVector>
#include <functional>

#include "CdEntryEditorTypes.h"

class DraggableCdListWidget : public QListWidget {
    Q_OBJECT

public:
    using DraftProvider = std::function<CdEntryEditor::CdDraft(int row)>;

    explicit DraggableCdListWidget(QWidget* parent = nullptr);

    void setDraftProvider(const DraftProvider& provider);

    QStringList mimeTypes() const override;
    QMimeData* mimeData(const QList<QListWidgetItem*> items) const override;

private:
    DraftProvider m_draftProvider;
};
