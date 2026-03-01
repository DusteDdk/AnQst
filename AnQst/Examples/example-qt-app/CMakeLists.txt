cmake_minimum_required(VERSION 3.21)
project(AnQstExampleQtApp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

find_package(Qt5 REQUIRED COMPONENTS Core Widgets)

set(ANQSTWEBBASE_BUILD_TESTS OFF CACHE BOOL "Build AnQstWebBase unit tests" FORCE)
if(NOT TARGET anqstwebhostbase)
    add_subdirectory(
        "${CMAKE_CURRENT_SOURCE_DIR}/../../AnQstWidget/AnQstWebBase"
        "${CMAKE_CURRENT_BINARY_DIR}/anqstwebbase"
    )
endif()

set(ANQST_WIDGET_INTEGRATION_DIR "${CMAKE_CURRENT_SOURCE_DIR}/lib/widgets/CdEntryEditor/anqst-cmake")
if(NOT EXISTS "${ANQST_WIDGET_INTEGRATION_DIR}/CMakeLists.txt")
    message(FATAL_ERROR
        "Missing ${ANQST_WIDGET_INTEGRATION_DIR}/CMakeLists.txt. "
        "Generate CdEntryEditor first."
    )
endif()
add_subdirectory("${ANQST_WIDGET_INTEGRATION_DIR}" "${CMAKE_CURRENT_BINARY_DIR}/cdentryeditor-integration")

add_executable(example_qt_app
    main.cpp
    MainWindow.cpp
    MainWindow.h
    MainWindow.ui
)

target_link_libraries(example_qt_app
    PRIVATE
        CdEntryEditorWidget
)

if(COMMAND anqst_configure_qt_runtime)
    anqst_configure_qt_runtime(example_qt_app)
endif()
