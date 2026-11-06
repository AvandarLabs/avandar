import type { ScanLinesInput } from "./ScanLines.schema";

/** Complete fictional example used only when input is omitted. */
export const SCAN_LINES_DEFAULT_INPUT: ScanLinesInput = {
  fields: [
    "record / alpha",
    "record / beta",
    "record / gamma",
    "record / delta",
    "record / epsilon",
    "record / zeta",
  ],
  showChecks: true,
};

/** The maximum supported collection density in the authored layout. */
export const scanLinesDenseInput: ScanLinesInput = {
  ...SCAN_LINES_DEFAULT_INPUT,
};

/** A complete smaller or differently selected authored example. */
export const scanLinesChangedInput: ScanLinesInput = {
  ...SCAN_LINES_DEFAULT_INPUT,
  fields: ["case / one", "case / two"],
  showChecks: false,
};

/** Named examples available to editors and semantic regression checks. */
export const scanLinesFixtures: Array<{
  id: string;
  input: { fields: string[]; showChecks: boolean };
}> = [
  { id: "default", input: SCAN_LINES_DEFAULT_INPUT },
  { id: "dense", input: scanLinesDenseInput },
  { id: "changed", input: scanLinesChangedInput },
];
