#include "DraggableCdListWidget.h"

#include "CdEntryEditorWidget.h"

#include <QMimeData>

DraggableCdListWidget::DraggableCdListWidget(QWidget* parent)
    : QListWidget(parent) {
    setDragEnabled(true);
    setDefaultDropAction(Qt::CopyAction);
}

void DraggableCdListWidget::setDraftProvider(const DraftProvider& provider) {
    m_draftProvider = provider;
}

QStringList DraggableCdListWidget::mimeTypes() const {
    return { QString::fromUtf8(CdEntryEditor::kDragDropMime_CdDraft) };
}

QMimeData* DraggableCdListWidget::mimeData(const QList<QListWidgetItem*> items) const {
    if (items.isEmpty() || !m_draftProvider) {
        return nullptr;
    }
    const int row = this->row(items.first());
    if (row < 0) {
        return nullptr;
    }
    const CdEntryEditor::CdDraft draft = m_draftProvider(row);
    const QByteArray payload = CdEntryEditorWidget::encodeDragDropPayload_CdDraft(draft);

    auto* mimeData = new QMimeData();
    mimeData->setData(QString::fromUtf8(CdEntryEditor::kDragDropMime_CdDraft), payload);
    return mimeData;
}
