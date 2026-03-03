#include "MainWindow.h"

#include <QApplication>
#include <QCoreApplication>

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    QCoreApplication::setOrganizationName(QStringLiteral("AnQst"));
    QCoreApplication::setApplicationName(QStringLiteral("ExampleQtCdEntryHost"));
    MainWindow window;
    window.show();
    return app.exec();
}
