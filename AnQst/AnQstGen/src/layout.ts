import path from "node:path";

export const ANQST_ROOT_DIRNAME = "AnQst";
export const ANQST_GENERATED_DIRNAME = "generated";
export const ANQST_LAYOUT_VERSION = 2;
export type FrontendTargetName = "AngularService" | "VanillaTS" | "VanillaJS";

export function normalizeSlashes(inputPath: string): string {
  return inputPath.split(path.sep).join("/");
}

export function anqstRootDir(cwd: string): string {
  return path.join(cwd, ANQST_ROOT_DIRNAME);
}

export function anqstGeneratedRootDir(cwd: string): string {
  return path.join(anqstRootDir(cwd), ANQST_GENERATED_DIRNAME);
}

export function anqstDebugIntermediateRootDir(cwd: string): string {
  return path.join(anqstGeneratedRootDir(cwd), "debug", "intermediate");
}

export function anqstSpecFileName(widgetName: string): string {
  return `${widgetName}.AnQst.d.ts`;
}

export function anqstSettingsFileName(widgetName: string): string {
  return `${widgetName}.settings.json`;
}

export function anqstSettingsRelativePath(widgetName: string): string {
  return `./${ANQST_ROOT_DIRNAME}/${anqstSettingsFileName(widgetName)}`;
}

export function generatedFrontendDirName(widgetName: string, target: FrontendTargetName): string {
  if (target === "AngularService") return `${widgetName}_Angular`;
  if (target === "VanillaTS") return `${widgetName}_VanillaTS`;
  return `${widgetName}_VanillaJS`;
}

export function generatedNodeExpressDirName(widgetName: string): string {
  return `${widgetName}_anQst`;
}

export function generatedQtWidgetDirName(widgetName: string): string {
  return `${widgetName}_widget`;
}

export interface GeneratedLayoutPaths {
  generatedRoot: string;
  angularFrontendRoot: string;
  vanillaTsFrontendRoot: string;
  vanillaJsFrontendRoot: string;
  nodeExpressRoot: string;
  cppCmakeRoot: string;
  cppQtWidgetRoot: string;
  designerPluginRoot: string;
  designerPluginBuildRoot: string;
  debugIntermediateRoot: string;
}

export function resolveGeneratedLayoutPaths(cwd: string, widgetName: string): GeneratedLayoutPaths {
  const generatedRoot = anqstGeneratedRootDir(cwd);
  const cppQtWidgetRoot = path.join(generatedRoot, "backend", "cpp", "qt", generatedQtWidgetDirName(widgetName));
  const designerPluginRoot = path.join(cppQtWidgetRoot, "designerPlugin");

  return {
    generatedRoot,
    angularFrontendRoot: path.join(generatedRoot, "frontend", generatedFrontendDirName(widgetName, "AngularService")),
    vanillaTsFrontendRoot: path.join(generatedRoot, "frontend", generatedFrontendDirName(widgetName, "VanillaTS")),
    vanillaJsFrontendRoot: path.join(generatedRoot, "frontend", generatedFrontendDirName(widgetName, "VanillaJS")),
    nodeExpressRoot: path.join(generatedRoot, "backend", "node", "express", generatedNodeExpressDirName(widgetName)),
    cppCmakeRoot: path.join(generatedRoot, "backend", "cpp", "cmake"),
    cppQtWidgetRoot,
    designerPluginRoot,
    designerPluginBuildRoot: path.join(designerPluginRoot, "build"),
    debugIntermediateRoot: anqstDebugIntermediateRootDir(cwd)
  };
}

export function toProjectRelative(cwd: string, absolutePath: string): string {
  return normalizeSlashes(path.relative(cwd, absolutePath));
}
