import { assertEveryPhysicalUnitStaysFrame as _assertEveryPhysicalUnitStaysFrame } from "./assertEveryPhysicalUnitStaysFrame";
import type { fixtures } from "../../RetailShelfReplenishment.fixtures";

/**
 * Asserts every physical unit stays unique and handled units contact the
 * active actor hand.
 */
export function assertEveryPhysicalUnitStaysInput(
  input: (typeof fixtures)[number]["input"],
): void {
  return Array.from({ length: 180 }, (_, frame) => {
    return frame;
  }).forEach((frame) => {
    return _assertEveryPhysicalUnitStaysFrame({ frame, input });
  });
}
