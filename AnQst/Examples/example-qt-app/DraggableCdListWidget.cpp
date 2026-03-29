#include "DraggableCdListWidget.h"

#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QMimeData>

namespace {

QJsonObject trackToJson(const CdEntryEditor::Track& track) {
    QJsonObject obj;
    obj.insert(QStringLiteral("title"), track.title);
    obj.insert(QStringLiteral("durationSeconds"), track.durationSeconds);
    return obj;
}

QJsonObject userToJson(const CdEntryEditor::User& user) {
    QJsonObject obj;
    obj.insert(QStringLiteral("name"), user.name);
    QJsonArray friends;
    for (const double friendId : user.meta.friends) {
        friends.append(friendId);
    }
    QJsonObject meta;
    meta.insert(QStringLiteral("friends"), friends);
    obj.insert(QStringLiteral("meta"), meta);
    return obj;
}

QJsonObject draftToMimeJson(const CdEntryEditor::CdDraft& draft) {
    QJsonObject obj;
    obj.insert(QStringLiteral("cdId"), QString::number(draft.cdId));
    obj.insert(QStringLiteral("artist"), draft.artist);
    obj.insert(QStringLiteral("albumTitle"), draft.albumTitle);
    obj.insert(QStringLiteral("releaseYear"), draft.releaseYear);
    obj.insert(QStringLiteral("genre"), draft.genre);
    obj.insert(QStringLiteral("catalogNumber"), draft.catalogNumber);
    obj.insert(QStringLiteral("barcode"), draft.barcode);
    obj.insert(QStringLiteral("notes"), draft.notes);
    obj.insert(QStringLiteral("createdBy"), userToJson(draft.createdBy));
    QJsonArray tracks;
    for (const CdEntryEditor::Track& track : draft.tracks) {
        tracks.append(trackToJson(track));
    }
    obj.insert(QStringLiteral("tracks"), tracks);
    return obj;
}

} // namespace

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
    const QByteArray json = QJsonDocument(draftToMimeJson(draft)).toJson(QJsonDocument::Compact);

    auto* mimeData = new QMimeData();
    mimeData->setData(QString::fromUtf8(CdEntryEditor::kDragDropMime_CdDraft), json);
    return mimeData;
}

