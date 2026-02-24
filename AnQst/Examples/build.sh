pushd ./demo/lib/demo-widget/
npm install
npm run build
popd
cmake  -B build -G Ninja
cmake  --build build
