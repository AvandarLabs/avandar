#!/usr/bin/env node
/**
 * Measures frames of a video instead of eyeballing them: mean luma, the
 * colour at given points, and the bounding box of content inside a region.
 * Use it to verify spec boxes, cap heights, and text colours, to compare a
 * render against the spec, and to predict frame-gate luma jumps.
 *
 * Usage:
 *   node measure-frame.mjs --video <file.mp4> --probe
 *   node measure-frame.mjs --video <file.mp4> --requests '<json>'
 *
 * `--probe` prints fps, duration, and frame count. `--requests` is a JSON
 * array of `{ frame, points?, box? }`:
 * - `points`: `[[xPct, yPct], ...]`, printed as hex colours.
 * - `box`: `{ x, y, w, h, background: "#rrggbb", tolerance? }` in % of the
 *   frame; prints the box (in % of the frame) of pixels inside it that
 *   differ from `background` by more than `tolerance` (max channel
 *   difference, default 40). Measure a headline's cap height by boxing one
 *   capitalised line.
 * Frame numbers are at the video's own frame rate.
 */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { extractFrameJpeg, probeVideo, requireFromProducer } from "./lib/videoTools.mjs";

const DEFAULT_TOLERANCE = 40;

const { values } = parseArgs({
  options: {
    video: { type: "string" },
    probe: { type: "boolean", default: false },
    requests: { type: "string" },
  },
});
if (!values.video || (!values.probe && !values.requests)) {
  console.error("Usage: measure-frame.mjs --video <file> (--probe | --requests '<json>')");
  process.exit(2);
}

/** Runs in the page: measures one decoded frame image against a request. */
async function measureInPage({ imageData, request, defaultTolerance }) {
  const image = new Image();
  image.src = `data:image/jpeg;base64,${imageData}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  const colorAt = (x, y) => [0, 1, 2].map((channel) => pixels[(y * width + x) * 4 + channel]);
  const toHex = (color) => `#${color.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  const toPercent = (value, total) => Number(((value / total) * 100).toFixed(1));
  let lumaSum = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    lumaSum += 0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];
  }
  const result = { frame: request.frame, luma: Number((lumaSum / (width * height)).toFixed(1)) };
  if (request.points) {
    result.points = request.points.map(([xPercent, yPercent]) => {
      const x = Math.min(width - 1, Math.round((xPercent / 100) * width));
      const y = Math.min(height - 1, Math.round((yPercent / 100) * height));
      return { at: [xPercent, yPercent], hex: toHex(colorAt(x, y)) };
    });
  }
  if (request.box) {
    const { x, y, w, h, background, tolerance = defaultTolerance } = request.box;
    const backgroundColor = [1, 3, 5].map((offset) => parseInt(background.slice(offset, offset + 2), 16));
    const bounds = { left: Infinity, top: Infinity, right: -1, bottom: -1 };
    const [xStart, yStart] = [Math.round((x / 100) * width), Math.round((y / 100) * height)];
    const [xEnd, yEnd] = [Math.round(((x + w) / 100) * width), Math.round(((y + h) / 100) * height)];
    for (let row = yStart; row < Math.min(yEnd, height); row += 1) {
      for (let column = xStart; column < Math.min(xEnd, width); column += 1) {
        const color = colorAt(column, row);
        const difference = Math.max(...color.map((value, channel) => Math.abs(value - backgroundColor[channel])));
        if (difference <= tolerance) continue;
        bounds.left = Math.min(bounds.left, column);
        bounds.right = Math.max(bounds.right, column);
        bounds.top = Math.min(bounds.top, row);
        bounds.bottom = Math.max(bounds.bottom, row);
      }
    }
    result.box =
      bounds.right < 0
        ? null
        : {
            x: toPercent(bounds.left, width),
            y: toPercent(bounds.top, height),
            w: toPercent(bounds.right - bounds.left + 1, width),
            h: toPercent(bounds.bottom - bounds.top + 1, height),
          };
  }
  return result;
}

const probe = probeVideo(values.video);
if (values.probe) {
  console.log(JSON.stringify(probe));
} else {
  const requests = JSON.parse(values.requests);
  const scratchDir = await mkdtemp(path.join(os.tmpdir(), "measure-frame-"));
  const { chromium } = requireFromProducer("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const request of requests) {
      const framePath = path.join(scratchDir, `${request.frame}.jpg`);
      extractFrameJpeg(values.video, request.frame, probe.fps, framePath);
      const imageData = (await readFile(framePath)).toString("base64");
      const result = await page.evaluate(measureInPage, {
        imageData,
        request,
        defaultTolerance: DEFAULT_TOLERANCE,
      });
      console.log(JSON.stringify(result));
    }
  } finally {
    await browser.close();
    await rm(scratchDir, { recursive: true, force: true });
  }
}
