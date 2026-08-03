# Stage 0 validation record

Captured and validated on 2026-08-03 with:

- AnQst generator package: 1.7.7
- Node.js: 24.18.1
- npm: 12.0.2
- TypeScript: package-locked project version
- Qt6Core: 6.4.2
- CMake: 3.28.3
- GNU C++: 13.3.0

## Generator and codec suite

Command: `npm test` from `AnQst/AnQstGen`.

Result: 88 passed, 0 failed, 0 skipped. This includes Base93 native parity, deep structured TypeScript/C++ interoperability, boundary planning, generation for all targets, parser/verification, and CLI behavior.

## Native bridge/runtime suite

Configured in a temporary directory with:

```sh
cmake -S AnQst/AnQstWidget/AnQstWebBase -B <temporary-build> \
  -G Ninja -DANQST_QT_MAJOR_VERSION=6 -DCMAKE_BUILD_TYPE=Debug
cmake --build <temporary-build>
ctest --test-dir <temporary-build> --output-on-failure
```

Result: `anqstwebhostbase_tests` passed; 1 CTest target passed, 0 failed. The target contains the behavior cases mapped in `BEHAVIOR.md`.

The Qt 6.4.2 build reports existing deprecation warnings for `QDropEvent::pos()` in `AnQstWebHostBase.cpp`. They are deliberately retained in Stage 0 and are useful evidence for the later Qt6-native implementation stage.

## Determinism

`capture-baseline.js` resets only `raw-generated/` and generated portions of `public-contract/`, emits paths in sorted order, and records a SHA-256 for every raw/public generated file in `manifest.json`. A later stage can rerun it and compare the manifest and snapshots directly.
