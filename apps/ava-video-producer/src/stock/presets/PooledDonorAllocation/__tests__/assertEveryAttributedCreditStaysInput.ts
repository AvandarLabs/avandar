import { fixtures } from "../PooledDonorAllocation.fixtures";
import { assertEveryAttributedCreditStaysFrame as _assertEveryAttributedCreditStaysFrame } from "./assertEveryAttributedCreditStaysFrame";

/**
 * Asserts every attributed credit stays singular, restricted and visibly
 * above its envelope.
 */
export function assertEveryAttributedCreditStaysInput(
  input: (typeof fixtures)[number]["input"],
): void {
  Array.from({ length: 90 }, (_, index) => {
    return index * 2;
  }).forEach((frame) => {
    return _assertEveryAttributedCreditStaysFrame({ frame, input });
  });
}
