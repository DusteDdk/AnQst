/****************************************************************************
** Meta object code from reading C++ file 'AnQstBridgeProxy.h'
**
** Created by: The Qt Meta Object Compiler version 67 (Qt 5.15.13)
**
** WARNING! All changes made in this file will be lost!
*****************************************************************************/

#include <memory>
#include "../../../../../../AnQstWidget/AnQstWebBase/src/AnQstBridgeProxy.h"
#include <QtCore/qbytearray.h>
#include <QtCore/qmetatype.h>
#if !defined(Q_MOC_OUTPUT_REVISION)
#error "The header file 'AnQstBridgeProxy.h' doesn't include <QObject>."
#elif Q_MOC_OUTPUT_REVISION != 67
#error "This file was generated using the moc from 5.15.13. It"
#error "cannot be used with the include files from this version of Qt."
#error "(The moc has changed too much.)"
#endif

QT_BEGIN_MOC_NAMESPACE
QT_WARNING_PUSH
QT_WARNING_DISABLE_DEPRECATED
struct qt_meta_stringdata_AnQstBridgeProxy_t {
    QByteArrayData data[17];
    char stringdata0[237];
};
#define QT_MOC_LITERAL(idx, ofs, len) \
    Q_STATIC_BYTE_ARRAY_DATA_HEADER_INITIALIZER_WITH_OFFSET(len, \
    qptrdiff(offsetof(qt_meta_stringdata_AnQstBridgeProxy_t, stringdata0) + ofs \
        - idx * sizeof(QByteArrayData)) \
    )
static const qt_meta_stringdata_AnQstBridgeProxy_t qt_meta_stringdata_AnQstBridgeProxy = {
    {
QT_MOC_LITERAL(0, 0, 16), // "AnQstBridgeProxy"
QT_MOC_LITERAL(1, 17, 25), // "anQstBridge_outputUpdated"
QT_MOC_LITERAL(2, 43, 0), // ""
QT_MOC_LITERAL(3, 44, 7), // "service"
QT_MOC_LITERAL(4, 52, 6), // "member"
QT_MOC_LITERAL(5, 59, 5), // "value"
QT_MOC_LITERAL(6, 65, 35), // "anQstBridge_slotInvocationReq..."
QT_MOC_LITERAL(7, 101, 9), // "requestId"
QT_MOC_LITERAL(8, 111, 4), // "args"
QT_MOC_LITERAL(9, 116, 24), // "anQstBridge_registerSlot"
QT_MOC_LITERAL(10, 141, 16), // "anQstBridge_call"
QT_MOC_LITERAL(11, 158, 16), // "anQstBridge_emit"
QT_MOC_LITERAL(12, 175, 20), // "anQstBridge_setInput"
QT_MOC_LITERAL(13, 196, 23), // "anQstBridge_resolveSlot"
QT_MOC_LITERAL(14, 220, 2), // "ok"
QT_MOC_LITERAL(15, 223, 7), // "payload"
QT_MOC_LITERAL(16, 231, 5) // "error"

    },
    "AnQstBridgeProxy\0anQstBridge_outputUpdated\0"
    "\0service\0member\0value\0"
    "anQstBridge_slotInvocationRequested\0"
    "requestId\0args\0anQstBridge_registerSlot\0"
    "anQstBridge_call\0anQstBridge_emit\0"
    "anQstBridge_setInput\0anQstBridge_resolveSlot\0"
    "ok\0payload\0error"
};
#undef QT_MOC_LITERAL

static const uint qt_meta_data_AnQstBridgeProxy[] = {

 // content:
       8,       // revision
       0,       // classname
       0,    0, // classinfo
       7,   14, // methods
       0,    0, // properties
       0,    0, // enums/sets
       0,    0, // constructors
       0,       // flags
       2,       // signalCount

 // signals: name, argc, parameters, tag, flags
       1,    3,   49,    2, 0x06 /* Public */,
       6,    4,   56,    2, 0x06 /* Public */,

 // methods: name, argc, parameters, tag, flags
       9,    2,   65,    2, 0x02 /* Public */,
      10,    3,   70,    2, 0x02 /* Public */,
      11,    3,   77,    2, 0x02 /* Public */,
      12,    3,   84,    2, 0x02 /* Public */,
      13,    4,   91,    2, 0x02 /* Public */,

 // signals: parameters
    QMetaType::Void, QMetaType::QString, QMetaType::QString, QMetaType::QVariant,    3,    4,    5,
    QMetaType::Void, QMetaType::QString, QMetaType::QString, QMetaType::QString, QMetaType::QVariantList,    7,    3,    4,    8,

 // methods: parameters
    QMetaType::Void, QMetaType::QString, QMetaType::QString,    3,    4,
    QMetaType::QVariant, QMetaType::QString, QMetaType::QString, QMetaType::QVariantList,    3,    4,    8,
    QMetaType::Void, QMetaType::QString, QMetaType::QString, QMetaType::QVariantList,    3,    4,    8,
    QMetaType::Void, QMetaType::QString, QMetaType::QString, QMetaType::QVariant,    3,    4,    5,
    QMetaType::Void, QMetaType::QString, QMetaType::Bool, QMetaType::QVariant, QMetaType::QString,    7,   14,   15,   16,

       0        // eod
};

void AnQstBridgeProxy::qt_static_metacall(QObject *_o, QMetaObject::Call _c, int _id, void **_a)
{
    if (_c == QMetaObject::InvokeMetaMethod) {
        auto *_t = static_cast<AnQstBridgeProxy *>(_o);
        (void)_t;
        switch (_id) {
        case 0: _t->anQstBridge_outputUpdated((*reinterpret_cast< const QString(*)>(_a[1])),(*reinterpret_cast< const QString(*)>(_a[2])),(*reinterpret_cast< const QVariant(*)>(_a[3]))); break;
        case 1: _t->anQstBridge_slotInvocationRequested((*reinterpret_cast< const QString(*)>(_a[1])),(*reinterpret_cast< const QString(*)>(_a[2])),(*reinterpret_cast< const QString(*)>(_a[3])),(*reinterpret_cast< const QVariantList(*)>(_a[4]))); break;
        case 2: _t->anQstBridge_registerSlot((*reinterpret_cast< const QString(*)>(_a[1])),(*reinterpret_cast< const QString(*)>(_a[2]))); break;
        case 3: { QVariant _r = _t->anQstBridge_call((*reinterpret_cast< const QString(*)>(_a[1])),(*reinterpret_cast< const QString(*)>(_a[2])),(*reinterpret_cast< const QVariantList(*)>(_a[3])));
            if (_a[0]) *reinterpret_cast< QVariant*>(_a[0]) = std::move(_r); }  break;
        case 4: _t->anQstBridge_emit((*reinterpret_cast< const QString(*)>(_a[1])),(*reinterpret_cast< const QString(*)>(_a[2])),(*reinterpret_cast< const QVariantList(*)>(_a[3]))); break;
        case 5: _t->anQstBridge_setInput((*reinterpret_cast< const QString(*)>(_a[1])),(*reinterpret_cast< const QString(*)>(_a[2])),(*reinterpret_cast< const QVariant(*)>(_a[3]))); break;
        case 6: _t->anQstBridge_resolveSlot((*reinterpret_cast< const QString(*)>(_a[1])),(*reinterpret_cast< bool(*)>(_a[2])),(*reinterpret_cast< const QVariant(*)>(_a[3])),(*reinterpret_cast< const QString(*)>(_a[4]))); break;
        default: ;
        }
    } else if (_c == QMetaObject::IndexOfMethod) {
        int *result = reinterpret_cast<int *>(_a[0]);
        {
            using _t = void (AnQstBridgeProxy::*)(const QString & , const QString & , const QVariant & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&AnQstBridgeProxy::anQstBridge_outputUpdated)) {
                *result = 0;
                return;
            }
        }
        {
            using _t = void (AnQstBridgeProxy::*)(const QString & , const QString & , const QString & , const QVariantList & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&AnQstBridgeProxy::anQstBridge_slotInvocationRequested)) {
                *result = 1;
                return;
            }
        }
    }
}

QT_INIT_METAOBJECT const QMetaObject AnQstBridgeProxy::staticMetaObject = { {
    QMetaObject::SuperData::link<QObject::staticMetaObject>(),
    qt_meta_stringdata_AnQstBridgeProxy.data,
    qt_meta_data_AnQstBridgeProxy,
    qt_static_metacall,
    nullptr,
    nullptr
} };


const QMetaObject *AnQstBridgeProxy::metaObject() const
{
    return QObject::d_ptr->metaObject ? QObject::d_ptr->dynamicMetaObject() : &staticMetaObject;
}

void *AnQstBridgeProxy::qt_metacast(const char *_clname)
{
    if (!_clname) return nullptr;
    if (!strcmp(_clname, qt_meta_stringdata_AnQstBridgeProxy.stringdata0))
        return static_cast<void*>(this);
    return QObject::qt_metacast(_clname);
}

int AnQstBridgeProxy::qt_metacall(QMetaObject::Call _c, int _id, void **_a)
{
    _id = QObject::qt_metacall(_c, _id, _a);
    if (_id < 0)
        return _id;
    if (_c == QMetaObject::InvokeMetaMethod) {
        if (_id < 7)
            qt_static_metacall(this, _c, _id, _a);
        _id -= 7;
    } else if (_c == QMetaObject::RegisterMethodArgumentMetaType) {
        if (_id < 7)
            *reinterpret_cast<int*>(_a[0]) = -1;
        _id -= 7;
    }
    return _id;
}

// SIGNAL 0
void AnQstBridgeProxy::anQstBridge_outputUpdated(const QString & _t1, const QString & _t2, const QVariant & _t3)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))), const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t2))), const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t3))) };
    QMetaObject::activate(this, &staticMetaObject, 0, _a);
}

// SIGNAL 1
void AnQstBridgeProxy::anQstBridge_slotInvocationRequested(const QString & _t1, const QString & _t2, const QString & _t3, const QVariantList & _t4)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))), const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t2))), const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t3))), const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t4))) };
    QMetaObject::activate(this, &staticMetaObject, 1, _a);
}
QT_WARNING_POP
QT_END_MOC_NAMESPACE
