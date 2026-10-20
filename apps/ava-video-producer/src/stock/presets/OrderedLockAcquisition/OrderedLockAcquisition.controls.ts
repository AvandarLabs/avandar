import { propEq } from "@avandar/utils";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { jsonSchema } from "./OrderedLockAcquisition.schema";
import type { StockControl } from "../../contracts/StockContract.types";
const COMPATIBLE_PATHS: string[] = [
  "resources",
  "firstOperationId",
  "showOriginalOrder",
  "copy",
];
const compatible: StockControl[] = makeStockControlsFromSchema({
  schema: {
    type: "object",
    additionalProperties: false,
    required: COMPATIBLE_PATHS,
    properties: Object.fromEntries(
      COMPATIBLE_PATHS.map((path) => [path, jsonSchema.properties![path]]),
    ),
  },
  messageNamespace: "motionAtlas.ordered-lock-acquisition",
  referenceSelects: {
    firstOperationId: { path: "operations", valueKey: "id", labelKey: "label" },
  },
});
const EXPLICIT: StockControl[] = [
  {
    path: "operations",
    label: {
      id: "motionAtlas.ordered-lock-acquisition.controls.operations",
      message: "operations",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "label", "requestedIds"],
      properties: {
        id: { type: "string", minLength: 1, maxLength: 12 },
        label: { type: "string", minLength: 1, maxLength: 24 },
        requestedIds: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          items: { type: "string", minLength: 1, maxLength: 10 },
        },
      },
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.ordered-lock-acquisition.controls.operations.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 12,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.ordered-lock-acquisition.controls.operations.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "requestedIds",
        label: {
          id: "motionAtlas.ordered-lock-acquisition.controls.operations.requestedIds",
          message: "requestedIds",
        },
        kind: "collection",
        minItems: 2,
        maxItems: 2,
        itemSchema: { type: "string", minLength: 1, maxLength: 10 },
        itemControls: [
          {
            path: "",
            label: {
              id: "motionAtlas.ordered-lock-acquisition.controls.operations.requestedIds.",
              message: "Requested resource",
            },
            kind: "select",
            optionsFrom: {
              path: "resources",
              valueKey: "id",
              labelKey: "label",
              scope: "root",
            },
          },
        ],
      },
    ],
  },
];
/** Accepted converter shapes plus explicit primitive and numeric editors. */
export const controls: StockControl[] = [
  "resources",
  "operations",
  "firstOperationId",
  "showOriginalOrder",
  "copy",
].map((path) => {
  const control = [...compatible, ...EXPLICIT].find(propEq("path", path));
  if (!control) {
    throw new Error(`Missing stock control ${path}.`);
  }
  return control;
});
