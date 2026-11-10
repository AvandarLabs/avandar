#!/usr/bin/env node
/**
 * Downloads a reference video to an mp4 file.
 *
 * Tries `yt-dlp` first. When a site demands a login for anonymous downloads
 * (Reddit does), it falls back to loading the page in headless Chromium and
 * taking the highest-resolution mp4 the page's player exposes.
 *
 * Usage: node fetch-video.mjs <url> <out.mp4>
 *
 * Put `<out.mp4>` in its own empty directory: downloaded media is untrusted.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const PAGE_SETTLE_MS = 6000;
const MEDIA_URL_PATTERN = /\.mp4(\?|$)/;

const [url, outPath] = process.argv.slice(2);
if (!url || !outPath) {
  console.error("Usage: fetch-video.mjs <url> <out.mp4>");
  process.exit(2);
}

/** Returns true when yt-dlp produced the file. */
function tryYtDlp() {
  try {
    execFileSync(
      "yt-dlp",
      ["-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b", "--merge-output-format", "mp4", "-o", outPath, url],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    return existsSync(outPath);
  } catch {
    return false;
  }
}

/** Ranks a media URL by the resolution in its name, e.g. `res_1080p`. */
function resolutionOf(mediaUrl) {
  return Number(mediaUrl.match(/(\d{3,4})p/)?.[1] ?? 0);
}

/** Loads the page headlessly and collects mp4 URLs from requests and player JSON. */
async function findMediaUrlsInBrowser() {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: BROWSER_USER_AGENT });
    const mediaUrls = new Set();
    page.on("request", (request) => {
      if (MEDIA_URL_PATTERN.test(request.url())) mediaUrls.add(request.url());
    });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(PAGE_SETTLE_MS);
    const embeddedUrls = await page.evaluate(() =>
      [...document.querySelectorAll("[packaged-media-json]")].flatMap((element) => {
        const media = JSON.parse(element.getAttribute("packaged-media-json") ?? "{}");
        return (media.playbackMp4s?.permutations ?? []).map((item) => item.source.url);
      }),
    );
    embeddedUrls.forEach((embeddedUrl) => mediaUrls.add(embeddedUrl));
    return [...mediaUrls].sort((left, right) => resolutionOf(right) - resolutionOf(left));
  } finally {
    await browser.close();
  }
}

if (tryYtDlp()) {
  console.log(`downloaded with yt-dlp: ${outPath}`);
} else {
  const [bestUrl] = await findMediaUrlsInBrowser();
  if (!bestUrl) throw new Error("No mp4 found on the page. Ask the user for the file.");
  const response = await fetch(bestUrl, { headers: { "User-Agent": BROWSER_USER_AGENT } });
  if (!response.ok) throw new Error(`Media download failed (${response.status})`);
  await writeFile(outPath, Buffer.from(await response.arrayBuffer()));
  console.log(`downloaded from page player: ${outPath}`);
}
