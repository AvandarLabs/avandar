import type { FitTextSize } from "../../../primitives/FitText/wrapTextToLines";
import type { Input } from "../PooledDonorAllocation.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  labels: Array<[string, number, number, number, FitTextSize, number]>;
};

/**
 * Returns the funding caption text slots and their canvas geometry for
 * `FundingLabels`.
 */
export function getFundingLabelsLayout({
  input,
}: Readonly<Options>): Presentation {
  const labels: Array<[string, number, number, number, FitTextSize, number]> = [
    [input.scenarioCaption, 40, 32, 880, 16, 2],
    [input.labels.pool, 40, 220, 190, 12, 3],
    [input.labels.remaining, 40, 277, 160, 12, 4],
    [input.labels.unit, 40, 548, 430, 12, 1],
    [input.labels.allocated, 500, 548, 420, 12, 1],
    [input.labels.coordinator, 40, 565, 280, 12, 3],
    [input.labels.earmarked, 340, 565, 280, 12, 3],
    [input.labels.flexible, 640, 565, 280, 12, 3],
  ];
  return { input, labels };
}
