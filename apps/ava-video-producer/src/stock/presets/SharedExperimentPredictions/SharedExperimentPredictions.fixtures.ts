import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./SharedExperimentPredictions.schema";
/** Complete fictional input used only when input is omitted. */
export const DEFAULT_INPUT: Input = {
  learners: [
    { id: "a", label: "Learner A", predictionDistance: 12 },
    { id: "b", label: "Learner B", predictionDistance: 20 },
    { id: "c", label: "Learner C", predictionDistance: 28 },
  ],
  observationDistance: 18,
  track: { maximum: 36, unit: "example cm" },
  labels: {
    experiment: "Example tabletop roll",
    prediction: "Prediction",
    observation: "Observed stop",
    origin: "Distance from here",
  },
  showDistanceDifferences: false,
  showPredictionValues: true,
  caption: "Fictional demonstration, authored observation",
};
/** Minimum collections and accepted edge values. */
export const minimumInput: Input = {
  ...DEFAULT_INPUT,
  learners: [
    { id: "a", label: "Learner A", predictionDistance: 0 },
    { id: "b", label: "Learner B", predictionDistance: 0 },
  ],
  observationDistance: 0,
  track: { ...DEFAULT_INPUT.track, maximum: 10 },
};
/** Maximum collections and accepted visible text. */
export const denseInput: Input = {
  ...DEFAULT_INPUT,
  learners: [
    {
      id: "learner 0",
      label: "界界界界界界界界界界界界界界界界",
      predictionDistance: 100,
    },
    {
      id: "learner 1",
      label: "界界界界界界界界界界界界界界界界",
      predictionDistance: 100,
    },
    {
      id: "learner 2",
      label: "界界界界界界界界界界界界界界界界",
      predictionDistance: 100,
    },
    {
      id: "learner 3",
      label: "界界界界界界界界界界界界界界界界",
      predictionDistance: 100,
    },
  ],
  observationDistance: 100,
  track: {
    ...DEFAULT_INPUT.track,
    maximum: 100,
    unit: "界界界界界界界界界界界界界界",
  },
  labels: {
    ...DEFAULT_INPUT.labels,
    experiment:
      "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
    prediction: "界界界界界界界界界界界界界界界界界界界界界界界界",
    observation: "界界界界界界界界界界界界界界界界界界界界界界界界",
    origin: "界界界界界界界界界界界界界界界界界界界界界界界界",
  },
  showDistanceDifferences: true,
  caption:
    "界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界界",
};
/** Changed assignments and presentation toggles. */
export const changedInput: Input = {
  ...DEFAULT_INPUT,
  learners: [
    { id: "c", label: "Learner C", predictionDistance: 0 },
    { id: "b", label: "Learner B", predictionDistance: 0 },
    { id: "a", label: "Learner A", predictionDistance: 0 },
  ],
  observationDistance: 0,
  showDistanceDifferences: true,
  showPredictionValues: false,
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
  { ...DEFAULT_INPUT, observationDistance: 37 },
  {
    ...DEFAULT_INPUT,
    learners: [
      { id: "a", label: "Learner A", predictionDistance: 37 },
      { id: "b", label: "Learner B", predictionDistance: 20 },
      { id: "c", label: "Learner C", predictionDistance: 28 },
    ],
  },
  {
    learners: [
      { id: "a", label: "Learner A", predictionDistance: 12 },
      { id: "b", label: "Learner B", predictionDistance: 20 },
      { id: "c", label: "Learner C", predictionDistance: 28 },
    ],
    observationDistance: 18,
    track: { maximum: 36, unit: "example cm" },
    labels: {
      experiment: "Example tabletop roll",
      prediction: "Prediction",
      observation: "Observed stop",
      origin: "Distance from here",
    },
    showDistanceDifferences: false,
    showPredictionValues: true,
    caption: "Fictional demonstration, authored observation",
    extra: true,
  },
  {
    observationDistance: 18,
    track: { maximum: 36, unit: "example cm" },
    labels: {
      experiment: "Example tabletop roll",
      prediction: "Prediction",
      observation: "Observed stop",
      origin: "Distance from here",
    },
    showDistanceDifferences: false,
    showPredictionValues: true,
    caption: "Fictional demonstration, authored observation",
  },
  {
    ...DEFAULT_INPUT,
    learners: [
      { id: "a", label: "Learner A", predictionDistance: 12 },
      { id: "a", label: "Learner A", predictionDistance: 12 },
      { id: "a", label: "Learner A", predictionDistance: 12 },
    ],
  },
];
