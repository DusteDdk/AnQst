cmake_minimum_required(VERSION 3.21)
project(AnQstExampleQtApp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

find_package(Qt5 REQUIRED COMPONENTS Core Widgets)

set(ANQSTWEBBASE_BUILD_TESTS OFF CACHE BOOL "Build AnQstWebBase unit tests" FORCE)

add_subdirectory(
    "${CMAKE_CURRENT_SOURCE_DIR}/../../AnQstWidget/AnQstWebBase"
    "${CMAKE_CURRENT_BINARY_DIR}/anqstwebbase"
)

set(CDEDITOR_WIDGET_INTEGRATION_DIR "${CMAKE_CURRENT_SOURCE_DIR}/lib/widgets/CdEntryEditor/AnQst/generated/backend/cpp/cmake")
if(NOT EXISTS "${CDEDITOR_WIDGET_INTEGRATION_DIR}/CMakeLists.txt")
    message(FATAL_ERROR
        "Missing ${CDEDITOR_WIDGET_INTEGRATION_DIR}/CMakeLists.txt. "
        "Generate CdEntryEditor first."
    )
endif()
add_subdirectory("${CDEDITOR_WIDGET_INTEGRATION_DIR}" "${CMAKE_CURRENT_BINARY_DIR}/cdentryeditor-integration")


add_executable(example_qt_app
    main.cpp
    MainWindow.cpp
    MainWindow.h
    MainWindow.ui
    DraggableCdListWidget.cpp
    DraggableCdListWidget.h
)

target_include_directories(example_qt_app
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/lib/widgets/CdEntryEditor/AnQst/generated/backend/cpp/qt/CdEntryEditor_widget
)

target_link_libraries(example_qt_app
    PRIVATE
        CdEntryEditorWidget
)
