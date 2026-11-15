import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
  renderFrames,
} from "@remotion/renderer";
import { buildProduct } from "../build-avandar.mjs";
import { ffmpeg, run, mixAudio, probe } from "../lib/mediaHelpers";
import {
  assetReferences,
  publicAsset,
  previewFrames,
} from "../lib/planHelpers";
import { withWorkspaceAliases } from "../lib/withWorkspaceAliases.mjs";
import { requireLicense } from "../require-license.mjs";
import { StockFingerprintModule } from "../stock/StockFingerprintModule/StockFingerprintModule";
import { appRoot } from "./ShowcaseFilms/ShowcaseFilms";
import type { Film } from "../../src/showcase/showcase.types";

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
    webpackOverride: withWorkspaceAliases,
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

/** Capture previews and frames from one immutable bundle, then run the gate. */
export async function renderFilm(
  film: Film,
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
  const stockSourceHash = stockFingerprint?.sourceHash;
  const directory = path.join(appRoot, "out/showcase/exports", id);
  const serveUrl = await _prepare(film, directory);
  const options = {
    chromeMode: "headless-shell" as const,
    chromiumOptions: { headless: true, gl: "angle" as const },
    logLevel: "error" as const,
  };
  const browser = await openBrowser("chrome", options);
  const inputProps = { film, withAudio: false };
  try {
    const composition = await selectComposition({
      serveUrl,
      id: "showcase-film",
      inputProps,
      puppeteerInstance: browser,
      ...options,
      envVariables: {},
    });
    const samples = film.plan
      ? previewFrames(film.plan)
      : film.kind === "stock"
        ? StockFingerprintModule.SAMPLE_PARAMETERS.samples
        : [0, 30, Math.floor(film.frames / 2), film.frames - 1];
    await fs.mkdir(path.join(directory, "preview"));
    for (const frame of samples) {
      progress(`Checking preview frame ${frame + 1} of ${film.frames}…`);
      await renderStill({
        licenseKey: privateKey,
        serveUrl,
        composition,
        inputProps,
        frame,
        output: path.join(directory, "preview", `${frame}.jpg`),
        imageFormat: "jpeg",
        puppeteerInstance: browser,
        ...options,
        envVariables: {},
      });
    }
    await renderFrames({
      serveUrl,
      composition,
      inputProps,
      outputDir: path.join(directory, "frames"),
      imageFormat: "jpeg",
      jpegQuality: 90,
      concurrency: 1,
      puppeteerInstance: browser,
      ...options,
      envVariables: {},
      onStart: () => progress("Rendering frames…"),
      onFrameUpdate: (count) =>
        progress(`Rendering frame ${count} of ${film.frames}…`),
    });
  } finally {
    await browser.close({ silent: true });
  }
  progress("Encoding and checking the finished picture…");
  const picture = await _encode(film, directory);
  const gate = await run(
    process.execPath,
    [
      path.join(appRoot, "scripts/check-frames.mjs"),
      picture,
      ...(film.loop ? [] : ["--standalone"]),
    ],
    { quiet: true, cwd: appRoot },
  );
  await fs.writeFile(path.join(directory, "frame-check.txt"), gate);
  progress("Adding narration and preparing download…");
  const final = path.join(directory, `${film.id}.mp4`);
  if (film.plan) {
    await mixAudio(film.plan, directory, picture, final);
  } else {
    await fs.copyFile(picture, final);
  }
  const metadata = await probe(final);
  await fs.writeFile(
    path.join(directory, "delivery.json"),
    JSON.stringify(
      {
        film: film.id,
        ...(stockFingerprint ? { fingerprint: stockFingerprint } : {}),
        gate: "passed",
        metadata,
        sha256: createHash("sha256")
          .update(await fs.readFile(final))
          .digest("hex"),
      },
      null,
      2,
    ),
  );
  await fs.rm(path.join(directory, "frames"), { recursive: true });
  if (stockSourceHash) {
    await StockFingerprintModule.verifySources({
      root: appRoot,
      sourceHash: stockSourceHash,
    });
  }
  return final;
}
