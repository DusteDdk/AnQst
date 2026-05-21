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
option(ANQSTWEBBASE_USE_WEBENGINE "Build embedded WebEngine support in AnQstWebBase" ON)

list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")
include(AnQstQt)

include("${CMAKE_CURRENT_SOURCE_DIR}/AnQstWebBaseAbi.cmake" OPTIONAL)
if(NOT DEFINED ANQST_WEBBASE_ABI_HASH_STAMP OR ANQST_WEBBASE_ABI_HASH_STAMP STREQUAL "_local_0")
    string(TIMESTAMP ANQST_WEBBASE_LOCAL_EPOCH "%s")
    set(ANQST_WEBBASE_ABI_HASH_STAMP "_local_${ANQST_WEBBASE_LOCAL_EPOCH}")
endif()
set(ANQST_WEBBASE_TARGET "anqstwebhost${ANQST_WEBBASE_ABI_HASH_STAMP}")
configure_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/src/AnQstWebBaseAbi.h.in"
    "${CMAKE_CURRENT_BINARY_DIR}/generated/AnQstWebBaseAbi.h"
    @ONLY
)

anqst_find_qt_components(Core Widgets Network WebChannel)
if(ANQSTWEBBASE_USE_WEBENGINE)
    anqst_find_qt_components(WebEngineWidgets)
endif()

set(ANQST_QT_CORE_TARGET "Qt${ANQST_QT_MAJOR_VERSION}::Core")
if(WIN32)
    get_target_property(ANQST_QT_CORE_DLL_RELEASE ${ANQST_QT_CORE_TARGET} IMPORTED_LOCATION_RELEASE)
    if(NOT ANQST_QT_CORE_DLL_RELEASE)
        get_target_property(ANQST_QT_CORE_DLL_RELEASE ${ANQST_QT_CORE_TARGET} IMPORTED_LOCATION)
    endif()
    if(ANQST_QT_CORE_DLL_RELEASE)
        get_filename_component(ANQST_QT_BIN_DIR "${ANQST_QT_CORE_DLL_RELEASE}" DIRECTORY)
    endif()
endif()
find_program(WINDEPLOYQT_EXECUTABLE windeployqt HINTS "${ANQST_QT_BIN_DIR}")

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

if(NOT TARGET ${ANQST_WEBBASE_TARGET})
    add_library(${ANQST_WEBBASE_TARGET} STATIC
        src/AnQstBase93.cpp
        src/AnQstBase93.h
        src/AnQstBridgeProxy.cpp
        src/AnQstBridgeProxy.h
        src/AnQstWidgetDebugDialog.cpp
        src/AnQstWidgetDebugDialog.h
        src/AnQstWebHostBase.cpp
        src/AnQstWebHostBase.h
        src/AnQstHostBridgeFacade.cpp
        src/AnQstHostBridgeFacade.h
        src/AngularHttpBaseServer.cpp
        src/AngularHttpBaseServer.h
        src/UI/AnQstWidgetDebugDialog.ui
        "${CMAKE_CURRENT_BINARY_DIR}/generated/AnQstWebBaseAbi.h"
    )
    set_target_properties(${ANQST_WEBBASE_TARGET} PROPERTIES
        AUTOUIC_SEARCH_PATHS "${CMAKE_CURRENT_SOURCE_DIR}/src/UI"
    )

    target_link_libraries(${ANQST_WEBBASE_TARGET}
        PUBLIC
            Qt${ANQST_QT_MAJOR_VERSION}::Core
            Qt${ANQST_QT_MAJOR_VERSION}::Widgets
            Qt${ANQST_QT_MAJOR_VERSION}::Network
            Qt${ANQST_QT_MAJOR_VERSION}::WebChannel
    )
    if(ANQSTWEBBASE_USE_WEBENGINE)
        target_link_libraries(${ANQST_WEBBASE_TARGET}
            PUBLIC
                Qt${ANQST_QT_MAJOR_VERSION}::WebEngineWidgets
        )
        target_compile_definitions(${ANQST_WEBBASE_TARGET} PUBLIC ANQSTWEBBASE_USE_WEBENGINE=1)
        set_target_properties(${ANQST_WEBBASE_TARGET} PROPERTIES ANQSTWEBBASE_USE_WEBENGINE ON)
    else()
        target_compile_definitions(${ANQST_WEBBASE_TARGET} PUBLIC ANQSTWEBBASE_USE_WEBENGINE=0)
        set_target_properties(${ANQST_WEBBASE_TARGET} PROPERTIES ANQSTWEBBASE_USE_WEBENGINE OFF)
    endif()

    target_include_directories(${ANQST_WEBBASE_TARGET}
        PUBLIC
            "${CMAKE_CURRENT_BINARY_DIR}/generated"
            ${CMAKE_CURRENT_SOURCE_DIR}/src
    )
endif()

if(NOT TARGET anqstwebhost)
    add_library(anqstwebhost ALIAS ${ANQST_WEBBASE_TARGET})
else()
    get_target_property(ANQST_WEBBASE_EXISTING_ALIAS anqstwebhost ALIASED_TARGET)
    if(NOT ANQST_WEBBASE_EXISTING_ALIAS)
        set(ANQST_WEBBASE_EXISTING_ALIAS "non-alias target anqstwebhost")
    endif()
    if(NOT ANQST_WEBBASE_EXISTING_ALIAS STREQUAL ANQST_WEBBASE_TARGET)
        message(STATUS "${CMAKE_CURRENT_SOURCE_DIR} exports ${ANQST_WEBBASE_TARGET} while shorthand anqstwebhost exports ${ANQST_WEBBASE_EXISTING_ALIAS}")
    endif()
endif()

if(ANQSTWEBBASE_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
