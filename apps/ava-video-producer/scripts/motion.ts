#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { propEq } from "@avandar/utils";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { STOCK_LOOP_FRAMES, STOCK_FPS } from "../src/stock/catalog";
import { run, ffmpeg, probe } from "./lib/mediaHelpers";
import { ensureDirectory, fileHash } from "./lib/planHelpers";
import { withWorkspaceAliases } from "./lib/withWorkspaceAliases.mjs";
import {
  MotionRequests,
  type MotionRequest,
} from "./MotionRequests/MotionRequests";
import { requireLicense } from "./require-license.mjs";
import { StockFingerprintModule } from "./stock/StockFingerprintModule/StockFingerprintModule";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SAMPLES: number[] = StockFingerprintModule.SAMPLE_PARAMETERS.samples;

async function _fresh(relative: string) {
  const parent = await ensureDirectory(ROOT, "out/motion");
  const target = path.join(parent, relative);
  try {
    const stat = await fs.lstat(target);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new Error("Motion output must be an owned directory");
    const history = await ensureDirectory(ROOT, "out/motion/.history");
    await fs.rename(
      target,
      path.join(
        history,
        `${relative.replaceAll("/", "-")}-${Date.now()}-${randomUUID().slice(0, 8)}`,
      ),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return ensureDirectory(ROOT, `out/motion/${relative}`);
}

async function _preview(requests: MotionRequest[]) {
  await Promise.all(
    requests.map(({ sourceHash }) =>
      StockFingerprintModule.verifySources({ root: ROOT, sourceHash }),
    ),
  );
  const digest = await StockFingerprintModule.getSourceHashFromRoot(ROOT);
  const temporary = await _fresh("bundle");
  const publicDir = await ensureDirectory(
    ROOT,
    "out/motion/bundle/empty-public",
  );
  const serveUrl = await bundle({
    webpackOverride: withWorkspaceAliases,
    entryPoint: path.join(ROOT, "src/stock-entry.tsx"),
    rootDir: ROOT,
    outDir: path.join(temporary, "renderer"),
    publicDir,
  });
  const browser = await openBrowser("chrome", { logLevel: "error" });
  try {
    for (const { entry, request, sourceHash } of requests) {
      const fingerprint = await StockFingerprintModule.fromRequest({
        root: ROOT,
        request,
        expectedSourceHash: sourceHash,
      });
      await StockFingerprintModule.verifySources({
        root: ROOT,
        sourceHash: digest,
      });
      const directory = await _fresh(
        `preview/${entry.id}/${fingerprint.configurationHash}`,
      );
      const composition = await selectComposition({
        serveUrl,
        id: `stock-${entry.id}`,
        inputProps: request,
        puppeteerInstance: browser,
        envVariables: {},
        logLevel: "error",
      });
      for (const [index, frame] of SAMPLES.entries()) {
        await renderStill({
          composition,
          inputProps: request,
          serveUrl,
          frame,
          output: path.join(
            directory,
            `still-${String(index).padStart(3, "0")}.jpg`,
          ),
          imageFormat: "jpeg",
          jpegQuality: 90,
          puppeteerInstance: browser,
          envVariables: {},
          logLevel: "error",
          licenseKey: requireLicense().privateKey,
        });
      }
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
      await StockFingerprintModule.verifySources({
        root: ROOT,
        sourceHash: digest,
      });
      await fs.writeFile(
        path.join(directory, "manifest.json"),
        `${JSON.stringify(
          {
            complete: true,
            preset: entry.id,
            fingerprint,
            request,
            samples: SAMPLES,
            generatedAt: new Date().toISOString(),
            note: "Generated evidence, not automatic visual approval. Inspect before rendering.",
          },
          null,
          2,
        )}\n`,
      );
      await fs.writeFile(
        path.join(
          path.dirname(
            StockFingerprintModule.getPreviewDirectoryFromOptions({
              root: ROOT,
              preset: entry.id,
              fingerprint,
            }),
          ),
          "index.json",
        ),
        `${JSON.stringify({ configurationHash: fingerprint.configurationHash })}\n`,
      );
      console.log(`Preview ready: ${entry.id}`);
    }
  } finally {
    await browser.close({ silent: true });
  }
  await fs.rm(temporary, { recursive: true });
}

async function _render(requests: MotionRequest[]) {
  const digest = await StockFingerprintModule.getSourceHashFromRoot(ROOT);
  // Check the whole selection before spending time on a partial batch.
  await Promise.all(
    requests.map(async ({ entry, request, sourceHash }) => {
      await StockFingerprintModule.requirePreview({
        root: ROOT,
        preset: entry.id,
        fingerprint: await StockFingerprintModule.fromRequest({
          root: ROOT,
          request,
          expectedSourceHash: sourceHash,
        }),
      });
    }),
  );
  const destination = await ensureDirectory(ROOT, "out/motion/deliveries");
  const publicDir = await ensureDirectory(ROOT, "out/motion/empty-public");
  for (const { entry, request, sourceHash } of requests) {
    await StockFingerprintModule.verifySources({
      root: ROOT,
      sourceHash: digest,
    });
    const fingerprint = await StockFingerprintModule.fromRequest({
      root: ROOT,
      request,
      expectedSourceHash: sourceHash,
    });
    const directory = await _fresh(
      `render/${entry.id}/${fingerprint.configurationHash}`,
    );
    const propsFile = path.join(directory, "inputs.json");
    await fs.writeFile(propsFile, JSON.stringify(request));
    const output = await run(
      "sh",
      [path.join(ROOT, "scripts/render.sh"), `stock-${entry.id}`, "90"],
      {
        quiet: true,
        cwd: ROOT,
        env: {
          ...process.env,
          RENDER_OUT_DIR: directory,
          RENDER_OUTPUT_ID: entry.id,
          REMOTION_PROPS_FILE: propsFile,
          DELIVER: "1280:800",
          STANDALONE: "0",
          KEEP_RENDER_FRAMES: "1",
          RENDER_ENTRY_POINT: "src/stock-entry.tsx",
          RENDER_PUBLIC_DIR: publicDir,
        },
      },
    );
    await fs.writeFile(path.join(directory, "render.log"), output);
    const video = path.join(directory, `${entry.id}.mp4`);
    const info = await probe(video);
    const stream = info.streams.find(propEq("codec_type", "video"));
    if (
      info.duration !== 6 ||
      stream?.width !== 1280 ||
      stream.height !== 800 ||
      stream.avg_frame_rate !== "30/1" ||
      Number(stream.nb_frames) !== STOCK_LOOP_FRAMES
    )
      throw new Error(`Unexpected media metadata: ${entry.id}`);
    await StockFingerprintModule.verifySources({
      root: ROOT,
      sourceHash: digest,
    });
    // Existing delivery files stay recoverable even when rerendering one preset.
    const backup = await ensureDirectory(
      ROOT,
      `out/motion/backups/${entry.id}-${Date.now()}`,
    );
    for (const suffix of [".mp4", "-poster.jpg", ".json"]) {
      const previous = path.join(destination, `${entry.id}${suffix}`);
      try {
        await fs.copyFile(previous, path.join(backup, path.basename(previous)));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    for (const suffix of [".mp4", "-poster.jpg"]) {
      await fs.copyFile(
        path.join(directory, `${entry.id}${suffix}`),
        path.join(destination, `${entry.id}${suffix}`),
      );
    }
    const record = {
      preset: entry.id,
      fingerprint,
      request,
      frames: STOCK_LOOP_FRAMES,
      fps: STOCK_FPS,
      width: 1280,
      height: 800,
      seconds: info.duration,
      audio: false,
      gate: "passed including loop seam",
      videoSha256: await fileHash(video),
      posterSha256: await fileHash(
        path.join(destination, `${entry.id}-poster.jpg`),
      ),
      generatedAt: new Date().toISOString(),
    };
    await fs.writeFile(
      path.join(destination, `${entry.id}.json`),
      `${JSON.stringify(record, null, 2)}\n`,
    );
    console.log(`Rendered and gated: ${entry.id}`);
    await fs.rm(path.join(directory, `${entry.id}-frames`), {
      recursive: true,
    });
  }
}

async function _main() {
  requireLicense();
  const args = MotionRequests.parseArgs(process.argv.slice(2));
  const { command, entries } = args;
  if (command === "list") {
    entries.forEach((entry) =>
      console.log(
        `${entry.id.padEnd(20)} ${entry.category.padEnd(12)} ${entry.name}`,
      ),
    );
  } else {
    const requests = await MotionRequests.fromArgs({ args });
    if (command === "preview") {
      await _preview(requests);
    } else {
      await _render(requests);
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  _main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
