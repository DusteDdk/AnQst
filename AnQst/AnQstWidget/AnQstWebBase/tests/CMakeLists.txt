find_package(Catch2 CONFIG REQUIRED)
find_package(Qt5 REQUIRED COMPONENTS Test)

add_executable(anqstwebhostbase_tests
    test_AnQstWebHostBase.cpp
)

target_link_libraries(anqstwebhostbase_tests
    PRIVATE
        anqstwebhostbase
        Catch2::Catch2
        Qt5::Test
)

anqst_configure_qt_runtime(anqstwebhostbase_tests)

include(CTest)
add_test(NAME anqstwebhostbase_tests COMMAND anqstwebhostbase_tests)
set_tests_properties(anqstwebhostbase_tests PROPERTIES
    ENVIRONMENT "QTWEBENGINE_DISABLE_SANDBOX=1;QT_QPA_PLATFORM=offscreen;QTWEBENGINE_CHROMIUM_FLAGS=--no-sandbox"
)

