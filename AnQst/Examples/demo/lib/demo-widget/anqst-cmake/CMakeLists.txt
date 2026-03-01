cmake_minimum_required(VERSION 3.21)

set(ANQST_WEBAPP_ROOT "${CMAKE_CURRENT_LIST_DIR}/..")
set(ANQST_GENERATED_CPP_DIR "${ANQST_WEBAPP_ROOT}/generated_output/cpplibrary")
set(ANQST_GENERATED_INCLUDE_DIR "${ANQST_GENERATED_CPP_DIR}/include")

if(TARGET DemoHostWidgetWidget)
    return()
endif()

if(NOT TARGET anqstwebhostbase)
    message(FATAL_ERROR "Target 'anqstwebhostbase' must exist before including anqst-cmake for DemoHostWidget.")
endif()

find_package(Qt5 REQUIRED COMPONENTS Core Widgets)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

find_program(ANQST_NPM_EXECUTABLE npm REQUIRED)

add_custom_command(
    OUTPUT
        "${ANQST_GENERATED_CPP_DIR}/CMakeLists.txt"
        "${ANQST_GENERATED_CPP_DIR}/DemoHostWidget.qrc"
        "${ANQST_GENERATED_CPP_DIR}/DemoHostWidget.cpp"
        "${ANQST_GENERATED_INCLUDE_DIR}/DemoHostWidget.h"
        "${ANQST_GENERATED_INCLUDE_DIR}/DemoHostWidgetTypes.h"
        "${ANQST_GENERATED_CPP_DIR}/webapp/index.html"
    COMMAND "${ANQST_NPM_EXECUTABLE}" install
    COMMAND "${ANQST_NPM_EXECUTABLE}" run anqst:build
    WORKING_DIRECTORY "${ANQST_WEBAPP_ROOT}"
    COMMENT "Generating AnQst widget library (DemoHostWidgetWidget) from Angular project"
    VERBATIM
)

add_custom_target(DemoHostWidgetWidget_anqst_codegen
    DEPENDS
        "${ANQST_GENERATED_CPP_DIR}/CMakeLists.txt"
        "${ANQST_GENERATED_CPP_DIR}/DemoHostWidget.qrc"
        "${ANQST_GENERATED_CPP_DIR}/DemoHostWidget.cpp"
        "${ANQST_GENERATED_INCLUDE_DIR}/DemoHostWidget.h"
        "${ANQST_GENERATED_INCLUDE_DIR}/DemoHostWidgetTypes.h"
        "${ANQST_GENERATED_CPP_DIR}/webapp/index.html"
)

set_source_files_properties(
    "${ANQST_GENERATED_CPP_DIR}/DemoHostWidget.qrc"
    "${ANQST_GENERATED_CPP_DIR}/DemoHostWidget.cpp"
    "${ANQST_GENERATED_INCLUDE_DIR}/DemoHostWidget.h"
    "${ANQST_GENERATED_INCLUDE_DIR}/DemoHostWidgetTypes.h"
    PROPERTIES GENERATED TRUE
)

add_library(DemoHostWidgetWidget
    "${ANQST_GENERATED_CPP_DIR}/DemoHostWidget.qrc"
    "${ANQST_GENERATED_CPP_DIR}/DemoHostWidget.cpp"
    "${ANQST_GENERATED_INCLUDE_DIR}/DemoHostWidget.h"
    "${ANQST_GENERATED_INCLUDE_DIR}/DemoHostWidgetTypes.h"
)
add_dependencies(DemoHostWidgetWidget DemoHostWidgetWidget_anqst_codegen)
target_include_directories(DemoHostWidgetWidget
    PUBLIC
        "${ANQST_GENERATED_INCLUDE_DIR}"
)
target_link_libraries(DemoHostWidgetWidget
    PUBLIC
        anqstwebhostbase
)
