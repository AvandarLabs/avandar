#!/usr/bin/env node
/**
 * Extracts frames from a video and lays them out as one labelled contact
 * sheet, so a frame range can be checked with a single image read.
 *
 * Uses only tools this repository ships (see `lib/videoTools.mjs`) and
 * Playwright's Chromium to draw the sheet.
 *
 * Usage:
 *   node extract-frames.mjs --video <file.mp4> --out <sheet.jpg>
 *     (--frames 288,291,294 | --from <frame> --to <frame> [--step 3])
 *     [--fps 30] [--width 480] [--columns 6]
 *
 * Frame numbers are at `--fps` (default 30), matching the motion spec.
 * Prints the video's duration and the sheet path.
 */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { extractFrameJpeg, probeVideo, requireFromProducer } from "./lib/videoTools.mjs";

const { values } = parseArgs({
  options: {
    video: { type: "string" },
    out: { type: "string" },
    frames: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
    step: { type: "string", default: "3" },
    fps: { type: "string", default: "30" },
    width: { type: "string", default: "480" },
    columns: { type: "string", default: "6" },
  },
});

if (!values.video || !values.out || (!values.frames && !values.from)) {
  console.error(
    "Usage: extract-frames.mjs --video <file> --out <sheet.jpg> (--frames a,b,c | --from n --to m [--step k])",
  );
  process.exit(2);
}

/** Lists the frame numbers to extract from the CLI options. */
function buildFrameNumbers() {
  if (values.frames) return values.frames.split(",").map(Number);
  const frameNumbers = [];
  for (let frame = Number(values.from); frame <= Number(values.to); frame += Number(values.step)) {
    frameNumbers.push(frame);
  }
  return frameNumbers;
}

/** Formats a frame number as `mm:ss.f` plus the frame, for sheet labels. */
function buildFrameLabel(frame, fps) {
  const seconds = frame / fps;
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds - minutes * 60).toFixed(1).padStart(4, "0");
  return `f${frame} · ${String(minutes).padStart(2, "0")}:${remainder}`;
}

/** Draws the extracted JPEGs into one labelled grid and screenshots it. */
async function drawContactSheet(framePaths, labels) {
  const { chromium } = requireFromProducer("@playwright/test");
  const images = await Promise.all(
    framePaths.map(async (framePath) => (await readFile(framePath)).toString("base64")),
  );
  const cells = images
    .map(
      (image, index) =>
        `<figure><img src="data:image/jpeg;base64,${image}"><figcaption>${labels[index]}</figcaption></figure>`,
    )
    .join("");
  const html = `<style>body{margin:0;background:#111;font:14px monospace;color:#eee}
    main{display:grid;grid-template-columns:repeat(${values.columns},${values.width}px);gap:4px;padding:4px}
    figure{margin:0}img{display:block;width:100%}figcaption{padding:2px 4px}</style><main>${cells}</main>`;
  const browser = await chromium.launch({ headless: true });
  try {
    const gridWidth = Number(values.columns) * (Number(values.width) + 4) + 4;
    const page = await browser.newPage({ viewport: { width: gridWidth, height: 800 } });
    await page.setContent(html);
    await page.locator("main").screenshot({ path: sheetPath, type: "jpeg", quality: 85 });
  } finally {
    await browser.close();
  }
}

const fps = Number(values.fps);
const videoPath = path.resolve(values.video);
const sheetPath = path.resolve(values.out);
const { durationSeconds } = probeVideo(videoPath);
const frameNumbers = buildFrameNumbers();
const scratchDir = await mkdtemp(path.join(os.tmpdir(), "animation-observation-"));
try {
  const framePaths = frameNumbers.map((frame, index) => {
    const framePath = path.join(scratchDir, `${String(index).padStart(4, "0")}.jpg`);
    extractFrameJpeg(videoPath, frame, fps, framePath, Number(values.width));
    return framePath;
  });
  await drawContactSheet(framePaths, frameNumbers.map((frame) => buildFrameLabel(frame, fps)));
  console.log(`duration ${durationSeconds}s, ${frameNumbers.length} frames -> ${sheetPath}`);
} finally {
  await rm(scratchDir, { recursive: true, force: true });
}
