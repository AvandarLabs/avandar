import type { Input } from "./AidCargoModeHandoff.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  carriers: [
    {
      id: "river",
      mode: "boat",
      handoffLabel: "Example dock",
    },
    {
      id: "road",
      mode: "truck",
      handoffLabel: "Example transfer",
    },
    {
      id: "local",
      mode: "cargo-bike",
      handoffLabel: "Willow store",
    },
  ],
  parcels: [
    {
      id: "a",
      label: "Sample food parcel",
      symbol: "grain",
    },
    {
      id: "b",
      label: "Sample blanket pack",
      symbol: "blanket",
    },
  ],
  transferMethod: "hoist-and-cart",
  receivingLabel: "Community receiving team",
  showParcelLabels: true,
  scenarioCaption: "Fictional load and journey",
};
/** Changed author input used by the behavioral test. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  transferMethod: "handcart",
  showParcelLabels: false,
};
/** Rejected incomplete, unknown and invalid authored inputs. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, unexpected: true },
  {},
  {
    ...DEFAULT_INPUT,
    parcels: [DEFAULT_INPUT.parcels[0], DEFAULT_INPUT.parcels[0]],
  },
];

/** Smallest accepted collection example, including literal empty IDs. */
export const MINIMUM_INPUT: Input = {
  carriers: [
    { id: "", mode: "truck", handoffLabel: "" },
    { id: "路 2", mode: "cargo-bike", handoffLabel: "" },
  ],
  parcels: [{ id: "", label: "", symbol: "tool" }],
  transferMethod: "handcart",
  receivingLabel: "Community receiving team",
  showParcelLabels: false,
  scenarioCaption: "Fictional load and journey",
};
/** Maximum density with full accepted display text. */
export const DENSE_INPUT: Input = {
  carriers: [
    { id: "river", mode: "boat", handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW" },
    { id: "road", mode: "truck", handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW" },
    {
      id: "local",
      mode: "cargo-bike",
      handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
    },
  ],
  parcels: [
    { id: "0", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
    { id: "1", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "blanket" },
    { id: "2", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "tool" },
    { id: "3", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
  ],
  transferMethod: "hoist-and-cart",
  receivingLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  showParcelLabels: true,
  scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
};
/** Default, minimal, dense, changed and semantic edge cases. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: changedInput },
  {
    id: "boat-truck",
    input: {
      carriers: [
        { id: "0", mode: "boat", handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW" },
        { id: "1", mode: "truck", handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW" },
      ],
      parcels: [
        { id: "0", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
        { id: "1", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "blanket" },
        { id: "2", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "tool" },
        { id: "3", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
      ],
      transferMethod: "handcart",
      receivingLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      showParcelLabels: false,
      scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    id: "boat-cargo-bike",
    input: {
      carriers: [
        { id: "0", mode: "boat", handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW" },
        {
          id: "1",
          mode: "cargo-bike",
          handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
      ],
      parcels: [
        { id: "0", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
        { id: "1", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "blanket" },
        { id: "2", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "tool" },
        { id: "3", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
      ],
      transferMethod: "handcart",
      receivingLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      showParcelLabels: false,
      scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    id: "truck-cargo-bike",
    input: {
      carriers: [
        { id: "0", mode: "truck", handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW" },
        {
          id: "1",
          mode: "cargo-bike",
          handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
      ],
      parcels: [
        { id: "0", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
        { id: "1", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "blanket" },
        { id: "2", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "tool" },
        { id: "3", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
      ],
      transferMethod: "handcart",
      receivingLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      showParcelLabels: false,
      scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    id: "cargo-bike-truck",
    input: {
      carriers: [
        {
          id: "0",
          mode: "cargo-bike",
          handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
        { id: "1", mode: "truck", handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW" },
      ],
      parcels: [
        { id: "0", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
        { id: "1", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "blanket" },
        { id: "2", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "tool" },
        { id: "3", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
      ],
      transferMethod: "handcart",
      receivingLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      showParcelLabels: false,
      scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    id: "truck-cargo-bike-truck",
    input: {
      carriers: [
        { id: "0", mode: "truck", handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW" },
        {
          id: "1",
          mode: "cargo-bike",
          handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
        { id: "2", mode: "truck", handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW" },
      ],
      parcels: [
        { id: "0", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
        { id: "1", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "blanket" },
        { id: "2", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "tool" },
        { id: "3", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
      ],
      transferMethod: "handcart",
      receivingLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      showParcelLabels: false,
      scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    id: "cargo-bike-truck-cargo-bike",
    input: {
      carriers: [
        {
          id: "0",
          mode: "cargo-bike",
          handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
        { id: "1", mode: "truck", handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW" },
        {
          id: "2",
          mode: "cargo-bike",
          handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
      ],
      parcels: [
        { id: "0", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
        { id: "1", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "blanket" },
        { id: "2", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "tool" },
        { id: "3", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
      ],
      transferMethod: "handcart",
      receivingLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      showParcelLabels: false,
      scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
  {
    id: "boat-cargo-bike-truck",
    input: {
      carriers: [
        { id: "0", mode: "boat", handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW" },
        {
          id: "1",
          mode: "cargo-bike",
          handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
        },
        { id: "2", mode: "truck", handoffLabel: "WWWWWWWWWWWWWWWWWWWWWWWW" },
      ],
      parcels: [
        { id: "0", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
        { id: "1", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "blanket" },
        { id: "2", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "tool" },
        { id: "3", label: "WWWWWWWWWWWWWWWWWWWWWWWWWW", symbol: "grain" },
      ],
      transferMethod: "handcart",
      receivingLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      showParcelLabels: false,
      scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    },
  },
];
