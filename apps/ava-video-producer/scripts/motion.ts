#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { bundle } from "@remotion/bundler";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import {
  STOCK_CATALOG,
  STOCK_LOOP_FRAMES,
  STOCK_FPS,
  stockEntry,
  type StockEntry,
} from "../src/stock/catalog";
import { run, ffmpeg, probe } from "./lib/mediaHelpers";
import { ensureDirectory, fileHash } from "./lib/planHelpers";
import { requireLicense } from "./require-license.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLES = [0, 18, 36, 90, 150, 179];

export function parseMotionArgs(args: string[]) {
  const [command, selection = "all", ...extra] = args;
  if (!["list", "preview", "render"].includes(command) || extra.length) {
    throw new Error(
      "Usage: npm run motion -- list | preview [all|preset-id] | render [all|preset-id]",
    );
  }
  const entries =
    selection === "all" ? [...STOCK_CATALOG] : [stockEntry(selection)];
  return { command, entries };
}

/** Only explicit renderer files are read; no env files or raw capture data. */
async function _fingerprint() {
  const files = [
    "src/stock-entry.tsx",
    "src/motion.ts",
    "remotion.config.ts",
    "../../pnpm-lock.yaml",
    "package.json",
    "scripts/render.sh",
    "scripts/render-sequence.mjs",
    "scripts/check-frames.mjs",
    "scripts/motion.ts",
  ];
  for (const name of await fs.readdir(path.join(ROOT, "src/stock"))) {
    if (/^[a-zA-Z][a-zA-Z0-9.-]*\.tsx?$/.test(name))
      files.push(`src/stock/${name}`);
  }
  const hash = createHash("sha256");
  for (const file of files.sort())
    hash.update(`${file}\0${await fileHash(path.join(ROOT, file))}\n`);
  return hash.digest("hex");
}

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

async function _preview(entries: StockEntry[]) {
  const digest = await _fingerprint();
  const temporary = await _fresh("bundle");
  const publicDir = await ensureDirectory(
    ROOT,
    "out/motion/bundle/empty-public",
  );
  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, "src/stock-entry.tsx"),
    rootDir: ROOT,
    outDir: path.join(temporary, "renderer"),
    publicDir,
  });
  const browser = await openBrowser("chrome", { logLevel: "error" });
  try {
    for (const entry of entries) {
      const directory = await _fresh(`preview/${entry.id}`);
      const composition = await selectComposition({
        serveUrl,
        id: `stock-${entry.id}`,
        puppeteerInstance: browser,
        envVariables: {},
        logLevel: "error",
      });
      for (const [index, frame] of SAMPLES.entries()) {
        await renderStill({
          composition,
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
      if (digest !== (await _fingerprint()))
        throw new Error("Stock renderer changed during preview; regenerate it");
      await fs.writeFile(
        path.join(directory, "manifest.json"),
        `${JSON.stringify(
          {
            complete: true,
            preset: entry.id,
            fingerprint: digest,
            samples: SAMPLES,
            generatedAt: new Date().toISOString(),
            note: "Generated evidence, not automatic visual approval. Inspect before rendering.",
          },
          null,
          2,
        )}\n`,
      );
      console.log(`Preview ready: ${entry.id}`);
    }
  } finally {
    await browser.close({ silent: true });
  }
  await fs.rm(temporary, { recursive: true });
}

async function _render(entries: StockEntry[]) {
  const digest = await _fingerprint();
  // Check the whole selection before spending time on a partial batch.
  for (const entry of entries) {
    const directory = path.join(ROOT, "out/motion/preview", entry.id);
    let manifest;
    try {
      manifest = JSON.parse(
        await fs.readFile(path.join(directory, "manifest.json"), "utf8"),
      );
    } catch {
      throw new Error(`Run and inspect preview first: ${entry.id}`);
    }
    if (!manifest.complete || manifest.fingerprint !== digest)
      throw new Error(`Preview is stale: ${entry.id}`);
    await fs.access(path.join(directory, "contact-sheet.jpg"));
  }
  const destination = await ensureDirectory(ROOT, "out/motion/deliveries");
  const publicDir = await ensureDirectory(ROOT, "out/motion/empty-public");
  for (const entry of entries) {
    const directory = await _fresh(`render/${entry.id}`);
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
          REMOTION_PROPS_FILE: "",
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
    const stream = info.streams.find((item) => item.codec_type === "video");
    if (
      info.duration !== 6 ||
      stream?.width !== 1280 ||
      stream.height !== 800 ||
      stream.avg_frame_rate !== "30/1" ||
      Number(stream.nb_frames) !== STOCK_LOOP_FRAMES
    )
      throw new Error(`Unexpected media metadata: ${entry.id}`);
    if (digest !== (await _fingerprint()))
      throw new Error(
        "Stock renderer changed during render; outputs retained for inspection",
      );
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
      fingerprint: digest,
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
  const { command, entries } = parseMotionArgs(process.argv.slice(2));
  if (command === "list")
    for (const entry of entries)
      console.log(
        `${entry.id.padEnd(20)} ${entry.category.padEnd(12)} ${entry.name}`,
      );
  else if (command === "preview") await _preview(entries);
  else await _render(entries);
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
