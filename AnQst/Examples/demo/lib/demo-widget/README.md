# DemoWidget

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.4.

## AnQst integration

This example is wired to the local `anqst` CLI package (`file:../../../../AnQstGen`):

```bash
npm run anqst:test
npm run anqst:build
```

`npm run anqst:build` refreshes:

- `src/anqst-generated/` (installed Angular services/types consumed by the app)
- `generated_output/cpplibrary/` (generated C++ widget library sources + CMake)
- `generated_output/cpplibrary/webapp/` and `generated_output/cpplibrary/DemoHostWidget.qrc` (embedded Angular runtime bundle used by the generated widget library)
- `anqst-cmake/CMakeLists.txt` (Qt-facing integration entrypoint)

Qt applications can consume the generated widget with:

```cmake
add_subdirectory(path/to/demo/lib/demo-widget/anqst-cmake)
target_link_libraries(my_qt_app PRIVATE DemoHostWidgetWidget)
```

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
