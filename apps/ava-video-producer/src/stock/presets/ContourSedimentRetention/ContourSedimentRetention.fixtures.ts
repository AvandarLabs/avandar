import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./ContourSedimentRetention.schema";
/** Complete fictional default content. */
export const DEFAULT_INPUT: Input = {
  sediment: {
    mobilizedKg: 8,
    retainedKg: 5,
  },
  intervention: {
    kind: "vegetated-strip",
    label: "Installed contour strip",
  },
  boundary: {
    slopeLabel: "Schematic demonstration slope",
    periodLabel: "One fictional runoff event",
  },
  decision: {
    actorLabel: "Land steward",
    actionLabel: "Install contour barrier",
  },
  showExportTray: true,
  copy: {
    mobilized: "Mobilized sediment",
    retained: "Retained within boundary",
    exported: "Exported sediment",
    boundary: "Catchment exit",
    unit: "kg",
    disclaimer: "Fictional mass balance; not a field result",
  },
};
/** A genuinely changed authored scenario. */
export const CHANGED_INPUT: Input = {
  sediment: {
    mobilizedKg: 8,
    retainedKg: 0,
  },
  intervention: {
    kind: "stone-bund",
    label: "Installed contour strip",
  },
  boundary: {
    slopeLabel: "Schematic demonstration slope",
    periodLabel: "One fictional runoff event",
  },
  decision: {
    actorLabel: "Land steward",
    actionLabel: "Install contour barrier",
  },
  showExportTray: true,
  copy: {
    mobilized: "Mobilized sediment",
    retained: "Retained within boundary",
    exported: "Exported sediment",
    boundary: "Catchment exit",
    unit: "kg",
    disclaimer: "Fictional mass balance; not a field result",
  },
};

const minimum: Input = {
  ...DEFAULT_INPUT,
  sediment: { mobilizedKg: 1e-12, retainedKg: 0 },
  showExportTray: false,
};
const dense: Input = {
  ...DEFAULT_INPUT,
  copy: {
    mobilized: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    retained: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    exported: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    boundary: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    unit: "WWWWWWWW",
    disclaimer: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  decision: {
    ...DEFAULT_INPUT.decision,
    actorLabel: "W".repeat(32),
    actionLabel: "W".repeat(32),
  },
  boundary: {
    slopeLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    periodLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  intervention: { ...DEFAULT_INPUT.intervention, label: "W".repeat(30) },
  sediment: { mobilizedKg: 1000, retainedKg: 800 },
};
const extraFixtures: StockContract<Input>["fixtures"] = (
  ["vegetated-strip", "stone-bund"] as const
).flatMap((kind) =>
  [0, 8].flatMap((retainedKg) =>
    [true, false].map((showExportTray) => ({
      id: `${kind}-${retainedKg}-${showExportTray}`,
      input: {
        ...DEFAULT_INPUT,
        sediment: { mobilizedKg: 8, retainedKg },
        intervention: { ...DEFAULT_INPUT.intervention, kind },
        showExportTray,
      },
    })),
  ),
);
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, sediment: { mobilizedKg: 8, retainedKg: 9 } },
  { ...DEFAULT_INPUT, sediment: { mobilizedKg: 0, retainedKg: 0 } },
  {
    ...DEFAULT_INPUT,
    intervention: { ...DEFAULT_INPUT.intervention, extra: true },
  },
];

/** Default, minimum, dense, changed and concentrated/alternate fixtures. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: CHANGED_INPUT },
  ...extraFixtures,
];
