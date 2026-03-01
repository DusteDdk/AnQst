#pragma once
#include <QString>
#include <QStringList>
#include <QList>
#include <QVariantMap>
#include <QMetaType>
#include <cstdint>
#include <optional>

namespace CdEntryEditor {

using Genre = QString; // union mapped conservatively

struct Track {
    QString title;
    double durationSeconds;
    bool operator==(const Track& other) const { return title == other.title && durationSeconds == other.durationSeconds; }
};

struct User_meta {
    QList<double> friends;
    bool operator==(const User_meta& other) const { return friends == other.friends; }
};

struct User {
    QString name;
    User_meta meta;
    bool operator==(const User& other) const { return name == other.name && meta == other.meta; }
};

struct CdDraft {
    qint64 cdId;
    QString artist;
    QString albumTitle;
    qint32 releaseYear;
    Genre genre;
    QString catalogNumber;
    QString barcode;
    QList<Track> tracks;
    QString notes;
    User createdBy;
    bool operator==(const CdDraft& other) const { return cdId == other.cdId && artist == other.artist && albumTitle == other.albumTitle && releaseYear == other.releaseYear && genre == other.genre && catalogNumber == other.catalogNumber && barcode == other.barcode && tracks == other.tracks && notes == other.notes && createdBy == other.createdBy; }
};

struct ValidationResult {
    bool valid;
    QString message;
    std::optional<QString> field;
    bool operator==(const ValidationResult& other) const { return valid == other.valid && message == other.message && field == other.field; }
};

struct SaveResult {
    bool saved;
    qint64 cdId;
    QString message;
    bool operator==(const SaveResult& other) const { return saved == other.saved && cdId == other.cdId && message == other.message; }
};

} // namespace CdEntryEditor

Q_DECLARE_METATYPE(CdEntryEditor::Track)
Q_DECLARE_METATYPE(QList<CdEntryEditor::Track>)
Q_DECLARE_METATYPE(CdEntryEditor::User_meta)
Q_DECLARE_METATYPE(QList<CdEntryEditor::User_meta>)
Q_DECLARE_METATYPE(CdEntryEditor::User)
Q_DECLARE_METATYPE(QList<CdEntryEditor::User>)
Q_DECLARE_METATYPE(CdEntryEditor::CdDraft)
Q_DECLARE_METATYPE(QList<CdEntryEditor::CdDraft>)
Q_DECLARE_METATYPE(CdEntryEditor::ValidationResult)
Q_DECLARE_METATYPE(QList<CdEntryEditor::ValidationResult>)
Q_DECLARE_METATYPE(CdEntryEditor::SaveResult)
Q_DECLARE_METATYPE(QList<CdEntryEditor::SaveResult>)
