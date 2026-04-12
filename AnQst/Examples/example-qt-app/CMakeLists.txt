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

set(VANILLAJS_WIDGET_INTEGRATION_DIR "${CMAKE_CURRENT_SOURCE_DIR}/lib/widgets/VanillaJsWidget/AnQst/generated/backend/cpp/cmake")
if(NOT EXISTS "${VANILLAJS_WIDGET_INTEGRATION_DIR}/CMakeLists.txt")
    message(FATAL_ERROR
        "Missing ${VANILLAJS_WIDGET_INTEGRATION_DIR}/CMakeLists.txt. "
        "Run 'npx anqst build' in lib/widgets/VanillaJsWidget (before VanillaTsWidget)."
    )
endif()
add_subdirectory("${VANILLAJS_WIDGET_INTEGRATION_DIR}" "${CMAKE_CURRENT_BINARY_DIR}/vanillajswidget-integration")

set(VANILLATS_WIDGET_INTEGRATION_DIR "${CMAKE_CURRENT_SOURCE_DIR}/lib/widgets/VanillaTsWidget/AnQst/generated/backend/cpp/cmake")
if(NOT EXISTS "${VANILLATS_WIDGET_INTEGRATION_DIR}/CMakeLists.txt")
    message(FATAL_ERROR
        "Missing ${VANILLATS_WIDGET_INTEGRATION_DIR}/CMakeLists.txt. "
        "Run lib/widgets/build-vanilla-widgets.sh or 'npx anqst build' in VanillaTsWidget after VanillaJsWidget."
    )
endif()
add_subdirectory("${VANILLATS_WIDGET_INTEGRATION_DIR}" "${CMAKE_CURRENT_BINARY_DIR}/vanillatswidget-integration")


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
        ${CMAKE_CURRENT_SOURCE_DIR}/lib/widgets/VanillaJsWidget/AnQst/generated/backend/cpp/qt/VanillaJsWidget_widget/include
        ${CMAKE_CURRENT_SOURCE_DIR}/lib/widgets/VanillaTsWidget/AnQst/generated/backend/cpp/qt/VanillaTsWidget_widget/include
)

target_link_libraries(example_qt_app
    PRIVATE
        CdEntryEditorWidget
        VanillaJsWidgetWidget
        VanillaTsWidgetWidget
)

include(CTest)
add_test(
    NAME example_qt_app_headless_smoke
    COMMAND bash "${CMAKE_CURRENT_SOURCE_DIR}/headless_smoke.sh" "$<TARGET_FILE:example_qt_app>"
)
set_tests_properties(example_qt_app_headless_smoke PROPERTIES
    ENVIRONMENT "QTWEBENGINE_DISABLE_SANDBOX=1;QT_QPA_PLATFORM=offscreen;QTWEBENGINE_CHROMIUM_FLAGS=--no-sandbox"
)
