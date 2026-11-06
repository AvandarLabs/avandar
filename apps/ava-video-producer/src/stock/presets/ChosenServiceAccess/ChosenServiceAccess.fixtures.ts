import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./ChosenServiceAccess.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  services: [
    {
      id: "shelter",
      label: "Example shelter desk",
      symbol: "shelter",
    },
    {
      id: "information",
      label: "Example information",
      symbol: "information",
    },
  ],
  chosenServiceId: "shelter",
  accessChange: "unfold-ramp",
  participantMobility: "wheelchair",
  labels: {
    participant: "Example participant",
    staff: "Service team",
    choice: "Chosen service",
  },
  showChoiceLabel: true,
  scenarioCaption: "Fictional access example",
};
/** Smallest accepted example, including literal empty identifiers. */
export const MINIMUM_INPUT: Input = {
  services: [
    {
      id: "",
      label: "",
      symbol: "water",
    },
    {
      id: "路 2",
      label: "",
      symbol: "shelter",
    },
  ],
  chosenServiceId: "",
  accessChange: "unfold-ramp",
  participantMobility: "wheelchair",
  labels: {
    participant: "Example participant",
    staff: "Service team",
    choice: "Chosen service",
  },
  showChoiceLabel: true,
  scenarioCaption: "Fictional access example",
};
/** Maximum collection density and accepted display lengths. */
export const DENSE_INPUT: Input = {
  services: [
    {
      id: "0",
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "shelter",
    },
    {
      id: "1",
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "information",
    },
    {
      id: "2",
      label: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      symbol: "water",
    },
  ],
  chosenServiceId: "2",
  accessChange: "unfold-ramp",
  participantMobility: "wheelchair",
  labels: {
    participant: "WWWWWWWWWWWWWWWWWWWWWWWW",
    staff: "WWWWWWWWWWWWWWWWWWWWWWWW",
    choice: "WWWWWWWWWWWWWWWWWWWWWWWW",
  },
  showChoiceLabel: true,
  scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
};
/** Changed authored choices, quantities and optional presentation. */
export const CHANGED_INPUT: Input = {
  services: [
    {
      id: "shelter",
      label: "Example shelter desk",
      symbol: "shelter",
    },
    {
      id: "information",
      label: "Example information",
      symbol: "information",
    },
  ],
  chosenServiceId: "information",
  accessChange: "clear-entrance",
  participantMobility: "walking",
  labels: {
    participant: "Example participant",
    staff: "Service team",
    choice: "Chosen service",
  },
  showChoiceLabel: false,
  scenarioCaption: "Fictional access example",
};
/** Invalid complete documents and malformed collections. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  { ...DEFAULT_INPUT, services: [] },
  { ...DEFAULT_INPUT, chosenServiceId: "missing" },
  {
    ...DEFAULT_INPUT,
    services: [DEFAULT_INPUT.services[0], DEFAULT_INPUT.services[0]],
  },
  { ...DEFAULT_INPUT, accessChange: "automatic" },
  {
    ...DEFAULT_INPUT,
    services: DEFAULT_INPUT.services.map((service) => ({
      ...service,
      symbol: "medical",
    })),
  },
  {
    ...DEFAULT_INPUT,
    services: [
      { ...DEFAULT_INPUT.services[0], extra: true },
      ...DEFAULT_INPUT.services.slice(1),
    ],
  },
];
/** Stable complete accepted examples. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: CHANGED_INPUT },
];
