# Additional clean files
cmake_minimum_required(VERSION 3.16)

if("${CONFIG}" STREQUAL "" OR "${CONFIG}" STREQUAL "")
  file(REMOVE_RECURSE
  "CMakeFiles/example_qt_app_autogen.dir/AutogenUsed.txt"
  "CMakeFiles/example_qt_app_autogen.dir/ParseCache.txt"
  "anqstwebbase/CMakeFiles/anqstwebhostbase_autogen.dir/AutogenUsed.txt"
  "anqstwebbase/CMakeFiles/anqstwebhostbase_autogen.dir/ParseCache.txt"
  "anqstwebbase/anqstwebhostbase_autogen"
  "cdentryeditor-integration/CMakeFiles/CdEntryEditorWidget_autogen.dir/AutogenUsed.txt"
  "cdentryeditor-integration/CMakeFiles/CdEntryEditorWidget_autogen.dir/ParseCache.txt"
  "cdentryeditor-integration/CdEntryEditorWidget_autogen"
  "example_qt_app_autogen"
  )
endif()
