import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./SchoolLunchTrayComposition.schema";
/** Complete fictional input used only when input is omitted. */
export const DEFAULT_INPUT: Input = {
  learners: [
    { id: "a", label: "Learner A" },
    { id: "b", label: "Learner B" },
    { id: "c", label: "Learner C" },
    { id: "d", label: "Learner D" },
  ],
  plannedComponents: [
    { id: "grain", label: "Grain", symbol: "grain" },
    { id: "beans", label: "Beans", symbol: "beans" },
    { id: "fruit", label: "Fruit", symbol: "fruit" },
  ],
  trays: [
    { learnerId: "a", componentIds: ["grain", "beans", "fruit"] },
    { learnerId: "b", componentIds: ["grain", "beans", "fruit"] },
    { learnerId: "c", componentIds: ["grain", "beans", "fruit"] },
    { learnerId: "d", componentIds: ["grain", "beans"] },
  ],
  labels: {
    plan: "Example lunch plan",
    matchesPlan: "All listed components",
    plannedTrays: "Planned trays",
    missing: "Not on this tray",
  },
  showComponentNames: true,
  emphasizeMissingComponents: true,
  caption: "Fictional meal plan, not nutrition guidance",
};
/** Minimum collections and accepted edge values. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  learners: [
    { id: "a", label: "Learner A" },
    { id: "b", label: "Learner B" },
  ],
  plannedComponents: [
    { id: "grain", label: "Grain", symbol: "grain" },
    { id: "beans", label: "Beans", symbol: "beans" },
  ],
  trays: [
    { learnerId: "a", componentIds: [] },
    { learnerId: "b", componentIds: [] },
  ],
};
/** Maximum collections and accepted visible text. */
export const denseInput: Input = {
  ...DEFAULT_INPUT,
  learners: [
    { id: "learner 0", label: "界界界界界界界界界界界界界界界界" },
    { id: "learner 1", label: "界界界界界界界界界界界界界界界界" },
    { id: "learner 2", label: "界界界界界界界界界界界界界界界界" },
    { id: "learner 3", label: "界界界界界界界界界界界界界界界界" },
    { id: "learner 4", label: "界界界界界界界界界界界界界界界界" },
    { id: "learner 5", label: "界界界界界界界界界界界界界界界界" },
  ],
  plannedComponents: [
    {
      id: "component 0",
      label: "界界界界界界界界界界界界界界界界界界界界",
      symbol: "grain",
    },
    {
      id: "component 1",
      label: "界界界界界界界界界界界界界界界界界界界界",
      symbol: "beans",
    },
    {
      id: "component 2",
      label: "界界界界界界界界界界界界界界界界界界界界",
      symbol: "vegetables",
    },
    {
      id: "component 3",
      label: "界界界界界界界界界界界界界界界界界界界界",
      symbol: "cup",
    },
  ],
  trays: [
    {
      learnerId: "learner 5",
      componentIds: [
        "component 0",
        "component 1",
        "component 2",
        "component 3",
      ],
    },
    {
      learnerId: "learner 4",
      componentIds: [
        "component 0",
        "component 1",
        "component 2",
        "component 3",
      ],
    },
    {
      learnerId: "learner 3",
      componentIds: [
        "component 0",
        "component 1",
        "component 2",
        "component 3",
      ],
    },
    {
      learnerId: "learner 2",
      componentIds: [
        "component 0",
        "component 1",
        "component 2",
        "component 3",
      ],
    },
    {
      learnerId: "learner 1",
      componentIds: [
        "component 0",
        "component 1",
        "component 2",
        "component 3",
      ],
    },
    {
      learnerId: "learner 0",
      componentIds: [
        "component 0",
        "component 1",
        "component 2",
        "component 3",
      ],
    },
  ],
  labels: {
    ...DEFAULT_INPUT.labels,
    plan: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
    matchesPlan: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
    plannedTrays: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
    missing: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
  },
  caption:
    "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
};
/** Changed assignments and presentation toggles. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  trays: [
    { learnerId: "d", componentIds: [] },
    { learnerId: "c", componentIds: [] },
    { learnerId: "b", componentIds: ["fruit"] },
    { learnerId: "a", componentIds: [] },
  ],
  showComponentNames: false,
  emphasizeMissingComponents: false,
};
/** Accepted complete scene examples. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimumInput },
  { id: "dense", input: denseInput },
  { id: "changed", input: changedInput },
];
/** Invalid structure, identities, references and arithmetic. */
export const invalidInputs: unknown[] = [
  {
    ...DEFAULT_INPUT,
    trays: [
      { learnerId: "a", componentIds: ["grain", "beans", "fruit"] },
      { learnerId: "b", componentIds: ["grain", "beans", "fruit"] },
      { learnerId: "c", componentIds: ["grain", "beans", "fruit"] },
    ],
  },
  {
    ...DEFAULT_INPUT,
    trays: [
      { learnerId: "missing", componentIds: [] },
      { learnerId: "b", componentIds: ["grain", "beans", "fruit"] },
      { learnerId: "c", componentIds: ["grain", "beans", "fruit"] },
      { learnerId: "d", componentIds: ["grain", "beans"] },
    ],
  },
  {
    ...DEFAULT_INPUT,
    trays: [
      { learnerId: "a", componentIds: ["bad"] },
      { learnerId: "b", componentIds: ["grain", "beans", "fruit"] },
      { learnerId: "c", componentIds: ["grain", "beans", "fruit"] },
      { learnerId: "d", componentIds: ["grain", "beans"] },
    ],
  },
  {
    ...DEFAULT_INPUT,
    trays: [
      { learnerId: "a", componentIds: ["grain", "grain"] },
      { learnerId: "b", componentIds: ["grain", "beans", "fruit"] },
      { learnerId: "c", componentIds: ["grain", "beans", "fruit"] },
      { learnerId: "d", componentIds: ["grain", "beans"] },
    ],
  },
  {
    learners: [
      { id: "a", label: "Learner A" },
      { id: "b", label: "Learner B" },
      { id: "c", label: "Learner C" },
      { id: "d", label: "Learner D" },
    ],
    plannedComponents: [
      { id: "grain", label: "Grain", symbol: "grain" },
      { id: "beans", label: "Beans", symbol: "beans" },
      { id: "fruit", label: "Fruit", symbol: "fruit" },
    ],
    trays: [
      { learnerId: "a", componentIds: ["grain", "beans", "fruit"] },
      { learnerId: "b", componentIds: ["grain", "beans", "fruit"] },
      { learnerId: "c", componentIds: ["grain", "beans", "fruit"] },
      { learnerId: "d", componentIds: ["grain", "beans"] },
    ],
    labels: {
      plan: "Example lunch plan",
      matchesPlan: "All listed components",
      plannedTrays: "Planned trays",
      missing: "Not on this tray",
    },
    showComponentNames: true,
    emphasizeMissingComponents: true,
    caption: "Fictional meal plan, not nutrition guidance",
    extra: true,
  },
  {
    plannedComponents: [
      { id: "grain", label: "Grain", symbol: "grain" },
      { id: "beans", label: "Beans", symbol: "beans" },
      { id: "fruit", label: "Fruit", symbol: "fruit" },
    ],
    trays: [
      { learnerId: "a", componentIds: ["grain", "beans", "fruit"] },
      { learnerId: "b", componentIds: ["grain", "beans", "fruit"] },
      { learnerId: "c", componentIds: ["grain", "beans", "fruit"] },
      { learnerId: "d", componentIds: ["grain", "beans"] },
    ],
    labels: {
      plan: "Example lunch plan",
      matchesPlan: "All listed components",
      plannedTrays: "Planned trays",
      missing: "Not on this tray",
    },
    showComponentNames: true,
    emphasizeMissingComponents: true,
    caption: "Fictional meal plan, not nutrition guidance",
  },
  {
    ...DEFAULT_INPUT,
    learners: [
      { id: "a", label: "Learner A" },
      { id: "a", label: "Learner A" },
      { id: "a", label: "Learner A" },
      { id: "a", label: "Learner A" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    plannedComponents: [
      { id: "grain", label: "Grain", symbol: "grain" },
      { id: "grain", label: "Grain", symbol: "grain" },
      { id: "grain", label: "Grain", symbol: "grain" },
    ],
  },
];
