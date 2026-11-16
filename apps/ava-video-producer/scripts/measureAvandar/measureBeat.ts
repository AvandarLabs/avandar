import { resolve } from "node:path";
import { getMeasuredTargetFromSnapshot } from "./getMeasuredTargetFromSnapshot";
import { readTargetCandidatesInPage } from "./readTargetCandidatesInPage";
import { ReviewPageDriver } from "./ReviewPageDriver";
import type { ProductBeat } from "../../src/avandar/generated/product";
import type { MeasurementRun } from "./measureAvandar.types";

/**
 * Measures one beat's target at its frame or a neighbouring one, recording
 * the measurement in the run or, when no frame works, the beat as unresolved
 * with a screenshot.
 */
export async function measureBeat(
  run: MeasurementRun,
  options: { feature: string; beat: Readonly<ProductBeat> },
): Promise<void> {
  const { feature, beat } = options;
  const attempts: Array<{ frame: number; reason: string }> = [];
  const frames = [
    ...new Set([Math.max(0, beat.frame - 1), beat.frame, beat.frame + 1]),
  ];
  for (const measuredAtFrame of frames) {
    await ReviewPageDriver.seek(run, measuredAtFrame);
    const measured = getMeasuredTargetFromSnapshot(
      await run.page.evaluate(readTargetCandidatesInPage, beat.target),
    );
    if ("x" in measured) {
      run.targets[feature].push({ ...beat, ...measured, measuredAtFrame });
      return;
    }
    attempts.push({ frame: measuredAtFrame, reason: measured.reason });
  }
  run.unresolved.push({ feature, ...beat, attempts });
  await run.page.screenshot({
    path: resolve(
      run.reportDirectory,
      `${feature}-${beat.frame}-unresolved.png`,
    ),
  });
}
