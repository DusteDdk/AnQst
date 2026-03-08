cmake_minimum_required(VERSION 3.21)
project(TortureWidgetSmoke LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

find_package(Qt5 REQUIRED COMPONENTS Core Widgets Network WebEngineWidgets WebChannel)

# Provides anqstwebhostbase target required by generated widget CMake.
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../../../../AnQstWidget/AnQstWebBase" "${CMAKE_CURRENT_BINARY_DIR}/anqstwebbase")

# Uses already-generated widget sources from torture/AnQst/generated.
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../AnQst/generated/backend/cpp/qt/TortureWidget_widget" "${CMAKE_CURRENT_BINARY_DIR}/generated_widget")

add_executable(torture_widget_smoke
    main.cpp
)

target_link_libraries(torture_widget_smoke
    PRIVATE
        TortureWidgetWidget
)
