import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./ClassroomAccessRearrangement.schema";
/** Complete fictional input used only when input is omitted. */
export const DEFAULT_INPUT: Input = {
  learners: [
    { id: "a", label: "Learner A", movementIcon: "wheeled" },
    { id: "b", label: "Learner B", movementIcon: "walking" },
    { id: "c", label: "Learner C", movementIcon: "walking" },
    { id: "d", label: "Learner D", movementIcon: "walking" },
  ],
  adaptations: [
    { id: "approach", label: "Clear approach", kind: "clear-approach" },
    { id: "table", label: "Shared work surface", kind: "shared-table" },
    { id: "print", label: "Large example text", kind: "large-print-board" },
  ],
  activity: {
    label: "Shared shape activity",
    boardText: "Compare these shapes",
  },
  resolvedLayout: "shared-circle",
  showApproachTrace: true,
  phaseLabels: {
    before: "Crowded example room",
    after: "Shared activity space",
  },
  caption: "Fictional room, schematic access changes",
};
/** Minimum collections and accepted edge values. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  learners: [
    { id: "a", label: "Learner A", movementIcon: "wheeled" },
    { id: "b", label: "Learner B", movementIcon: "walking" },
  ],
  adaptations: [
    { id: "approach", label: "Clear approach", kind: "clear-approach" },
  ],
  showApproachTrace: false,
};
/** Maximum collections and accepted visible text. */
export const denseInput: Input = {
  ...DEFAULT_INPUT,
  learners: [
    {
      id: "learner 0",
      label: "界界界界界界界界界界界界界界界界",
      movementIcon: "wheeled",
    },
    {
      id: "learner 1",
      label: "界界界界界界界界界界界界界界界界",
      movementIcon: "walking",
    },
    {
      id: "learner 2",
      label: "界界界界界界界界界界界界界界界界",
      movementIcon: "wheeled",
    },
    {
      id: "learner 3",
      label: "界界界界界界界界界界界界界界界界",
      movementIcon: "walking",
    },
    {
      id: "learner 4",
      label: "界界界界界界界界界界界界界界界界",
      movementIcon: "wheeled",
    },
    {
      id: "learner 5",
      label: "界界界界界界界界界界界界界界界界",
      movementIcon: "walking",
    },
  ],
  adaptations: [
    {
      id: "approach",
      label: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      kind: "clear-approach",
    },
    {
      id: "table",
      label: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      kind: "shared-table",
    },
    {
      id: "print",
      label: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
      kind: "large-print-board",
    },
  ],
  activity: {
    ...DEFAULT_INPUT.activity,
    label: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
    boardText:
      "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
  },
  phaseLabels: {
    ...DEFAULT_INPUT.phaseLabels,
    before: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
    after: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
  },
  caption:
    "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
};
/** Changed assignments and presentation toggles. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  learners: [
    { id: "d", label: "Learner D", movementIcon: "walking" },
    { id: "c", label: "Learner C", movementIcon: "walking" },
    { id: "b", label: "Learner B", movementIcon: "walking" },
    { id: "a", label: "Learner A", movementIcon: "wheeled" },
  ],
  adaptations: [
    { id: "approach", label: "Clear approach", kind: "clear-approach" },
  ],
  resolvedLayout: "open-horseshoe",
  showApproachTrace: false,
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
    adaptations: [
      { id: "table", label: "Shared work surface", kind: "shared-table" },
      { id: "print", label: "Large example text", kind: "large-print-board" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    adaptations: [
      { id: "approach", label: "Clear approach", kind: "clear-approach" },
      { id: "another", label: "Clear approach", kind: "clear-approach" },
    ],
  },
  {
    learners: [
      { id: "a", label: "Learner A", movementIcon: "wheeled" },
      { id: "b", label: "Learner B", movementIcon: "walking" },
      { id: "c", label: "Learner C", movementIcon: "walking" },
      { id: "d", label: "Learner D", movementIcon: "walking" },
    ],
    adaptations: [
      { id: "approach", label: "Clear approach", kind: "clear-approach" },
      { id: "table", label: "Shared work surface", kind: "shared-table" },
      { id: "print", label: "Large example text", kind: "large-print-board" },
    ],
    activity: {
      label: "Shared shape activity",
      boardText: "Compare these shapes",
    },
    resolvedLayout: "shared-circle",
    showApproachTrace: true,
    phaseLabels: {
      before: "Crowded example room",
      after: "Shared activity space",
    },
    caption: "Fictional room, schematic access changes",
    extra: true,
  },
  {
    adaptations: [
      { id: "approach", label: "Clear approach", kind: "clear-approach" },
      { id: "table", label: "Shared work surface", kind: "shared-table" },
      { id: "print", label: "Large example text", kind: "large-print-board" },
    ],
    activity: {
      label: "Shared shape activity",
      boardText: "Compare these shapes",
    },
    resolvedLayout: "shared-circle",
    showApproachTrace: true,
    phaseLabels: {
      before: "Crowded example room",
      after: "Shared activity space",
    },
    caption: "Fictional room, schematic access changes",
  },
  {
    ...DEFAULT_INPUT,
    learners: [
      { id: "a", label: "Learner A", movementIcon: "wheeled" },
      { id: "a", label: "Learner A", movementIcon: "wheeled" },
      { id: "a", label: "Learner A", movementIcon: "wheeled" },
      { id: "a", label: "Learner A", movementIcon: "wheeled" },
    ],
  },
];
