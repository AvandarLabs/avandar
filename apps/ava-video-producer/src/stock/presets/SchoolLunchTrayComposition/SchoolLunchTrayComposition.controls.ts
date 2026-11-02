import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editors preserve authored field bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "learners",
    label: {
      id: "motionAtlas.school-lunch-tray-composition.controls.learners",
      message: "learners",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 6,
    itemSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 1, maxLength: 20 },
        label: { type: "string", minLength: 1, maxLength: 16 },
      },
      required: ["id", "label"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.school-lunch-tray-composition.controls.learners.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.school-lunch-tray-composition.controls.learners.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
    ],
    help: {
      id: "motionAtlas.school-lunch-tray-composition.controls.learners.help",
      message:
        "The represented learners, each with one planned tray in this meal occasion. 2..6 entries; unique IDs 1..20 characters; labels 1..16 characters",
    },
  },
  {
    path: "plannedComponents",
    label: {
      id: "motionAtlas.school-lunch-tray-composition.controls.plannedComponents",
      message: "plannedComponents",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 4,
    itemSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 1, maxLength: 20 },
        label: { type: "string", minLength: 1, maxLength: 20 },
        symbol: {
          type: "string",
          enum: ["grain", "beans", "fruit", "vegetables", "cup"],
        },
      },
      required: ["id", "label", "symbol"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.school-lunch-tray-composition.controls.plannedComponents.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.school-lunch-tray-composition.controls.plannedComponents.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "symbol",
        label: {
          id: "motionAtlas.school-lunch-tray-composition.controls.plannedComponents.symbol",
          message: "symbol",
        },
        kind: "select",
        options: [
          {
            value: "grain",
            label: {
              id: "motionAtlas.school-lunch-tray-composition.controls.plannedComponents.symbol.grain",
              message: "grain",
            },
          },
          {
            value: "beans",
            label: {
              id: "motionAtlas.school-lunch-tray-composition.controls.plannedComponents.symbol.beans",
              message: "beans",
            },
          },
          {
            value: "fruit",
            label: {
              id: "motionAtlas.school-lunch-tray-composition.controls.plannedComponents.symbol.fruit",
              message: "fruit",
            },
          },
          {
            value: "vegetables",
            label: {
              id: "motionAtlas.school-lunch-tray-composition.controls.plannedComponents.symbol.vegetables",
              message: "vegetables",
            },
          },
          {
            value: "cup",
            label: {
              id: "motionAtlas.school-lunch-tray-composition.controls.plannedComponents.symbol.cup",
              message: "cup",
            },
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.school-lunch-tray-composition.controls.plannedComponents.help",
      message:
        "The explicit component list required to count a tray as matching this authored plan. 2..4 components; unique IDs 1..20 characters; labels 1..20 characters; symbols identify component type only, not a portion or nutrient amount",
    },
  },
  {
    path: "trays",
    label: {
      id: "motionAtlas.school-lunch-tray-composition.controls.trays",
      message: "trays",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 6,
    itemSchema: {
      type: "object",
      properties: {
        learnerId: { type: "string", minLength: 1, maxLength: 20 },
        componentIds: {
          type: "array",
          items: { type: "string", minLength: 1, maxLength: 20 },
          minItems: 0,
          maxItems: 4,
        },
      },
      required: ["learnerId", "componentIds"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "learnerId",
        label: {
          id: "motionAtlas.school-lunch-tray-composition.controls.trays.learnerId",
          message: "learnerId",
        },
        kind: "select",
        optionsFrom: { path: "learners", valueKey: "id", labelKey: "label" },
      },
      {
        path: "componentIds",
        label: {
          id: "motionAtlas.school-lunch-tray-composition.controls.trays.componentIds",
          message: "componentIds",
        },
        kind: "collection",
        minItems: 0,
        maxItems: 4,
        itemSchema: { type: "string", minLength: 1, maxLength: 20 },
        itemControls: [
          {
            path: "",
            label: {
              id: "motionAtlas.school-lunch-tray-composition.controls.trays.componentIds.item",
              message: "Component",
            },
            kind: "select",
            optionsFrom: {
              path: "plannedComponents",
              valueKey: "id",
              labelKey: "label",
            },
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.school-lunch-tray-composition.controls.trays.help",
      message:
        "The listed components placed on each learner's one planned tray. Exactly one tray per learner ID; component IDs are a unique subset of plannedComponents IDs; empty subsets allowed; no unknown IDs or extra trays",
    },
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.school-lunch-tray-composition.controls.labels",
      message: "labels",
    },
    kind: "object",
    controls: [
      {
        path: "plan",
        label: {
          id: "motionAtlas.school-lunch-tray-composition.controls.labels.plan",
          message: "plan",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
      {
        path: "matchesPlan",
        label: {
          id: "motionAtlas.school-lunch-tray-composition.controls.labels.matchesPlan",
          message: "matchesPlan",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
      {
        path: "plannedTrays",
        label: {
          id: "motionAtlas.school-lunch-tray-composition.controls.labels.plannedTrays",
          message: "plannedTrays",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
      {
        path: "missing",
        label: {
          id: "motionAtlas.school-lunch-tray-composition.controls.labels.missing",
          message: "missing",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
    ],
    help: {
      id: "motionAtlas.school-lunch-tray-composition.controls.labels.help",
      message:
        "Visible labels for the meal occasion, tray-count numerator and denominator, and unfilled compartments. Each label 1..26 characters",
    },
  },
  {
    path: "showComponentNames",
    label: {
      id: "motionAtlas.school-lunch-tray-composition.controls.showComponentNames",
      message: "showComponentNames",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.school-lunch-tray-composition.controls.showComponentNames.help",
      message:
        "Label the serving sources and the component outlines. boolean; a legend with component names remains visible when direct labels are hidden",
    },
  },
  {
    path: "emphasizeMissingComponents",
    label: {
      id: "motionAtlas.school-lunch-tray-composition.controls.emphasizeMissingComponents",
      message: "emphasizeMissingComponents",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.school-lunch-tray-composition.controls.emphasizeMissingComponents.help",
      message:
        "Use a short neutral outline emphasis on unfilled planned compartments. boolean; no moral, medical, or learner-performance scoring",
    },
  },
  {
    path: "caption",
    label: {
      id: "motionAtlas.school-lunch-tray-composition.controls.caption",
      message: "caption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 56,
    help: {
      id: "motionAtlas.school-lunch-tray-composition.controls.caption.help",
      message:
        "Context for the illustrative meal composition. 1..56 characters",
    },
  },
];
