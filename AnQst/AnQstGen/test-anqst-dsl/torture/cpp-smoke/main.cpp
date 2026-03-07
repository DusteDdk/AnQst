#include <QApplication>
#include <QMainWindow>

#include "TortureWidget.h"

int main(int argc, char* argv[]) {
    QApplication app(argc, argv);

    QMainWindow window;
    auto* widget = new TortureWidget::TortureWidget(&window);
    window.setCentralWidget(widget);
    window.resize(900, 600);
    window.show();

    return app.exec();
}
