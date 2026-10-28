import { propEq } from "@avandar/utils";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { jsonSchema } from "./InvalidTableQuarantine.schema";
import type { StockControl } from "../../contracts/StockContract.types";
const COMPATIBLE_PATHS: string[] = ["labels", "showAttempt"];
const compatible: StockControl[] = makeStockControlsFromSchema({
  schema: {
    type: "object",
    additionalProperties: false,
    required: COMPATIBLE_PATHS,
    properties: Object.fromEntries(
      COMPATIBLE_PATHS.map((path) => [path, jsonSchema.properties![path]]),
    ),
  },
  messageNamespace: "motionAtlas.invalid-table-quarantine",
  referenceSelects: {},
});
const EXPLICIT: StockControl[] = [
  {
    path: "originalRows",
    label: {
      id: "motionAtlas.invalid-table-quarantine.controls.originalRows",
      message: "originalRows",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 4,
    itemSchema: { type: "string", minLength: 1, maxLength: 18 },
    itemControls: [
      {
        path: "",
        label: {
          id: "motionAtlas.invalid-table-quarantine.controls.originalRows.",
          message: "Original row",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
    ],
  },
  {
    path: "attempt",
    label: {
      id: "motionAtlas.invalid-table-quarantine.controls.attempt",
      message: "attempt",
    },
    kind: "object",
    controls: [
      {
        path: "rowIndex",
        label: {
          id: "motionAtlas.invalid-table-quarantine.controls.attempt.rowIndex",
          message: "rowIndex",
        },
        kind: "number",
        min: 0,
        max: 3,
        step: 1,
      },
      {
        path: "replacement",
        label: {
          id: "motionAtlas.invalid-table-quarantine.controls.attempt.replacement",
          message: "replacement",
        },
        kind: "text",
        minLength: 0,
        maxLength: 18,
      },
      {
        path: "outcome",
        label: {
          id: "motionAtlas.invalid-table-quarantine.controls.attempt.outcome",
          message: "outcome",
        },
        kind: "select",
        options: [
          {
            value: "failed",
            label: {
              id: "motionAtlas.invalid-table-quarantine.controls.attempt.outcome.failed",
              message: "Failed",
            },
          },
          {
            value: "completed",
            label: {
              id: "motionAtlas.invalid-table-quarantine.controls.attempt.outcome.completed",
              message: "Completed",
            },
          },
        ],
      },
    ],
  },
  {
    path: "reload",
    label: {
      id: "motionAtlas.invalid-table-quarantine.controls.reload",
      message: "reload",
    },
    kind: "object",
    controls: [
      {
        path: "performed",
        label: {
          id: "motionAtlas.invalid-table-quarantine.controls.reload.performed",
          message: "performed",
        },
        kind: "boolean",
      },
      {
        path: "rows",
        label: {
          id: "motionAtlas.invalid-table-quarantine.controls.reload.rows",
          message: "rows",
        },
        kind: "collection",
        minItems: 0,
        maxItems: 4,
        itemSchema: { type: "string", minLength: 0, maxLength: 18 },
        itemControls: [
          {
            path: "",
            label: {
              id: "motionAtlas.invalid-table-quarantine.controls.reload.rows.",
              message: "Reloaded row",
            },
            kind: "text",
            minLength: 0,
            maxLength: 18,
          },
        ],
      },
    ],
  },
];
/** Accepted converter shapes plus explicit primitive and numeric editors. */
export const controls: StockControl[] = [
  "originalRows",
  "attempt",
  "reload",
  "labels",
  "showAttempt",
].map((path) => {
  const control = [...compatible, ...EXPLICIT].find(propEq("path", path));
  if (!control) {
    throw new Error(`Missing stock control ${path}.`);
  }
  return control;
});
