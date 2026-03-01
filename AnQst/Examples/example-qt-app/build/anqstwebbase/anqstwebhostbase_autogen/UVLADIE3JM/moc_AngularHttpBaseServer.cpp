/****************************************************************************
** Meta object code from reading C++ file 'AngularHttpBaseServer.h'
**
** Created by: The Qt Meta Object Compiler version 67 (Qt 5.15.13)
**
** WARNING! All changes made in this file will be lost!
*****************************************************************************/

#include <memory>
#include "../../../../../../AnQstWidget/AnQstWebBase/src/AngularHttpBaseServer.h"
#include <QtCore/qbytearray.h>
#include <QtCore/qmetatype.h>
#if !defined(Q_MOC_OUTPUT_REVISION)
#error "The header file 'AngularHttpBaseServer.h' doesn't include <QObject>."
#elif Q_MOC_OUTPUT_REVISION != 67
#error "This file was generated using the moc from 5.15.13. It"
#error "cannot be used with the include files from this version of Qt."
#error "(The moc has changed too much.)"
#endif

QT_BEGIN_MOC_NAMESPACE
QT_WARNING_PUSH
QT_WARNING_DISABLE_DEPRECATED
struct qt_meta_stringdata_AngularHttpBaseServer_t {
    QByteArrayData data[11];
    char stringdata0[115];
};
#define QT_MOC_LITERAL(idx, ofs, len) \
    Q_STATIC_BYTE_ARRAY_DATA_HEADER_INITIALIZER_WITH_OFFSET(len, \
    qptrdiff(offsetof(qt_meta_stringdata_AngularHttpBaseServer_t, stringdata0) + ofs \
        - idx * sizeof(QByteArrayData)) \
    )
static const qt_meta_stringdata_AngularHttpBaseServer_t qt_meta_stringdata_AngularHttpBaseServer = {
    {
QT_MOC_LITERAL(0, 0, 21), // "AngularHttpBaseServer"
QT_MOC_LITERAL(1, 22, 11), // "serverError"
QT_MOC_LITERAL(2, 34, 0), // ""
QT_MOC_LITERAL(3, 35, 7), // "payload"
QT_MOC_LITERAL(4, 43, 14), // "clientAttached"
QT_MOC_LITERAL(5, 58, 4), // "peer"
QT_MOC_LITERAL(6, 63, 14), // "clientDetached"
QT_MOC_LITERAL(7, 78, 15), // "ContentRootMode"
QT_MOC_LITERAL(8, 94, 5), // "Unset"
QT_MOC_LITERAL(9, 100, 3), // "Qrc"
QT_MOC_LITERAL(10, 104, 10) // "Filesystem"

    },
    "AngularHttpBaseServer\0serverError\0\0"
    "payload\0clientAttached\0peer\0clientDetached\0"
    "ContentRootMode\0Unset\0Qrc\0Filesystem"
};
#undef QT_MOC_LITERAL

static const uint qt_meta_data_AngularHttpBaseServer[] = {

 // content:
       8,       // revision
       0,       // classname
       0,    0, // classinfo
       3,   14, // methods
       0,    0, // properties
       1,   36, // enums/sets
       0,    0, // constructors
       0,       // flags
       3,       // signalCount

 // signals: name, argc, parameters, tag, flags
       1,    1,   29,    2, 0x06 /* Public */,
       4,    1,   32,    2, 0x06 /* Public */,
       6,    0,   35,    2, 0x06 /* Public */,

 // signals: parameters
    QMetaType::Void, QMetaType::QVariantMap,    3,
    QMetaType::Void, QMetaType::QString,    5,
    QMetaType::Void,

 // enums: name, alias, flags, count, data
       7,    7, 0x2,    3,   41,

 // enum data: key, value
       8, uint(AngularHttpBaseServer::ContentRootMode::Unset),
       9, uint(AngularHttpBaseServer::ContentRootMode::Qrc),
      10, uint(AngularHttpBaseServer::ContentRootMode::Filesystem),

       0        // eod
};

void AngularHttpBaseServer::qt_static_metacall(QObject *_o, QMetaObject::Call _c, int _id, void **_a)
{
    if (_c == QMetaObject::InvokeMetaMethod) {
        auto *_t = static_cast<AngularHttpBaseServer *>(_o);
        (void)_t;
        switch (_id) {
        case 0: _t->serverError((*reinterpret_cast< const QVariantMap(*)>(_a[1]))); break;
        case 1: _t->clientAttached((*reinterpret_cast< const QString(*)>(_a[1]))); break;
        case 2: _t->clientDetached(); break;
        default: ;
        }
    } else if (_c == QMetaObject::IndexOfMethod) {
        int *result = reinterpret_cast<int *>(_a[0]);
        {
            using _t = void (AngularHttpBaseServer::*)(const QVariantMap & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&AngularHttpBaseServer::serverError)) {
                *result = 0;
                return;
            }
        }
        {
            using _t = void (AngularHttpBaseServer::*)(const QString & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&AngularHttpBaseServer::clientAttached)) {
                *result = 1;
                return;
            }
        }
        {
            using _t = void (AngularHttpBaseServer::*)();
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&AngularHttpBaseServer::clientDetached)) {
                *result = 2;
                return;
            }
        }
    }
}

QT_INIT_METAOBJECT const QMetaObject AngularHttpBaseServer::staticMetaObject = { {
    QMetaObject::SuperData::link<QObject::staticMetaObject>(),
    qt_meta_stringdata_AngularHttpBaseServer.data,
    qt_meta_data_AngularHttpBaseServer,
    qt_static_metacall,
    nullptr,
    nullptr
} };


const QMetaObject *AngularHttpBaseServer::metaObject() const
{
    return QObject::d_ptr->metaObject ? QObject::d_ptr->dynamicMetaObject() : &staticMetaObject;
}

void *AngularHttpBaseServer::qt_metacast(const char *_clname)
{
    if (!_clname) return nullptr;
    if (!strcmp(_clname, qt_meta_stringdata_AngularHttpBaseServer.stringdata0))
        return static_cast<void*>(this);
    return QObject::qt_metacast(_clname);
}

int AngularHttpBaseServer::qt_metacall(QMetaObject::Call _c, int _id, void **_a)
{
    _id = QObject::qt_metacall(_c, _id, _a);
    if (_id < 0)
        return _id;
    if (_c == QMetaObject::InvokeMetaMethod) {
        if (_id < 3)
            qt_static_metacall(this, _c, _id, _a);
        _id -= 3;
    } else if (_c == QMetaObject::RegisterMethodArgumentMetaType) {
        if (_id < 3)
            *reinterpret_cast<int*>(_a[0]) = -1;
        _id -= 3;
    }
    return _id;
}

// SIGNAL 0
void AngularHttpBaseServer::serverError(const QVariantMap & _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 0, _a);
}

// SIGNAL 1
void AngularHttpBaseServer::clientAttached(const QString & _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 1, _a);
}

// SIGNAL 2
void AngularHttpBaseServer::clientDetached()
{
    QMetaObject::activate(this, &staticMetaObject, 2, nullptr);
}
QT_WARNING_POP
QT_END_MOC_NAMESPACE
