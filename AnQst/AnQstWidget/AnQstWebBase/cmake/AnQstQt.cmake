include_guard(GLOBAL)

function(anqst_find_qt_components)
    find_package(Qt6 6.5 REQUIRED COMPONENTS ${ARGN})
endfunction()
