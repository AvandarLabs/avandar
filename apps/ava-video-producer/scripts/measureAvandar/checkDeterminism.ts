import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getPixelComparisonFromScreenshots } from "./getPixelComparisonFromScreenshots";
import { ReviewPageDriver } from "./ReviewPageDriver";
import type { MeasurementRun } from "./measureAvandar.types";

function _hash(bytes: Readonly<Buffer>): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Renders `frame` directly and after a non-sequential seek route, compares
 * the two, and records the result in the run. Differing renders are saved
 * as screenshots in the run's report directory.
 */
export async function checkDeterminism(
  run: MeasurementRun,
  options: Readonly<{ url: string; feature: string; frame: number }>,
): Promise<void> {
  const { url, feature, frame } = options;
  const stage = run.page.locator(".avandar-film");
  await ReviewPageDriver.load(run, { url, feature });
  await ReviewPageDriver.seek(run, frame);
  const [direct, directText] = await Promise.all([
    stage.screenshot(),
    stage.innerText(),
  ]);
  // Take a non-sequential route through both earlier and later states.
  await ReviewPageDriver.seek(run, 740);
  await ReviewPageDriver.seek(run, 17);
  await ReviewPageDriver.seek(run, frame);
  const [afterSeeks, afterSeeksText] = await Promise.all([
    stage.screenshot(),
    stage.innerText(),
  ]);
  const pixelComparison = getPixelComparisonFromScreenshots(direct, afterSeeks);
  const determinismResult = {
    feature,
    frame,
    route: [740, 17, frame],
    identicalPixels: pixelComparison.changedPixels === 0,
    identicalText: directText === afterSeeksText,
    ...pixelComparison,
    bounds: pixelComparison.bounds ?? null,
    directSha256: _hash(direct),
    afterSeeksSha256: _hash(afterSeeks),
  };
  run.determinism.push(determinismResult);
  if (!determinismResult.identicalPixels || !determinismResult.identicalText) {
    const prefix = resolve(run.reportDirectory, `${feature}-${frame}`);
    await writeFile(`${prefix}-direct.png`, direct);
    await writeFile(`${prefix}-after-seeks.png`, afterSeeks);
  }
}
