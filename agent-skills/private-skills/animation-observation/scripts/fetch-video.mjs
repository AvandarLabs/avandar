#!/usr/bin/env node
/**
 * Downloads a reference video from a web page to an mp4 file.
 *
 * Uses only the Playwright dependency this repository already has: it loads
 * the page in headless Chromium, collects every mp4 the page requests or
 * declares (a `<video>`/`<source>` src, or a player's embedded media JSON),
 * and downloads the highest-resolution one. A direct `.mp4` URL is
 * downloaded as is.
 *
 * Streaming-only pages (HLS/DASH with no mp4 rendition) are not supported.
 * The script then exits non-zero and asks for a local file instead.
 *
 * Usage: node fetch-video.mjs <url> <out.mp4>
 *
 * Put `<out.mp4>` in its own empty directory: downloaded media is untrusted.
 */
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const PAGE_SETTLE_MS = 6000;
const MP4_URL_PATTERN = /\.mp4(\?|$)/;

const [url, outPath] = process.argv.slice(2);
if (!url || !outPath) {
  console.error("Usage: fetch-video.mjs <url> <out.mp4>");
  process.exit(2);
}

const workspaceRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const requireFromProducer = createRequire(
  path.join(workspaceRoot, "apps/ava-video-producer/package.json"),
);

/** Ranks a media URL by the resolution in its name, e.g. `res_1080p`. */
function resolutionOf(mediaUrl) {
  return Number(mediaUrl.match(/(\d{3,4})p/)?.[1] ?? 0);
}

/** Reads mp4 URLs the page declares in video elements and player JSON. */
function readDeclaredMediaUrls() {
  const elementUrls = [...document.querySelectorAll("video, source")]
    .map((element) => element.src || element.getAttribute("src") || "")
    .filter((src) => src.startsWith("http"));
  const playerUrls = [...document.querySelectorAll("[packaged-media-json]")].flatMap(
    (element) => {
      const media = JSON.parse(element.getAttribute("packaged-media-json") ?? "{}");
      return (media.playbackMp4s?.permutations ?? []).map((item) => item.source.url);
    },
  );
  return [...elementUrls, ...playerUrls];
}

/** Loads the page headlessly and returns its mp4 URLs, best first. */
async function findMediaUrls() {
  const { chromium } = requireFromProducer("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: BROWSER_USER_AGENT });
    const mediaUrls = new Set();
    page.on("request", (request) => {
      if (MP4_URL_PATTERN.test(request.url())) mediaUrls.add(request.url());
    });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(PAGE_SETTLE_MS);
    (await page.evaluate(readDeclaredMediaUrls))
      .filter((mediaUrl) => MP4_URL_PATTERN.test(mediaUrl))
      .forEach((mediaUrl) => mediaUrls.add(mediaUrl));
    return [...mediaUrls].sort((left, right) => resolutionOf(right) - resolutionOf(left));
  } finally {
    await browser.close();
  }
}

const [bestUrl] = MP4_URL_PATTERN.test(url) ? [url] : await findMediaUrls();
if (!bestUrl) {
  console.error(
    "No downloadable mp4 found on that page. Ask the user for a local copy of the video.",
  );
  process.exit(1);
}
const response = await fetch(bestUrl, { headers: { "User-Agent": BROWSER_USER_AGENT } });
if (!response.ok) {
  console.error(`Media download failed (${response.status}). Ask the user for a local copy.`);
  process.exit(1);
}
await mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
await writeFile(outPath, Buffer.from(await response.arrayBuffer()));
console.log(`downloaded ${resolutionOf(bestUrl) || "unknown"}p mp4: ${outPath}`);
