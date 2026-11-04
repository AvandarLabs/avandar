import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderFrames,
  selectComposition,
} from "@remotion/renderer";
import { withWorkspaceAliases } from "./lib/withWorkspaceAliases.mjs";
import { requireLicense } from "./require-license.mjs";

requireLicense();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [id, outputDir] = process.argv.slice(2);
if (!id || !outputDir)
  throw new Error("Expected a composition ID and frame directory");
const props = process.env.REMOTION_PROPS_FILE;
const inputProps = props ? JSON.parse(await fs.readFile(props, "utf8")) : {};
const serveUrl = await bundle({
  webpackOverride: withWorkspaceAliases,
  entryPoint: path.resolve(
    root,
    process.env.RENDER_ENTRY_POINT || "src/index.ts",
  ),
  rootDir: root,
  publicDir: process.env.RENDER_PUBLIC_DIR || path.join(root, "public"),
});
const browserOptions = process.env.CHROME_PATH
  ? {
      browserExecutable: process.env.CHROME_PATH,
      chromeMode: "chrome-for-testing",
    }
  : { chromeMode: "headless-shell" };
const chromiumOptions = {
  headless: true,
  ...(process.env.RENDER_GL ? { gl: process.env.RENDER_GL } : {}),
};
const browser = await openBrowser("chrome", {
  ...browserOptions,
  chromiumOptions,
  logLevel: "error",
});
try {
  const composition = await selectComposition({
    serveUrl,
    id,
    inputProps,
    puppeteerInstance: browser,
    ...browserOptions,
    chromiumOptions,
    envVariables: {},
    logLevel: "error",
  });
  // The API accepts hidden parent directories such as .videos. Every frame is
  // still rendered serially to JPEG, then encoded and gated by render.sh.
  await renderFrames({
    composition,
    serveUrl,
    inputProps,
    outputDir,
    puppeteerInstance: browser,
    ...browserOptions,
    chromiumOptions,
    envVariables: {},
    imageFormat: "jpeg",
    jpegQuality: 90,
    concurrency: 1,
    logLevel: "error",
    onStart: () =>
      console.log(`Rendering ${composition.durationInFrames} frames serially`),
    onFrameUpdate: (count) => {
      if (count % 60 === 0)
        console.log(`Rendered ${count}/${composition.durationInFrames}`);
    },
  });
} finally {
  await browser.close({ silent: true });
}
