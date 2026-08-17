/** Point symbology choices in authoring order. */
export const SYMBOLOGY_OPTIONS = [
  { type: "circle" },
  { type: "proportionalSymbol" },
  { type: "cluster" },
  { type: "heatmap" },
] as const;

/** A symbology type offered by the point-style control. */
export type AvailableSymbologyType = (typeof SYMBOLOGY_OPTIONS)[number]["type"];
