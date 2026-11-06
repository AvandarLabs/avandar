import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable editor controls for every authored field. */
export const CONTROLS: StockControl[] = [
  {
    path: "recordTitle",
    label: {
      id: "motionAtlas.field-conflict-choice.controls.recordTitle",
      message: "recordTitle",
    },
    kind: "text",
    minLength: 1,
    maxLength: 42,
    multiline: true,
  },
  {
    path: "sources",
    label: {
      id: "motionAtlas.field-conflict-choice.controls.sources",
      message: "sources",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 18,
        },
        label: {
          type: "string",
          minLength: 0,
          maxLength: 26,
        },
      },
      required: ["id", "label"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.field-conflict-choice.controls.sources.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 18,
        multiline: true,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.field-conflict-choice.controls.sources.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
        multiline: true,
      },
    ],
  },
  {
    path: "fields",
    label: {
      id: "motionAtlas.field-conflict-choice.controls.fields",
      message: "fields",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 4,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 18,
        },
        label: {
          type: "string",
          minLength: 0,
          maxLength: 22,
        },
        candidates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sourceId: {
                type: "string",
                minLength: 0,
                maxLength: 18,
              },
              value: {
                type: "string",
                minLength: 0,
                maxLength: 26,
              },
            },
            required: ["sourceId", "value"],
            additionalProperties: false,
          },
          minItems: 2,
          maxItems: 2,
        },
        chosenSourceId: {
          anyOf: [
            {
              type: "string",
              minLength: 0,
              maxLength: 18,
            },
            {
              type: "null",
            },
          ],
        },
      },
      required: ["id", "label", "candidates", "chosenSourceId"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.field-conflict-choice.controls.fields.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 18,
        multiline: true,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.field-conflict-choice.controls.fields.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 22,
        multiline: true,
      },
      {
        path: "candidates",
        label: {
          id: "motionAtlas.field-conflict-choice.controls.fields.candidates",
          message: "candidates",
        },
        kind: "collection",
        minItems: 2,
        maxItems: 2,
        itemSchema: {
          type: "object",
          properties: {
            sourceId: {
              type: "string",
              minLength: 0,
              maxLength: 18,
            },
            value: {
              type: "string",
              minLength: 0,
              maxLength: 26,
            },
          },
          required: ["sourceId", "value"],
          additionalProperties: false,
        },
        itemControls: [
          {
            path: "sourceId",
            label: {
              id: "motionAtlas.field-conflict-choice.controls.fields.candidates.sourceId",
              message: "sourceId",
            },
            kind: "select",
            optionsFrom: {
              path: "sources",
              valueKey: "id",
              labelKey: "label",
            },
          },
          {
            path: "value",
            label: {
              id: "motionAtlas.field-conflict-choice.controls.fields.candidates.value",
              message: "value",
            },
            kind: "text",
            minLength: 0,
            maxLength: 26,
            multiline: true,
          },
        ],
      },
      {
        path: "chosenSourceId",
        label: {
          id: "motionAtlas.field-conflict-choice.controls.fields.chosenSourceId",
          message: "chosenSourceId",
        },
        nullable: true,
        kind: "select",
        optionsFrom: {
          path: "sources",
          valueKey: "id",
          labelKey: "label",
        },
      },
    ],
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.field-conflict-choice.controls.labels",
      message: "labels",
    },
    kind: "object",
    controls: [
      {
        path: "result",
        label: {
          id: "motionAtlas.field-conflict-choice.controls.labels.result",
          message: "result",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
        multiline: true,
      },
      {
        path: "selected",
        label: {
          id: "motionAtlas.field-conflict-choice.controls.labels.selected",
          message: "selected",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
        multiline: true,
      },
      {
        path: "unresolved",
        label: {
          id: "motionAtlas.field-conflict-choice.controls.labels.unresolved",
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
          id: "motionAtlas.field-conflict-choice.controls.labels.alternatives",
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
    path: "showRetainedAlternatives",
    label: {
      id: "motionAtlas.field-conflict-choice.controls.showRetainedAlternatives",
      message: "showRetainedAlternatives",
    },
    kind: "boolean",
  },
  {
    path: "decisionStyle",
    label: {
      id: "motionAtlas.field-conflict-choice.controls.decisionStyle",
      message: "decisionStyle",
    },
    kind: "select",
    options: [
      {
        value: "sliding-rail",
        label: {
          id: "motionAtlas.field-conflict-choice.controls.decisionStyle.sliding-rail",
          message: "sliding-rail",
        },
      },
      {
        value: "selection-bracket",
        label: {
          id: "motionAtlas.field-conflict-choice.controls.decisionStyle.selection-bracket",
          message: "selection-bracket",
        },
      },
    ],
  },
];
