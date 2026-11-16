import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
  renderFrames,
} from "@remotion/renderer";
import { createContinuityPlanFromVideoThemeSnapshot } from "../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { buildProduct } from "../buildProduct/buildProduct";
import { getSha256FromFile } from "../lib/getSha256FromFile";
import { makeWorkspaceWebpackConfigFromConfig } from "../lib/makeWorkspaceWebpackConfigFromConfig";
import { ffmpeg, run, mixAudio, probe } from "../lib/mediaHelpers";
import { assetReferences, publicAsset } from "../lib/planHelpers/planHelpers";
import { previewFrames } from "../lib/planHelpers/previewFrames";
import { requireLicense } from "../requireLicense";
import {
  type StockFingerprint,
  StockFingerprintModule,
} from "../stock/StockFingerprintModule/StockFingerprintModule";
import { getDeliveryThemeFromFilm } from "./getDeliveryThemeFromFilm/getDeliveryThemeFromFilm";
import { appRoot } from "./ShowcaseFilms/ShowcaseFilms";
import type { Film } from "../../src/showcase/showcase.types";
import type { Storyboard } from "../../src/storyboard/schema/schema";

/** Browser settings every showcase render call shares. */
const RENDER_OPTIONS = {
  chromeMode: "headless-shell" as const,
  chromiumOptions: { headless: true, gl: "angle" as const },
  logLevel: "error" as const,
};

/** The film, its working folder, and the bundle and plan it renders from. */
type FilmRender = {
  film: Film;
  directory: string;
  serveUrl: string;
  plan: Storyboard | undefined;
  progress: (message: string) => void;
};

/** What `delivery.json` records: the film, its video file, and its stock. */
type DeliveryRecordOptions = {
  film: Film;
  directory: string;
  finalVideoPath: string;
  stockFingerprint: Readonly<StockFingerprint> | undefined;
};

async function _prepare(film: Film, directory: string) {
  await fs.mkdir(directory, { recursive: true });
  const publicDir = path.join(directory, "public");
  await fs.mkdir(publicDir);
  await fs.cp(
    path.join(appRoot, "public/fonts"),
    path.join(publicDir, "fonts"),
    { recursive: true },
  );
  await Promise.all(
    (film.plan ? assetReferences(film.plan) : []).map(async (asset) => {
      const target = path.join(publicDir, asset);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(await publicAsset(appRoot, asset), target);
    }),
  );
  await buildProduct();
  await fs.writeFile(
    path.join(directory, "inputs.json"),
    JSON.stringify(film, null, 2),
  );
  return bundle({
    webpackOverride: makeWorkspaceWebpackConfigFromConfig,
    entryPoint: path.join(appRoot, "src/showcase/render-entry.tsx"),
    rootDir: appRoot,
    outDir: path.join(directory, "bundle"),
    publicDir,
  });
}

async function _encode(film: Film, directory: string) {
  const frames = path.join(directory, "frames");
  const first = (await fs.readdir(frames)).sort()[0];
  const digits = first.match(/^element-(\d+)\.jpeg$/)?.[1].length;
  if (!digits) {
    throw new Error("Render produced no frames");
  }
  const picture = path.join(directory, "picture.mp4");
  await run(
    ffmpeg,
    [
      "-y",
      "-loglevel",
      "error",
      "-framerate",
      String(film.fps),
      "-start_number",
      "0",
      "-i",
      path.join(frames, `element-%0${digits}d.jpeg`),
      "-vf",
      `scale=${film.delivery.width}:${film.delivery.height}:flags=lanczos,format=yuv420p`,
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-level",
      "4.0",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "21",
      "-bf",
      "0",
      "-g",
      "60",
      "-movflags",
      "+faststart",
      "-an",
      picture,
    ],
    { quiet: true },
  );
  return picture;
}

/** The frames the preview check renders before the full render starts. */
function _getPreviewSamplesFromFilm(
  film: Readonly<Film>,
  plan: Readonly<Storyboard> | undefined,
): number[] {
  if (plan) {
    return previewFrames(plan);
  }
  return film.kind === "stock"
    ? [...StockFingerprintModule.SAMPLE_PARAMETERS.samples]
    : [0, 30, Math.floor(film.frames / 2), film.frames - 1];
}

/** Renders each preview sample as a still under `preview/`, in order. */
async function _renderPreviewStills(
  options: Readonly<{
    render: Readonly<FilmRender>;
    stillOptions: Omit<
      Parameters<typeof renderStill>[0],
      "frame" | "output" | "imageFormat"
    >;
    licenseKey: string;
  }>,
): Promise<void> {
  const { render, stillOptions, licenseKey } = options;
  const { film, directory, progress } = render;
  await fs.mkdir(path.join(directory, "preview"));
  // One browser renders the stills in order before the full render.
  for (const frame of _getPreviewSamplesFromFilm(film, render.plan)) {
    progress(`Checking preview frame ${frame + 1} of ${film.frames}…`);
    await renderStill({
      ...stillOptions,
      licenseKey,
      frame,
      output: path.join(directory, "preview", `${frame}.jpg`),
      imageFormat: "jpeg",
    });
  }
}

/** Renders the preview stills and then every frame, in one browser. */
async function _renderPictureFrames(
  render: Readonly<FilmRender>,
  privateKey: string,
): Promise<void> {
  const { film, directory, serveUrl, progress } = render;
  const browser = await openBrowser("chrome", RENDER_OPTIONS);
  const inputProps = { film, withAudio: false };
  const sharedRenderOptions = {
    serveUrl,
    inputProps,
    puppeteerInstance: browser,
    ...RENDER_OPTIONS,
    envVariables: {},
  };
  try {
    const composition = await selectComposition({
      ...sharedRenderOptions,
      id: "showcase-film",
    });
    await _renderPreviewStills({
      render,
      stillOptions: { ...sharedRenderOptions, composition },
      licenseKey: privateKey,
    });
    await renderFrames({
      ...sharedRenderOptions,
      composition,
      outputDir: path.join(directory, "frames"),
      imageFormat: "jpeg",
      jpegQuality: 90,
      concurrency: 1,
      onStart: () => progress("Rendering frames…"),
      onFrameUpdate: (count) =>
        progress(`Rendering frame ${count} of ${film.frames}…`),
    });
  } finally {
    await browser.close({ silent: true });
  }
}

/** Encodes and gates the picture, then adds narration; returns the MP4 path. */
async function _encodeGateAndMix(
  render: Readonly<FilmRender>,
): Promise<string> {
  const { film, directory, plan, progress } = render;
  progress("Encoding and checking the finished picture…");
  const picture = await _encode(film, directory);
  const gate = await run(
    process.execPath,
    [
      "--import",
      "tsx",
      path.join(appRoot, "scripts/checkFrames.ts"),
      picture,
      ...(film.loop ? [] : ["--standalone"]),
    ],
    { quiet: true, cwd: appRoot },
  );
  await fs.writeFile(path.join(directory, "frame-check.txt"), gate);
  progress("Adding narration and preparing download…");
  const finalVideoPath = path.join(directory, `${film.id}.mp4`);
  if (plan) {
    await mixAudio(plan, directory, picture, finalVideoPath);
  } else {
    await fs.copyFile(picture, finalVideoPath);
  }
  return finalVideoPath;
}

/** Writes `delivery.json`: the film, its theme, gate result, and file hash. */
async function _writeDeliveryRecord(
  options: Readonly<DeliveryRecordOptions>,
): Promise<void> {
  const { film, finalVideoPath, stockFingerprint } = options;
  const record = {
    film: film.id,
    ...getDeliveryThemeFromFilm(film),
    ...(stockFingerprint ? { fingerprint: stockFingerprint } : {}),
    gate: "passed",
    metadata: await probe(finalVideoPath),
    sha256: await getSha256FromFile(finalVideoPath),
  };
  await fs.writeFile(
    path.join(options.directory, "delivery.json"),
    JSON.stringify(record, null, 2),
  );
}

/** Capture previews and frames from one immutable bundle, then run the gate. */
export async function renderFilm(
  film: Readonly<Film>,
  id: string,
  progress: (message: string) => void,
  expectedStockSourceHash?: string,
): Promise<string> {
  const { privateKey } = requireLicense();
  const stockFingerprint =
    film.kind === "stock"
      ? await StockFingerprintModule.fromRequest({
          root: appRoot,
          request: film,
          expectedSourceHash: expectedStockSourceHash,
        })
      : undefined;
  const directory = path.join(appRoot, "out/showcase/exports", id);
  const serveUrl = await _prepare(film, directory);
  // Preview frames and the audio mix follow the plan the film draws.
  const plan = film.plan
    ? createContinuityPlanFromVideoThemeSnapshot(film.plan, film.theme, [
        film.id,
      ])
    : undefined;
  const render = { film, directory, serveUrl, plan, progress };
  await _renderPictureFrames(render, privateKey);
  const finalVideoPath = await _encodeGateAndMix(render);
  await _writeDeliveryRecord({
    film,
    directory,
    finalVideoPath,
    stockFingerprint,
  });
  await fs.rm(path.join(directory, "frames"), { recursive: true });
  if (stockFingerprint?.sourceHash) {
    await StockFingerprintModule.verifySources({
      root: appRoot,
      sourceHash: stockFingerprint.sourceHash,
    });
  }
  return finalVideoPath;
}
