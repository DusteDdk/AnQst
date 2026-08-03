cmake_minimum_required(VERSION 3.21)
project(TortureWidgetLibrary LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

if(NOT TARGET anqstwebhost_1.7.7)
    message(FATAL_ERROR "Target 'anqstwebhost_1.7.7' is required before adding generated widget library TortureWidgetWidget.")
endif()
get_target_property(ANQSTWEBBASE_TARGET_USES_WEBENGINE anqstwebhost_1.7.7 ANQSTWEBBASE_USE_WEBENGINE)
if(NOT ANQSTWEBBASE_TARGET_USES_WEBENGINE STREQUAL "ON")
    message(FATAL_ERROR "Target 'anqstwebhost_1.7.7' has incompatible embedded WebEngine mode for generated widget library TortureWidgetWidget.")
endif()

add_library(TortureWidgetWidget
    TortureWidget.cpp
    TortureWidget.qrc
    include/TortureWidget.h
    include/TortureWidgetWidget.h
    include/TortureWidgetTypes.h
)
target_include_directories(TortureWidgetWidget
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)
target_link_libraries(TortureWidgetWidget
    PUBLIC
        anqstwebhost_1.7.7
)

# Uses transitive Qt and include requirements from anqstwebhost_1.7.7.
