find_package(Catch2 CONFIG REQUIRED)
anqst_find_qt_components(Test)

add_executable(anqstwebhostbase_tests
    test_AnQstWebHostBase.cpp
)

target_link_libraries(anqstwebhostbase_tests
    PRIVATE
        ${ANQST_WEBBASE_TARGET}
        Catch2::Catch2
        Qt${ANQST_QT_MAJOR_VERSION}::Test
)

anqst_configure_qt_runtime(anqstwebhostbase_tests)

include(CTest)
add_test(NAME anqstwebhostbase_tests COMMAND anqstwebhostbase_tests)
set_tests_properties(anqstwebhostbase_tests PROPERTIES
    ENVIRONMENT "QTWEBENGINE_DISABLE_SANDBOX=1;QT_QPA_PLATFORM=offscreen;QTWEBENGINE_CHROMIUM_FLAGS=--no-sandbox"
)

