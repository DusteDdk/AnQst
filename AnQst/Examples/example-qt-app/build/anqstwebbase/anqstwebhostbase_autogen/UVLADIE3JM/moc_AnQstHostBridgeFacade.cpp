/****************************************************************************
** Meta object code from reading C++ file 'AnQstHostBridgeFacade.h'
**
** Created by: The Qt Meta Object Compiler version 67 (Qt 5.15.13)
**
** WARNING! All changes made in this file will be lost!
*****************************************************************************/

#include <memory>
#include "../../../../../../AnQstWidget/AnQstWebBase/src/AnQstHostBridgeFacade.h"
#include <QtCore/qbytearray.h>
#include <QtCore/qmetatype.h>
#if !defined(Q_MOC_OUTPUT_REVISION)
#error "The header file 'AnQstHostBridgeFacade.h' doesn't include <QObject>."
#elif Q_MOC_OUTPUT_REVISION != 67
#error "This file was generated using the moc from 5.15.13. It"
#error "cannot be used with the include files from this version of Qt."
#error "(The moc has changed too much.)"
#endif

QT_BEGIN_MOC_NAMESPACE
QT_WARNING_PUSH
QT_WARNING_DISABLE_DEPRECATED
struct qt_meta_stringdata_AnQstHostBridgeFacade_t {
    QByteArrayData data[12];
    char stringdata0[161];
};
#define QT_MOC_LITERAL(idx, ofs, len) \
    Q_STATIC_BYTE_ARRAY_DATA_HEADER_INITIALIZER_WITH_OFFSET(len, \
    qptrdiff(offsetof(qt_meta_stringdata_AnQstHostBridgeFacade_t, stringdata0) + ofs \
        - idx * sizeof(QByteArrayData)) \
    )
static const qt_meta_stringdata_AnQstHostBridgeFacade_t qt_meta_stringdata_AnQstHostBridgeFacade = {
    {
QT_MOC_LITERAL(0, 0, 21), // "AnQstHostBridgeFacade"
QT_MOC_LITERAL(1, 22, 19), // "bridgeOutputUpdated"
QT_MOC_LITERAL(2, 42, 0), // ""
QT_MOC_LITERAL(3, 43, 7), // "service"
QT_MOC_LITERAL(4, 51, 6), // "member"
QT_MOC_LITERAL(5, 58, 5), // "value"
QT_MOC_LITERAL(6, 64, 29), // "bridgeSlotInvocationRequested"
QT_MOC_LITERAL(7, 94, 9), // "requestId"
QT_MOC_LITERAL(8, 104, 4), // "args"
QT_MOC_LITERAL(9, 109, 15), // "bridgeHostError"
QT_MOC_LITERAL(10, 125, 12), // "errorPayload"
QT_MOC_LITERAL(11, 138, 22) // "slotInvocationResolved"

    },
    "AnQstHostBridgeFacade\0bridgeOutputUpdated\0"
    "\0service\0member\0value\0"
    "bridgeSlotInvocationRequested\0requestId\0"
    "args\0bridgeHostError\0errorPayload\0"
    "slotInvocationResolved"
};
#undef QT_MOC_LITERAL

static const uint qt_meta_data_AnQstHostBridgeFacade[] = {

 // content:
       8,       // revision
       0,       // classname
       0,    0, // classinfo
       4,   14, // methods
       0,    0, // properties
       0,    0, // enums/sets
       0,    0, // constructors
       0,       // flags
       4,       // signalCount

 // signals: name, argc, parameters, tag, flags
       1,    3,   34,    2, 0x06 /* Public */,
       6,    4,   41,    2, 0x06 /* Public */,
       9,    1,   50,    2, 0x06 /* Public */,
      11,    1,   53,    2, 0x06 /* Public */,

 // signals: parameters
    QMetaType::Void, QMetaType::QString, QMetaType::QString, QMetaType::QVariant,    3,    4,    5,
    QMetaType::Void, QMetaType::QString, QMetaType::QString, QMetaType::QString, QMetaType::QVariantList,    7,    3,    4,    8,
    QMetaType::Void, QMetaType::QVariantMap,   10,
    QMetaType::Void, QMetaType::QString,    7,

       0        // eod
};

void AnQstHostBridgeFacade::qt_static_metacall(QObject *_o, QMetaObject::Call _c, int _id, void **_a)
{
    if (_c == QMetaObject::InvokeMetaMethod) {
        auto *_t = static_cast<AnQstHostBridgeFacade *>(_o);
        (void)_t;
        switch (_id) {
        case 0: _t->bridgeOutputUpdated((*reinterpret_cast< const QString(*)>(_a[1])),(*reinterpret_cast< const QString(*)>(_a[2])),(*reinterpret_cast< const QVariant(*)>(_a[3]))); break;
        case 1: _t->bridgeSlotInvocationRequested((*reinterpret_cast< const QString(*)>(_a[1])),(*reinterpret_cast< const QString(*)>(_a[2])),(*reinterpret_cast< const QString(*)>(_a[3])),(*reinterpret_cast< const QVariantList(*)>(_a[4]))); break;
        case 2: _t->bridgeHostError((*reinterpret_cast< const QVariantMap(*)>(_a[1]))); break;
        case 3: _t->slotInvocationResolved((*reinterpret_cast< const QString(*)>(_a[1]))); break;
        default: ;
        }
    } else if (_c == QMetaObject::IndexOfMethod) {
        int *result = reinterpret_cast<int *>(_a[0]);
        {
            using _t = void (AnQstHostBridgeFacade::*)(const QString & , const QString & , const QVariant & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&AnQstHostBridgeFacade::bridgeOutputUpdated)) {
                *result = 0;
                return;
            }
        }
        {
            using _t = void (AnQstHostBridgeFacade::*)(const QString & , const QString & , const QString & , const QVariantList & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&AnQstHostBridgeFacade::bridgeSlotInvocationRequested)) {
                *result = 1;
                return;
            }
        }
        {
            using _t = void (AnQstHostBridgeFacade::*)(const QVariantMap & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&AnQstHostBridgeFacade::bridgeHostError)) {
                *result = 2;
                return;
            }
        }
        {
            using _t = void (AnQstHostBridgeFacade::*)(const QString & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&AnQstHostBridgeFacade::slotInvocationResolved)) {
                *result = 3;
                return;
            }
        }
    }
}

QT_INIT_METAOBJECT const QMetaObject AnQstHostBridgeFacade::staticMetaObject = { {
    QMetaObject::SuperData::link<QObject::staticMetaObject>(),
    qt_meta_stringdata_AnQstHostBridgeFacade.data,
    qt_meta_data_AnQstHostBridgeFacade,
    qt_static_metacall,
    nullptr,
    nullptr
} };


const QMetaObject *AnQstHostBridgeFacade::metaObject() const
{
    return QObject::d_ptr->metaObject ? QObject::d_ptr->dynamicMetaObject() : &staticMetaObject;
}

void *AnQstHostBridgeFacade::qt_metacast(const char *_clname)
{
    if (!_clname) return nullptr;
    if (!strcmp(_clname, qt_meta_stringdata_AnQstHostBridgeFacade.stringdata0))
        return static_cast<void*>(this);
    return QObject::qt_metacast(_clname);
}

int AnQstHostBridgeFacade::qt_metacall(QMetaObject::Call _c, int _id, void **_a)
{
    _id = QObject::qt_metacall(_c, _id, _a);
    if (_id < 0)
        return _id;
    if (_c == QMetaObject::InvokeMetaMethod) {
        if (_id < 4)
            qt_static_metacall(this, _c, _id, _a);
        _id -= 4;
    } else if (_c == QMetaObject::RegisterMethodArgumentMetaType) {
        if (_id < 4)
            *reinterpret_cast<int*>(_a[0]) = -1;
        _id -= 4;
    }
    return _id;
}

// SIGNAL 0
void AnQstHostBridgeFacade::bridgeOutputUpdated(const QString & _t1, const QString & _t2, const QVariant & _t3)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))), const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t2))), const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t3))) };
    QMetaObject::activate(this, &staticMetaObject, 0, _a);
}

// SIGNAL 1
void AnQstHostBridgeFacade::bridgeSlotInvocationRequested(const QString & _t1, const QString & _t2, const QString & _t3, const QVariantList & _t4)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))), const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t2))), const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t3))), const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t4))) };
    QMetaObject::activate(this, &staticMetaObject, 1, _a);
}

// SIGNAL 2
void AnQstHostBridgeFacade::bridgeHostError(const QVariantMap & _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 2, _a);
}

// SIGNAL 3
void AnQstHostBridgeFacade::slotInvocationResolved(const QString & _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 3, _a);
}
QT_WARNING_POP
QT_END_MOC_NAMESPACE
