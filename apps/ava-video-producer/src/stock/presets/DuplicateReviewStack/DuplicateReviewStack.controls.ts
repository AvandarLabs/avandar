import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editor controls for every authored field. */
export const CONTROLS: StockControl[] = [
  {
    path: "title",
    label: {
      id: "motionAtlas.duplicate-review-stack.controls.title",
      message: "title",
    },
    kind: "text",
    minLength: 1,
    maxLength: 44,
    multiline: true,
  },
  {
    path: "groups",
    label: {
      id: "motionAtlas.duplicate-review-stack.controls.groups",
      message: "groups",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 2,
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
          maxLength: 24,
        },
        records: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                minLength: 0,
                maxLength: 12,
              },
              label: {
                type: "string",
                minLength: 0,
                maxLength: 26,
              },
              comparisonValue: {
                type: "string",
                minLength: 0,
                maxLength: 22,
              },
            },
            required: ["id", "label", "comparisonValue"],
            additionalProperties: false,
          },
          minItems: 2,
          maxItems: 3,
        },
        retainedId: {
          anyOf: [
            {
              type: "string",
              minLength: 0,
              maxLength: 12,
            },
            {
              type: "null",
            },
          ],
        },
      },
      required: ["id", "label", "records", "retainedId"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.duplicate-review-stack.controls.groups.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
        multiline: true,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.duplicate-review-stack.controls.groups.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
        multiline: true,
      },
      {
        path: "records",
        label: {
          id: "motionAtlas.duplicate-review-stack.controls.groups.records",
          message: "records",
        },
        kind: "collection",
        minItems: 2,
        maxItems: 3,
        itemSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              minLength: 0,
              maxLength: 12,
            },
            label: {
              type: "string",
              minLength: 0,
              maxLength: 26,
            },
            comparisonValue: {
              type: "string",
              minLength: 0,
              maxLength: 22,
            },
          },
          required: ["id", "label", "comparisonValue"],
          additionalProperties: false,
        },
        itemControls: [
          {
            path: "id",
            label: {
              id: "motionAtlas.duplicate-review-stack.controls.groups.records.id",
              message: "id",
            },
            kind: "text",
            minLength: 0,
            maxLength: 12,
            multiline: true,
          },
          {
            path: "label",
            label: {
              id: "motionAtlas.duplicate-review-stack.controls.groups.records.label",
              message: "label",
            },
            kind: "text",
            minLength: 0,
            maxLength: 26,
            multiline: true,
          },
          {
            path: "comparisonValue",
            label: {
              id: "motionAtlas.duplicate-review-stack.controls.groups.records.comparisonValue",
              message: "comparisonValue",
            },
            kind: "text",
            minLength: 0,
            maxLength: 22,
            multiline: true,
          },
        ],
      },
      {
        path: "retainedId",
        label: {
          id: "motionAtlas.duplicate-review-stack.controls.groups.retainedId",
          message: "retainedId",
        },
        nullable: true,
        kind: "select",
        optionsFrom: {
          path: "records",
          valueKey: "id",
          labelKey: "label",
          scope: "item",
        },
      },
    ],
  },
  {
    path: "comparisonFieldLabel",
    label: {
      id: "motionAtlas.duplicate-review-stack.controls.comparisonFieldLabel",
      message: "comparisonFieldLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 28,
    multiline: true,
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.duplicate-review-stack.controls.labels",
      message: "labels",
    },
    kind: "object",
    controls: [
      {
        path: "retained",
        label: {
          id: "motionAtlas.duplicate-review-stack.controls.labels.retained",
          message: "retained",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
        multiline: true,
      },
      {
        path: "unresolved",
        label: {
          id: "motionAtlas.duplicate-review-stack.controls.labels.unresolved",
          message: "unresolved",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
        multiline: true,
      },
      {
        path: "alternatives",
        label: {
          id: "motionAtlas.duplicate-review-stack.controls.labels.alternatives",
          message: "alternatives",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
        multiline: true,
      },
    ],
  },
  {
    path: "finalView",
    label: {
      id: "motionAtlas.duplicate-review-stack.controls.finalView",
      message: "finalView",
    },
    kind: "select",
    options: [
      {
        value: "offset-stack",
        label: {
          id: "motionAtlas.duplicate-review-stack.controls.finalView.offset-stack",
          message: "offset-stack",
        },
      },
      {
        value: "comparison-pair",
        label: {
          id: "motionAtlas.duplicate-review-stack.controls.finalView.comparison-pair",
          message: "comparison-pair",
        },
      },
    ],
  },
  {
    path: "showRecordIds",
    label: {
      id: "motionAtlas.duplicate-review-stack.controls.showRecordIds",
      message: "showRecordIds",
    },
    kind: "boolean",
  },
];
