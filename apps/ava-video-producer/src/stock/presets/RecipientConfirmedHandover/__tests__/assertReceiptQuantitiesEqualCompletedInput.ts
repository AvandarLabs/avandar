import type { fixtures } from "../RecipientConfirmedHandover.fixtures";
import { assertReceiptQuantitiesEqualCompletedFrame as _assertReceiptQuantitiesEqualCompletedFrame } from "./assertReceiptQuantitiesEqualCompletedFrame";

/**
 * Asserts receipt quantities equal completed physical moves while each
 * offered unit remains singular.
 */
export function assertReceiptQuantitiesEqualCompletedInput(
  input: (typeof fixtures)[number]["input"],
): void {
  Array.from({ length: 90 }, (_, index) => {
    return index * 2;
  }).forEach((frame) => {
    return _assertReceiptQuantitiesEqualCompletedFrame({ frame, input });
  });
}
