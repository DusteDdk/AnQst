
find_package(Qt5 REQUIRED COMPONENTS Core Widgets)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

set(ANQSTWEBBASE_DEMO_WEBAPP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/lib/demo-widget")
set(ANQSTWEBBASE_DEMO_INTEGRATION_DIR "${ANQSTWEBBASE_DEMO_WEBAPP_DIR}/anqst-cmake")

if(NOT EXISTS "${ANQSTWEBBASE_DEMO_INTEGRATION_DIR}/CMakeLists.txt")
    message(FATAL_ERROR "Missing ${ANQSTWEBBASE_DEMO_INTEGRATION_DIR}/CMakeLists.txt. Run 'npm run anqst:build' in ${ANQSTWEBBASE_DEMO_WEBAPP_DIR} first.")
endif()

add_subdirectory("${ANQSTWEBBASE_DEMO_INTEGRATION_DIR}" "${CMAKE_CURRENT_BINARY_DIR}/demo-widget-integration")

add_executable(anqstwebhostbase_demo
    main.cpp
    DemoMainWindow.ui
)

target_link_libraries(anqstwebhostbase_demo
    PRIVATE
        DemoHostWidgetWidget
)

anqst_configure_qt_runtime(anqstwebhostbase_demo)
