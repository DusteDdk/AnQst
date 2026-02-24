cmake_minimum_required(VERSION 3.21)
project(AnQstWebBase VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG "${CMAKE_BINARY_DIR}/bin")
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE "${CMAKE_BINARY_DIR}/bin")
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELWITHDEBINFO "${CMAKE_BINARY_DIR}/bin")
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_MINSIZEREL "${CMAKE_BINARY_DIR}/bin")

option(ANQSTWEBBASE_BUILD_TESTS "Build AnQstWebBase unit tests" ON)

find_package(Qt5 REQUIRED COMPONENTS Core Widgets Network WebEngineWidgets WebChannel)

get_target_property(QT5_CORE_DLL_RELEASE Qt5::Core IMPORTED_LOCATION_RELEASE)
if(NOT QT5_CORE_DLL_RELEASE)
    get_target_property(QT5_CORE_DLL_RELEASE Qt5::Core IMPORTED_LOCATION)
endif()
get_filename_component(QT5_BIN_DIR "${QT5_CORE_DLL_RELEASE}" DIRECTORY)
find_program(WINDEPLOYQT_EXECUTABLE windeployqt HINTS "${QT5_BIN_DIR}")

function(anqst_configure_qt_runtime target_name)
    set_target_properties(${target_name} PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_RUNTIME_OUTPUT_DIRECTORY}"
        RUNTIME_OUTPUT_DIRECTORY_DEBUG "${CMAKE_RUNTIME_OUTPUT_DIRECTORY_DEBUG}"
        RUNTIME_OUTPUT_DIRECTORY_RELEASE "${CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELEASE}"
        RUNTIME_OUTPUT_DIRECTORY_RELWITHDEBINFO "${CMAKE_RUNTIME_OUTPUT_DIRECTORY_RELWITHDEBINFO}"
        RUNTIME_OUTPUT_DIRECTORY_MINSIZEREL "${CMAKE_RUNTIME_OUTPUT_DIRECTORY_MINSIZEREL}"
    )

    if(WIN32 AND WINDEPLOYQT_EXECUTABLE)
        add_custom_command(
            TARGET ${target_name}
            POST_BUILD
            COMMAND "${WINDEPLOYQT_EXECUTABLE}"
                --no-translations
                --no-compiler-runtime
                --no-opengl-sw
                --release
                --dir "$<TARGET_FILE_DIR:${target_name}>"
                "$<TARGET_FILE:${target_name}>"
            COMMENT "Deploying Qt runtime files for ${target_name}"
            VERBATIM
        )
    endif()
endfunction()

add_library(anqstwebhostbase STATIC
    src/AnQstBridgeProxy.cpp
    src/AnQstBridgeProxy.h
    src/AnQstWebHostBase.cpp
    src/AnQstWebHostBase.h
    src/AnQstHostBridgeFacade.cpp
    src/AnQstHostBridgeFacade.h
    src/AngularHttpBaseServer.cpp
    src/AngularHttpBaseServer.h
)

target_link_libraries(anqstwebhostbase
    PUBLIC
        Qt5::Core
        Qt5::Widgets
        Qt5::Network
        Qt5::WebEngineWidgets
        Qt5::WebChannel
)

target_include_directories(anqstwebhostbase
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

if(ANQSTWEBBASE_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
