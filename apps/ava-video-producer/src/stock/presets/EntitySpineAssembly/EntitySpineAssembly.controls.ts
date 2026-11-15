import { propEq } from "@avandar/utils";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { jsonSchema } from "./EntitySpineAssembly.schema";
import type { StockControl } from "../../contracts/StockContract.types";

const COMPATIBLE_PATHS: string[] = [
  "entities",
  "field",
  "showSourceRows",
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
  messageNamespace: "motionAtlas.entity-spine-assembly",
  referenceSelects: {},
});
const EXPLICIT: StockControl[] = [
  {
    path: "observations",
    label: {
      id: "motionAtlas.entity-spine-assembly.controls.observations",
      message: "observations",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 7,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "entityId", "value"],
      properties: {
        id: { type: "string", maxLength: 12 },
        entityId: { type: "string", minLength: 1, maxLength: 10 },
        value: { type: "number", minimum: 0, maximum: 100 },
      },
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.entity-spine-assembly.controls.observations.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 12,
      },
      {
        path: "entityId",
        label: {
          id: "motionAtlas.entity-spine-assembly.controls.observations.entityId",
          message: "entityId",
        },
        kind: "select",
        optionsFrom: {
          path: "entities",
          valueKey: "id",
          labelKey: "label",
          scope: "root",
        },
      },
      {
        path: "value",
        label: {
          id: "motionAtlas.entity-spine-assembly.controls.observations.value",
          message: "value",
        },
        kind: "number",
        min: 0,
        max: 100,
      },
    ],
  },
];
/** Accepted converter shapes plus explicit primitive and numeric editors. */
export const controls: StockControl[] = [
  "entities",
  "observations",
  "field",
  "showSourceRows",
  "copy",
].map((path) => {
  const control = [...compatible, ...EXPLICIT].find(propEq("path", path));
  if (!control) {
    throw new Error(`Missing stock control ${path}.`);
  }
  return control;
});
