import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import {
  type ChromiumOptions,
  openBrowser,
  renderFrames,
  selectComposition,
} from "@remotion/renderer";
import { BrowserSafeApis } from "@remotion/renderer/client";
import { makeWorkspaceWebpackConfigFromConfig } from "./lib/makeWorkspaceWebpackConfigFromConfig";
import { requireLicense } from "./requireLicense";

// Renders one composition's frames serially to JPEG for `render.sh`, which
// then encodes and gates them.
// Usage: node --import tsx scripts/renderSequence.ts <composition-id>
//          <frame-dir>

/** The Chrome binary to render with: a supplied one, or Remotion's shell. */
function _getBrowserOptions(): Pick<
  NonNullable<Parameters<typeof openBrowser>[1]>,
  "browserExecutable" | "chromeMode"
> {
  return process.env.CHROME_PATH
    ? {
        browserExecutable: process.env.CHROME_PATH,
        chromeMode: "chrome-for-testing",
      }
    : { chromeMode: "headless-shell" };
}

/** Whether `value` names a GL renderer Remotion can launch Chromium with. */
function _isOpenGlRenderer(
  value: string,
): value is NonNullable<ChromiumOptions["gl"]> {
  return (BrowserSafeApis.validOpenGlRenderers as readonly string[]).includes(
    value,
  );
}

/** Headless Chromium, with the GL backend `RENDER_GL` names, if any. */
function _getChromiumOptions(): ChromiumOptions {
  const renderGl = process.env.RENDER_GL;
  if (!renderGl) {
    return { headless: true };
  }
  if (!_isOpenGlRenderer(renderGl)) {
    throw new Error(
      `RENDER_GL must be one of ${BrowserSafeApis.validOpenGlRenderers.join(", ")}. Got: ${renderGl}`,
    );
  }
  return { headless: true, gl: renderGl };
}

async function _bundleEntry(root: string): Promise<string> {
  return bundle({
    webpackOverride: makeWorkspaceWebpackConfigFromConfig,
    entryPoint: path.resolve(
      root,
      process.env.RENDER_ENTRY_POINT || "src/index.ts",
    ),
    rootDir: root,
    publicDir: process.env.RENDER_PUBLIC_DIR || path.join(root, "public"),
  });
}

/** Renders the composition's frames serially to JPEG in `outputDir`. */
async function _renderFrames(
  session: Readonly<
    Parameters<typeof selectComposition>[0] & {
      inputProps: Record<string, unknown>;
    }
  >,
  outputDir: string,
): Promise<void> {
  const composition = await selectComposition(session);
  // The API accepts hidden parent directories such as .videos. Every frame
  // is still rendered serially to JPEG, then encoded and gated by render.sh.
  await renderFrames({
    ...session,
    composition,
    outputDir,
    imageFormat: "jpeg",
    jpegQuality: 90,
    concurrency: 1,
    onStart: () => {
      console.log(`Rendering ${composition.durationInFrames} frames serially`);
    },
    onFrameUpdate: (numRenderedFrames) => {
      if (numRenderedFrames % 60 === 0) {
        console.log(
          `Rendered ${numRenderedFrames}/${composition.durationInFrames}`,
        );
      }
    },
  });
}

/** Renders every frame of `id` serially into `outputDir`. */
async function _renderSequence(options: {
  id: string;
  outputDir: string;
}): Promise<void> {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const propsFile = process.env.REMOTION_PROPS_FILE;
  const inputProps = propsFile
    ? JSON.parse(await fs.readFile(propsFile, "utf8"))
    : {};
  const serveUrl = await _bundleEntry(root);
  const browserOptions = _getBrowserOptions();
  const chromiumOptions = _getChromiumOptions();
  const browser = await openBrowser("chrome", {
    ...browserOptions,
    chromiumOptions,
    logLevel: "error",
  });
  try {
    await _renderFrames(
      {
        id: options.id,
        serveUrl,
        inputProps,
        puppeteerInstance: browser,
        ...browserOptions,
        chromiumOptions,
        envVariables: {},
        logLevel: "error",
      },
      options.outputDir,
    );
  } finally {
    await browser.close({ silent: true });
  }
}

requireLicense();
const [id, outputDir] = process.argv.slice(2);
if (!id || !outputDir) {
  throw new Error("Expected a composition ID and frame directory");
}
await _renderSequence({ id, outputDir });
