import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable ballots editor. */
export const BALLOTS_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.resident-budget-ballots.controls.ballots.help",
    message:
      "Supply one authored choice or abstention for each anonymous resident shown. 2..8 ballots; unique IDs <= 16 characters; non-null project IDs must exist; null means abstained, not invalid; resident count is derived from this array.",
  },
  path: "ballots",
  kind: "collection",
  minItems: 2,
  maxItems: 8,
  itemControls: [
    {
      path: "id",
      kind: "text",
      minLength: 0,
      maxLength: 16,
      label: {
        id: "motionAtlas.resident-budget-ballots.controls.ballots.id",
        message: "id",
      },
    },
    {
      path: "projectId",
      nullable: true,
      kind: "select",
      optionsFrom: {
        path: "projects",
        valueKey: "id",
        labelKey: "label",
      },
      label: {
        id: "motionAtlas.resident-budget-ballots.controls.ballots.projectId",
        message: "projectId",
      },
    },
  ],
  label: {
    id: "motionAtlas.resident-budget-ballots.controls.ballots",
    message: "ballots",
  },
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        minLength: 0,
        maxLength: 16,
      },
      projectId: {
        anyOf: [
          {
            type: "string",
            maxLength: 16,
          },
          {
            type: "null",
          },
        ],
      },
    },
    required: ["id", "projectId"],
    additionalProperties: false,
  },
};
