import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./CarbonStorageAccounting.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  capture: {
    capturedTonnesCO2: 12,
    releasedTonnesCO2: 1,
  },
  operatingEmissions: [
    {
      id: "power",
      label: "Operating energy",
      tonnesCO2e: 2,
    },
  ],
  boundary: {
    label: "Fictional capture batch",
    periodLabel: "One reporting period",
    includedActivities: "Capture, transfer, storage",
  },
  decision: {
    actorLabel: "Site operator",
    actionLabel: "Authorize storage transfer",
  },
  showNetAccounting: true,
  view: "cutaway",
  copy: {
    air: "Atmosphere",
    capture: "Captured",
    retained: "Retained this period",
    released: "Released again",
    operations: "Operating emissions",
    net: "Net accounting result",
    massUnit: "t CO2",
    accountingUnit: "t CO2e",
    disclaimer: "Fictional accounting example",
  },
};
/** Smallest accepted example, including literal empty identifiers. */
export const MINIMUM_INPUT: Input = {
  capture: {
    capturedTonnesCO2: 5e-324,
    releasedTonnesCO2: 0,
  },
  operatingEmissions: [
    {
      id: "",
      label: "",
      tonnesCO2e: 0,
    },
  ],
  boundary: {
    label: "Fictional capture batch",
    periodLabel: "One reporting period",
    includedActivities: "Capture, transfer, storage",
  },
  decision: {
    actorLabel: "Site operator",
    actionLabel: "Authorize storage transfer",
  },
  showNetAccounting: true,
  view: "cutaway",
  copy: {
    air: "Atmosphere",
    capture: "Captured",
    retained: "Retained this period",
    released: "Released again",
    operations: "Operating emissions",
    net: "Net accounting result",
    massUnit: "t CO2",
    accountingUnit: "t CO2e",
    disclaimer: "Fictional accounting example",
  },
};
/** Maximum collection density and accepted display lengths. */
export const DENSE_INPUT: Input = {
  capture: {
    capturedTonnesCO2: 1.0000000000000002e-6,
    releasedTonnesCO2: 0,
  },
  operatingEmissions: [
    {
      id: "0",
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      tonnesCO2e: 1.0000000000000002e-6,
    },
    {
      id: "1",
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      tonnesCO2e: 1000,
    },
    {
      id: "2",
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      tonnesCO2e: 1000,
    },
  ],
  boundary: {
    label: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    periodLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    includedActivities: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  decision: {
    actorLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    actionLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  showNetAccounting: true,
  view: "cutaway",
  copy: {
    air: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    capture: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    retained: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    released: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    operations: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    net: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    massUnit: "WWWWWWWWWW",
    accountingUnit: "WWWWWWWWWW",
    disclaimer: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
};
/** Changed authored choices, quantities and optional presentation. */
export const CHANGED_INPUT: Input = {
  capture: {
    capturedTonnesCO2: 1,
    releasedTonnesCO2: 1,
  },
  operatingEmissions: [
    {
      id: "0",
      label: "Operating source 0",
      tonnesCO2e: 1,
    },
    {
      id: "1",
      label: "Operating source 1",
      tonnesCO2e: 2,
    },
    {
      id: "2",
      label: "Operating source 2",
      tonnesCO2e: 3,
    },
  ],
  boundary: {
    label: "Fictional capture batch",
    periodLabel: "One reporting period",
    includedActivities: "Capture, transfer, storage",
  },
  decision: {
    actorLabel: "Site operator",
    actionLabel: "Authorize storage transfer",
  },
  showNetAccounting: true,
  view: "above-ground-vessel",
  copy: {
    air: "Atmosphere",
    capture: "Captured",
    retained: "Retained this period",
    released: "Released again",
    operations: "Operating emissions",
    net: "Net accounting result",
    massUnit: "t CO2",
    accountingUnit: "t CO2e",
    disclaimer: "Fictional accounting example",
  },
};
/** Invalid complete documents and malformed collections. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  { ...DEFAULT_INPUT, operatingEmissions: [] },
  { ...DEFAULT_INPUT, capture: { capturedTonnesCO2: 0, releasedTonnesCO2: 0 } },
  { ...DEFAULT_INPUT, capture: { capturedTonnesCO2: 1, releasedTonnesCO2: 2 } },
  {
    ...DEFAULT_INPUT,
    operatingEmissions: [
      DEFAULT_INPUT.operatingEmissions[0],
      DEFAULT_INPUT.operatingEmissions[0],
    ],
  },
  {
    ...DEFAULT_INPUT,
    capture: {
      capturedTonnesCO2: Number.POSITIVE_INFINITY,
      releasedTonnesCO2: 0,
    },
  },
  {
    ...DEFAULT_INPUT,
    operatingEmissions: [
      { ...DEFAULT_INPUT.operatingEmissions[0], extra: true },
      ...DEFAULT_INPUT.operatingEmissions.slice(1),
    ],
  },
];

/** Maximum capture entirely released, retaining zero operating emissions. */
export const allReleasedInput: Input = {
  ...DEFAULT_INPUT,
  capture: { capturedTonnesCO2: 1000, releasedTonnesCO2: 1000 },
  operatingEmissions: [{ id: "", label: "Zero operations", tonnesCO2e: 0 }],
  showNetAccounting: false,
};
/** A full finite signed fractional value alongside maximum authored labels. */
export const fractionalNegativeInput: Input = {
  ...DENSE_INPUT,
  operatingEmissions: DENSE_INPUT.operatingEmissions.map((row, index) => ({
    ...row,
    tonnesCO2e: index === 0 ? 0.0000020000000000000003 : 0,
  })),
};

/** Stable complete accepted examples. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: CHANGED_INPUT },
  { id: "allReleased", input: allReleasedInput },
  { id: "fractionalNegative", input: fractionalNegativeInput },
];
