import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(rootDir, "src");
const outDir = path.join(rootDir, "dist", "browser");
const generatedFrontendEntry = path.join(
  rootDir,
  "AnQst",
  "generated",
  "frontend",
  "VanillaTsWidget_VanillaTS",
  "index.ts"
);

function copyStaticAssets(sourceDir, targetDir) {
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(targetPath, { recursive: true });
      copyStaticAssets(sourcePath, targetPath);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (entry.name.endsWith(".ts")) {
      continue;
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
}

if (!fs.existsSync(generatedFrontendEntry)) {
  throw new Error("Missing generated VanillaTS frontend entry. Run 'npm run anqst:generate' first.");
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const copyAssetsPlugin = {
  name: "copy-static-assets",
  setup(build) {
    build.onEnd(() => {
      copyStaticAssets(srcDir, outDir);
    });
  }
};

const sharedOptions = {
  absWorkingDir: rootDir,
  bundle: true,
  entryPoints: [path.join(srcDir, "main.ts")],
  format: "iife",
  logLevel: "info",
  outfile: path.join(outDir, "main.js"),
  platform: "browser",
  plugins: [copyAssetsPlugin],
  sourcemap: true,
  target: "es2020"
};

if (process.argv.includes("--watch")) {
  const context = await esbuild.context(sharedOptions);
  await context.watch();
  copyStaticAssets(srcDir, outDir);
  console.log("[VanillaTsWidget] Watching frontend sources...");
} else {
  await esbuild.build(sharedOptions);
}
