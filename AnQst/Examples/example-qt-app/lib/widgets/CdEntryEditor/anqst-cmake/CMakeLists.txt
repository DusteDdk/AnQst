# Built by AnQst 94b2aeb_dirty_build_8
cmake_minimum_required(VERSION 3.21)

set(ANQST_WEBAPP_ROOT "${CMAKE_CURRENT_LIST_DIR}/..")
set(ANQST_GENERATED_CPP_DIR "${ANQST_WEBAPP_ROOT}/generated_output/CdEntryEditor_QtWidget")
set(ANQST_GENERATED_INCLUDE_DIR "${ANQST_GENERATED_CPP_DIR}/include")

if(TARGET CdEntryEditorWidget)
    return()
endif()

if(NOT TARGET anqstwebhostbase)
    message(FATAL_ERROR "Target 'anqstwebhostbase' must exist before including anqst-cmake for CdEntryEditor.")
endif()

find_package(Qt5 REQUIRED COMPONENTS Core Widgets)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

find_program(ANQST_NPM_EXECUTABLE npm REQUIRED)

add_custom_command(
    OUTPUT
        "${ANQST_GENERATED_CPP_DIR}/CMakeLists.txt"
        "${ANQST_GENERATED_CPP_DIR}/CdEntryEditor.qrc"
        "${ANQST_GENERATED_CPP_DIR}/CdEntryEditor.cpp"
        "${ANQST_GENERATED_INCLUDE_DIR}/CdEntryEditor.h"
        "${ANQST_GENERATED_INCLUDE_DIR}/CdEntryEditorTypes.h"
        "${ANQST_GENERATED_CPP_DIR}/webapp/index.html"
    COMMAND "${ANQST_NPM_EXECUTABLE}" install
    COMMAND "${ANQST_NPM_EXECUTABLE}" run anqst:build
    WORKING_DIRECTORY "${ANQST_WEBAPP_ROOT}"
    COMMENT "Generating AnQst widget library (CdEntryEditorWidget) from Angular project"
    VERBATIM
)

add_custom_target(CdEntryEditorWidget_anqst_codegen
    DEPENDS
        "${ANQST_GENERATED_CPP_DIR}/CMakeLists.txt"
        "${ANQST_GENERATED_CPP_DIR}/CdEntryEditor.qrc"
        "${ANQST_GENERATED_CPP_DIR}/CdEntryEditor.cpp"
        "${ANQST_GENERATED_INCLUDE_DIR}/CdEntryEditor.h"
        "${ANQST_GENERATED_INCLUDE_DIR}/CdEntryEditorTypes.h"
        "${ANQST_GENERATED_CPP_DIR}/webapp/index.html"
)

set_source_files_properties(
    "${ANQST_GENERATED_CPP_DIR}/CdEntryEditor.qrc"
    "${ANQST_GENERATED_CPP_DIR}/CdEntryEditor.cpp"
    "${ANQST_GENERATED_INCLUDE_DIR}/CdEntryEditor.h"
    "${ANQST_GENERATED_INCLUDE_DIR}/CdEntryEditorTypes.h"
    PROPERTIES GENERATED TRUE
)

add_library(CdEntryEditorWidget
    "${ANQST_GENERATED_CPP_DIR}/CdEntryEditor.qrc"
    "${ANQST_GENERATED_CPP_DIR}/CdEntryEditor.cpp"
    "${ANQST_GENERATED_INCLUDE_DIR}/CdEntryEditor.h"
    "${ANQST_GENERATED_INCLUDE_DIR}/CdEntryEditorTypes.h"
)
add_dependencies(CdEntryEditorWidget CdEntryEditorWidget_anqst_codegen)
target_include_directories(CdEntryEditorWidget
    PUBLIC
        "${ANQST_GENERATED_INCLUDE_DIR}"
)
target_link_libraries(CdEntryEditorWidget
    PUBLIC
        anqstwebhostbase
)
