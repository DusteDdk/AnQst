cmake_minimum_required(VERSION 3.21)
project(AnQstExamples LANGUAGES CXX)

# Ensure Qt package/version context is available in this directory scope and
# all subdirectories (required for AUTOUIC/AUTORCC in demo targets).
find_package(Qt5 REQUIRED COMPONENTS Core Widgets Network WebEngineWidgets WebChannel)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

# Pull in the base host library from AnQstWidget.
set(ANQSTWEBBASE_BUILD_TESTS OFF CACHE BOOL "Build AnQstWebBase unit tests" FORCE)

add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../AnQstWidget/AnQstWebBase" "${CMAKE_CURRENT_BINARY_DIR}/anqstwebbase")

add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/demo" "${CMAKE_CURRENT_BINARY_DIR}/demo")
