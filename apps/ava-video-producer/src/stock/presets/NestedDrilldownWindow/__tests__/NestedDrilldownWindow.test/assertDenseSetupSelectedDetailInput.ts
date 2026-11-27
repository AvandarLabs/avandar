import { assertDenseSetupSelectedDetailFrame as _assertDenseSetupSelectedDetailFrame } from "./assertDenseSetupSelectedDetailFrame";
import type { fixtures } from "../../NestedDrilldownWindow.fixtures";

/**
 * Asserts dense setup and selected detail geometry stays bounded through
 * both narrowing beats.
 */
export function assertDenseSetupSelectedDetailInput(
  input: NonNullable<typeof fixtures>[number]["input"],
): void {
  return [36, 40, 58, 74, 92, 118, 150].forEach((frame) => {
    return _assertDenseSetupSelectedDetailFrame({ frame, input });
  });
}
