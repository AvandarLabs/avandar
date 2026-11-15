import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable bounded authoring controls. */
export const CONTROLS: StockControl[] = [
  {
    path: "earlierRecords",
    label: {
      id: "motionAtlas.schema-column-evolution.controls.earlierRecords.label",
      message: "Earlier records",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 16,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 22,
        },
        recordedValue: {
          type: "string",
          minLength: 1,
          maxLength: 18,
        },
      },
      required: ["id", "label", "recordedValue"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.schema-column-evolution.controls.earlierRecords.item.id.label",
          message: "Id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.schema-column-evolution.controls.earlierRecords.item.label.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "recordedValue",
        label: {
          id: "motionAtlas.schema-column-evolution.controls.earlierRecords.item.recordedValue.label",
          message: "Recorded value",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
    ],
    help: {
      id: "motionAtlas.schema-column-evolution.controls.earlierRecords.help",
      message:
        "Earlier rows whose recorded values remain unchanged throughout the extension. 1..3 items; unique IDs 1..16 characters; labels 1..22 characters; recordedValue 1..18 characters; these rows have no supplied value for the new field",
    },
  },
  {
    path: "fields",
    label: {
      id: "motionAtlas.schema-column-evolution.controls.fields.label",
      message: "Fields",
    },
    kind: "object",
    controls: [
      {
        path: "existingLabel",
        label: {
          id: "motionAtlas.schema-column-evolution.controls.fields.existingLabel.label",
          message: "Existing label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "addedLabel",
        label: {
          id: "motionAtlas.schema-column-evolution.controls.fields.addedLabel.label",
          message: "Added label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "missingLabel",
        label: {
          id: "motionAtlas.schema-column-evolution.controls.fields.missingLabel.label",
          message: "Missing label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
    ],
    help: {
      id: "motionAtlas.schema-column-evolution.controls.fields.help",
      message:
        "The retained column, newly introduced column, and explicit meaning of earlier empty cells. All keys required; labels 1..20 characters; missingLabel must mean not collected, never zero, false, or a negative finding",
    },
  },
  {
    path: "laterRecord",
    label: {
      id: "motionAtlas.schema-column-evolution.controls.laterRecord.label",
      message: "Later record",
    },
    kind: "object",
    controls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.schema-column-evolution.controls.laterRecord.id.label",
          message: "Id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.schema-column-evolution.controls.laterRecord.label.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "recordedValue",
        label: {
          id: "motionAtlas.schema-column-evolution.controls.laterRecord.recordedValue.label",
          message: "Recorded value",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "addedValue",
        label: {
          id: "motionAtlas.schema-column-evolution.controls.laterRecord.addedValue.label",
          message: "Added value",
        },
        nullable: true,
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
    ],
    help: {
      id: "motionAtlas.schema-column-evolution.controls.laterRecord.help",
      message:
        "One later row created under the expanded schema. Null retains a missing mark rather than manufacturing an answer. id 1..16 characters and absent from earlierRecords; label 1..22 characters; recordedValue 1..18 characters; addedValue null or 1..18 characters",
    },
  },
  {
    path: "phaseLabels",
    label: {
      id: "motionAtlas.schema-column-evolution.controls.phaseLabels.label",
      message: "Phase labels",
    },
    kind: "object",
    controls: [
      {
        path: "before",
        label: {
          id: "motionAtlas.schema-column-evolution.controls.phaseLabels.before.label",
          message: "Before",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
      {
        path: "expanded",
        label: {
          id: "motionAtlas.schema-column-evolution.controls.phaseLabels.expanded.label",
          message: "Expanded",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
      {
        path: "later",
        label: {
          id: "motionAtlas.schema-column-evolution.controls.phaseLabels.later.label",
          message: "Later",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
    ],
    help: {
      id: "motionAtlas.schema-column-evolution.controls.phaseLabels.help",
      message:
        "Labels the collection change and the later record without assigning real dates. All keys required; each label 1..30 characters",
    },
  },
  {
    path: "showVersionLabels",
    label: {
      id: "motionAtlas.schema-column-evolution.controls.showVersionLabels.label",
      message: "Show version labels",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.schema-column-evolution.controls.showVersionLabels.help",
      message:
        "Keeps the before and expanded captions beside the corresponding header outlines. boolean; hiding captions cannot remove missing-value marks or the later-record distinction",
    },
  },
  {
    path: "evidenceLabel",
    label: {
      id: "motionAtlas.schema-column-evolution.controls.evidenceLabel.label",
      message: "Evidence label",
    },
    kind: "text",
    minLength: 1,
    maxLength: 64,
    help: {
      id: "motionAtlas.schema-column-evolution.controls.evidenceLabel.help",
      message:
        "Keeps the illustrative status and missing-data boundary visible. 1..64 characters; fictional defaults retain an explicit fictional qualifier",
    },
  },
];
