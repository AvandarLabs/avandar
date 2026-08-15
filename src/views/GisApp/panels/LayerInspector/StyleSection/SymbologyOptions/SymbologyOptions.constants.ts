/** Symbology choices in authoring order, including unavailable previews. */
export const SYMBOLOGY_OPTIONS = [
  { type: "circle", isAvailable: true },
  { type: "proportionalSymbol", isAvailable: true },
  { type: "cluster", isAvailable: false },
  { type: "heatmap", isAvailable: false },
] as const;

/** A symbology type currently available for selection. */
export type AvailableSymbologyType = Extract<
  (typeof SYMBOLOGY_OPTIONS)[number],
  { isAvailable: true }
>["type"];
