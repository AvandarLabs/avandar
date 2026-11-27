import type { _lossInputs } from "./SavedSeedSeasonReturnTestHelpers";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertLossLidClosesOnlyLidOptions = {
  lid: string;
  left: number;
  lidRight: number;
  right: number;
  top: number;
  loss: string;
  frame: number;
  input: ReturnType<typeof _lossInputs>[number];
};
