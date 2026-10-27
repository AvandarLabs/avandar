import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for groupings. */
export const GROUPINGS_CONTROL: StockControl = {
  path: "groupings",
  label: {
    id: "motionAtlas.boundary-regrouping-effect.controls.groupings",
    message: "groupings",
  },
  kind: "collection",
  minItems: 2,
  maxItems: 2,
  itemSchema: {
    type: "object",
    properties: {
      label: {
        type: "string",
        maxLength: 24,
      },
      zones: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              maxLength: 12,
            },
            label: {
              type: "string",
              maxLength: 24,
            },
            cellIds: {
              type: "array",
              items: {
                type: "string",
                maxLength: 12,
              },
              minItems: 1,
              maxItems: 9,
            },
          },
          required: ["id", "label", "cellIds"],
          additionalProperties: false,
        },
        minItems: 2,
        maxItems: 3,
      },
    },
    required: ["label", "zones"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "label",
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.groupings.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 24,
    },
    {
      path: "zones",
      label: {
        id: "motionAtlas.boundary-regrouping-effect.controls.groupings.zones",
        message: "zones",
      },
      kind: "collection",
      minItems: 2,
      maxItems: 3,
      itemSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            maxLength: 12,
          },
          label: {
            type: "string",
            maxLength: 24,
          },
          cellIds: {
            type: "array",
            items: {
              type: "string",
              maxLength: 12,
            },
            minItems: 1,
            maxItems: 9,
          },
        },
        required: ["id", "label", "cellIds"],
        additionalProperties: false,
      },
      itemControls: [
        {
          path: "id",
          label: {
            id: "motionAtlas.boundary-regrouping-effect.controls.groupings.zones.id",
            message: "id",
          },
          kind: "text",
          minLength: 0,
          maxLength: 12,
        },
        {
          path: "label",
          label: {
            id: "motionAtlas.boundary-regrouping-effect.controls.groupings.zones.label",
            message: "label",
          },
          kind: "text",
          minLength: 0,
          maxLength: 24,
        },
        {
          path: "cellIds",
          label: {
            id: "motionAtlas.boundary-regrouping-effect.controls.groupings.zones.cellIds",
            message: "cellIds",
          },
          kind: "collection",
          minItems: 1,
          maxItems: 9,
          itemSchema: {
            type: "string",
            maxLength: 12,
          },
          itemControls: [
            {
              path: "",
              label: {
                id: "motionAtlas.boundary-regrouping-effect.controls.groupings.zones.cellIds.item",
                message: "Coordinate",
              },
              kind: "select",
              optionsFrom: {
                path: "cells",
                valueKey: "id",
                labelKey: "label",
              },
            },
          ],
        },
      ],
    },
  ],
  help: {
    id: "motionAtlas.boundary-regrouping-effect.controls.groupings.help",
    message:
      "Two complete, mutually exclusive regroupings of the same cells. Exactly 2 groupings; each has 2..3 contiguous zones; every cell appears exactly once per grouping; IDs <= 12 characters; all labels <= 24 characters.",
  },
};
