import type { StockContract } from "../../contracts/StockContract.types";
import type { DotMatrixInput } from "./DotMatrix.schema";

/** Complete fictional example used only when input is omitted. */
export const DOT_MATRIX_DEFAULT_INPUT: DotMatrixInput = {
  groups: [
    { label: "selected", value: 64, selected: true },
    { label: "remaining", value: 36, selected: false },
  ],
  heading: "One dot. One example.",
  cohortLabel: "Sample cohort",
  showLegend: true,
};

/** The maximum supported collection density in the authored layout. */
export const dotMatrixDenseInput: DotMatrixInput = {
  ...DOT_MATRIX_DEFAULT_INPUT,
  groups: [
    { label: "selected", value: 25, selected: true },
    { label: "remaining", value: 25, selected: false },
    { label: "reviewed", value: 25, selected: true },
    { label: "queued", value: 25, selected: false },
  ],
};

/** A complete smaller or differently selected authored example. */
export const dotMatrixChangedInput: DotMatrixInput = {
  ...DOT_MATRIX_DEFAULT_INPUT,
  groups: [
    { label: "included", value: 3, selected: true },
    { label: "remaining", value: 2, selected: false },
  ],
  heading: "Five authored examples",
  cohortLabel: "Authored cohort",
  showLegend: false,
};

/** Named examples available to editors and semantic regression checks. */
export const dotMatrixFixtures: StockContract<
  typeof DOT_MATRIX_DEFAULT_INPUT
>["fixtures"] = [
  { id: "default", input: DOT_MATRIX_DEFAULT_INPUT },
  { id: "dense", input: dotMatrixDenseInput },
  { id: "changed", input: dotMatrixChangedInput },
];
