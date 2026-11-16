import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { makeWorkspaceWebpackConfigFromConfig } from "../lib/makeWorkspaceWebpackConfigFromConfig";
import { run, ffmpeg } from "../lib/mediaHelpers";
import { ensureDirectory } from "../lib/planHelpers/planHelpers";
import { requireLicense } from "../requireLicense";
import {
  type StockFingerprint,
  StockFingerprintModule,
} from "../stock/StockFingerprintModule/StockFingerprintModule";
import { makeFreshMotionDirectory } from "./makeFreshMotionDirectory";
import { ROOT, SAMPLES } from "./motion.constants";
import type { MotionRequest } from "../MotionRequests/MotionRequests";

/** The open browser and stock bundle every preview in one run shares. */
type PreviewSession = {
  browser: Awaited<ReturnType<typeof openBrowser>>;
  serveUrl: string;
  digest: string;
};

/** Bundles the stock renderer once into a fresh temporary folder. */
async function _bundleStockRenderer(temporary: string): Promise<string> {
  const publicDir = await ensureDirectory(
    ROOT,
    "out/motion/bundle/empty-public",
  );
  return bundle({
    webpackOverride: makeWorkspaceWebpackConfigFromConfig,
    entryPoint: path.join(ROOT, "src/stock-entry.tsx"),
    rootDir: ROOT,
    outDir: path.join(temporary, "renderer"),
    publicDir,
  });
}

/** Renders every sample frame of one request as a still, in order. */
async function _renderSampleStills(
  session: Readonly<PreviewSession>,
  options: Readonly<{ motionRequest: MotionRequest; directory: string }>,
): Promise<void> {
  const { entry, request, theme } = options.motionRequest;
  const inputProps = { ...request, theme };
  const shared = {
    serveUrl: session.serveUrl,
    inputProps,
    puppeteerInstance: session.browser,
    envVariables: {},
    logLevel: "error" as const,
  };
  const composition = await selectComposition({
    ...shared,
    id: `stock-${entry.id}`,
  });
  // One browser renders the stills in order.
  for (const [index, frame] of SAMPLES.entries()) {
    await renderStill({
      ...shared,
      composition,
      frame,
      output: path.join(
        options.directory,
        `still-${String(index).padStart(3, "0")}.jpg`,
      ),
      imageFormat: "jpeg",
      jpegQuality: 90,
      licenseKey: requireLicense().privateKey,
    });
  }
}

/** Tiles the sample stills into one contact sheet for review. */
async function _writeContactSheet(directory: string): Promise<void> {
  await run(
    ffmpeg,
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      path.join(directory, "still-%03d.jpg"),
      "-vf",
      "scale=480:300,tile=3x2:padding=8:margin=8:color=0x182329",
      "-frames:v",
      "1",
      "-q:v",
      "2",
      path.join(directory, "contact-sheet.jpg"),
    ],
    { quiet: true },
  );
}

/** Records a completed preview and points the preset's index at it. */
async function _writePreviewManifest(
  options: Readonly<{
    motionRequest: MotionRequest;
    directory: string;
    fingerprint: StockFingerprint;
  }>,
): Promise<void> {
  const { motionRequest, directory, fingerprint } = options;
  const manifest = {
    complete: true,
    preset: motionRequest.entry.id,
    fingerprint,
    request: motionRequest.request,
    samples: SAMPLES,
    generatedAt: new Date().toISOString(),
    note: "Generated evidence, not automatic visual approval. Inspect before rendering.",
  };
  await fs.writeFile(
    path.join(directory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const previewDirectory =
    StockFingerprintModule.getPreviewDirectoryFromOptions({
      root: ROOT,
      preset: motionRequest.entry.id,
      fingerprint,
    });
  await fs.writeFile(
    path.join(path.dirname(previewDirectory), "index.json"),
    `${JSON.stringify({ configurationHash: fingerprint.configurationHash })}\n`,
  );
}

/** Previews one request: sample stills, contact sheet, and manifest. */
async function _previewRequest(
  session: Readonly<PreviewSession>,
  motionRequest: Readonly<MotionRequest>,
): Promise<void> {
  const { entry, request, sourceHash, theme } = motionRequest;
  const fingerprint = await StockFingerprintModule.fromRequest({
    root: ROOT,
    request: { ...request, theme },
    expectedSourceHash: sourceHash,
  });
  const sourceCheck = { root: ROOT, sourceHash: session.digest };
  await StockFingerprintModule.verifySources(sourceCheck);
  const directory = await makeFreshMotionDirectory(
    `preview/${entry.id}/${fingerprint.configurationHash}`,
  );
  await _renderSampleStills(session, { motionRequest, directory });
  await _writeContactSheet(directory);
  await StockFingerprintModule.verifySources(sourceCheck);
  await _writePreviewManifest({ motionRequest, directory, fingerprint });
  console.log(`Preview ready: ${entry.id}`);
}

/**
 * Previews every request: sample stills, a contact sheet, and a manifest for
 * each, under `out/motion/preview/`. Use it to inspect presets before they
 * are rendered.
 */
export async function previewMotionRequests(
  requests: MotionRequest[],
): Promise<void> {
  await Promise.all(
    requests.map(({ sourceHash }) =>
      StockFingerprintModule.verifySources({ root: ROOT, sourceHash }),
    ),
  );
  const digest = await StockFingerprintModule.getSourceHashFromRoot(ROOT);
  const temporary = await makeFreshMotionDirectory("bundle");
  const serveUrl = await _bundleStockRenderer(temporary);
  const browser = await openBrowser("chrome", { logLevel: "error" });
  try {
    // Previews share one browser, so they run one after another.
    for (const motionRequest of requests) {
      await _previewRequest({ browser, serveUrl, digest }, motionRequest);
    }
  } finally {
    await browser.close({ silent: true });
  }
  await fs.rm(temporary, { recursive: true });
}
