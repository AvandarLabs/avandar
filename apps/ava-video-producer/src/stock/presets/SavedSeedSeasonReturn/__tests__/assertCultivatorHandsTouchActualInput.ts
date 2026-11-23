import { defaultInput, fixtures } from "../SavedSeedSeasonReturn.fixtures";
import { assertCultivatorHandsTouchActualFrame as _assertCultivatorHandsTouchActualFrame } from "./assertCultivatorHandsTouchActualFrame";

/**
 * Asserts cultivator hands touch the actual transferred lot after the jar
 * opening.
 */
export function assertCultivatorHandsTouchActualInput(
  input: typeof defaultInput | NonNullable<typeof fixtures>[number]["input"],
): void {
  [18, 24, 36, 48, 80, 87, 95, 125, 132, 140].forEach((frame) => {
    return _assertCultivatorHandsTouchActualFrame({ frame, input });
  });
}
