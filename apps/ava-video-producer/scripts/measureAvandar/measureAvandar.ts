import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { requireLicense } from "../requireLicense";
import { checkDeterminism } from "./checkDeterminism";
import { STAGE } from "./measureAvandar.constants";
import { measureBeat } from "./measureBeat";
import { ReviewPageDriver } from "./ReviewPageDriver";
import type {
  ProductBeat,
  ProductFeature,
} from "../../src/avandar/generated/product";
import type { MeasurementRun, ReviewWindow } from "./measureAvandar.types";
import type { Browser } from "@playwright/test";

// `pnpm component:measure`: measures cursor destinations from the running
// `component:review` page and checks that seeking renders deterministically.
// Usage: component:measure [--url <review-url>] [--output <file>]
//          [--report-dir <dir>] [--settle-ms <ms>] [--features a,b]
//          [--skip-determinism]

/** Command-line options after validation and defaults. */
type MeasureOptions = {
  url: URL;
  output: string;
  reportDirectory: string;
  settleMs: number;
  requestedFeatures: string[];
  shouldCheckDeterminism: boolean;
};

/** Frames each feature's determinism check renders directly and after seeks. */
const FIXED_FRAMES: Partial<Record<string, number[]>> = {
  import: [160, 350, 550],
  explorer: [160, 460, 719],
  dashboards: [190, 380, 600],
  cases: [180, 390, 600],
  map: [140, 460, 650],
} satisfies Partial<Record<ProductFeature, number[]>>;

/** Command-line options with their defaults. */
function _readOptions(args: readonly string[]): MeasureOptions {
  const option = (name: string, fallback: string) => {
    const index = args.indexOf(name);
    return index < 0 ? fallback : args[index + 1];
  };
  const url = new URL(option("--url", "http://localhost:4175"));
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error(
      "Cursor measurement is restricted to the local review server.",
    );
  }
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
  return {
    url,
    output: resolve(option("--output", "src/avandar/cursor-targets.json")),
    reportDirectory: resolve(
      option("--report-dir", "out/component-review/measurement"),
    ),
    settleMs,
    requestedFeatures,
    shouldCheckDeterminism: !args.includes("--skip-determinism"),
  };
}

/** Measures every beat of `feature`, then checks its fixed frames. */
async function _measureFeature(
  run: MeasurementRun,
  options: {
    measureOptions: Readonly<MeasureOptions>;
    feature: string;
    beats: Readonly<Record<string, ProductBeat[]>>;
  },
): Promise<void> {
  const { measureOptions, feature, beats } = options;
  if (!beats[feature]) {
    throw new Error(`No beat list exists for ${feature}`);
  }
  await ReviewPageDriver.load(run, { url: measureOptions.url.href, feature });
  run.targets[feature] = [];
  for (const beat of beats[feature]) {
    await measureBeat(run, { feature, beat });
  }
  console.log(
    `${feature}: ${run.targets[feature].length}/${beats[feature].length} targets measured`,
  );
  if (!measureOptions.shouldCheckDeterminism) {
    return;
  }
  for (const frame of FIXED_FRAMES[feature] ?? []) {
    await checkDeterminism(run, {
      url: measureOptions.url.href,
      feature,
      frame,
    });
  }
}

async function _measureAllFeatures(
  run: MeasurementRun,
  measureOptions: Readonly<MeasureOptions>,
): Promise<void> {
  await ReviewPageDriver.load(run, { url: measureOptions.url.href });
  const beats = await run.page.evaluate(
    () => (window as ReviewWindow).review.beats,
  );
  const features = measureOptions.requestedFeatures.length
    ? measureOptions.requestedFeatures
    : Object.keys(beats);
  for (const feature of features) {
    await _measureFeature(run, { measureOptions, feature, beats });
  }
  await mkdir(dirname(measureOptions.output), { recursive: true });
  // Partial measurements remain review artifacts and cannot replace a
  // complete cursor plan.
  const targetsJson = `${JSON.stringify(run.targets, null, 2)}\n`;
  await writeFile(
    run.unresolved.length
      ? resolve(run.reportDirectory, "partial-cursor-targets.json")
      : measureOptions.output,
    targetsJson,
  );
}

async function _writeReport(
  run: Readonly<MeasurementRun>,
  options: Readonly<MeasureOptions>,
): Promise<void> {
  const report = {
    url: options.url.href,
    stage: STAGE,
    settleMs: options.settleMs,
    readiness:
      "Player frame acknowledged, native render handles empty, three stable target-bound samples",
    seeks: run.seeks,
    errors: run.errors,
    unresolved: run.unresolved,
    determinism: run.determinism,
  };
  await writeFile(
    resolve(run.reportDirectory, "review.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

/** Opens a headless page that records console and page errors into `errors`. */
async function _openRun(
  options: Readonly<MeasureOptions>,
): Promise<{ browser: Browser; run: MeasurementRun }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: STAGE, deviceScaleFactor: 1 });
  const run: MeasurementRun = {
    page,
    settleMs: options.settleMs,
    reportDirectory: options.reportDirectory,
    errors: [],
    unresolved: [],
    targets: {},
    determinism: [],
    seeks: [],
  };
  page.on("pageerror", (error) => {
    run.errors.push({ type: "pageerror", message: String(error) });
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      run.errors.push({ type: "console", message: message.text() });
    }
  });
  return { browser, run };
}

async function _measure(options: Readonly<MeasureOptions>): Promise<void> {
  await mkdir(options.reportDirectory, { recursive: true });
  const { browser, run } = await _openRun(options);
  try {
    await _measureAllFeatures(run, options);
  } catch (error) {
    run.errors.push({ type: "measurement", message: String(error) });
    throw error;
  } finally {
    await browser.close();
    await _writeReport(run, options);
  }
  const differences = run.determinism.filter(
    (result) => !result.identicalPixels || !result.identicalText,
  );
  console.log(
    JSON.stringify({
      output: options.output,
      errors: run.errors.length,
      unresolved: run.unresolved.length,
      determinismDifferences: differences.length,
    }),
  );
  if (run.errors.length || run.unresolved.length || differences.length) {
    process.exitCode = 1;
  }
}

requireLicense();
await _measure(_readOptions(process.argv.slice(2)));
