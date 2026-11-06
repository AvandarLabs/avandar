import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "@playwright/test";
import ffmpegStatic from "ffmpeg-static";
import { requireLicense } from "./require-license.mjs";

requireLicense();
const ffmpeg =
  process.env.FFMPEG_BIN ||
  (ffmpegStatic && existsSync(ffmpegStatic) ? ffmpegStatic : "ffmpeg");

/** Measures cursor destinations from the running rendered product components. */
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const url = new URL(option("--url", "http://localhost:4175"));
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
  throw new Error(
    "Cursor measurement is restricted to the local review server.",
  );
}
const output = resolve(option("--output", "src/avandar/cursor-targets.json"));
const reportDirectory = resolve(
  option("--report-dir", "out/component-review/measurement"),
);
const settleMs = Number(option("--settle-ms", "700"));
if (!Number.isFinite(settleMs) || settleMs < 100 || settleMs > 2000) {
  throw new Error("--settle-ms must be between 100 and 2000.");
}
const requestedFeatures = option("--features", "").split(",").filter(Boolean);
if (requestedFeatures.length && !args.includes("--output")) {
  throw new Error(
    "--features requires an explicit --output so a partial run cannot replace the complete cursor plan.",
  );
}
const shouldCheckDeterminism = !args.includes("--skip-determinism");
const fixedFrames = {
  import: [160, 350, 550],
  explorer: [160, 460, 719],
  dashboards: [190, 380, 600],
  cases: [180, 390, 600],
  map: [140, 460, 650],
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Report every pixel difference, including compositor antialiasing at rounded edges. */
function comparePixels(first, second) {
  if (first.equals(second))
    return { changedPixels: 0, maxChannelDelta: 0, bounds: null };
  const decode = (input) =>
    execFileSync(
      ffmpeg,
      [
        "-v",
        "error",
        "-i",
        "pipe:0",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgba",
        "pipe:1",
      ],
      { input, maxBuffer: 16 * 1024 * 1024 },
    );
  const left = decode(first);
  const right = decode(second);
  if (left.length !== right.length)
    throw new Error("Determinism images have different dimensions.");
  let changedPixels = 0;
  let maxChannelDelta = 0;
  let leftmost = 1600;
  let topmost = 840;
  let rightmost = 0;
  let bottommost = 0;
  for (let offset = 0; offset < left.length; offset += 4) {
    const delta = Math.max(
      ...[0, 1, 2, 3].map((channel) =>
        Math.abs(left[offset + channel] - right[offset + channel]),
      ),
    );
    if (delta === 0) continue;
    changedPixels += 1;
    maxChannelDelta = Math.max(maxChannelDelta, delta);
    const pixel = offset / 4;
    const x = pixel % 1600;
    const y = Math.floor(pixel / 1600);
    leftmost = Math.min(leftmost, x);
    topmost = Math.min(topmost, y);
    rightmost = Math.max(rightmost, x);
    bottommost = Math.max(bottommost, y);
  }
  return {
    changedPixels,
    maxChannelDelta,
    bounds: changedPixels
      ? {
          x: leftmost,
          y: topmost,
          width: rightmost - leftmost + 1,
          height: bottommost - topmost + 1,
        }
      : null,
  };
}
await mkdir(reportDirectory, { recursive: true });
const errors = [];
const unresolved = [];
const targets = {};
const determinism = [];
const seeks = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1600, height: 840 },
  deviceScaleFactor: 1,
});
page.on("pageerror", (error) =>
  errors.push({ type: "pageerror", message: String(error) }),
);
page.on("console", (message) => {
  if (message.type() === "error")
    errors.push({ type: "console", message: message.text() });
});

async function load(feature) {
  await page.goto(url.href, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.review));
  if (feature)
    await page.evaluate((value) => window.review.setFeature(value), feature);
  await page.locator(".avandar-film").waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts.ready);
  const rect = await page.locator(".avandar-film").boundingBox();
  if (!rect || rect.width !== 1600 || rect.height !== 840)
    throw new Error("Review stage must be exactly 1600 by 840.");
}

async function seek(frame) {
  const started = performance.now();
  await page.evaluate((value) => window.review.seek(value), frame);
  await page.waitForFunction((value) => window.review.frame() === value, frame);
  // Player acknowledgement can precede the React commit. Let effects register
  // native rendering handles before testing readiness (notably MapLibre idle).
  await page.evaluate(
    () =>
      new Promise((done) =>
        requestAnimationFrame(() => requestAnimationFrame(done)),
      ),
  );
  const ready = (value) =>
    window.review.frame() === value &&
    window.remotion_renderReady === true &&
    (window.remotion_delayRenderHandles?.length ?? 0) === 0;
  await page.waitForFunction(ready, frame);
  await page.waitForTimeout(settleMs);
  await page.waitForFunction(ready, frame);
  // Measure only once target annotations and their actual rendered bounds stay
  // unchanged across three samples. This also catches late widget rerenders.
  let previous;
  let stableSamples = 0;
  let snapshot;
  for (let attempt = 0; attempt < 60 && stableSamples < 3; attempt += 1) {
    snapshot = await page.evaluate(() => ({
      frame: window.review.frame(),
      ready: window.remotion_renderReady,
      handles: window.remotion_delayRenderHandles?.length ?? 0,
      targets: [...document.querySelectorAll("[data-video-target]")].map(
        (element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return {
            target: element.getAttribute("data-video-target"),
            x,
            y,
            width,
            height,
          };
        },
      ),
    }));
    const fingerprint = JSON.stringify(snapshot);
    stableSamples =
      snapshot.frame === frame &&
      snapshot.ready &&
      snapshot.handles === 0 &&
      fingerprint === previous
        ? stableSamples + 1
        : 0;
    previous = fingerprint;
    if (stableSamples < 3) await page.waitForTimeout(50);
  }
  if (stableSamples < 3)
    throw new Error(
      `Frame ${frame} did not reach stable rendered target bounds.`,
    );
  seeks.push({
    frame,
    elapsedMs: Math.round(performance.now() - started),
    ready: snapshot.ready,
    handles: snapshot.handles,
  });
}

async function measure(target) {
  return page.evaluate((targetId) => {
    const stage = document.querySelector(".avandar-film");
    if (!stage) return { reason: "Film stage is absent" };
    const stageRect = stage.getBoundingClientRect();
    const elements = [
      ...document.querySelectorAll("[data-video-target]"),
    ].filter(
      (element) => element.getAttribute("data-video-target") === targetId,
    );
    const rejected = [];
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      const computed = getComputedStyle(element);
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      if (
        rect.width <= 0 ||
        rect.height <= 0 ||
        computed.display === "none" ||
        computed.visibility === "hidden" ||
        Number(computed.opacity) === 0
      ) {
        rejected.push("Hidden or zero-sized element");
        continue;
      }
      if (
        x < stageRect.x ||
        x >= stageRect.right ||
        y < stageRect.y ||
        y >= stageRect.bottom
      ) {
        rejected.push("Element center falls outside the film stage");
        continue;
      }
      const top = document.elementFromPoint(x, y);
      const isCanvasProjection =
        element.getAttribute("data-video-canvas-target") === "true" &&
        computed.pointerEvents === "none" &&
        top instanceof HTMLCanvasElement &&
        element.parentElement?.contains(top);
      if (
        top &&
        !isCanvasProjection &&
        !element.contains(top) &&
        !top.contains(element)
      ) {
        rejected.push(`Center occluded by ${top.tagName}.${top.className}`);
        continue;
      }
      const round = (value) => Math.round(value * 100) / 100;
      return {
        x: round(x - stageRect.x),
        y: round(y - stageRect.y),
        rect: {
          x: round(rect.x - stageRect.x),
          y: round(rect.y - stageRect.y),
          width: round(rect.width),
          height: round(rect.height),
        },
      };
    }
    return {
      reason: elements.length
        ? rejected.join("; ")
        : "No matching data-video-target",
    };
  }, target);
}

try {
  await load();
  const beats = await page.evaluate(() => window.review.beats);
  const features = requestedFeatures.length
    ? requestedFeatures
    : Object.keys(beats);
  for (const feature of features) {
    if (!beats[feature]) throw new Error(`No beat list exists for ${feature}`);
    await load(feature);
    targets[feature] = [];
    for (const beat of beats[feature]) {
      const attempts = [];
      for (const measuredAtFrame of [
        ...new Set([Math.max(0, beat.frame - 1), beat.frame, beat.frame + 1]),
      ]) {
        await seek(measuredAtFrame);
        const measured = await measure(beat.target);
        if ("x" in measured) {
          targets[feature].push({ ...beat, ...measured, measuredAtFrame });
          break;
        }
        attempts.push({ frame: measuredAtFrame, reason: measured.reason });
      }
      if (
        targets[feature].length === 0 ||
        targets[feature].at(-1).frame !== beat.frame
      ) {
        unresolved.push({ feature, ...beat, attempts });
        await page.screenshot({
          path: resolve(
            reportDirectory,
            `${feature}-${beat.frame}-unresolved.png`,
          ),
        });
      }
    }
    console.log(
      `${feature}: ${targets[feature].length}/${beats[feature].length} targets measured`,
    );
    if (!shouldCheckDeterminism) continue;
    for (const frame of fixedFrames[feature] ?? []) {
      await load(feature);
      await seek(frame);
      const direct = await page.locator(".avandar-film").screenshot();
      const state = await page.locator(".avandar-film").innerText();
      // Take a non-sequential route through both earlier and later states.
      await seek(740);
      await seek(17);
      await seek(frame);
      const afterSeeks = await page.locator(".avandar-film").screenshot();
      const afterState = await page.locator(".avandar-film").innerText();
      const pixels = comparePixels(direct, afterSeeks);
      const item = {
        feature,
        frame,
        route: [740, 17, frame],
        identicalPixels: pixels.changedPixels === 0,
        identicalText: state === afterState,
        ...pixels,
        directSha256: hash(direct),
        afterSeeksSha256: hash(afterSeeks),
      };
      determinism.push(item);
      if (!item.identicalPixels || !item.identicalText) {
        await writeFile(
          resolve(reportDirectory, `${feature}-${frame}-direct.png`),
          direct,
        );
        await writeFile(
          resolve(reportDirectory, `${feature}-${frame}-after-seeks.png`),
          afterSeeks,
        );
      }
    }
  }
  await mkdir(dirname(output), { recursive: true });
  // Partial measurements remain review artifacts and cannot replace a complete cursor plan.
  if (!unresolved.length)
    await writeFile(output, `${JSON.stringify(targets, null, 2)}\n`);
  else
    await writeFile(
      resolve(reportDirectory, "partial-cursor-targets.json"),
      `${JSON.stringify(targets, null, 2)}\n`,
    );
} catch (error) {
  errors.push({ type: "measurement", message: String(error) });
  throw error;
} finally {
  await browser.close();
  const report = {
    url: url.href,
    stage: { width: 1600, height: 840 },
    settleMs,
    readiness:
      "Player frame acknowledged, native render handles empty, three stable target-bound samples",
    seeks,
    errors,
    unresolved,
    determinism,
  };
  await writeFile(
    resolve(reportDirectory, "review.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}
const differences = determinism.filter(
  (item) => !item.identicalPixels || !item.identicalText,
);
console.log(
  JSON.stringify({
    output,
    errors: errors.length,
    unresolved: unresolved.length,
    determinismDifferences: differences.length,
  }),
);
if (errors.length || unresolved.length || differences.length)
  process.exitCode = 1;
