import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editors preserve all authored collection and field bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "fraction",
    label: {
      id: "motionAtlas.fraction-material-translation.controls.fraction",
      message: "fraction",
    },
    kind: "object",
    controls: [
      {
        path: "numerator",
        label: {
          id: "motionAtlas.fraction-material-translation.controls.fraction.numerator",
          message: "numerator",
        },
        kind: "number",
        min: 1,
        max: 8,
        step: 1,
      },
      {
        path: "denominator",
        label: {
          id: "motionAtlas.fraction-material-translation.controls.fraction.denominator",
          message: "denominator",
        },
        kind: "number",
        min: 2,
        max: 8,
        step: 1,
      },
    ],
    help: {
      id: "motionAtlas.fraction-material-translation.controls.fraction.help",
      message:
        "The common exact fraction represented by each material. Integer denominator 2..8; integer numerator 1..denominator; every representation must use this same fraction",
    },
  },
  {
    path: "representations",
    label: {
      id: "motionAtlas.fraction-material-translation.controls.representations",
      message: "representations",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 20,
        },
        learnerLabel: {
          type: "string",
          minLength: 1,
          maxLength: 16,
        },
        materialLabel: {
          type: "string",
          minLength: 1,
          maxLength: 22,
        },
        material: {
          type: "string",
          enum: ["folded-paper", "counters", "shaded-board"],
        },
      },
      required: ["id", "learnerLabel", "materialLabel", "material"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.fraction-material-translation.controls.representations.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "learnerLabel",
        label: {
          id: "motionAtlas.fraction-material-translation.controls.representations.learnerLabel",
          message: "learnerLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "materialLabel",
        label: {
          id: "motionAtlas.fraction-material-translation.controls.representations.materialLabel",
          message: "materialLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "material",
        label: {
          id: "motionAtlas.fraction-material-translation.controls.representations.material",
          message: "material",
        },
        kind: "select",
        options: [
          {
            value: "folded-paper",
            label: {
              id: "motionAtlas.fraction-material-translation.controls.representations.material.folded-paper",
              message: "folded paper",
            },
          },
          {
            value: "counters",
            label: {
              id: "motionAtlas.fraction-material-translation.controls.representations.material.counters",
              message: "counters",
            },
          },
          {
            value: "shaded-board",
            label: {
              id: "motionAtlas.fraction-material-translation.controls.representations.material.shaded-board",
              message: "shaded board",
            },
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.fraction-material-translation.controls.representations.help",
      message:
        "Learners and their chosen visible representations. One entry owns one learner and one material. 2..3 entries; unique IDs 1..20 characters; unique material values; learner labels 1..16 characters; material labels 1..22 characters",
    },
  },
  {
    path: "lessonLabel",
    label: {
      id: "motionAtlas.fraction-material-translation.controls.lessonLabel",
      message: "lessonLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 36,
    help: {
      id: "motionAtlas.fraction-material-translation.controls.lessonLabel.help",
      message:
        "The shared lesson prompt above the learning surfaces. 1..36 characters",
    },
  },
  {
    path: "showFractionNotation",
    label: {
      id: "motionAtlas.fraction-material-translation.controls.showFractionNotation",
      message: "showFractionNotation",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.fraction-material-translation.controls.showFractionNotation.help",
      message:
        "Display the exact numerator and denominator next to each material and the shared prompt. boolean; notation must use fraction values, never independent text numbers",
    },
  },
  {
    path: "resolvedArrangement",
    label: {
      id: "motionAtlas.fraction-material-translation.controls.resolvedArrangement",
      message: "resolvedArrangement",
    },
    kind: "select",
    options: [
      {
        value: "separate-desks",
        label: {
          id: "motionAtlas.fraction-material-translation.controls.resolvedArrangement.separate-desks",
          message: "separate desks",
        },
      },
      {
        value: "shared-table",
        label: {
          id: "motionAtlas.fraction-material-translation.controls.resolvedArrangement.shared-table",
          message: "shared table",
        },
      },
    ],
    help: {
      id: "motionAtlas.fraction-material-translation.controls.resolvedArrangement.help",
      message:
        "Keep materials at their desks or bring only their work surfaces into a shared comparison at the hold. One of the declared values; learners and artifacts remain distinct",
    },
  },
  {
    path: "caption",
    label: {
      id: "motionAtlas.fraction-material-translation.controls.caption",
      message: "caption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 56,
    help: {
      id: "motionAtlas.fraction-material-translation.controls.caption.help",
      message: "Context for the example lesson. 1..56 characters",
    },
  },
];
