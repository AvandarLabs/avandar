import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable controls retain collection and numeric bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "parts",
    label: {
      id: "motionAtlas.component-material-return.controls.parts.label",
      message: "parts",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 6,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 20,
        },
        label: {
          type: "string",
          minLength: 0,
          maxLength: 22,
        },
        massKg: {
          type: "number",
          exclusiveMinimum: 0,
          maximum: 100,
        },
        route: {
          type: "string",
          enum: ["reuse", "repair", "recycle", "residue"],
        },
      },
      required: ["id", "label", "massKg", "route"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.component-material-return.controls.parts.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.component-material-return.controls.parts.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 22,
      },
      {
        path: "massKg",
        label: {
          id: "motionAtlas.component-material-return.controls.parts.massKg.label",
          message: "massKg",
        },
        kind: "number",
        min: 0,
        max: 100,
        help: {
          id: "motionAtlas.component-material-return.controls.parts.massKg.help",
          message: "Strictly positive; zero is rejected.",
        },
      },
      {
        path: "route",
        label: {
          id: "motionAtlas.component-material-return.controls.parts.route.label",
          message: "route",
        },
        kind: "select",
        options: [
          {
            value: "reuse",
            label: {
              id: "motionAtlas.component-material-return.controls.parts.route.reuse",
              message: "reuse",
            },
          },
          {
            value: "repair",
            label: {
              id: "motionAtlas.component-material-return.controls.parts.route.repair",
              message: "repair",
            },
          },
          {
            value: "recycle",
            label: {
              id: "motionAtlas.component-material-return.controls.parts.route.recycle",
              message: "recycle",
            },
          },
          {
            value: "residue",
            label: {
              id: "motionAtlas.component-material-return.controls.parts.route.residue",
              message: "residue",
            },
          },
        ],
      },
    ],
  },
  {
    path: "replacementInputs",
    label: {
      id: "motionAtlas.component-material-return.controls.replacementInputs.label",
      message: "replacementInputs",
    },
    kind: "collection",
    minItems: 0,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 20,
        },
        label: {
          type: "string",
          minLength: 0,
          maxLength: 26,
        },
        massKg: {
          type: "number",
          exclusiveMinimum: 0,
          maximum: 100,
        },
      },
      required: ["id", "label", "massKg"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.component-material-return.controls.replacementInputs.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.component-material-return.controls.replacementInputs.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "massKg",
        label: {
          id: "motionAtlas.component-material-return.controls.replacementInputs.massKg.label",
          message: "massKg",
        },
        kind: "number",
        min: 0,
        max: 100,
        help: {
          id: "motionAtlas.component-material-return.controls.replacementInputs.massKg.help",
          message: "Strictly positive; zero is rejected.",
        },
      },
    ],
  },
  {
    path: "decision",
    label: {
      id: "motionAtlas.component-material-return.controls.decision.label",
      message: "decision",
    },
    kind: "object",
    controls: [
      {
        path: "actorLabel",
        label: {
          id: "motionAtlas.component-material-return.controls.decision.actorLabel.label",
          message: "actorLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "actionLabel",
        label: {
          id: "motionAtlas.component-material-return.controls.decision.actionLabel.label",
          message: "actionLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
    ],
  },
  {
    path: "assemblyShape",
    label: {
      id: "motionAtlas.component-material-return.controls.assemblyShape.label",
      message: "assemblyShape",
    },
    kind: "select",
    options: [
      {
        value: "appliance",
        label: {
          id: "motionAtlas.component-material-return.controls.assemblyShape.appliance",
          message: "appliance",
        },
      },
      {
        value: "equipment-module",
        label: {
          id: "motionAtlas.component-material-return.controls.assemblyShape.equipment-module",
          message: "equipment-module",
        },
      },
    ],
  },
  {
    path: "showMassEquation",
    label: {
      id: "motionAtlas.component-material-return.controls.showMassEquation.label",
      message: "showMassEquation",
    },
    kind: "boolean",
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.component-material-return.controls.copy.label",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "returned",
        label: {
          id: "motionAtlas.component-material-return.controls.copy.returned.label",
          message: "returned",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "replacement",
        label: {
          id: "motionAtlas.component-material-return.controls.copy.replacement.label",
          message: "replacement",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "reuse",
        label: {
          id: "motionAtlas.component-material-return.controls.copy.reuse.label",
          message: "reuse",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "repair",
        label: {
          id: "motionAtlas.component-material-return.controls.copy.repair.label",
          message: "repair",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "recycle",
        label: {
          id: "motionAtlas.component-material-return.controls.copy.recycle.label",
          message: "recycle",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "residue",
        label: {
          id: "motionAtlas.component-material-return.controls.copy.residue.label",
          message: "residue",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "output",
        label: {
          id: "motionAtlas.component-material-return.controls.copy.output.label",
          message: "output",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.component-material-return.controls.copy.unit.label",
          message: "unit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 8,
      },
      {
        path: "disclaimer",
        label: {
          id: "motionAtlas.component-material-return.controls.copy.disclaimer.label",
          message: "disclaimer",
        },
        kind: "text",
        minLength: 0,
        maxLength: 48,
      },
    ],
  },
];
