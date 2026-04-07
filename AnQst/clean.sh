#!/bin/bash

rm -Rf ./AnQstGen/dist ./AnQstGen/node_modules ./AnQstGen/package-lock.json
rm -Rf ./Examples/example-qt-app/build ./Examples/example-qt-app/lib/widgets/CdEntryEditor/{package-lock.json,node_modules,dist,AnQst/generated}
rm -Rf ./Examples/example-qt-app/lib/widgets/CdEntryEditor/.angular

rm -Rf ./Examples/TimelineEditorQtApp/build
rm -Rf ./Examples/TimelineEditorQtApp/lib/widgets/CdEntryEditor/{package-lock.json,node_modules,dist,AnQst/generated}
rm -Rf ./Examples/TimelineEditorQtApp/lib/widgets/CdEntryEditor/.angular
rm -Rf ./Examples/TimelineEditorQtApp/lib/widgets/TimelineEditor/{package-lock.json,node_modules,dist,AnQst/generated}
rm -Rf ./Examples/TimelineEditorQtApp/lib/widgets/TimelineEditor/.angular

rm -Rf ./AnQstWidget/AnQstWebBase/build

