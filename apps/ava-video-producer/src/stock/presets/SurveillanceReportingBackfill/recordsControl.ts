import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for records. */
export const RECORDS_CONTROL: StockControl = {
  path: "records",
  label: {
    id: "motionAtlas.surveillance-reporting-backfill.controls.records",
    message: "records",
  },
  kind: "collection",
  minItems: 3,
  maxItems: 12,
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        maxLength: 12,
      },
      label: {
        type: "string",
        maxLength: 20,
      },
      eventBinId: {
        type: "string",
        maxLength: 12,
      },
      firstSnapshot: {
        enum: [0, 1],
      },
    },
    required: ["id", "label", "eventBinId", "firstSnapshot"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.surveillance-reporting-backfill.controls.records.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 12,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.surveillance-reporting-backfill.controls.records.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 20,
    },
    {
      path: "eventBinId",
      label: {
        id: "motionAtlas.surveillance-reporting-backfill.controls.records.eventBinId",
        message: "eventBinId",
      },
      kind: "select",
      optionsFrom: {
        path: "eventBins",
        valueKey: "id",
        labelKey: "label",
      },
    },
    {
      path: "firstSnapshot",
      label: {
        id: "motionAtlas.surveillance-reporting-backfill.controls.records.firstSnapshot",
        message: "firstSnapshot",
      },
      kind: "select",
      options: [
        {
          value: 0,
          label: {
            id: "motionAtlas.surveillance-reporting-backfill.controls.records.firstSnapshot.0",
            message: "0",
          },
        },
        {
          value: 1,
          label: {
            id: "motionAtlas.surveillance-reporting-backfill.controls.records.firstSnapshot.1",
            message: "1",
          },
        },
      ],
    },
  ],
  help: {
    id: "motionAtlas.surveillance-reporting-backfill.controls.records.help",
    message:
      "Unique records with an event bin and first visible reporting snapshot. 3..12 records; unique IDs <= 12 characters; labels <= 20 characters; eventBinId exists; firstSnapshot is 0 or 1; at least one record per snapshot.",
  },
};
