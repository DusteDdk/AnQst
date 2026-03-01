cmake_minimum_required(VERSION 3.21)
project(CdEntryEditorLibrary LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

if(NOT TARGET anqstwebhostbase)
    message(FATAL_ERROR "Target 'anqstwebhostbase' is required before adding generated widget library CdEntryEditorWidget.")
endif()

add_library(CdEntryEditorWidget
    CdEntryEditor.cpp
    CdEntryEditor.qrc
    include/CdEntryEditor.h
    include/CdEntryEditorTypes.h
)
target_include_directories(CdEntryEditorWidget
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)
target_link_libraries(CdEntryEditorWidget
    PUBLIC
        anqstwebhostbase
)

# Uses transitive Qt and include requirements from anqstwebhostbase.
