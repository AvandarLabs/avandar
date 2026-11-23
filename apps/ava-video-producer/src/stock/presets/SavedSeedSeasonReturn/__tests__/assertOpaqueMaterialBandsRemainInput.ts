import { fixtures } from "../SavedSeedSeasonReturn.fixtures";
import { assertOpaqueMaterialBandsRemainFrame as _assertOpaqueMaterialBandsRemainFrame } from "./assertOpaqueMaterialBandsRemainFrame";

/**
 * Asserts opaque material bands remain disjoint and visible across
 * fractional transfers.
 */
export function assertOpaqueMaterialBandsRemainInput(
  input: (typeof fixtures)[number]["input"],
): void {
  Array.from({ length: 270 }, (_, index) => {
    return 12 + index / 2;
  }).forEach((frame) => {
    return _assertOpaqueMaterialBandsRemainFrame({ frame, input });
  });
}
