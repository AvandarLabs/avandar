import { assertOneCoordinatorSlidesConfiguredHand as _assertOneCoordinatorSlidesConfiguredHand } from "./assertOneCoordinatorSlidesConfiguredHand";
import type { fixtures } from "../PooledDonorAllocation.fixtures";

/**
 * Asserts one coordinator slides each configured request batch with a
 * connected scoop.
 */
export function assertOneCoordinatorSlidesConfiguredInput(
  input: (typeof fixtures)[number]["input"],
): void {
  input.requests.forEach((_, index) => {
    return _assertOneCoordinatorSlidesConfiguredHand({ _, index, input });
  });
}
