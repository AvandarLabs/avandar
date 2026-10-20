import { propEq } from "@avandar/utils";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { jsonSchema } from "./GroupedValuePicker.schema";
import type { StockControl } from "../../contracts/StockContract.types";
const COMPATIBLE_PATHS: string[] = [
  "rule",
  "nullPolicy",
  "labels",
  "showCalculation",
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
  messageNamespace: "motionAtlas.grouped-value-picker",
  referenceSelects: {},
});
const EXPLICIT: StockControl[] = [
  {
    path: "observations",
    label: {
      id: "motionAtlas.grouped-value-picker.controls.observations",
      message: "observations",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 6,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "value"],
      properties: {
        id: { type: "string", minLength: 1, maxLength: 12 },
        value: {
          anyOf: [
            { type: "number", minimum: -100, maximum: 100 },
            { type: "null" },
          ],
        },
      },
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.grouped-value-picker.controls.observations.id",
          message: "id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 12,
      },
      {
        path: "value",
        label: {
          id: "motionAtlas.grouped-value-picker.controls.observations.value",
          message: "value",
        },
        kind: "number",
        min: -100,
        max: 100,
        nullable: true,
      },
    ],
  },
];
/** Accepted converter shapes plus explicit primitive and numeric editors. */
export const controls: StockControl[] = [
  "observations",
  "rule",
  "nullPolicy",
  "labels",
  "showCalculation",
].map((path) => {
  const control = [...compatible, ...EXPLICIT].find(propEq("path", path));
  if (!control) {
    throw new Error(`Missing stock control ${path}.`);
  }
  return control;
});
