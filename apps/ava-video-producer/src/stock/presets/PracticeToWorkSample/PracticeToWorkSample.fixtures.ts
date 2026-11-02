import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./PracticeToWorkSample.schema";
/** Complete fictional input used only when input is omitted. */
export const DEFAULT_INPUT: Input = {
  learnerLabel: "Learner A",
  settingLabels: {
    practice: "Example classroom",
    application: "Example workshop",
  },
  task: { instruction: "Measure and mark", value: 4, unit: "cm" },
  workpieces: {
    practiceLabel: "Practice sheet",
    applicationLabel: "Workshop sample",
    material: "wood",
  },
  showAlignmentGuides: true,
  showFirstArtifactAtHold: true,
  caption: "Fictional practice, not an employment outcome",
};
/** Minimum collections and accepted edge values. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  task: { ...DEFAULT_INPUT.task, value: 1 },
  workpieces: { ...DEFAULT_INPUT.workpieces, material: "card" },
  showAlignmentGuides: false,
  showFirstArtifactAtHold: false,
};
/** Maximum collections and accepted visible text. */
export const denseInput: Input = {
  ...DEFAULT_INPUT,
  learnerLabel: "界界界界界界界界界界界界界界界界界界界界",
  settingLabels: {
    ...DEFAULT_INPUT.settingLabels,
    practice: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
    application: "界界界界界界界界界界界界界界界界界界界界界界界界界界",
  },
  task: {
    ...DEFAULT_INPUT.task,
    instruction: "界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
    value: 10,
    unit: "界界界界界界界界",
  },
  workpieces: {
    ...DEFAULT_INPUT.workpieces,
    practiceLabel: "界界界界界界界界界界界界界界界界界界界界界界界界",
    applicationLabel: "界界界界界界界界界界界界界界界界界界界界界界界界",
    material: "fabric",
  },
  caption:
    "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
};
/** Changed assignments and presentation toggles. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  task: { ...DEFAULT_INPUT.task, value: 7 },
  workpieces: { ...DEFAULT_INPUT.workpieces, material: "fabric" },
  showAlignmentGuides: false,
  showFirstArtifactAtHold: false,
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
  { ...DEFAULT_INPUT, task: { ...DEFAULT_INPUT.task, value: 0 } },
  { ...DEFAULT_INPUT, task: { ...DEFAULT_INPUT.task, value: 11 } },
  { ...DEFAULT_INPUT, task: { ...DEFAULT_INPUT.task, value: 1.5 } },
  {
    learnerLabel: "Learner A",
    settingLabels: {
      practice: "Example classroom",
      application: "Example workshop",
    },
    task: { instruction: "Measure and mark", value: 4, unit: "cm" },
    workpieces: {
      practiceLabel: "Practice sheet",
      applicationLabel: "Workshop sample",
      material: "wood",
    },
    showAlignmentGuides: true,
    showFirstArtifactAtHold: true,
    caption: "Fictional practice, not an employment outcome",
    extra: true,
  },
  {
    settingLabels: {
      practice: "Example classroom",
      application: "Example workshop",
    },
    task: { instruction: "Measure and mark", value: 4, unit: "cm" },
    workpieces: {
      practiceLabel: "Practice sheet",
      applicationLabel: "Workshop sample",
      material: "wood",
    },
    showAlignmentGuides: true,
    showFirstArtifactAtHold: true,
    caption: "Fictional practice, not an employment outcome",
  },
];
