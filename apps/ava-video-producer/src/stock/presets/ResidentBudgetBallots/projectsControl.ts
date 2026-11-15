import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable projects editor. */
export const PROJECTS_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.resident-budget-ballots.controls.projects.help",
    message:
      "Define the project choices printed on the ballots. 2..3 projects; unique IDs <= 16 characters; labels <= 26 characters; symbol must be one of the listed values.",
  },
  path: "projects",
  kind: "collection",
  minItems: 2,
  maxItems: 3,
  itemControls: [
    {
      path: "id",
      kind: "text",
      minLength: 0,
      maxLength: 16,
      label: {
        id: "motionAtlas.resident-budget-ballots.controls.projects.id",
        message: "id",
      },
    },
    {
      path: "label",
      kind: "text",
      minLength: 0,
      maxLength: 26,
      label: {
        id: "motionAtlas.resident-budget-ballots.controls.projects.label",
        message: "label",
      },
    },
    {
      path: "symbol",
      kind: "select",
      options: [
        {
          value: "bench",
          label: {
            id: "motionAtlas.resident-budget-ballots.controls.projects.symbol.0",
            message: "bench",
          },
        },
        {
          value: "books",
          label: {
            id: "motionAtlas.resident-budget-ballots.controls.projects.symbol.1",
            message: "books",
          },
        },
        {
          value: "garden",
          label: {
            id: "motionAtlas.resident-budget-ballots.controls.projects.symbol.2",
            message: "garden",
          },
        },
      ],
      label: {
        id: "motionAtlas.resident-budget-ballots.controls.projects.symbol",
        message: "symbol",
      },
    },
  ],
  label: {
    id: "motionAtlas.resident-budget-ballots.controls.projects",
    message: "projects",
  },
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        minLength: 0,
        maxLength: 16,
      },
      label: {
        type: "string",
        minLength: 0,
        maxLength: 26,
      },
      symbol: {
        type: "string",
        enum: ["bench", "books", "garden"],
      },
    },
    required: ["id", "label", "symbol"],
    additionalProperties: false,
  },
};
