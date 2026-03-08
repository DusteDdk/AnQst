# Built by AnQst 94b2aeb_dirty_build_6
cmake_minimum_required(VERSION 3.21)
project(CdEntryEditorDesignerPlugin LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

set(ANQST_WEBAPP_ROOT "${CMAKE_CURRENT_LIST_DIR}/../..")
set(ANQST_WIDGET_DIR "${ANQST_WEBAPP_ROOT}/generated_output/CdEntryEditor_QtWidget")
set(ANQST_WEBBASE_DIR "" CACHE PATH "Path to AnQstWebBase source directory")

if(NOT EXISTS "${ANQST_WIDGET_DIR}/CMakeLists.txt")
    message(FATAL_ERROR "Missing generated widget CMake project at ${ANQST_WIDGET_DIR}. Run 'anqst build' first.")
endif()

if(NOT ANQST_WEBBASE_DIR)
    foreach(candidate
        "${ANQST_WEBAPP_ROOT}/AnQstWidget/AnQstWebBase"
        "${ANQST_WEBAPP_ROOT}/../AnQstWidget/AnQstWebBase"
        "${ANQST_WEBAPP_ROOT}/../../AnQstWidget/AnQstWebBase"
        "${ANQST_WEBAPP_ROOT}/../../../AnQstWidget/AnQstWebBase")
        if(EXISTS "${candidate}/CMakeLists.txt")
            set(ANQST_WEBBASE_DIR "${candidate}")
            break()
        endif()
    endforeach()
endif()

if(NOT ANQST_WEBBASE_DIR OR NOT EXISTS "${ANQST_WEBBASE_DIR}/CMakeLists.txt")
    message(FATAL_ERROR "Unable to locate AnQstWebBase sources. Set -DANQST_WEBBASE_DIR=<path/to/AnQstWidget/AnQstWebBase>.")
endif()

find_package(Qt5 REQUIRED COMPONENTS Core Widgets UiPlugin)

set(ANQSTWEBBASE_BUILD_TESTS OFF CACHE BOOL "Build AnQstWebBase unit tests" FORCE)
if(NOT TARGET anqstwebhostbase)
    add_subdirectory("${ANQST_WEBBASE_DIR}" "${CMAKE_CURRENT_BINARY_DIR}/anqstwebbase")
endif()

if(NOT TARGET CdEntryEditorWidget)
    add_subdirectory("${ANQST_WIDGET_DIR}" "${CMAKE_CURRENT_BINARY_DIR}/generated-widget")
endif()

add_library(CdEntryEditorDesignerPlugin MODULE
    "${CMAKE_CURRENT_LIST_DIR}/CdEntryEditorDesignerPlugin.cpp"
    "${CMAKE_CURRENT_LIST_DIR}/designerplugin.qrc"
)
target_include_directories(CdEntryEditorDesignerPlugin
    PRIVATE
        "${ANQST_WIDGET_DIR}"
        "${ANQST_WIDGET_DIR}/include"
)
target_link_libraries(CdEntryEditorDesignerPlugin
    PRIVATE
        CdEntryEditorWidget
        Qt5::Core
        Qt5::Widgets
        Qt5::UiPlugin
)
set_target_properties(CdEntryEditorDesignerPlugin PROPERTIES
    PREFIX ""
)
