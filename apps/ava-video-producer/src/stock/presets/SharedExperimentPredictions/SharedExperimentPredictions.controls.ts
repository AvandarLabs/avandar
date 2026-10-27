import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editors preserve authored field bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "learners",
    label: {
      id: "motionAtlas.shared-experiment-predictions.controls.learners",
      message: "learners",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 4,
    itemSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 1, maxLength: 20 },
        label: { type: "string", minLength: 1, maxLength: 16 },
        predictionDistance: { type: "number", minimum: 0, maximum: 100 },
      },
      required: ["id", "label", "predictionDistance"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.shared-experiment-predictions.controls.learners.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.shared-experiment-predictions.controls.learners.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "predictionDistance",
        label: {
          id: "motionAtlas.shared-experiment-predictions.controls.learners.predictionDistance",
          message: "predictionDistance",
        },
        kind: "number",
        min: 0,
        max: 100,
      },
    ],
    help: {
      id: "motionAtlas.shared-experiment-predictions.controls.learners.help",
      message:
        "The participants and their explicitly authored prediction positions. 2..4 entries; unique IDs 1..20 characters; labels 1..16 characters; finite predictionDistance values 0..track.maximum; coincident predictions stack labels without merging learners",
    },
  },
  {
    path: "observationDistance",
    label: {
      id: "motionAtlas.shared-experiment-predictions.controls.observationDistance",
      message: "observationDistance",
    },
    kind: "number",
    min: 0,
    max: 100,
    help: {
      id: "motionAtlas.shared-experiment-predictions.controls.observationDistance.help",
      message:
        "The authored observed stopping position of the demonstration ball. Finite number 0..track.maximum; interpreted in track.unit; supplied by the author, not computed from physical parameters",
    },
  },
  {
    path: "track",
    label: {
      id: "motionAtlas.shared-experiment-predictions.controls.track",
      message: "track",
    },
    kind: "object",
    controls: [
      {
        path: "maximum",
        label: {
          id: "motionAtlas.shared-experiment-predictions.controls.track.maximum",
          message: "maximum",
        },
        kind: "number",
        min: 10,
        max: 100,
        step: 1,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.shared-experiment-predictions.controls.track.unit",
          message: "unit",
        },
        kind: "text",
        minLength: 1,
        maxLength: 14,
      },
    ],
    help: {
      id: "motionAtlas.shared-experiment-predictions.controls.track.help",
      message:
        "The common distance axis from a visible zero origin. Maximum integer 10..100; unit 1..14 characters; all prediction and observation values use this unit and must fit the axis",
    },
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.shared-experiment-predictions.controls.labels",
      message: "labels",
    },
    kind: "object",
    controls: [
      {
        path: "experiment",
        label: {
          id: "motionAtlas.shared-experiment-predictions.controls.labels.experiment",
          message: "experiment",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "prediction",
        label: {
          id: "motionAtlas.shared-experiment-predictions.controls.labels.prediction",
          message: "prediction",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "observation",
        label: {
          id: "motionAtlas.shared-experiment-predictions.controls.labels.observation",
          message: "observation",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "origin",
        label: {
          id: "motionAtlas.shared-experiment-predictions.controls.labels.origin",
          message: "origin",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
    help: {
      id: "motionAtlas.shared-experiment-predictions.controls.labels.help",
      message:
        "Visible experiment and marker roles. Experiment label 1..32 characters; other labels 1..24 characters",
    },
  },
  {
    path: "showDistanceDifferences",
    label: {
      id: "motionAtlas.shared-experiment-predictions.controls.showDistanceDifferences",
      message: "showDistanceDifferences",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.shared-experiment-predictions.controls.showDistanceDifferences.help",
      message:
        "Optionally bracket the absolute distance between each prediction and the observation, using the same axis unit. boolean; differences are derived absolute distances, not scores, probabilities, or percentages",
    },
  },
  {
    path: "showPredictionValues",
    label: {
      id: "motionAtlas.shared-experiment-predictions.controls.showPredictionValues",
      message: "showPredictionValues",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.shared-experiment-predictions.controls.showPredictionValues.help",
      message:
        "Display the authored numeric value beside each participant's prediction flag. boolean; participant labels and the distinction between prediction and observation remain visible",
    },
  },
  {
    path: "caption",
    label: {
      id: "motionAtlas.shared-experiment-predictions.controls.caption",
      message: "caption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 56,
    help: {
      id: "motionAtlas.shared-experiment-predictions.controls.caption.help",
      message:
        "Context stating that the experiment result is supplied example content. 1..56 characters",
    },
  },
];
