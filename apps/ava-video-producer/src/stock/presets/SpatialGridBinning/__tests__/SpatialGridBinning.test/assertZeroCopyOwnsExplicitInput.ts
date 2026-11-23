import { DEFAULT_INPUT, fixtures } from "../../SpatialGridBinning.fixtures";
import { assertZeroCopyOwnsExplicitFrame as _assertZeroCopyOwnsExplicitFrame } from "./assertZeroCopyOwnsExplicitFrame";

/**
 * Asserts zero copy owns an explicit zero sample even when every observed
 * cell is nonzero.
 */
export function assertZeroCopyOwnsExplicitInput(
  input: Readonly<
    | typeof DEFAULT_INPUT
    | NonNullable<typeof fixtures>[number]["input"]
    | (Omit<typeof DEFAULT_INPUT, "points"> & {
        points: Array<{ id: string; x: number; y: number }>;
      })
  >,
): void {
  [36, 80, 150].forEach((frame) => {
    return _assertZeroCopyOwnsExplicitFrame({ frame, input });
  });
}
