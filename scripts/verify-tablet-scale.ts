import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const SCREENSHOT_DIR = ".playwright-mcp";
const CHROME_PATH = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE_URL = "http://localhost:5173";

/** A tablet/desktop viewport and its expected `--mantine-scale` tier. */
type Viewport = {
  name: string;
  width: number;
  height: number;
  expectedScale: string;
};

/** A checked viewport: the viewport plus its observed scale and screenshot. */
type ScaleResult = Viewport & {
  observed: string;
  file: string;
};

// Standard tablet/iPad viewport widths. Each maps to the --mantine-scale
// tier defined in src/index.css.
const VIEWPORTS: readonly Viewport[] = [
  { name: "ipad-portrait-768", width: 768, height: 1024, expectedScale: "0.8" },
  { name: "ipad-portrait-810", width: 810, height: 1080, expectedScale: "0.8" },
  {
    name: "ipad-landscape-1024",
    width: 1024,
    height: 768,
    expectedScale: "0.8",
  },
  {
    name: "ipad-landscape-1180",
    width: 1180,
    height: 820,
    expectedScale: "0.8",
  },
  {
    name: "ipad-pro-13-landscape-1366",
    width: 1366,
    height: 1024,
    expectedScale: "0.9",
  },
  { name: "desktop-1440", width: 1440, height: 900, expectedScale: "1" },
  { name: "desktop-1920", width: 1920, height: 1080, expectedScale: "1" },
];

await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  args: ["--no-sandbox"],
});

// One context per viewport, awaited in order so screenshots are captured
// sequentially against a single browser. Sequential awaits are why this is a
// for...of loop rather than a functional map.
const results: ScaleResult[] = [];
for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30_000 });
  // Give the React app a moment to paint after the network settles.
  await page.waitForTimeout(1500);

  const observed = await page.evaluate(() => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue("--mantine-scale")
      .trim();
  });

  const file = path.join(SCREENSHOT_DIR, `${viewport.name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  results.push({ ...viewport, observed, file });

  await context.close();
}
await browser.close();

console.log("\nResults:");
results.forEach((result) => {
  const status = result.observed === result.expectedScale ? "OK" : "MISMATCH";
  console.log(
    `  [${status}] ${result.name.padEnd(28)} expected=${result.expectedScale} observed=${result.observed || "(empty)"}  -> ${result.file}`,
  );
});
